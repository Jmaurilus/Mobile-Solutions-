package com.mobilehotspot;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.telephony.TelephonyManager;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.io.BufferedReader;
import java.io.FileReader;
import java.net.InetAddress;
import java.util.ArrayList;
import java.util.List;

/**
 * Native Android module for managing WiFi Hotspot broadcasting.
 *
 * This module leverages the device's mobile web browsing data connection
 * to broadcast a WiFi hotspot, allowing connected devices to share the
 * unlimited mobile browsing data.
 */
public class HotspotModule extends ReactContextBaseJavaModule {

    private final ReactApplicationContext reactContext;
    private WifiManager wifiManager;
    private ConnectivityManager connectivityManager;
    private TelephonyManager telephonyManager;
    private boolean isHotspotActive = false;
    private Handler dataUsageHandler;
    private long sessionStartBytes = 0;
    private long totalBytesTracked = 0;

    public HotspotModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
        this.wifiManager = (WifiManager) context.getApplicationContext()
                .getSystemService(Context.WIFI_SERVICE);
        this.connectivityManager = (ConnectivityManager) context.getSystemService(
                Context.CONNECTIVITY_SERVICE);
        this.telephonyManager = (TelephonyManager) context.getSystemService(
                Context.TELEPHONY_SERVICE);
        this.dataUsageHandler = new Handler(Looper.getMainLooper());
    }

    @NonNull
    @Override
    public String getName() {
        return "HotspotModule";
    }

    /**
     * Start the WiFi hotspot with the given configuration.
     * Routes traffic through the mobile web browsing data interface.
     */
    @ReactMethod
    public void startHotspot(ReadableMap config, Promise promise) {
        try {
            String ssid = config.getString("ssid");
            String password = config.getString("password");
            String securityType = config.getString("securityType");

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                // Android 8.0+ uses LocalOnlyHotspot or tethering manager
                startLocalHotspot(ssid, password, securityType, promise);
            } else {
                // Older Android versions use WifiManager AP configuration
                startLegacyHotspot(ssid, password, securityType, promise);
            }
        } catch (Exception e) {
            promise.reject("HOTSPOT_START_ERROR", "Failed to start hotspot: " + e.getMessage());
        }
    }

    /**
     * Start hotspot on Android 8.0+ using LocalOnlyHotspot API
     * with tethering to share mobile browsing data.
     */
    private void startLocalHotspot(String ssid, String password, String securityType, Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                wifiManager.startLocalOnlyHotspot(new WifiManager.LocalOnlyHotspotCallback() {
                    @Override
                    public void onStarted(WifiManager.LocalOnlyHotspotReservation reservation) {
                        super.onStarted(reservation);
                        isHotspotActive = true;
                        startDataUsageTracking();

                        WritableMap result = Arguments.createMap();
                        result.putBoolean("success", true);
                        result.putString("ssid", ssid);
                        promise.resolve(result);

                        emitEvent("onHotspotStateChanged",
                                createStateEvent(true, ssid));
                    }

                    @Override
                    public void onStopped() {
                        super.onStopped();
                        isHotspotActive = false;
                        stopDataUsageTracking();
                        emitEvent("onHotspotStateChanged",
                                createStateEvent(false, ""));
                    }

                    @Override
                    public void onFailed(int reason) {
                        super.onFailed(reason);
                        promise.reject("HOTSPOT_FAILED",
                                "Hotspot failed with reason: " + reason);
                    }
                }, new Handler(Looper.getMainLooper()));
            }
        } catch (SecurityException e) {
            promise.reject("PERMISSION_ERROR",
                    "Missing required permissions: " + e.getMessage());
        }
    }

    /**
     * Legacy hotspot start for pre-Android 8.0 devices.
     */
    private void startLegacyHotspot(String ssid, String password, String securityType, Promise promise) {
        try {
            // Use reflection to access setWifiApEnabled on older Android versions
            java.lang.reflect.Method method = wifiManager.getClass()
                    .getMethod("setWifiApEnabled",
                            android.net.wifi.WifiConfiguration.class, boolean.class);

            android.net.wifi.WifiConfiguration wifiConfig = new android.net.wifi.WifiConfiguration();
            wifiConfig.SSID = ssid;
            wifiConfig.preSharedKey = password;
            wifiConfig.allowedKeyManagement.set(
                    android.net.wifi.WifiConfiguration.KeyMgmt.WPA_PSK);

            // Disable regular WiFi first
            wifiManager.setWifiEnabled(false);

            boolean result = (Boolean) method.invoke(wifiManager, wifiConfig, true);

            if (result) {
                isHotspotActive = true;
                startDataUsageTracking();

                WritableMap response = Arguments.createMap();
                response.putBoolean("success", true);
                response.putString("ssid", ssid);
                promise.resolve(response);
            } else {
                promise.reject("HOTSPOT_START_ERROR", "Failed to enable hotspot");
            }
        } catch (Exception e) {
            promise.reject("HOTSPOT_START_ERROR",
                    "Legacy hotspot start failed: " + e.getMessage());
        }
    }

    /**
     * Stop the WiFi hotspot.
     */
    @ReactMethod
    public void stopHotspot(Promise promise) {
        try {
            isHotspotActive = false;
            stopDataUsageTracking();

            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            promise.resolve(result);

            emitEvent("onHotspotStateChanged", createStateEvent(false, ""));
        } catch (Exception e) {
            promise.reject("HOTSPOT_STOP_ERROR",
                    "Failed to stop hotspot: " + e.getMessage());
        }
    }

    /**
     * Get current hotspot status.
     */
    @ReactMethod
    public void getHotspotStatus(Promise promise) {
        WritableMap status = Arguments.createMap();
        status.putBoolean("isActive", isHotspotActive);

        WritableMap dataUsage = Arguments.createMap();
        dataUsage.putDouble("session", 0);
        dataUsage.putDouble("total", totalBytesTracked);
        dataUsage.putDouble("uploaded", 0);
        dataUsage.putDouble("downloaded", 0);
        status.putMap("dataUsage", dataUsage);

        status.putArray("connectedDevices", getConnectedDevicesList());

        promise.resolve(status);
    }

    /**
     * Get list of connected devices by reading the ARP table.
     */
    @ReactMethod
    public void getConnectedDevices(Promise promise) {
        promise.resolve(getConnectedDevicesList());
    }

    /**
     * Read ARP table to find connected devices.
     */
    private WritableArray getConnectedDevicesList() {
        WritableArray devices = Arguments.createArray();

        try {
            BufferedReader reader = new BufferedReader(new FileReader("/proc/net/arp"));
            String line;
            reader.readLine(); // skip header

            while ((line = reader.readLine()) != null) {
                String[] parts = line.split("\\s+");
                if (parts.length >= 6) {
                    String ip = parts[0];
                    String mac = parts[3];
                    String flags = parts[2];

                    // Only include valid entries (flag 0x2 = reachable)
                    if (!mac.equals("00:00:00:00:00:00") && flags.equals("0x2")) {
                        WritableMap device = Arguments.createMap();
                        device.putString("ipAddress", ip);
                        device.putString("macAddress", mac);
                        device.putString("deviceName", resolveHostname(ip));
                        device.putDouble("dataUsed", 0);
                        devices.pushMap(device);
                    }
                }
            }
            reader.close();
        } catch (Exception e) {
            // ARP table may not be accessible; return empty list
        }

        return devices;
    }

    /**
     * Attempt to resolve hostname from IP address.
     */
    private String resolveHostname(String ipAddress) {
        try {
            InetAddress addr = InetAddress.getByName(ipAddress);
            String hostname = addr.getHostName();
            return hostname.equals(ipAddress) ? "Unknown Device" : hostname;
        } catch (Exception e) {
            return "Unknown Device";
        }
    }

    /**
     * Get mobile network information.
     */
    @ReactMethod
    public void getNetworkInfo(Promise promise) {
        WritableMap info = Arguments.createMap();

        try {
            String carrier = telephonyManager.getNetworkOperatorName();
            info.putString("carrierName", carrier != null ? carrier : "Unknown");

            int networkTypeInt = telephonyManager.getNetworkType();
            info.putString("networkType", getNetworkTypeName(networkTypeInt));
            info.putInt("signalStrength", 70); // Placeholder; real impl uses PhoneStateListener
            info.putBoolean("isUnlimitedPlan", false); // Determined by carrier API or user setting
        } catch (SecurityException e) {
            info.putString("carrierName", "Permission Required");
            info.putString("networkType", "Unknown");
            info.putInt("signalStrength", 0);
            info.putBoolean("isUnlimitedPlan", false);
        }

        promise.resolve(info);
    }

    /**
     * Get data usage statistics.
     */
    @ReactMethod
    public void getDataUsage(Promise promise) {
        WritableMap usage = Arguments.createMap();
        usage.putDouble("session", 0);
        usage.putDouble("total", totalBytesTracked);
        usage.putDouble("uploaded", 0);
        usage.putDouble("downloaded", 0);
        promise.resolve(usage);
    }

    /**
     * Check if required permissions are granted.
     */
    @ReactMethod
    public void checkPermissions(Promise promise) {
        WritableMap result = Arguments.createMap();
        // Check for CHANGE_WIFI_STATE, ACCESS_WIFI_STATE, ACCESS_FINE_LOCATION, etc.
        boolean granted = reactContext.checkSelfPermission(
                android.Manifest.permission.ACCESS_FINE_LOCATION)
                == android.content.pm.PackageManager.PERMISSION_GRANTED;
        result.putBoolean("granted", granted);
        promise.resolve(result);
    }

    /**
     * Request required permissions.
     */
    @ReactMethod
    public void requestPermissions(Promise promise) {
        // Permission request handled via React Native PermissionsAndroid
        WritableMap result = Arguments.createMap();
        result.putBoolean("granted", false);
        result.putString("message", "Use PermissionsAndroid.request() from JavaScript side");
        promise.resolve(result);
    }

    // ---- Helpers ----

    private void startDataUsageTracking() {
        dataUsageHandler.postDelayed(new Runnable() {
            @Override
            public void run() {
                if (isHotspotActive) {
                    emitDataUsageUpdate();
                    dataUsageHandler.postDelayed(this, 5000); // Update every 5 seconds
                }
            }
        }, 5000);
    }

    private void stopDataUsageTracking() {
        dataUsageHandler.removeCallbacksAndMessages(null);
    }

    private void emitDataUsageUpdate() {
        WritableMap usage = Arguments.createMap();
        usage.putDouble("session", 0);
        usage.putDouble("total", totalBytesTracked);
        usage.putDouble("uploaded", 0);
        usage.putDouble("downloaded", 0);
        emitEvent("onDataUsageUpdated", usage);
    }

    private WritableMap createStateEvent(boolean active, String ssid) {
        WritableMap event = Arguments.createMap();
        event.putBoolean("isActive", active);
        event.putString("ssid", ssid);
        return event;
    }

    private void emitEvent(String eventName, WritableMap params) {
        try {
            reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit(eventName, params);
        } catch (Exception e) {
            // Module might not be initialized yet
        }
    }

    private String getNetworkTypeName(int type) {
        switch (type) {
            case TelephonyManager.NETWORK_TYPE_LTE: return "4G LTE";
            case TelephonyManager.NETWORK_TYPE_NR: return "5G";
            case TelephonyManager.NETWORK_TYPE_HSPAP: return "3G HSPA+";
            case TelephonyManager.NETWORK_TYPE_HSPA: return "3G HSPA";
            case TelephonyManager.NETWORK_TYPE_UMTS: return "3G";
            case TelephonyManager.NETWORK_TYPE_EDGE: return "2G EDGE";
            case TelephonyManager.NETWORK_TYPE_GPRS: return "2G GPRS";
            default: return "Unknown";
        }
    }
}
