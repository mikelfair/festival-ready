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

const MUSIC_VIDEO_SYNOPSIS_PROMPTS = {
  standard: `You are creating a professional STANDARD music video synopsis for festival submissions. Focus on visual storytelling that complements the song.

PROJECT CONTEXT:
Festival programmers watch hundreds of music videos. Your synopsis must convey the visual concept quickly and memorably.

WRITING STRUCTURE:
1. Opening: "For [Artist Name]'s '[Song Title],' [describe the opening visual/scene]"
2. Core Visuals: Describe 2-3 key visual sequences or concepts
3. Connection: Explain how visuals enhance the song's mood/message
4. Closing: End with the final memorable image

FORMATTING REQUIREMENTS:
- Length: 100-150 words exactly
- Format: 1-2 concise paragraphs
- Style: Visual, descriptive, dynamic
- Tense: Present tense

CONTENT CHECKLIST:
✓ Artist name and song title included
✓ Visual concept clearly conveyed
✓ Connection to music explained
✓ Key scenes vividly described
✓ Memorable closing image
✓ Movement and energy captured

AVOID:
- Shot-by-shot breakdowns
- Technical film terms
- Lyrics unless essential
- Behind-the-scenes info
- "The video shows..." phrases`,
  premium: `You are crafting a PREMIUM music video synopsis that captures both visual artistry and musical synergy for festival consideration. Write with the sensibility of a visual arts critic.

ARTISTIC VISION:
Your synopsis must function as both a preview and a standalone piece of writing that conveys the video's aesthetic impact, conceptual depth, and cultural resonance.

VISUAL NARRATIVE ARCHITECTURE:
1. AESTHETIC ENTRANCE: Open with imagery that establishes the visual language
2. CONCEPTUAL CORE: Articulate how visuals amplify the song's emotional landscape
3. SYMBOLIC PROGRESSION: Track visual metaphors and their evolution
4. RESONANT CONCLUSION: Close with an image that crystallizes the artistic statement

PREMIUM CRAFT ELEMENTS:
- Visual poetry that mirrors musical rhythm
- Metaphorical imagery explained through context
- Color, movement, and space as narrative tools
- Cultural or artistic references woven naturally
- Sensory language that evokes sight and sound

SOPHISTICATED TECHNIQUES:
- Word count: 125 words optimal (100-150 range)
- Sentence rhythm echoes video pacing
- Active, kinetic language
- Each image builds meaning
- Professional yet evocative tone

ARTISTIC CONSIDERATIONS:
- Balance abstract concepts with concrete visuals
- Show the dialogue between music and image
- Capture the video's unique visual signature
- Position within contemporary visual culture
- Create anticipation without overselling

Remember: You're translating a multimedia experience into words that make programmers want to watch.`
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { submissionId, tier } = await req.json();
    console.log('Processing music video synopsis for submission:', submissionId, 'tier:', tier);

    const { data: submission, error: fetchError } = await getSubmission(submissionId);
    
    if (fetchError || !submission) {
      console.error('Error fetching submission:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Submission not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const synopsis = await generateMusicVideoSynopsis(submission, tier || 'standard');
    
    // Update submission with results - use correct field names based on tier
    const updateData: any = {
      status: 'completed',
      processing_tier: tier || 'standard',
      processed_at: new Date().toISOString()
    };
    
    // Store in the correct field based on tier
    if (tier === 'premium') {
      updateData.premium_ai_generated_music_video_synopsis = synopsis;
    } else {
      updateData.standard_ai_generated_music_video_synopsis = synopsis;
    }
    
    const { error: updateError } = await updateSubmission(submissionId, updateData);

    if (updateError) {
      console.error('Error updating submission:', updateError);
      throw new Error('Failed to update submission');
    }

    const { data: updatedSubmission } = await getSubmission(submissionId);
    await sendMusicVideoSynopsisEmail(updatedSubmission || submission);

    return new Response(
      JSON.stringify({ success: true, message: 'Music video synopsis generated and email sent' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing music video synopsis:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateMusicVideoSynopsis(submission: any, tier: string): Promise<string> {
  try {
    const prompt = tier === 'premium' ? MUSIC_VIDEO_SYNOPSIS_PROMPTS.premium : MUSIC_VIDEO_SYNOPSIS_PROMPTS.standard;
    const genres = submission.genres || [];
    const genreText = genres.length > 0 ? genres.join(', ') : 'music video';
    
    const fullPrompt = `${prompt}

Project Details:
- Title: ${submission.project_title}
- Type: Music Video
- Genre: ${genreText}
- Characters: ${submission.characters || 'Not specified'}
- Plot Summary: ${submission.plot || 'Not specified'}
- Duration: ${submission.duration || 'Not specified'}
- Location: ${submission.location || 'Not specified'}
- Script Details: ${submission.script_text || 'Not provided'}

Create a compelling music video synopsis for this project following the guidelines above.`;

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
    
    return generatedText.trim() || 'Professional music video synopsis that captures the visual concept.';

  } catch (error) {
    console.error('Error generating music video synopsis:', error);
    return 'Professional music video synopsis that captures the visual concept.';
  }
}

function getProjectTypeDisplay(projectType: string): string {
  const projectTypeMap: { [key: string]: string } = {
    'standalone': 'Standalone music video',
    'episode': 'Episode in an ongoing series',
    'not_sure': 'I\'m not sure'
  };
  return projectTypeMap[projectType] || projectType;
}

function getProcessingTierDisplay(tier: string): string {
  return tier === 'premium' ? 'Premium AI Processing' : 'Standard AI Processing';
}

async function sendMusicVideoSynopsisEmail(submission: any) {
  try {
    const subject = `Your Festival Ready Music Video Synopsis for "${submission.project_title}" is ready!`;
    
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Your Festival Ready Music Video Synopsis</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      
      <h1 style="color: #667eea; text-align: center;">🎵 Thank you for using Festival Ready</h1>
      <h2 style="color: #333; text-align: center; margin-top: -10px;">Save this email for your records</h2>
      
      <h2 style="color: #333;">🎵 Music Video Synopsis Suggestion Generated By Festival Ready</h2>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
        <p style="line-height: 1.6; margin: 0;">${submission.premium_ai_generated_music_video_synopsis || submission.standard_ai_generated_music_video_synopsis || 'Your music video synopsis'}</p>
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
        <p style="line-height: 1.6; margin: 0 0 15px 0;">If you'd like to add your new synopsis to your FilmFreeway submission form for a music video, simply log into FilmFreeway. Click on "My Projects" from the top menu. Click on the edit button next to your project. The third heading you will see is labeled "Brief Synopsis." Simply paste your new synopsis text into that box.</p>
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

    console.log('Music video synopsis email sent successfully to:', submission.email);

  } catch (error) {
    console.error('Error sending music video synopsis email:', error);
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
