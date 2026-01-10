#!/usr/bin/env node

const { systemPreferences } = require('electron');

console.log('\n=== macOS Permission Status ===\n');

// Check Accessibility
const hasAccessibility = systemPreferences.isTrustedAccessibilityClient(false);
console.log(`Accessibility: ${hasAccessibility ? '✅ GRANTED' : '❌ NOT GRANTED'}`);

// Check Screen Recording
const screenStatus = systemPreferences.getMediaAccessStatus('screen');
console.log(`Screen Recording: ${screenStatus === 'granted' ? '✅ GRANTED' : `❌ ${screenStatus.toUpperCase()}`}`);

console.log('\n==============================\n');

if (!hasAccessibility) {
  console.log('❌ Accessibility permission is NOT granted');
  console.log('\nTo fix:');
  console.log('1. Go to System Settings > Privacy & Security > Accessibility');
  console.log('2. Look for "Electron" in the list');
  console.log('3. Enable the checkbox');
  console.log('4. Restart the app\n');
} else {
  console.log('✅ All required permissions are granted!\n');
}

process.exit(0);
