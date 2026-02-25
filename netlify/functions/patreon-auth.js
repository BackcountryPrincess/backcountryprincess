// src/netlify/functions/patreon-auth.js

const COOKIE_NAME = "patreon_access_token";

// IMPORTANT: set this to your real production origin
const SITE_ORIGIN = "https://maple.backcountryprincess.com";
const SITE_RETURN_PATH = "/"; // where to send user after login

// Your 3 tiers (match by title first; fallback to amount)
const TIER_MAP = [
  { key: "CHASE_CREW", label: "Chase Crew", titleMatch: "chase crew", minCents: 0 },
  { key: "WEEKEND_WARRIOR", label: "Weekend Warrior", titleMatch: "weekend warrior", minCents: 0 },
  { key: "FRIENDS_WITH_BENEFITS", label: "Friends with Benefits", titleMatch: "friends with benefits", minCents: 0 },
];

// Helpers
function json(statusCode, obj, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders,
    },
    body: JSON.stringify(obj),
  };
}

function redirect(statusCode, location, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      Location: location,
      "cache-control": "no-store",
      ...extraHeaders,
    },
    body: "",
  };
}

function parseCookies(cookieHeader = "") {
  const out = {};
  cookieHeader.split(";").forEach((part) => {
    const [k, ...rest] = part.trim().split("=");
    if (!k) return;
    out[k] = decodeURIComponent(rest.join("=") || "");
  });
  return out;
}

function buildSetCookie(value) {
  // HttpOnly so JS can't read it; Secure because HTTPS; SameSite=Lax works for OAuth redirects
  // Path=/ so your status endpoint can read it
  return `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`;
}

function buildClearCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function getEnv(name) {
  return process.env[name];
}

function pickTier(entitledTiers) {
  // 1) try to match by title (best)
  const entitledByTitle = new Map(
    (entitledTiers || []).map((t) => [String(t.title || "").toLowerCase().trim(), t])
  );

  for (const t of TIER_MAP) {
    if (entitledByTitle.has(t.titleMatch)) {
      return { tierKey: t.key, tierLabel: t.label };
    }
  }

  // 2) fallback: pick the highest amount_cents tier, then map by minimums if you set them
  const sorted = [...(entitledTiers || [])].sort((a, b) => (b.amount_cents || 0) - (a.amount_cents || 0));
  const top = sorted[0];
  if (!top) return { tierKey: null, tierLabel: null };

  // If you want amount-based mapping, set minCents in TIER_MAP and enable this:
  // const cents = top.amount_cents || 0;
  // const byMin = [...TIER_MAP].sort((a,b)=>b.minCents-a.minCents).find(x=>cents>=x.minCents);
  // if (byMin) return { tierKey: byMin.key, tierLabel: byMin.label };

  // Otherwise return "some tier" (not mapped)
  return { tierKey: "UNKNOWN", tierLabel: top.title || "Unknown Tier" };
}

async function fetchIdentity(accessToken) {
  const meUrl =
    "https://www.patreon.com/api/oauth2/v2/identity" +
    "?fields%5Buser%5D=full_name,email" +
    "&include=memberships.currently_entitled_tiers" +
    "&fields%5Bmember%5D=patron_status" +
    "&fields%5Btier%5D=title,amount_cents";

  const meRes = await fetch(meUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const meJson = await meRes.json();
  if (!meRes.ok) {
    return { ok: false, step: "identity", meJson };
  }

  const userName = meJson?.data?.attributes?.full_name || null;

  // Pull tiers from included
  const entitled = (meJson.included || [])
    .filter((x) => x && x.type === "tier")
    .map((t) => ({
      id: t.id,
      title: t.attributes?.title,
      amount_cents: t.attributes?.amount_cents,
    }));

  // Patron status is on memberships; keep it for debugging/logic if needed
  const memberships = (meJson.included || []).filter((x) => x && x.type === "member");
  const patronStatus = memberships?.[0]?.attributes?.patron_status || null;

  return {
    ok: true,
    userName,
    patronStatus,
    entitled,
  };
}

exports.handler = async (event) => {
  try {
    const qs = event.queryStringParameters || {};
    const clientId = getEnv("PATREON_CLIENT_ID");
    const clientSecret = getEnv("PATREON_CLIENT_SECRET");
    const redirectUri = getEnv("PATREON_REDIRECT_URI");

    if (!clientId || !clientSecret || !redirectUri) {
      return json(500, {
        ok: false,
        error: "Missing Netlify env vars",
        missing: {
          PATREON_CLIENT_ID: !clientId,
          PATREON_CLIENT_SECRET: !clientSecret,
          PATREON_REDIRECT_URI: !redirectUri,
        },
      });
    }

    // 0) Logout / clear cookie
    if (qs.logout === "1") {
      return redirect(302, `${SITE_ORIGIN}${SITE_RETURN_PATH}`, {
        "set-cookie": buildClearCookie(),
      });
    }

    // 1) Status endpoint: /.netlify/functions/patreon-auth?status=1
    if (qs.status === "1") {
      const cookies = parseCookies(event.headers?.cookie || event.headers?.Cookie || "");
      const token = cookies[COOKIE_NAME];

      if (!token) {
        return json(200, { ok: true, loggedIn: false });
      }

      const ident = await fetchIdentity(token);
      if (!ident.ok) {
        // token likely expired; clear it
        return json(
          200,
          { ok: true, loggedIn: false, reason: "token_invalid", details: ident },
          { "set-cookie": buildClearCookie() }
        );
      }

      const { tierKey, tierLabel } = pickTier(ident.entitled);

      return json(200, {
        ok: true,
        loggedIn: true,
        name: ident.userName,
        patronStatus: ident.patronStatus,
        tierKey,
        tierLabel,
        entitled: ident.entitled,
      });
    }

    // 2) OAuth error from Patreon callback
    if (qs.error) {
      return json(400, {
        ok: false,
        error: qs.error,
        error_description: qs.error_description,
      });
    }

    // 3) Callback mode (has ?code=...)
    if (qs.code) {
      const code = qs.code;

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
        return json(400, { ok: false, step: "token_exchange", tokenJson });
      }

      const accessToken = tokenJson.access_token;
      if (!accessToken) {
        return json(400, { ok: false, step: "token_exchange", tokenJson, error: "Missing access_token" });
      }

      // Optional: validate identity immediately (helps confirm tiers)
      const ident = await fetchIdentity(accessToken);
      if (!ident.ok) {
        return json(400, { ok: false, step: "identity", details: ident });
      }

      // Set cookie then redirect back to app
      // Also optionally pass a small hint param for UI
      const { tierKey, tierLabel } = pickTier(ident.entitled);
      const returnUrl = `${SITE_ORIGIN}${SITE_RETURN_PATH}?patreon=1&tier=${encodeURIComponent(
        tierKey || ""
      )}`;

      return redirect(302, returnUrl, {
        "set-cookie": buildSetCookie(accessToken),
      });
    }

    // 4) Start OAuth flow (no ?code, no ?status)
    // Patreon authorize endpoint:
    // https://www.patreon.com/oauth2/authorize?response_type=code&client_id=...&redirect_uri=...&scope=identity%20identity.memberships
    const scope = "identity identity.memberships";
    const authorizeUrl =
      "https://www.patreon.com/oauth2/authorize" +
      `?response_type=code` +
      `&client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scope)}`;

    return redirect(302, authorizeUrl);
  } catch (e) {
    return json(500, { ok: false, error: String(e) });
  }
};
