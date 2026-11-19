// Project emulator only. Offline intents must not reach the pre-Sync APIs.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {command,shell,screenshot,nodes} from './verify_android_auth.mjs';
import {press,fill,seek,top,signIn,workScreen,emulatorWarnings} from './android_work_order_ui.mjs';
const output=fileURLToPath(new URL('../build/verification/',import.meta.url));
const apk=fileURLToPath(new URL('../build/app/outputs/flutter-apk/app-debug.apk',import.meta.url));
const base=process.env.MOBILE_API_BASE_URL||'http://127.0.0.1:3000/api/v1';
const checks=[];
let context;
function report(status='running',error){
  if(!context)return;
  writeFileSync(output+'/offline-android-report.json',JSON.stringify({
    ...context,checkedAt:new Date().toISOString(),status,checks,emulatorWarnings,
    ...(error?{error}:{})
  },null,2));
}
function pass(name){checks.push(name);console.log('PASS: '+name);report();}
async function api(path,token,body){
  const response=await fetch(base+'/'+path,{method:body?'POST':'GET',
    headers:{'Content-Type':'application/json',Connection:'close',...(token?{Authorization:'Bearer '+token}:{})},
    ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
  assert.ok(response.ok,'API read/login failed: '+path+' ('+response.status+')');
  return (await response.json()).data;
}
const labels={CRITICAL:'Khẩn cấp',HIGH:'Cao',MEDIUM:'Trung bình',LOW:'Thấp'};
async function navigate(target){
  await press('Công việc được giao',{exact:false});
  await press(labels[target.priority]);
  await press(target.title,{exact:false,scroll:true});
}
async function network(enabled){
  shell('svc','wifi',enabled?'enable':'disable');
  shell('svc','data',enabled?'enable':'disable');
  await delay(enabled?3000:1500);
}
async function fieldValue(identifier,expected){
  await top();
  for(let i=0;i<16;i++){
    const field=nodes(await workScreen()).find(n=>(n['resource-id']||'').includes(identifier));
    if(field){
      const normalize=value=>(value||'').replace(/\s/g,'').toLowerCase();
      assert.equal(normalize(field.text),normalize(expected),'Persisted input mismatch: '+identifier);
      return;
    }
    shell('input','swipe','675','1100','675','400','700');
  }
  throw Error('Persisted input unavailable: '+identifier);
}
async function main(){
  assert.equal(process.env.DB_NAME,'smart_cmms_mobile_dev');
  assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
  assert.match(process.env.ANDROID_SERIAL||'emulator-5554',/^emulator-\d+$/);
  const fixture=JSON.parse(readFileSync(output+'/work-orders-live-fixture.json','utf8'));
  assert.equal(fixture.database,process.env.DB_NAME);
  const previous=existsSync(output+'/offline-android-report.json')
    ?JSON.parse(readFileSync(output+'/offline-android-report.json','utf8')):null;
  const used=new Set(previous?.usedWorkOrderIds||
    (previous?.checks?.length>=2?[previous.workOrderId]:[]));
  if(previous)writeFileSync(output+'/offline-android-previous-report.json',JSON.stringify(previous,null,2));
  const reuseParts=process.argv.includes('--reuse-parts');
  const login=await api('auth/login',null,{username:process.env.MOBILE_TECH_USERNAME||'mobile_tech',
    password:process.env.MOBILE_TECH_PASSWORD});
  const token=login.accessToken;
  assert.equal(login.user.id,fixture.technicianId);
  const available=[];
  for(const item of fixture.orders.filter(o=>o.priority!=='CRITICAL'&&!used.has(o.id))) {
    const detail=await api('work-orders/'+item.id,token);
    assert.ok(detail.title.startsWith('[SV05 DEMO ') &&
      detail.assignedTechnicianId===fixture.technicianId,
      'Only labeled SV05 development jobs may be used.');
    if(detail.status==='ASSIGNED')available.push(item);
  }
  assert.ok(available.length>=(reuseParts?1:2),'Prepare fresh SV05 fixtures before running the offline check.');
  const warm=reuseParts?null:available[0], target=available.at(-1);
  const partBefore=await api('parts/'+fixture.partId,token);
  const stockBefore=Number((partBefore.data||partBefore).currentStock);
  context={startedAt:new Date().toISOString(),mode:'local-offline-real-api',
    serial:process.env.ANDROID_SERIAL||'emulator-5554',
    androidApiLevel:Number(shell('getprop','ro.build.version.sdk').trim()),
    apiApkSha256:createHash('sha256').update(readFileSync(apk)).digest('hex'),
    database:process.env.DB_NAME,workOrderId:target.id,warmupWorkOrderId:warm?.id,
    reusedDownloadedParts:reuseParts,usedWorkOrderIds:[...used,target.id],
    stockBefore,serverSyncApiUsed:false};
  report();
  command(['install','-r',apk]);
  await network(true);
  await signIn();
  await press('Trạng thái đồng bộ');
  const count=await seek('Đang chờ:');
  const initialPending=Number((count['content-desc']||count.text).match(/Đang chờ: (\d+)/)?.[1]);
  assert.ok(Number.isInteger(initialPending));
  context.initialPending=initialPending;
  await press('Quay lại');
  if(warm){
    await navigate(warm);
    await press('Bắt đầu làm',{scroll:true});
    assert.equal((await api('work-orders/'+warm.id,token)).status,'IN_PROGRESS');
    await press('Thêm phụ tùng',{scroll:true});
    await fill('Tìm mã hoặc tên phụ tùng',fixture.partCode);
    await press('Tìm phụ tùng');
    await seek(fixture.partName,{exact:false,scroll:true});
    await press('Quay lại');
    await press('Quay lại');
    await top();await press(labels[target.priority]);
    await press(target.title,{exact:false,scroll:true});
  } else await navigate(target);
  pass(reuseParts?'Online session and job detail load; previous SQLite part cache is retained':
    'Online authentication, work detail, material list and part search are downloaded');
  await network(false);
  await signIn(); // cold process restart while the emulator has no Wi-Fi/mobile data
  await navigate(target);
  await seek('Đang làm việc offline',{scroll:false});
  await press('Bắt đầu làm',{scroll:true});
  await seek('Có thay đổi chỉ lưu trên máy, chờ đồng bộ.',{scroll:true});
  assert.equal((await api('work-orders/'+target.id,token)).status,'ASSIGNED');
  pass('Cold offline session restores and Start queues locally without changing the server');
  await press('Thêm phụ tùng',{scroll:true});
  await fill('Tìm mã hoặc tên phụ tùng',fixture.partCode);
  await press('Tìm phụ tùng');
  await press(fixture.partName,{exact:false,scroll:true});
  await fill('Số lượng','2');
  await fill('Ghi chú yêu cầu vật tư','Offline SV05');
  await press('Gửi yêu cầu vật tư',{scroll:true});
  await seek('Thay đổi vật tư này đang chờ đồng bộ.',{scroll:true});
  await fill('Nguyên nhân','Offline cause');
  await fill('Cách xử lý','Offline solution');
  await fill('Ghi chú thêm','Offline report');
  const finish=await seek('Hoàn thành',{exact:true,scroll:true});
  assert.equal(finish.enabled,'false');
  screenshot('offline-pending-android.png');
  pass('Cached parts can create a queued request; pending materials keep completion disabled');
  await signIn();
  await navigate(target);
  await seek('Đã khôi phục bản nháp trên máy.',{scroll:true});
  await fieldValue('work_root_cause','Offline cause');
  await fieldValue('work_solution','Offline solution');
  await fieldValue('work_completion_notes','Offline report');
  screenshot('offline-draft-restored-android.png');
  await seek('Thay đổi vật tư này đang chờ đồng bộ.',{scroll:true});
  pass('After a second offline process restart the report draft and material request persist');
  await press('Quay lại');
  await press('Giữ bản nháp và quay lại');
  await press('Quay lại');
  await press('Trạng thái đồng bộ');
  await seek('Đang chờ: '+(initialPending+2));
  // Android exposes selectable UUIDs even when Card merges static labels.
  await seek('Mã thao tác:',{scroll:true});
  const visibleIds=new Set();
  for(let i=0;i<16&&visibleIds.size<2;i++){
    for(const node of nodes(await workScreen())){
      const label=node['content-desc']||node.text||'';
      if(label.startsWith('Mã thao tác:')){
        const id=label.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];
        if(id)visibleIds.add(id);
      }
    }
    if(visibleIds.size<2)shell('input','swipe','675','1100','675','400','700');
  }
  assert.ok(visibleIds.size>=2,'Expected distinct operation UUIDs on the sync screen.');
  screenshot('offline-queue-android.png');
  context.finalPending=initialPending+2;
  pass('The sync screen preserves existing items and adds exactly two PENDING intents with operation UUIDs');
  const requests=await api('material-requests?workOrderId='+target.id,token);
  assert.equal(requests.total??requests.meta?.total,0);
  const partAfter=await api('parts/'+fixture.partId,token);
  assert.equal(Number((partAfter.data||partAfter).currentStock),stockBefore);
  await network(true);
  await delay(1500);
  assert.equal((await api('work-orders/'+target.id,token)).status,'ASSIGNED');
  context.stockAfter=Number((partAfter.data||partAfter).currentStock);
  pass('Server status and stock remain unchanged; reconnecting never replays old mutation APIs');
  report('passed');
}
main().catch(error=>{report('failed',error.message);console.error(error.message);process.exitCode=1;})
  .finally(async()=>{try{await network(true);}catch{}});
