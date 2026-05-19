import { describe, expect, it } from 'vitest';
import {
  errorResponseSchema,
  ExpiredError,
  fromErrorResponse,
  InsufficientCapacityError,
  InternalError,
  InvalidAddressError,
  InvalidParamsError,
  isWireErrorCode,
  ManifestParseError,
  NetworkError,
  SdkError,
  TemplateParameterMissingError,
  toErrorResponse,
  UnsupportedNetworkError,
} from '../src/errors.js';

describe('errorResponseSchema', () => {
  it('accepts a well-formed §6.3 body', () => {
    const body = { error: 'INSUFFICIENT_CAPACITY', message: 'broke' };
    expect(errorResponseSchema.safeParse(body).success).toBe(true);
  });

  it('rejects an unknown error code', () => {
    const body = { error: 'NOT_A_CODE', message: 'x' };
    expect(errorResponseSchema.safeParse(body).success).toBe(false);
  });

  it('rejects a body missing the message field', () => {
    expect(errorResponseSchema.safeParse({ error: 'INTERNAL' }).success).toBe(false);
  });
});

describe('wire error classes', () => {
  it('carry the matching §6.3 tag', () => {
    expect(new InvalidAddressError('x').tag).toBe('INVALID_ADDRESS');
    expect(new InsufficientCapacityError('x').tag).toBe('INSUFFICIENT_CAPACITY');
    expect(new InvalidParamsError('x').tag).toBe('INVALID_PARAMS');
    expect(new UnsupportedNetworkError('x').tag).toBe('UNSUPPORTED_NETWORK');
    expect(new ExpiredError('x').tag).toBe('EXPIRED');
    expect(new InternalError('x').tag).toBe('INTERNAL');
  });

  it('expose their constructor name as Error#name', () => {
    expect(new InvalidAddressError('x').name).toBe('InvalidAddressError');
  });

  it('are SdkError instances', () => {
    expect(new InvalidAddressError('x')).toBeInstanceOf(SdkError);
  });
});

describe('TemplateParameterMissingError', () => {
  it('records which parameter was missing', () => {
    const err = new TemplateParameterMissingError('amount');
    expect(err.parameterName).toBe('amount');
    expect(err.message).toContain('amount');
  });

  it('is an SdkError but not a wire code', () => {
    const err = new TemplateParameterMissingError('x');
    expect(err).toBeInstanceOf(SdkError);
    expect(isWireErrorCode(err.tag)).toBe(false);
  });
});

describe('isWireErrorCode', () => {
  it('returns true for §6.3 codes', () => {
    expect(isWireErrorCode('INVALID_ADDRESS')).toBe(true);
    expect(isWireErrorCode('INTERNAL')).toBe(true);
  });

  it('returns false for SDK-internal tags', () => {
    expect(isWireErrorCode('manifest_parse_error')).toBe(false);
    expect(isWireErrorCode('network_error')).toBe(false);
  });
});

describe('toErrorResponse', () => {
  it('serializes a wire-tagged error to the §6.3 shape', () => {
    expect(toErrorResponse(new InvalidAddressError('bad addr'))).toEqual({
      error: 'INVALID_ADDRESS',
      message: 'bad addr',
    });
  });

  it('returns null for SDK-internal errors', () => {
    expect(toErrorResponse(new ManifestParseError('parse failed'))).toBeNull();
    expect(toErrorResponse(new NetworkError('offline'))).toBeNull();
  });
});

describe('fromErrorResponse', () => {
  it('reconstructs the typed error for each §6.3 code', () => {
    expect(fromErrorResponse({ error: 'INVALID_ADDRESS', message: 'x' })).toBeInstanceOf(
      InvalidAddressError,
    );
    expect(fromErrorResponse({ error: 'INSUFFICIENT_CAPACITY', message: 'x' })).toBeInstanceOf(
      InsufficientCapacityError,
    );
    expect(fromErrorResponse({ error: 'INVALID_PARAMS', message: 'x' })).toBeInstanceOf(
      InvalidParamsError,
    );
    expect(fromErrorResponse({ error: 'UNSUPPORTED_NETWORK', message: 'x' })).toBeInstanceOf(
      UnsupportedNetworkError,
    );
    expect(fromErrorResponse({ error: 'EXPIRED', message: 'x' })).toBeInstanceOf(ExpiredError);
    expect(fromErrorResponse({ error: 'INTERNAL', message: 'x' })).toBeInstanceOf(InternalError);
  });

  it('preserves the original message', () => {
    expect(fromErrorResponse({ error: 'EXPIRED', message: 'too late' }).message).toBe('too late');
  });
});
