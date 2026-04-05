import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { useHotspot } from '../context/HotspotContext';
import { validatePassword } from '../utils/formatters';

export default function SettingsScreen() {
  const { state, updateConfig } = useHotspot();

  const [ssid, setSsid] = useState(state.ssid);
  const [password, setPassword] = useState(state.password);
  const [securityType, setSecurityType] = useState(state.securityType);
  const [band, setBand] = useState(state.band);
  const [showPassword, setShowPassword] = useState(false);

  const securityOptions = ['WPA2', 'WPA3', 'WPA2/WPA3', 'None'];
  const bandOptions = ['2.4GHz', '5GHz', '2.4GHz + 5GHz'];

  const handleSave = () => {
    if (!ssid.trim()) {
      Alert.alert('Invalid SSID', 'Network name cannot be empty.');
      return;
    }

    if (securityType !== 'None') {
      const validation = validatePassword(password);
      if (!validation.valid) {
        Alert.alert('Invalid Password', validation.message);
        return;
      }
    }

    updateConfig({ ssid: ssid.trim(), password, securityType, band });
    Alert.alert('Settings Saved', 'Hotspot settings have been updated. Changes will take effect the next time you start the hotspot.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Hotspot Settings</Text>

      {state.isActive && (
        <View style={styles.warningCard}>
          <Text style={styles.warningText}>
            Stop the hotspot before changing settings.
          </Text>
        </View>
      )}

      {/* Network Name */}
      <View style={styles.section}>
        <Text style={styles.label}>Network Name (SSID)</Text>
        <TextInput
          style={styles.input}
          value={ssid}
          onChangeText={setSsid}
          placeholder="Enter network name"
          placeholderTextColor="#555"
          maxLength={32}
          editable={!state.isActive}
        />
      </View>

      {/* Security Type */}
      <View style={styles.section}>
        <Text style={styles.label}>Security</Text>
        <View style={styles.optionRow}>
          {securityOptions.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.optionButton,
                securityType === option && styles.optionSelected,
              ]}
              onPress={() => setSecurityType(option)}
              disabled={state.isActive}
            >
              <Text
                style={[
                  styles.optionText,
                  securityType === option && styles.optionTextSelected,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Password */}
      {securityType !== 'None' && (
        <View style={styles.section}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password (min 8 characters)"
              placeholderTextColor="#555"
              secureTextEntry={!showPassword}
              maxLength={63}
              editable={!state.isActive}
            />
            <TouchableOpacity
              style={styles.showButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.showButtonText}>
                {showPassword ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Frequency Band */}
      <View style={styles.section}>
        <Text style={styles.label}>Frequency Band</Text>
        <View style={styles.optionRow}>
          {bandOptions.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.optionButton,
                band === option && styles.optionSelected,
              ]}
              onPress={() => setBand(option)}
              disabled={state.isActive}
            >
              <Text
                style={[
                  styles.optionText,
                  band === option && styles.optionTextSelected,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Auto-shutoff */}
      <View style={styles.section}>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Auto-shutoff when no devices connected</Text>
          <Switch
            trackColor={{ false: '#2d3354', true: '#00c853' }}
            thumbColor="#ffffff"
            disabled={state.isActive}
          />
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, state.isActive && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={state.isActive}
      >
        <Text style={styles.saveButtonText}>Save Settings</Text>
      </TouchableOpacity>
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
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 20,
    marginBottom: 24,
  },
  warningCard: {
    backgroundColor: '#ff6d00',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    color: '#c0c4d6',
    marginBottom: 10,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#1a1f3a',
    borderRadius: 10,
    padding: 14,
    color: '#ffffff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2d3354',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
  },
  showButton: {
    marginLeft: 10,
    padding: 14,
    backgroundColor: '#2d3354',
    borderRadius: 10,
  },
  showButtonText: {
    color: '#00c853',
    fontWeight: '600',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1a1f3a',
    borderWidth: 1,
    borderColor: '#2d3354',
  },
  optionSelected: {
    backgroundColor: '#00c853',
    borderColor: '#00e676',
  },
  optionText: {
    color: '#8b8fa3',
    fontSize: 14,
  },
  optionTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#00c853',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonDisabled: {
    backgroundColor: '#2d3354',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
