package com.mobilehotspot;

import android.content.Context;
import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.telephony.TelephonyManager;
import android.util.Log;

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
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.Collections;
import java.util.List;

/**
 * Native Android module for the Mobile Hotspot Broadcast POC.
 *
 * Architecture:
 * 1. User enables the system WiFi hotspot (via Settings intent)
 * 2. This module starts a local HTTP/HTTPS proxy server on the phone
 * 3. Connected devices set their proxy to <phone-hotspot-ip>:<proxy-port>
 * 4. All traffic flows through the phone's mobile data stack
 * 5. To the carrier, traffic appears as normal phone browsing
 */
public class HotspotModule extends ReactContextBaseJavaModule {

    private static final String TAG = "HotspotModule";
    private static final int DEFAULT_PROXY_PORT = 8080;

    private final ReactApplicationContext reactContext;
    private ConnectivityManager connectivityManager;
    private TelephonyManager telephonyManager;
    private ProxyServer proxyServer;
    private Handler statusHandler;
    private boolean isProxyRunning = false;

    public HotspotModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
        this.connectivityManager = (ConnectivityManager) context.getSystemService(
                Context.CONNECTIVITY_SERVICE);
        this.telephonyManager = (TelephonyManager) context.getSystemService(
                Context.TELEPHONY_SERVICE);
        this.statusHandler = new Handler(Looper.getMainLooper());
    }

    @NonNull
    @Override
    public String getName() {
        return "HotspotModule";
    }

    // ---------------------------------------------------------------
    // Proxy Server Controls
    // ---------------------------------------------------------------

    /**
     * Start the local proxy server.
     * This is the core of the POC — connected hotspot clients route traffic
     * through this proxy, making it appear as phone-originated browsing.
     */
    @ReactMethod
    public void startProxy(int port, Promise promise) {
        if (isProxyRunning && proxyServer != null) {
            promise.reject("ALREADY_RUNNING", "Proxy server is already running");
            return;
        }

        int proxyPort = port > 0 ? port : DEFAULT_PROXY_PORT;

        try {
            proxyServer = new ProxyServer(proxyPort);
            proxyServer.start();
            isProxyRunning = true;

            startStatusPolling();

            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putInt("port", proxyPort);
            result.putString("ip", getHotspotIpAddress());
            promise.resolve(result);

            Log.i(TAG, "Proxy started on port " + proxyPort);
        } catch (Exception e) {
            isProxyRunning = false;
            promise.reject("PROXY_START_ERROR",
                    "Failed to start proxy: " + e.getMessage());
        }
    }

    /**
     * Stop the local proxy server.
     */
    @ReactMethod
    public void stopProxy(Promise promise) {
        try {
            if (proxyServer != null) {
                proxyServer.stop();
                proxyServer = null;
            }
            isProxyRunning = false;
            stopStatusPolling();

            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            promise.resolve(result);

            Log.i(TAG, "Proxy stopped");
        } catch (Exception e) {
            promise.reject("PROXY_STOP_ERROR",
                    "Failed to stop proxy: " + e.getMessage());
        }
    }

    /**
     * Get current proxy server status.
     */
    @ReactMethod
    public void getProxyStatus(Promise promise) {
        WritableMap status = Arguments.createMap();
        status.putBoolean("isRunning", isProxyRunning && proxyServer != null && proxyServer.isRunning());
        status.putInt("port", proxyServer != null ? proxyServer.getPort() : DEFAULT_PROXY_PORT);
        status.putString("ip", getHotspotIpAddress());
        status.putDouble("bytesTransferred", proxyServer != null ? proxyServer.getBytesTransferred() : 0);
        status.putInt("activeConnections", proxyServer != null ? (int) proxyServer.getActiveConnections() : 0);
        promise.resolve(status);
    }

    // ---------------------------------------------------------------
    // System Hotspot Controls
    // ---------------------------------------------------------------

    /**
     * Open the system hotspot/tethering settings.
     * The user enables the real Android hotspot from there.
     */
    @ReactMethod
    public void openHotspotSettings(Promise promise) {
        try {
            Intent intent = new Intent(Settings.ACTION_WIRELESS_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            // Try the tethering settings directly first
            try {
                Intent tetherIntent = new Intent();
                tetherIntent.setClassName("com.android.settings",
                        "com.android.settings.TetherSettings");
                tetherIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                reactContext.startActivity(tetherIntent);
            } catch (Exception e) {
                // Fall back to general wireless settings
                reactContext.startActivity(intent);
            }

            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("SETTINGS_ERROR",
                    "Could not open hotspot settings: " + e.getMessage());
        }
    }

    /**
     * Check if a mobile data connection is available.
     */
    @ReactMethod
    public void checkMobileData(Promise promise) {
        WritableMap result = Arguments.createMap();

        boolean hasMobileData = false;
        boolean hasWifi = false;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Network activeNetwork = connectivityManager.getActiveNetwork();
            if (activeNetwork != null) {
                NetworkCapabilities caps = connectivityManager.getNetworkCapabilities(activeNetwork);
                if (caps != null) {
                    hasMobileData = caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR);
                    hasWifi = caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI);
                }
            }
        }

        result.putBoolean("hasMobileData", hasMobileData);
        result.putBoolean("hasWifi", hasWifi);
        result.putBoolean("isReady", hasMobileData);
        promise.resolve(result);
    }

    // ---------------------------------------------------------------
    // Network Info
    // ---------------------------------------------------------------

    /**
     * Get mobile network information.
     */
    @ReactMethod
    public void getNetworkInfo(Promise promise) {
        WritableMap info = Arguments.createMap();

        try {
            String carrier = telephonyManager.getNetworkOperatorName();
            info.putString("carrierName", carrier != null && !carrier.isEmpty() ? carrier : "Unknown");

            int networkTypeInt = telephonyManager.getNetworkType();
            info.putString("networkType", getNetworkTypeName(networkTypeInt));
        } catch (SecurityException e) {
            info.putString("carrierName", "Unknown");
            info.putString("networkType", "Unknown");
        }

        info.putString("hotspotIp", getHotspotIpAddress());
        promise.resolve(info);
    }

    /**
     * Get the devices connected to the hotspot (reads ARP table).
     */
    @ReactMethod
    public void getConnectedDevices(Promise promise) {
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

                    if (!mac.equals("00:00:00:00:00:00") && flags.equals("0x2")) {
                        WritableMap device = Arguments.createMap();
                        device.putString("ipAddress", ip);
                        device.putString("macAddress", mac);
                        devices.pushMap(device);
                    }
                }
            }
            reader.close();
        } catch (Exception e) {
            Log.d(TAG, "Could not read ARP table: " + e.getMessage());
        }

        promise.resolve(devices);
    }

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------

    /**
     * Get the phone's IP address on the hotspot interface.
     * This is the IP that clients need to configure as their proxy address.
     */
    private String getHotspotIpAddress() {
        try {
            List<NetworkInterface> interfaces = Collections.list(
                    NetworkInterface.getNetworkInterfaces());
            for (NetworkInterface iface : interfaces) {
                // Hotspot interfaces are commonly named swlan0, wlan0, ap0, etc.
                String name = iface.getName();
                if (name.contains("ap") || name.contains("swlan") ||
                    name.contains("wlan") || name.contains("rndis")) {
                    List<InetAddress> addrs = Collections.list(iface.getInetAddresses());
                    for (InetAddress addr : addrs) {
                        if (!addr.isLoopbackAddress() && addr instanceof Inet4Address) {
                            return addr.getHostAddress();
                        }
                    }
                }
            }

            // Fallback: return any non-loopback IPv4
            for (NetworkInterface iface : interfaces) {
                List<InetAddress> addrs = Collections.list(iface.getInetAddresses());
                for (InetAddress addr : addrs) {
                    if (!addr.isLoopbackAddress() && addr instanceof Inet4Address) {
                        return addr.getHostAddress();
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error getting hotspot IP: " + e.getMessage());
        }
        return "192.168.43.1"; // Common default Android hotspot IP
    }

    private void startStatusPolling() {
        statusHandler.postDelayed(new Runnable() {
            @Override
            public void run() {
                if (isProxyRunning && proxyServer != null) {
                    WritableMap status = Arguments.createMap();
                    status.putDouble("bytesTransferred", proxyServer.getBytesTransferred());
                    status.putInt("activeConnections", (int) proxyServer.getActiveConnections());
                    emitEvent("onProxyStatusUpdate", status);
                    statusHandler.postDelayed(this, 3000);
                }
            }
        }, 3000);
    }

    private void stopStatusPolling() {
        statusHandler.removeCallbacksAndMessages(null);
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
            case TelephonyManager.NETWORK_TYPE_HSPAP: return "3G+";
            case TelephonyManager.NETWORK_TYPE_HSPA: return "3G";
            case TelephonyManager.NETWORK_TYPE_UMTS: return "3G";
            case TelephonyManager.NETWORK_TYPE_EDGE: return "2G";
            case TelephonyManager.NETWORK_TYPE_GPRS: return "2G";
            default: return "Unknown";
        }
    }
}
