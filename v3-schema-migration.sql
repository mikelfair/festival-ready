-- Festival Ready v3.0 Database Schema Migration
-- This script adds the 26 missing columns to the submissions_v3 table
-- to support the complete 56-field schema

-- Step 1: Add missing AI output fields and processing tier
DO $$
BEGIN
    -- Add city_state field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions_v3' AND column_name = 'city_state') THEN
        ALTER TABLE submissions_v3 ADD COLUMN city_state TEXT;
    END IF;

    -- Add processing_tier field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions_v3' AND column_name = 'processing_tier') THEN
        ALTER TABLE submissions_v3 ADD COLUMN processing_tier TEXT;
    END IF;

    -- Add standard AI generated fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions_v3' AND column_name = 'standard_ai_generated_tagline') THEN
        ALTER TABLE submissions_v3 ADD COLUMN standard_ai_generated_tagline TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions_v3' AND column_name = 'premium_ai_generated_tagline') THEN
        ALTER TABLE submissions_v3 ADD COLUMN premium_ai_generated_tagline TEXT;
    END IF;

    -- Synopsis fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions_v3' AND column_name = 'standard_ai_generated_film_synopsis') THEN
        ALTER TABLE submissions_v3 ADD COLUMN standard_ai_generated_film_synopsis TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions_v3' AND column_name = 'premium_ai_generated_film_synopsis') THEN
        ALTER TABLE submissions_v3 ADD COLUMN premium_ai_generated_film_synopsis TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions_v3' AND column_name = 'standard_ai_generated_screenplay_synopsis') THEN
        ALTER TABLE submissions_v3 ADD COLUMN standard_ai_generated_screenplay_synopsis TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions_v3' AND column_name = 'premium_ai_generated_screenplay_synopsis') THEN
        ALTER TABLE submissions_v3 ADD COLUMN premium_ai_generated_screenplay_synopsis TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions_v3' AND column_name = 'standard_ai_generated_music_video_synopsis') THEN
        ALTER TABLE submissions_v3 ADD COLUMN standard_ai_generated_music_video_synopsis TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions_v3' AND column_name = 'premium_ai_generated_music_video_synopsis') THEN
        ALTER TABLE submissions_v3 ADD COLUMN premium_ai_generated_music_video_synopsis TEXT;
    END IF;

    -- Biography fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions_v3' AND column_name = 'standard_ai_generated_actors_biography') THEN
        ALTER TABLE submissions_v3 ADD COLUMN standard_ai_generated_actors_biography TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions_v3' AND column_name = 'premium_ai_generated_actors_biography') THEN
        ALTER TABLE submissions_v3 ADD COLUMN premium_ai_generated_actors_biography TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions_v3' AND column_name = 'standard_ai_generated_directors_biography') THEN
        ALTER TABLE submissions_v3 ADD COLUMN standard_ai_generated_directors_biography TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions_v3' AND column_name = 'premium_ai_generated_directors_biography') THEN
        ALTER TABLE submissions_v3 ADD COLUMN premium_ai_generated_directors_biography TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions_v3' AND column_name = 'standard_ai_generated_producers_biography') THEN
        ALTER TABLE submissions_v3 ADD COLUMN standard_ai_generated_producers_biography TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions_v3' AND column_name = 'premium_ai_generated_producers_biography') THEN
        ALTER TABLE submissions_v3 ADD COLUMN premium_ai_generated_producers_biography TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions_v3' AND column_name = 'standard_ai_generated_writers_biography') THEN
        ALTER TABLE submissions_v3 ADD COLUMN standard_ai_generated_writers_biography TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions_v3' AND column_name = 'premium_ai_generated_writers_biography') THEN
        ALTER TABLE submissions_v3 ADD COLUMN premium_ai_generated_writers_biography TEXT;
    END IF;

    -- Statement fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions_v3' AND column_name = 'standard_ai_generated_actors_statement') THEN
        ALTER TABLE submissions_v3 ADD COLUMN standard_ai_generated_actors_statement TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions_v3' AND column_name = 'premium_ai_generated_actors_statement') THEN
        ALTER TABLE submissions_v3 ADD COLUMN premium_ai_generated_actors_statement TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions_v3' AND column_name = 'standard_ai_generated_directors_statement') THEN
        ALTER TABLE submissions_v3 ADD COLUMN standard_ai_generated_directors_statement TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions_v3' AND column_name = 'premium_ai_generated_directors_statement') THEN
        ALTER TABLE submissions_v3 ADD COLUMN premium_ai_generated_directors_statement TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions_v3' AND column_name = 'standard_ai_generated_producers_statement') THEN
        ALTER TABLE submissions_v3 ADD COLUMN standard_ai_generated_producers_statement TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions_v3' AND column_name = 'premium_ai_generated_producers_statement') THEN
        ALTER TABLE submissions_v3 ADD COLUMN premium_ai_generated_producers_statement TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions_v3' AND column_name = 'standard_ai_generated_writers_statement') THEN
        ALTER TABLE submissions_v3 ADD COLUMN standard_ai_generated_writers_statement TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions_v3' AND column_name = 'premium_ai_generated_writers_statement') THEN
        ALTER TABLE submissions_v3 ADD COLUMN premium_ai_generated_writers_statement TEXT;
    END IF;
