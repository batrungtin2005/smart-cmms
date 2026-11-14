import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadEnvFile } from 'node:process';

const envFile = fileURLToPath(new URL('../../.env', import.meta.url));
if (existsSync(envFile)) loadEnvFile(envFile);
const baseUrl = process.env.MOBILE_API_BASE_URL ||
  `http://127.0.0.1:${process.env.APP_PORT || 3000}/api/v1`;
const checks = [];

async function request(path, { method = 'GET', body, token } = {}) {
  const response = await fetch(`${baseUrl}/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  return { status: response.status, body: await response.json() };
}

function record(name) {
  checks.push(name);
  console.log(`PASS: ${name}`);
}

async function main() {
  assert.ok(process.env.DEFAULT_ADMIN_PASSWORD, 'Set DEFAULT_ADMIN_PASSWORD in local .env.');
  assert.ok(process.env.MOBILE_TECH_PASSWORD, 'Set MOBILE_TECH_PASSWORD in local .env.');
  const username = process.env.MOBILE_TECH_USERNAME || 'mobile_tech';

  const anonymous = await request('auth/me');
  assert.equal(anonymous.status, 401);
  record('Profile rejects requests without a token');

  const admin = await request('auth/login', {
    method: 'POST', body: { username: 'admin', password: process.env.DEFAULT_ADMIN_PASSWORD },
  });
  assert.equal(admin.status, 200, 'Admin login failed; existing passwords are never reset by this script.');
  assert.equal(admin.body.success, true);
  const adminToken = admin.body.data.accessToken;
  const roles = await request('auth/roles', { token: adminToken });
  assert.equal(roles.status, 200);
  const technicianRole = roles.body.data.find((role) => role.name === 'TECHNICIAN');
  assert.ok(technicianRole, 'TECHNICIAN role must exist.');

  const users = await request('auth/users', { token: adminToken });
  assert.equal(users.status, 200);
  const existing = users.body.data.find((user) => user.username === username);
  if (!existing) {
    const created = await request('auth/users', {
      method: 'POST', token: adminToken,
      body: {
        username, email: `${username}@smartcmms.test`,
        password: process.env.MOBILE_TECH_PASSWORD,
        fullName: 'Kỹ thuật viên Mobile', roleId: technicianRole.id,
      },
    });
    assert.equal(created.status, 201);
  } else {
    assert.equal(existing.role.name, 'TECHNICIAN', 'An existing non-technician account is left unchanged.');
  }
  record('Technician test account is available without changing existing accounts');

  const login = await request('auth/login', {
    method: 'POST', body: { username, password: process.env.MOBILE_TECH_PASSWORD },
  });
  assert.equal(login.status, 200, 'Technician login failed; check local test credentials.');
  assert.equal(login.body.success, true);
  assert.equal(login.body.data.tokenType, 'Bearer');
  assert.equal(login.body.data.user.role.name, 'TECHNICIAN');
  assert.equal(login.body.data.user.isActive, true);
  assert.equal('passwordHash' in login.body.data.user, false);
  assert.ok(login.body.data.accessToken);
  record('Real login returns a Bearer token and active technician profile');

  const profile = await request('auth/me', { token: login.body.data.accessToken });
  assert.equal(profile.status, 200);
  assert.equal(profile.body.data.id, login.body.data.user.id);
  assert.equal(profile.body.data.username, username);
  assert.equal('passwordHash' in profile.body.data, false);
  record('Bearer token retrieves the same profile without password hashes');

  const denied = await request('auth/users', { token: login.body.data.accessToken });
  assert.equal(denied.status, 403);
  record('Technician cannot access admin/manager user management');

  const incorrect = await request('auth/login', {
    method: 'POST', body: { username, password: 'incorrect-test-password' },
  });
  assert.equal(incorrect.status, 401);
  record('Wrong password is rejected');

  const invalid = await request('auth/me', { token: 'invalid-test-token' });
  assert.equal(invalid.status, 401);
  record('Invalid token is rejected');

  const reportDirectory = fileURLToPath(new URL('../.dart_tool/', import.meta.url));
  mkdirSync(reportDirectory, { recursive: true });
  writeFileSync(new URL('../.dart_tool/auth-api-report.json', import.meta.url),
    JSON.stringify({ baseUrl, checkedAt: new Date().toISOString(), checks }, null, 2));
  console.log('Credentials and tokens were not printed or saved to the report.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Authentication verification failed.');
  process.exitCode = 1;
});
