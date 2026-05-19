import { describe, expect, it, vi } from 'vitest';
import { pollConfirmation, preflightExistingInputs } from '../src/lib/wallet';

const TX_HASH_A = `0x${'a'.repeat(64)}`;
const TX_HASH_B = `0x${'b'.repeat(64)}`;

function inputFrom(txHash: string, index: bigint | number = 0n) {
  return { previousOutput: { txHash, index } };
}

describe('preflightExistingInputs', () => {
  it('resolves immediately when there are no inputs', async () => {
    const client = { getCell: vi.fn() };
    await preflightExistingInputs([], client);
    expect(client.getCell).not.toHaveBeenCalled();
  });

  it('resolves when every input is found on chain', async () => {
    const client = { getCell: vi.fn().mockResolvedValue({ capacity: 100n }) };
    await preflightExistingInputs([inputFrom(TX_HASH_A), inputFrom(TX_HASH_B, 1n)], client);
    expect(client.getCell).toHaveBeenCalledTimes(2);
  });

  it('throws a publisher-input message when any input is missing', async () => {
    const client = {
      getCell: vi.fn().mockResolvedValueOnce({ capacity: 100n }).mockResolvedValueOnce(undefined),
    };
    await expect(
      preflightExistingInputs([inputFrom(TX_HASH_A), inputFrom(TX_HASH_B, 7)], client),
    ).rejects.toThrow(/Publisher-supplied input 1/);
  });

  it('includes the truncated outpoint reference in the error', async () => {
    const client = { getCell: vi.fn().mockResolvedValue(undefined) };
    try {
      await preflightExistingInputs([inputFrom(TX_HASH_A, 3n)], client);
      expect.fail('expected preflight to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toContain(TX_HASH_A.slice(0, 10));
      expect((err as Error).message).toContain('3');
    }
  });
});

describe('pollConfirmation', () => {
  function build() {
    return {
      onConfirmed: vi.fn(),
      onRejected: vi.fn(),
      onDropped: vi.fn(),
      onTransient: vi.fn(),
    };
  }

  it('fires onConfirmed with the block number when status is committed', async () => {
    const client = {
      waitTransaction: vi.fn().mockResolvedValue({ status: 'committed', blockNumber: 12345n }),
    };
    const cb = build();
    await pollConfirmation(client, TX_HASH_A, cb);
    expect(cb.onConfirmed).toHaveBeenCalledWith('12345');
    expect(cb.onRejected).not.toHaveBeenCalled();
    expect(cb.onDropped).not.toHaveBeenCalled();
  });

  it('uses "?" for the block when blockNumber is missing', async () => {
    const client = {
      waitTransaction: vi.fn().mockResolvedValue({ status: 'committed' }),
    };
    const cb = build();
    await pollConfirmation(client, TX_HASH_A, cb);
    expect(cb.onConfirmed).toHaveBeenCalledWith('?');
  });

  it('passes wait params through (confirmations, timeout, interval)', async () => {
    const client = { waitTransaction: vi.fn().mockResolvedValue(undefined) };
    await pollConfirmation(client, TX_HASH_A, build(), { timeoutMs: 50, intervalMs: 5 });
    expect(client.waitTransaction).toHaveBeenCalledWith(TX_HASH_A, 0, 50, 5);
  });

  it('fires onRejected with the chain reason when status is rejected', async () => {
    const client = {
      waitTransaction: vi
        .fn()
        .mockResolvedValue({ status: 'rejected', reason: 'verification failed' }),
    };
    const cb = build();
    await pollConfirmation(client, TX_HASH_A, cb);
    expect(cb.onRejected).toHaveBeenCalledWith('verification failed');
  });

  it('fires onRejected with a default reason when none is supplied', async () => {
    const client = {
      waitTransaction: vi.fn().mockResolvedValue({ status: 'rejected' }),
    };
    const cb = build();
    await pollConfirmation(client, TX_HASH_A, cb);
    expect(cb.onRejected).toHaveBeenCalledWith('no reason given');
  });

  it('fires onDropped when status is unknown', async () => {
    const client = {
      waitTransaction: vi.fn().mockResolvedValue({ status: 'unknown' }),
    };
    const cb = build();
    await pollConfirmation(client, TX_HASH_A, cb);
    expect(cb.onDropped).toHaveBeenCalledOnce();
  });

  it('fires nothing when status is non-terminal (sent / pending / proposed)', async () => {
    const client = {
      waitTransaction: vi.fn().mockResolvedValue({ status: 'pending' }),
    };
    const cb = build();
    await pollConfirmation(client, TX_HASH_A, cb);
    expect(cb.onConfirmed).not.toHaveBeenCalled();
    expect(cb.onRejected).not.toHaveBeenCalled();
    expect(cb.onDropped).not.toHaveBeenCalled();
    expect(cb.onTransient).not.toHaveBeenCalled();
  });

  it('fires nothing when waitTransaction returns undefined', async () => {
    const client = { waitTransaction: vi.fn().mockResolvedValue(undefined) };
    const cb = build();
    await pollConfirmation(client, TX_HASH_A, cb);
    expect(cb.onConfirmed).not.toHaveBeenCalled();
    expect(cb.onRejected).not.toHaveBeenCalled();
    expect(cb.onDropped).not.toHaveBeenCalled();
  });

  it('fires onTransient when waitTransaction throws', async () => {
    const cause = new Error('connection reset');
    const client = { waitTransaction: vi.fn().mockRejectedValue(cause) };
    const cb = build();
    await pollConfirmation(client, TX_HASH_A, cb);
    expect(cb.onTransient).toHaveBeenCalledWith(cause);
  });

  it('does not throw when no transient handler is supplied', async () => {
    const client = { waitTransaction: vi.fn().mockRejectedValue(new Error('x')) };
    const cb = { onConfirmed: vi.fn(), onRejected: vi.fn(), onDropped: vi.fn() };
    await expect(pollConfirmation(client, TX_HASH_A, cb)).resolves.toBeUndefined();
  });
});
