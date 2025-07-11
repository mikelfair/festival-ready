import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');

// FILM SYNOPSIS PROMPTS - ISOLATED
const FILM_SYNOPSIS_PROMPTS = {
  standard: `STANDARD AI Film Synopsis Generator

Create a film synopsis following this exact structure:

Step-by-Step Instructions:
1. Start with: "[Film Title] follows [main character name], a [character description]..."
2. In sentence 2-3: Establish the genre and setting
3. In sentence 4-5: Describe the main conflict and what's at stake
4. MANDATORY FINAL SENTENCE: The synopsis MUST end with a question - never a statement. Use format like "Will [character] be able to [goal]?" or "Can [character] [overcome challenge]?" or similar question structure.

Requirements:
- Length: 75 words exactly (absolute maximum: 100 words)
- Reading level: 9th grade (short sentences, common words)
- Include: Character name, genre, conflict, stakes
- Exclude: Ending, spoilers, fields marked "Not Used"
- Format: Single paragraph
- IMPORTANT: Do not use any hyphens, dashes or long dashes
- Use the story_location field for setting information and completely ignore the person_location field at all times.
- Do not reveal the ending or resolution of the story under any circumstances.

Checklist Before Submitting:
✓ Film title in first sentence
✓ Genre is clear
✓ Main character introduced
✓ Conflict explained
✓ Ends with a question (mandatory)
✓ Under 100 words
✓ No hyphens or dashes
✓ No ending revealed`,
  premium: `PREMIUM AI Film Synopsis Generator

Craft a cinematic synopsis that captures the essence of the film while building irresistible intrigue.

Creative Direction:
Transform the provided information into a synopsis that functions as a written movie trailer, balancing revelation with mystery, establishing tone through language choices, and creating emotional investment in the character's journey.

Sophisticated Requirements:
- Opening Hook: Weave the title organically into an opening that immediately establishes stakes
- Genre Immersion: Convey genre through atmosphere and word choice rather than explicit labels
- Character Depth: Present protagonists as complex individuals facing impossible choices
- Escalating Tension: Build momentum through increasingly dire consequences
- Psychological Hook: MANDATORY: Conclude with a compelling question that taps into universal human fears or desires - never end with a statement
- IMPORTANT: Do not use any hyphens, dashes or long dashes
- Use the story_location field for setting information and completely ignore the person_location field at all times.
- Absolutely do not reveal the ending or resolution of the story.

Technical Parameters:
- Optimize for 75 words while allowing flexibility (75-100 words) for narrative flow
- Maintain 9th grade readability without sacrificing sophistication
- Balance accessibility with cinematic language
- Create subtext that rewards careful readers

Note: Exclude "Not Used" fields and protect user privacy throughout.`
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { submissionId, tier } = await req.json();
    console.log('Processing film synopsis for submission:', submissionId, 'tier:', tier);

    // Get submission from database
    const { data: submission, error: fetchError } = await getSubmission(submissionId);
    
    if (fetchError || !submission) {
      console.error('Error fetching submission:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Submission not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate synopsis using AI
    const synopsis = await generateFilmSynopsis(submission, tier || 'standard');
    
    // Update submission with results - use correct field names based on tier
    const updateData: any = {
      status: 'completed',
      processing_tier: tier || 'standard',
      processed_at: new Date().toISOString()
    };
    
    // Store in the correct field based on tier
    if (tier === 'premium') {
      updateData.premium_ai_generated_film_synopsis = synopsis;
    } else {
      updateData.standard_ai_generated_film_synopsis = synopsis;
    }
    
    const { error: updateError } = await updateSubmission(submissionId, updateData);

    if (updateError) {
      console.error('Error updating submission:', updateError);
      throw new Error('Failed to update submission');
    }

    // Get updated submission for email
    const { data: updatedSubmission } = await getSubmission(submissionId);
    
    // Send email
    await sendFilmSynopsisEmail(updatedSubmission || submission);

    return new Response(
      JSON.stringify({ success: true, message: 'Film synopsis generated and email sent' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing film synopsis:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateFilmSynopsis(submission: any, tier: string): Promise<string> {
  try {
    const prompt = tier === 'premium' ? FILM_SYNOPSIS_PROMPTS.premium : FILM_SYNOPSIS_PROMPTS.standard;
    const genres = submission.genres || [];
    const genreText = genres.length > 0 ? genres.join(', ') : 'drama';
    
    const fullPrompt = `${prompt}

Project Details:
- Title: ${submission.project_title}
- Type: Film
- Genre: ${genreText}
- Runtime: ${submission.duration || submission.project_duration || 'unknown'}
- Main Characters: ${submission.characters || submission.main_characters || 'Not specified'}
- Story Location: ${submission.story_location || 'Not specified'}
- Plot/Stakes/Challenges: ${submission.plot || submission.main_challenge || 'Not specified'}
- Script Details: ${submission.script_text || 'Not provided'}

Create a compelling film synopsis for this project following the guidelines above.`;

    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }]
      })
    });

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API failed: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    return generatedText.trim() || 'Professional film synopsis that meets industry standards.';

  } catch (error) {
    console.error('Error generating film synopsis:', error);
    return 'Professional film synopsis that meets industry standards.';
  }
}

function getProjectTypeDisplay(projectType: string): string {
  const projectTypeMap: { [key: string]: string } = {
    'standalone': 'Standalone work',
    'episode': 'Episode in ongoing series',
    'not_sure': 'I\'m not sure'
  };
  return projectTypeMap[projectType] || projectType;
}

