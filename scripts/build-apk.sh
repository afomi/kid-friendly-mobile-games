#!/bin/bash
#
# Build a release APK of Medley and, unless --skip-upload, push it public-read
# to s3://afomi/apk/ (the fleet's APK shelf) and confirm the public link works.
#
# Clears Gradle and Metro caches before building to ensure a clean artifact.
# The release build is signed with the debug keystore that `expo prebuild`
# generates: fine for sideloading onto family devices, not for the Play Store.
#
# Usage:
#   aws-vault exec default -- ./scripts/build-apk.sh
#   ./scripts/build-apk.sh --skip-upload     # build only, no AWS needed
#   aws-vault exec default -- ./scripts/build-apk.sh --upload-only   # upload the last build
#
set -euo pipefail

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$PATH"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."
ANDROID_DIR="$ROOT/android"
APK_SRC="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"
S3_BUCKET="afomi"
# apk/Medley.apk (2026-10-13) is an earlier build of the web version; keep it.
S3_KEY="apk/medley-expo.apk"
PUBLIC_URL="https://$S3_BUCKET.s3.amazonaws.com/$S3_KEY"
MODE="${1:-}"

if [ "$MODE" != "--upload-only" ]; then
echo "==> Clearing caches"
rm -rf "$ANDROID_DIR/.gradle" "$ANDROID_DIR/app/build" "$ROOT/.expo"
rm -rf "${TMPDIR:-/tmp}"/metro-* "${TMPDIR:-/tmp}"/haste-*

echo "==> Running expo prebuild"
cd "$ROOT"
CI=1 npx expo prebuild --platform android --clean

echo "==> Building release APK"
cd "$ANDROID_DIR"
./gradlew assembleRelease --no-daemon
fi

# Explicit success: the APK exists, is non-trivial, and is a zip with a manifest.
[ -s "$APK_SRC" ] || { echo "FAILED: no APK at $APK_SRC" >&2; exit 1; }
unzip -Z1 "$APK_SRC" > "${TMPDIR:-/tmp}/medley-apk-files.txt" && grep -qx AndroidManifest.xml "${TMPDIR:-/tmp}/medley-apk-files.txt" || { echo "FAILED: $APK_SRC has no AndroidManifest.xml" >&2; exit 1; }
echo "==> Built: $APK_SRC"
ls -lh "$APK_SRC"
shasum -a 256 "$APK_SRC"

if [ "$MODE" = "--skip-upload" ]; then
  echo "==> Skipping S3 upload"
  exit 0
fi

echo "==> Uploading to s3://$S3_BUCKET/$S3_KEY"
aws s3 cp "$APK_SRC" "s3://$S3_BUCKET/$S3_KEY" --acl public-read --content-type application/vnd.android.package-archive

# Read back: the object's size must match the local file.
LOCAL_SIZE=$(stat -f%z "$APK_SRC")
REMOTE_SIZE=$(aws s3api head-object --bucket "$S3_BUCKET" --key "$S3_KEY" --query ContentLength --output text)
[ "$LOCAL_SIZE" = "$REMOTE_SIZE" ] || { echo "FAILED: uploaded size $REMOTE_SIZE != local $LOCAL_SIZE" >&2; exit 1; }

# And the public link serves it to anyone, with the same size.
PUBLIC_SIZE=$(curl -sfI "$PUBLIC_URL" | awk 'tolower($1)=="content-length:"{print $2}' | tr -d '\r')
[ "$PUBLIC_SIZE" = "$LOCAL_SIZE" ] || { echo "FAILED: $PUBLIC_URL returned size '$PUBLIC_SIZE', expected $LOCAL_SIZE" >&2; exit 1; }

echo "==> VERIFIED: $PUBLIC_URL ($LOCAL_SIZE bytes, public)"