END $$;

-- Step 2: Add indexes for performance on the new fields
CREATE INDEX IF NOT EXISTS idx_submissions_v3_processing_tier ON submissions_v3(processing_tier);
CREATE INDEX IF NOT EXISTS idx_submissions_v3_city_state ON submissions_v3(city_state);

-- Step 3: Add comments to document the fields
COMMENT ON COLUMN submissions_v3.city_state IS 'User location in City, State format for marketing/tracking';
COMMENT ON COLUMN submissions_v3.processing_tier IS 'Processing tier selected: standard or premium';

-- AI output fields
COMMENT ON COLUMN submissions_v3.standard_ai_generated_tagline IS 'Standard tier AI-generated tagline';
COMMENT ON COLUMN submissions_v3.premium_ai_generated_tagline IS 'Premium tier AI-generated tagline';

COMMENT ON COLUMN submissions_v3.standard_ai_generated_film_synopsis IS 'Standard tier AI-generated film synopsis';
COMMENT ON COLUMN submissions_v3.premium_ai_generated_film_synopsis IS 'Premium tier AI-generated film synopsis';

COMMENT ON COLUMN submissions_v3.standard_ai_generated_screenplay_synopsis IS 'Standard tier AI-generated screenplay synopsis';
COMMENT ON COLUMN submissions_v3.premium_ai_generated_screenplay_synopsis IS 'Premium tier AI-generated screenplay synopsis';

COMMENT ON COLUMN submissions_v3.standard_ai_generated_music_video_synopsis IS 'Standard tier AI-generated music video synopsis';
COMMENT ON COLUMN submissions_v3.premium_ai_generated_music_video_synopsis IS 'Premium tier AI-generated music video synopsis';

COMMENT ON COLUMN submissions_v3.standard_ai_generated_actors_biography IS 'Standard tier AI-generated actor biography';
COMMENT ON COLUMN submissions_v3.premium_ai_generated_actors_biography IS 'Premium tier AI-generated actor biography';

COMMENT ON COLUMN submissions_v3.standard_ai_generated_directors_biography IS 'Standard tier AI-generated director biography';
COMMENT ON COLUMN submissions_v3.premium_ai_generated_directors_biography IS 'Premium tier AI-generated director biography';

COMMENT ON COLUMN submissions_v3.standard_ai_generated_producers_biography IS 'Standard tier AI-generated producer biography';
COMMENT ON COLUMN submissions_v3.premium_ai_generated_producers_biography IS 'Premium tier AI-generated producer biography';

COMMENT ON COLUMN submissions_v3.standard_ai_generated_writers_biography IS 'Standard tier AI-generated writer biography';
COMMENT ON COLUMN submissions_v3.premium_ai_generated_writers_biography IS 'Premium tier AI-generated writer biography';

COMMENT ON COLUMN submissions_v3.standard_ai_generated_actors_statement IS 'Standard tier AI-generated actor statement';
COMMENT ON COLUMN submissions_v3.premium_ai_generated_actors_statement IS 'Premium tier AI-generated actor statement';

COMMENT ON COLUMN submissions_v3.standard_ai_generated_directors_statement IS 'Standard tier AI-generated director statement';
COMMENT ON COLUMN submissions_v3.premium_ai_generated_directors_statement IS 'Premium tier AI-generated director statement';

COMMENT ON COLUMN submissions_v3.standard_ai_generated_producers_statement IS 'Standard tier AI-generated producer statement';
COMMENT ON COLUMN submissions_v3.premium_ai_generated_producers_statement IS 'Premium tier AI-generated producer statement';

COMMENT ON COLUMN submissions_v3.standard_ai_generated_writers_statement IS 'Standard tier AI-generated writer statement';
COMMENT ON COLUMN submissions_v3.premium_ai_generated_writers_statement IS 'Premium tier AI-generated writer statement';

-- Step 4: Verify all columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'submissions_v3'
ORDER BY column_name;