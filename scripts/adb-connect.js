#!/usr/bin/env node
/**
 * adb-connect.js
 * Helper script to connect to an Android device over Wi-Fi.
 *
 * Usage:
 *   npm run adb:connect                        (prompts for IP:PORT)
 *   npm run adb:connect -- 192.168.18.44:35181 (direct connect)
 *   npm run adb:devices                        (list devices)
 *   npm run adb:reverse                        (reverse Metro port on all devices)
 *   node scripts/adb-connect.js 192.168.18.44:35181
 */

const { spawnSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');
const readline = require('readline');

// ── Resolve ADB path ─────────────────────────────────────────────────────────
function getAdbPath() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(os.homedir(), 'AppData', 'Local', 'Android', 'Sdk'),
    'C:\\Android\\Sdk',
  ].filter(Boolean).map(p => path.join(p, 'platform-tools', 'adb.exe'));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  // Fallback: let the OS find it
  return 'adb';
}

const ADB = getAdbPath();

// ── Run ADB command ───────────────────────────────────────────────────────────
function adb(...args) {
  console.log(`\n> ${ADB} ${args.join(' ')}`);
  const result = spawnSync(ADB, args, { stdio: 'inherit', shell: false });
  return result.status === 0;
}

// ── Run ADB with output capture ───────────────────────────────────────────────
function adbOutput(...args) {
  const result = spawnSync(ADB, args, { encoding: 'utf8', shell: false });
  return result.stdout || '';
}

// ── Get list of connected devices ─────────────────────────────────────────────
function getDevices() {
  const output = adbOutput('devices');
  const lines = output.split('\n').slice(1);
  return lines
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('*') && l.includes('\tdevice'))
    .map(l => l.split(/\s+/)[0]);
}

// ── Connect logic ─────────────────────────────────────────────────────────────
async function connectToDevice(target) {
  console.log('\n📱  Shop360 – ADB Wireless Connect');
  console.log('──────────────────────────────────');
  console.log(`ADB path: ${ADB}\n`);

  // Show currently connected devices
  adb('devices');

  // Parse IP and port
  const [ip, port] = target.split(':');
  if (!ip || !port) {
    console.error('\n❌  Invalid format. Expected IP:PORT  (e.g. 192.168.18.44:35181)');
    process.exit(1);
  }

  console.log(`\n🔌  Connecting to ${ip}:${port} …`);
  const connected = adb('connect', `${ip}:${port}`);

  if (!connected) {
    console.error('\n❌  Connection failed.');
    printTroubleshooting(ip, port);
    process.exit(1);
  }

  console.log('\n✅  Connected! Setting up Metro port reverse …');
  reverseMetroPort();

  console.log('\n🎉  Done! You can now press "a" in the Metro terminal to launch the app.');
}

// ── Reverse Metro port on all connected devices ───────────────────────────────
function reverseMetroPort() {
  const devices = getDevices();

  if (devices.length === 0) {
    console.error('❌  No devices connected. Connect a device first.');
    return;
  }

  console.log(`\n🔄  Reversing Metro port 8081 on ${devices.length} device(s)…`);
  for (const serial of devices) {
    console.log(`\n  → Device: ${serial}`);
    const result = spawnSync(ADB, ['-s', serial, 'reverse', 'tcp:8081', 'tcp:8081'], {
      stdio: 'inherit',
      shell: false,
    });
    if (result.status === 0) {
      console.log(`  ✅  Done for ${serial}`);
    } else {
      console.error(`  ❌  Failed for ${serial}`);
    }
  }
}

// ── Troubleshooting guide ─────────────────────────────────────────────────────
function printTroubleshooting(ip, port) {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║              ADB Connection Troubleshooting                  ║
╠══════════════════════════════════════════════════════════════╣
║  Most common causes for "failed to connect":                 ║
║                                                              ║
║  1. WRONG PORT  ← most likely!                               ║
║     Android 11+ Wireless Debugging uses a RANDOM port        ║
║     that changes each session.                               ║
║     → Settings › Developer Options › Wireless debugging      ║
║       Read the exact IP:PORT shown on screen.                ║
║                                                              ║
║  2. NOT PAIRED YET (Android 11+)                             ║
║     You must pair once before connecting:                     ║
║     → Tap "Pair device with pairing code" in Wireless        ║
║       debugging, then run:                                    ║
║       adb pair <IP>:<PAIR_PORT>                              ║
║       and enter the 6-digit code shown.                       ║
║                                                              ║
║  3. FIREWALL / SAME NETWORK                                  ║
║     • PC and phone must be on the same Wi-Fi network.        ║
║     • Windows Firewall may block ADB                         ║
║       Allow "adb.exe" through Windows Defender Firewall.     ║
║                                                              ║
║  4. ADB SERVER STALE                                         ║
║     Try killing and restarting the ADB server:               ║
║     node scripts/adb-connect.js --kill-server                ║
╚══════════════════════════════════════════════════════════════╝
`);
}

// ── Entry point ───────────────────────────────────────────────────────────────
const arg = process.argv[2];

if (arg === '--devices') {
  console.log('\n📋  Connected ADB devices:\n');
  adb('devices', '-l');
} else if (arg === '--reverse') {
  reverseMetroPort();
} else if (arg === '--kill-server') {
  adb('kill-server');
  adb('start-server');
} else if (arg && !arg.startsWith('--')) {
  connectToDevice(arg);
} else {
  // Interactive prompt
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('\nEnter device IP:PORT (e.g. 192.168.18.44:35181): ', (answer) => {
    rl.close();
    connectToDevice(answer.trim());
  });
}
