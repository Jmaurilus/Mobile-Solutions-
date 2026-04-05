import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatSignalStrength } from '../utils/formatters';

export default function NetworkInfoCard({ networkInfo }) {
  const { carrierName, networkType, signalStrength, isUnlimitedPlan } = networkInfo;

  const signalColor =
    signalStrength >= 60 ? '#00c853' : signalStrength >= 30 ? '#ff9100' : '#ff1744';

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Mobile Network</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Carrier</Text>
        <Text style={styles.value}>{carrierName || 'Detecting...'}</Text>
      </View>
      <View style={styles.divider} />

      <View style={styles.row}>
        <Text style={styles.label}>Network Type</Text>
        <Text style={styles.value}>{networkType || 'Detecting...'}</Text>
      </View>
      <View style={styles.divider} />

      <View style={styles.row}>
        <Text style={styles.label}>Signal Strength</Text>
        <View style={styles.signalRow}>
          <View style={styles.signalBars}>
            {[1, 2, 3, 4, 5].map((bar) => (
              <View
                key={bar}
                style={[
                  styles.signalBar,
                  {
                    height: 4 + bar * 3,
                    backgroundColor:
                      signalStrength >= bar * 20 ? signalColor : '#2d3354',
                  },
                ]}
              />
            ))}
          </View>
          <Text style={[styles.value, { color: signalColor }]}>
            {formatSignalStrength(signalStrength)}
          </Text>
        </View>
      </View>
      <View style={styles.divider} />

      <View style={styles.row}>
        <Text style={styles.label}>Plan Type</Text>
        <View
          style={[
            styles.planBadge,
            {
              backgroundColor: isUnlimitedPlan ? '#00c85320' : '#ff174420',
              borderColor: isUnlimitedPlan ? '#00c853' : '#ff1744',
            },
          ]}
        >
          <Text
            style={[
              styles.planText,
              { color: isUnlimitedPlan ? '#00c853' : '#ff1744' },
            ]}
          >
            {isUnlimitedPlan ? 'Unlimited' : 'Limited'}
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
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signalBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginRight: 8,
    height: 19,
  },
  signalBar: {
    width: 4,
    borderRadius: 2,
    marginHorizontal: 1,
  },
  planBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  planText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
