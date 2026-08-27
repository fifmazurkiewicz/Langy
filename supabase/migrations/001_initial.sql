-- Langy initial schema (apply via Supabase SQL editor or migration tool)

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  spend_cap_usd NUMERIC(10,2) DEFAULT 10,
  active_language TEXT,
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_language_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  motivations TEXT[],
  interests TEXT[],
  skill_reading INT,
  skill_speaking INT,
  skill_writing INT,
  skill_listening INT,
  skill_vocabulary INT,
  cefr_level TEXT,
  assessed_at TIMESTAMPTZ,
  UNIQUE(user_id, language)
);

CREATE TABLE IF NOT EXISTS usage_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  cost_usd NUMERIC(10,6) NOT NULL,
  provider TEXT,
  langfuse_trace_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  transcript TEXT DEFAULT '',
  audio_ref TEXT
);

CREATE TABLE IF NOT EXISTS flashcard_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  category_key TEXT NOT NULL,
  is_custom BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vocab_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  term TEXT NOT NULL,
  translation TEXT NOT NULL,
  context_sentence TEXT,
  flashcard_set_id UUID REFERENCES flashcard_sets(id),
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  flag_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, language, term)
);

CREATE TABLE IF NOT EXISTS fsrs_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vocab_item_id UUID NOT NULL UNIQUE REFERENCES vocab_items(id) ON DELETE CASCADE,
  stability NUMERIC(12,6) NOT NULL,
  difficulty NUMERIC(12,6) NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  review_history JSONB
);

CREATE TABLE IF NOT EXISTS user_memory_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  source_conversation_id UUID REFERENCES conversations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_language_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE fsrs_cards ENABLE ROW LEVEL SECURITY;
