exports.handler = async function (event, context) {
  const CLIENT_ID = process.env.PATREON_CLIENT_ID;
  const CLIENT_SECRET = process.env.PATREON_CLIENT_SECRET;
  const REDIRECT_URI = process.env.PATREON_REDIRECT_URI;

  const code = event.queryStringParameters.code;

  if (!code) {
    return {
      statusCode: 400,
      body: "Missing OAuth code"
    };
  }

  try {
    const response = await fetch("https://www.patreon.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        code: code,
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI
      })
    });

    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify(err)
    };
  }
};
