# MapleSap App Review Notes

MapleSap is a macOS app wrapper for the live MapleSap forecasting workspace at:
https://maplesap.app/

The app requires an internet connection because forecasts, account features, and field feedback are served from the live MapleSap web application.

Reviewer flow:
1. Launch MapleSap.
2. The app opens the live MapleSap workspace.
3. Use the public forecast area on the home page.
4. If account testing is enabled for the submitted build, use the test account supplied in App Store Connect.

No hardware permissions are intentionally requested by the MapleSap macOS app.

No camera, microphone, screen recording, Bluetooth, HealthKit, HomeKit, or location permission should be required by the current app wrapper.

Known pre-submission requirement:
The live production site must expose the support, privacy, terms, account, dashboard, and API routes before review submission.
