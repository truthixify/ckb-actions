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

const SAMPLE_TESTNET_ADDRESS =
  'ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqwdehxumnwdehxumnwdehxumnwdehxumnghf47ya';
const TIP_RECIPIENT_QS = `recipient=${encodeURIComponent(SAMPLE_TESTNET_ADDRESS)}`;

describe('GET /actions/tip-jar (mounted example)', () => {
  it('serves the tip jar manifest with X-CKB-Action: true when a recipient is supplied', async () => {
    const res = await request(app).get(`/actions/tip-jar?${TIP_RECIPIENT_QS}`);
    expect(res.status).toBe(200);
    expect(res.headers['x-ckb-action']).toBe('true');
    expect(res.body.type).toBe('action');
    expect(res.body.network).toBe('testnet');
  });

  it('returns hrefs rooted at the configured mount path', async () => {
    const res = await request(app).get(`/actions/tip-jar?${TIP_RECIPIENT_QS}`);
    for (const action of res.body.links.actions) {
      expect(action.href.startsWith('/actions/tip-jar/submit')).toBe(true);
    }
  });

  it('returns 400 INVALID_PARAMS when no recipient is supplied', async () => {
    const res = await request(app).get('/actions/tip-jar');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_PARAMS');
  });
});

describe('POST /actions/tip-jar/submit (mounted example)', () => {
  it('returns 400 INVALID_ADDRESS for a malformed consumer address', async () => {
    const res = await request(app)
      .post(`/actions/tip-jar/submit?amount=100&${TIP_RECIPIENT_QS}`)
      .send({ address: 'not-a-ckb-address' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_ADDRESS');
  });
});
