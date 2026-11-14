// Run on the project emulator with asset-qr-camera.png as its imagefile camera input.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { command, shell, nodes, tap, screen, waitFor, openApp, screenshot, submit, enterText } from './verify_android_auth.mjs';

const output = fileURLToPath(new URL('../build/verification/', import.meta.url));
const demo = JSON.parse(readFileSync(`${output}/assets-api-report.json`, 'utf8'));
const checks = [];
const packageName = 'com.example.smart_cmms_mobile';
const label = (node) => node['content-desc'] || node.text || '';
function record(name) { checks.push(name); console.log(`PASS: ${name}`); }
function writeReport(filename, apk) {
  writeFileSync(`${output}/${filename}`, JSON.stringify({
    checkedAt: new Date().toISOString(), serial: process.env.ANDROID_SERIAL || 'emulator-5554',
    cameraInput: 'asset-qr-camera.png (emulator imagefile camera)',
    apkSha256: createHash('sha256').update(readFileSync(apk)).digest('hex'), checks,
  }, null, 2));
}
async function press(text) {
  const xml = await waitFor((value) => nodes(value).some((node) => label(node) === text), `Missing control: ${text}`);
  tap(nodes(xml).find((node) => label(node) === text));
}
async function manualCode(value) {
  const xml = await screen();
  const field = nodes(xml).find((node) => node.class === 'android.widget.EditText');
  tap(field);
  await enterText(value);
  const filled = await screen();
  assert.ok(nodes(filled).some((node) => node.class === 'android.widget.EditText' && node.text === value),
    'Android did not enter the expected asset code.');
  await press('Tra cứu');
}

async function main() {
  const username = process.env.MOBILE_TECH_USERNAME || 'mobile_tech';
  const password = process.env.MOBILE_TECH_PASSWORD;
  assert.ok(password, 'Set the local test password in .env.');
  assert.match(username, /^[A-Za-z0-9_.@-]+$/);
  assert.ok(/^[A-Za-z0-9_@.-]+$/.test(password), 'Use an ADB-compatible test password.');
  const apk = fileURLToPath(new URL('../build/app/outputs/flutter-apk/app-debug.apk', import.meta.url));
  if (process.env.ANDROID_AUTH_SKIP_INSTALL !== '1') {
    console.log('Installing QR-enabled debug APK...');
    command(['install', '-r', apk]);
  }
  const cameraOnly = process.argv.includes('--camera-only');
  if (!cameraOnly) {
    shell('pm', 'revoke', packageName, 'android.permission.CAMERA');
    shell('pm', 'clear-permission-flags', packageName, 'android.permission.CAMERA', 'user-set', 'user-fixed');
  }
  await openApp();
  console.log('Waiting for the Android login screen...');
  let xml = await waitFor((value) => value.includes('ĐĂNG NHẬP') || value.includes('Đăng xuất'), 'App did not reach authentication.');
  if (xml.includes('ĐĂNG NHẬP')) await submit(username, password);
  xml = await waitFor((value) => value.includes(`${username}@smartcmms.test`), 'Test technician did not sign in.');
  record('Technician signs in on the QR-enabled APK');
  await press('Quét mã QR thiết bị');
  if (cameraOnly) {
    xml = await waitFor((value) => value.includes(demo.name) || value.includes('permission_allow_foreground_only_button') || value.includes('permission_allow_button'),
      'Camera did not reach an asset result or permission prompt.');
    if (!xml.includes(demo.name)) {
      tap(nodes(xml).find((node) => node['resource-id']?.endsWith('/permission_allow_foreground_only_button') || node['resource-id']?.endsWith('/permission_allow_button')));
    }
    await waitFor((value) => value.includes(demo.name) && value.includes('Chi tiết tài sản'), 'Camera did not decode the backend JSON QR label.');
    screenshot('qr-camera-detail-android.png');
    record('Android camera decodes backend JSON QR and loads the matching real asset');
    await press('Về trang chính');
    await waitFor((value) => value.includes(`${username}@smartcmms.test`), 'Could not leave scanner flow.');
    record('Scanner flow closes and returns to the technician home');
    writeReport('assets-camera-android-report.json', apk);
    console.log('No credentials or tokens were included in the report.');
    return;
  }
  xml = await waitFor((value) => value.includes('permission_deny_button'), 'Camera permission prompt did not appear.');
  tap(nodes(xml).find((node) => node['resource-id']?.endsWith('/permission_deny_button')));
  await waitFor((value) => value.includes('Chưa có quyền sử dụng camera'), 'Camera denial recovery was not shown.');
  screenshot('qr-camera-denied-android.png');
  record('Camera denial shows guidance and keeps manual lookup available');

  await press('Nhập mã thủ công');
  await manualCode('INVALID');
  await waitFor((value) => value.includes('Mã không hợp lệ'), 'Invalid manual code was not rejected.');
  record('Invalid manual asset code is rejected');
  await manualCode('AST-MOBILE-NOT-FOUND');
  await waitFor((value) => value.includes('Không tìm thấy tài sản'), 'Missing asset was not reported.');
  record('Real backend 404 is displayed without crashing');
  await manualCode(demo.code);
  await waitFor((value) => value.includes(demo.name) && value.includes('Chi tiết tài sản'), 'Manual lookup did not display the real asset.');
  screenshot('qr-manual-detail-android.png');
  record('Manual lookup displays real asset details');

  await press('Về trang chính');
  await press('Quét mã QR thiết bị');
  xml = await waitFor((value) => value.includes('permission_allow_foreground_only_button') || value.includes('permission_allow_button'),
    'Camera permission retry did not appear.');
  tap(nodes(xml).find((node) => node['resource-id']?.endsWith('/permission_allow_foreground_only_button') || node['resource-id']?.endsWith('/permission_allow_button')));
  await waitFor((value) => value.includes(demo.name) && value.includes('Chi tiết tài sản'), 'Camera did not decode the backend JSON QR label.');
  screenshot('qr-camera-detail-android.png');
  record('Android camera decodes backend JSON QR and loads the matching real asset');
  await press('Về trang chính');
  await waitFor((value) => value.includes(`${username}@smartcmms.test`), 'Could not leave scanner flow.');
  record('Scanner flow closes and returns to the technician home');
  writeReport('assets-android-report.json', apk);
  console.log('No credentials or tokens were included in the report.');
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Android QR verification failed.');
  process.exitCode = 1;
});
