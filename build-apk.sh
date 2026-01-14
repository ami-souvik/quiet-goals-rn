#!/bin/bash

# Navigate to the project directory where the script is located
cd "$(dirname "$0")"

echo "🚀 Starting local Android Release APK build for Quiet Goals..."

# 1. Ensure patches are applied (important for expo-wallpaper-manager)
echo "📦 Applying patches..."
npx patch-package

# 2. Sync native code with app.json configuration
# This ensures Name, Icon, and the Manifest fix are applied
echo "🏗️  Running Expo Prebuild..."
npx expo prebuild --platform android --clean

# 3. Compile the Release APK
echo "🛠️  Compiling Release APK (this may take a few minutes)..."
cd android
./gradlew assembleRelease

if [ $? -eq 0 ]; then
    echo "--------------------------------------------------"
    echo "✅ BUILD SUCCESSFUL"
    echo "--------------------------------------------------"
    echo "📍 Original APK: quiet-goals-rn/android/app/build/outputs/apk/release/app-release.apk"
    
    # Copy to project root for easy access
    cp app/build/outputs/apk/release/app-release.apk ../quiet-goals-release.apk
    echo "📄 Easy Access Copy: quiet-goals-rn/quiet-goals-release.apk"
    echo "--------------------------------------------------"
else
    echo "--------------------------------------------------"
    echo "❌ BUILD FAILED"
    echo "Please check the error logs above."
    echo "--------------------------------------------------"
fi
