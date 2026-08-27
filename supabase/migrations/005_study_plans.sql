-- Study plans and lessons (CEFR optional path)

CREATE TABLE IF NOT EXISTS study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  cefr_level TEXT NOT NULL,
  duration_weeks INT NOT NULL,
  days_per_week INT NOT NULL,
  progress_day INT DEFAULT 1,
  generated_plan JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_plan_id UUID NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  lesson_type TEXT NOT NULL,
  content JSONB,
  exercises JSONB,
  week_index INT NOT NULL,
  day_index INT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(study_plan_id, day_index)
);

CREATE INDEX IF NOT EXISTS idx_study_plans_user_lang ON study_plans(user_id, language) WHERE is_active = TRUE;

ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
