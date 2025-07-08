# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Festival Ready v3.0 is a complete rebuild of the film festival submission optimization platform. It provides AI-powered tools for filmmakers and screenwriters to generate professional taglines, synopses, biographies, and artist statements for festival submissions.

## Architecture Overview

### Core Components

**Client-Side Structure:**
- **12 Isolated Tool Pages**: Each tool (film-synopsis.html, screenplay-synopsis.html, etc.) is a standalone HTML page with embedded CSS/JavaScript
- **Processing Pipeline**: `processing-selection.html` → `thank-you.html` flow for all submissions
- **Session Storage**: Form data persists between pages using sessionStorage with naming pattern `{tooltype}Data`

**Backend Integration:**
- **Supabase Database**: PostgreSQL database using `submissions_v3` table exclusively
- **Edge Functions**: Supabase edge functions handle AI processing and email delivery
- **AI Processing**: Gemini 1.5 Flash for content generation via Google's Generative AI API
- **Email Delivery**: Resend API integration for professional HTML emails

### Key Architectural Decisions

**Tool Isolation**: Each of the 12 tools is completely self-contained to prevent routing conflicts from v2.0. All tools follow identical patterns but have unique form fields based on their purpose.

**Dual-Tier Processing**: 
- Standard (FREE): Gemini 1.5 Flash processing
- Premium ($4.99): Enhanced processing with additional features (currently redirects to standard)

**v3.0 Database Schema**: 
- Uses `submissions_v3` table with exactly 56 approved fields following snake_case naming convention
- All edge functions use `v3-` prefix for clear versioning
- No legacy v2.0 tables or functions should be used

## Development Commands

### Local Development
```bash
# Serve locally for testing
python3 -m http.server 8000
# Access at http://localhost:8000/

# Node.js AI processor for local testing (requires .env file)
npm install                 # Install dependencies first
npm start                   # Run AI processor (alias for node ai-processor.js)
npm run monitor             # Monitor pending submissions (continuous monitoring every 30 seconds)
npm run process-pending     # Process pending submissions (one-time check)
```

### AI Processor Setup
Before running AI processor commands, configure environment variables:
```bash
# Copy example and edit with your credentials
cp .env.example .env
# Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_API_KEY
```

### Database Operations
```bash
# Execute SQL queries via Supabase CLI or direct API calls
# Check v3 submissions: SELECT * FROM submissions_v3 ORDER BY created_at DESC LIMIT 5;
# Check processing status: SELECT id, status, email_sent, created_at FROM submissions_v3 WHERE status = 'pending';
# Check prompt usage: SELECT * FROM prompt_usage_log ORDER BY used_at DESC LIMIT 10;
```

### Edge Function Deployment
```bash
# Deploy v3 edge function
supabase functions deploy v3-process-submission

# Set required secrets
supabase secrets set GEMINI_API_KEY=your_key
supabase secrets set RESEND_API_KEY=your_key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_key
```

**Active Functions:**
- `v3-process-submission`: Main processor for all 12 v3.0 tool types
- `admin-dashboard-api`: Administrative dashboard backend

## Form Submission Flow

1. **Tool Page**: User fills out tool-specific form (e.g., film-synopsis.html) using v3.0 56 approved field names
2. **Session Storage**: Form data saved as `{tooltype}Data` in sessionStorage 
3. **Processing Selection**: User redirected to processing-selection.html with `?tool={tooltype}` parameter
   - Dynamic header text updates based on tool type (e.g., "film synopsis" → "writer's biography")
   - Testimonial section with austin-comedy-awards.png image
   - Standard vs Premium tier selection
4. **Tier Selection**: User chooses Standard (FREE) or Premium ($4.99) processing
5. **Database Insert**: Form data mapped and inserted into `submissions_v3` table
6. **Edge Function**: `v3-process-submission` function triggered with `submissionId`
7. **AI Processing**: Gemini API generates tagline and synopsis content
8. **Email Delivery**: SendGrid sends HTML email with generated content to user
9. **Thank You Page**: User redirected to thank-you.html with completion confirmation

### Statement Type Routing
The AI processor determines statement type from the tool used:
- `director-statement.html` → `director_statement` column
- `writer-statement.html` → `writer_statement` column  
- `producer-statement.html` → `producer_statement` column
- `actor-statement.html` → `actor_statement` column

## Critical Configuration

### Supabase Project Details
- **Project URL**: `https://vmfhxkfprrbshwniguaq.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZmh4a2ZwcnJic2h3bmlndWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2ODYxNTcsImV4cCI6MjA2NTI2MjE1N30.k0OdvFzcO1nwZzxsgLPcQBeSITmV6dA_ncXpN0cpAgQ`
- **Service Role Key**: Must be set as environment variable (never commit)

