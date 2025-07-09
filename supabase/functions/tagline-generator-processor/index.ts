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
  standard: `Create a compelling film tagline following these exact rules:

**Step-by-Step Instructions:**
1. Identify the core conflict or journey
2. Find the universal emotion or theme
3. Craft a hook using action words or intriguing concepts
4. Edit down to 10-15 words maximum

**Tagline Requirements:**
- Length: Optimally 10 words (never exceed 15)
- Reading level: 9th grade
- Style: Provocative, mysterious, or inspiring
- Must NOT include: Character names, genre labels, plot spoilers
- **IMPORTANT: Do not use any hyphens, dashes or long dashes**

**Successful Tagline Formulas:**
- Challenge format: "In [setting], [consequence]"
- Mission format: "One [person's] [quest] to [goal]"
- Question format: "What if [scenario]?"
- Warning format: "Some [things] should never [action]"

**Checklist:**
✓ Under 15 words
✓ Creates intrigue
✓ No character names
✓ No genre stated
✓ No ending revealed
✓ No hyphens or dashes

OUTPUT: One compelling tagline only.`,
  premium: `Craft a tagline that becomes inseparable from the film's identity in popular culture.

**The Art of the Hook:**
Distill the entire emotional journey into a single, unforgettable phrase that promises an experience and lodges in cultural consciousness.

**Sophisticated Tagline Architecture:**
- **Emotional Resonance**: Tap into primal fears, desires, or curiosities
- **Linguistic Economy**: Every word earns place through multiple meanings
- **Tonal Perfect Pitch**: Match tagline's voice to film's soul
- **Cultural Stickiness**: Create quotable phrases
- **Marketing Psychology**: Promise transformation, revelation, or catharsis
- **IMPORTANT: Do not use any hyphens, dashes or long dashes**

**Advanced Techniques:**
- **Juxtaposition**: Combine unexpected elements
- **Double Meaning**: Layer literal and metaphorical interpretations
- **Rhythm and Sound**: Use alliteration, assonance, or cadence
- **Active Voice**: Create urgency through dynamic verbs
- **Universal Specificity**: Intrigue specifically, resonate universally

**Technical Parameters:**
- Optimal: 8-12 words (15 absolute maximum)
- Every word precisely chosen
- No wasted syllables
- Read aloud for flow
- No hyphens or dashes allowed

**Successful Tagline Formulas:**
- Challenge format: "In [setting], [consequence]"
- Mission format: "One [person's] [quest] to [goal]"
- Question format: "What if [scenario]?"
- Warning format: "Some [things] should never [action]"

Generate exactly 4 taglines using each formula:
1. Challenge format
2. Mission format  
3. Question format
4. Warning format

OUTPUT: Four taglines separated by | character.`,
  premiumFormulas: {
    challenge: `Create a Challenge format tagline: "In [setting], [consequence]"`,
    mission: `Create a Mission format tagline: "One [person's] [quest] to [goal]"`,
    question: `Create a Question format tagline: "What if [scenario]?"`,
    warning: `Create a Warning format tagline: "Some [things] should never [action]"`
  }
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
    const genres = submission.genres || [];
    const genreText = genres.length > 0 ? genres.join(', ') : 'drama';
    
    const projectDetails = `Project Details:
- Title: ${submission.project_title}
- Project Type: ${submission.project_type || 'Not specified'}
- Duration: ${submission.duration || 'Not specified'}
- Genre: ${genreText}
- Story Location: ${submission.story_location || 'Not specified'}
- Main Characters: ${submission.characters || submission.main_characters || 'Not specified'}
- Story Challenge: ${submission.plot || submission.main_challenge || 'Not specified'}
- Script Details: ${submission.script_text || 'Not provided'}`;

    if (tier === 'premium') {
      return await generatePremiumTaglines(projectDetails);
    } else {
      return await generateStandardTagline(projectDetails);
    }

  } catch (error) {
    console.error('Error generating tagline:', error);
    return tier === 'premium' ? 
      'Challenge: In darkness, truth emerges|Mission: One person\'s quest to uncover secrets|Question: What if nothing is as it seems?|Warning: Some truths should never be revealed' :
      'Creative and engaging tagline for your project';
  }
}

async function generateStandardTagline(projectDetails: string): Promise<string> {
  const fullPrompt = `${TAGLINE_PROMPTS.standard}

${projectDetails}`;

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
}

