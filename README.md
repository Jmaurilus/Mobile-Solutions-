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

## POC Verification Steps

The app guides you through 4 steps:

1. **Mobile data active** — confirms cellular connection is available
2. **System hotspot enabled** — opens Android settings to enable WiFi AP
3. **Proxy server running** — starts the local HTTP/HTTPS proxy
4. **Traffic flowing** — verifies data is routing through the proxy

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
```

### Platform Support
- **Android**: Full POC — proxy server + system hotspot integration
- **iOS**: Not supported for this POC (iOS doesn't allow apps to bind servers on the hotspot interface)

## Getting Started

```bash
npm install
npm run android
```

Then follow the 4 steps in the app.

## Testing Without a Second Device

You can verify the proxy works using `curl` from any device on the same network:

```bash
# HTTP test
curl -x http://<phone-ip>:8080 http://httpbin.org/ip

# HTTPS test
curl -x http://<phone-ip>:8080 https://httpbin.org/ip
```

Both should return the phone's mobile IP address, proving traffic routes through the phone's cellular connection.
