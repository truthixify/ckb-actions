import { InvalidAddressError, NetworkError as SdkNetworkError } from '@ckb-actions/sdk';
import { describe, expect, it } from 'vitest';
import { friendlyMessage } from '../src/lib/errors';

describe('friendlyMessage', () => {
  it('passes SdkError tag and message through unchanged', () => {
    const err = new InvalidAddressError('bad address');
    expect(friendlyMessage(err)).toEqual({ tag: 'INVALID_ADDRESS', message: 'bad address' });
  });

  it('passes SDK NetworkError through', () => {
    const err = new SdkNetworkError('offline');
    expect(friendlyMessage(err)).toEqual({ tag: 'network_error', message: 'offline' });
  });

  it('tags Empty(Inputs) chain rejections as wallet_error with guidance', () => {
    const err = new Error(
      'Client request error TransactionFailedToVerify: Verification failed Transaction(Empty(Inputs))',
    );
    const friendly = friendlyMessage(err);
    expect(friendly.tag).toBe('wallet_error');
    expect(friendly.message).toMatch(/did not collect/i);
  });

  it('tags missing publisher-supplied input cells as publisher_input_missing', () => {
    const err = new Error('OutPoint does not exist on the chain');
    expect(friendlyMessage(err).tag).toBe('publisher_input_missing');
  });

  it('tags insufficient capacity errors', () => {
    expect(friendlyMessage(new Error('Insufficient capacity for fees')).tag).toBe(
      'insufficient_capacity',
    );
    expect(friendlyMessage(new Error('InsufficientCapacity')).tag).toBe('insufficient_capacity');
  });

  it('tags user rejection from a wallet popup', () => {
    expect(friendlyMessage(new Error('user rejected the request')).tag).toBe('user_rejected');
    expect(friendlyMessage(new Error('User denied transaction')).tag).toBe('user_rejected');
  });

  it('tags transport / DNS errors as network_error', () => {
    expect(friendlyMessage(new Error('getaddrinfo ENOTFOUND example.com')).tag).toBe(
      'network_error',
    );
  });

  it('falls back to wallet_error with the raw message for unrecognized errors', () => {
    const err = new Error('Something exotic happened');
    expect(friendlyMessage(err)).toEqual({
      tag: 'wallet_error',
      message: 'Something exotic happened',
    });
  });

  it('handles non-Error throws by coercing to string', () => {
    expect(friendlyMessage('plain string failure')).toEqual({
      tag: 'wallet_error',
      message: 'plain string failure',
    });
    expect(friendlyMessage(42)).toEqual({ tag: 'wallet_error', message: '42' });
  });
});
