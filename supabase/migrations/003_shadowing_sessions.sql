CREATE TABLE IF NOT EXISTS shadowing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  topic TEXT,
  source TEXT NOT NULL,
  conversation_id UUID REFERENCES conversations(id),
  dialogue JSONB NOT NULL DEFAULT '[]',
  show_text BOOLEAN DEFAULT TRUE,
  audio_mode TEXT DEFAULT 'tts',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  hard_line_ids JSONB
);
