# Mobile Hotspot Broadcast — Proof of Concept

A React Native app that leverages unlimited mobile web browsing data to provide internet access to other devices via WiFi hotspot.

## The Problem

Many mobile plans include unlimited web browsing data but throttle or block standard WiFi hotspot/tethering. This app works around that limitation.

## How It Works

```
┌─────────────────────────────────────────┐
│              YOUR PHONE                 │
│                                         │
│  ┌──────────┐     ┌──────────────────┐  │
│  │  System   │     │  Proxy Server    │  │
│  │  WiFi     │────>│  (port 8080)     │  │
│  │  Hotspot  │     │                  │  │
│  └──────────┘     └────────┬─────────┘  │
│                            │             │
│                    ┌───────▼──────────┐  │
│                    │  Mobile Data     │  │
│                    │  (appears as     │  │
│                    │  phone browsing) │  │
│                    └───────┬──────────┘  │
└────────────────────────────┼────────────┘
                             │
                     ┌───────▼──────────┐
                     │   Carrier        │
                     │   Network        │
                     │   (sees normal   │
                     │    browsing)     │
                     └──────────────────┘
```

1. You enable Android's built-in WiFi hotspot (creates the WiFi AP)
2. This app starts an HTTP/HTTPS proxy server on the phone (port 8080)
3. Other devices connect to your hotspot and set the proxy to `<phone-ip>:8080`
4. All traffic routes through the phone's mobile data stack
5. The carrier sees standard HTTP/HTTPS requests from the phone — not tethered traffic

## Install the APK on Your Phone

### Option A: One-command build (recommended)

You need a computer with **Node.js**, **Java JDK 17**, and **Android SDK** installed.

```bash
git clone https://github.com/Jmaurilus/Mobile-Solutions-.git
cd Mobile-Solutions-
chmod +x build-apk.sh
./build-apk.sh
```

The script will:
1. Install Node dependencies
2. Bundle the JavaScript
3. Generate a signing keystore (first time only)
4. Build the release APK

Output: `android/app/build/outputs/apk/release/app-release.apk`

### Option B: Step-by-step build

```bash
# 1. Clone and install
git clone https://github.com/Jmaurilus/Mobile-Solutions-.git
cd Mobile-Solutions-
npm install

# 2. Bundle JS for Android
mkdir -p android/app/src/main/assets
npx react-native bundle \
    --platform android --dev false \
    --entry-file index.js \
    --bundle-output android/app/src/main/assets/index.android.bundle \
    --assets-dest android/app/src/main/res/

# 3. Generate signing keystore (one-time)
cd android/app
keytool -genkeypair -v -storetype PKCS12 \
    -keystore release.keystore -alias release-key \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass mobilehotspot -keypass mobilehotspot \
    -dname "CN=MobileHotspot,O=Dev,L=Unknown,ST=Unknown,C=US"
cd ../..

# 4. Build the APK
cd android
chmod +x gradlew
./gradlew assembleRelease
```

### Option C: Install via USB (if you have ADB)

After building:
```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

### Transfer to your phone without ADB

1. Copy `app-release.apk` to your phone (email it to yourself, Google Drive, USB cable, etc.)
2. On your phone: **Settings > Security > Install unknown apps** — enable for your file manager
3. Open the APK file on your phone and tap **Install**

## Using the App

The app walks you through 4 steps:

### Step 1: Mobile Data
Make sure your phone is on cellular data (WiFi off). The app checks for this automatically.

### Step 2: Enable Hotspot
Tap "Open Hotspot Settings" — this takes you to Android's hotspot settings. Turn it on there. Come back to the app and confirm.

### Step 3: Start Proxy
Tap "Start Proxy Server" — this starts the HTTP/HTTPS proxy on port 8080.

### Step 4: Connect Another Device
On the other device (laptop, tablet, etc.):
1. Connect to your phone's WiFi hotspot
2. Go to WiFi settings for that network
3. Set HTTP Proxy to **Manual**
4. Server: **192.168.43.1** (shown in the app)
5. Port: **8080**
6. Open a browser — you should be online

The app shows bytes transferred and active connections to confirm it's working.

## Testing Without a Second Device

You can verify the proxy works using `curl` from any device on the same network:

```bash
# HTTP test
curl -x http://<phone-ip>:8080 http://httpbin.org/ip

# HTTPS test
curl -x http://<phone-ip>:8080 https://httpbin.org/ip
```

Both should return the phone's mobile IP address, proving traffic routes through the phone's cellular connection.

## Technical Details

### Proxy Server (`ProxyServer.java`)
- Listens on `0.0.0.0:8080` (configurable)
- Handles HTTP requests via direct forwarding
- Handles HTTPS via `CONNECT` tunneling (transparent TCP relay)
- Tracks bytes transferred and active connections
- Thread-per-connection with cached thread pool

### Architecture
```
src/
  App.js                     # Single-screen POC app
  context/HotspotContext.js  # State management (proxy, network, steps)
  screens/DashboardScreen.js # Step-by-step POC flow
  services/HotspotService.js # JS bridge to native modules
  utils/formatters.js        # Byte formatting

android/.../mobilehotspot/
  HotspotModule.java         # Native bridge: proxy control, system intents, network info
  ProxyServer.java           # HTTP/HTTPS proxy server (the core of the POC)
  HotspotPackage.java        # RN package registration
  HotspotForegroundService.java  # Keeps proxy alive in background
  MainActivity.java          # Android entry point
  MainApplication.java       # RN app initialization + native module registration
```

### Platform Support
- **Android**: Full POC — proxy server + system hotspot integration
- **iOS**: Not supported for this POC (iOS doesn't allow apps to bind servers on the hotspot interface)

### Requirements
- Android 7.0+ (API 24)
- Node.js 18+ (for building)
- Java JDK 17 (for building)
- Android SDK with build-tools 34 (for building)
