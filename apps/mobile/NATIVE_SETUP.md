# Native Setup for Teboraw Mobile

This guide covers the native configuration required for iOS and Android.

## Generate Native Projects

If not already done, generate the native projects:

```bash
cd apps/mobile
npx react-native eject
# or for a fresh project structure:
npx react-native init TeborawMobile --template react-native-template-typescript
```

## iOS Configuration

### 1. Info.plist

Add the following to `ios/Teboraw/Info.plist`:

```xml
<!-- Location Permissions -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>Teboraw needs your location to track your activities.</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Teboraw needs your location in the background to track your activities even when the app is closed.</string>

<key>NSLocationAlwaysUsageDescription</key>
<string>Teboraw needs background location access to continuously track your activities.</string>

<!-- Background Modes -->
<key>UIBackgroundModes</key>
<array>
  <string>location</string>
  <string>fetch</string>
  <string>processing</string>
</array>

<!-- Background Geolocation -->
<key>BGTaskSchedulerPermittedIdentifiers</key>
<array>
  <string>com.transistorsoft.fetch</string>
  <string>com.transistorsoft.customtask</string>
</array>
```

### 2. Podfile

Add to `ios/Podfile`:

```ruby
target 'Teboraw' do
  # ... existing config

  # Background Geolocation
  pod 'CocoaLumberjack', '~> 3.7.2'
end

post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
    end
  end
end
```

### 3. Install Pods

```bash
cd ios && pod install
```

## Android Configuration

### 1. AndroidManifest.xml

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

  <!-- Location Permissions -->
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
  <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
  <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />

  <!-- Foreground Service -->
  <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
  <uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />

  <!-- Boot Completed (for auto-start) -->
  <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />

  <!-- Prevent Doze Mode -->
  <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />

  <application ...>
    <!-- Background Geolocation HeadlessTask -->
    <receiver android:name="com.transistorsoft.locationmanager.boot.BootReceiver"
              android:exported="true">
      <intent-filter>
        <action android:name="android.intent.action.BOOT_COMPLETED" />
      </intent-filter>
    </receiver>

    <!-- ... rest of application -->
  </application>
</manifest>
```

### 2. build.gradle (app level)

Add to `android/app/build.gradle`:

```gradle
android {
    // ... existing config

    defaultConfig {
        // ... existing config

        // Required for background-geolocation
        manifestPlaceholders = [
            appAuthRedirectScheme: 'teboraw'
        ]
    }
}

dependencies {
    // ... existing dependencies

    // Background Geolocation (should be auto-linked)
    implementation project(':react-native-background-geolocation')
}
```

### 3. settings.gradle

Ensure `android/settings.gradle` includes:

```gradle
include ':react-native-background-geolocation'
project(':react-native-background-geolocation').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-background-geolocation/android')
```

### 4. MainApplication.java/kt

For headless task support, add to `MainApplication`:

```java
import com.transistorsoft.locationmanager.adapter.BackgroundGeolocation;

public class MainApplication extends Application implements ReactApplication {
    @Override
    public void onCreate() {
        super.onCreate();
        // ... existing code

        BackgroundGeolocation.getInstance(this);
    }
}
```

## Testing

### iOS Simulator
- Location simulation available in Simulator > Features > Location
- Use "City Run" or "Freeway Drive" for movement testing

### Android Emulator
- Use Extended Controls (three dots) > Location
- Set custom coordinates or use routes

### Physical Devices
- Best for testing background tracking
- Walk around to generate real location data
- Monitor battery usage in device settings

## Troubleshooting

### iOS: Location not updating in background
- Ensure "Always" permission is granted
- Check Background Modes are enabled in Xcode capabilities
- Verify Info.plist has all required keys

### Android: Location stops after app killed
- Ensure RECEIVE_BOOT_COMPLETED permission is granted
- Check battery optimization is disabled for the app
- Verify foreground service notification appears

### Both: No location updates
- Check device location services are enabled
- Ensure permissions were granted (not just requested)
- Check network connectivity for initial GPS lock
