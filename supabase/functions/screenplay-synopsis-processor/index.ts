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

const SCREENPLAY_SYNOPSIS_PROMPTS = {
  standard: `You are creating a professional STANDARD screenplay synopsis for submission to film festivals. DO NOT use phrases like "In this captivating film" or "This film explores" - write as if describing the story directly.

PROJECT CONTEXT:
Film festivals receive thousands of submissions. Your synopsis must stand out through clarity and compelling storytelling while maintaining professional standards.

STEP-BY-STEP INSTRUCTIONS:
1. Opening Sentence: Start with the protagonist and their situation - "[Character name/description] [their normal life/occupation] until [inciting incident]"
2. Second Paragraph: Introduce the central conflict and antagonist/obstacle
3. Third Paragraph: Describe rising action and the major turning point
4. Final Sentence: Hint at the climax without revealing the resolution

FORMATTING REQUIREMENTS:
- Length: 200-250 words
- Paragraphs: 3-4 short, focused paragraphs
- Tense: Present tense throughout
- Tone: Professional, engaging, clear

CONTENT CHECKLIST:
✓ Protagonist clearly identified
✓ Central conflict established
✓ Stakes are evident
✓ Genre appropriate tone
✓ Story progression clear
✓ Ending NOT revealed
✓ No production details

AVOID:
- Marketing language ("must-see," "groundbreaking")
- Technical filmmaking terms
- Subplot details
- Theme statements
- Actor references`,
  premium: `You are crafting a PREMIUM screenplay synopsis that demonstrates sophisticated storytelling and market awareness for film festival submissions. Write with the authority of a seasoned story analyst.

STRATEGIC POSITIONING:
Your synopsis must serve multiple masters: festival programmers scanning hundreds of entries, potential distributors assessing market viability, and industry professionals seeking fresh voices. Every word must earn its place.

STRUCTURAL ARCHITECTURE:
1. OPENING GAMBIT: Establish your protagonist's world with surgical precision - reveal character, setting, and the disruption in one fluid motion
2. CONFLICT ESCALATION: Layer external obstacles with internal struggles, showing how plot mechanics reveal character truth
3. NARRATIVE PROPULSION: Track the protagonist's transformation through increasingly impossible choices
4. CLIMACTIC PROMISE: Build toward the inevitable confrontation without revealing resolution

PREMIUM CRAFT ELEMENTS:
- Demonstrate three-act structure without labeling it
- Show visual storytelling potential through active language
- Embed genre expectations while subverting clichés
- Create comparison points to successful films through tone, not explicit reference
- Balance artistic vision with commercial viability

TECHNICAL EXCELLENCE:
- Word count: 225 words optimal (200-250 range)
- Sentence variety: Mix lengths for rhythm
- Active voice: 90% minimum
- Specific details over generalities
- Character names used strategically

INDUSTRY AWARENESS MARKERS:
- Production-conscious storytelling
- Universal themes through specific stories
- Conflict that photographs
- Emotional stakes that transcend plot
- Opening that could be a poster image

Remember: You're not selling the film; you're proving the story works.`
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { submissionId, tier } = await req.json();
    console.log('Processing screenplay synopsis for submission:', submissionId, 'tier:', tier);

    const { data: submission, error: fetchError } = await getSubmission(submissionId);
    
    if (fetchError || !submission) {
      console.error('Error fetching submission:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Submission not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const synopsis = await generateScreenplaySynopsis(submission, tier || 'standard');
    
    // Update submission with results - use correct field names based on tier
    const updateData: any = {
      status: 'completed',
      processing_tier: tier || 'standard',
      processed_at: new Date().toISOString()
    };
    
    // Store in the correct field based on tier
    if (tier === 'premium') {
      updateData.premium_ai_generated_screenplay_synopsis = synopsis;
    } else {
      updateData.standard_ai_generated_screenplay_synopsis = synopsis;
    }
    
    const { error: updateError } = await updateSubmission(submissionId, updateData);

    if (updateError) {
      console.error('Error updating submission:', updateError);
      throw new Error('Failed to update submission');
    }

    const { data: updatedSubmission } = await getSubmission(submissionId);
    await sendScreenplaySynopsisEmail(updatedSubmission || submission);

    return new Response(
      JSON.stringify({ success: true, message: 'Screenplay synopsis generated and email sent' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing screenplay synopsis:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateScreenplaySynopsis(submission: any, tier: string): Promise<string> {
  try {
    const prompt = tier === 'premium' ? SCREENPLAY_SYNOPSIS_PROMPTS.premium : SCREENPLAY_SYNOPSIS_PROMPTS.standard;
    const genres = submission.genres || [];
    const genreText = genres.length > 0 ? genres.join(', ') : 'drama';
    
    const fullPrompt = `${prompt}

Project Details:
- Title: ${submission.project_title}
- Type: Screenplay
- Genre: ${genreText}
- Page Count: ${submission.pages || 'Not specified'}
- Main Characters: ${submission.characters || submission.main_characters || 'Not specified'}
- Story Location: ${submission.story_location || 'Not specified'}
- Plot/Stakes/Challenges: ${submission.plot || submission.main_challenge || 'Not specified'}
- Script Details: ${submission.script_text || 'Not provided'}

Create a compelling screenplay synopsis for this project following the guidelines above.`;

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
    
    return generatedText.trim() || 'Professional screenplay synopsis that meets industry standards.';

  } catch (error) {
    console.error('Error generating screenplay synopsis:', error);
    return 'Professional screenplay synopsis that meets industry standards.';
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

async function sendScreenplaySynopsisEmail(submission: any) {
  try {
    const subject = `Your Festival Ready Screenplay Synopsis for "${submission.project_title}" is ready!`;
    
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Your Festival Ready Screenplay Synopsis</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      
      <h1 style="color: #667eea; text-align: center;">📝 Thank you for using Festival Ready</h1>
      <h2 style="color: #333; text-align: center; margin-top: -10px;">Save this email for your records</h2>
      
      <h2 style="color: #333;">📝 Screenplay Synopsis Suggestion Generated By Festival Ready</h2>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
        <p style="line-height: 1.6; margin: 0;">${submission.premium_ai_generated_screenplay_synopsis || submission.standard_ai_generated_screenplay_synopsis || 'Your screenplay synopsis'}</p>
      </div>
      
      <h2 style="color: #333;">📋 Project Details</h2>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin-bottom: 30px;">
        <p style="line-height: 1.6; margin: 0 0 10px 0;"><strong>Project Title:</strong> ${submission.project_title}</p>
        <p style="line-height: 1.6; margin: 0 0 10px 0;"><strong>Project Type:</strong> ${getProjectTypeDisplay(submission.project_type || '')}</p>
        <p style="line-height: 1.6; margin: 0 0 10px 0;"><strong>Genre(s):</strong> ${submission.genres ? submission.genres.join(', ') : 'Not specified'}</p>
        <p style="line-height: 1.6; margin: 0 0 10px 0;"><strong>Page Count:</strong> ${submission.pages || 'Not specified'}</p>
        <p style="line-height: 1.6; margin: 0;"><strong>Processing:</strong> ${getProcessingTierDisplay(submission.processing_tier || 'standard')}</p>
      </div>
      
      <h2 style="color: #333;">❓ How Do I Update My Submission?</h2>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin-bottom: 30px;">
        <p style="line-height: 1.6; margin: 0 0 15px 0;">If you'd like to add your new synopsis to your FilmFreeway submission form for a screenplay, simply log into FilmFreeway. Click on "My Projects" from the top menu. Click on the edit button next to your project. The third heading you will see is labeled "Brief Synopsis." Simply paste your new synopsis text into that box.</p>
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

    console.log('Screenplay synopsis email sent successfully to:', submission.email);

  } catch (error) {
    console.error('Error sending screenplay synopsis email:', error);
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
