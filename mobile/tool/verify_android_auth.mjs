// Exercises the installed Android app against the real local backend.
// Requires a running emulator and the debug APK. Never embeds credentials in APKs.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
if (existsSync(join(root, '.env'))) loadEnvFile(join(root, '.env'));
const adb = process.env.ADB_PATH ||
  join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk', 'platform-tools', 'adb.exe');
const serial = process.env.ANDROID_SERIAL || 'emulator-5554';
const packageName = 'com.example.smart_cmms_mobile';
const apk = join(root, 'mobile/build/app/outputs/flutter-apk/app-debug.apk');
const output = join(root, 'mobile/build/verification');
const checks = [];

function command(args, { binary = false, label = args[0] } = {}) {
  const result = spawnSync(adb, ['-s', serial, ...args], {
    encoding: binary ? undefined : 'utf8', timeout: args[0] === 'install' ? 180000 : 45000,
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
  });
  // Do not include command arguments or output in errors: input may contain a password.
  if (result.error || result.status !== 0) {
    throw new Error(`Android operation failed: ${label} (${result.error?.code || result.status})`);
  }
  return result.stdout;
}

function shell(...args) { return command(['shell', ...args], { label: args[0] }); }
function record(name) { checks.push(name); console.log(`PASS: ${name}`); }
function nodes(xml) {
  return [...xml.matchAll(/<node\b[^>]*>/g)].map(([element]) =>
    Object.fromEntries([...element.matchAll(/([\w-]+)="([^"]*)"/g)]
      .map(([, key, value]) => [key, value])));
}
function tap(node) {
  assert.ok(node, 'Expected control was not found.');
  const bounds = node.bounds?.match(/^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$/);
  assert.ok(bounds, 'Expected control has no usable bounds.');
  const [, x1, y1, x2, y2] = bounds.map(Number);
  shell('input', 'tap', String(Math.floor((x1 + x2) / 2)), String(Math.floor((y1 + y2) / 2)));
}
async function screen() {
  for (let attempt = 0; attempt < 3; attempt++) {
    shell('rm', '-f', '/sdcard/smart_cmms_auth_verification.xml');
    const result = shell('uiautomator', 'dump', '/sdcard/smart_cmms_auth_verification.xml');
    if (result.includes('dumped')) {
      return shell('cat', '/sdcard/smart_cmms_auth_verification.xml');
    }
    await delay(1000);
  }
  // Android may not expose a root node while a cold Flutter process renders its first frame.
  // Let waitFor retry this transient condition instead of failing the entire scenario.
  return '';
}
async function waitFor(predicate, message) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const xml = await screen();
    if (predicate(xml)) return xml;
    await delay(1000);
  }
  throw new Error(message);
}
async function openApp() {
  shell('am', 'force-stop', packageName);
  shell('am', 'start', '-W', '-n', `${packageName}/.MainActivity`);
  await delay(1500);
}
function screenshot(name) {
  writeFileSync(join(output, name), command(['exec-out', 'screencap', '-p'], { binary: true }));
}
async function submit(username, password) {
  const xml = await waitFor((value) => value.includes('ĐĂNG NHẬP'), 'Login form did not appear.');
  const fields = nodes(xml).filter((node) => node.class === 'android.widget.EditText');
  assert.equal(fields.length, 2, 'Expected username and password fields.');
  tap(fields[0]);
  await enterText(username);
  // Opening the keyboard can move the form; obtain fresh bounds for the password.
  const updated = await waitFor((value) => nodes(value).filter((node) =>
    node.class === 'android.widget.EditText').length === 2,
    'Login controls were not available after entering the username.');
  const updatedFields = nodes(updated).filter((node) => node.class === 'android.widget.EditText');
  assert.ok(updatedFields[0]?.text === username, 'Android did not enter the expected test username.');
  tap(updatedFields[1]);
  await enterText(password);
  shell('input', 'keyevent', '111'); // Escape hides a soft keyboard without leaving the app when a hardware keyboard is used.
  await delay(500);
  const current = await screen();
  tap(nodes(current).find((node) =>
    `${node.text || ''}${node['content-desc'] || ''}`.includes('ĐĂNG NHẬP')));
}

