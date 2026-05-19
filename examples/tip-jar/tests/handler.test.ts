import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ccc } from '@ckb-ccc/core';
import { isWireErrorCode, SdkError, toErrorResponse } from '@ckb-actions/sdk';
import type { ErrorRequestHandler } from 'express';
import { buildTipJarRouter } from '../src/index.js';

const VALID_TESTNET_ADDRESS =
  'ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqwdehxumnwdehxumnwdehxumnwdehxumnghf47ya';

const passthroughErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof SdkError && isWireErrorCode(err.tag)) {
    res.status(400).json(toErrorResponse(err));
    return;
  }
  res
    .status(500)
    .json({ error: 'INTERNAL', message: err instanceof Error ? err.message : String(err) });
};

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/tip', buildTipJarRouter('/tip'));
  app.use(passthroughErrorHandler);
  return app;
}

describe('GET /tip', () => {
  const app = buildTestApp();

  it('returns the manifest with X-CKB-Action: true', async () => {
    const res = await request(app).get('/tip');
    expect(res.status).toBe(200);
    expect(res.headers['x-ckb-action']).toBe('true');
    expect(res.body.type).toBe('action');
    expect(res.body.network).toBe('testnet');
    expect(res.body.links.actions.length).toBeGreaterThan(0);
  });

  it('returns hrefs rooted at the configured mount path', async () => {
    const res = await request(app).get('/tip');
    for (const action of res.body.links.actions) {
      expect(action.href.startsWith('/tip/submit')).toBe(true);
    }
  });
});

describe('POST /tip/submit', () => {
  const app = buildTestApp();

  it('returns a molecule-encoded OTX for a valid request', async () => {
    const res = await request(app)
      .post('/tip/submit?amount=100')
      .send({ address: VALID_TESTNET_ADDRESS });

    expect(res.status).toBe(200);
    expect(res.body.type).toBe('transaction');
    expect(res.body.encoding).toBe('molecule');
    expect(res.body.otx).toMatch(/^0x[0-9a-f]+$/);
    expect(res.body.message).toContain('100 CKB');
  });

  it('builds a transaction whose first output capacity equals the tip amount', async () => {
    const res = await request(app)
      .post('/tip/submit?amount=200')
      .send({ address: VALID_TESTNET_ADDRESS });

    const tx = ccc.Transaction.fromBytes(ccc.bytesFrom(res.body.otx));
    expect(tx.outputs.length).toBe(1);
    expect(tx.outputs[0]?.capacity).toBe(200n * 100_000_000n);
  });

  it('returns INVALID_PARAMS when amount is below the minimum', async () => {
    const res = await request(app)
      .post('/tip/submit?amount=10')
      .send({ address: VALID_TESTNET_ADDRESS });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_PARAMS');
  });

  it('returns INVALID_PARAMS when amount is missing', async () => {
    const res = await request(app).post('/tip/submit').send({ address: VALID_TESTNET_ADDRESS });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_PARAMS');
  });

  it('returns INVALID_PARAMS when address is missing', async () => {
    const res = await request(app).post('/tip/submit?amount=100').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_PARAMS');
  });

  it('returns INVALID_ADDRESS when address is malformed', async () => {
    const res = await request(app)
      .post('/tip/submit?amount=100')
      .send({ address: 'not-a-ckb-address' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_ADDRESS');
  });
});
