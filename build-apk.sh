#!/bin/bash
#
# Build a release APK for Mobile Hotspot Broadcast.
#
# Prerequisites:
#   - Node.js (v18+)
#   - Java JDK 17
#   - Android SDK (via Android Studio or standalone)
#   - ANDROID_HOME environment variable set
#
# Usage:
#   chmod +x build-apk.sh
#   ./build-apk.sh
#
# Output:
#   android/app/build/outputs/apk/release/app-release.apk
#

set -e

echo "=== Mobile Hotspot Broadcast — APK Builder ==="
echo ""

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Error: Node.js is required. Install from https://nodejs.org"; exit 1; }
command -v java >/dev/null 2>&1 || { echo "Error: Java JDK is required. Install JDK 17."; exit 1; }

if [ -z "$ANDROID_HOME" ]; then
    # Try common locations
    if [ -d "$HOME/Library/Android/sdk" ]; then
        export ANDROID_HOME="$HOME/Library/Android/sdk"
    elif [ -d "$HOME/Android/Sdk" ]; then
        export ANDROID_HOME="$HOME/Android/Sdk"
    elif [ -d "/usr/local/lib/android/sdk" ]; then
        export ANDROID_HOME="/usr/local/lib/android/sdk"
    else
        echo "Error: ANDROID_HOME is not set. Set it to your Android SDK path."
        echo "  export ANDROID_HOME=\$HOME/Android/Sdk"
        exit 1
    fi
    echo "Auto-detected ANDROID_HOME: $ANDROID_HOME"
fi

echo "1/4  Installing Node dependencies..."
npm install --silent

echo "2/4  Creating JS bundle..."
mkdir -p android/app/src/main/assets
npx react-native bundle \
    --platform android \
    --dev false \
    --entry-file index.js \
    --bundle-output android/app/src/main/assets/index.android.bundle \
    --assets-dest android/app/src/main/res/ \
    2>&1

echo "3/4  Generating release keystore (if needed)..."
if [ ! -f android/app/release.keystore ]; then
    keytool -genkeypair -v -storetype PKCS12 \
        -keystore android/app/release.keystore \
        -alias release-key \
        -keyalg RSA -keysize 2048 -validity 10000 \
        -storepass mobilehotspot -keypass mobilehotspot \
        -dname "CN=MobileHotspot,O=Dev,L=Unknown,ST=Unknown,C=US"
    echo "  Keystore created at android/app/release.keystore"
else
    echo "  Keystore already exists, skipping."
fi

echo "4/4  Building release APK..."
cd android
chmod +x gradlew
./gradlew assembleRelease --no-daemon 2>&1

APK_PATH="app/build/outputs/apk/release/app-release.apk"

if [ -f "$APK_PATH" ]; then
    SIZE=$(du -h "$APK_PATH" | cut -f1)
    echo ""
    echo "=== BUILD SUCCESSFUL ==="
    echo ""
    echo "APK: android/$APK_PATH ($SIZE)"
    echo ""
    echo "To install on your phone:"
    echo "  1. Copy the APK to your phone (USB, email, cloud, etc.)"
    echo "  2. On your phone: Settings > Security > enable 'Install unknown apps'"
    echo "  3. Open the APK file on your phone to install"
    echo ""
    echo "Or install via USB with ADB:"
    echo "  adb install $APK_PATH"
else
    echo ""
    echo "=== BUILD FAILED ==="
    echo "Check the output above for errors."
    exit 1
fi