### Environment Variables (Supabase Edge Functions)
- `GEMINI_API_KEY`: Google Generative AI API key for content generation
- `RESEND_API_KEY`: Resend API key for email delivery (replaced SendGrid)
- `SUPABASE_SERVICE_ROLE_KEY`: Database access with elevated permissions
- `SUPABASE_URL`: Database endpoint URL

### Environment Variables (Local AI Processor)
Create `.env` file with:
```
SUPABASE_URL=https://vmfhxkfprrbshwniguaq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_key_here
GOOGLE_API_KEY=your_gemini_api_key
```

### Email Configuration
- **Email Service**: Resend API (not SendGrid) - `RESEND_API_KEY` required
- **Verified Sender**: `noreply@filmfestivalcircuit.com`
- **Email Template**: HTML template with professional styling in edge function
- **Content Sections**: Tagline, Synopsis, Artist Statement (if applicable), Festival Recommendations

### Analytics Integration
- **Google Analytics**: Property ID `G-F2CSZ9KX52` 
- **Event Tracking**: Form submissions, tier selections, processing completion
- **User Journey**: Tracked across all tool interactions

## CRITICAL DATABASE SCHEMA RULE

**v3.0 uses exactly 56 approved fields in submissions_v3 table:**

### INPUT FIELDS (30):
```
1. audience, 2. characters, 3. community, 4. country, 5. duration,
6. email, 7. first_name, 8. genres, 9. goals, 10. inspirations_creative,
11. inspirations_people, 12. last_name, 13. learning, 14. marketing, 15. music,
16. non_film_industry_experience, 17. pages, 18. person_location, 19. plot,
20. premium_ai_prompt, 21. project_title, 22. project_type, 23. relevant_work_experience,
24. role, 25. screenings_awards, 26. script_text, 27. standard_ai_prompt,
28. story_location, 29. uploaded_script_text, 30. uploaded_script_url
```

### AI OUTPUT FIELDS (25):
```
31. standard_ai_generated_tagline, 32. premium_ai_generated_tagline,
33. standard_ai_generated_film_synopsis, 34. premium_ai_generated_film_synopsis,
35. standard_ai_generated_screenplay_synopsis, 36. premium_ai_generated_screenplay_synopsis,
37. standard_ai_generated_music_video_synopsis, 38. premium_ai_generated_music_video_synopsis,
39. standard_ai_generated_actors_biography, 40. premium_ai_generated_actors_biography,
41. standard_ai_generated_directors_biography, 42. premium_ai_generated_directors_biography,
43. standard_ai_generated_producers_biography, 44. premium_ai_generated_producers_biography,
45. standard_ai_generated_writers_biography, 46. premium_ai_generated_writers_biography,
47. standard_ai_generated_actors_statement, 48. premium_ai_generated_actors_statement,
49. standard_ai_generated_directors_statement, 50. premium_ai_generated_directors_statement,
51. standard_ai_generated_producers_statement, 52. premium_ai_generated_producers_statement,
53. standard_ai_generated_writers_statement, 54. premium_ai_generated_writers_statement,
55. processing_tier
```

### ADDITIONAL FIELD (1):
```
56. city_state
```

**TOTAL: 56 fields**

**NEVER modify this list without explicit user approval. All form fields must map to these exact field names using snake_case convention.**

### Database Field Mapping (v3.0)
Form data maps to approved database columns:

**Personal/Contact Fields:**
- `toolData.first_name` → `first_name`
- `toolData.last_name` → `last_name`
- `toolData.email` → `email`
- `toolData.country` → `country`
- `toolData.person_location` → `person_location`
- `toolData.city_state` → `city_state`

**Project Fields:**
- `toolData.project_title` → `project_title`
- `toolData.project_type` → `project_type`
- `toolData.duration` → `duration` (films)
- `toolData.pages` → `pages` (screenplays)
- `toolData.genres` → `genres` (array)
- `toolData.audience` → `audience`

**Content Fields:**
- `toolData.characters` → `characters`
- `toolData.plot` → `plot`
- `toolData.story_location` → `story_location`
- `toolData.script_text` → `script_text`
- `toolData.uploaded_script_text` → `uploaded_script_text`
- `toolData.uploaded_script_url` → `uploaded_script_url`
- `toolData.music` → `music` (music videos)

**Statement/Biography Fields:**
- `toolData.role` → `role` (Director(s) for films, character for actors)
- `toolData.inspirations_creative` → `inspirations_creative`
- `toolData.inspirations_people` → `inspirations_people`
- `toolData.goals` → `goals`
- `toolData.relevant_work_experience` → `relevant_work_experience`
- `toolData.non_film_industry_experience` → `non_film_industry_experience`
- `toolData.screenings_awards` → `screenings_awards`
- `toolData.community` → `community`
- `toolData.learning` → `learning`
- `toolData.marketing` → `marketing`

