// Read-only readiness check: login plus GETs; never writes Work Orders or inventory.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

const envFile = fileURLToPath(new URL('../../.env', import.meta.url));
if (existsSync(envFile)) loadEnvFile(envFile);
const baseUrl = process.env.MOBILE_API_BASE_URL || 'http://127.0.0.1:3000/api/v1';
async function request(path, { method = 'GET', body, token } = {}) {
  const response = await fetch(`${baseUrl}/${path}`, { method,
    headers: { 'Content-Type':'application/json', ...(token ? { Authorization:`Bearer ${token}` } : {}) },
    ...(body ? { body:JSON.stringify(body) } : {}), signal:AbortSignal.timeout(15000) });
  return { status:response.status, body:await response.json() };
}
async function main() {
  const login = await request('auth/login', { method:'POST', body:{
    username:process.env.MOBILE_TECH_USERNAME || 'mobile_tech', password:process.env.MOBILE_TECH_PASSWORD } });
  assert.equal(login.status,200,'Test technician login failed. Check local .env credentials.');
  const token = login.body.data.accessToken;
  const tasks = await request('work-orders/my-tasks?page=1&limit=20',{token});
  const parts = await request('parts?page=1&limit=20',{token});
  const output = fileURLToPath(new URL('../build/verification/',import.meta.url));
  mkdirSync(output,{recursive:true});
  writeFileSync(`${output}/work-orders-api-readiness.json`,JSON.stringify({
    checkedAt:new Date().toISOString(), baseUrl,
    myTasksHttpStatus:tasks.status, partsHttpStatus:parts.status,
    myTasksEndpointAvailable:tasks.status===200, partsEndpointAvailable:parts.status===200,
    liveIntegrationAccepted:false,
    note:'Read-only check. SV03 contract, ownership and atomic mutations still require acceptance tests.',
  },null,2));
  console.log(`Work Order my-tasks endpoint: HTTP ${tasks.status}${tasks.status===404?' (not implemented)':''}`);
  console.log(`Parts catalog endpoint: HTTP ${parts.status}`);
  console.log('Live integration has NOT been accepted by this read-only check. No Work Order or inventory writes were made.');
}
main().catch((error)=>{ console.error(error instanceof Error?error.message:'Readiness check failed.');process.exitCode=1; });
