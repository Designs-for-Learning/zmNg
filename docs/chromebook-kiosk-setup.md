# Chromebook Kiosk Deployment Guide

Deploy zmNinjaNG as a full-screen kiosk app on managed Chromebooks via Google Admin Console.

## Prerequisites

- Google Workspace with Chrome Enterprise management
- Enterprise-enrolled Chromebook(s)
- ZoneMinder server accessible over HTTPS from the Chromebook network
- CORS configured on the ZoneMinder server (see [CORS Setup](#cors-setup))

## Google Admin Setup

### 1. Add the Kiosk App

1. Go to [Google Admin Console](https://admin.google.com)
2. Navigate to **Devices > Chrome > Apps & Extensions > Kiosks**
3. Select the organizational unit (OU) containing your kiosk Chromebooks
4. Click **+** > **Add by URL**
5. Enter the app URL:
   ```
   https://designs-for-learning.github.io/zmNg/app/
   ```

### 2. Add the Companion Extension (Optional)

The companion extension relays managed configuration via `chrome.storage.managed` as a fallback for environments where `navigator.managed` is not available.

1. In the kiosk app settings, add a companion extension by URL:
   ```
   https://designs-for-learning.github.io/zmNg/extension/updates.xml
   ```

### 3. Configure Managed Configuration

On the kiosk app URL entry, find the **Managed configuration** field and enter your JSON config.

#### Minimal Configuration

```json
{
  "serverUrl": "https://your-zm-server.com",
  "username": "kiosk-viewer",
  "password": "your-password",
  "defaultPage": "/montage"
}
```

#### Full Configuration

```json
{
  "serverUrl": "https://your-zm-server.com",
  "username": "kiosk-viewer",
  "password": "your-password",
  "profileName": "Lobby Cameras",
  "defaultPage": "/montage",
  "kioskMode": true,
  "kioskPin": "1234",
  "kioskNavigationLock": true,
  "hideNavigation": true,
  "montageGridRows": 2,
  "montageGridCols": 3,
  "montageFeedFit": "cover",
  "montageShowToolbar": false,
  "montageIsFullscreen": true,
  "viewMode": "streaming",
  "streamingMethod": "auto",
  "streamMaxFps": 15,
  "streamScale": 50,
  "snapshotRefreshInterval": 3,
  "selectedGroupId": "2",
  "insomnia": true,
  "allowSelfSignedCerts": false
}
```

### 4. Assign Kiosk to Chromebooks

1. Go to **Devices > Chrome > Settings > Device settings**
2. Select the OU for your kiosk devices
3. Under **Kiosk Settings**, set the kiosk app to auto-launch
4. Save and reboot the Chromebooks

## Configuration Reference

### Connection

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `serverUrl` | string | Yes | Base URL of the ZoneMinder server (e.g. `https://zm.example.com`) |
| `username` | string | No | ZoneMinder login username |
| `password` | string | No | ZoneMinder login password |
| `profileName` | string | No | Display name for the profile (default: `Managed Profile`) |
| `allowSelfSignedCerts` | boolean | No | Accept self-signed HTTPS certificates |

### Kiosk Behavior

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `defaultPage` | string | — | Page on startup: `/montage`, `/monitors`, `/events`, `/dashboard`, `/timeline` |
| `kioskMode` | boolean | — | Lock the app into kiosk mode on startup |
| `kioskPin` | string | — | PIN to unlock kiosk mode (4-8 digits) |
| `kioskNavigationLock` | boolean | — | Restrict navigation to default page only when locked |
| `hideNavigation` | boolean | — | Hide sidebar and mobile header for a clean display |

### Montage Layout

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `montageGridRows` | integer | 2 | Grid rows (1-10) |
| `montageGridCols` | integer | 2 | Grid columns (1-10) |
| `montageFeedFit` | string | `cover` | Feed fit: `contain`, `cover`, `fill`, `none`, `scale-down` |
| `montageShowToolbar` | boolean | true | Show the montage toolbar |
| `montageIsFullscreen` | boolean | false | Start in fullscreen mode |

### Streaming

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `viewMode` | string | `snapshot` | `snapshot` (periodic images) or `streaming` (live video) |
| `streamingMethod` | string | `auto` | `auto` (WebRTC/MSE/HLS) or `mjpeg` |
| `snapshotRefreshInterval` | integer | 3 | Seconds between snapshot refreshes (1-60) |
| `streamMaxFps` | integer | 10 | Max FPS for live streams (1-30) |
| `streamScale` | integer | 50 | Stream scale percentage (1-100) |

### Display

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `selectedGroupId` | string | — | Only show monitors from this ZM group ID |
| `insomnia` | boolean | false | Keep screen awake |

## CORS Setup

The ZoneMinder server must allow cross-origin requests from GitHub Pages. Add the following to your Apache config (typically `/etc/apache2/conf-enabled/zoneminder.conf`):

In the `<Directory "/usr/share/zoneminder/www/api/app/webroot">` block, add these lines **before** the existing rewrite rules:

```apache
Header always set Access-Control-Allow-Origin "https://designs-for-learning.github.io"
Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
Header always set Access-Control-Allow-Headers "Content-Type, Authorization, Skip-Auth"
Header always set Access-Control-Allow-Credentials "true"
RewriteEngine On
RewriteCond %{REQUEST_METHOD} OPTIONS
RewriteRule ^ - [R=200,L]
```

Then enable the required modules and restart Apache:

```bash
sudo a2enmod headers rewrite
sudo systemctl restart apache2
```

## How It Works

1. **Chrome OS boots** into kiosk mode and opens the app URL
2. **The app reads** the managed configuration via `navigator.managed.getManagedConfiguration()`
3. **A profile is auto-created** with the server URL and credentials
4. **Settings are applied** (default page, montage layout, streaming, kiosk lock)
5. **The app navigates** to the configured default page (e.g. montage)
6. **On subsequent boots**, the profile is reused and settings are re-applied from managed config

Configuration changes in Google Admin take effect after the Chromebook syncs policy (typically on reboot or within a few hours).

## Troubleshooting

### App shows profile creation screen instead of auto-configuring
- Verify the managed configuration JSON is valid in Google Admin
- Reboot the Chromebook to force a policy sync
- Check that the kiosk app URL is exactly `https://designs-for-learning.github.io/zmNg/app/`

### "Cannot find ZoneMinder API" error
- Verify the ZM server is accessible over HTTPS from the Chromebook
- Check CORS headers are configured (see [CORS Setup](#cors-setup))
- Ensure the `serverUrl` does not include `/zm` — just the base URL

### Montage settings not applying
- Settings are applied on every boot from managed config
- After changing config in Google Admin, reboot the Chromebook
- Verify key names match exactly (case-sensitive)

### Invalid username or password
- Verify credentials work by logging into ZoneMinder's web UI directly
- Check the username and password in the managed config JSON
