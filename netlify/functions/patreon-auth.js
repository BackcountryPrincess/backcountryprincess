// netlify/functions/patreon-auth.js

exports.handler = async (event) => {
  try {
    const qs = event.queryStringParameters || {};
    const code = qs.code;
    const error = qs.error;

    if (error) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ok: false, error, error_description: qs.error_description }),
      };
    }

    if (!code) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ok: false, error: "Missing ?code" }),
      };
    }

    const clientId = process.env.PATREON_CLIENT_ID;
    const clientSecret = process.env.PATREON_CLIENT_SECRET;
    const redirectUri = process.env.PATREON_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return {
        statusCode: 500,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ok: false,
          error: "Missing Netlify env vars",
          missing: {
            PATREON_CLIENT_ID: !clientId,
            PATREON_CLIENT_SECRET: !clientSecret,
            PATREON_REDIRECT_URI: !redirectUri,
          },
        }),
      };
    }

    // Exchange code -> access token
    const tokenRes = await fetch("https://www.patreon.com/api/oauth2/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    const tokenJson = await tokenRes.json();

    if (!tokenRes.ok) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ok: false, step: "token_exchange", tokenJson }),
      };
    }

    // Read memberships + entitled tiers
    const meUrl =
      "https://www.patreon.com/api/oauth2/v2/identity" +
      "?include=memberships.currently_entitled_tiers" +
      "&fields%5Bmember%5D=patron_status" +
      "&fields%5Btier%5D=title,amount_cents";

    const meRes = await fetch(meUrl, {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });

    const meJson = await meRes.json();

    if (!meRes.ok) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ok: false, step: "identity", meJson }),
      };
    }

    // Pull tier IDs from response
    const entitled = (meJson.included || [])
      .filter((x) => x && x.type === "tier")
      .map((t) => ({
        id: t.id,
        title: t.attributes?.title,
        amount_cents: t.attributes?.amount_cents,
      }));

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "https://maple.backcountryprincess.com",
      },
      body: JSON.stringify({ ok: true, entitled }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: false, error: String(e) }),
    };
  }
};