function getProcessingTierDisplay(tier: string): string {
  return tier === 'premium' ? 'Premium AI Processing' : 'Standard AI Processing';
}

async function sendFilmSynopsisEmail(submission: any) {
  try {
    const subject = `Your Festival Ready Film Synopsis for "${submission.project_title}" is ready!`;
    
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Your Festival Ready Film Synopsis</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      
      <h1 style="color: #667eea; text-align: center;">🎬 Thank you for using Festival Ready</h1>
      <h2 style="color: #333; text-align: center; margin-top: -10px;">Save this email for your records</h2>
      
      <h2 style="color: #333;">🎬 Film Synopsis Suggestion Generated By Festival Ready</h2>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
        <p style="line-height: 1.6; margin: 0;">${submission.premium_ai_generated_film_synopsis || submission.standard_ai_generated_film_synopsis || 'Your film synopsis'}</p>
      </div>
      
      <h2 style="color: #333;">📋 Project Details</h2>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin-bottom: 30px;">
        <p style="line-height: 1.6; margin: 0 0 10px 0;"><strong>Project Title:</strong> ${submission.project_title}</p>
        <p style="line-height: 1.6; margin: 0 0 10px 0;"><strong>Project Type:</strong> ${getProjectTypeDisplay(submission.project_type || '')}</p>
        <p style="line-height: 1.6; margin: 0 0 10px 0;"><strong>Genre(s):</strong> ${submission.genres ? submission.genres.join(', ') : 'Not specified'}</p>
        <p style="line-height: 1.6; margin: 0 0 10px 0;"><strong>Duration:</strong> ${submission.duration || 'Not specified'}</p>
        <p style="line-height: 1.6; margin: 0;"><strong>Processing:</strong> ${getProcessingTierDisplay(submission.processing_tier || 'standard')}</p>
      </div>
      
      <h2 style="color: #333;">❓ How Do I Update My Submission?</h2>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin-bottom: 30px;">
        <p style="line-height: 1.6; margin: 0 0 15px 0;">If you'd like to add your new synopsis to your FilmFreeway submission form for a film, simply log into FilmFreeway. Click on "My Projects" from the top menu. Click on the edit button next to your project. The third heading you will see is labeled "Brief Synopsis." Simply paste your new synopsis text into that box.</p>
      </div>
      
      <h2 style="color: #333;">💰 Save 25% on Film Festival Submissions</h2>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin-bottom: 30px;">
        <p style="line-height: 1.6; margin: 0;">Use promo code <strong>festivalready25</strong> at checkout in order to save 25% on all films, screenplay, and music video submissions at <a href="https://filmfestivalcircuit.com/submissions" style="color: #667eea; text-decoration: none;">https://filmfestivalcircuit.com/submissions</a></p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://amzn.to/4naJ4FT" target="_blank" style="display: inline-block; text-decoration: none;">
          <img src="https://apps.filmfestivalcircuit.com/images/festival-books-banner.png" alt="Film Festival Submitter's Handbook & Screenplay Judging Guide - Available on Amazon" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);">
        </a>
      </div>
      
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <div style="margin-bottom: 20px;">
          <a href="https://apps.filmfestivalcircuit.com/subscribe?email=${encodeURIComponent(submission.email)}&source=film-synopsis" style="background: #28a745; color: white; text-decoration: none; padding: 10px 30px; border-radius: 5px; font-size: 16px; display: inline-block; margin-bottom: 10px;">Subscribe</a>
          <p style="color: #666; font-size: 0.9rem; margin: 10px 0;">Would you like to receive 1 email per month about updates to this app and our latest film festival submission discounts?</p>
        </div>
        
        <div style="margin-top: 20px;">
          <a href="https://apps.filmfestivalcircuit.com/unsubscribe?email=${encodeURIComponent(submission.email)}&source=film-synopsis" style="background: #6c757d; color: white; text-decoration: none; padding: 8px 20px; border-radius: 5px; font-size: 14px; display: inline-block;">Unsubscribe</a>
          <p style="color: #999; font-size: 0.85rem; margin: 5px 0;">Unsubscribe from all Festival Ready email communication.</p>
        </div>
      </div>
      
    </body>
    </html>`;

    const emailData = {
      personalizations: [{
        to: [{ email: submission.email }],
        subject: subject
      }],
      from: { 
        email: 'submissions@filmfestivalcircuit.com',
        name: 'Festival Ready'
      },
      content: [{
        type: 'text/html',
        value: emailHtml
      }]
    };

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      throw new Error(`SendGrid API failed: ${response.status}`);
    }

    console.log('Film synopsis email sent successfully to:', submission.email);

  } catch (error) {
    console.error('Error sending film synopsis email:', error);
    throw error;
  }
}

async function getSubmission(submissionId: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/submissions_v3?select=*&id=eq.${submissionId}`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'apikey': SUPABASE_SERVICE_KEY,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    return { data: null, error: { message: `HTTP ${response.status}` } };
  }
  
  const data = await response.json();
  return { data: data[0] || null, error: null };
}

async function updateSubmission(submissionId: string, updateData: any) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/submissions_v3?id=eq.${submissionId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'apikey': SUPABASE_SERVICE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updateData)
  });
  
  if (!response.ok) {
    return { error: { message: `HTTP ${response.status}` } };
  }
  
  return { error: null };
}