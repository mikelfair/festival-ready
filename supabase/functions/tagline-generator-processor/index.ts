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

// TAGLINE GENERATOR PROMPTS - ISOLATED
const TAGLINE_PROMPTS = {
  standard: `CRITICAL: DO NOT WRITE A LOGLINE OR SYNOPSIS. THIS IS A TAGLINE GENERATOR.

TAGLINE = Short marketing phrase (10-15 words MAX)
LOGLINE = Story summary (DO NOT CREATE THIS)

You are creating a TAGLINE ONLY. Not a logline, not a synopsis, not a plot summary.

MANDATORY TAGLINE FORMAT:
- MAXIMUM 15 words (most successful taglines are 6-12 words)
- MUST end with a question mark
- NO character names allowed
- NO plot details allowed
- NO story outcomes allowed

SUCCESSFUL TAGLINE EXAMPLES:
- "What if your worst fear became reality?"
- "Can love survive the impossible?"
- "Will freedom come at any cost?"
- "Should some secrets stay buried?"

FORBIDDEN LOGLINE FORMAT (DO NOT USE):
- "When a [character] [situation], they must [action]"
- Any sentence starting with "When"
- Any detailed plot description
- Any character descriptions

YOUR TASK: Create a 6-12 word question that creates intrigue without revealing plot details.

CRITICAL RULES:
1. Maximum 15 words (shorter is better)
2. Must end with question mark
3. No character names
4. No detailed plot
5. Creates mystery and intrigue
6. Uses universal themes (survival, love, fear, justice, etc.)`,
  premium: `CRITICAL: CREATE A TAGLINE, NOT A LOGLINE OR SYNOPSIS.

PREMIUM TAGLINE = Iconic marketing phrase (6-12 words)
LOGLINE = Detailed story summary (FORBIDDEN)

You are crafting a PREMIUM TAGLINE that becomes culturally memorable.

PREMIUM TAGLINE EXAMPLES:
- "In space, no one can hear you scream" (Alien)
- "Just when you thought it was safe to go back in the water" (Jaws 2)
- "Be afraid. Be very afraid." (The Fly)
- "What if someone you trusted was actually your worst nightmare?"

PREMIUM REQUIREMENTS:
1. 6-12 words maximum (iconic taglines are SHORT)
2. MUST end with question mark
3. Zero character names
4. Zero plot details
5. Universal psychological appeal
6. Quotable and memorable
7. Creates emotional response

FORBIDDEN LOGLINE ELEMENTS:
- Character descriptions
- Plot sequences 
- "When [character]" format
- Story outcomes
- Detailed scenarios

PREMIUM TECHNIQUES:
- Tap into primal emotions (fear, desire, curiosity)
- Use powerful, active language
- Create double meanings
- Build cultural resonance
- Promise transformation without revealing it

YOUR MISSION: Create a 6-12 word question that lodges in cultural consciousness and makes people NEED to see this film.`
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { submissionId, tier } = await req.json();
    console.log('Processing tagline generator for submission:', submissionId, 'tier:', tier);

    // Get submission from database
    const { data: submission, error: fetchError } = await getSubmission(submissionId);
    
    if (fetchError || !submission) {
      console.error('Error fetching submission:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Submission not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate tagline using AI
    const tagline = await generateTagline(submission, tier || 'standard');
    
    // Update submission with results - use correct field names based on tier
    const updateData: any = {
      status: 'completed',
      processing_tier: tier || 'standard',
      processed_at: new Date().toISOString()
    };
    
    // Store in the correct field based on tier
    if (tier === 'premium') {
      updateData.premium_ai_generated_tagline = tagline;
    } else {
      updateData.standard_ai_generated_tagline = tagline;
    }
    
    const { error: updateError } = await updateSubmission(submissionId, updateData);

    if (updateError) {
      console.error('Error updating submission:', updateError);
      throw new Error('Failed to update submission');
    }

    // Get updated submission for email
    const { data: updatedSubmission } = await getSubmission(submissionId);
    
    // Send email
    await sendTaglineEmail(updatedSubmission || submission);

    return new Response(
      JSON.stringify({ success: true, message: 'Tagline generated and email sent' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing tagline:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateTagline(submission: any, tier: string): Promise<string> {
  try {
    const prompt = tier === 'premium' ? TAGLINE_PROMPTS.premium : TAGLINE_PROMPTS.standard;
    const genres = submission.genres || [];
    const genreText = genres.length > 0 ? genres.join(', ') : 'drama';
    
    const fullPrompt = `${prompt}

Project Details:
- Title: ${submission.project_title}
- Genre: ${genreText}
- Main Characters: ${submission.characters || submission.main_characters || 'Not specified'}
- Story Challenge: ${submission.plot || submission.main_challenge || 'Not specified'}
- Script Details: ${submission.script_text || 'Not provided'}
- Story Location: ${submission.story_location || 'Not specified'}

IMPORTANT: Create ONLY a short tagline (6-15 words ending with question mark). DO NOT create a logline or plot summary. Output the tagline only.`;

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
    
    return generatedText.trim() || 'Creative and engaging tagline for your project';

  } catch (error) {
    console.error('Error generating tagline:', error);
    return 'Creative and engaging tagline for your project';
  }
}

async function sendTaglineEmail(submission: any) {
  try {
    const subject = `Your Festival Ready Tagline for "${submission.project_title}" is ready!`;
    
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Your Festival Ready Tagline</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      
      <h1 style="color: #667eea; text-align: center;">🎬 Your Festival Ready Tagline</h1>
      <h2 style="color: #333; text-align: center; margin-top: -10px;">"${submission.project_title}"</h2>
      
      <h2 style="color: #333;">🏷️ Your Tagline</h2>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
        <p style="line-height: 1.6; margin: 0; font-size: 1.1em; font-weight: 600;">${submission.premium_ai_generated_tagline || submission.standard_ai_generated_tagline || 'Your tagline'}</p>
      </div>
      
      <h2 style="color: #333;">📋 Project Details</h2>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
        <p style="line-height: 1.6; margin: 0 0 10px 0;"><strong>Title:</strong> ${submission.project_title}</p>
        <p style="line-height: 1.6; margin: 0 0 10px 0;"><strong>Genre:</strong> ${submission.genres ? submission.genres.join(', ') : 'Not specified'}</p>
        <p style="line-height: 1.6; margin: 0 0 10px 0;"><strong>Location:</strong> ${submission.city_state || submission.person_location || 'Not specified'}</p>
        <p style="line-height: 1.6; margin: 0;"><strong>Processing Tier:</strong> ${submission.processing_tier || 'standard'}</p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 0.9rem; margin: 0;">
          Need help? Reply to this email or visit 
          <a href="https://www.filmfestivalcircuit.com" style="color: #667eea;">filmfestivalcircuit.com</a>
        </p>
      </div>
      
    </body>
    </html>`;

    const emailData = {
      personalizations: [{
        to: [{ email: submission.email }],
        subject: subject
      }],
      from: { 
        email: 'noreply@filmfestivalcircuit.com',
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

    console.log('Tagline email sent successfully to:', submission.email);

  } catch (error) {
    console.error('Error sending tagline email:', error);
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