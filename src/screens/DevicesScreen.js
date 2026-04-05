import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useHotspot } from '../context/HotspotContext';
import HotspotService, { HotspotEvents } from '../services/HotspotService';
import { formatBytes } from '../utils/formatters';

function DeviceItem({ device }) {
  return (
    <View style={styles.deviceCard}>
      <View style={styles.deviceIcon}>
        <Text style={styles.deviceIconText}>
          {device.deviceName ? device.deviceName[0].toUpperCase() : '?'}
        </Text>
      </View>
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>
          {device.deviceName || 'Unknown Device'}
        </Text>
        <Text style={styles.deviceMac}>{device.macAddress}</Text>
        <Text style={styles.deviceIp}>IP: {device.ipAddress}</Text>
      </View>
      <View style={styles.deviceStats}>
        <Text style={styles.deviceUsage}>
          {formatBytes(device.dataUsed || 0)}
        </Text>
        <Text style={styles.deviceDuration}>
          {device.connectedSince || 'Just now'}
        </Text>
      </View>
    </View>
  );
}

export default function DevicesScreen() {
  const { state, dispatch } = useHotspot();
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    const connectListener = HotspotService.addEventListener(
      HotspotEvents.DEVICE_CONNECTED,
      (device) => {
        dispatch({ type: 'DEVICE_CONNECTED', payload: device });
      }
    );

    const disconnectListener = HotspotService.addEventListener(
      HotspotEvents.DEVICE_DISCONNECTED,
      (device) => {
        dispatch({ type: 'DEVICE_DISCONNECTED', payload: device });
      }
    );

    return () => {
      HotspotService.removeEventListener(HotspotEvents.DEVICE_CONNECTED);
      HotspotService.removeEventListener(HotspotEvents.DEVICE_DISCONNECTED);
    };
  }, [dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const devices = await HotspotService.getConnectedDevices();
      dispatch({ type: 'UPDATE_CONNECTED_DEVICES', payload: devices });
    } catch (error) {
      // Silently fail on refresh
    }
    setRefreshing(false);
  }, [dispatch]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>~</Text>
      <Text style={styles.emptyTitle}>
        {state.isActive ? 'No Devices Connected' : 'Hotspot is Off'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {state.isActive
          ? 'Devices that connect to your hotspot will appear here.'
          : 'Start your hotspot from the Dashboard to see connected devices.'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connected Devices</Text>

      {state.isActive && (
        <View style={styles.statusBar}>
          <View style={[styles.statusDot, styles.statusDotActive]} />
          <Text style={styles.statusText}>
            Hotspot Active - {state.connectedDevices.length} device(s)
          </Text>
        </View>
      )}

      <FlatList
        data={state.connectedDevices}
        keyExtractor={(item) => item.macAddress}
        renderItem={({ item }) => <DeviceItem device={item} />}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={
          state.connectedDevices.length === 0 ? styles.emptyContainer : styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00c853"
            colors={['#00c853']}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    padding: 20,
    paddingBottom: 10,
    marginTop: 20,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusDotActive: {
    backgroundColor: '#00c853',
  },
  statusText: {
    color: '#8b8fa3',
    fontSize: 14,
  },
  listContent: {
    padding: 20,
    paddingTop: 10,
  },
  deviceCard: {
    backgroundColor: '#1a1f3a',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2d3354',
  },
  deviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2d3354',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  deviceIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00c853',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  deviceMac: {
    fontSize: 12,
    color: '#8b8fa3',
    marginTop: 2,
  },
  deviceIp: {
    fontSize: 12,
    color: '#8b8fa3',
    marginTop: 1,
  },
  deviceStats: {
    alignItems: 'flex-end',
  },
  deviceUsage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00c853',
  },
  deviceDuration: {
    fontSize: 12,
    color: '#8b8fa3',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    color: '#2d3354',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8b8fa3',
    textAlign: 'center',
    lineHeight: 20,
  },
});
