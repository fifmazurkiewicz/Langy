CREATE TABLE IF NOT EXISTS vocab_mnemonics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  normalized_term TEXT NOT NULL,
  vocab_item_id UUID REFERENCES vocab_items(id),
  association_pl TEXT NOT NULL,
  example_l2 TEXT NOT NULL,
  example_pl TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, language, normalized_term)
);
