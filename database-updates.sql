-- Festival Ready v2.0 Database Schema Updates
-- Adding support for film submissions alongside screenplay submissions

-- Add new columns to existing submissions table
ALTER TABLE submissions 
ADD COLUMN submission_type VARCHAR(20) DEFAULT 'screenplay' CHECK (submission_type IN ('screenplay', 'film'));

ALTER TABLE submissions 
ADD COLUMN film_category VARCHAR(100);

ALTER TABLE submissions 
ADD COLUMN runtime_minutes INTEGER;

ALTER TABLE submissions 
ADD COLUMN creator_roles TEXT[]; -- Array of roles: director, writer, producer, actor

ALTER TABLE submissions 
ADD COLUMN statement_type VARCHAR(50); -- writer_statement, director_statement, producer_statement, actor_statement, combined_statement

ALTER TABLE submissions 
ADD COLUMN audience_type VARCHAR(20) CHECK (audience_type IN ('general', 'mature'));

-- Update existing screenplay submissions to have the new fields populated
UPDATE submissions 
SET submission_type = 'screenplay', 
    audience_type = 'general' 
WHERE submission_type IS NULL;

-- Create film categories reference table
CREATE TABLE film_categories (
    id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL,
    format_type VARCHAR(20) NOT NULL, -- feature_film, film, micro_film, series_episode, music_video
    min_runtime INTEGER, -- in minutes
    max_runtime INTEGER, -- in minutes
    audience_type VARCHAR(20) NOT NULL, -- general, mature
    description TEXT NOT NULL,
    award_name VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert film categories data
INSERT INTO film_categories (category_name, format_type, min_runtime, max_runtime, audience_type, description, award_name) VALUES
('Action Feature Film', 'feature_film', 31, 120, 'general', 'Submit your action feature film, 31-120 minutes in length including credits. Enter your action film in this dynamic category if it features high-octane sequences such as fights, chases, driving scenes, acrobatics, gun battles, or martial arts.', 'Best Action Feature Film Award'),
('Action Film', 'film', 7, 30, 'general', 'Submit your action film, 7-30 minutes in length including credits. Enter your action film in this dynamic category if it features high-octane sequences such as fights, chases, driving scenes, acrobatics, gun battles, or martial arts.', 'Best Action Film Award'),
('Action Micro Film', 'micro_film', 1, 6, 'general', 'Submit your action micro film, 6 minutes or less including credits. Enter your action film in this dynamic category if it features high-octane sequences such as fights, chases, driving scenes, acrobatics, gun battles, or martial arts.', 'Best Action Micro Film Award'),
('Comedy Feature Film', 'feature_film', 31, 120, 'general', 'Submit your comedy feature film, 31-120 minutes in length including credits. Our judges are looking for creative filmmaking that blends fun dialogue, lively performances with clear character arcs, and laugh-out-loud scenes into a cohesive story where the humor flows naturally throughout.', 'Best Comedy Feature Film Award'),
('Comedy Film', 'film', 7, 30, 'general', 'Submit your comedy film, 7-30 minutes in length including credits. Our judges are looking for creative filmmaking that blends fun dialogue, lively performances with clear character arcs, and laugh-out-loud scenes into a cohesive story where the humor flows naturally throughout.', 'Best Comedy Film Award'),
('Comedy Micro Film', 'micro_film', 1, 6, 'general', 'Submit your comedy micro film, 6 minutes or less including credits. Our judges are looking for creative filmmaking that blends fun dialogue, lively performances with clear character arcs, and laugh-out-loud scenes into a cohesive story where the humor flows naturally throughout.', 'Best Comedy Micro Film Award'),
('Documentary Feature Film', 'feature_film', 31, 120, 'general', 'Submit your documentary feature film, 31-120 minutes in length including credits. Our judges are looking for creative filmmaking that blends insightful interviews, compelling real-world footage, and truthful storytelling into a cohesive documentary where the narrative and information flow naturally throughout.', 'Best Documentary Feature Film Award'),
('Music Video', 'music_video', 1, 6, 'general', 'Submit your music video, 6 minutes or less including credits. Our judges are looking for music videos of all musical genres. They are impressed by good stories, great acting, excellent cinematography, and cool editing that syncs really well with the music.', 'Best Music Video Award');

-- Continue with remaining categories...
-- (This is a sample - we'll need to insert all 80+ categories)

-- Create screenplay categories reference table for consistency
CREATE TABLE screenplay_categories (
    id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    audience_type VARCHAR(20) DEFAULT 'general',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create roles reference table
CREATE TABLE creator_roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    statement_prefix TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO creator_roles (role_name, statement_prefix, description) VALUES
('director', 'The reason why I wanted to direct this film is because', 'For directors who helmed the creative vision of the film'),
('writer', 'I was inspired to write this story because', 'For writers who created the screenplay or story'),
('producer', 'I was inspired to work with this film crew to finish this film because', 'For producers who managed the production process'),
('actor', 'The reason why I wanted to take a role in this film is because', 'For actors who performed in the film');

-- Add indexes for performance
CREATE INDEX idx_submissions_type ON submissions(submission_type);
CREATE INDEX idx_submissions_film_category ON submissions(film_category);
CREATE INDEX idx_film_categories_format ON film_categories(format_type);
CREATE INDEX idx_film_categories_audience ON film_categories(audience_type);
