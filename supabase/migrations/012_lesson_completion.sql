-- Lesson completion timestamp for plan progress (lesson rows are created with the plan)

ALTER TABLE lessons ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

UPDATE lessons SET completed_at = created_at WHERE is_completed = TRUE AND completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lessons_study_plan ON lessons(study_plan_id);
