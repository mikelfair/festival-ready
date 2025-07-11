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

const DIRECTORS_STATEMENT_PROMPTS = {
  standard: `You are writing a professional STANDARD director statement for festival submissions. Write in first person as the director.

PURPOSE:
Festival programmers want to understand your creative vision and why this story matters to you. This demonstrates your directorial voice and approach.

WRITING STRUCTURE:
1. Vision: Your unique perspective on this story
2. Inspiration: What drove you to tell this specific story
3. Approach: Your directorial method or style choices
4. Impact: What you want audiences to experience

CONTENT REQUIREMENTS:
- Length: 150-200 words
- Voice: First person, authoritative but accessible
- Tone: Passionate, clear, purposeful
- Focus: This specific project, not general filmmaking

CONTENT CHECKLIST:
✓ Personal vision for the project clearly stated
✓ Inspiration or driving force explained
✓ Directorial approach or style mentioned
✓ Intended audience impact described
✓ Authentic director voice maintained
✓ Professional confidence displayed

AVOID:
- Generic statements about "good storytelling"
- Technical jargon that doesn't serve the story
- Overly philosophical or abstract language
- Comparison to other directors unless essential
- Apologetic or uncertain tone`,
  premium: `You are crafting a PREMIUM director statement that demonstrates both artistic vision and cultural awareness for festival consideration. Write as the director with sophisticated creative authority.

CREATIVE LEADERSHIP:
Your statement should reveal the deeper currents of your artistic decision-making while positioning your work within the larger cultural conversation.

SOPHISTICATED STRUCTURE:
1. ARTISTIC NECESSITY: Why this story demanded to be told now
2. DIRECTORIAL PHILOSOPHY: Your approach to cinematic storytelling
3. CULTURAL POSITIONING: How the work contributes to contemporary dialogue
4. AUDIENCE TRANSFORMATION: What viewers will discover or feel

PREMIUM CRAFT ELEMENTS:
- Artistic conviction balanced with humility
- Specific creative choices explained
- Cultural or social awareness integrated naturally
- Personal investment revealed through specificity
- Professional confidence without pretension

ELEVATED TECHNIQUES:
- Word count: 175 words optimal (150-200 range)
- Layered meaning through concrete examples
- Visual language that suggests cinematic thinking
- Emotional truth over intellectual concepts
- Cultural context without name-dropping

INDUSTRY SOPHISTICATION:
- Demonstrate understanding of visual storytelling
- Show awareness of contemporary cinema
- Reveal collaborative leadership style
- Express commitment to meaningful entertainment
- Balance personal and universal themes

Remember: You're not just explaining your film, you're proving your essential voice in contemporary cinema.`
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { submissionId, tier } = await req.json();
    console.log('Processing director statement for submission:', submissionId, 'tier:', tier);

    const { data: submission, error: fetchError } = await getSubmission(submissionId);
    
    if (fetchError || !submission) {
      console.error('Error fetching submission:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Submission not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const statement = await generateDirectorStatement(submission, tier || 'standard');
    
    // Update submission with results - use correct field names based on tier
    const updateData: any = {
      status: 'completed',
      processing_tier: tier || 'standard',
      processed_at: new Date().toISOString()
    };
    
    // Store in the correct field based on tier
    if (tier === 'premium') {
      updateData.premium_ai_generated_directors_statement = statement;
    } else {
      updateData.standard_ai_generated_directors_statement = statement;
    }
    
    const { error: updateError } = await updateSubmission(submissionId, updateData);

    if (updateError) {
      console.error('Error updating submission:', updateError);
      throw new Error('Failed to update submission');
    }

    const { data: updatedSubmission } = await getSubmission(submissionId);
    await sendDirectorStatementEmail(updatedSubmission || submission);

    return new Response(
      JSON.stringify({ success: true, message: 'Director statement generated and email sent' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing director statement:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getProcessingTierDisplay(tier: string): string {
  return tier === 'premium' ? 'Software Processing: Premium' : 'Software Processing: Standard';
}

async function generateDirectorStatement(submission: any, tier: string): Promise<string> {
  try {
    const prompt = tier === 'premium' ? DIRECTORS_STATEMENT_PROMPTS.premium : DIRECTORS_STATEMENT_PROMPTS.standard;
    
    const fullPrompt = `${prompt}

Project Details:
- Project Title: ${submission.project_title}
- Genre: ${submission.genre || 'Not specified'}
- Creative Inspirations: ${submission.inspirations_creative || 'Not specified'}
- People Who Inspire: ${submission.inspirations_people || 'Not specified'}
- Relevant Experience: ${submission.relevant_work_experience || 'Not specified'}
- Goals: ${submission.goals || 'Not specified'}

Create a professional director statement following the guidelines above.`;

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
    
    return generatedText.trim() || 'Professional director statement highlighting creative vision and approach.';

  } catch (error) {
    console.error('Error generating director statement:', error);
    return 'Professional director statement highlighting creative vision and approach.';
  }
}

async function sendDirectorStatementEmail(submission: any) {
  try {
    const subject = `Your Festival Ready Director's Statement for ${submission.first_name} ${submission.last_name} is ready!`;
    
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Your Festival Ready Director Statement</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      
      <h1 style="color: #667eea; text-align: center;">🎭 Thank you for using Festival Ready</h1>
      <h2 style="color: #333; text-align: center; margin-top: -10px;">Save this email for your records</h2>
      
      <h2 style="color: #333;">📋 Director's Statement Details</h2>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin-bottom: 30px;">
        <p style="line-height: 1.6; margin: 0 0 10px 0;"><strong>Director's Name:</strong> ${submission.first_name} ${submission.last_name}</p>
        <p style="line-height: 1.6; margin: 0 0 10px 0;"><strong>Director's City or State:</strong> ${submission.person_location || 'Not specified'}</p>
        <p style="line-height: 1.6; margin: 0 0 10px 0;"><strong>Director's Country:</strong> ${submission.country || 'Not specified'}</p>
        <p style="line-height: 1.6; margin: 0;"><strong>${getProcessingTierDisplay(submission.processing_tier || 'standard')}</strong></p>
      </div>
      
      <h2 style="color: #333;">📖 Director's Statement Suggestion Generated By Festival Ready</h2>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
        <p style="line-height: 1.6; margin: 0;">${submission.premium_ai_generated_directors_statement || submission.standard_ai_generated_directors_statement || 'Your director statement'}</p>
      </div>
      
      <h2 style="color: #333;">❓ How Do I Update My Submission?</h2>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin-bottom: 30px;">
        <p style="line-height: 1.6; margin: 0 0 15px 0;">If you'd like to add your new biography or statement to your FilmFreeway submission form for any submission, simply log into FilmFreeway. Click on "My Projects" from the top menu. Click on the "View Project" button next to your project. Scroll down and you will see a button called Director's Biography or Screenplay Biography" When you click on that button, the section will appear that allows you to add your statement and biography. In filmfreeway there isn't a separate box for actors or producers, but the amount of text allowed is generous and you can add multiple statements or biographies to this section. Simply paste your new text into either box.</p>
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
          <a href="https://apps.filmfestivalcircuit.com/subscribe?email=${encodeURIComponent(submission.email)}&source=directors-statement" style="background: #28a745; color: white; text-decoration: none; padding: 10px 30px; border-radius: 5px; font-size: 16px; display: inline-block; margin-bottom: 10px;">Subscribe</a>
          <p style="color: #666; font-size: 0.9rem; margin: 10px 0;">Would you like to receive 1 email per month about updates to this app and our latest film festival submission discounts?</p>
        </div>
        
        <div style="margin-top: 20px;">
          <a href="https://apps.filmfestivalcircuit.com/unsubscribe?email=${encodeURIComponent(submission.email)}&source=directors-statement" style="background: #6c757d; color: white; text-decoration: none; padding: 8px 20px; border-radius: 5px; font-size: 14px; display: inline-block;">Unsubscribe</a>
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

    console.log('Director statement email sent successfully to:', submission.email);

  } catch (error) {
    console.error('Error sending director statement email:', error);
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