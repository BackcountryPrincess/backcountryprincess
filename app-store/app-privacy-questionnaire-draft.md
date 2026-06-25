# MapleSap App Privacy Questionnaire Draft

Tracking:
No.

Third-party advertising:
No.

Data used to track users across apps and websites:
No.

Data linked to the user:
- Contact Info: email address, if account, feedback, or support features are used
- User Content: feedback messages, if submitted
- Identifiers: user ID/authentication identifier, if Supabase account features are enabled

Data not necessarily linked to the user:
- Location: approximate region or coordinates used for weather forecasts, if the user enters or selects a location
- Usage Data: product interaction data if analytics are enabled
- Diagnostics: crash, error, and performance data if logging is enabled

Data collected for app functionality:
- Email address
- Authentication/session information
- Region or forecast location
- Feedback message
- Weather query parameters

Data collected for analytics:
Not currently verified. If Google Tag Manager, analytics, or Cloudflare analytics are intentionally enabled in production, disclose analytics collection before submission.

Data collected for developer advertising or marketing:
No.

Data collected for product personalization:
Forecast location and account preferences may be used to personalize the MapleSap experience if saved-location features are enabled.

Authentication:
Supabase authentication is present in source code. Email/password sign-in, sign-up, password reset, and persisted sessions are supported when production Supabase env values are configured.

User deletion:
Add a support process for account deletion requests before App Store submission.

Notes for final App Privacy entry:
The current live site includes migrated WordPress/Elementor/Google Tag Manager references. Confirm whether tracking scripts are active before finalizing "Analytics" and "Tracking" answers.
