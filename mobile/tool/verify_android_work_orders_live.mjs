// Drives the Flutter API-mode APK; warehouse action is a separate Admin API call.
import assert from 'node:assert/strict';
import { readFileSync,writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { command,shell,screenshot } from './verify_android_auth.mjs';
import { press,fill,seek,top,signIn,workScreen,emulatorWarnings } from './android_work_order_ui.mjs';
const output=fileURLToPath(new URL('../build/verification/',import.meta.url));
const apk=fileURLToPath(new URL('../build/app/outputs/flutter-apk/app-debug.apk',import.meta.url));
const base=process.env.MOBILE_API_BASE_URL||'http://127.0.0.1:3000/api/v1';
const checks=[];
let reportContext;
const readRetries=[];
function persist(status='running',error){
  if(!reportContext)return;
  writeFileSync(`${output}/work-orders-android-report.json`,JSON.stringify({
    ...reportContext,checkedAt:new Date().toISOString(),status,
    liveWorkOrderIntegrationAccepted:status==='passed',checks,emulatorWarnings,readRetries,
    ...(error?{error}:{}),
  },null,2));
}
function pass(name){checks.push(name);console.log(`PASS: ${name}`);persist();}
async function api(path,token,{method='GET',body}={}) {
  let res;
  for(let attempt=0;attempt<3;attempt++) {
    try {
      res=await fetch(`${base}/${path}`,{method,
        headers:{'Content-Type':'application/json','Connection':'close',...(token?{Authorization:`Bearer ${token}`}:{})},
        ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
      break;
    } catch(error) {
      const cause=error.cause?.code||error.cause?.errors?.map(item=>item.code).join(',')||error.name;
      if(method!=='GET'||attempt===2)throw new Error(`${method} ${path}: ${error.message} (${cause})`);
      readRetries.push({path,cause,at:new Date().toISOString()});
      await delay(300*(attempt+1));
    }
  }
  assert.ok(res.ok,`${method} ${path} returned HTTP ${res.status}`);
  return (await res.json()).data;
}
async function eventually(read,predicate,message) {
  for(let i=0;i<24;i++) {
    const value=await read();
    if(predicate(value))return value;
    await delay(500);
  }
  throw new Error(message);
}
async function main(){
  assert.equal(process.env.DB_NAME,'smart_cmms_mobile_dev');
  assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
  const display=shell('wm','size').trim().split(/\r?\n/).at(-1)||'';
  assert.match(display,/size: 720x1280$/);
  const androidApiLevel=Number(shell('getprop','ro.build.version.sdk').trim());
  const fixture=JSON.parse(readFileSync(`${output}/work-orders-live-fixture.json`,'utf8'));
  assert.equal(fixture.database,process.env.DB_NAME);
  const target=fixture.orders.find(item=>item.priority==='CRITICAL');
  const low=fixture.orders.find(item=>item.priority==='LOW');
  reportContext={startedAt:new Date().toISOString(),mode:'live-api',
    serial:process.env.ANDROID_SERIAL||'emulator-5554',androidApiLevel,
    installation:process.argv.includes('--skip-install')?'preinstalled':'installed-for-check',
    database:process.env.DB_NAME,workOrderId:target.id,
    apiApkSha256:createHash('sha256').update(readFileSync(apk)).digest('hex')};
  persist();
  const tech=await api('auth/login',null,{method:'POST',body:{username:process.env.MOBILE_TECH_USERNAME||'mobile_tech',password:process.env.MOBILE_TECH_PASSWORD}});
  assert.equal(tech.user.id,fixture.technicianId);
  const token=tech.accessToken;
  assert.equal((await api(`work-orders/${target.id}`,token)).status,'ASSIGNED','Run verify_work_orders_api.mjs to prepare a fresh fixture.');
  console.log(process.argv.includes('--skip-install')?'Using installed API-mode APK...':'Installing real API-mode APK...');
  if(!process.argv.includes('--skip-install'))command(['install','-r',apk]);
  await signIn(!process.argv.includes('--skip-open'));
  await press('Công việc được giao',{exact:false});
  const xml=await workScreen();
  assert.ok(!xml.includes('DỮ LIỆU MẪU'));
  await press('Thấp');
  await seek(low.title,{scroll:true});
  screenshot('work-orders-live-low-android.png');
  await top(); await press('Khẩn cấp');
  await press(target.title,{exact:false,scroll:true});
  pass('Real assigned jobs load and priority filters select matching records');
  await press('Bắt đầu làm',{scroll:true});
  await eventually(()=>api(`work-orders/${target.id}`,token), wo=>wo.status==='IN_PROGRESS',
    'Start did not persist IN_PROGRESS.');
  pass('Android Start persists IN_PROGRESS on the real backend');
  await press('Thêm phụ tùng',{scroll:true});
  await fill('Tìm mã hoặc tên phụ tùng',fixture.partCode);
  await press('Tìm phụ tùng');
  await press(fixture.partName,{exact:false,scroll:true});
  await fill('Số lượng','2');
  await fill('Ghi chú yêu cầu vật tư','Android SV05');
  const beforePart=await api(`parts/${fixture.partId}`,token);
  const before=Number((beforePart.data||beforePart).currentStock);
  reportContext.stockBefore=before;
  await press('Gửi yêu cầu vật tư',{scroll:true});
  const pending=await eventually(()=>api(`material-requests?workOrderId=${target.id}&status=PENDING`,token),
    result=>result.items.length===1,'Android material request was not saved.');
  assert.equal(pending.items.length,1);
  const request=pending.items[0];
  reportContext.materialRequestId=request.id;
  const afterRequest=await api(`parts/${fixture.partId}`,token);
  assert.equal(Number((afterRequest.data||afterRequest).currentStock),before);
  await top(); await seek('Chờ duyệt',{scroll:true});
  screenshot('work-order-live-material-pending-android.png');
  pass('Android creates one PENDING request without deducting stock');
  await fill('Nguyên nhân','Vong bi mon');
  await fill('Cách xử lý','Thay vong bi');
  await fill('Ghi chú thêm','Da chay thu');
  const finish=await seek('Hoàn thành',{exact:true,scroll:true});
  assert.equal(finish.enabled,'false','Completion must be disabled while stock request is pending.');
  pass('Completion is disabled while materials await warehouse approval');
  // This is an explicit test Admin operation; the technician app has no approval ability.
  const admin=await api('auth/login',null,{method:'POST',body:{username:'admin',password:process.env.DEFAULT_ADMIN_PASSWORD}});
  await api(`material-requests/${request.id}/approve`,admin.accessToken,{method:'PATCH'});
  await press('Cập nhật công việc');
  await top(); await seek('Đã cấp vật tư',{scroll:true});
  screenshot('work-order-live-material-approved-android.png');
  await press('Hoàn thành',{scroll:true});
  await seek('Xác nhận kết quả',{scroll:true});
  screenshot('work-order-live-review-android.png');
  pass('Refreshing shows issued materials and preserves cause, solution and notes');
  await press('Xác nhận hoàn thành',{scroll:true});
  await top(); await seek('Đã hoàn thành, chờ quản lý nghiệm thu.',{scroll:true});
  screenshot('work-order-live-completed-android.png');
  const completed=await api(`work-orders/${target.id}`,token);
  assert.equal(completed.status,'COMPLETED');
  const normalized=value=>(value||'').replace(/\s/g,'').toLowerCase();
  assert.equal(normalized(completed.rootCause),'vongbimon');
  assert.equal(normalized(completed.solution),'thayvongbi');
  assert.equal(normalized(completed.completionNotes),'dachaythu');
  assert.equal(completed.parts.find(p=>p.partId===fixture.partId).quantityUsed,2);
  const after=await api(`parts/${fixture.partId}`,token);
  assert.equal(Number((after.data||after).currentStock),before-2);
  reportContext.stockAfter=Number((after.data||after).currentStock);
  pass('Android completion persists the report and issued parts without deducting stock again');
  await signIn();
  await press('Công việc được giao',{exact:false});
  await press('Khẩn cấp');
  await press(target.title,{exact:false,scroll:true});
  await seek('Đã hoàn thành, chờ quản lý nghiệm thu.',{scroll:true});
  pass('After process restart the completed job reloads from the server as read-only');
  persist('passed');
}
main().catch(error=>{persist('failed',error.message);console.error(error.message);process.exitCode=1;});
