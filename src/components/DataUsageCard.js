import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatBytes } from '../utils/formatters';

export default function DataUsageCard({ dataUsage }) {
  const { session, total, uploaded, downloaded } = dataUsage;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Data Usage</Text>

      <View style={styles.mainStat}>
        <Text style={styles.mainValue}>{formatBytes(session)}</Text>
        <Text style={styles.mainLabel}>This Session</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatBytes(uploaded)}</Text>
          <Text style={styles.statLabel}>Uploaded</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatBytes(downloaded)}</Text>
          <Text style={styles.statLabel}>Downloaded</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatBytes(total)}</Text>
          <Text style={styles.statLabel}>All Time</Text>
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
  mainStat: {
    alignItems: 'center',
    marginBottom: 16,
  },
  mainValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00c853',
  },
  mainLabel: {
    fontSize: 14,
    color: '#8b8fa3',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2d3354',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 12,
    color: '#8b8fa3',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#2d3354',
  },
});
