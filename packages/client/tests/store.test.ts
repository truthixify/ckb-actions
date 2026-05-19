import { beforeEach, describe, expect, it } from 'vitest';
import { isParamsComplete, useActionStore } from '../src/lib/store';

describe('useActionStore', () => {
  beforeEach(() => {
    useActionStore.getState().reset();
  });

  it('starts in the idle phase', () => {
    expect(useActionStore.getState().phase).toBe('idle');
  });

  it('transitions to fetching when startFetching is called', () => {
    useActionStore.getState().startFetching();
    expect(useActionStore.getState().phase).toBe('fetching');
  });

  it('transitions to ready when a manifest lands', () => {
    useActionStore.getState().setManifest({
      type: 'action',
      title: 'T',
      description: '',
      icon: 'https://example.com/i.png',
      label: 'T',
      network: 'mainnet',
      links: { actions: [{ label: 'A', href: '/a' }] },
    });
    expect(useActionStore.getState().phase).toBe('ready');
  });

  it('records the param value for setParam', () => {
    useActionStore.getState().setParam('amount', 100);
    expect(useActionStore.getState().paramValues.amount).toBe(100);
  });

  it('reset clears the store', () => {
    useActionStore.getState().setUrl('foo');
    useActionStore.getState().setParam('x', 1);
    useActionStore.getState().reset();
    expect(useActionStore.getState().url).toBe('');
    expect(useActionStore.getState().paramValues).toEqual({});
  });
});

describe('isParamsComplete', () => {
  it('returns true when there are no parameters', () => {
    expect(isParamsComplete(undefined, {})).toBe(true);
    expect(isParamsComplete([], {})).toBe(true);
  });

  it('returns true when all required params are present', () => {
    const params = [
      { name: 'amount', label: 'Amount', type: 'number' as const, required: true },
      { name: 'asset', label: 'Asset', type: 'text' as const },
    ];
    expect(isParamsComplete(params, { amount: 100 })).toBe(true);
  });

  it('returns false when a required param is missing', () => {
    const params = [{ name: 'amount', label: 'Amount', type: 'number' as const, required: true }];
    expect(isParamsComplete(params, {})).toBe(false);
  });
});
