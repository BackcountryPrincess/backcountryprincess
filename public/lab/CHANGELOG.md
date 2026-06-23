# MapleSap Lab — Changelog

## Lab 1.0 — Initial Build

### Files Added

- `public/lab/index.html` — Complete mobile-first lab SPA (single file, all screens inline)
- `public/lab/CHANGELOG.md` — This file
- `.claude/launch.json` — Dev server configuration for preview tooling

### Files Modified

- `src/worker.js` — Added `handleLabRoute()` and `labGateHtml()` for `/lab` path protection
  - Intercepts all requests to `/lab` and `/lab/*` before ASSETS binding
  - Checks for `ms_lab=open` session cookie
  - Unauthenticated requests receive the password gate HTML
  - Authenticated requests pass through to ASSETS with `X-Robots-Tag: noindex, nofollow` injected
  - POST to `/lab/auth` validates password against `LAB_PASSWORD` env var (default: `maple2026lab`)
  - Sets 8-hour `HttpOnly` cookie on successful login

### Routes Added

- `GET /lab/` — Lab SPA (password-gated)
- `POST /lab/auth` — Password form submission handler (Worker, no static file)
- All existing production routes remain unchanged

### Protection Method

**Cloudflare Worker cookie gate**
- Worker intercepts all `/lab/*` requests before serving static assets
- Password validated server-side against `LAB_PASSWORD` environment variable
- Session cookie: `ms_lab=open; Path=/lab; SameSite=Strict; HttpOnly; Max-Age=28800` (8 hours)
- Default password: `maple2026lab` (change via `LAB_PASSWORD` env var in wrangler or Cloudflare dashboard)
- All lab responses include `X-Robots-Tag: noindex, nofollow` header
- Lab HTML includes `<meta name="robots" content="noindex, nofollow">`
- No Supabase, no OAuth, no full user system

### Screens Implemented

| Screen | Status | Mock Data |
|---|---|---|
| Today | ✅ Complete | SAP RUN LIKELY, 78% confidence, -4°/+7°C, freeze/thaw, season bar, 4-day strip |
| Forecast | ✅ Complete | 7-day swipeable cards, detail panel, season stats, warm streak warning |
| Sugar Bushes | ✅ Complete | 2 locations (North Bush active, South Lot), Add card, Free plan lock note |
| Alerts | ✅ Complete | 4 notification toggles (3 on, 1 Pro-locked), 4-item alert history |
| Account | ✅ Complete | Profile, Free Plan badge, Upgrade panel, Settings, Support, Sign Out |

### Navigation Implemented

- Bottom tab bar: Today · Forecast · Bushes · Alerts · Account
- SVG icons per tab (maple leaf, calendar, tree, bell, person)
- Active tab: amber highlight + filled icon tint
- Alert badge (count: 3) on Alerts tab
- `env(safe-area-inset-bottom)` aware — iPhone home indicator safe
- Touch targets: full tab width, 72px height minimum
- Smooth 180ms opacity transition between screens
- Toast feedback on non-functional interactive elements

### Visual Design Applied

- Dark forest palette: `#0e1209` background, `#17120a` surface
- Maple amber accent: `#c8731a` / `#f4b86f`
- Status color system: green (likely) / amber (marginal) / red (no sap)
- Montserrat 900 for headlines and status text
- Inter for body and labels
- Glassmorphism cards: `rgba(255,255,255,0.048)` fill, amber border
- Maple leaf watermark on hero card
- LAB badge (amber, top-right, non-interactive) on all screens

### Known Gaps

- **Auth not wired in lab:** Sign In / Sign Out buttons show toast only — lab intentionally bypasses Supabase auth
- **No real API data:** All forecast, confidence, and location data is hardcoded mock data
- **GPS not implemented:** Add Bush flow shows toast placeholder only
- **Push notifications not wired:** Alert toggles are visual only — no actual notification registration
- **Stripe not connected:** Upgrade / Pro Plans button shows toast placeholder
- **No offline cache:** Lab has no service worker — requires live connection to localhost
- **Onboarding flow not built:** Post-signup 4-step onboarding screens not yet in lab
- **Log Tap flow not built:** PRO-locked CTA on Today screen is placeholder only
- **°F toggle non-functional:** Settings rows are display-only
- **No swipe gesture navigation:** Screens switch via tab tap only; no swipe-between-screens gesture yet
- **Season chart not built:** Forecast screen shows counts only, no visual sap score timeline chart
- **Forecast card tap on mobile:** Day cards are tappable — detail panel updates correctly
- **Desktop preview mode:** Lab renders wide on desktop (tablet-like) — designed for 375–430px mobile viewport
