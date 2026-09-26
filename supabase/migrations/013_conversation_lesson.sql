-- Chat sessions started from a plan lesson ("Talk with Langy") carry the lesson so the tutor knows the material

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL;
