CREATE TABLE IF NOT EXISTS selection_lookup_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  normalized_span TEXT NOT NULL,
  translation_pl TEXT NOT NULL,
  example_l2 TEXT NOT NULL,
  example_pl TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, language, normalized_span)
);

CREATE INDEX IF NOT EXISTS idx_selection_lookup_user ON selection_lookup_cache(user_id);