**Processing Fields:**
- `toolData.standard_ai_prompt` → `standard_ai_prompt`
- `toolData.premium_ai_prompt` → `premium_ai_prompt`
- `processing_tier` → `processing_tier` (standard/premium)

### Statement Generator Field Structure
**Enhanced field structure for statement generators (Actor, Director, Producer, Writer):**
- Personal info section (first_name, last_name, email, country, person_location)
- Project-specific fields (project_title, character description/creative vision)
- Inspirations fields (creative works and people that inspired them)
- Experience/approach fields (relevant work experience, creative process)
- Goals field (future aspirations and career objectives)

## Tool Categories and Types

**Synopsis Tools**: Film, Screenplay, Music Video
- Common fields: Story Location(s), main characters, plot/stakes/challenges, script details
- Music Video uses story/lyrics placeholder text to distinguish from film content

**Biography Tools**: Actor, Director, Producer, Writer (150-200 words, career-focused, third person)
**Statement Tools**: Actor, Director, Producer, Writer (200-250 words, project-specific, first person)
- All statement tools include: Creative Inspirations, Goals field, Relevant Work Experience
- Actor's Statement: Character description, role connection, actor inspirations
- Director's Statement: Creative vision, directorial approach, director inspirations, work experience

**Utility Tools**: Tagline Generator (9th grade reading level, 10-15 words)

### UI Components
- **Book Banner**: `book-banner.js` creates standardized Amazon affiliate banner for all tool pages
  - Automatically positions at bottom of page after DOM loads
  - Includes Google Analytics tracking via `trackBookBannerClick()`
  - Uses responsive CSS with hover animations
- **PDF Upload**: `pdf-extraction.js` utility handles script file uploads with drag-and-drop
  - Extracts text content and stores in `window.extractedPDFText`
  - Supports drag-and-drop and click-to-upload interfaces
- **Dynamic Processing**: `processing-selection.html` adapts content based on tool type
- **Character Counting**: All textarea fields include real-time character counters with warning states

## API Integration Patterns

### Gemini AI Processing
```typescript
const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }]
  })
});
```

### Resend Email Delivery  
```typescript
const emailData = {
  from: 'Festival Ready <noreply@filmfestivalcircuit.com>',
  to: [submission.email],
  subject: `Your updated ${toolType} is ready.`,
  html: emailHtml
};

const response = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${RESEND_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(emailData)
});
```

