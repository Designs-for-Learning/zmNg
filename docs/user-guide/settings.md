# Settings

Settings are stored per profile. Each ZoneMinder server profile has its own independent settings.

## Appearance

| Setting | Description |
|---------|-------------|
| **Language** | Interface language (English, German, Spanish, French, Chinese) |
| **Theme** | Light, Cream, Dark, Slate, Amber, or System (follows system setting by default) |
| **Date format** | How dates are displayed throughout the app |
| **Time format** | 12-hour or 24-hour clock |

## Bandwidth Settings

Control how frequently the app fetches data from your server. Useful for mobile data or slow connections.

| Mode | Description |
|------|-------------|
| **Normal** | Standard refresh intervals (10–30s depending on the data type) |
| **Low** | Reduced refresh rates (2x slower) and lower image quality |

Low bandwidth mode affects:

- Monitor snapshot refresh rate
- Dashboard widget refresh intervals
- Event list polling
- Timeline/heatmap data loading
- Image quality and scale

:::{tip}
Switch to **Low bandwidth mode** when on mobile data or a slow connection. You can switch back to Normal when on WiFi.
:::

## Live Streaming

Settings that control live camera feeds in the Monitor Detail view:

| Setting | Description |
|---------|-------------|
| **Streaming protocol** | WebRTC (lowest latency), MSE, or HLS — tried in order if go2rtc is configured |
| **Snapshot interval** | How often to refresh snapshot images |

## Playback

Settings that affect event video playback:

| Setting | Description |
|---------|-------------|
| **Dashboard refresh interval** | How often the dashboard widgets reload data (5–300 seconds) |

## Notification Settings

Configure how zmNinjaNG handles event notifications. See {doc}`notifications` for details.

## Advanced

### Connection

| Setting | Description |
|---------|-------------|
| **Allow self-signed certificates** | Enable when your ZoneMinder server uses a self-signed HTTPS certificate (iOS/Android only) |

### Log Redaction

Redact sensitive values (URLs, credentials) from logs. Disable only when sharing logs for troubleshooting.

### Kiosk PIN

Manage the PIN used to lock and unlock kiosk mode. See {doc}`kiosk` for full details on kiosk mode.

| Action | Description |
|--------|-------------|
| **Set PIN** | Appears when no PIN is stored. Sets a new 4-digit PIN. |
| **Change PIN** | Requires verifying your current PIN or biometrics before setting a new one. |
| **Clear PIN** | Removes the PIN. Requires verifying the current PIN or biometrics first. |

## Server Information

The Server screen (accessible from the sidebar) shows information about the connected ZoneMinder server:

- Server version
- API version
- Daemon status

## Resetting Settings

Settings can be reset to defaults from the Settings screen. This affects only the current profile's settings, not your connection details or other profiles.
