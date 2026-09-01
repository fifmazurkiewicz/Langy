-- Per-language tutor voice preference (ElevenLabs catalog key; NULL = default from env)
ALTER TABLE user_language_profile
  ADD COLUMN IF NOT EXISTS tts_voice_key TEXT;
