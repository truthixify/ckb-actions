import { isWireErrorCode, SdkError, toErrorResponse } from '@ckb-actions/sdk';
import express, { type ErrorRequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildInvoiceRouter } from '../src/index.js';

const VALID_TESTNET_ADDRESS =
  'ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqwdehxumnwdehxumnwdehxumnwdehxumnghf47ya';

const passthroughErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof SdkError && isWireErrorCode(err.tag)) {
    const statusByTag: Record<string, number> = { EXPIRED: 410 };
    res.status(statusByTag[err.tag] ?? 400).json(toErrorResponse(err));
    return;
  }
  res.status(500).json({
    error: 'INTERNAL',
    message: err instanceof Error ? err.message : String(err),
  });
};

function buildTestApp() {
  const { router, store } = buildInvoiceRouter({ baseUrl: '/inv' });
  const app = express();
  app.use(express.json());
  app.use('/inv', router);
  app.use(passthroughErrorHandler);
  return { app, store };
}

async function seedInvoice(
  app: express.Express,
  body: { amount: number; description: string; recipient: string },
): Promise<string> {
  const res = await request(app).post('/inv/create').send(body);
  expect(res.status).toBe(201);
  return res.body.id;
}

describe('POST /inv/create', () => {
  it('creates a new invoice and returns the manifest URL', async () => {
    const { app } = buildTestApp();
    const res = await request(app).post('/inv/create').send({
      amount: 100,
      description: 'Test invoice',
      recipient: VALID_TESTNET_ADDRESS,
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(/^[0-9a-f-]+$/);
    expect(res.body.manifestUrl).toBe(`/inv/${res.body.id}`);
  });

  it('returns INVALID_PARAMS when amount is below the minimum', async () => {
    const { app } = buildTestApp();
    const res = await request(app).post('/inv/create').send({
      amount: 10,
      description: 'Too small',
      recipient: VALID_TESTNET_ADDRESS,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_PARAMS');
  });

  it('returns INVALID_PARAMS when recipient is not a CKB address', async () => {
    const { app } = buildTestApp();
    const res = await request(app).post('/inv/create').send({
      amount: 100,
      description: 'Bad recipient',
      recipient: 'not-a-ckb-address',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_PARAMS');
  });
});

describe('GET /inv/:id', () => {
  it('returns the manifest for a created invoice', async () => {
    const { app } = buildTestApp();
    const id = await seedInvoice(app, {
      amount: 100,
      description: 'Demo',
      recipient: VALID_TESTNET_ADDRESS,
    });
    const res = await request(app).get(`/inv/${id}`);
    expect(res.status).toBe(200);
    expect(res.headers['x-ckb-action']).toBe('true');
    expect(res.body.type).toBe('action');
    expect(res.body.links.actions[0].href).toBe(`/inv/${id}/submit`);
  });

  it('returns 404 for an unknown invoice id', async () => {
    const { app } = buildTestApp();
    const res = await request(app).get('/inv/unknown');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('INVALID_PARAMS');
  });
});

describe('POST /inv/:id/submit', () => {
  it('returns an OTX with the invoice amount as the output capacity', async () => {
    const { app } = buildTestApp();
    const id = await seedInvoice(app, {
      amount: 100,
      description: 'Demo',
      recipient: VALID_TESTNET_ADDRESS,
    });
    const res = await request(app)
      .post(`/inv/${id}/submit`)
      .send({ address: VALID_TESTNET_ADDRESS });
    expect(res.status).toBe(200);
    expect(res.body.type).toBe('transaction');
    expect(res.body.encoding).toBe('molecule');
    expect(res.body.callback).toBe(`/inv/${id}/callback`);
    expect(res.body.message).toContain('100 CKB');
  });

  it('returns 410 EXPIRED when invoice has already been paid', async () => {
    const { app, store } = buildTestApp();
    const id = await seedInvoice(app, {
      amount: 100,
      description: 'Demo',
      recipient: VALID_TESTNET_ADDRESS,
    });
    store.markPaid(id, `0x${'aa'.repeat(32)}`);
    const res = await request(app)
      .post(`/inv/${id}/submit`)
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

  it('returns INVALID_ADDRESS for a malformed consumer address', async () => {
    const { app } = buildTestApp();
    const id = await seedInvoice(app, {
      amount: 100,
      description: 'Demo',
      recipient: VALID_TESTNET_ADDRESS,
    });
    const res = await request(app).post(`/inv/${id}/submit`).send({ address: 'bogus' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_ADDRESS');
  });
});

describe('POST /inv/:id/callback', () => {
  it('marks the invoice paid and returns ok', async () => {
    const { app, store } = buildTestApp();
    const id = await seedInvoice(app, {
      amount: 100,
      description: 'Demo',
      recipient: VALID_TESTNET_ADDRESS,
    });
    const txHash = `0x${'aa'.repeat(32)}`;
    const res = await request(app).post(`/inv/${id}/callback`).send({ txHash });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(store.get(id)?.paidAt).toBeInstanceOf(Date);
    expect(store.get(id)?.txHash).toBe(txHash);
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
    const id = await seedInvoice(app, {
      amount: 100,
      description: 'Demo',
      recipient: VALID_TESTNET_ADDRESS,
    });
    const res = await request(app).post(`/inv/${id}/callback`).send({ txHash: 'not-a-hash' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_PARAMS');
  });
});
