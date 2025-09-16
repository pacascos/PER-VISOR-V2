-- Statistics and Gamification Database Schema for PER Exam System
-- This schema extends the existing PostgreSQL database with comprehensive
-- statistics tracking, achievements, and progress monitoring

-- User Statistics Table
-- Tracks overall user performance and engagement metrics
CREATE TABLE IF NOT EXISTS user_statistics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    level INTEGER DEFAULT 1,
    total_xp INTEGER DEFAULT 0,
    exams_completed INTEGER DEFAULT 0,
    total_questions_answered INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    study_time_minutes INTEGER DEFAULT 0,
    daily_streak_count INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_study_date DATE,
    last_exam_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Create index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_user_statistics_user_id ON user_statistics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_statistics_level ON user_statistics(level);

-- Exam Records Table
-- Detailed record of each exam attempt
CREATE TABLE IF NOT EXISTS exams (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    time_taken_minutes INTEGER NOT NULL CHECK (time_taken_minutes > 0),
    question_count INTEGER DEFAULT 45,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed', 'abandoned', 'timed_out')),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    exam_config JSONB, -- Stores exam configuration (topics, difficulty, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for exam queries
CREATE INDEX IF NOT EXISTS idx_exams_user_id ON exams(user_id);
CREATE INDEX IF NOT EXISTS idx_exams_completed_at ON exams(completed_at);
CREATE INDEX IF NOT EXISTS idx_exams_score ON exams(score);

-- Topic Performance per Exam
-- Tracks performance in each topic/category within an exam
CREATE TABLE IF NOT EXISTS exam_topic_performance (
    id SERIAL PRIMARY KEY,
    exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL, -- UT1, UT2, etc.
    correct_answers INTEGER NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL DEFAULT 0,
    percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    time_spent_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for topic performance
CREATE INDEX IF NOT EXISTS idx_topic_performance_exam_id ON exam_topic_performance(exam_id);
CREATE INDEX IF NOT EXISTS idx_topic_performance_category ON exam_topic_performance(category);

-- Question Attempts Table
-- Detailed record of each individual question attempt
CREATE TABLE IF NOT EXISTS question_attempts (
    id SERIAL PRIMARY KEY,
    exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    question_id VARCHAR(100) NOT NULL, -- References the question ID from your existing system
    user_answer VARCHAR(10), -- A, B, C, D, or NULL for unanswered
    correct_answer VARCHAR(10) NOT NULL,
    is_correct BOOLEAN NOT NULL,
    time_spent_seconds INTEGER DEFAULT 0,
    category VARCHAR(50), -- UT1, UT2, etc.
    attempt_order INTEGER, -- Order in which this question was answered in the exam
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for question attempts
CREATE INDEX IF NOT EXISTS idx_question_attempts_exam_id ON question_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_question_attempts_question_id ON question_attempts(question_id);
CREATE INDEX IF NOT EXISTS idx_question_attempts_category ON question_attempts(category);
CREATE INDEX IF NOT EXISTS idx_question_attempts_is_correct ON question_attempts(is_correct);

-- User Achievements Table
-- Tracks unlocked achievements for each user
CREATE TABLE IF NOT EXISTS user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id VARCHAR(100) NOT NULL,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    xp_earned INTEGER DEFAULT 0,
    notification_seen BOOLEAN DEFAULT FALSE,
    UNIQUE(user_id, achievement_id)
);

-- Indexes for achievements
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked_at ON user_achievements(unlocked_at);

-- Achievement Progress Table
-- Tracks progress toward achievements that aren't yet unlocked
CREATE TABLE IF NOT EXISTS achievement_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id VARCHAR(100) NOT NULL,
    progress_data JSONB NOT NULL DEFAULT '{}', -- Flexible storage for progress data
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, achievement_id)
);

-- Indexes for achievement progress
CREATE INDEX IF NOT EXISTS idx_achievement_progress_user_id ON achievement_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_achievement_progress_achievement_id ON achievement_progress(achievement_id);

-- Study Sessions Table
-- Tracks individual study sessions for detailed analytics
CREATE TABLE IF NOT EXISTS study_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_type VARCHAR(50) NOT NULL, -- 'exam', 'practice', 'review'
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    duration_minutes INTEGER,
    questions_reviewed INTEGER DEFAULT 0,
    questions_practiced INTEGER DEFAULT 0,
    topics_studied TEXT[], -- Array of topics covered in this session
    performance_summary JSONB -- Summary of performance in this session
);

