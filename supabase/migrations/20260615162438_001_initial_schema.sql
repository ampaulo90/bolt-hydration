-- Inspirational messages table
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  reference TEXT,
  category TEXT NOT NULL CHECK (category IN ('verse', 'discipline', 'health', 'perseverance', 'work', 'gratitude', 'family')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hydration configuration
CREATE TABLE hydration_config (
  id SERIAL PRIMARY KEY,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  daily_goal_ml INTEGER NOT NULL DEFAULT 3000,
  dose_ml INTEGER NOT NULL DEFAULT 500,
  times JSONB NOT NULL DEFAULT '[]',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(day_of_week)
);

-- Message usage tracking
CREATE TABLE message_usage (
  id SERIAL PRIMARY KEY,
  message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ DEFAULT NOW(),
  notification_log_id INTEGER
);

-- Notification logs
CREATE TABLE notification_logs (
  id SERIAL PRIMARY KEY,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  message_id INTEGER REFERENCES messages(id),
  time_slot TEXT NOT NULL,
  bottle_current INTEGER NOT NULL,
  bottle_total INTEGER NOT NULL,
  consumed_ml INTEGER NOT NULL,
  goal_ml INTEGER NOT NULL,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  teams_response TEXT
);

-- Daily progress tracking
CREATE TABLE daily_progress (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  completed_doses INTEGER DEFAULT 0,
  total_ml INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE hydration_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies (public read for dashboard, authenticated for management)
CREATE POLICY "messages_public_read" ON messages FOR SELECT TO public USING (true);
CREATE POLICY "messages_auth_all" ON messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "hydration_config_public_read" ON hydration_config FOR SELECT TO public USING (true);
CREATE POLICY "hydration_config_auth_all" ON hydration_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "message_usage_public_read" ON message_usage FOR SELECT TO public USING (true);
CREATE POLICY "message_usage_auth_all" ON message_usage FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "notification_logs_public_read" ON notification_logs FOR SELECT TO public USING (true);
CREATE POLICY "notification_logs_auth_all" ON notification_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "daily_progress_public_read" ON daily_progress FOR SELECT TO public USING (true);
CREATE POLICY "daily_progress_auth_all" ON daily_progress FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_messages_category ON messages(category);
CREATE INDEX idx_message_usage_used_at ON message_usage(used_at);
CREATE INDEX idx_notification_logs_sent_at ON notification_logs(sent_at);
CREATE INDEX idx_daily_progress_date ON daily_progress(date);