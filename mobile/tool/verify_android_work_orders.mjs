// Exercises mobile week 3 against its explicitly selected in-memory demo repository.
// API mode is checked for the currently missing SV03 endpoint; no warehouse writes.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { command, shell, nodes, tap, screen, waitFor, openApp, screenshot, submit, enterText } from './verify_android_auth.mjs';

const output = fileURLToPath(new URL('../build/verification/', import.meta.url));
const apiApk = fileURLToPath(new URL('../build/app/outputs/flutter-apk/app-debug.apk', import.meta.url));
const demoApk = `${output}/app-week3-demo.apk`;
const checks = [];
const label = (node) => node['content-desc'] || node.text || '';
const matches = (node, text, exact) => exact ? label(node) === text : label(node).includes(text);
function record(name) { checks.push(name); console.log(`PASS: ${name}`); }
async function hideKeyboard() {
  const state = shell('dumpsys', 'input_method');
  // mIsInputViewShown can remain true after the IME window has closed.
  if (/^\s*mInputShown=true\s*$/m.test(state) && /\bmWindowVisible=true\b/.test(state)) {
    // Tap Android's keyboard-dismiss chevron on the 720x1280 test emulator.
    // ADB Back/Escape can be delivered to Flutter when a hardware keyboard is
    // enabled; the system chevron consistently dismisses only the IME.
    shell('input', 'tap', '75', '1235');
    await delay(500);
    const updated = shell('dumpsys', 'input_method');
    assert.ok(!/^\s*mInputShown=true\s*$/m.test(updated), 'Android keyboard did not close.');
  }
}
async function press(text, { exact = true, scroll = false } = {}) {
  if (scroll) await hideKeyboard();
  for (let attempt = 0; attempt < (scroll ? 9 : 3); attempt++) {
    const xml = await screen();
    const target = nodes(xml).find((node) => node.clickable === 'true' && matches(node, text, exact));
    if (target) { tap(target); return; }
    if (scroll) shell('input', 'swipe', '360', '1100', '360', '400', '300');
  }
  throw new Error(`Control unavailable: ${text}`);
}
async function fill(hint, value) {
  console.log(`Entering field: ${hint}`);
  await hideKeyboard();
  for (let attempt = 0; attempt < 9; attempt++) {
    const xml = await screen();
    const target = nodes(xml).find((node) => node.class === 'android.widget.EditText' &&
      (`${node.hint || ''} ${node['content-desc'] || ''}`.includes(hint) ||
        (hint === 'Thời gian thực hiện' && (node.hint || '').includes('Ví dụ'))));
    if (target) { tap(target); await enterText(value); await hideKeyboard(); return; }
    shell('input', 'swipe', '360', '1100', '360', '400', '300');
  }
  throw new Error(`Input unavailable: ${hint}`);
}
async function signInIfNeeded() {
  const username = process.env.MOBILE_TECH_USERNAME || 'mobile_tech';
  await openApp();
  const xml = await waitFor((value) => value.includes('ĐĂNG NHẬP') || value.includes('Đăng xuất'), 'App did not reach login/home.');
  if (xml.includes('ĐĂNG NHẬP')) {
    const password = process.env.MOBILE_TECH_PASSWORD;
    assert.ok(password && /^[A-Za-z0-9_@.-]+$/.test(password), 'Set an ADB-compatible local test password.');
    await submit(username, password);
  }
  await waitFor((value) => value.includes(`${username}@smartcmms.test`), 'Test technician did not reach home.');
}
async function main() {
  const display = shell('wm', 'size').trim().split(/\r?\n/).at(-1) || '';
  assert.match(display, /size: 720x1280$/, 'Use the project test emulator at 720x1280.');
  const demoOnly = process.argv.includes('--demo-only');
  if (!demoOnly) {
    console.log('Installing normal API-mode APK...');
    command(['install', '-r', apiApk]);
    await signInIfNeeded();
    await press('Công việc được giao', { exact: false });
    const xml = await waitFor((value) => value.includes('Máy chủ chưa hỗ trợ danh sách công việc'), 'Missing API message was not shown.');
    assert.ok(!xml.includes('WO-DEMO-') && !xml.includes('DỮ LIỆU MẪU'));
    screenshot('work-orders-api-unavailable-android.png');
    record('Normal APK reports missing API without substituting demo tasks');
  }
  if (!process.argv.includes('--skip-demo-install')) {
    console.log('Installing explicitly labeled work-order demo APK...');
    command(['install', '-r', demoApk]);
  }
  await signInIfNeeded();
  await press('Công việc được giao', { exact: false });
  await waitFor((value) => value.includes('DỮ LIỆU MẪU') && value.includes('WO-DEMO-001'), 'Demo work list did not appear.');
  screenshot('work-orders-demo-list-android.png');
  record('Demo tasks are explicitly labeled and scoped to the signed-in technician');
  await press('Thấp');
  let xml = await waitFor((value) => value.includes('WO-DEMO-004'), 'Low-priority filter did not load.');
  assert.ok(!xml.includes('WO-DEMO-001'));
  screenshot('work-orders-low-android.png');
  record('Priority filter shows only matching tasks');
  await press('Tất cả');
  await waitFor((value) => value.includes('WO-DEMO-001'), 'All tasks did not reload.');
  await press('WO-DEMO-001', { exact: false });
  await press('Bắt đầu làm', { scroll: true });
  await waitFor((value) => value.includes('Đang thực hiện'), 'Start did not update task status.');
  record('Start transitions the assigned demo job to IN_PROGRESS');
  await fill('Ghi chú xử lý', 'Da thay vong bi va kiem tra ap suat.');
  await fill('Thời gian thực hiện', '0.5');
  await press('Thêm phụ tùng', { scroll: true });
  await waitFor((value) => value.includes('Vòng bi 6205') && value.includes('Hết hàng'), 'Demo catalog did not load.');
  await press('Vòng bi 6205', { exact: false });
  await fill('Số lượng', '2');
  await press('Hoàn thành', { scroll: true });
  await waitFor((value) => value.includes('Xác nhận kết quả') && value.includes('Da thay vong bi'), 'Report was not preserved in confirmation.');
  screenshot('work-order-review-android.png');
  record('Parts, quantity, time and report survive navigation into confirmation');
  await press('Xác nhận hoàn thành', { scroll: true });
  await waitFor((value) => value.includes('Đã hoàn thành, chờ quản lý nghiệm thu.'), 'Completion report was not displayed.');
  screenshot('work-order-completed-android.png');
  record('Confirmation transitions to COMPLETED and shows the recorded report');
  await press('Quay lại');
  await waitFor((value) => value.includes('WO-DEMO-001'), 'Could not return to updated list.');
  await press('WO-DEMO-001', { exact: false });
  xml = await waitFor((value) => value.includes('Đã hoàn thành'), 'Completed detail did not reopen.');
  assert.ok(!xml.includes('Bắt đầu làm') && !xml.includes('Xác nhận hoàn thành'));
  record('Completed jobs reopen read-only instead of allowing a second execution');
  await press('Quay lại');
  writeFileSync(`${output}/work-orders-android-report.json`, JSON.stringify({
    checkedAt: new Date().toISOString(), serial: process.env.ANDROID_SERIAL || 'emulator-5554',
    mode: demoOnly ? 'demo-only' : 'missing-api-and-demo',
    liveWorkOrderIntegrationAccepted: false,
    apiApkSha256: demoOnly ? null : createHash('sha256').update(readFileSync(apiApk)).digest('hex'),
    demoApkSha256: createHash('sha256').update(readFileSync(demoApk)).digest('hex'), checks,
  }, null, 2));
  console.log('Work Order execution used in-memory demo data. No real jobs or stock were changed.');
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Android work-order verification failed.');
  process.exitCode = 1;
});
