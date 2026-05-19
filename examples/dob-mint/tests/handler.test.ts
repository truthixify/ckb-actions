import { isWireErrorCode, SdkError, toErrorResponse } from '@ckb-actions/sdk';
import { ccc } from '@ckb-ccc/core';
import express, { type ErrorRequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { CLUSTER_ID, CLUSTER_TYPE_CODE_HASH, SPORE_TYPE_CODE_HASH } from '../src/config.js';
import { buildDobMintRouter } from '../src/index.js';

const VALID_TESTNET_ADDRESS =
  'ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqwdehxumnwdehxumnwdehxumnwdehxumnghf47ya';

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
  app.use('/dob', buildDobMintRouter('/dob'));
  app.use(passthroughErrorHandler);
  return app;
}

describe('GET /dob', () => {
  const app = buildTestApp();

  it('returns the single-action mint manifest', async () => {
    const res = await request(app).get('/dob');
    expect(res.status).toBe(200);
    expect(res.headers['x-ckb-action']).toBe('true');
    expect(res.body.links.actions.length).toBe(1);
    expect(res.body.links.actions[0].href).toBe('/dob/submit');
  });
});

describe('POST /dob/submit', () => {
  const app = buildTestApp();

  it('returns a molecule-encoded OTX with two outputs', async () => {
    const res = await request(app).post('/dob/submit').send({ address: VALID_TESTNET_ADDRESS });
    expect(res.status).toBe(200);
    expect(res.body.type).toBe('transaction');
    expect(res.body.encoding).toBe('molecule');

    const tx = ccc.Transaction.fromBytes(ccc.bytesFrom(res.body.otx));
    expect(tx.outputs.length).toBe(2);
    expect(tx.outputs[0]?.type?.codeHash).toBe(CLUSTER_TYPE_CODE_HASH);
    expect(tx.outputs[0]?.type?.args).toBe(CLUSTER_ID);
    expect(tx.outputs[1]?.type?.codeHash).toBe(SPORE_TYPE_CODE_HASH);
    expect(tx.inputs.length).toBe(1);
    expect(tx.witnesses.length).toBe(1);
  });

  it('derives the spore id from the consumer lock hash', async () => {
    const res = await request(app).post('/dob/submit').send({ address: VALID_TESTNET_ADDRESS });
    const tx = ccc.Transaction.fromBytes(ccc.bytesFrom(res.body.otx));
    const consumerAddr = await ccc.Address.fromString(
      VALID_TESTNET_ADDRESS,
      new ccc.ClientPublicTestnet(),
    );
    expect(tx.outputs[1]?.type?.args).toBe(consumerAddr.script.hash());
  });

  it('returns INVALID_ADDRESS for a malformed address', async () => {
    const res = await request(app).post('/dob/submit').send({ address: 'bogus' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_ADDRESS');
  });

  it('returns INVALID_PARAMS when address is missing', async () => {
    const res = await request(app).post('/dob/submit').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_PARAMS');
  });
});
