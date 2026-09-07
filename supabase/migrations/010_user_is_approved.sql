-- User approval gate: grandfather existing rows, new inserts wait for admin Accept.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN;

UPDATE users SET is_approved = true WHERE is_approved IS NULL;

ALTER TABLE users
  ALTER COLUMN is_approved SET DEFAULT false;

ALTER TABLE users
  ALTER COLUMN is_approved SET NOT NULL;
