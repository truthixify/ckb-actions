import { isWireErrorCode, SdkError, toErrorResponse } from '@ckb-actions/sdk';
import express, { type ErrorRequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildInvoiceRouter } from '../src/index.js';

const VALID_TESTNET_ADDRESS =
  'ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqwdehxumnwdehxumnwdehxumnwdehxumnghf47ya';

const passthroughErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof SdkError && isWireErrorCode(err.tag)) {
    const statusByTag: Record<string, number> = {
      EXPIRED: 410,
    };
    res.status(statusByTag[err.tag] ?? 400).json(toErrorResponse(err));
    return;
  }
  res.status(500).json({
    error: 'INTERNAL',
    message: err instanceof Error ? err.message : String(err),
  });
};

function buildTestApp() {
  const { router, store } = buildInvoiceRouter({ baseUrl: '/inv', seedDemo: true });
  const app = express();
  app.use(express.json());
  app.use('/inv', router);
  app.use(passthroughErrorHandler);
  return { app, store };
}

describe('GET /inv/:id', () => {
  const { app } = buildTestApp();

  it('returns the manifest for the seeded demo invoice', async () => {
    const res = await request(app).get('/inv/demo');
    expect(res.status).toBe(200);
    expect(res.headers['x-ckb-action']).toBe('true');
    expect(res.body.type).toBe('action');
    expect(res.body.links.actions[0].href).toBe('/inv/demo/submit');
  });

  it('returns 404 for an unknown invoice id', async () => {
    const res = await request(app).get('/inv/unknown');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('INVALID_PARAMS');
  });
});

describe('POST /inv/:id/submit', () => {
  it('returns an OTX with the invoice amount as the output capacity', async () => {
    const { app } = buildTestApp();
    const res = await request(app)
      .post('/inv/demo/submit')
      .send({ address: VALID_TESTNET_ADDRESS });
    expect(res.status).toBe(200);
    expect(res.body.type).toBe('transaction');
    expect(res.body.encoding).toBe('molecule');
    expect(res.body.callback).toBe('/inv/demo/callback');
    expect(res.body.message).toContain('100 CKB');
  });

  it('returns 410 EXPIRED when invoice has already been paid', async () => {
    const { app, store } = buildTestApp();
    store.markPaid('demo', `0x${'aa'.repeat(32)}`);
    const res = await request(app)
      .post('/inv/demo/submit')
      .send({ address: VALID_TESTNET_ADDRESS });
    expect(res.status).toBe(410);
    expect(res.body.error).toBe('EXPIRED');
  });

  it('returns INVALID_PARAMS for an unknown invoice', async () => {
    const { app } = buildTestApp();
    const res = await request(app)
      .post('/inv/unknown/submit')
      .send({ address: VALID_TESTNET_ADDRESS });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_PARAMS');
  });

  it('returns INVALID_ADDRESS for a malformed address', async () => {
    const { app } = buildTestApp();
    const res = await request(app).post('/inv/demo/submit').send({ address: 'bogus' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_ADDRESS');
  });
});

describe('POST /inv/:id/callback', () => {
  it('marks the invoice paid and returns ok', async () => {
    const { app, store } = buildTestApp();
    const res = await request(app)
      .post('/inv/demo/callback')
      .send({ txHash: `0x${'aa'.repeat(32)}` });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(store.get('demo')?.paidAt).toBeInstanceOf(Date);
    expect(store.get('demo')?.txHash).toBe(`0x${'aa'.repeat(32)}`);
  });

  it('returns INVALID_PARAMS for an unknown invoice', async () => {
    const { app } = buildTestApp();
    const res = await request(app)
      .post('/inv/unknown/callback')
      .send({ txHash: `0x${'aa'.repeat(32)}` });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_PARAMS');
  });

  it('returns INVALID_PARAMS for a malformed tx hash', async () => {
    const { app } = buildTestApp();
    const res = await request(app).post('/inv/demo/callback').send({ txHash: 'not-a-hash' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_PARAMS');
  });
});
