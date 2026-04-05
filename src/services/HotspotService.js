import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { HotspotModule } = NativeModules;

class HotspotService {
  constructor() {
    this.eventEmitter = null;
    this.listeners = new Map();
    this._setupEventEmitter();
  }

  _setupEventEmitter() {
    if (HotspotModule) {
      this.eventEmitter = new NativeEventEmitter(HotspotModule);
    }
  }

  /**
   * Start broadcasting the mobile hotspot.
   * Routes mobile web browsing data through the hotspot interface.
   */
  async startHotspot(config) {
    if (!HotspotModule) {
      throw new Error('HotspotModule is not available on this platform');
    }

    const { ssid, password, securityType, band } = config;

    try {
      const result = await HotspotModule.startHotspot({
        ssid: ssid || 'MyMobileHotspot',
        password: password || 'secure1234',
        securityType: securityType || 'WPA2',
        band: band || '2.4GHz',
        // Key: route through mobile web browsing interface
        routeThroughBrowser: true,
      });
      return result;
    } catch (error) {
      throw new Error(`Failed to start hotspot: ${error.message}`);
    }
  }

  /**
   * Stop the mobile hotspot broadcast.
   */
  async stopHotspot() {
    if (!HotspotModule) {
      throw new Error('HotspotModule is not available on this platform');
    }

    try {
      return await HotspotModule.stopHotspot();
    } catch (error) {
      throw new Error(`Failed to stop hotspot: ${error.message}`);
    }
  }

  /**
   * Get current hotspot status and connected device info.
   */
  async getHotspotStatus() {
    if (!HotspotModule) {
      return {
        isActive: false,
        connectedDevices: [],
        dataUsage: { session: 0, total: 0, uploaded: 0, downloaded: 0 },
      };
    }

    try {
      return await HotspotModule.getHotspotStatus();
    } catch (error) {
      throw new Error(`Failed to get hotspot status: ${error.message}`);
    }
  }

  /**
   * Get list of currently connected devices.
   */
  async getConnectedDevices() {
    if (!HotspotModule) {
      return [];
    }

    try {
      return await HotspotModule.getConnectedDevices();
    } catch (error) {
      throw new Error(`Failed to get connected devices: ${error.message}`);
    }
  }

  /**
   * Get current mobile network information.
   */
  async getNetworkInfo() {
    if (!HotspotModule) {
      return {
        carrierName: 'Unknown',
        networkType: 'Unknown',
        signalStrength: 0,
        isUnlimitedPlan: false,
      };
    }

    try {
      return await HotspotModule.getNetworkInfo();
    } catch (error) {
      throw new Error(`Failed to get network info: ${error.message}`);
    }
  }

  /**
   * Get current data usage statistics.
   */
  async getDataUsage() {
    if (!HotspotModule) {
      return { session: 0, total: 0, uploaded: 0, downloaded: 0 };
    }

    try {
      return await HotspotModule.getDataUsage();
    } catch (error) {
      throw new Error(`Failed to get data usage: ${error.message}`);
    }
  }

  /**
   * Check if required permissions are granted.
   */
  async checkPermissions() {
    if (!HotspotModule) {
      return { granted: false, permissions: [] };
    }

    try {
      return await HotspotModule.checkPermissions();
    } catch (error) {
      throw new Error(`Failed to check permissions: ${error.message}`);
    }
  }

  /**
   * Request required permissions for hotspot functionality.
   */
  async requestPermissions() {
    if (!HotspotModule) {
      return { granted: false };
    }

    try {
      return await HotspotModule.requestPermissions();
    } catch (error) {
      throw new Error(`Failed to request permissions: ${error.message}`);
    }
  }

  /**
   * Subscribe to hotspot events.
   */
  addEventListener(eventName, callback) {
    if (!this.eventEmitter) return null;

    const subscription = this.eventEmitter.addListener(eventName, callback);
    this.listeners.set(eventName, subscription);
    return subscription;
  }

  /**
   * Remove event listener.
   */
  removeEventListener(eventName) {
    const subscription = this.listeners.get(eventName);
    if (subscription) {
      subscription.remove();
      this.listeners.delete(eventName);
    }
  }

  /**
   * Remove all event listeners.
   */
  removeAllListeners() {
    this.listeners.forEach((subscription) => subscription.remove());
    this.listeners.clear();
  }
}

// Event names for hotspot events
export const HotspotEvents = {
  DEVICE_CONNECTED: 'onDeviceConnected',
  DEVICE_DISCONNECTED: 'onDeviceDisconnected',
  DATA_USAGE_UPDATED: 'onDataUsageUpdated',
  HOTSPOT_STATE_CHANGED: 'onHotspotStateChanged',
  NETWORK_CHANGED: 'onNetworkChanged',
  ERROR: 'onHotspotError',
};

export default new HotspotService();
