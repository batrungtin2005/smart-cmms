// Real API acceptance, restricted to local smart_cmms_mobile_dev fixtures.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = fileURLToPath(new URL('../../', import.meta.url));
if (existsSync(`${root}/.env`)) loadEnvFile(`${root}/.env`);
const base = process.env.MOBILE_API_BASE_URL || 'http://127.0.0.1:3000/api/v1';
const output = `${root}/mobile/build/verification`;
const checks=[];
async function call(path,{method='GET',body,token,expected=200}={}) {
  const response=await fetch(`${base}/${path}`,{method,
    headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},
    ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
  const payload=await response.json();
  assert.equal(response.status,expected,`${method} ${path}: unexpected HTTP status`);
  return payload.data;
}
function pass(name) {checks.push(name); console.log(`PASS: ${name}`);}
async function main() {
  assert.equal(process.env.DB_NAME,'smart_cmms_mobile_dev');
  assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
  assert.ok(['localhost','127.0.0.1'].includes(process.env.DB_HOST || 'localhost'));
  const db=new pg.Client({host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT||5432),
    database:process.env.DB_NAME,user:process.env.DB_USERNAME||'postgres',password:process.env.DB_PASSWORD});
  try {
    await db.connect();
    assert.equal((await db.query('SELECT current_database() AS name')).rows[0].name,'smart_cmms_mobile_dev');
    const tech=await call('auth/login',{method:'POST',body:{username:process.env.MOBILE_TECH_USERNAME||'mobile_tech',password:process.env.MOBILE_TECH_PASSWORD}});
    const admin=await call('auth/login',{method:'POST',body:{username:'admin',password:process.env.DEFAULT_ADMIN_PASSWORD}});
    const token=tech.accessToken, adminToken=admin.accessToken;
    const asset=(await db.query("SELECT id FROM assets WHERE asset_code='AST-MOBILE-QR-001' AND is_active=true")).rows[0];
    assert.ok(asset,'Prepare the isolated mobile QR fixture first.');
    // A new test-only part per run makes stock assertions independent of past demos.
    const stamp=Date.now();
    const createdPart=await call('parts',{method:'POST',token:adminToken,expected:201,
      body:{partCode:`PART-MOBILE-W3-${stamp}`,name:'Vòng bi thử mobile tuần 3',category:'Dữ liệu thử SV05',unit:'Cái',unitPrice:12500,currentStock:20}});
    const part=createdPart.data || createdPart;
    assert.ok(part.id);
    async function create(title,priority='CRITICAL') {
      const wo=await call('work-orders',{method:'POST',token:adminToken,expected:201,
        body:{assetId:asset.id,title,priority,type:'INSPECTION',description:'Dữ liệu thử nghiệm SV05 trên database riêng.'}});
      return call(`work-orders/${wo.id}/assign`,{method:'PATCH',token:adminToken,body:{assignedTechnicianId:tech.user.id}});
    }
    const wo=await create(`[SV05 TEST ${stamp}] Kiểm tra luồng API`);
    await call('work-orders/my-tasks',{expected:401});
    await call('work-orders/my-tasks',{token:adminToken,expected:403});
    const list=await call('work-orders/my-tasks?priority=CRITICAL&page=1&limit=20',{token});
    assert.ok(Array.isArray(list.items) && list.items.some(item=>item.id===wo.id));
    assert.ok(list.items.every(item=>item.assignedTechnicianId===tech.user.id));
    pass('Authenticated assigned list uses items/meta and respects technician ownership and priority');
    const started=await call(`work-orders/${wo.id}/status`,{method:'PATCH',token,body:{status:'IN_PROGRESS'}});
    assert.equal(started.status,'IN_PROGRESS');
    await call(`work-orders/${wo.id}/status`,{method:'PATCH',token,body:{status:'IN_PROGRESS'},expected:409});
    await call(`work-orders/${wo.id}/status`,{method:'PATCH',token,body:{status:'ON_HOLD',reason:'Chờ kiểm tra vật tư'}});
    const resumed=await call(`work-orders/${wo.id}/status`,{method:'PATCH',token,body:{status:'IN_PROGRESS'}});
    assert.equal(resumed.startTime,started.startTime);
    pass('Start, duplicate rejection, pause and resume preserve the first start timestamp');
    const material=await call(`work-orders/${wo.id}/material-requests`,{method:'POST',token,expected:201,
      body:{items:[{partId:part.id,quantity:2}],notes:'Vật tư kiểm tra API mobile'}});
    assert.equal(material.status,'PENDING');
    async function stock() {return Number((await db.query('SELECT current_stock FROM parts WHERE id=$1',[part.id])).rows[0].current_stock);}
    assert.equal(await stock(),20);
    const report={rootCause:'Vòng bi mòn',solution:'Thay vòng bi và chạy thử',completionNotes:'Kiểm tra API thật SV05'};
    await call(`work-orders/${wo.id}/complete`,{method:'PATCH',token,body:report,expected:409});
    await call(`material-requests/${material.id}/approve`,{method:'PATCH',token,expected:403});
    pass('Submitting material requests leaves stock unchanged and pending requests block completion');
    await call(`material-requests/${material.id}/approve`,{method:'PATCH',token:adminToken});
    assert.equal(await stock(),18);
    await call(`material-requests/${material.id}/approve`,{method:'PATCH',token:adminToken,expected:409});
    assert.equal(await stock(),18);
    pass('Warehouse/Admin approval issues stock once; technician approval and duplicate issue are rejected');
    const completed=await call(`work-orders/${wo.id}/complete`,{method:'PATCH',token,body:report});
    assert.equal(completed.status,'COMPLETED');
    assert.equal(completed.rootCause,report.rootCause);
    assert.equal(completed.parts.find(item=>item.partId===part.id).quantityUsed,2);
    assert.ok(Number(completed.actualRepairTimeHours)>=0);
    await call(`work-orders/${wo.id}/complete`,{method:'PATCH',token,body:report,expected:409});
    pass('Dedicated completion persists report, server-calculated hours and already-issued materials');
    const rejected=await call(`work-orders/${wo.id}/verify`,{method:'PATCH',token:adminToken,
      body:{decision:'REJECT',verificationNotes:'Kiểm tra vòng làm lại SV05'}});
    assert.equal(rejected.status,'REWORK_REQUIRED');
    await call(`work-orders/${wo.id}/status`,{method:'PATCH',token,body:{status:'IN_PROGRESS'}});
    await call(`work-orders/${wo.id}/complete`,{method:'PATCH',token,body:report});
    const closed=await call(`work-orders/${wo.id}/verify`,{method:'PATCH',token:adminToken,
      body:{decision:'ACCEPT',verificationNotes:'Đạt yêu cầu thử nghiệm SV05'}});
    assert.equal(closed.status,'CLOSED');
    assert.equal(await stock(),18);
    assert.equal(Number((await db.query('SELECT count(*) AS n FROM asset_maintenance_history WHERE work_order_id=$1',[wo.id])).rows[0].n),1);
    pass('Rejected work can restart and close; final history is recorded once without issuing stock again');
    const fixtures=[];
    for (const priority of ['CRITICAL','HIGH','MEDIUM','LOW']) {
      fixtures.push(await create(`[SV05 DEMO ${stamp}] Kiểm tra ${priority}`,priority));
    }
    mkdirSync(output,{recursive:true});
    writeFileSync(`${output}/work-orders-live-fixture.json`,JSON.stringify({createdAt:new Date().toISOString(),
      database:process.env.DB_NAME,partId:part.id,partCode:part.partCode,partName:part.name,
      technicianId:tech.user.id,orders:fixtures.map(item=>({id:item.id,code:item.workOrderCode,title:item.title,priority:item.priority}))},null,2));
    writeFileSync(`${output}/work-orders-live-api-report.json`,JSON.stringify({checkedAt:new Date().toISOString(),baseUrl:base,
      database:process.env.DB_NAME,liveIntegrationAccepted:true,checks},null,2));
    console.log('Native Android fixtures saved. Credentials and tokens were not saved.');
  } finally {await db.end();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
