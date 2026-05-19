import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Config } from '../src/config.js';
import { createLogger } from '../src/logger.js';

const testConfig: Config = {
  PORT: 0,
  HOST: '127.0.0.1',
  NODE_ENV: 'test',
  LOG_LEVEL: 'error',
  CORS_ORIGIN: '*',
};

const silentLogger = createLogger({ level: 'error' });
const app = createApp({ config: testConfig, logger: silentLogger });

describe('GET /health', () => {
  it('returns 200 with a fixed status body', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('request id middleware', () => {
  it('echoes an inbound X-Request-Id header back on the response', async () => {
    const res = await request(app).get('/health').set('X-Request-Id', 'abc-123');
    expect(res.headers['x-request-id']).toBe('abc-123');
  });

  it('generates a UUID when no X-Request-Id is provided', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});

describe('unknown routes', () => {
  it('return 404', async () => {
    const res = await request(app).get('/does-not-exist');
    expect(res.status).toBe(404);
  });
});

describe('CORS', () => {
  it('echoes the origin when a request includes one', async () => {
    const res = await request(app).get('/health').set('Origin', 'https://example.com');
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });
});
