import { describe, expect, it } from 'vitest';
import { TemplateParameterMissingError } from '../src/errors.js';
import { actionRequestSchema, actionResponseSchema, resolveHref } from '../src/transaction.js';

describe('actionRequestSchema', () => {
  it('accepts a minimal request with just an address', () => {
    expect(actionRequestSchema.safeParse({ address: 'ckb1xyz' }).success).toBe(true);
  });

  it('accepts a request with params', () => {
    const body = { address: 'ckb1xyz', params: { amount: 100, asset: 'CKB', urgent: true } };
    expect(actionRequestSchema.safeParse(body).success).toBe(true);
  });

  it('rejects a request without an address', () => {
    expect(actionRequestSchema.safeParse({}).success).toBe(false);
  });

  it('rejects an empty address', () => {
    expect(actionRequestSchema.safeParse({ address: '' }).success).toBe(false);
  });

  it('rejects a param value that is not a primitive', () => {
    const body = { address: 'ckb1xyz', params: { meta: { nested: true } } };
    expect(actionRequestSchema.safeParse(body).success).toBe(false);
  });
});

describe('actionResponseSchema', () => {
  const moleculeOk = {
    type: 'transaction',
    encoding: 'molecule',
    otx: '0xdeadbeef',
  };
  const jsonOk = {
    type: 'transaction',
    encoding: 'json',
    otx: '{"inputs":[]}',
  };

  it('accepts a minimal molecule response', () => {
    expect(actionResponseSchema.safeParse(moleculeOk).success).toBe(true);
  });

  it('accepts a minimal json response', () => {
    expect(actionResponseSchema.safeParse(jsonOk).success).toBe(true);
  });

  it('accepts a response with message and callback', () => {
    const body = {
      ...moleculeOk,
      message: 'Tip 100 CKB to Truth',
      callback: 'https://example.com/confirm',
    };
    expect(actionResponseSchema.safeParse(body).success).toBe(true);
  });

  it('rejects a molecule OTX without the 0x prefix', () => {
    expect(actionResponseSchema.safeParse({ ...moleculeOk, otx: 'deadbeef' }).success).toBe(false);
  });

  it('rejects a molecule OTX with non-hex characters', () => {
    expect(actionResponseSchema.safeParse({ ...moleculeOk, otx: '0xzzz' }).success).toBe(false);
  });

  it('rejects an unknown encoding', () => {
    const body = { ...moleculeOk, encoding: 'cbor' };
    expect(actionResponseSchema.safeParse(body).success).toBe(false);
  });

  it('rejects a type other than "transaction"', () => {
    const body = { ...moleculeOk, type: 'action' };
    expect(actionResponseSchema.safeParse(body).success).toBe(false);
  });

  it('rejects a callback that is not a URL', () => {
    expect(actionResponseSchema.safeParse({ ...moleculeOk, callback: 'not-a-url' }).success).toBe(
      false,
    );
  });
});

describe('resolveHref', () => {
  it('returns the template unchanged when no placeholders are present', () => {
    expect(resolveHref('/tip/truth?amount=100')).toBe('/tip/truth?amount=100');
  });

  it('substitutes a single placeholder', () => {
    expect(resolveHref('/tip?amount={amount}', { amount: 100 })).toBe('/tip?amount=100');
  });

  it('substitutes multiple placeholders', () => {
    expect(resolveHref('/tip?amount={amount}&asset={asset}', { amount: 100, asset: 'CKB' })).toBe(
      '/tip?amount=100&asset=CKB',
    );
  });

  it('URI-encodes substituted values', () => {
    expect(resolveHref('/q?note={note}', { note: 'hello world!' })).toBe('/q?note=hello%20world!');
  });

  it('coerces non-string primitives via String()', () => {
    expect(resolveHref('/x?flag={flag}', { flag: true })).toBe('/x?flag=true');
  });

  it('throws TemplateParameterMissingError for an unresolved placeholder', () => {
    expect(() => resolveHref('/tip?amount={amount}', {})).toThrow(TemplateParameterMissingError);
  });

  it('reports the missing parameter name on the thrown error', () => {
    try {
      resolveHref('/x?v={v}&w={w}', { v: 1 });
      expect.fail('expected resolveHref to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateParameterMissingError);
      expect((err as TemplateParameterMissingError).parameterName).toBe('w');
    }
  });
});
