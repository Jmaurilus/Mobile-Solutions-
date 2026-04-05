import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useHotspot } from '../context/HotspotContext';
import HotspotService, { HotspotEvents } from '../services/HotspotService';
import StatusCard from '../components/StatusCard';
import DataUsageCard from '../components/DataUsageCard';
import NetworkInfoCard from '../components/NetworkInfoCard';
import { formatBytes, formatDuration } from '../utils/formatters';

export default function DashboardScreen() {
  const { state, startHotspot, stopHotspot, updateDataUsage, updateNetworkInfo, setError } =
    useHotspot();
  const [sessionTime, setSessionTime] = useState(0);

  // Session timer
  useEffect(() => {
    let interval = null;
    if (state.isActive) {
      interval = setInterval(() => {
        setSessionTime((prev) => prev + 1);
      }, 1000);
    } else {
      setSessionTime(0);
    }
    return () => clearInterval(interval);
  }, [state.isActive]);

  // Subscribe to native hotspot events
  useEffect(() => {
    const dataListener = HotspotService.addEventListener(
      HotspotEvents.DATA_USAGE_UPDATED,
      (data) => updateDataUsage(data)
    );

    const networkListener = HotspotService.addEventListener(
      HotspotEvents.NETWORK_CHANGED,
      (info) => updateNetworkInfo(info)
    );

    const errorListener = HotspotService.addEventListener(
      HotspotEvents.ERROR,
      (error) => setError(error.message)
    );

    // Fetch initial network info
    HotspotService.getNetworkInfo()
      .then((info) => updateNetworkInfo(info))
      .catch(() => {});

    return () => {
      HotspotService.removeAllListeners();
    };
  }, [updateDataUsage, updateNetworkInfo, setError]);

  const handleToggleHotspot = useCallback(async () => {
    try {
      if (state.isActive) {
        await HotspotService.stopHotspot();
        stopHotspot();
      } else {
        // Check permissions first
        const permResult = await HotspotService.checkPermissions();
        if (!permResult.granted) {
          const reqResult = await HotspotService.requestPermissions();
          if (!reqResult.granted) {
            Alert.alert(
              'Permissions Required',
              'Hotspot functionality requires location and WiFi permissions. Please enable them in Settings.'
            );
            return;
          }
        }

        await HotspotService.startHotspot({
          ssid: state.ssid,
          password: state.password,
          securityType: state.securityType,
          band: state.band,
        });
        startHotspot();
      }
    } catch (error) {
      setError(error.message);
      Alert.alert('Error', error.message);
    }
  }, [state.isActive, state.ssid, state.password, state.securityType, state.band, startHotspot, stopHotspot, setError]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Mobile Hotspot</Text>
      <Text style={styles.subtitle}>
        Broadcast your unlimited mobile browsing as WiFi
      </Text>

      {/* Main toggle button */}
      <TouchableOpacity
        style={[
          styles.toggleButton,
          state.isActive ? styles.toggleActive : styles.toggleInactive,
        ]}
        onPress={handleToggleHotspot}
        disabled={state.isLoading}
        activeOpacity={0.8}
      >
        <View style={styles.toggleInner}>
          <Text style={styles.toggleIcon}>
            {state.isActive ? 'ON' : 'OFF'}
          </Text>
          <Text style={styles.toggleLabel}>
            {state.isLoading
              ? 'Please wait...'
              : state.isActive
              ? 'Tap to Stop'
              : 'Tap to Start'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Status info */}
      {state.isActive && (
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionTime}>
            Session: {formatDuration(sessionTime)}
          </Text>
          <Text style={styles.deviceCount}>
            {state.connectedDevices.length} device(s) connected
          </Text>
        </View>
      )}

      {/* Hotspot configuration summary */}
      <StatusCard
        ssid={state.ssid}
        securityType={state.securityType}
        band={state.band}
        isActive={state.isActive}
      />

      {/* Network info */}
      <NetworkInfoCard networkInfo={state.networkInfo} />

      {/* Data usage */}
      <DataUsageCard dataUsage={state.dataUsage} />

      {/* Error display */}
      {state.error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{state.error}</Text>
        </View>
      )}
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
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#8b8fa3',
    marginTop: 6,
    marginBottom: 30,
  },
  toggleButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  toggleActive: {
    backgroundColor: '#00c853',
    borderWidth: 4,
    borderColor: '#00e676',
  },
  toggleInactive: {
    backgroundColor: '#1a1f3a',
    borderWidth: 4,
    borderColor: '#2d3354',
  },
  toggleInner: {
    alignItems: 'center',
  },
  toggleIcon: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  toggleLabel: {
    fontSize: 14,
    color: '#ffffff',
    marginTop: 8,
    opacity: 0.8,
  },
  sessionInfo: {
    alignItems: 'center',
    marginVertical: 10,
  },
  sessionTime: {
    fontSize: 18,
    color: '#00c853',
    fontWeight: '600',
  },
  deviceCount: {
    fontSize: 14,
    color: '#8b8fa3',
    marginTop: 4,
  },
  errorCard: {
    backgroundColor: '#ff1744',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    marginTop: 12,
  },
  errorText: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
  },
});
