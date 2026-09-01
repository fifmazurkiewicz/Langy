-- Custom ElevenLabs voice ID when tts_voice_key = 'custom'
ALTER TABLE user_language_profile
  ADD COLUMN IF NOT EXISTS tts_custom_voice_id TEXT;
