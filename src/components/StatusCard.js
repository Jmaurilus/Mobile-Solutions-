import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function StatusCard({ ssid, securityType, band, isActive }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Hotspot Configuration</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Network Name</Text>
        <Text style={styles.value}>{ssid}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.row}>
        <Text style={styles.label}>Security</Text>
        <Text style={styles.value}>{securityType}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.row}>
        <Text style={styles.label}>Band</Text>
        <Text style={styles.value}>{band}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.row}>
        <Text style={styles.label}>Status</Text>
        <View style={styles.statusBadge}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isActive ? '#00c853' : '#ff1744' },
            ]}
          />
          <Text style={[styles.statusText, { color: isActive ? '#00c853' : '#ff1744' }]}>
            {isActive ? 'Broadcasting' : 'Inactive'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1f3a',
    borderRadius: 14,
    padding: 18,
    width: '100%',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#2d3354',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#2d3354',
  },
  label: {
    fontSize: 14,
    color: '#8b8fa3',
  },
  value: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
