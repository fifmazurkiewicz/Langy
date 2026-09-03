-- Per-language tutor TTS / respeak playback rate (1.0 = normal)
ALTER TABLE user_language_profile
  ADD COLUMN IF NOT EXISTS tts_playback_rate DOUBLE PRECISION DEFAULT 1.0;
