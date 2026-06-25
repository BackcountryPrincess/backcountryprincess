# MapleSap iOS Implementation Plan

## Feasibility

Capacitor:
Feasible, but slower than a native shell because it adds npm/native dependency setup and generated platform management.

WKWebView wrapper:
Fastest. The current MapleSap app is already web-backed, so a minimal SwiftUI WKWebView app can reach TestFlight with the fewest moving parts.

PWA:
Feasible for website installation, but not a TestFlight/App Store path by itself.

## Selected Path

Use a universal iPhone/iPad SwiftUI WKWebView wrapper loading:
https://maplesap.app

## Bundle IDs

Recommended iOS bundle ID:
`com.smokeyriverstudio.maplesap.ios`

Existing macOS bundle ID:
`com.smokeyriverstudio.maplesap`

Reason:
Separate iOS and macOS bundle IDs keep provisioning, App Store records, and review metadata clear while preserving the MapleSap brand.

## Required Code Changes

1. Keep the WKWebView wrapper source in `ios/`.
2. Add iOS App ID and provisioning profile in Apple Developer.
3. Create the iOS App Store Connect record.
4. Archive and upload from Xcode once full Xcode is available.
5. Fix production website/API/legal routes before review.

## TestFlight Checklist

- Full Xcode installed and selected.
- iOS App ID exists.
- iOS provisioning profile exists.
- App Store Connect iOS app record exists.
- App icon validates in Xcode.
- Archive builds for Generic iOS Device.
- Upload completes to App Store Connect.
- Build appears in TestFlight processing.
- Internal tester group configured.
- Test notes mention that the app loads the live MapleSap web workspace.
