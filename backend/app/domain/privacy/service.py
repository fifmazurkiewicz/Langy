import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

import httpx
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.config import Settings
from app.models import (
    Conversation,
    ConversationSummary,
    FlashcardSet,
    FsrsCard,
    Job,
    PrivacyNoticeAcknowledgement,
    UsageLedger,
    User,
    UserLanguageProfile,
    UserMemoryFact,
    VocabItem,
)
from app.models.selection_lookup_cache import SelectionLookupCache
from app.models.shadowing_session import ShadowingSession
from app.models.study_plan import Lesson, StudyPlan
from app.models.vocab_mnemonic import VocabMnemonic

AI_NOTICE_KEY = "ai_first_use"
AI_NOTICE_VERSION = "2026-09-13"


def _json_value(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, (uuid.UUID, Decimal)):
        return str(value)
    return value


def _row(model: Any) -> dict[str, Any]:
    return {
        column.name: _json_value(getattr(model, column.name))
        for column in model.__table__.columns
    }


def _owned(db: Session, model: Any, user_id: uuid.UUID) -> list[Any]:
    return list(db.scalars(select(model).where(model.user_id == user_id)).all())


def export_user_data(db: Session, user: User) -> dict[str, Any]:
    vocab = _owned(db, VocabItem, user.id)
    vocab_ids = [item.id for item in vocab]
    plans = _owned(db, StudyPlan, user.id)
    plan_ids = [plan.id for plan in plans]
    return {
        "format": "langy-personal-data-export",
        "version": 1,
        "exported_at": datetime.now().astimezone().isoformat(),
        "account": _row(user),
        "language_profiles": [
            _row(x) for x in _owned(db, UserLanguageProfile, user.id)
        ],
        "conversations": [_row(x) for x in _owned(db, Conversation, user.id)],
        "conversation_summaries": [
            _row(x) for x in _owned(db, ConversationSummary, user.id)
        ],
        "memory_facts": [_row(x) for x in _owned(db, UserMemoryFact, user.id)],
        "flashcard_sets": [_row(x) for x in _owned(db, FlashcardSet, user.id)],
        "vocabulary": [_row(x) for x in vocab],
        "fsrs_cards": [
            _row(x)
            for x in db.scalars(
                select(FsrsCard).where(FsrsCard.vocab_item_id.in_(vocab_ids))
            ).all()
        ]
        if vocab_ids
        else [],
        "mnemonics": [_row(x) for x in _owned(db, VocabMnemonic, user.id)],
        "shadowing_sessions": [_row(x) for x in _owned(db, ShadowingSession, user.id)],
        "study_plans": [_row(x) for x in plans],
        "lessons": [
            _row(x)
            for x in db.scalars(
                select(Lesson).where(Lesson.study_plan_id.in_(plan_ids))
            ).all()
        ]
        if plan_ids
        else [],
        "usage_ledger": [_row(x) for x in _owned(db, UsageLedger, user.id)],
        "selection_lookup_cache": [
            _row(x) for x in _owned(db, SelectionLookupCache, user.id)
        ],
        "privacy_notice_acknowledgements": [
            _row(x) for x in _owned(db, PrivacyNoticeAcknowledgement, user.id)
        ],
    }


def acknowledge_notice(
    db: Session, user: User, notice_key: str, notice_version: str
) -> None:
    exists = db.scalar(
        select(PrivacyNoticeAcknowledgement.id).where(
            PrivacyNoticeAcknowledgement.user_id == user.id,
            PrivacyNoticeAcknowledgement.notice_key == notice_key,
            PrivacyNoticeAcknowledgement.notice_version == notice_version,
        )
    )
    if not exists:
        db.add(
            PrivacyNoticeAcknowledgement(
                user_id=user.id,
                notice_key=notice_key,
                notice_version=notice_version,
            )
        )
        db.commit()


def _delete_supabase_identity(user_id: uuid.UUID, settings: Settings) -> None:
    if settings.dev_auth_allowed:
        return
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError("Account deletion is not configured")
    response = httpx.delete(
        f"{settings.supabase_url.rstrip('/')}/auth/v1/admin/users/{user_id}",
        headers={
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
        },
        timeout=15,
    )
    if response.status_code not in (200, 204, 404):
        raise RuntimeError("Could not delete the authentication identity")


def delete_account(db: Session, user: User, settings: Settings) -> None:
    _delete_supabase_identity(user.id, settings)

    vocab_ids = list(
        db.scalars(select(VocabItem.id).where(VocabItem.user_id == user.id))
    )
    plan_ids = list(
        db.scalars(select(StudyPlan.id).where(StudyPlan.user_id == user.id))
    )
    if vocab_ids:
        db.execute(delete(FsrsCard).where(FsrsCard.vocab_item_id.in_(vocab_ids)))
    if plan_ids:
        db.execute(delete(Lesson).where(Lesson.study_plan_id.in_(plan_ids)))

    for model in (
        VocabMnemonic,
        ShadowingSession,
        ConversationSummary,
        UserMemoryFact,
        SelectionLookupCache,
        PrivacyNoticeAcknowledgement,
        UsageLedger,
        VocabItem,
        FlashcardSet,
        StudyPlan,
        Conversation,
        UserLanguageProfile,
    ):
        db.execute(delete(model).where(model.user_id == user.id))

    for job in db.scalars(select(Job)).all():
        if str((job.payload or {}).get("user_id", "")) == str(user.id):
            db.delete(job)
    db.delete(user)
    db.commit()
