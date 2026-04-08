import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useHotspot } from '../context/HotspotContext';
import HotspotService, { ProxyEvents } from '../services/HotspotService';
import { formatBytes } from '../utils/formatters';

/**
 * POC Dashboard — proves the concept in 4 steps:
 *
 * Step 1: Verify mobile data is active
 * Step 2: Enable the system WiFi hotspot
 * Step 3: Start the proxy server
 * Step 4: Connect a device and verify traffic flows
 */
export default function DashboardScreen() {
  const {
    state,
    setLoading,
    proxyStarted,
    proxyStopped,
    updateProxyStatus,
    updateNetwork,
    setHotspotEnabled,
    updateDevices,
    setError,
  } = useHotspot();

  const [refreshing, setRefreshing] = useState(false);

  // Poll for status updates when proxy is running
  useEffect(() => {
    const listener = HotspotService.addEventListener(
      ProxyEvents.STATUS_UPDATE,
      (data) => updateProxyStatus(data)
    );

    return () => HotspotService.removeAllListeners();
  }, [updateProxyStatus]);

  // Check mobile data on mount and periodically
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const [mobileData, networkInfo] = await Promise.all([
          HotspotService.checkMobileData(),
          HotspotService.getNetworkInfo(),
        ]);
        updateNetwork({
          hasMobileData: mobileData.hasMobileData,
          carrierName: networkInfo.carrierName,
          networkType: networkInfo.networkType,
          hotspotIp: networkInfo.hotspotIp,
        });
      } catch (_) {}
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [updateNetwork]);

  // Poll connected devices when proxy is running
  useEffect(() => {
    if (!state.proxyRunning) return;

    const pollDevices = async () => {
      try {
        const devices = await HotspotService.getConnectedDevices();
        updateDevices(devices);
      } catch (_) {}
    };

    pollDevices();
    const interval = setInterval(pollDevices, 4000);
    return () => clearInterval(interval);
  }, [state.proxyRunning, updateDevices]);

  // ----- Actions -----

  const handleOpenHotspotSettings = useCallback(async () => {
    try {
      await HotspotService.openHotspotSettings();
      // Can't detect programmatically; let user confirm
      setTimeout(() => {
        Alert.alert(
          'Hotspot Enabled?',
          'Did you enable the WiFi hotspot in Settings?',
          [
            { text: 'Not Yet', style: 'cancel' },
            { text: 'Yes', onPress: () => setHotspotEnabled(true) },
          ]
        );
      }, 1500);
    } catch (e) {
      setError(e.message);
    }
  }, [setHotspotEnabled, setError]);

  const handleStartProxy = useCallback(async () => {
    setLoading(true);
    try {
      const result = await HotspotService.startProxy(state.proxyPort);
      proxyStarted({ port: result.port, ip: result.ip });
    } catch (e) {
      setError(e.message);
      Alert.alert('Proxy Error', e.message);
    }
  }, [state.proxyPort, setLoading, proxyStarted, setError]);

  const handleStopProxy = useCallback(async () => {
    try {
      await HotspotService.stopProxy();
      proxyStopped();
    } catch (e) {
      setError(e.message);
    }
  }, [proxyStopped, setError]);

  const handleRefreshStatus = useCallback(async () => {
    setRefreshing(true);
    try {
      const status = await HotspotService.getProxyStatus();
      updateProxyStatus(status);
      const devices = await HotspotService.getConnectedDevices();
      updateDevices(devices);
    } catch (_) {}
    setRefreshing(false);
  }, [updateProxyStatus, updateDevices]);

  // ----- Render Helpers -----

  const renderStepIndicator = (stepNum, label, done) => (
    <View style={styles.stepRow} key={stepNum}>
      <View style={[styles.stepCircle, done && styles.stepCircleDone]}>
        <Text style={styles.stepNum}>{done ? '✓' : stepNum}</Text>
      </View>
      <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>{label}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Mobile Hotspot Broadcast</Text>
      <Text style={styles.subtitle}>Proof of Concept</Text>

      {/* Progress Steps */}
      <View style={styles.stepsCard}>
        {renderStepIndicator(1, 'Mobile data active', state.hasMobileData)}
        {renderStepIndicator(2, 'System hotspot enabled', state.steps.hotspotEnabled)}
        {renderStepIndicator(3, 'Proxy server running', state.steps.proxyStarted)}
        {renderStepIndicator(4, 'Traffic flowing through proxy', state.steps.trafficFlowing)}
      </View>

      {/* Step 1: Mobile Data Check */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Step 1: Mobile Data</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Status</Text>
          <Text style={[styles.infoValue, { color: state.hasMobileData ? '#00c853' : '#ff1744' }]}>
            {state.hasMobileData ? 'Connected' : 'Not detected'}
          </Text>
        </View>
        {state.carrierName ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Carrier</Text>
            <Text style={styles.infoValue}>{state.carrierName} ({state.networkType})</Text>
          </View>
        ) : null}
        {!state.hasMobileData && (
          <Text style={styles.hint}>
            Make sure WiFi is off and mobile data is on. The app needs to route traffic through your cellular connection.
          </Text>
        )}
      </View>

      {/* Step 2: Enable System Hotspot */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Step 2: Enable WiFi Hotspot</Text>
        <Text style={styles.hint}>
          Open Android's hotspot settings to create the WiFi access point that other devices will connect to.
        </Text>
        <TouchableOpacity style={styles.button} onPress={handleOpenHotspotSettings}>
          <Text style={styles.buttonText}>Open Hotspot Settings</Text>
        </TouchableOpacity>
        {state.steps.hotspotEnabled && (
          <TouchableOpacity onPress={() => setHotspotEnabled(false)}>
            <Text style={styles.resetText}>Reset this step</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Step 3: Start Proxy */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Step 3: Start Proxy Server</Text>
        <Text style={styles.hint}>
          The proxy runs on your phone. Connected devices send traffic through it, so the carrier sees normal phone browsing.
        </Text>

        {state.proxyRunning ? (
          <>
            <View style={styles.proxyStatus}>
              <View style={styles.proxyDot} />
              <Text style={styles.proxyRunningText}>
                Proxy running on {state.proxyIp}:{state.proxyPort}
              </Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{formatBytes(state.bytesTransferred)}</Text>
                <Text style={styles.statLabel}>Transferred</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{state.activeConnections}</Text>
                <Text style={styles.statLabel}>Active Conn.</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{state.connectedDevices.length}</Text>
                <Text style={styles.statLabel}>Devices</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, styles.buttonDanger]}
              onPress={handleStopProxy}
            >
              <Text style={styles.buttonText}>Stop Proxy</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.button, (!state.steps.hotspotEnabled) && styles.buttonDisabled]}
            onPress={handleStartProxy}
            disabled={state.isLoading}
          >
            <Text style={styles.buttonText}>
              {state.isLoading ? 'Starting...' : 'Start Proxy Server'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Step 4: Verification */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Step 4: Connect & Verify</Text>
        <Text style={styles.hint}>
          On another device connected to your hotspot WiFi:
        </Text>
        <View style={styles.instructionBox}>
          <Text style={styles.instructionTitle}>Proxy Configuration</Text>
          <Text style={styles.instructionText}>
            1. Go to WiFi settings → your hotspot network{'\n'}
            2. Set HTTP Proxy to "Manual"{'\n'}
            3. Server: {state.proxyIp || '192.168.43.1'}{'\n'}
            4. Port: {state.proxyPort}{'\n'}
            5. Open a browser and visit any website
          </Text>
        </View>

        {state.steps.trafficFlowing && (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>
              Traffic is flowing! {formatBytes(state.bytesTransferred)} routed through your mobile data.
            </Text>
          </View>
        )}

        {state.proxyRunning && (
          <TouchableOpacity style={styles.buttonOutline} onPress={handleRefreshStatus}>
            <Text style={styles.buttonOutlineText}>
              {refreshing ? 'Checking...' : 'Refresh Status'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Error display */}
      {state.error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{state.error}</Text>
        </View>
      )}

      {/* Technical explanation */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>How This Works</Text>
        <Text style={styles.explainer}>
          Your carrier provides unlimited mobile web browsing, but may throttle or block standard tethering/hotspot data.{'\n\n'}
          This app runs a proxy server on your phone. Devices on your hotspot WiFi send their traffic through the proxy. Since the proxy runs on the phone itself, all outbound traffic goes through the phone's mobile data stack — identical to normal phone browsing.{'\n\n'}
          The carrier's network sees regular HTTP/HTTPS requests originating from the phone, not tethered traffic.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#8b8fa3',
    textAlign: 'center',
    marginBottom: 20,
  },

  // Steps tracker
  stepsCard: {
    backgroundColor: '#1a1f3a',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2d3354',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2d3354',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepCircleDone: {
    backgroundColor: '#00c853',
  },
  stepNum: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  stepLabel: {
    color: '#8b8fa3',
    fontSize: 15,
  },
  stepLabelDone: {
    color: '#ffffff',
    fontWeight: '500',
  },

  // Cards
  card: {
    backgroundColor: '#1a1f3a',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2d3354',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  infoLabel: {
    color: '#8b8fa3',
    fontSize: 14,
  },
  infoValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  hint: {
    color: '#8b8fa3',
    fontSize: 13,
    lineHeight: 19,
    marginVertical: 8,
  },

  // Buttons
  button: {
    backgroundColor: '#00c853',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDanger: {
    backgroundColor: '#ff1744',
  },
  buttonDisabled: {
    backgroundColor: '#2d3354',
  },
  buttonOutline: {
    borderWidth: 1,
    borderColor: '#00c853',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonOutlineText: {
    color: '#00c853',
    fontSize: 15,
    fontWeight: '600',
  },
  resetText: {
    color: '#8b8fa3',
    textAlign: 'center',
    marginTop: 8,
    fontSize: 13,
    textDecorationLine: 'underline',
  },

  // Proxy status
  proxyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  proxyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00c853',
    marginRight: 8,
  },
  proxyRunningText: {
    color: '#00c853',
    fontWeight: '600',
    fontSize: 14,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#2d3354',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#8b8fa3',
    fontSize: 12,
    marginTop: 2,
  },

  // Instructions
  instructionBox: {
    backgroundColor: '#0d1230',
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#2d3354',
  },
  instructionTitle: {
    color: '#00c853',
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 6,
  },
  instructionText: {
    color: '#c0c4d6',
    fontSize: 13,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Success
  successBanner: {
    backgroundColor: '#00c85320',
    borderWidth: 1,
    borderColor: '#00c853',
    borderRadius: 10,
    padding: 14,
    marginTop: 12,
  },
  successText: {
    color: '#00c853',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 14,
  },

  // Error
  errorCard: {
    backgroundColor: '#ff1744',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    color: '#ffffff',
    textAlign: 'center',
  },

  // Explainer
  explainer: {
    color: '#8b8fa3',
    fontSize: 13,
    lineHeight: 20,
  },
});