### v3.0 Database Submission
```javascript
const response = await fetch(`${supabaseUrl}/rest/v1/submissions_v3`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseKey}`,
    'apikey': supabaseKey,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  },
  body: JSON.stringify(submissionData)
});
```

## Prompt Management Architecture

### Prompt Storage Layers
1. **Database (Primary)**: `survey_prompts` table with RLS protection
   - 24 prompts (12 tools × 2 tiers) stored with version control
   - Accessed via `get_survey_prompt()` database function
   - Admin-only write access via `admin_users` table

2. **Configuration File (Fallback)**: `prompts.config.js` 
   - READ-ONLY file containing all production prompts
   - Used as fallback if database query fails
   - Protected by `.gitattributes` from diff exposure

3. **Environment Variables (Ultra-Sensitive)**: For proprietary premium prompts
   - Example: `PREMIUM_FILM_SYNOPSIS_PROMPT` in `.env.prompts`
   - Never committed to version control

### Supabase Database Tables
- `submissions_v3`: Main submission storage (56 approved fields)
- `survey_prompts`: AI prompt storage with version control
- `admin_users`: Administrative access control
- `prompt_usage_log`: Analytics for prompt usage tracking

### Database Setup SQL Files
```bash
# Initial v3 prompt system setup
psql -f create-survey-prompts-table.sql
psql -f populate-survey-prompts.sql
psql -f populate-survey-prompts-part2.sql
psql -f populate-survey-prompts-part3.sql
psql -f update-v3-process-submission-db.sql
```

## Common Debugging Patterns

### Form Submission Issues
1. Check browser console for JavaScript errors
2. Verify sessionStorage contains form data with correct key format
3. Check database for submission record creation in `submissions_v3` table
4. Monitor `v3-process-submission` edge function logs for processing errors
5. Ensure all form field names match the 56 approved database fields

### Email Delivery Problems
1. Verify Resend domain authentication for `filmfestivalcircuit.com`
2. Check edge function logs for Resend API responses
3. Confirm `email_sent` flag in database after processing
4. Verify email subject follows pattern: `Your updated [Tool Type] for "[Project]" is ready.`

### AI Generation Failures
1. Check Gemini API key validity and quota limits
2. Review prompt formatting and content length restrictions
3. Verify fallback content generation for API failures

### v3.0 Schema Compliance
1. Ensure all new form fields map to approved 56-field schema
2. Verify snake_case naming convention is followed
3. ALWAYS use `submissions_v3` table - NEVER use legacy `submissions` table
4. Confirm `v3-process-submission` edge function is being called
5. Verify JavaScript character counting arrays include all textarea field IDs
6. Ensure sessionStorage keys follow `{tooltype}Data` pattern (e.g., `actorsstatementData`)

## Security Considerations

- All API keys stored as Supabase environment variables, never in client code
- Email confirmation field has copy/paste disabled to prevent typos
- Honeypot field included in all forms for spam prevention
- CORS headers properly configured for edge function access
- Database access restricted to service role for edge functions
- Dual schema approach maintains data integrity and rollback capability

## Version Management

**v3.0 (Active Production)**: Uses `submissions_v3` table and `v3-` prefixed edge functions with 56 approved fields

**IMPORTANT**: Never use v2.0 tables (`submissions`, `film_categories`, `creator_roles`) or v2.0 edge functions. All development should use v3.0 systems exclusively.

## Tool Page Structure & Architecture

All 12 tool pages follow identical architectural patterns:
- **HTML Structure**: Self-contained with embedded CSS and JavaScript
- **Form Fields**: Map directly to 56 approved database fields using exact naming
- **SessionStorage Pattern**: `{toolname}Data` (e.g., `filmsynopsisData`, `actorsstatementData`)
- **Validation**: Email confirmation with paste prevention, honeypot spam protection
- **Analytics**: Google Analytics form submission tracking with tool-specific labels
- **Navigation**: Home button, form submission redirects to `processing-selection.html?tool={toolname}`

### 12 Tool Categories
**Synopsis Tools (3)**: `film-synopsis.html`, `screenplay-synopsis.html`, `music-video-synopsis.html`
**Biography Tools (4)**: `actors-biography.html`, `directors-biography.html`, `producers-biography.html`, `writers-biography.html`  
**Statement Tools (4)**: `actors-statement.html`, `directors-statement.html`, `producers-statement.html`, `writers-statement.html`
**Utility Tool (1)**: `tagline-generator.html`

### Field Naming Conventions
- **Personal Info**: `first_name`, `last_name`, `email`, `country`, `person_location`
- **Project Info**: `project_title`, `project_type`, `duration`, `story_location`
- **Content Fields**: `characters`, `plot`, `script_text`, `genres` (array)
- **Statement-Specific**: `inspirations_people`, `goals`, `role` (Actor's Statement only)
- **Biography-Specific**: `relevant_work_experience`, `screenings_awards`, `non_film_industry_experience`, `community`

### JavaScript Pattern for All Tools
```javascript
// Character counting for textareas
const textareas = ['field1', 'field2', 'field3']; // Tool-specific array
textareas.forEach(id => {
    const textarea = document.getElementById(id);
    const counter = document.getElementById(id + 'Count');
    // Real-time character counting with warning at 1000+ chars
});

// Form submission pattern
document.getElementById('toolForm').addEventListener('submit', async function(e) {
    // Honeypot check, email validation, data collection
    // Store in sessionStorage as '{tooltype}Data'
    // Redirect to processing-selection.html?tool={toolname}
});
```

## Project Architecture Notes
- **Static File Hosting**: All tools are static HTML files with no server-side rendering
- **Version Isolation**: v3.0 completely separate from v2.0 to prevent conflicts
- **Edge Function Processing**: All AI generation happens server-side via Supabase edge functions
- **Client-Side State**: Only form data and temporary states stored in sessionStorage
- **Email Templates**: Generated server-side with SendGrid, not client-side

## Critical Implementation Rules
- Do what has been asked; nothing more, nothing less
- NEVER create files unless they're absolutely necessary for achieving your goal
- ALWAYS prefer editing an existing file to creating a new one
- NEVER proactively create documentation files (*.md) or README files unless explicitly requested
- All form field names must match the 56 approved database fields exactly

## MANDATORY PROMPT USAGE RULES
**The file `prompts.config.js` contains all 24 production prompts which are IMMUTABLE and LEGALLY BINDING:**

1. **ALWAYS import prompts**: `import { PROMPTS } from './prompts.config.js';`
2. **NEVER modify prompts**: No editing, trimming, concatenating, or any string operations
3. **FORBIDDEN**: ❌ `PROMPTS.film_synopsis.standard.trim()` ❌ `${PROMPTS.film_synopsis.standard} extra text`
4. **CORRECT**: ✅ `const prompt = PROMPTS.film_synopsis.standard;` (direct reference only)
5. **These prompts are intellectual property** - ANY modification invalidates their integrity

See MANDATORY-PROMPT-USAGE.md for complete enforcement rules.