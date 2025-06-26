-- Festival Ready v2.0 Database Schema Updates
-- Run these commands in the Supabase SQL Editor

-- Step 1: Add new columns to submissions table
DO $$
BEGIN
    -- Add submission_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'submission_type') THEN
        ALTER TABLE submissions ADD COLUMN submission_type VARCHAR(20) DEFAULT 'screenplay';
        ALTER TABLE submissions ADD CONSTRAINT submissions_submission_type_check CHECK (submission_type IN ('screenplay', 'film'));
    END IF;

    -- Add film_category column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'film_category') THEN
        ALTER TABLE submissions ADD COLUMN film_category VARCHAR(100);
    END IF;

    -- Add runtime_minutes column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'runtime_minutes') THEN
        ALTER TABLE submissions ADD COLUMN runtime_minutes INTEGER;
    END IF;

    -- Add creator_roles column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'creator_roles') THEN
        ALTER TABLE submissions ADD COLUMN creator_roles TEXT[];
    END IF;

    -- Add statement_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'statement_type') THEN
        ALTER TABLE submissions ADD COLUMN statement_type VARCHAR(50);
    END IF;

    -- Add audience_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'audience_type') THEN
        ALTER TABLE submissions ADD COLUMN audience_type VARCHAR(20);
        ALTER TABLE submissions ADD CONSTRAINT submissions_audience_type_check CHECK (audience_type IN ('general', 'mature'));
    END IF;
END $$;

-- Step 2: Update existing records
UPDATE submissions 
SET submission_type = 'screenplay', 
    audience_type = 'general' 
WHERE submission_type IS NULL;

-- Step 3: Create film_categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS film_categories (
    id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL,
    format_type VARCHAR(20) NOT NULL,
    min_runtime INTEGER,
    max_runtime INTEGER,
    audience_type VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    award_name VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Step 4: Create creator_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS creator_roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    statement_prefix TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Step 5: Insert creator roles data
INSERT INTO creator_roles (role_name, statement_prefix, description) VALUES
('director', 'The reason why I wanted to direct this film is because', 'For directors who helmed the creative vision of the film'),
('writer', 'I was inspired to write this story because', 'For writers who created the screenplay or story'),
('producer', 'I was inspired to work with this film crew to finish this film because', 'For producers who managed the production process'),
('actor', 'The reason why I wanted to take a role in this film is because', 'For actors who performed in the film')
ON CONFLICT (role_name) DO NOTHING;

-- Step 6: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_submissions_type ON submissions(submission_type);
CREATE INDEX IF NOT EXISTS idx_submissions_film_category ON submissions(film_category);
CREATE INDEX IF NOT EXISTS idx_film_categories_format ON film_categories(format_type);
CREATE INDEX IF NOT EXISTS idx_film_categories_audience ON film_categories(audience_type);

-- Step 7: Insert sample film categories (just a few for testing)
INSERT INTO film_categories (category_name, format_type, min_runtime, max_runtime, audience_type, description, award_name) VALUES
('Action Feature Film', 'feature_film', 31, 120, 'general', 'Submit your action feature film, 31-120 minutes in length including credits. Enter your action film in this dynamic category if it features high-octane sequences such as fights, chases, driving scenes, acrobatics, gun battles, or martial arts.', 'Best Action Feature Film Award'),
('Comedy Film', 'film', 7, 30, 'general', 'Submit your comedy film, 7-30 minutes in length including credits. Our judges are looking for creative filmmaking that blends fun dialogue, lively performances with clear character arcs, and laugh-out-loud scenes into a cohesive story where the humor flows naturally throughout.', 'Best Comedy Film Award'),
('Documentary Feature Film', 'feature_film', 31, 120, 'general', 'Submit your documentary feature film, 31-120 minutes in length including credits. Our judges are looking for creative filmmaking that blends insightful interviews, compelling real-world footage, and truthful storytelling into a cohesive documentary where the narrative and information flow naturally throughout.', 'Best Documentary Feature Film Award'),
('Horror Film', 'film', 7, 30, 'mature', 'Submit your horror film, 7-30 minutes in length including credits. Our judges are looking for creative filmmaking that blends frightening dialogue, chilling performances with clear character arcs, and terrifying scenes into a cohesive story where the horror and dread flow naturally throughout.', 'Best Horror Film Award'),
('Music Video', 'music_video', 1, 6, 'general', 'Submit your music video, 6 minutes or less including credits. Our judges are looking for music videos of all musical genres. They are impressed by good stories, great acting, excellent cinematography, and cool editing that syncs really well with the music.', 'Best Music Video Award')
ON CONFLICT (category_name) DO NOTHING;
