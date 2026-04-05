# Mobile Hotspot Broadcast

A React Native mobile app that allows users to leverage their unlimited mobile web browsing data plan and broadcast it as a WiFi hotspot for other devices.

## Features

- **One-Tap Hotspot Toggle** - Start/stop your mobile hotspot broadcast with a single tap
- **Connected Device Management** - View and monitor all devices connected to your hotspot
- **Real-Time Data Usage Tracking** - Monitor upload, download, and total data usage per session
- **Mobile Network Info** - See carrier, network type (4G/5G), and signal strength
- **Configurable Settings** - Customize SSID, password, security type (WPA2/WPA3), and frequency band
- **Background Persistence** - Foreground service keeps the hotspot active when the app is backgrounded
- **Cross-Platform** - Native modules for both Android and iOS

## Architecture

```
src/
  App.js                    # Main app with bottom tab navigation
  context/
    HotspotContext.js        # Global state management (React Context + useReducer)
  screens/
    DashboardScreen.js       # Main hotspot toggle, status, and data usage
    DevicesScreen.js         # Connected devices list with pull-to-refresh
    SettingsScreen.js        # Hotspot configuration (SSID, password, band, security)
  components/
    StatusCard.js            # Hotspot configuration summary card
    DataUsageCard.js         # Data usage statistics display
    NetworkInfoCard.js       # Mobile network info with signal bars
  services/
    HotspotService.js        # JS interface to native hotspot modules
  utils/
    formatters.js            # Data formatting helpers (bytes, duration, signal)
android/
  app/src/main/java/com/mobilehotspot/
    HotspotModule.java       # Android native module (WiFi AP, ARP table, tethering)
    HotspotPackage.java      # React Native package registration
    HotspotForegroundService.java  # Background service for persistent hotspot
ios/
  MobileHotspot/
    HotspotModule.swift      # iOS native module (NEHotspotConfiguration, CTTelephony)
    HotspotModule.m          # Objective-C bridge for React Native
```

## How It Works

1. The app detects your mobile data connection and carrier information
2. When you tap "Start", it creates a WiFi access point using the native hotspot APIs
3. Traffic from connected devices is routed through your mobile web browsing data connection
4. Data usage is tracked in real-time and displayed on the dashboard
5. A foreground service (Android) keeps the hotspot alive in the background

## Getting Started

```bash
# Install dependencies
npm install

# Run on Android
npm run android

# Run on iOS
cd ios && pod install && cd ..
npm run ios
```

## Permissions Required

### Android
- `ACCESS_WIFI_STATE` / `CHANGE_WIFI_STATE` - WiFi hotspot control
- `ACCESS_FINE_LOCATION` - Required for WiFi on Android 8+
- `FOREGROUND_SERVICE` - Background hotspot persistence
- `READ_PHONE_STATE` - Carrier and network info

### iOS
- Hotspot Configuration entitlement
- Network Extensions capability
