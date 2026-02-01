# Teboraw Mobile App

React Native app for tracking location data and syncing with the Teboraw API.

## Prerequisites

### For Both Platforms

- Node.js 18+
- pnpm (or npm/yarn)
- React Native CLI

```bash
# Install React Native CLI globally
npm install -g react-native-cli
```

### For iOS (Mac only)

- macOS with Xcode 15+ (from Mac App Store)
- Xcode Command Line Tools
- CocoaPods

```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install CocoaPods
sudo gem install cocoapods
```

### For Android

- Android Studio with SDK 34
- Java 17 (bundled with Android Studio)
- Environment variables configured

Add to `~/.zshrc` or `~/.bashrc`:
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

## Installation

### Step 1: Install Dependencies

```bash
cd apps/mobile
pnpm install
```

### Step 2: Generate Native Projects

The native iOS/Android folders need to be generated:

```bash
npx react-native eject
```

If that doesn't work, initialize a new project and copy the source:

```bash
# In a temporary directory
npx react-native init TeborawMobile --template react-native-template-typescript

# Copy the src/ folder from this project to the new one
# Then copy package.json dependencies
```

### Step 3: iOS Setup

1. Install CocoaPods dependencies:
```bash
cd ios
pod install
cd ..
```

2. Add location permissions to `ios/Teboraw/Info.plist`:
```xml
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Teboraw needs your location to track your activities.</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>Teboraw needs your location to track your activities.</string>

<key>NSLocationAlwaysUsageDescription</key>
<string>Teboraw needs background location access to continuously track your activities.</string>

<key>UIBackgroundModes</key>
<array>
  <string>location</string>
  <string>fetch</string>
  <string>processing</string>
</array>

<key>BGTaskSchedulerPermittedIdentifiers</key>
<array>
  <string>com.transistorsoft.fetch</string>
  <string>com.transistorsoft.customtask</string>
</array>
```

### Step 4: Android Setup

Add permissions to `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

  <!-- Location Permissions -->
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
  <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
  <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />

  <!-- Foreground Service -->
  <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
  <uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />

  <!-- Boot & Battery -->
  <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
  <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />

  <application ...>
    <!-- Background Geolocation Boot Receiver -->
    <receiver
      android:name="com.transistorsoft.locationmanager.boot.BootReceiver"
      android:exported="true">
      <intent-filter>
        <action android:name="android.intent.action.BOOT_COMPLETED" />
      </intent-filter>
    </receiver>
  </application>
</manifest>
```

## Running on a Physical Device

### iOS

1. Open the Xcode workspace:
```bash
open ios/Teboraw.xcworkspace
```

2. In Xcode:
   - Go to **Signing & Capabilities**
   - Select your Apple Developer Team
   - Connect your iPhone via USB cable
   - Select your device from the device dropdown (top left)
   - Click the **Play** button (or press `Cmd + R`)

3. Trust the developer on your iPhone:
   - Open **Settings** → **General** → **VPN & Device Management**
   - Tap your developer certificate and select **Trust**

### Android

1. Enable Developer Options on your phone:
   - Go to **Settings** → **About Phone**
   - Tap **Build Number** 7 times

2. Enable USB Debugging:
   - Go to **Settings** → **Developer Options**
   - Enable **USB Debugging**

3. Connect your phone via USB and authorize the computer when prompted

4. Verify the device is connected:
```bash
adb devices
```

5. Run the app:
```bash
npx react-native run-android
```

## Configuring the API Connection

The app needs to connect to your Teboraw API server.

### Option 1: In-App Configuration
After logging in, the app stores the API URL. You can set it programmatically:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage'

// Set your API URL
await AsyncStorage.setItem('apiUrl', 'https://your-api-server.com')
```

### Option 2: Local Development
For local development, use your computer's IP address (not `localhost`):

```bash
# Find your local IP
ifconfig | grep "inet " | grep -v 127.0.0.1

# Example output: inet 192.168.1.100
# Use: http://192.168.1.100:5000
```

Set in the app:
```typescript
await AsyncStorage.setItem('apiUrl', 'http://192.168.1.100:5000')
```

## Common Commands

| Command | Description |
|---------|-------------|
| `npx react-native start` | Start Metro bundler |
| `npx react-native run-ios --device` | Run on connected iOS device |
| `npx react-native run-android` | Run on connected Android device |
| `cd ios && pod install` | Install/update iOS dependencies |
| `cd android && ./gradlew clean` | Clean Android build |
| `adb devices` | List connected Android devices |
| `adb logcat` | View Android device logs |

## Troubleshooting

### General Issues

**"No bundle URL present"**
- Make sure Metro bundler is running: `npx react-native start`
- Reset the cache: `npx react-native start --reset-cache`

**App crashes on launch**
- Check logs: `npx react-native log-ios` or `adb logcat`
- Clean and rebuild the project

### iOS Issues

**Signing errors**
- Open Xcode Preferences → Accounts → Add your Apple ID
- Select your team in the project's Signing & Capabilities

**Pod install fails**
```bash
cd ios
pod deintegrate
pod cache clean --all
pod install
```

**"Unable to boot device in current state: Booted"**
- Close the simulator and retry

### Android Issues

**Device not found**
```bash
# Verify USB connection
adb devices

# If unauthorized, check phone for permission prompt
# If offline, try:
adb kill-server
adb start-server
```

**Build fails with SDK errors**
- Open Android Studio → SDK Manager
- Install Android SDK 34 and Build Tools

**App installed but crashes**
```bash
# View crash logs
adb logcat *:E | grep -i react
```

### Location Issues

**Location not updating**
- Ensure "Always Allow" permission is granted (not just "While Using")
- Check that location services are enabled on the device
- For Android, disable battery optimization for the app

**Background tracking stops**
- iOS: Verify background modes are enabled in Xcode
- Android: Add app to battery optimization exceptions
- Check that the foreground notification appears (Android)

## Architecture

```
src/
├── screens/
│   ├── HomeScreen.tsx      # Main dashboard
│   ├── SettingsScreen.tsx  # Tracking controls & sync status
│   └── LoginScreen.tsx     # Authentication
├── services/
│   └── TrackingService.ts  # Background geolocation & sync
├── utils/
│   └── permissions.ts      # Permission handling
└── store/
    └── authStore.ts        # Authentication state
```

## Features

- **Background Location Tracking**: Battery-efficient tracking using significant location changes
- **Automatic Sync**: Queues location data and syncs when connected
- **Offline Support**: Stores locations locally until sync succeeds
- **Permission Handling**: Graceful permission requests with rationale dialogs
- **Token Refresh**: Automatic JWT token refresh when expired

## License

Private - Teboraw Project
