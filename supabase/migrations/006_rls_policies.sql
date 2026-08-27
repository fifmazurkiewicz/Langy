-- Langy RLS policies (defense in depth; backend uses service role / direct SQLAlchemy)

-- Admin helper: users.is_admin flag (set on first JWT login from ALLOWED_ADMIN_EMAILS)
CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = TRUE
  );
$$;

-- users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_select ON users;
CREATE POLICY users_select ON users FOR SELECT
  USING (id = auth.uid() OR is_app_admin());
DROP POLICY IF EXISTS users_update ON users;
CREATE POLICY users_update ON users FOR UPDATE
  USING (id = auth.uid() OR is_app_admin());

-- user_language_profile
ALTER TABLE user_language_profile ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ulp_all ON user_language_profile;
CREATE POLICY ulp_all ON user_language_profile FOR ALL
  USING (user_id = auth.uid() OR is_app_admin())
  WITH CHECK (user_id = auth.uid() OR is_app_admin());

-- usage_ledger (read own; admin read all)
ALTER TABLE usage_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ledger_select ON usage_ledger;
CREATE POLICY ledger_select ON usage_ledger FOR SELECT
  USING (user_id = auth.uid() OR is_app_admin());
DROP POLICY IF EXISTS ledger_insert ON usage_ledger;
CREATE POLICY ledger_insert ON usage_ledger FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_app_admin());

-- conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS conversations_all ON conversations;
CREATE POLICY conversations_all ON conversations FOR ALL
  USING (user_id = auth.uid() OR is_app_admin())
  WITH CHECK (user_id = auth.uid() OR is_app_admin());

-- flashcard_sets
ALTER TABLE flashcard_sets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS flashcard_sets_all ON flashcard_sets;
CREATE POLICY flashcard_sets_all ON flashcard_sets FOR ALL
  USING (user_id = auth.uid() OR is_app_admin())
  WITH CHECK (user_id = auth.uid() OR is_app_admin());

-- vocab_items
ALTER TABLE vocab_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vocab_items_all ON vocab_items;
CREATE POLICY vocab_items_all ON vocab_items FOR ALL
  USING (user_id = auth.uid() OR is_app_admin())
  WITH CHECK (user_id = auth.uid() OR is_app_admin());

-- fsrs_cards (via vocab ownership)
ALTER TABLE fsrs_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fsrs_cards_all ON fsrs_cards;
CREATE POLICY fsrs_cards_all ON fsrs_cards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM vocab_items v
      WHERE v.id = fsrs_cards.vocab_item_id
        AND (v.user_id = auth.uid() OR is_app_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vocab_items v
      WHERE v.id = fsrs_cards.vocab_item_id
        AND v.user_id = auth.uid()
    )
  );

-- user_memory_facts
ALTER TABLE user_memory_facts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS memory_facts_all ON user_memory_facts;
CREATE POLICY memory_facts_all ON user_memory_facts FOR ALL
  USING (user_id = auth.uid() OR is_app_admin())
  WITH CHECK (user_id = auth.uid() OR is_app_admin());

-- conversation_summaries
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS summaries_all ON conversation_summaries;
CREATE POLICY summaries_all ON conversation_summaries FOR ALL
  USING (user_id = auth.uid() OR is_app_admin())
  WITH CHECK (user_id = auth.uid() OR is_app_admin());

-- jobs (backend worker; users cannot read arbitrary jobs)
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS jobs_admin ON jobs;
CREATE POLICY jobs_admin ON jobs FOR ALL
  USING (is_app_admin())
  WITH CHECK (is_app_admin());

-- selection_lookup_cache
ALTER TABLE IF EXISTS selection_lookup_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS selection_cache_all ON selection_lookup_cache;
CREATE POLICY selection_cache_all ON selection_lookup_cache FOR ALL
  USING (user_id = auth.uid() OR is_app_admin())
  WITH CHECK (user_id = auth.uid() OR is_app_admin());

-- shadowing_sessions
ALTER TABLE IF EXISTS shadowing_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS shadowing_all ON shadowing_sessions;
CREATE POLICY shadowing_all ON shadowing_sessions FOR ALL
  USING (user_id = auth.uid() OR is_app_admin())
  WITH CHECK (user_id = auth.uid() OR is_app_admin());

-- vocab_mnemonics
ALTER TABLE IF EXISTS vocab_mnemonics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mnemonics_all ON vocab_mnemonics;
CREATE POLICY mnemonics_all ON vocab_mnemonics FOR ALL
  USING (user_id = auth.uid() OR is_app_admin())
  WITH CHECK (user_id = auth.uid() OR is_app_admin());

-- study_plans
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS study_plans_all ON study_plans;
CREATE POLICY study_plans_all ON study_plans FOR ALL
  USING (user_id = auth.uid() OR is_app_admin())
  WITH CHECK (user_id = auth.uid() OR is_app_admin());

-- lessons (via study_plan ownership)
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lessons_all ON lessons;
CREATE POLICY lessons_all ON lessons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM study_plans sp
      WHERE sp.id = lessons.study_plan_id
        AND (sp.user_id = auth.uid() OR is_app_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_plans sp
      WHERE sp.id = lessons.study_plan_id
        AND sp.user_id = auth.uid()
    )
  );
