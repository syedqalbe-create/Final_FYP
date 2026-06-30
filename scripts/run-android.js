#!/usr/bin/env node
/**
 * run-android.js
 * Wrapper for `react-native run-android` that ensures:
 *  - adb is in PATH (Android SDK platform-tools)
 *  - JAVA_HOME is set (uses Android Studio bundled JBR if not set)
 * This fixes both "'adb' is not recognized" and "JAVA_HOME is not set"
 * errors on Windows when the SDK/JDK are installed but not on system PATH.
 */

const { spawnSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

// ── Resolve Android SDK platform-tools ────────────────────────────────────────
function getPlatformToolsPath() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(os.homedir(), 'AppData', 'Local', 'Android', 'Sdk'),
    'C:\\Android\\Sdk',
  ].filter(Boolean).map(p => path.join(p, 'platform-tools'));

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'adb.exe'))) {
      console.log(`✅  Found adb at: ${path.join(candidate, 'adb.exe')}`);
      return candidate;
    }
  }
  return null;
}

// ── Resolve JAVA_HOME ─────────────────────────────────────────────────────────
function getJavaHome() {
  // 1. Already set in environment — use it
  if (process.env.JAVA_HOME && fs.existsSync(path.join(process.env.JAVA_HOME, 'bin', 'java.exe'))) {
    console.log(`✅  JAVA_HOME already set: ${process.env.JAVA_HOME}`);
    return process.env.JAVA_HOME;
  }

  const javaHomeCandidates = [
    // Android Studio bundled JBR (most common on dev machines)
    'C:\\Program Files\\Android\\Android Studio\\jbr',
    'C:\\Program Files\\Android\\Android Studio\\jre',
    // Standalone JDK installs
    'C:\\Program Files\\Eclipse Adoptium',
    'C:\\Program Files\\Microsoft',
    'C:\\Program Files\\Java',
  ];

  for (const base of javaHomeCandidates) {
    if (!fs.existsSync(base)) continue;

    // Check if this IS directly the JDK (has bin/java.exe)
    const directJava = path.join(base, 'bin', 'java.exe');
    if (fs.existsSync(directJava)) {
      console.log(`✅  Found Java at: ${base}`);
      return base;
    }

    // Otherwise scan subdirectories (e.g. "jdk-17.0.x" inside Program Files\Java)
    try {
      const entries = fs.readdirSync(base, { withFileTypes: true });
      const jdkDirs = entries
        .filter(e => e.isDirectory() && /jdk/i.test(e.name))
        .sort((a, b) => b.name.localeCompare(a.name)); // pick newest first

      for (const dir of jdkDirs) {
        const javaExe = path.join(base, dir.name, 'bin', 'java.exe');
        if (fs.existsSync(javaExe)) {
          const javaHome = path.join(base, dir.name);
          console.log(`✅  Found Java at: ${javaHome}`);
          return javaHome;
        }
      }
    } catch (_) { /* skip unreadable dirs */ }
  }

  return null;
}

// ── Get connected device serial ───────────────────────────────────────────────
function getConnectedDevice(platformToolsPath) {
  const result = spawnSync(path.join(platformToolsPath, 'adb.exe'), ['devices'], {
    encoding: 'utf8',
    shell: false,
  });

  if (result.status !== 0) return null;

  const lines = result.stdout.split('\n').slice(1);
  const devices = lines
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('*') && l.includes('\tdevice'));

  if (devices.length === 0) return null;

  // Prefer wireless (IP-based) device over mDNS entries
  const wireless = devices.find(d => /^\d+\.\d+\.\d+\.\d+:\d+\s+device/.test(d));
  const chosen = wireless || devices[0];
  return chosen.split(/\s+/)[0];
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('\n🔧  Shop360 – Android Build Setup\n');

const platformToolsPath = getPlatformToolsPath();
if (!platformToolsPath) {
  console.error('❌  Could not find Android SDK platform-tools.');
  console.error('    Please install Android Studio or set ANDROID_HOME.');
  process.exit(1);
}

const javaHome = getJavaHome();
if (!javaHome) {
  console.error('❌  Could not find a Java installation.');
  console.error('    Please install Android Studio (includes bundled JDK)');
  console.error('    or set JAVA_HOME to your JDK directory.');
  process.exit(1);
}

console.log(`ℹ️   JAVA_HOME  = ${javaHome}`);
console.log(`ℹ️   ADB        = ${path.join(platformToolsPath, 'adb.exe')}`);

// Build the env with both platform-tools and JDK injected into PATH
const env = {
  ...process.env,
  JAVA_HOME: javaHome,
  PATH: [
    platformToolsPath,
    path.join(javaHome, 'bin'),
    process.env.PATH || '',
  ].join(';'),
};

// Set ANDROID_HOME if not already set
if (!env.ANDROID_HOME && !env.ANDROID_SDK_ROOT) {
  env.ANDROID_HOME = path.dirname(platformToolsPath);
  console.log(`ℹ️   ANDROID_HOME = ${env.ANDROID_HOME}`);
}

// Get connected device and target it
const deviceId = getConnectedDevice(platformToolsPath);
const extraArgs = process.argv.slice(2);

let rnArgs = ['run-android', ...extraArgs];
if (deviceId && !extraArgs.some(a => a.includes('--deviceId') || a.includes('--device'))) {
  rnArgs = ['run-android', `--deviceId=${deviceId}`, ...extraArgs];
  console.log(`📱  Targeting device: ${deviceId}`);
}

console.log(`\n🚀  Running: react-native ${rnArgs.join(' ')}\n`);

const result = spawnSync('react-native', rnArgs, {
  stdio: 'inherit',
  shell: true,
  env,
});

process.exit(result.status ?? 1);
