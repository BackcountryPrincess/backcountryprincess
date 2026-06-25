#!/bin/bash
# MapleSAP iOS — Archive, Export, Upload to App Store Connect
# Run this after Xcode is installed and ASC_API_ISSUER_ID is known.
# Prerequisites: Xcode installed, Apple Distribution cert in keychain,
#               MapleSap_AppStore profile installed, ASC API key at ~/private_keys/AuthKey_97S7275K38.p8

set -e

REPO="$(cd "$(dirname "$0")/.." && pwd)"
SCHEME="MapleSap"
PROJECT="$REPO/ios/MapleSap.xcodeproj"
ARCHIVE="$REPO/build/MapleSap.xcarchive"
EXPORT_DIR="$REPO/build/export"
EXPORT_OPTIONS="$REPO/ios/ExportOptions.plist"
API_KEY_ID="97S7275K38"
API_KEY_PATH="$HOME/private_keys/AuthKey_97S7275K38.p8"

# Require issuer ID
if [ -z "$ASC_API_ISSUER_ID" ]; then
  echo "ERROR: Set ASC_API_ISSUER_ID before running. Find it at:"
  echo "  App Store Connect → Users and Access → Integrations → App Store Connect API"
  exit 1
fi

echo "=== Step 1: Select Xcode ==="
sudo xcode-select -s /Applications/Xcode.app
xcodebuild -version

echo "=== Step 2: Archive ==="
mkdir -p "$REPO/build"
xcodebuild archive \
  -project "$PROJECT" \
  -scheme "$SCHEME" \
  -configuration Release \
  -archivePath "$ARCHIVE" \
  -destination "generic/platform=iOS" \
  CODE_SIGN_STYLE=Automatic \
  DEVELOPMENT_TEAM=Z3G5GYYZNL \
  | tail -20

echo "=== Step 3: Export ==="
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportPath "$EXPORT_DIR" \
  -exportOptionsPlist "$EXPORT_OPTIONS" \
  -allowProvisioningUpdates \
  | tail -10

echo "=== Step 4: Upload to App Store Connect ==="
IPA=$(find "$EXPORT_DIR" -name "*.ipa" | head -1)
if [ -z "$IPA" ]; then
  echo "ERROR: No .ipa found in $EXPORT_DIR"
  exit 1
fi
echo "Uploading: $IPA"
xcrun altool --upload-app \
  --type ios \
  --file "$IPA" \
  --apiKey "$API_KEY_ID" \
  --apiIssuer "$ASC_API_ISSUER_ID" \
  --apiKeyPath "$API_KEY_PATH"

echo "=== Upload complete. Check App Store Connect → TestFlight. ==="
