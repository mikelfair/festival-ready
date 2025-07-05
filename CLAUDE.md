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
- **Supabase Database**: PostgreSQL database with dual schema approach:
  - `submissions` table (v2.0 reference - legacy)
  - `submissions_v3` table (v3.0 active - current production)
- **Edge Functions**: Supabase edge functions handle AI processing and email delivery
- **AI Processing**: Gemini 1.5 Flash for content generation via Google's Generative AI API
- **Email Delivery**: SendGrid integration for professional HTML emails

### Key Architectural Decisions

**Tool Isolation**: Each of the 12 tools is completely self-contained to prevent routing conflicts from v2.0. All tools follow identical patterns but have unique form fields based on their purpose.

**Dual-Tier Processing**: 
- Standard (FREE): Gemini 1.5 Flash processing
- Premium ($4.99): Enhanced processing with additional features (currently redirects to standard)

**v3.0 Database Schema**: Uses prefix-based organization with clean separation:
- `v2-` prefix for legacy edge functions (reference only)
- `v3-` prefix for active edge functions
- `submissions_v3` table with exactly 30 approved fields following snake_case naming convention

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
# Check v2 submissions: SELECT * FROM submissions ORDER BY created_at DESC LIMIT 5;
# Check processing status: SELECT id, status, email_sent, created_at FROM submissions_v3 WHERE status = 'pending';
```

### Edge Function Deployment
- Functions deployed via Supabase edge function deployment
- Active functions: `v3-process-submission` (handles all v3.0 tool types)
- Legacy functions: `process-submission`, `process-screenplay` (v2.0 reference)
- Environment variables: `GEMINI_API_KEY`, `SENDGRID_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

## Form Submission Flow

1. **Tool Page**: User fills out tool-specific form (e.g., film-synopsis.html) using v3.0 30 approved field names
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
- `directors-statement.html` → `director_statement` column
- `writers-statement.html` → `writer_statement` column  
- `producers-statement.html` → `producer_statement` column
- `actors-statement.html` → `actor_statement` column

## Critical Configuration

### Environment Variables (Supabase)
- `GEMINI_API_KEY`: Google Generative AI API key for content generation
- `SENDGRID_API_KEY`: SendGrid API key for email delivery  
- `SUPABASE_SERVICE_ROLE_KEY`: Database access with elevated permissions
- `SUPABASE_URL`: Database endpoint URL

### Email Configuration
- **Verified Sender**: `submissions@filmfestivalcircuit.com`
- **Email Template**: HTML template with professional styling in edge function
- **Content Sections**: Tagline, Synopsis, Artist Statement (if applicable), Festival Recommendations

### Analytics Integration
- **Google Analytics**: Property ID `G-F2CSZ9KX52` 
- **Event Tracking**: Form submissions, tier selections, processing completion
- **User Journey**: Tracked across all tool interactions

## CRITICAL DATABASE SCHEMA RULE

**v3.0 uses exactly 30 approved fields in submissions_v3 table:**

```
id, created_at, updated_at, first_name, last_name, email, person_location, 
project_title, project_type, project_duration, story_location, main_characters, 
main_challenge, script_text, script_upload_text, genres, country, update_emails, 
use_new_ai, submission_type, status, generated_tagline, taglines, synopsis, 
generated_synopsis, director_statement, producer_statement, actor_statement, 
writer_statement, similar_works
```

**NEVER modify this list without explicit user approval. All form fields must map to these exact field names using snake_case convention.**

### Database Field Mapping (v3.0)
Form data maps to approved database columns:
- `toolData.first_name` → `first_name`
- `toolData.project_title` → `project_title` 
- `toolData.main_characters` → `characters` (NOTE: mapped to `characters`, not `main_characters`)
- `toolData.main_challenge` → `plot` (NOTE: mapped to `plot`, not `main_challenge`)
- `toolData.genres` → `genres` (array)
- `toolData.script_text` → `script_text`
- `toolData.script_upload_text` → `uploaded_script_text` (NOTE: mapped to `uploaded_script_text`)

## Tool Categories and Types

**Synopsis Tools**: Film, Screenplay, Music Video
**Biography Tools**: Actor, Director, Producer, Writer (150-200 words, career-focused, third person)
**Statement Tools**: Actor, Director, Producer, Writer (200-250 words, project-specific, first person)  
**Utility Tools**: Tagline Generator (9th grade reading level, 10-15 words)

### UI Components
- **Book Banner**: festival-books-banner.png Amazon affiliate integration on all tool pages
- **PDF Upload**: pdf-extraction.js utility handles script file uploads  
- **Dynamic Processing**: processing-selection.html adapts content based on tool type

## AI Processing Patterns

### Statement Opening Lines (from AI_PROMPT_PATTERNS.md)
When generating statements, the AI processor uses these opening patterns:
- **Writer's Statement**: "I was inspired to write this story because..."
- **Director's Statement**: "I was inspired to direct this film because..."
- **Producer's Statement**: "I was inspired to produce this film because..."
- **Actor's Statement**: "I was inspired to play this role because..."

### Node.js Dependencies
The ai-processor.js requires:
- `@google-ai/generativelanguage`: ^3.2.0
- `@google/generative-ai`: ^0.15.0
- `@supabase/supabase-js`: ^2.38.0
- `node-fetch`: ^2.7.0
- Node.js >= 16.0.0

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

### SendGrid Email Delivery  
```typescript
const emailData = {
  personalizations: [{ to: [{ email: submission.email }] }],
  from: { email: 'submissions@filmfestivalcircuit.com', name: 'Festival Ready' },
  content: [{ type: 'text/html', value: htmlContent }]
};
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

## Common Debugging Patterns

### Form Submission Issues
1. Check browser console for JavaScript errors
2. Verify sessionStorage contains form data with correct key format
3. Check database for submission record creation in `submissions_v3` table
4. Monitor `v3-process-submission` edge function logs for processing errors
5. Ensure all form field names match the 30 approved database fields

### Email Delivery Problems
1. Verify SendGrid sender authentication for `submissions@filmfestivalcircuit.com`
2. Check edge function logs for email API responses
3. Confirm `email_sent` flag in database after processing

### AI Generation Failures
1. Check Gemini API key validity and quota limits
2. Review prompt formatting and content length restrictions
3. Verify fallback content generation for API failures

### v3.0 Schema Compliance
1. Ensure all new form fields map to approved 30-field schema
2. Verify snake_case naming convention is followed
3. Check that `submissions_v3` table is being used, not legacy `submissions`
4. Confirm `v3-process-submission` edge function is being called
5. CRITICAL: Verify field mapping corrections:
   - `main_characters` → `characters`
   - `main_challenge` → `plot`  
   - `script_upload_text` → `uploaded_script_text`

## Security Considerations

- All API keys stored as Supabase environment variables, never in client code
- Email confirmation field has copy/paste disabled to prevent typos
- Honeypot field included in all forms for spam prevention
- CORS headers properly configured for edge function access
- Database access restricted to service role for edge functions
- Dual schema approach maintains data integrity and rollback capability

## Version Management

**v2.0 (Legacy Reference)**: Uses `submissions` table and edge functions without prefix
**v3.0 (Active Production)**: Uses `submissions_v3` table and `v3-` prefixed edge functions with 30 approved fields

Always work with v3.0 systems unless explicitly asked to reference v2.0 for historical context.