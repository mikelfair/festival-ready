# Apply Festival Ready v2.0 Database Changes

## Instructions for Manual Database Update

Since we're experiencing CLI connectivity issues, please apply these database changes manually through the Supabase dashboard.

### Step 1: Access Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Sign in with your account
3. Navigate to your project: **vmfhxkfprrbshwniguaq**
4. Click on **"SQL Editor"** in the left sidebar

### Step 2: Apply Database Schema Changes
Copy and paste the following SQL commands into the SQL Editor and run them:

```sql
-- Festival Ready v2.0 Database Schema Updates
-- Add new columns to support both films and screenplays

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

-- Step 3: Create film_categories table
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

-- Step 4: Create creator_roles table
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

-- Step 7: Insert sample film categories for testing
INSERT INTO film_categories (category_name, format_type, min_runtime, max_runtime, audience_type, description, award_name) VALUES
('Action Feature Film', 'feature_film', 31, 120, 'general', 'Submit your action feature film, 31-120 minutes in length including credits. Enter your action film in this dynamic category if it features high-octane sequences such as fights, chases, driving scenes, acrobatics, gun battles, or martial arts.', 'Best Action Feature Film Award'),
('Comedy Film', 'film', 7, 30, 'general', 'Submit your comedy film, 7-30 minutes in length including credits. Our judges are looking for creative filmmaking that blends fun dialogue, lively performances with clear character arcs, and laugh-out-loud scenes into a cohesive story where the humor flows naturally throughout.', 'Best Comedy Film Award'),
('Documentary Feature Film', 'feature_film', 31, 120, 'general', 'Submit your documentary feature film, 31-120 minutes in length including credits. Our judges are looking for creative filmmaking that blends insightful interviews, compelling real-world footage, and truthful storytelling into a cohesive documentary where the narrative and information flow naturally throughout.', 'Best Documentary Feature Film Award'),
('Horror Film', 'film', 7, 30, 'mature', 'Submit your horror film, 7-30 minutes in length including credits. Our judges are looking for creative filmmaking that blends frightening dialogue, chilling performances with clear character arcs, and terrifying scenes into a cohesive story where the horror and dread flow naturally throughout.', 'Best Horror Film Award'),
('Music Video', 'music_video', 1, 6, 'general', 'Submit your music video, 6 minutes or less including credits. Our judges are looking for music videos of all musical genres. They are impressed by good stories, great acting, excellent cinematography, and cool editing that syncs really well with the music.', 'Best Music Video Award')
ON CONFLICT (category_name) DO NOTHING;
```

### Step 3: Verify the Changes
After running the SQL commands, you can verify they worked by running this query:

```sql
-- Check that new columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'submissions' 
ORDER BY column_name;

-- Check that new tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('film_categories', 'creator_roles');

-- Check sample data
SELECT * FROM creator_roles;
SELECT category_name, format_type FROM film_categories;
```

### Step 4: Next Steps
Once you've successfully applied these database changes:

1. **Test the changes** by submitting the test query above
2. **Let me know** that the database update is complete
3. **I'll continue** implementing the questionnaire branching logic for films vs screenplays

### Expected Results
After applying these changes, your database will support:
- ✅ Both film and screenplay submissions
- ✅ Film categories (80+ categories ready to be loaded)
- ✅ Creator roles (director, writer, producer, actor)
- ✅ Runtime tracking for films vs page count for screenplays
- ✅ Role-based statement generation

### If You Encounter Issues
If you get any errors during the SQL execution:
1. **Take a screenshot** of the error message
2. **Share it with me** so I can help troubleshoot
3. **We can run the commands individually** if needed

The database schema is designed to be backwards compatible - all existing screenplay submissions will continue to work normally while adding support for film submissions.
