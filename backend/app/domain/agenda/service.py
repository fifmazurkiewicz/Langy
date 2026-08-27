import json
import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.domain.fsrs.service import create_fsrs_card
from app.domain.providers.text import TextCompletionProvider, get_text_provider
from app.domain.plan.service import get_active_plan
from app.models import Conversation, Job, User, UserLanguageProfile, UserMemoryFact, ConversationSummary, VocabItem


OPENING_LINES = [
    "What would you like to talk about today?",
    "What are you learning right now — shall we practice?",
    "What's on your mind for today's practice?",
]


def build_agenda(db: Session, user: User, language: str) -> dict[str, Any]:
    profile = (
        db.query(UserLanguageProfile)
        .filter(UserLanguageProfile.user_id == user.id, UserLanguageProfile.language == language)
        .first()
    )
    facts = (
        db.query(UserMemoryFact)
        .filter(UserMemoryFact.user_id == user.id)
        .order_by(UserMemoryFact.updated_at.desc())
        .limit(50)
        .all()
    )
    summaries = (
        db.query(ConversationSummary)
        .filter(ConversationSummary.user_id == user.id)
        .order_by(ConversationSummary.created_at.desc())
        .limit(3)
        .all()
    )
    plan = get_active_plan(db, user.id, language)
    plan_context = None
    if plan:
        slot = None
        grid = plan.generated_plan or {}
        for week in grid.get("weeks", []):
            for day in week.get("days", []):
                if day.get("day") == plan.progress_day:
                    slot = day
                    break
        plan_context = {
            "cefr_level": plan.cefr_level,
            "progress_day": plan.progress_day,
            "current_topic": slot.get("topic") if slot else None,
        }
    return {
        "language": language,
        "profile": {
            "motivations": profile.motivations if profile else [],
            "interests": profile.interests if profile else [],
            "skills": {
                "reading": profile.skill_reading if profile else None,
                "speaking": profile.skill_speaking if profile else None,
                "writing": profile.skill_writing if profile else None,
                "listening": profile.skill_listening if profile else None,
                "vocabulary": profile.skill_vocabulary if profile else None,
            },
            "cefr_level": profile.cefr_level if profile else None,
        },
        "study_plan": plan_context,
        "memory_facts": [f.content for f in facts],
        "recent_summaries": [s.summary for s in summaries],
        "opening_line_pool": OPENING_LINES,
        "l1": "pl",
    }


def append_transcript_line(conversation: Conversation, role: str, text: str) -> str:
    line = f"{role}: {text.strip()}\n"
    conversation.transcript = (conversation.transcript or "") + line
    return conversation.transcript


def enqueue_post_session_jobs(db: Session, conversation_id: uuid.UUID, user_id: uuid.UUID) -> Job:
    job = Job(
        job_type="post_session",
        payload={"conversation_id": str(conversation_id), "user_id": str(user_id)},
        status="pending",
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def process_post_session_job(db: Session, job: Job, provider: TextCompletionProvider | None = None) -> None:
    provider = provider or get_text_provider()
    payload = job.payload
    conversation = db.get(Conversation, uuid.UUID(payload["conversation_id"]))
    if not conversation or not conversation.transcript:
        job.status = "done"
        job.processed_at = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
        db.commit()
        return

    user = db.get(User, uuid.UUID(payload["user_id"]))
    if user is None:
        job.status = "failed"
        db.commit()
        return

    extraction_prompt = [
        {
            "role": "system",
            "content": (
                "Extract new vocabulary candidates from the conversation transcript. "
                "Return JSON: {\"candidates\":[{\"term\":\"\",\"translation_pl\":\"\",\"context\":\"\",\"flag_reason\":\"\"}]}. "
                "L1 is Polish. Only substantive new words/phrases."
            ),
        },
        {"role": "user", "content": conversation.transcript},
    ]
    try:
        result = provider.complete_json(extraction_prompt)
        candidates = result.get("candidates", [])
    except Exception:
        candidates = []

    for c in candidates:
        term = (c.get("term") or "").strip()
        if not term:
            continue
        existing = (
            db.query(VocabItem)
            .filter(
                VocabItem.user_id == user.id,
                VocabItem.language == conversation.language,
                VocabItem.term == term,
            )
            .first()
        )
        if existing:
            if existing.status == "rejected":
                existing.status = "pending"
                existing.translation = c.get("translation_pl") or existing.translation
                existing.context_sentence = c.get("context")
                existing.source = "chat_extraction"
            continue
        item = VocabItem(
            user_id=user.id,
            language=conversation.language,
            term=term,
            translation=c.get("translation_pl") or "",
            context_sentence=c.get("context"),
            source="chat_extraction",
            status="pending",
            flag_reason=c.get("flag_reason"),
        )
        db.add(item)

    summary_prompt = [
        {
            "role": "system",
            "content": "Summarize the session in 1-3 English sentences. Return JSON: {\"summary\":\"\",\"facts\":[\"\"]}.",
        },
        {"role": "user", "content": conversation.transcript},
    ]
    try:
        memory = provider.complete_json(summary_prompt)
        summary_text = memory.get("summary", "")
        if summary_text:
            db.add(
                ConversationSummary(
                    user_id=user.id,
                    conversation_id=conversation.id,
                    language=conversation.language,
                    summary=summary_text,
                )
            )
        for fact in memory.get("facts", []):
            if fact:
                db.add(
                    UserMemoryFact(
                        user_id=user.id,
                        content=fact,
                        source_conversation_id=conversation.id,
                    )
                )
    except Exception:
        pass

    db.commit()
    job.status = "done"
    job.processed_at = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
    db.commit()


def agent_save_word(
    db: Session, user: User, language: str, term: str, translation: str, context: str | None = None
) -> VocabItem:
    existing = (
        db.query(VocabItem)
        .filter(VocabItem.user_id == user.id, VocabItem.language == language, VocabItem.term == term)
        .first()
    )
    if existing:
        existing.status = "accepted"
        existing.translation = translation or existing.translation
        existing.source = "agent_save"
        db.commit()
        if existing.fsrs_card is None:
            create_fsrs_card(db, existing)
        db.refresh(existing)
        return existing

    item = VocabItem(
        user_id=user.id,
        language=language,
        term=term,
        translation=translation,
        context_sentence=context,
        source="agent_save",
        status="accepted",
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    create_fsrs_card(db, item)
    return item
