import { InvalidAddressError, NetworkError } from '@ckb-actions/sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { submitAction } from '../src/lib/api';

const okResponse = {
  type: 'transaction',
  encoding: 'molecule',
  otx: '0xdeadbeef',
};

describe('submitAction', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('POSTs to the resolved href and returns the parsed response', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(okResponse), { status: 200 }));
    vi.stubGlobal('fetch', mockFetch);

    const response = await submitAction(
      'https://example.com/actions/tip',
      { label: 'Tip 100', href: '/actions/tip/submit?amount=100' },
      {},
      'ckb1xyz',
    );

    expect(response.type).toBe('transaction');
    expect(response.encoding).toBe('molecule');
    expect(mockFetch).toHaveBeenCalledOnce();
    const calledUrl = mockFetch.mock.calls[0]?.[0] as URL;
    expect(calledUrl.href).toBe('https://example.com/actions/tip/submit?amount=100');
  });

  it('templates parameters into the href before posting', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(okResponse), { status: 200 }));
    vi.stubGlobal('fetch', mockFetch);

    await submitAction(
      'https://example.com/actions/tip',
      { label: 'Tip', href: '/actions/tip/submit?amount={amount}' },
      { amount: 42 },
      'ckb1xyz',
    );

    const calledUrl = mockFetch.mock.calls[0]?.[0] as URL;
    expect(calledUrl.search).toBe('?amount=42');
  });

  it('throws NetworkError when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(
      submitAction('https://example.com/a', { label: 'X', href: '/x' }, {}, 'ckb1xyz'),
    ).rejects.toBeInstanceOf(NetworkError);
  });

  it('throws the typed error matching a §6.3 error response', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: 'INVALID_ADDRESS', message: 'bad' }), { status: 400 }),
      );
    vi.stubGlobal('fetch', mockFetch);

    await expect(
      submitAction('https://example.com/a', { label: 'X', href: '/x' }, {}, 'ckb1xyz'),
    ).rejects.toBeInstanceOf(InvalidAddressError);
  });
});
