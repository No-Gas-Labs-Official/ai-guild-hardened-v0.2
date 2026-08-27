const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

const { loadRuntimeConfig } = require('../runtime-config');
const { createApp } = require('../server');

function productionEnvironment(overrides = {}) {
  return {
    NODE_ENV: 'production',
    APP_CORS_ORIGINS: 'https://console.example.test',
    JWT_SECRET: 'non-secret-test-value-with-at-least-thirty-two-characters',
    DB_HOST: 'db.example.test',
    DB_NAME: 'guild',
    DB_USER: 'guild_user',
    DB_PASSWORD: 'non-secret-test-database-password',
    REDIS_HOST: 'redis.example.test',
    ...overrides,
  };
}

async function withServer(app, callback) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

async function request(base, path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  return { status: response.status, body: await response.json(), headers: response.headers };
}

test('production runtime configuration fails closed on unsafe settings', () => {
  assert.throws(() => loadRuntimeConfig(productionEnvironment({ JWT_SECRET: 'nogaslabs-super-secret-key' })), /JWT_SECRET/);
  assert.throws(() => loadRuntimeConfig(productionEnvironment({ APP_READ_ONLY: 'false' })), /APP_READ_ONLY/);
  assert.throws(() => loadRuntimeConfig(productionEnvironment({ APP_CORS_ORIGINS: '' })), /APP_CORS_ORIGINS/);
  assert.throws(() => loadRuntimeConfig(productionEnvironment({ ENABLE_PUBLIC_UPLOADS: 'true' })), /ENABLE_PUBLIC_UPLOADS/);
});

test('read-only platform exposes only health/readiness and blocks operational API routes', async () => {
  const config = loadRuntimeConfig(productionEnvironment());
  await withServer(createApp({ config }), async (base) => {
    const health = await request(base, '/health');
    assert.equal(health.status, 200);
    assert.equal(health.body.status, 'ok');

    const readiness = await request(base, '/ready');
    assert.equal(readiness.status, 200);
    assert.equal(readiness.body.read_only, true);
    assert.equal(readiness.body.external_actions_automatically_enabled, false);

    const repos = await request(base, '/api/repos');
    assert.equal(repos.status, 503);
    assert.equal(repos.body.error, 'read_only_baseline');

    const register = await request(base, '/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    assert.equal(register.status, 503);
    assert.equal(register.body.error, 'read_only_baseline');

    const unknown = await request(base, '/uploads/example.png');
    assert.equal(unknown.status, 404);
    assert.equal(unknown.body.error, 'not_found');
    assert.ok(unknown.headers.get('x-request-id'));
  });
});
