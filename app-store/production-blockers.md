# MapleSap Production Blockers

1. Live API routes return 404, including `/api/health`, `/api/weather/forecast`, and `/api/prediction`.
2. Live app routes return 404 for `/dashboard/`, `/history/`, `/account/`, and `/premium/`.
3. Legal/support pages return 404 for `/privacy/`, `/terms/`, and `/support/`.
4. Live home page links still include migrated Backcountry Princess WordPress routes: `/blog/`, `/about/`, `/contact/`, `/e-books/`, RSS, `wp-json`, and `xmlrpc.php`.
5. Live home page shows an "Unable to load forecast" state.
6. Production `public/env.js` has blank Supabase values in the local source; production auth may be disabled unless environment variables are configured during deploy.
7. Dashboard contains placeholder cards for saved locations, premium status, and forecast workspace.
8. Premium status says Stripe is not connected.
9. Privacy policy, terms, support contact email, account deletion process, and final App Privacy answers need publication before review.
10. Google Tag Manager and migrated WordPress plugin references must be confirmed for App Privacy tracking/analytics disclosure.
