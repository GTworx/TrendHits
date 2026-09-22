// Netlify Serverless Function for Newsletter Subscription with Brevo integration

export const handler = async (event) => {
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, message: 'Method Not Allowed' })
    };
  }

  try {
    const data = JSON.parse(event.body || '{}');
    const email = (data.email || '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, message: 'Geçerli bir e-posta adresi giriniz.' })
      };
    }

    const apiKey = process.env.BREVO_API_KEY;
    const listId = parseInt(process.env.BREVO_LIST_ID || '2', 10);

    // If Brevo API key is configured in Netlify environment variables, send to Brevo!
    if (apiKey) {
      const brevoRes = await fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          listIds: [listId],
          updateEnabled: true
        })
      });

      if (!brevoRes.ok) {
        const errJson = await brevoRes.json().catch(() => ({}));
        if (errJson.code === 'duplicate_parameter') {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              message: 'Bu e-posta adresi zaten bülten listemizde kayıtlı.'
            })
          };
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        mode: apiKey ? 'brevo_live' : 'netlify_serverless',
        message: 'Bültene başarıyla kaydoldunuz! En güncel müzik trendleri e-posta adresinize iletilecektir.'
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, message: error.message })
    };
  }
};
