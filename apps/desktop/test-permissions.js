#!/usr/bin/env node

/**
 * Test script to trigger macOS permission prompts
 * Run this to make Electron appear in System Settings > Accessibility
 */

const { systemPreferences } = require('electron');
const { exec } = require('child_process');

console.log('='.repeat(60));
console.log('macOS Permissions Test');
console.log('='.repeat(60));
console.log('');

// Check current status
console.log('Checking current permission status...');
const isAccessibilityTrusted = systemPreferences.isTrustedAccessibilityClient(false);
console.log(`Accessibility permission: ${isAccessibilityTrusted ? '✅ GRANTED' : '❌ NOT GRANTED'}`);
console.log('');

if (!isAccessibilityTrusted) {
  console.log('⚠️  Accessibility permission is NOT granted');
  console.log('');
  console.log('Attempting to trigger system permission dialog...');

  // This call with 'true' will:
  // 1. Add Electron to the Accessibility list in System Settings
  // 2. May show a system dialog (on first run)
  const result = systemPreferences.isTrustedAccessibilityClient(true);

  console.log('');
  if (result) {
    console.log('✅ Permission granted!');
  } else {
    console.log('❌ Permission not granted yet');
    console.log('');
    console.log('Next steps:');
    console.log('1. Open System Settings > Privacy & Security > Accessibility');
    console.log('2. Look for "Electron" in the list');
    console.log('3. If you don\'t see it, the app may need to actually try using accessibility features');
    console.log('4. Enable the checkbox next to "Electron"');
    console.log('5. Restart the Teboraw app');
    console.log('');
    console.log('Opening System Settings for you...');

    // Open System Settings
    exec('open "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"', (err) => {
      if (err) {
        console.error('Could not open System Settings automatically');
      }
    });
  }
}

console.log('');
console.log('='.repeat(60));
