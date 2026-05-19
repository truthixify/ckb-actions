import { isWireErrorCode, SdkError, toErrorResponse } from '@ckb-actions/sdk';
import { ccc } from '@ckb-ccc/core';
import express, { type ErrorRequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildTipJarRouter } from '../src/index.js';

const VALID_TESTNET_ADDRESS =
  'ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqwdehxumnwdehxumnwdehxumnwdehxumnghf47ya';
const RECIPIENT_QS = `recipient=${encodeURIComponent(VALID_TESTNET_ADDRESS)}`;

const passthroughErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof SdkError && isWireErrorCode(err.tag)) {
    res.status(400).json(toErrorResponse(err));
    return;
  }
  res.status(500).json({
    error: 'INTERNAL',
    message: err instanceof Error ? err.message : String(err),
  });
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

  it('returns the manifest with X-CKB-Action: true for a valid recipient', async () => {
    const res = await request(app).get(`/tip?${RECIPIENT_QS}`);
    expect(res.status).toBe(200);
    expect(res.headers['x-ckb-action']).toBe('true');
    expect(res.body.type).toBe('action');
    expect(res.body.network).toBe('testnet');
  });

  it('embeds the recipient in every action href', async () => {
    const res = await request(app).get(`/tip?${RECIPIENT_QS}`);
    for (const action of res.body.links.actions) {
      expect(action.href).toContain(`recipient=${encodeURIComponent(VALID_TESTNET_ADDRESS)}`);
    }
  });

  it('returns 400 INVALID_PARAMS when recipient is missing', async () => {
    const res = await request(app).get('/tip');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_PARAMS');
  });

  it('returns 400 INVALID_PARAMS when recipient is malformed', async () => {
    const res = await request(app).get('/tip?recipient=not-a-ckb-address');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_PARAMS');
  });
});

describe('POST /tip/submit', () => {
  const app = buildTestApp();

  it('returns a molecule OTX paying the parsed recipient', async () => {
    const res = await request(app)
      .post(`/tip/submit?amount=100&${RECIPIENT_QS}`)
      .send({ address: VALID_TESTNET_ADDRESS });

    expect(res.status).toBe(200);
    expect(res.body.type).toBe('transaction');
    expect(res.body.encoding).toBe('molecule');

    const tx = ccc.Transaction.fromBytes(ccc.bytesFrom(res.body.otx));
    const expectedAddr = await ccc.Address.fromString(
      VALID_TESTNET_ADDRESS,
      new ccc.ClientPublicTestnet(),
    );
    expect(tx.outputs.length).toBe(1);
    expect(tx.outputs[0]?.lock.hash()).toBe(expectedAddr.script.hash());
    expect(tx.outputs[0]?.capacity).toBe(100n * 100_000_000n);
  });

  it('returns INVALID_PARAMS when recipient is missing', async () => {
    const res = await request(app)
      .post('/tip/submit?amount=100')
      .send({ address: VALID_TESTNET_ADDRESS });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_PARAMS');
  });

  it('returns INVALID_PARAMS when amount is below the minimum', async () => {
    const res = await request(app)
      .post(`/tip/submit?amount=10&${RECIPIENT_QS}`)
      .send({ address: VALID_TESTNET_ADDRESS });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_PARAMS');
  });

  it('returns INVALID_ADDRESS when consumer address is malformed', async () => {
    const res = await request(app)
      .post(`/tip/submit?amount=100&${RECIPIENT_QS}`)
      .send({ address: 'not-a-ckb-address' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_ADDRESS');
  });

  it('returns INVALID_PARAMS when recipient is malformed', async () => {
    const res = await request(app)
      .post('/tip/submit?amount=100&recipient=bogus')
      .send({ address: VALID_TESTNET_ADDRESS });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_PARAMS');
  });
});
