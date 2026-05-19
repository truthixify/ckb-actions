import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  InvalidActionUrlError,
  ManifestParseError,
  NetworkError,
  UnexpectedResponseError,
} from '../src/errors.js';
import { fetchManifest, parseActionUrl } from '../src/url.js';

const validManifest = {
  type: 'action',
  title: 'Tip',
  description: '',
  icon: 'https://example.com/i.png',
  label: 'Tip',
  network: 'mainnet',
  links: { actions: [{ label: 'Send', href: '/tip' }] },
};

const okHeaders = {
  'content-type': 'application/json',
  'x-ckb-action': 'true',
};

describe('parseActionUrl', () => {
  it('accepts a bare https URL', () => {
    expect(parseActionUrl('https://example.com/tip').href).toBe('https://example.com/tip');
  });

  it('strips the ckb-action: prefix', () => {
    expect(parseActionUrl('ckb-action:https://example.com/tip').href).toBe(
      'https://example.com/tip',
    );
  });

  it('accepts http://localhost', () => {
    expect(parseActionUrl('http://localhost:3000/tip').href).toBe('http://localhost:3000/tip');
  });

  it('accepts http://127.0.0.1', () => {
    expect(parseActionUrl('http://127.0.0.1:3000/tip').href).toBe('http://127.0.0.1:3000/tip');
  });

  it('rejects http on a non-localhost host', () => {
    expect(() => parseActionUrl('http://example.com/tip')).toThrow(InvalidActionUrlError);
  });

  it('rejects a non-URL input', () => {
    expect(() => parseActionUrl('not-a-url')).toThrow(InvalidActionUrlError);
  });

  it('rejects a non-http(s) scheme', () => {
    expect(() => parseActionUrl('ftp://example.com/tip')).toThrow(InvalidActionUrlError);
  });
});

describe('fetchManifest', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  function stubFetchWith(body: unknown, init: ResponseInit = { status: 200, headers: okHeaders }) {
    const payload = typeof body === 'string' ? body : JSON.stringify(body);
    const mock = vi.fn().mockResolvedValue(new Response(payload, init));
    vi.stubGlobal('fetch', mock);
    return mock;
  }

  it('returns the parsed manifest on a valid response', async () => {
    stubFetchWith(validManifest);
    const manifest = await fetchManifest('https://example.com/tip');
    expect(manifest.title).toBe('Tip');
  });

  it('throws InvalidActionUrlError before fetching when URL is malformed', async () => {
    const mock = stubFetchWith(validManifest);
    await expect(fetchManifest('not-a-url')).rejects.toBeInstanceOf(InvalidActionUrlError);
    expect(mock).not.toHaveBeenCalled();
  });

  it('throws NetworkError when fetch rejects', async () => {
    const mock = vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', mock);
    await expect(fetchManifest('https://example.com/tip')).rejects.toBeInstanceOf(NetworkError);
  });

  it('throws UnexpectedResponseError on non-2xx status', async () => {
    stubFetchWith('not found', { status: 404, headers: okHeaders });
    await expect(fetchManifest('https://example.com/tip')).rejects.toBeInstanceOf(
      UnexpectedResponseError,
    );
  });

  it('throws UnexpectedResponseError when content-type is not JSON', async () => {
    stubFetchWith(validManifest, {
      status: 200,
      headers: { 'content-type': 'text/html', 'x-ckb-action': 'true' },
    });
    await expect(fetchManifest('https://example.com/tip')).rejects.toBeInstanceOf(
      UnexpectedResponseError,
    );
  });

  it('throws UnexpectedResponseError when X-CKB-Action header is missing', async () => {
    stubFetchWith(validManifest, {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
    await expect(fetchManifest('https://example.com/tip')).rejects.toBeInstanceOf(
      UnexpectedResponseError,
    );
  });

  it('throws ManifestParseError when body does not match the schema', async () => {
    stubFetchWith({ ...validManifest, type: 'transaction' });
    await expect(fetchManifest('https://example.com/tip')).rejects.toBeInstanceOf(
      ManifestParseError,
    );
  });

  it('accepts content-type with a charset suffix', async () => {
    stubFetchWith(validManifest, {
      status: 200,
      headers: { 'content-type': 'application/json; charset=utf-8', 'x-ckb-action': 'true' },
    });
    const manifest = await fetchManifest('https://example.com/tip');
    expect(manifest.title).toBe('Tip');
  });
});
