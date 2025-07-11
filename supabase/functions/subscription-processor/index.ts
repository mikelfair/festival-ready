import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');

// Festival Ready dedicated list ID in SendGrid (you'll need to create this)
const FESTIVAL_READY_LIST_ID = Deno.env.get('FESTIVAL_READY_SENDGRID_LIST_ID');

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, action, source } = await req.json();
    console.log('Processing subscription:', { email, action, source });

    if (!email || !action) {
      return new Response(
        JSON.stringify({ error: 'Email and action are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'subscribe') {
      await processSubscribe(email, source);
    } else if (action === 'unsubscribe') {
      await processUnsubscribe(email, source);
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Must be subscribe or unsubscribe' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: `Successfully processed ${action} for ${email}` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Subscription processor error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processSubscribe(email: string, source: string) {
  try {
    // Add contact to SendGrid
    const contactData = {
      contacts: [{
        email: email,
        custom_fields: {
          source: source || 'unknown',
          subscribed_at: new Date().toISOString(),
          subscription_type: 'festival-ready-monthly'
        }
      }]
    };

    const addContactResponse = await fetch('https://api.sendgrid.com/v3/marketing/contacts', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contactData)
    });

    if (!addContactResponse.ok) {
      const error = await addContactResponse.text();
      console.error('SendGrid add contact error:', error);
      throw new Error('Failed to add contact to SendGrid');
    }

    // Add to Festival Ready list if list ID is configured
    if (FESTIVAL_READY_LIST_ID) {
      // Get contact ID first
      const searchResponse = await fetch(`https://api.sendgrid.com/v3/marketing/contacts/search/emails`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ emails: [email] })
      });

      if (searchResponse.ok) {
        const searchResult = await searchResponse.json();
        if (searchResult.result && searchResult.result[email]) {
          const contactId = searchResult.result[email].contact.id;
          
          // Add to list
          await fetch(`https://api.sendgrid.com/v3/marketing/lists/${FESTIVAL_READY_LIST_ID}/contacts`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SENDGRID_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ contact_ids: [contactId] })
          });
        }
      }
    }

    console.log('Successfully subscribed:', email);

  } catch (error) {
    console.error('Subscribe error:', error);
    throw error;
  }
}

async function processUnsubscribe(email: string, source: string) {
  try {
    // Get contact ID from SendGrid
    const searchResponse = await fetch(`https://api.sendgrid.com/v3/marketing/contacts/search/emails`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ emails: [email] })
    });

    if (!searchResponse.ok) {
      throw new Error('Failed to search for contact in SendGrid');
    }

    const searchResult = await searchResponse.json();
    if (searchResult.result && searchResult.result[email]) {
      const contactId = searchResult.result[email].contact.id;
      
      // Remove from Festival Ready list if list ID is configured
      if (FESTIVAL_READY_LIST_ID) {
        await fetch(`https://api.sendgrid.com/v3/marketing/lists/${FESTIVAL_READY_LIST_ID}/contacts`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ contact_ids: [contactId] })
        });
      }

      // Update contact custom fields to mark as unsubscribed
      const updateData = {
        contacts: [{
          email: email,
          custom_fields: {
            unsubscribed_at: new Date().toISOString(),
            unsubscribe_source: source || 'unknown',
            subscription_status: 'unsubscribed'
          }
        }]
      };

      await fetch('https://api.sendgrid.com/v3/marketing/contacts', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
    }

    console.log('Successfully unsubscribed:', email);

  } catch (error) {
    console.error('Unsubscribe error:', error);
    throw error;
  }
}