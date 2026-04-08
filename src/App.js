import React from 'react';
import { StatusBar, SafeAreaView, StyleSheet } from 'react-native';
import { HotspotProvider } from './context/HotspotContext';
import DashboardScreen from './screens/DashboardScreen';

/**
 * Mobile Hotspot Broadcast — Proof of Concept
 *
 * Single-screen app focused on proving the core concept:
 * mobile browsing data → proxy → hotspot clients
 */
export default function App() {
  return (
    <HotspotProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0e27" />
        <DashboardScreen />
      </SafeAreaView>
    </HotspotProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
});
