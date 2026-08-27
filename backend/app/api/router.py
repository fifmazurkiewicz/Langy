from fastapi import APIRouter

from app.api.routes import auth, chat, correction, health, mnemonics, onboarding, profile, selection, shadowing, vocab

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(onboarding.router, prefix="/onboarding", tags=["onboarding"])
api_router.include_router(profile.router, prefix="/profile", tags=["profile"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(selection.router, prefix="/chat", tags=["selection"])
api_router.include_router(correction.router, prefix="/chat", tags=["correction"])
api_router.include_router(shadowing.router, prefix="/shadowing", tags=["shadowing"])
api_router.include_router(mnemonics.router, prefix="/mnemonics", tags=["mnemonics"])
api_router.include_router(vocab.router, prefix="/vocab", tags=["vocab"])
