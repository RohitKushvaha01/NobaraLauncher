<p align="center">
  <img src="play_store_512.png" width="128" height="128" alt="Nobara Launcher icon" />
</p>

<h1 align="center">Nobara Launcher</h1>

<p align="center">
  A minimal, gesture-driven Android home screen launcher built with React Native.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Android-3ddc84?logo=android&logoColor=white" alt="Android" />
  <img src="https://img.shields.io/badge/React%20Native-0.85-61dafb?logo=react&logoColor=white" alt="React Native" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white" alt="TypeScript" />
</p>

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | [React Native](https://reactnative.dev) 0.85 + TypeScript |
| Animations | React Native `Animated` API with spring physics |
| Gestures | `PanResponder` for swipe detection and sheet dragging |
| Native Bridge | Custom Kotlin module (`AppsModule`) via React Native's `NativeModules` |
| Safe Areas | [`react-native-safe-area-context`](https://github.com/th3rdwave/react-native-safe-area-context) |
| Build | Gradle + Metro bundler |

## Prerequisites

- **Node.js** >= 22.11.0
- **npm** (comes with Node.js)
- **Android Studio** with Android SDK configured
- **Java Development Kit (JDK)** 17+
- A physical Android device or Android emulator

> Make sure you have completed the [React Native environment setup](https://reactnative.dev/docs/set-up-your-environment) before proceeding.

## Getting Started

### 1. Clone the repository

```sh
git clone https://github.com/RohitKushvaha01/NobaraLauncher.git
cd NobaraLauncher
```

### 2. Install dependencies

```sh
npm install
```

### 3. Start the Metro bundler

```sh
npm start
```

### 4. Build and run on Android

In a separate terminal:

```sh
npm run dev
```

This builds and installs the debug APK on a connected device or running emulator.

### 5. Set as default launcher

Once installed, press the Home button on your device. Android will prompt you to choose a default launcher — select **NobaraLauncher**.

## Build for Release

Generate a release bundle:

```sh
npm run build:bundle
```

Build a release APK:

```sh
npm run build:apk
```

The output APK will be located at `android/app/build/outputs/apk/release/`.

## Project Structure

```
NobaraLauncher/
├── src/
│   ├── App.tsx              # Root component (SafeAreaProvider, StatusBar, back handler)
│   └── AppContent.tsx       # Main launcher UI (home screen, dock, app drawer)
├── android/
│   └── app/src/main/java/com/nobaralauncher/
│       ├── AppsModule.kt    # Native module: queries installed apps & launches them
│       ├── AppsPackage.kt   # React Native package registration
│       ├── MainActivity.kt  # Main activity entry point
│       └── MainApplication.kt
├── index.js                 # React Native entry point
├── app.json                 # App configuration
├── package.json
└── tsconfig.json
```

## How It Works

1. **App Discovery** — On launch, the `AppsModule` Kotlin native module queries the Android `PackageManager` for all apps with a `CATEGORY_LAUNCHER` intent, extracts their names, package names, and icons.
2. **Icon Caching** — Each app's icon drawable is converted to a bitmap and saved as a PNG in the app's cache directory. Subsequent loads read directly from cache.
3. **Home Screen** — The main screen displays a date widget and a dock with quick-launch icons. The entire screen responds to upward swipe gestures.
4. **App Drawer** — Swiping up triggers a spring-animated bottom sheet that slides over the home screen. The sheet contains a search bar placeholder and a scrollable grid of all installed apps.
5. **App Launch** — Tapping an app icon calls `AppsModule.launchApp()`, which resolves the launch intent and starts the activity.

## Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

## License

This project is open source. See the repository for license details.
