import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from '../_shared/cors.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');

// Import all prompts from config
import { PROMPTS } from '../_shared/prompts.config.js';

// FESTIVAL RECOMMENDATIONS
const FESTIVAL_RECOMMENDATIONS = {
  film: {
    title: "🎬 Film Festival Recommendations",
    recommendations: [
      "🏆 Sundance Film Festival - Premier independent film festival",
      "🎭 Toronto International Film Festival (TIFF) - Major international showcase",
      "🌟 Cannes Film Festival (Short Film Corner) - Prestigious European platform",
      "🎪 South by Southwest (SXSW) - Innovation and creativity focus",
      "🎨 Tribeca Film Festival - New York's premier film event",
      "🌎 Los Angeles Film Festival - West Coast industry connections",
      "🎬 FilmFreeway's Staff Pick festivals for genre-specific opportunities"
    ]
  },
  screenplay: {
    title: "📝 Screenplay Competition Recommendations",
    recommendations: [
      "🏆 Nicholl Fellowship - Academy's prestigious screenwriting competition",
      "📚 Austin Film Festival Screenplay Competition - Industry recognition",
      "🎭 Blue Cat Screenplay Competition - Comprehensive feedback system",
      "✍️ Final Draft Big Break Contest - Software industry standard",
      "🌟 ScreenCraft competitions - Multiple genre categories",
      "🎪 Creative World Awards - International recognition",
      "📱 WriterDuet competitions - Modern platform integration"
    ]
  },
  music_video: {
    title: "🎵 Music Video Festival Recommendations",
    recommendations: [
      "🎶 MTV Video Music Awards - Industry standard recognition",
      "🎵 Berlin Music Video Awards - European creative showcase",
      "🌟 UK Music Video Awards - British industry focus",
      "🎪 SXSW Music Video Competition - Austin's premier event",
      "🎬 LA Music Video Festival - West Coast industry connections",
      "🎨 Vimeo Staff Pick potential - Online platform recognition",
      "🌎 FilmFreeway music video categories - Accessible submission platform"
    ]
  },
  statement: {
    title: "💭 Festival Submission Tips",
    recommendations: [
      "🎯 Use your statement to show unique perspective and voice",
      "📝 Keep statements concise and authentic to your experience",
      "🎪 Research festival aesthetics and align your narrative accordingly",
      "🌟 Emphasize collaborative spirit and professional growth",
      "🎬 Connect your personal journey to universal themes",
      "📚 Proofread carefully - presentation matters for credibility",
      "🎭 Submit early to avoid rushed applications and technical issues"
    ]
  },
  biography: {
    title: "📖 Professional Biography Tips",
    recommendations: [
      "🎯 Focus on career highlights and relevant achievements",
      "📝 Write in third person for professional distance",
      "🎪 Include specific projects, awards, and recognition",
      "🌟 Emphasize collaboration and industry relationships",
      "🎬 Keep current - update regularly with recent work",
      "📚 Match length requirements - typically 150-200 words",
      "🎭 End with forward-looking statement about career goals"
    ]
  },
  tagline: {
    title: "🏷️ Tagline Usage Tips",
    recommendations: [
      "🎯 Use taglines in film festival submission headers",
      "📝 Include in social media promotion and marketing materials",
      "🎪 Add to poster design and promotional graphics",
      "🌟 Use in pitch decks and investor presentations",
      "🎬 Include in press releases and media communications",
      "📚 Add to website headers and project descriptions",
      "🎭 Use consistently across all promotional platforms"
    ]
  }
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { submissionId } = await req.json();
    console.log('Processing submission:', submissionId);

    // Get submission from database
    const { data: submission, error: fetchError } = await getSubmission(submissionId);
    
    if (fetchError || !submission) {
      console.error('Error fetching submission:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Submission not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine submission type and generate content
    const submissionType = getSubmissionType(submission.submission_type);
    let generatedContent = '';
    let emailSubject = '';
    let emailTemplate = '';
    
    switch (submissionType) {
      case 'tagline':
        generatedContent = await generateTagline(submission);
        emailSubject = `Your updated tagline for "${submission.project_title}" is ready.`;
        emailTemplate = createTaglineEmail(submission, generatedContent);
        break;
      case 'film':
        generatedContent = await generateFilmSynopsis(submission);
        emailSubject = `Your updated film synopsis for "${submission.project_title}" is ready.`;
        emailTemplate = createFilmSynopsisEmail(submission, generatedContent);
        break;
      case 'screenplay':
        generatedContent = await generateScreenplaySynopsis(submission);
        emailSubject = `Your updated screenplay synopsis for "${submission.project_title}" is ready.`;
        emailTemplate = createScreenplaySynopsisEmail(submission, generatedContent);
        break;
      case 'music_video':
        generatedContent = await generateMusicVideoSynopsis(submission);
        emailSubject = `Your updated music video synopsis for "${submission.project_title}" is ready.`;
        emailTemplate = createMusicVideoSynopsisEmail(submission, generatedContent);
        break;
      case 'biography':
        generatedContent = await generateBiography(submission);
        emailSubject = `Your updated biography for ${submission.first_name} ${submission.last_name} is ready.`;
        emailTemplate = createBiographyEmail(submission, generatedContent);
        break;
      case 'statement':
        generatedContent = await generateStatement(submission);
        emailSubject = `Your updated statement for ${submission.first_name} ${submission.last_name} is ready.`;
        emailTemplate = createStatementEmail(submission, generatedContent);
        break;
      default:
        throw new Error(`Unknown submission type: ${submissionType}`);
    }

    // Update submission with results
    const { error: updateError } = await updateSubmission(submissionId, {
      [`${submissionType}_content`]: generatedContent,
      status: 'completed',
      processed_at: new Date().toISOString()
    });

    if (updateError) {
      console.error('Error updating submission:', updateError);
      throw new Error('Failed to update submission');
    }

    // Send email
    await sendEmail(submission.email, emailSubject, emailTemplate);
    
    // Mark email as sent
    await updateSubmission(submissionId, { email_sent: true });

    return new Response(
      JSON.stringify({ success: true, message: 'Processing completed and email sent' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing submission:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getSubmissionType(submissionType: string): string {
  const typeMap: { [key: string]: string } = {
    'tagline': 'tagline',
    'film_synopsis': 'film',
    'screenplay_synopsis': 'screenplay',
    'music_video_synopsis': 'music_video',
    'actors_biography': 'biography',
    'directors_biography': 'biography',
    'producers_biography': 'biography',
    'writers_biography': 'biography',
    'actors_statement': 'statement',
    'directors_statement': 'statement',
    'producers_statement': 'statement',
    'writers_statement': 'statement'
  };
  
  return typeMap[submissionType] || 'unknown';
}

async function generateTagline(submission: any): Promise<string> {
  try {
    const prompt = PROMPTS.tagline.standard;
    const genres = submission.genres || [];
    const genreText = genres.length > 0 ? genres.join(', ') : 'drama';
    
    const fullPrompt = `${prompt}

Project Details:
- Title: ${submission.project_title}
- Genre: ${genreText}
- Main Characters: ${submission.main_characters || 'Not specified'}
- Story Challenge: ${submission.main_challenge || 'Not specified'}
- Script Details: ${submission.script_text || 'Not provided'}
- Story Location: ${submission.story_location || 'Not specified'}

Create a compelling tagline (10-15 words) that captures the essence of this project.`;

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

async function generateFilmSynopsis(submission: any): Promise<string> {
  try {
    const prompt = PROMPTS.film_synopsis.standard;
    const genres = submission.genres || [];
    const genreText = genres.length > 0 ? genres.join(', ') : 'drama';
    
    const fullPrompt = `${prompt}

Project Details:
- Title: ${submission.project_title}
- Genre: ${genreText}
- Duration: ${submission.duration || 'Not specified'}
- Main Characters: ${submission.main_characters || 'Not specified'}
- Story Challenge: ${submission.main_challenge || 'Not specified'}
- Script Details: ${submission.script_text || 'Not provided'}
- Story Location: ${submission.story_location || 'Not specified'}

Create a professional film synopsis following the guidelines above.`;

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
    
    return generatedText.trim() || 'Professional film synopsis highlighting story and characters.';

  } catch (error) {
    console.error('Error generating film synopsis:', error);
    return 'Professional film synopsis highlighting story and characters.';
  }
}

async function generateScreenplaySynopsis(submission: any): Promise<string> {
  try {
    const prompt = PROMPTS.screenplay_synopsis.standard;
    const genres = submission.genres || [];
    const genreText = genres.length > 0 ? genres.join(', ') : 'drama';
    
    const fullPrompt = `${prompt}

Project Details:
- Title: ${submission.project_title}
- Genre: ${genreText}
- Pages: ${submission.pages || 'Not specified'}
- Main Characters: ${submission.main_characters || 'Not specified'}
- Story Challenge: ${submission.main_challenge || 'Not specified'}
- Script Details: ${submission.script_text || 'Not provided'}
- Story Location: ${submission.story_location || 'Not specified'}

Create a professional screenplay synopsis following the guidelines above.`;

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
    
    return generatedText.trim() || 'Professional screenplay synopsis highlighting story and characters.';

  } catch (error) {
    console.error('Error generating screenplay synopsis:', error);
    return 'Professional screenplay synopsis highlighting story and characters.';
  }
}

async function generateMusicVideoSynopsis(submission: any): Promise<string> {
  try {
    const prompt = PROMPTS.music_video_synopsis.standard;
    const genres = submission.genres || [];
    const genreText = genres.length > 0 ? genres.join(', ') : 'music video';
    
    const fullPrompt = `${prompt}

Project Details:
- Title: ${submission.project_title}
- Genre: ${genreText}
- Duration: ${submission.duration || 'Not specified'}
- Music/Song: ${submission.music || 'Not specified'}
- Visual Concept: ${submission.main_challenge || 'Not specified'}
- Script Details: ${submission.script_text || 'Not provided'}
- Story Location: ${submission.story_location || 'Not specified'}

Create a professional music video synopsis following the guidelines above.`;

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
    
    return generatedText.trim() || 'Professional music video synopsis highlighting visual concept and music.';

  } catch (error) {
    console.error('Error generating music video synopsis:', error);
    return 'Professional music video synopsis highlighting visual concept and music.';
  }
}

async function generateBiography(submission: any): Promise<string> {
  try {
    let prompt = '';
    
    switch (submission.submission_type) {
      case 'actors_biography':
        prompt = PROMPTS.actors_biography.standard;
        break;
      case 'directors_biography':
        prompt = PROMPTS.directors_biography.standard;
        break;
      case 'producers_biography':
        prompt = PROMPTS.producers_biography.standard;
        break;
      case 'writers_biography':
        prompt = PROMPTS.writers_biography.standard;
        break;
      default:
        throw new Error(`Unknown biography type: ${submission.submission_type}`);
    }
    
    const fullPrompt = `${prompt}

Person Details:
- Name: ${submission.first_name} ${submission.last_name}
- Location: ${submission.person_location || submission.country || 'Not specified'}
- Relevant Experience: ${submission.relevant_work_experience || 'Not specified'}
- Non-Film Experience: ${submission.non_film_industry_experience || 'Not specified'}
- Awards/Recognition: ${submission.screenings_awards || 'Not specified'}
- Community Involvement: ${submission.community || 'Not specified'}

Create a professional biography following the guidelines above.`;

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
    
    return generatedText.trim() || 'Professional biography highlighting experience and achievements.';

  } catch (error) {
    console.error('Error generating biography:', error);
    return 'Professional biography highlighting experience and achievements.';
  }
}

async function generateStatement(submission: any): Promise<string> {
  try {
    let prompt = '';
    
    switch (submission.submission_type) {
      case 'actors_statement':
        prompt = PROMPTS.actors_statement.standard;
        break;
      case 'directors_statement':
        prompt = PROMPTS.directors_statement.standard;
        break;
      case 'producers_statement':
        prompt = PROMPTS.producers_statement.standard;
        break;
      case 'writers_statement':
        prompt = PROMPTS.writers_statement.standard;
        break;
      default:
        throw new Error(`Unknown statement type: ${submission.submission_type}`);
    }
    
    const fullPrompt = `${prompt}

Project Details:
- Project Title: ${submission.project_title}
- Role: ${submission.role || 'Not specified'}
- Creative Inspirations: ${submission.inspirations_creative || 'Not specified'}
- People Who Inspire: ${submission.inspirations_people || 'Not specified'}
- Goals: ${submission.goals || 'Not specified'}
- Relevant Experience: ${submission.relevant_work_experience || 'Not specified'}

Create a professional statement following the guidelines above.`;

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
    
    return generatedText.trim() || 'Professional statement highlighting creative vision and experience.';

  } catch (error) {
    console.error('Error generating statement:', error);
    return 'Professional statement highlighting creative vision and experience.';
  }
}

function createTaglineEmail(submission: any, tagline: string): string {
  const festivalRecs = FESTIVAL_RECOMMENDATIONS.tagline;
  
  return `
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
      <p style="line-height: 1.6; margin: 0; font-size: 1.1em; font-weight: 600;">${tagline}</p>
    </div>
    
    <h2 style="color: #333;">📋 Project Details</h2>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
      <p style="line-height: 1.6; margin: 0 0 10px 0;"><strong>Creator:</strong> ${submission.first_name} ${submission.last_name}</p>
      <p style="line-height: 1.6; margin: 0 0 10px 0;"><strong>Location:</strong> ${submission.person_location || submission.country || 'Not specified'}</p>
      <p style="line-height: 1.6; margin: 0 0 10px 0;"><strong>Genre:</strong> ${submission.genres ? submission.genres.join(', ') : 'Not specified'}</p>
      <p style="line-height: 1.6; margin: 0;"><strong>Country:</strong> ${submission.country || 'Not specified'}</p>
    </div>
    
    <h2 style="color: #333;">${festivalRecs.title}</h2>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
      ${festivalRecs.recommendations.map(rec => `<p style="line-height: 1.6; margin: 0 0 8px 0;">${rec}</p>`).join('')}
    </div>
    
    <h2 style="color: #333;">📚 Free Resources</h2>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
      <p style="line-height: 1.6; margin: 0 0 10px 0;">📖 Download our free resources:</p>
      <p style="line-height: 1.6; margin: 0 0 8px 0;">
        <a href="https://www.filmfestivalcircuit.com/film-festival-handbook" style="color: #667eea; text-decoration: none;">Film Festival Handbook</a> - Complete guide to film festivals
      </p>
      <p style="line-height: 1.6; margin: 0;">
        <a href="https://www.filmfestivalcircuit.com/screenplay-submission-guide" style="color: #667eea; text-decoration: none;">Screenplay Submission Guide</a> - Everything about screenplay competitions
      </p>
    </div>
    
    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
      <p style="color: #999; font-size: 0.9rem; margin: 0;">
        Need help? Reply to this email or visit 
        <a href="https://www.filmfestivalcircuit.com" style="color: #667eea;">filmfestivalcircuit.com</a>
      </p>
    </div>
    
  </body>
  </html>`;
}

function createFilmSynopsisEmail(submission: any, synopsis: string): string {
  const festivalRecs = FESTIVAL_RECOMMENDATIONS.film;
  
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Your Festival Ready Film Synopsis</title>
  </head>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    
    <h1 style="color: #667eea; text-align: center;">🎬 Your Festival Ready Film Synopsis</h1>
    <h2 style="color: #333; text-align: center; margin-top: -10px;">"${submission.project_title}"</h2>
    
    <h2 style="color: #333;">📄 Film Synopsis</h2>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
      <p style="line-height: 1.6; margin: 0;">${synopsis}</p>
    </div>
    
    <h2 style="color: #333;">📋 Project Details</h2>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
      <p style="line-height: 1.6; margin: 0 0 10px 0;"><strong>Director:</strong> ${submission.first_name} ${submission.last_name}</p>
      <p style="line-height: 1.6; margin: 0 0 10px 0;"><strong>Location:</strong> ${submission.person_location || submission.country || 'Not specified'}</p>
      <p style="line-height: 1.6; margin: 0 0 10px 0;"><strong>Genre:</strong> ${submission.genres ? submission.genres.join(', ') : 'Not specified'}</p>
      <p style="line-height: 1.6; margin: 0;"><strong>Duration:</strong> ${submission.duration || 'Not specified'}</p>
    </div>
    
    <h2 style="color: #333;">${festivalRecs.title}</h2>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
      ${festivalRecs.recommendations.map(rec => `<p style="line-height: 1.6; margin: 0 0 8px 0;">${rec}</p>`).join('')}
    </div>
    
    <h2 style="color: #333;">📚 Free Resources</h2>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
      <p style="line-height: 1.6; margin: 0 0 10px 0;">📖 Download our free resources:</p>
      <p style="line-height: 1.6; margin: 0 0 8px 0;">
        <a href="https://www.filmfestivalcircuit.com/film-festival-handbook" style="color: #667eea; text-decoration: none;">Film Festival Handbook</a> - Complete guide to film festivals
      </p>
      <p style="line-height: 1.6; margin: 0;">
        <a href="https://www.filmfestivalcircuit.com/screenplay-submission-guide" style="color: #667eea; text-decoration: none;">Screenplay Submission Guide</a> - Everything about screenplay competitions
      </p>
    </div>
    
    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
      <p style="color: #999; font-size: 0.9rem; margin: 0;">
        Need help? Reply to this email or visit 
        <a href="https://www.filmfestivalcircuit.com" style="color: #667eea;">filmfestivalcircuit.com</a>
      </p>
    </div>
    
  </body>
  </html>`;
}

function createScreenplaySynopsisEmail(submission: any, synopsis: string): string {
  const festivalRecs = FESTIVAL_RECOMMENDATIONS.screenplay;
  
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Your Festival Ready Screenplay Synopsis</title>
  </head>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    
    <h1 style="color: #667eea; text-align: center;">📝 Your Festival Ready Screenplay Synopsis</h1>
    <h2 style="color: #333; text-align: center; margin-top: -10px;">"${submission.project_title}"</h2>
    
    <h2 style="color: #333;">📄 Screenplay Synopsis</h2>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
      <p style="line-height: 1.6; margin: 0;">${synopsis}</p>
    </div>
    
    <h2 style="color: #333;">📋 Project Details</h2>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
      <p style="line-height: 1.6; margin: 0 0 10px 0;"><strong>Writer:</strong> ${submission.first_name} ${submission.last_name}</p>
      <p style="line-height: 1.6; margin: 0 0 10px 0;"><strong>Location:</strong> ${submission.person_location || submission.country || 'Not specified'}</p>
      <p style="line-height: 1.6; margin: 0 0 10px 0;"><strong>Genre:</strong> ${submission.genres ? submission.genres.join(', ') : 'Not specified'}</p>
      <p style="line-height: 1.6; margin: 0;"><strong>Pages:</strong> ${submission.pages || 'Not specified'}</p>
    </div>
    
    <h2 style="color: #333;">${festivalRecs.title}</h2>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
      ${festivalRecs.recommendations.map(rec => `<p style="line-height: 1.6; margin: 0 0 8px 0;">${rec}</p>`).join('')}
    </div>
    
    <h2 style="color: #333;">📚 Free Resources</h2>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
      <p style="line-height: 1.6; margin: 0 0 10px 0;">📖 Download our free resources:</p>
      <p style="line-height: 1.6; margin: 0 0 8px 0;">
        <a href="https://www.filmfestivalcircuit.com/film-festival-handbook" style="color: #667eea; text-decoration: none;">Film Festival Handbook</a> - Complete guide to film festivals
      </p>
      <p style="line-height: 1.6; margin: 0;">
        <a href="https://www.filmfestivalcircuit.com/screenplay-submission-guide" style="color: #667eea; text-decoration: none;">Screenplay Submission Guide</a> - Everything about screenplay competitions
      </p>
    </div>
    
    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
      <p style="color: #999; font-size: 0.9rem; margin: 0;">
        Need help? Reply to this email or visit 
        <a href="https://www.filmfestivalcircuit.com" style="color: #667eea;">filmfestivalcircuit.com</a>
      </p>
    </div>
    
  </body>
  </html>`;
}

function createMusicVideoSynopsisEmail(submission: any, synopsis: string): string {
  const festivalRecs = FESTIVAL_RECOMMENDATIONS.music_video;
  
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Your Festival Ready Music Video Synopsis</title>
  </head>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    
    <h1 style="color: #667eea; text-align: center;">🎵 Your Festival Ready Music Video Synopsis</h1>
    <h2 style="color: #333; text-align: center; margin-top: -10px;">"${submission.project_title}"</h2>
    
    <h2 style="color: #333;">📄 Music Video Synopsis</h2>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
      <p style="line-height: 1.6; margin: 0;">${synopsis}</p>
    </div>
    
    <h2 style="color: #333;">📋 Project Details</h2>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
      <p style="line-height: 1.6; margin: 0 0 10px 0;"><strong>Director:</strong> ${submission.first_name} ${submission.last_name}</p>
      <p style="line-height: 1.6; margin: 0 0 10px 0;"><strong>Location:</strong> ${submission.person_location || submission.country || 'Not specified'}</p>
      <p style="line-height: 1.6; margin: 0 0 10px 0;"><strong>Genre:</strong> ${submission.genres ? submission.genres.join(', ') : 'Not specified'}</p>
      <p style="line-height: 1.6; margin: 0;"><strong>Duration:</strong> ${submission.duration || 'Not specified'}</p>
    </div>
    
    <h2 style="color: #333;">${festivalRecs.title}</h2>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
      ${festivalRecs.recommendations.map(rec => `<p style="line-height: 1.6; margin: 0 0 8px 0;">${rec}</p>`).join('')}
    </div>
    
    
    <h2 style="color: #333;">📚 Free Resources</h2>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
      <p style="line-height: 1.6; margin: 0 0 10px 0;">📖 Download our free resources:</p>
      <p style="line-height: 1.6; margin: 0 0 8px 0;">
        <a href="https://www.filmfestivalcircuit.com/film-festival-handbook" style="color: #667eea; text-decoration: none;">Film Festival Handbook</a> - Complete guide to film festivals
      </p>
      <p style="line-height: 1.6; margin: 0;">
        <a href="https://www.filmfestivalcircuit.com/screenplay-submission-guide" style="color: #667eea; text-decoration: none;">Screenplay Submission Guide</a> - Everything about screenplay competitions
      </p>
    </div>
    
    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
      <p style="color: #999; font-size: 0.9rem; margin: 0;">
        Need help? Reply to this email or visit 
        <a href="https://www.filmfestivalcircuit.com" style="color: #667eea;">filmfestivalcircuit.com</a>
      </p>
    </div>
    
  </body>
  </html>`;
}

function createBiographyEmail(submission: any, biography: string): string {
  const festivalRecs = FESTIVAL_RECOMMENDATIONS.biography;
  
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Your Festival Ready Biography</title>
  </head>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    
    <h1 style="color: #667eea; text-align: center;">📖 Your Festival Ready Biography</h1>
    <h2 style="color: #333; text-align: center; margin-top: -10px;">${submission.first_name} ${submission.last_name}</h2>
    
    <h2 style="color: #333;">📋 Professional Biography</h2>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
      <p style="line-height: 1.6; margin: 0;">${biography}</p>
    </div>
    
    <h2 style="color: #333;">📋 Person Details</h2>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
      <p style="line-height: 1.6; margin: 0 0 10px 0;"><strong>Name:</strong> ${submission.first_name} ${submission.last_name}</p>
      <p style="line-height: 1.6; margin: 0 0 10px 0;"><strong>Location:</strong> ${submission.person_location || submission.country || 'Not specified'}</p>
      <p style="line-height: 1.6; margin: 0;"><strong>Project:</strong> ${submission.project_title}</p>
    </div>
    
    <h2 style="color: #333;">${festivalRecs.title}</h2>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
      ${festivalRecs.recommendations.map(rec => `<p style="line-height: 1.6; margin: 0 0 8px 0;">${rec}</p>`).join('')}
    </div>
    
    <h2 style="color: #333;">📚 Free Resources</h2>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
      <p style="line-height: 1.6; margin: 0 0 10px 0;">📖 Download our free resources:</p>
      <p style="line-height: 1.6; margin: 0 0 8px 0;">
        <a href="https://www.filmfestivalcircuit.com/film-festival-handbook" style="color: #667eea; text-decoration: none;">Film Festival Handbook</a> - Complete guide to film festivals
      </p>
      <p style="line-height: 1.6; margin: 0;">
        <a href="https://www.filmfestivalcircuit.com/screenplay-submission-guide" style="color: #667eea; text-decoration: none;">Screenplay Submission Guide</a> - Everything about screenplay competitions
      </p>
    </div>
    
    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
      <p style="color: #999; font-size: 0.9rem; margin: 0;">
        Need help? Reply to this email or visit 
        <a href="https://www.filmfestivalcircuit.com" style="color: #667eea;">filmfestivalcircuit.com</a>
      </p>
    </div>
    
  </body>
  </html>`;
}

function createStatementEmail(submission: any, statement: string): string {
  const festivalRecs = FESTIVAL_RECOMMENDATIONS.statement;
  
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-utf-8">
    <title>Your Festival Ready Statement</title>
  </head>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    
    <h1 style="color: #667eea; text-align: center;">💭 Your Festival Ready Statement</h1>
    <h2 style="color: #333; text-align: center; margin-top: -10px;">${submission.first_name} ${submission.last_name}</h2>
    
    <h2 style="color: #333;">📋 Artist Statement</h2>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
      <p style="line-height: 1.6; margin: 0;">${statement}</p>
    </div>
    
    <h2 style="color: #333;">📋 Person Details</h2>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
      <p style="line-height: 1.6; margin: 0 0 10px 0;"><strong>Name:</strong> ${submission.first_name} ${submission.last_name}</p>
      <p style="line-height: 1.6; margin: 0 0 10px 0;"><strong>Location:</strong> ${submission.person_location || submission.country || 'Not specified'}</p>
      <p style="line-height: 1.6; margin: 0;"><strong>Project:</strong> ${submission.project_title}</p>
    </div>
    
    <h2 style="color: #333;">${festivalRecs.title}</h2>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
      ${festivalRecs.recommendations.map(rec => `<p style="line-height: 1.6; margin: 0 0 8px 0;">${rec}</p>`).join('')}
    </div>
    
    <h2 style="color: #333;">📚 Free Resources</h2>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
      <p style="line-height: 1.6; margin: 0 0 10px 0;">📖 Download our free resources:</p>
      <p style="line-height: 1.6; margin: 0 0 8px 0;">
        <a href="https://www.filmfestivalcircuit.com/film-festival-handbook" style="color: #667eea; text-decoration: none;">Film Festival Handbook</a> - Complete guide to film festivals
      </p>
      <p style="line-height: 1.6; margin: 0;">
        <a href="https://www.filmfestivalcircuit.com/screenplay-submission-guide" style="color: #667eea; text-decoration: none;">Screenplay Submission Guide</a> - Everything about screenplay competitions
      </p>
    </div>
    
    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
      <p style="color: #999; font-size: 0.9rem; margin: 0;">
        Need help? Reply to this email or visit 
        <a href="https://www.filmfestivalcircuit.com" style="color: #667eea;">filmfestivalcircuit.com</a>
      </p>
    </div>
    
  </body>
  </html>`;
}

async function sendEmail(to: string, subject: string, html: string) {
  try {
    const emailData = {
      from: 'Festival Ready <noreply@filmfestivalcircuit.com>',
      to: [to],
      subject: subject,
      html: html
    };

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      throw new Error(`Resend API failed: ${response.status}`);
    }

    console.log('Email sent successfully to:', to);

  } catch (error) {
    console.error('Error sending email:', error);
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
