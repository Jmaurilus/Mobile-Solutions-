import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { HotspotModule } = NativeModules;

/**
 * Service layer for the Mobile Hotspot Broadcast POC.
 *
 * How it works:
 * 1. User enables Android's built-in WiFi hotspot (via system settings)
 * 2. This app starts a local HTTP/HTTPS proxy server on the phone
 * 3. Connected devices configure their proxy to point at the phone's IP + port
 * 4. All traffic routes through the phone's mobile data → carrier sees phone browsing
 */
class HotspotService {
  constructor() {
    this.eventEmitter = null;
    this.listeners = new Map();
    if (HotspotModule) {
      this.eventEmitter = new NativeEventEmitter(HotspotModule);
    }
  }

  /**
   * Start the local proxy server on the given port.
   * Returns { success, port, ip }.
   */
  async startProxy(port = 8080) {
    if (!HotspotModule) {
      throw new Error('Native module not available');
    }
    return await HotspotModule.startProxy(port);
  }

  /**
   * Stop the local proxy server.
   */
  async stopProxy() {
    if (!HotspotModule) {
      throw new Error('Native module not available');
    }
    return await HotspotModule.stopProxy();
  }

  /**
   * Get proxy server status: isRunning, port, ip, bytesTransferred, activeConnections.
   */
  async getProxyStatus() {
    if (!HotspotModule) {
      return { isRunning: false, port: 8080, ip: '0.0.0.0', bytesTransferred: 0, activeConnections: 0 };
    }
    return await HotspotModule.getProxyStatus();
  }

  /**
   * Open the Android system hotspot/tethering settings.
   */
  async openHotspotSettings() {
    if (!HotspotModule) {
      throw new Error('Native module not available');
    }
    return await HotspotModule.openHotspotSettings();
  }

  /**
   * Check if mobile data is active.
   * Returns { hasMobileData, hasWifi, isReady }.
   */
  async checkMobileData() {
    if (!HotspotModule) {
      return { hasMobileData: false, hasWifi: false, isReady: false };
    }
    return await HotspotModule.checkMobileData();
  }

  /**
   * Get mobile network info: carrierName, networkType, hotspotIp.
   */
  async getNetworkInfo() {
    if (!HotspotModule) {
      return { carrierName: 'Unknown', networkType: 'Unknown', hotspotIp: '0.0.0.0' };
    }
    return await HotspotModule.getNetworkInfo();
  }

  /**
   * Get ARP-table connected devices.
   */
  async getConnectedDevices() {
    if (!HotspotModule) {
      return [];
    }
    return await HotspotModule.getConnectedDevices();
  }

  /**
   * Subscribe to proxy status updates.
   */
  addEventListener(eventName, callback) {
    if (!this.eventEmitter) return null;
    const subscription = this.eventEmitter.addListener(eventName, callback);
    this.listeners.set(eventName, subscription);
    return subscription;
  }

  removeAllListeners() {
    this.listeners.forEach((sub) => sub.remove());
    this.listeners.clear();
  }
}

export const ProxyEvents = {
  STATUS_UPDATE: 'onProxyStatusUpdate',
};

export default new HotspotService();
