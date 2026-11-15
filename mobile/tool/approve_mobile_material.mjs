// Local demo helper for a separate Admin/warehouse action, never called by Flutter.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
loadEnvFile(`${root}/.env`);
const base=process.env.MOBILE_API_BASE_URL||'http://127.0.0.1:3000/api/v1';
async function api(path,token,{method='GET',body}={}) {
  const response=await fetch(`${base}/${path}`,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},
    ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
  assert.ok(response.ok,`${method} ${path}: HTTP ${response.status}`);
  return (await response.json()).data;
}
async function main(){
  assert.equal(process.env.DB_NAME,'smart_cmms_mobile_dev');
  assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
  const fixture=JSON.parse(readFileSync(`${root}/mobile/build/verification/work-orders-live-fixture.json`,'utf8'));
  assert.equal(fixture.database,process.env.DB_NAME);
  const target=fixture.orders.find(item=>item.priority==='CRITICAL');
  const admin=await api('auth/login',null,{method:'POST',body:{username:'admin',password:process.env.DEFAULT_ADMIN_PASSWORD}});
  const token=admin.accessToken;
  const wo=await api(`work-orders/${target.id}`,token);
  assert.ok(wo.title.startsWith('[SV05 DEMO ') && wo.assignedTechnicianId===fixture.technicianId);
  const list=await api(`material-requests?workOrderId=${target.id}&status=PENDING`,token);
  assert.equal(list.items.length,1,'Expected exactly one pending request for this demo; create it in the mobile app first.');
  const request=await api(`material-requests/${list.items[0].id}`,token);
  assert.equal(request.requestedById,fixture.technicianId);
  assert.equal(request.workOrderId,target.id);
  assert.ok(request.items.length>0 && request.items.every(item=>item.partId===fixture.partId));
  await api(`material-requests/${request.id}/approve`,token,{method:'PATCH'});
  console.log('Admin approved and issued materials for the selected SV05 demo job. Tap Cập nhật công việc in the app.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