async function enterText(value) {
  // ADB modifier combinations are not handled consistently by Flutter text fields.
  // Move to the end and clear the bounded test fields using ordinary delete events.
  shell('input', 'keyevent', '123');
  shell('input', 'keyevent', '--delay', '5', ...Array(64).fill('67'));
  for (const character of value) {
    shell('input', 'text', character === ' ' ? '%s' : character);
    await delay(100);
  }
}

async function main() {
  const username = process.env.MOBILE_TECH_USERNAME || 'mobile_tech';
  const password = process.env.MOBILE_TECH_PASSWORD;
  assert.ok(password, 'Set MOBILE_TECH_PASSWORD in local .env.');
  assert.match(username, /^[A-Za-z0-9_.@-]+$/, 'Use an ADB-compatible test username.');
  assert.ok(/^[A-Za-z0-9_@.-]+$/.test(password), 'Use an ADB-compatible test password.');
  assert.ok(existsSync(adb), 'Set ADB_PATH to the Android platform-tools executable.');
  assert.ok(existsSync(apk), 'Build the debug APK first.');
  assert.equal(shell('getprop', 'sys.boot_completed').trim(), '1', 'Wait for Android to finish booting.');
  mkdirSync(output, { recursive: true });
  if (process.env.ANDROID_AUTH_SKIP_INSTALL !== '1') {
    console.log('Installing debug APK on the Android test device...');
    command(['install', '-r', apk]);
  }
  console.log('APK installed; checking login on the device...');
  await openApp();
  let xml = await waitFor((value) => value.includes('ĐĂNG NHẬP') || value.includes('Đăng xuất'),
    'The app did not reach login or home.');
  if (xml.includes('Đăng xuất')) {
    assert.ok(xml.includes(`${username}@smartcmms.test`), 'A different account is signed in; leave it unchanged.');
    tap(nodes(xml).find((node) => node['content-desc'] === 'Đăng xuất'));
    await waitFor((value) => value.includes('ĐĂNG NHẬP'), 'Could not sign out the existing test account.');
  }

  await submit(username, 'incorrect-test-password');
  await waitFor((value) => value.includes('Thông tin đăng nhập không đúng'), 'Wrong-password error was not shown.');
  record('Native app rejects wrong password using the real backend');

  await openApp();
  await submit(username, password);
  await waitFor((value) => value.includes(`${username}@smartcmms.test`), 'Technician profile did not appear.');
  screenshot('auth-home-android.png');
  record('Native app signs in and displays the backend technician profile');

  await openApp();
  xml = await waitFor((value) => value.includes(`${username}@smartcmms.test`),
    'Session was not restored after stopping and reopening the app.');
  screenshot('auth-restored-android.png');
  record('Securely stored token restores the session after process restart');

  tap(nodes(xml).find((node) => node['content-desc'] === 'Đăng xuất'));
  await waitFor((value) => value.includes('ĐĂNG NHẬP'), 'Logout did not return to login.');
  await openApp();
  xml = await waitFor((value) => value.includes('ĐĂNG NHẬP'), 'Logout was not durable across restart.');
  assert.ok(!xml.includes(`${username}@smartcmms.test`));
  screenshot('auth-logged-out-android.png');
  record('Logout removes the saved session across process restart');

  writeFileSync(join(output, 'auth-android-report.json'), JSON.stringify({
    checkedAt: new Date().toISOString(), serial, packageName,
    installation: process.env.ANDROID_AUTH_SKIP_INSTALL === '1' ? 'preinstalled' : 'installed-for-check',
    apkSha256: createHash('sha256').update(readFileSync(apk)).digest('hex'), checks,
  }, null, 2));
  console.log('Credentials and tokens were not printed or included in the report.');
}

export { command, shell, nodes, tap, screen, waitFor, openApp, screenshot, submit, enterText };

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Android verification failed.');
    process.exitCode = 1;
  });
}