async function generatePremiumTaglines(projectDetails: string): Promise<string> {
  const formulas = ['challenge', 'mission', 'question', 'warning'];
  const taglines = [];

  for (const formula of formulas) {
    const formulaPrompt = `Create a compelling film tagline following these exact rules:

**Step-by-Step Instructions:**
1. Identify the core conflict or journey
2. Find the universal emotion or theme
3. Craft a hook using action words or intriguing concepts
4. Edit down to 10-15 words maximum

**Tagline Requirements:**
- Length: Optimally 10 words (never exceed 15)
- Reading level: 9th grade
- Style: Provocative, mysterious, or inspiring
- Must NOT include: Character names, genre labels, plot spoilers
- **IMPORTANT: Do not use any hyphens, dashes or long dashes**

**${formula.charAt(0).toUpperCase() + formula.slice(1)} Format Guidelines:**
${TAGLINE_PROMPTS.premiumFormulas[formula]}

**Technical Parameters:**
- Optimal: 8-12 words (15 absolute maximum)
- Every word precisely chosen
- No wasted syllables
- Read aloud for flow
- No hyphens or dashes allowed

${projectDetails}

OUTPUT: One compelling ${formula} format tagline only.`;
    
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: formulaPrompt }] }]
      })
    });

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API failed: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    taglines.push(generatedText.trim());
  }

  return taglines.join('|');
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

async function sendTaglineEmail(submission: any) {
  try {
    const isPremium = submission.processing_tier === 'premium';
    const subject = `Your updated Tagline for "${submission.project_title}" is ready!`;
    
    const taglineData = submission.premium_ai_generated_tagline || submission.standard_ai_generated_tagline || 'Your tagline';
    
    let taglineContent = '';
    if (isPremium && taglineData.includes('|')) {
      const taglines = taglineData.split('|');
      const labels = ['Challenge', 'Mission', 'Question', 'Warning'];
      taglineContent = `
        <h2 style="color: #333;">🎬 Tagline Suggestions Generated By Festival Ready</h2>
        ${taglines.map((tagline, index) => `
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #ff6b6b; margin-bottom: 15px;">
            <h3 style="color: #ff6b6b; margin: 0 0 10px 0; font-size: 1.1em;">${labels[index]} Format</h3>
            <p style="line-height: 1.6; margin: 0; font-size: 1.1em; font-weight: 600;">${tagline.trim()}</p>
          </div>
        `).join('')}
      `;
    } else {
      taglineContent = `
        <h2 style="color: #333;">🎬 Tagline Suggestions Generated By Festival Ready</h2>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
          <p style="line-height: 1.6; margin: 0; font-size: 1.1em; font-weight: 600;">${taglineData}</p>
        </div>
      `;
    }
    
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Your Festival Ready Tagline${isPremium ? 's' : ''}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      
      <h1 style="color: #667eea; text-align: center;">🎬 Thank you for using Festival Ready</h1>
      <h2 style="color: #333; text-align: center; margin-top: -10px;">Save this email for your records</h2>
      
      <h2 style="color: #333;">📋 Project Details</h2>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin-bottom: 30px;">
        <p style="line-height: 1.6; margin: 0 0 10px 0;"><strong>Project Title:</strong> ${submission.project_title}</p>
        <p style="line-height: 1.6; margin: 0 0 10px 0;"><strong>Project Type:</strong> ${getProjectTypeDisplay(submission.project_type || '')}</p>
        <p style="line-height: 1.6; margin: 0 0 10px 0;"><strong>Genre(s):</strong> ${submission.genres ? submission.genres.join(', ') : 'Not specified'}</p>
        <p style="line-height: 1.6; margin: 0 0 10px 0;"><strong>Duration:</strong> ${submission.duration || 'Not specified'}</p>
        <p style="line-height: 1.6; margin: 0;"><strong>Processing:</strong> ${getProcessingTierDisplay(submission.processing_tier || 'standard')}</p>
      </div>
      
      ${taglineContent}
      
      <h2 style="color: #333;">❓ How Do I Update My Submission?</h2>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin-bottom: 30px;">
        <p style="line-height: 1.6; margin: 0 0 15px 0;">FilmFreeway does not have a designated field for taglines on the film or screenplay submission forms and is not required. If you have submitted to one of our film festivals at filmfestivalcircuit.com, we do have a designated field for taglines for all submission types. You can log in and update your submission form free of charge. Here is a link to a 60-second tutorial that explains this process.</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="https://youtube.com/shorts/aJO2NO0s-oQ" style="display: inline-block; background: #ff0000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
            ▶️ Watch Tutorial (60 seconds)
          </a>
        </div>
      </div>
      
      <h2 style="color: #333;">💰 Save 25% on Film Festival Submissions</h2>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin-bottom: 30px;">
        <p style="line-height: 1.6; margin: 0;">Use promo code <strong>festivalready25</strong> at checkout in order to save 25% on all films, screenplay, and music video submissions at <a href="https://filmfestivalcircuit.com/submissions" style="color: #667eea;">https://filmfestivalcircuit.com/submissions</a></p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <div style="margin-bottom: 20px;">
          <a href="https://filmfestivalcircuit.com/subscribe" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-bottom: 10px;">
            Subscribe
          </a>
          <p style="color: #999; font-size: 0.85rem; margin: 5px 0 0 0;">
            Would you like to receive 1 email per month about updates to this app and our latest film festival submission discounts?
          </p>
        </div>
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
