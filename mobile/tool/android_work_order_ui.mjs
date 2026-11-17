// UI helpers for the project's 720x1280 Android test emulator.
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { shell, nodes, tap, screen as rawScreen, openApp, submit, enterText } from './verify_android_auth.mjs';
export const emulatorWarnings = [];
export async function workScreen() {
  for (let attempt=0;attempt<3;attempt++) {
    const xml=await rawScreen();
    if(xml.includes('System UI') && xml.includes('responding')) {
      const wait=nodes(xml).find(node=>node.text==='Wait');
      if(!wait)throw Error('System UI ANR obscures Android verification.');
      emulatorWarnings.push({at:new Date().toISOString(),message:'System UI ANR on resource-constrained emulator; selected Wait.'});
      console.log('Emulator warning: dismissing System UI ANR (Wait).');
      tap(wait);await delay(1000);continue;
    }
    return xml;
  }
  throw Error('Emulator System UI remains unresponsive.');
}
export const label = node => node['content-desc'] || node.text || '';
const flag = (state,name) => state.match(new RegExp(`\\b${name}=(true|false)\\b`))?.[1];
export async function hideKeyboard() {
  const state=shell('dumpsys','input_method');
  if (flag(state,'mInputShown')==='true' && flag(state,'mWindowVisible')==='true' &&
      flag(state,'mIsInputViewShown')!=='false') {
    // Use IME Back rather than a coordinate: Android 11 may use three-button navigation.
    shell('input','keyevent','4');
    await delay(500);
    assert.notEqual(flag(shell('dumpsys','input_method'),'mInputShown'),'true','Keyboard did not close.');
  }
}
export async function top() {
  await hideKeyboard();
  // Stay outside text fields (right edge 657px) and Android's back-gesture edge.
  for(let i=0;i<5;i++) shell('input','swipe','675','300','675','1100','700');
}
export async function seek(text,{exact=false,scroll=false,clickable=false}={}) {
  await hideKeyboard();
  if(scroll)await top();
  for(let i=0;i<(scroll?16:3);i++) {
    const found=nodes(await workScreen()).find(n=>(!clickable || n.clickable==='true') &&
      (exact?label(n)===text:label(n).includes(text)));
    if(found)return found;
    if(scroll)shell('input','swipe','675','1100','675','400','700');
  }
  throw new Error(`Android control/text unavailable: ${text}`);
}
export async function press(text,options={}) {tap(await seek(text,{exact:true,...options,clickable:true}));}
export async function fill(hint,value) {
  await top();
  const identifiers = {'Tìm mã hoặc tên phụ tùng':'work_part_search','Số lượng':'work_quantity_',
    'Ghi chú yêu cầu vật tư':'work_material_notes','Nguyên nhân':'work_root_cause',
    'Cách xử lý':'work_solution','Ghi chú thêm':'work_completion_notes'};
  const identifier = identifiers[hint];
  for(let i=0;i<16;i++) {
    const field=nodes(await workScreen()).find(n=>
      (identifier && (n['resource-id']||'').includes(identifier)) ||
      (n.class==='android.widget.EditText' && `${n.hint||''} ${n['content-desc']||''} ${n.text||''}`.includes(hint)));
    if(field){
      tap(field);await enterText(value);
      if(!['Cách xử lý','Ghi chú thêm'].includes(hint))shell('input','keyevent','66');
      await hideKeyboard();return;
    }
    shell('input','swipe','675','1100','675','400','700');
  }
  throw new Error(`Android input unavailable: ${hint}`);
}
export async function signIn(restart=true) {
  const username=process.env.MOBILE_TECH_USERNAME||'mobile_tech';
  if(restart)await openApp();
  let xml='';
  for(let i=0;i<12;i++) {
    xml=await workScreen();
    if(xml.includes('ĐĂNG NHẬP')||xml.includes('Đăng xuất'))break;
    await delay(1000);
  }
  assert.ok(xml.includes('ĐĂNG NHẬP')||xml.includes('Đăng xuất'),'App did not reach login/home.');
  if(xml.includes('ĐĂNG NHẬP')) {
    assert.match(process.env.MOBILE_TECH_PASSWORD||'',/^[A-Za-z0-9_@.-]+$/);
    await submit(username,process.env.MOBILE_TECH_PASSWORD);
  }
  for(let i=0;i<12;i++) {
    if((await workScreen()).includes(`${username}@smartcmms.test`))return;
    await delay(1000);
  }
  throw Error('Expected technician is not signed in.');
}
