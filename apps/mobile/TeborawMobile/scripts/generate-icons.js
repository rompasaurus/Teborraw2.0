#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Check if sharp is available, if not provide instructions
try {
  require.resolve('sharp');
} catch (e) {
  console.log('Sharp is not installed. Installing temporarily...');
  require('child_process').execSync('npm install sharp --no-save', { stdio: 'inherit' });
}

const sharp = require('sharp');

const SVG_PATH = path.join(__dirname, '..', 'assets', 'icon.svg');

// Android icon sizes (mipmap folders)
const ANDROID_SIZES = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

// iOS icon sizes (actual pixel sizes)
const IOS_SIZES = [
  { name: 'Icon-20@2x.png', size: 40 },
  { name: 'Icon-20@3x.png', size: 60 },
  { name: 'Icon-29@2x.png', size: 58 },
  { name: 'Icon-29@3x.png', size: 87 },
  { name: 'Icon-40@2x.png', size: 80 },
  { name: 'Icon-40@3x.png', size: 120 },
  { name: 'Icon-60@2x.png', size: 120 },
  { name: 'Icon-60@3x.png', size: 180 },
  { name: 'Icon-1024.png', size: 1024 },
];

async function generateAndroidIcons() {
  const androidResPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
  const svgBuffer = fs.readFileSync(SVG_PATH);

  for (const [folder, size] of Object.entries(ANDROID_SIZES)) {
    const outputDir = path.join(androidResPath, folder);

    // Generate square icon
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(outputDir, 'ic_launcher.png'));

    // Generate round icon (same for now, Android handles masking)
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(outputDir, 'ic_launcher_round.png'));

    console.log(`Generated Android icons for ${folder} (${size}x${size})`);
  }
}

async function generateIOSIcons() {
  const iosIconPath = path.join(__dirname, '..', 'ios', 'TeborawMobile', 'Images.xcassets', 'AppIcon.appiconset');
  const svgBuffer = fs.readFileSync(SVG_PATH);

  for (const { name, size } of IOS_SIZES) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(iosIconPath, name));

    console.log(`Generated iOS icon: ${name} (${size}x${size})`);
  }

  // Update Contents.json with the new filenames
  const contentsJson = {
    images: [
      { idiom: 'iphone', scale: '2x', size: '20x20', filename: 'Icon-20@2x.png' },
      { idiom: 'iphone', scale: '3x', size: '20x20', filename: 'Icon-20@3x.png' },
      { idiom: 'iphone', scale: '2x', size: '29x29', filename: 'Icon-29@2x.png' },
      { idiom: 'iphone', scale: '3x', size: '29x29', filename: 'Icon-29@3x.png' },
      { idiom: 'iphone', scale: '2x', size: '40x40', filename: 'Icon-40@2x.png' },
      { idiom: 'iphone', scale: '3x', size: '40x40', filename: 'Icon-40@3x.png' },
      { idiom: 'iphone', scale: '2x', size: '60x60', filename: 'Icon-60@2x.png' },
      { idiom: 'iphone', scale: '3x', size: '60x60', filename: 'Icon-60@3x.png' },
      { idiom: 'ios-marketing', scale: '1x', size: '1024x1024', filename: 'Icon-1024.png' },
    ],
    info: { author: 'xcode', version: 1 },
  };

  fs.writeFileSync(
    path.join(iosIconPath, 'Contents.json'),
    JSON.stringify(contentsJson, null, 2)
  );
  console.log('Updated iOS Contents.json');
}

async function main() {
  console.log('Generating app icons from SVG...\n');

  try {
    await generateAndroidIcons();
    console.log('\nAndroid icons generated successfully!\n');

    await generateIOSIcons();
    console.log('\niOS icons generated successfully!\n');

    console.log('Done! Remember to rebuild the app to see the new icons.');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

main();
