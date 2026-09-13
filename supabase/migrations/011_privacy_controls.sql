CREATE TABLE IF NOT EXISTS privacy_notice_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notice_key TEXT NOT NULL,
  notice_version TEXT NOT NULL,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, notice_key, notice_version)
);

ALTER TABLE privacy_notice_acknowledgements ENABLE ROW LEVEL SECURITY;

CREATE POLICY privacy_notice_ack_select_own ON privacy_notice_acknowledgements
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY privacy_notice_ack_insert_own ON privacy_notice_acknowledgements
  FOR INSERT WITH CHECK (auth.uid() = user_id);
