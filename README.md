# 🕌 Salat Times — Prayer Times PWA

A single-file Islamic prayer times web app with micro:bit V2 Adhan Lantern support.

**Zero build tools. Zero dependencies. One HTML file. Works offline.**

![Screenshot](https://img.shields.io/badge/version-1.0-blue) ![License](https://img.shields.io/badge/license-MIT-green) ![PWA](https://img.shields.io/badge/PWA-ready-blueviolet)

---

## ✨ Features

### Prayer Times
- Dual computation engines: **PrayTimes.js v2.3** + **Adhan.js v4.4.3**
- 8 calculation methods: France 12°/12°, MWL, ISNA, Egypt, Makkah, Karachi, Tehran, Jafari + Custom angles
- Asr schools: Shafi'i/Maliki (Standard) or Hanafi
- 12h / 24h time format
- Engine comparison mode (side-by-side PrayTimes vs Adhan)
- Hijri + Gregorian date display

### Countdown
- Live countdown to next prayer (updates every second)
- Prayer icon + name display
- Auto-advances through the day

### Mosque Sync
- Per-prayer ±30 minute offset to match your local mosque
- Mawaqit direct link integration
- Settings persist in localStorage

### Map & Qibla
- Collapsible Leaflet map (hidden by default)
- GPS geolocation
- City search with autocomplete (Nominatim)
- Qibla direction + distance to Makkah
- Nearby mosques via Overpass API with failover mirrors
- XSS-safe mosque name rendering

### Themes
| Theme | Style |
|---|---|
| 🌙 Najm (Star) | Deep space blue with geometric stars |
| 🕌 Andalusia | Warm golden arches pattern |
| 📜 Khat (Calligraphy) | Light parchment with arabesque motifs |

### Languages
- 🇬🇧 English
- 🇫🇷 Français
- 🇸🇦 العربية (full RTL support)

SVG flag buttons — works on all platforms including Windows.

### 🏮 Adhan Lantern (micro:bit V2)
BLE UART connection to a BBC micro:bit V2 inside a decorative lantern.

| State | LEDs | Speaker |
|---|---|---|
| Idle | Center pixel breathing | Silent |
| Warning (< 5 min) | Expanding ring waves | Soft tick |
| Adhan (prayer time) | Islamic star burst ×3 | Adhan melody |
| Post-adhan | Warm full glow | Iqama beeps |
| Night (Isha→Fajr) | Faint single LED pulse | Silent |

**Buttons:** A = next prayer, B = countdown, Touch logo = cycle all times

### PWA
- Installable on Android/iOS home screen
- Service worker with offline caching
- Custom icons (180px, 512px, maskable)
- Clear cache button in settings

---

## 📁 Project Structure

```
salat-times/
├── index.html          # Complete app (single file, ~1280 lines)
├── manifest.json       # PWA manifest
├── sw.js               # Service worker (offline cache)
├── adhan-lantern.ts    # micro:bit V2 MakeCode firmware
├── favicon.ico         # Browser tab icon
├── plug-icon.svg       # SVG favicon
├── apple-touch-icon.png    # iOS icon (180×180)
├── icon-512.png        # Android/PWA icon (512×512)
├── icon-512-bg.png     # Maskable PWA icon (512×512)
└── README.md
```

---

## 🚀 Quick Start

### Web App
1. Clone: `git clone https://github.com/abourdim/salat-times.git`
2. Open `index.html` in Chrome/Edge, or deploy to any static host
3. Grant location access for accurate times (optional — defaults to Chelles, FR)

Or visit: **https://abourdim.github.io/salat-times/**

### Adhan Lantern (micro:bit V2)
1. Go to [makecode.microbit.org](https://makecode.microbit.org)
2. Create new project → add **Bluetooth** extension
3. Switch to **TypeScript** editor
4. Paste contents of `adhan-lantern.ts`
5. Project Settings → **No Pairing Required** = ON
6. Download → drag `.hex` to MICROBIT drive
7. Open the web app in Chrome → click **🏮 Connect Lantern**

---

## ⚙️ Settings

All settings persist in `localStorage` under key `salat2`.

| Setting | Options |
|---|---|
| Theme | Najm / Andalusia / Khat |
| Mode | Standard / Kids |
| Language | EN / FR / AR |
| Engine | PrayTimes / Adhan / Both |
| Method | France / MWL / ISNA / Egypt / Makkah / Karachi / Tehran / Jafari / Custom |
| Asr | Shafi'i-Maliki / Hanafi |
| Format | 24h / 12h AM/PM |
| Offsets | ±30 min per prayer |
| Mawaqit | Mosque slug for direct link |

---

## 📡 BLE Protocol

Communication between the web app and micro:bit V2 via Nordic UART Service.

### App → micro:bit

| Command | Example | Description |
|---|---|---|
| `HELLO` | `HELLO` | Handshake after connect |
| `TIMES:` | `TIMES:F06:43\|S07:53\|D13:03\|A15:45\|M18:15\|I19:24\|N=A\|T=84` | Full sync |
| `ALERT:` | `ALERT:A` | Prayer time reached — trigger adhan |

**Prayer codes:** F=Fajr, S=Sunrise, D=Dhuhr, A=Asr, M=Maghrib, I=Isha

### micro:bit → App

| Response | Description |
|---|---|
| `READY` | Firmware acknowledged HELLO |
| `BTN:A` | Button A pressed (future) |
| `BTN:B` | Button B pressed (future) |
| `TOUCH` | Logo touched (future) |

### Technical Details
- Service UUID: `6e400001-b5a3-f393-e0a9-e50e24dcca9e`
- Write (RX): `6e400002-...`
- Notify (TX): `6e400003-...`
- MTU: 20 bytes with sequential write queue
- Auto-reconnect: 3 attempts, 2s delay
- Sync interval: 60 seconds

---

## 🛡️ Hardening

- `initMap()` wrapped in try/catch — app works fully without Leaflet
- `typeof L==='undefined'` guard on all map operations
- `if(!map)return` guards on Qibla/Mosque functions
- Mosque loading debounce flag
- Overpass API mirror failover (`overpass-api.de` → `overpass.kumi.systems`)
- `response.ok` checks on all fetches
- HTML sanitization: `esc()` function for all user-generated content
- Adhan.js error suppressed after first warning (no console spam)
- BLE write queue prevents GATT operation collisions

---

## 🔧 Built With

| Library | Version | Purpose |
|---|---|---|
| [PrayTimes.js](https://praytimes.org) | 2.3 | Prayer time computation |
| [Adhan.js](https://github.com/batoulapps/adhan-js) | 4.4.3 | Alternative prayer engine |
| [Leaflet](https://leafletjs.com) | 1.9.4 | Interactive map |
| [Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API) | — | BLE UART to micro:bit |
| [MakeCode](https://makecode.microbit.org) | — | micro:bit firmware |

---

## 📄 License

MIT — free for personal and educational use.

Prayer time algorithms by Hamid Zarrabi-Zadeh (PrayTimes.org).

---

<p align="center">
  <strong>Workshop DIY</strong><br>
  <a href="https://github.com/abourdim">github.com/abourdim</a>
</p>
