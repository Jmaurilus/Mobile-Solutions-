/**
 * Format bytes into a human-readable string.
 */
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

/**
 * Format duration in seconds to HH:MM:SS.
 */
export function formatDuration(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (hrs > 0) parts.push(String(hrs).padStart(2, '0'));
  parts.push(String(mins).padStart(2, '0'));
  parts.push(String(secs).padStart(2, '0'));

  return parts.join(':');
}

/**
 * Format signal strength percentage to descriptive label.
 */
export function formatSignalStrength(strength) {
  if (strength >= 80) return 'Excellent';
  if (strength >= 60) return 'Good';
  if (strength >= 40) return 'Fair';
  if (strength >= 20) return 'Weak';
  return 'Very Weak';
}

/**
 * Generate a random default SSID.
 */
export function generateDefaultSSID() {
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `MobileHotspot_${suffix}`;
}

/**
 * Validate hotspot password meets minimum requirements.
 */
export function validatePassword(password) {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (password.length > 63) {
    return { valid: false, message: 'Password must be 63 characters or fewer' };
  }
  return { valid: true, message: '' };
}
