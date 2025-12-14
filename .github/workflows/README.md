# GitHub Actions Build Workflows

This directory contains automated build workflows for zmNg across multiple platforms.

## Available Workflows

### Individual Platform Builds

Each platform has its own dedicated workflow that can be triggered manually or on git tags:

- **`build-android.yml`** - Builds Android APK and AAB
- **`build-macos.yml`** - Builds macOS DMG installer
- **`build-linux.yml`** - Builds Linux AppImage and DEB packages
- **`build-windows.yml`** - Builds Windows MSI and NSIS installers

### Combined Build Workflow

- **`build-all.yml`** - Build multiple platforms in parallel (configurable)

## How to Trigger Builds

### Manual Trigger (Workflow Dispatch)

1. Go to **Actions** tab in GitHub
2. Select the workflow you want to run
3. Click **Run workflow**
4. Enter the version number (e.g., `1.0.0`)
5. For `build-all.yml`, optionally specify platforms (default: all)

### Automatic Trigger (Git Tags)

Push a version tag to automatically trigger builds:

```bash
git tag v1.0.0
git push origin v1.0.0
```

This will:
- Trigger all individual platform workflows
- Create a GitHub Release with build artifacts attached

## Build Artifacts

After a successful build, artifacts are available for download:

### Android
- `app-release.apk` - APK for sideloading
- `app-release.aab` - App Bundle for Google Play Store

### macOS
- `zmNg.dmg` - DMG installer
- `zmNg.app` - Application bundle

### Linux
- `zmNg.AppImage` - Universal AppImage
- `zmNg.deb` - Debian package

### Windows
- `zmNg.msi` - MSI installer
- `zmNg.exe` - NSIS installer (if configured)

## Build Requirements

### Android
- No additional secrets required
- Uses unsigned debug builds by default
- For signed releases, configure signing in `app/android/app/build.gradle`

### Desktop Platforms (macOS, Linux, Windows)
- Uses Tauri for desktop builds
- Optional code signing via secrets:
  - `TAURI_SIGNING_PRIVATE_KEY`
  - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

## Firebase Configuration

**Important**: Ensure `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) are properly configured in your repository for push notifications to work.

See `ANDROID_BUILD.md` for Firebase setup instructions.

## Customization

### Changing Build Settings

- **Android**: Edit `app/android/app/build.gradle`
- **Desktop**: Edit `app/src-tauri/tauri.conf.json`

### Adding Code Signing

For production releases, you should configure code signing:

**Android**: Add signing configuration to gradle
**macOS**: Set up Apple Developer certificates
**Windows**: Configure code signing certificate

See Tauri documentation for details: https://tauri.app/v1/guides/distribution/sign-your-application

## Troubleshooting

### Build Fails

Check the Actions tab for detailed error logs. Common issues:

- **Missing dependencies**: Check Node.js/Rust versions
- **Build errors**: Ensure local builds work first
- **Artifact upload fails**: Check file paths match your build output

### Android Build Issues

- Ensure `google-services.json` exists at `app/android/app/google-services.json`
- Verify Java 17 is being used
- Check Gradle version compatibility

### Desktop Build Issues

- Ensure Rust toolchain is properly installed
- Check Tauri configuration in `tauri.conf.json`
- Verify all platform-specific dependencies are installed

## Local Testing

Before pushing, test builds locally:

```bash
# Android
cd app
npm run android:release

# Desktop (macOS/Linux/Windows)
cd app
npm run tauri:build
```

## More Information

- [Capacitor Android Documentation](https://capacitorjs.com/docs/android)
- [Tauri Build Documentation](https://tauri.app/v1/guides/building/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
