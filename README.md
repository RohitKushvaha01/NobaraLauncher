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

A Kotlin native module (`AppsModule`) queries the Android `PackageManager` for all launcher apps and caches their icons as PNGs. The React Native UI renders a home screen with a date widget and a dock. Swiping up opens a spring-animated app drawer that displays all apps in a scrollable grid. Tapping an app launches it via an Android intent.

## Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

## License

This project is licensed under the [MIT License](LICENSE).