-- Indexes for study sessions
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_started_at ON study_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_study_sessions_session_type ON study_sessions(session_type);

-- Weak Topics Analysis Table
-- Stores analysis of user's weak areas for recommendation engine
CREATE TABLE IF NOT EXISTS user_weak_topics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    weakness_score DECIMAL(5,2) NOT NULL, -- 0.0 to 100.0, higher means weaker
    recent_performance DECIMAL(5,2) NOT NULL, -- Recent performance percentage
    questions_attempted INTEGER DEFAULT 0,
    questions_correct INTEGER DEFAULT 0,
    last_attempt_date TIMESTAMP,
    recommendation_priority INTEGER DEFAULT 1, -- 1=high, 2=medium, 3=low
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, category)
);

-- Indexes for weak topics
CREATE INDEX IF NOT EXISTS idx_weak_topics_user_id ON user_weak_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_weak_topics_weakness_score ON user_weak_topics(weakness_score);
CREATE INDEX IF NOT EXISTS idx_weak_topics_priority ON user_weak_topics(recommendation_priority);

-- User Preferences Table
-- Stores user preferences for personalized experience
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preferred_exam_length INTEGER DEFAULT 45,
    preferred_difficulty VARCHAR(20) DEFAULT 'mixed', -- 'easy', 'medium', 'hard', 'mixed'
    notification_settings JSONB DEFAULT '{}',
    study_reminders JSONB DEFAULT '{}',
    dashboard_layout JSONB DEFAULT '{}',
    privacy_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Create triggers to automatically update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to relevant tables
CREATE TRIGGER update_user_statistics_updated_at BEFORE UPDATE ON user_statistics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_achievement_progress_updated_at BEFORE UPDATE ON achievement_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weak_topics_updated_at BEFORE UPDATE ON user_weak_topics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create views for common queries

-- User Performance Summary View
CREATE OR REPLACE VIEW user_performance_summary AS
SELECT
    u.id as user_id,
    u.username,
    us.level,
    us.total_xp,
    us.exams_completed,
    us.total_questions_answered,
    us.correct_answers,
    ROUND((us.correct_answers::DECIMAL / NULLIF(us.total_questions_answered, 0)) * 100, 2) as overall_percentage,
    us.study_time_minutes,
    us.daily_streak_count,
    us.longest_streak,
    us.last_exam_date,
    COUNT(ua.id) as achievements_unlocked
FROM users u
LEFT JOIN user_statistics us ON u.id = us.user_id
LEFT JOIN user_achievements ua ON u.id = ua.user_id
GROUP BY u.id, u.username, us.level, us.total_xp, us.exams_completed,
         us.total_questions_answered, us.correct_answers, us.study_time_minutes,
         us.daily_streak_count, us.longest_streak, us.last_exam_date;

-- Recent Performance Trends View
CREATE OR REPLACE VIEW recent_performance_trends AS
SELECT
    e.user_id,
    e.completed_at::date as exam_date,
    AVG(e.score) as avg_score,
    COUNT(e.id) as exams_count,
    MIN(e.score) as min_score,
    MAX(e.score) as max_score
FROM exams e
WHERE e.completed_at >= CURRENT_DATE - INTERVAL '30 days'
  AND e.status = 'completed'
GROUP BY e.user_id, e.completed_at::date
ORDER BY e.user_id, exam_date;

-- Topic Mastery Summary View
CREATE OR REPLACE VIEW topic_mastery_summary AS
SELECT
    etp.category,
    COUNT(DISTINCT e.user_id) as users_attempted,
    AVG(etp.percentage) as avg_performance,
    SUM(etp.correct_answers) as total_correct,
    SUM(etp.total_questions) as total_questions,
    COUNT(*) as total_attempts
FROM exam_topic_performance etp
JOIN exams e ON etp.exam_id = e.id
WHERE e.status = 'completed'
GROUP BY etp.category
ORDER BY etp.category;

-- Insert sample achievement definitions
INSERT INTO achievement_progress (user_id, achievement_id, progress_data) VALUES
(1, 'first_exam', '{"requirement": 1, "current": 0}'),
(1, 'exam_master', '{"requirement": 10, "current": 0}'),
(1, 'perfectionist', '{"requirement": 1, "current": 0}'),
(1, 'week_streak', '{"requirement": 7, "current": 0}')
ON CONFLICT (user_id, achievement_id) DO NOTHING;

