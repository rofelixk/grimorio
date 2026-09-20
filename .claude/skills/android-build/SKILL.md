---
name: android-build
description: Build the Grimorio Android app (Capacitor) — sync web build into android/, produce a debug .apk from the CLI, or open the project in Android Studio.
---

Requires Android Studio installed locally (bundles the JDK, Android SDK, and Gradle needed below) — see https://developer.android.com/studio. A CLI build (`gradlew`, outside Android Studio) needs `JAVA_HOME` and the Android SDK path (`ANDROID_HOME`/`local.properties`) exported in the shell first — check both before running `gradlew` and stop with what's missing rather than letting the build fail deep in Gradle's own error output.

```bash
npm run cap:build   # ng build, then `cap sync android` (copies dist/grimorio/browser into android/)
npm run cap:sync    # `cap sync android` only, without rebuilding the web app first
npm run cap:open    # opens the android/ project in Android Studio
```

To produce an installable `.apk` from the CLI instead of Android Studio:

```bash
cd android && ./gradlew assembleDebug   # Windows: gradlew.bat assembleDebug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`. Debug builds are self-signed automatically, so this can be sideloaded directly — copy it to the phone and open it (Files app or a browser download); Android will prompt to allow "install unknown apps" for that one source. This does **not** require enabling Developer Mode/USB debugging, which is a separate, unrelated setting.
