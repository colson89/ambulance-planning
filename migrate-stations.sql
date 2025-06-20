-- Multi-station migration script
BEGIN;

-- 1. Create stations table
CREATE TABLE IF NOT EXISTS stations (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Insert default stations
INSERT INTO stations (name, code, display_name) VALUES 
  ('westerlo', 'westerlo', 'ZW Westerlo'),
  ('mol', 'mol', 'PIT Mol')
ON CONFLICT (code) DO UPDATE SET display_name = EXCLUDED.display_name;

-- 3. Add stationId column to existing tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS station_id INTEGER DEFAULT 1;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS station_id INTEGER DEFAULT 1;
ALTER TABLE shift_preferences ADD COLUMN IF NOT EXISTS station_id INTEGER DEFAULT 1;
ALTER TABLE weekday_configs ADD COLUMN IF NOT EXISTS station_id INTEGER DEFAULT 1;
ALTER TABLE user_comments ADD COLUMN IF NOT EXISTS station_id INTEGER DEFAULT 1;

-- 4. Update existing data to use Westerlo station (id=1)
UPDATE users SET station_id = 1 WHERE station_id IS NULL;
UPDATE shifts SET station_id = 1 WHERE station_id IS NULL;
UPDATE shift_preferences SET station_id = 1 WHERE station_id IS NULL;
UPDATE weekday_configs SET station_id = 1 WHERE station_id IS NULL;
UPDATE user_comments SET station_id = 1 WHERE station_id IS NULL;

-- 5. Add foreign key constraints (skip if already exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_station') THEN
    ALTER TABLE users ADD CONSTRAINT fk_users_station FOREIGN KEY (station_id) REFERENCES stations(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_shifts_station') THEN
    ALTER TABLE shifts ADD CONSTRAINT fk_shifts_station FOREIGN KEY (station_id) REFERENCES stations(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_preferences_station') THEN
    ALTER TABLE shift_preferences ADD CONSTRAINT fk_preferences_station FOREIGN KEY (station_id) REFERENCES stations(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_weekday_station') THEN
    ALTER TABLE weekday_configs ADD CONSTRAINT fk_weekday_station FOREIGN KEY (station_id) REFERENCES stations(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_comments_station') THEN
    ALTER TABLE user_comments ADD CONSTRAINT fk_comments_station FOREIGN KEY (station_id) REFERENCES stations(id);
  END IF;
END $$;

-- 6. Make station_id NOT NULL
ALTER TABLE users ALTER COLUMN station_id SET NOT NULL;
ALTER TABLE shifts ALTER COLUMN station_id SET NOT NULL;
ALTER TABLE shift_preferences ALTER COLUMN station_id SET NOT NULL;
ALTER TABLE weekday_configs ALTER COLUMN station_id SET NOT NULL;
ALTER TABLE user_comments ALTER COLUMN station_id SET NOT NULL;

-- 7. Create weekday configs for Mol station (copy from Westerlo)
INSERT INTO weekday_configs (station_id, day_of_week, enable_day_shifts, enable_night_shifts, day_shift_count, night_shift_count)
SELECT 
  2 as station_id, -- Mol station
  day_of_week,
  enable_day_shifts,
  enable_night_shifts,
  day_shift_count,
  night_shift_count
FROM weekday_configs 
WHERE station_id = 1
ON CONFLICT DO NOTHING;

COMMIT;