-- Create function to calculate user level based on XP
CREATE OR REPLACE FUNCTION calculate_level_from_xp(xp INTEGER)
RETURNS INTEGER AS $$
DECLARE
    level INTEGER := 1;
    xp_needed INTEGER := 500;
    remaining_xp INTEGER := xp;
BEGIN
    WHILE remaining_xp >= xp_needed LOOP
        remaining_xp := remaining_xp - xp_needed;
        level := level + 1;
        xp_needed := 500 + (level - 1) * 100;
    END LOOP;

    RETURN level;
END;
$$ LANGUAGE plpgsql;

-- Create function to get XP needed for next level
CREATE OR REPLACE FUNCTION xp_needed_for_next_level(current_level INTEGER, current_xp INTEGER)
RETURNS INTEGER AS $$
DECLARE
    xp_for_next_level INTEGER;
    total_xp_for_current_level INTEGER := 0;
    i INTEGER;
BEGIN
    -- Calculate total XP needed for current level
    FOR i IN 1..current_level LOOP
        IF i = 1 THEN
            total_xp_for_current_level := total_xp_for_current_level + 500;
        ELSE
            total_xp_for_current_level := total_xp_for_current_level + 500 + (i - 1) * 100;
        END IF;
    END LOOP;

    -- Calculate XP needed for next level
    xp_for_next_level := 500 + (current_level) * 100;

    RETURN (total_xp_for_current_level + xp_for_next_level) - current_xp;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE user_statistics IS 'Comprehensive user statistics including level, XP, and performance metrics';
COMMENT ON TABLE exams IS 'Individual exam records with scores and timing information';
COMMENT ON TABLE exam_topic_performance IS 'Performance breakdown by topic/category for each exam';
COMMENT ON TABLE question_attempts IS 'Detailed record of every question attempt for error analysis';
COMMENT ON TABLE user_achievements IS 'Unlocked achievements for gamification system';
COMMENT ON TABLE achievement_progress IS 'Progress tracking for achievements not yet unlocked';
COMMENT ON TABLE study_sessions IS 'Detailed study session tracking for analytics';
COMMENT ON TABLE user_weak_topics IS 'Analysis of weak areas for personalized recommendations';
COMMENT ON TABLE user_preferences IS 'User preferences for personalized experience';

-- Sample data for testing (only insert if tables are empty)
INSERT INTO user_statistics (user_id, level, total_xp, exams_completed, total_questions_answered, correct_answers, study_time_minutes, daily_streak_count, longest_streak)
SELECT 1, 3, 1250, 8, 360, 306, 480, 5, 12
WHERE NOT EXISTS (SELECT 1 FROM user_statistics WHERE user_id = 1);

INSERT INTO user_achievements (user_id, achievement_id, unlocked_at, xp_earned)
SELECT 1, 'first_exam', CURRENT_TIMESTAMP - INTERVAL '7 days', 50
WHERE NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = 1 AND achievement_id = 'first_exam');

INSERT INTO user_achievements (user_id, achievement_id, unlocked_at, xp_earned)
SELECT 1, 'week_streak', CURRENT_TIMESTAMP - INTERVAL '2 days', 150
WHERE NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = 1 AND achievement_id = 'week_streak');

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_exams_user_status ON exams(user_id, status);
CREATE INDEX IF NOT EXISTS idx_topic_performance_category_percentage ON exam_topic_performance(category, percentage);
CREATE INDEX IF NOT EXISTS idx_question_attempts_category_correct ON question_attempts(category, is_correct);

-- Final optimization: Analyze tables for query planning
ANALYZE user_statistics;
ANALYZE exams;
ANALYZE exam_topic_performance;
ANALYZE question_attempts;
ANALYZE user_achievements;
ANALYZE achievement_progress;
ANALYZE study_sessions;
ANALYZE user_weak_topics;
ANALYZE user_preferences;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Statistics and Gamification Database Schema Created Successfully';
    RAISE NOTICE '📊 Tables created: 9 main tables + 3 views';
    RAISE NOTICE '🎯 Features: User statistics, achievements, progress tracking, weak topic analysis';
    RAISE NOTICE '⚡ Optimized with indexes and triggers for performance';
END $$;