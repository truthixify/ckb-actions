import { describe, expect, it } from 'vitest';
import { manifestSchema } from '../src/manifest.js';

const minimalValid = {
  type: 'action',
  title: 'Tip Truth',
  description: 'Send a tip',
  icon: 'https://example.com/icon.png',
  label: 'Tip',
  network: 'mainnet',
  links: { actions: [{ label: 'Send', href: '/tip' }] },
};

describe('manifestSchema', () => {
  it('accepts a minimal valid manifest', () => {
    expect(manifestSchema.safeParse(minimalValid).success).toBe(true);
  });

  it('accepts the full example from spec §6.1', () => {
    const fullExample = {
      type: 'action',
      title: 'Tip Truth',
      description: 'Send a tip in CKB or USDI',
      icon: 'https://example.com/icons/tip.png',
      label: 'Send tip',
      network: 'mainnet',
      links: {
        actions: [
          { label: 'Tip 100 CKB', href: '/actions/tip/truth?amount=100&asset=CKB' },
          {
            label: 'Tip custom amount',
            href: '/actions/tip/truth?amount={amount}&asset={asset}',
            parameters: [
              { name: 'amount', label: 'Amount', type: 'number', required: true },
              {
                name: 'asset',
                label: 'Asset',
                type: 'select',
                options: ['CKB', 'USDI'],
                required: true,
              },
            ],
          },
        ],
      },
    };
    expect(manifestSchema.safeParse(fullExample).success).toBe(true);
  });

  it('rejects a manifest whose type is not "action"', () => {
    expect(manifestSchema.safeParse({ ...minimalValid, type: 'transaction' }).success).toBe(false);
  });

  it('rejects a manifest missing the title field', () => {
    const bad = {
      type: 'action',
      description: 'x',
      icon: 'https://example.com/icon.png',
      label: 'x',
      network: 'mainnet',
      links: { actions: [{ label: 'x', href: '/x' }] },
    };
    expect(manifestSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects an empty title', () => {
    expect(manifestSchema.safeParse({ ...minimalValid, title: '' }).success).toBe(false);
  });

  it('rejects an icon that is not a URL', () => {
    expect(manifestSchema.safeParse({ ...minimalValid, icon: 'not-a-url' }).success).toBe(false);
  });

  it('rejects an unknown network value', () => {
    expect(manifestSchema.safeParse({ ...minimalValid, network: 'devnet' }).success).toBe(false);
  });

  it('rejects an empty actions array', () => {
    expect(manifestSchema.safeParse({ ...minimalValid, links: { actions: [] } }).success).toBe(
      false,
    );
  });

  it('rejects a select parameter without options', () => {
    const bad = {
      ...minimalValid,
      links: {
        actions: [
          {
            label: 'Choose',
            href: '/x?v={v}',
            parameters: [{ name: 'v', label: 'V', type: 'select' }],
          },
        ],
      },
    };
    expect(manifestSchema.safeParse(bad).success).toBe(false);
  });

  it('accepts a select parameter with options', () => {
    const good = {
      ...minimalValid,
      links: {
        actions: [
          {
            label: 'Choose',
            href: '/x?v={v}',
            parameters: [{ name: 'v', label: 'V', type: 'select', options: ['a', 'b'] }],
          },
        ],
      },
    };
    expect(manifestSchema.safeParse(good).success).toBe(true);
  });

  it('rejects a non-select parameter that declares options', () => {
    const bad = {
      ...minimalValid,
      links: {
        actions: [
          {
            label: 'X',
            href: '/x?v={v}',
            parameters: [{ name: 'v', label: 'V', type: 'number', options: ['1', '2'] }],
          },
        ],
      },
    };
    expect(manifestSchema.safeParse(bad).success).toBe(false);
  });

  it('accepts a number parameter without options', () => {
    const good = {
      ...minimalValid,
      links: {
        actions: [
          {
            label: 'X',
            href: '/x?v={v}',
            parameters: [{ name: 'v', label: 'V', type: 'number', required: true }],
          },
        ],
      },
    };
    expect(manifestSchema.safeParse(good).success).toBe(true);
  });

  it('rejects a parameter with an empty name', () => {
    const bad = {
      ...minimalValid,
      links: {
        actions: [
          {
            label: 'X',
            href: '/x?v={v}',
            parameters: [{ name: '', label: 'V', type: 'text' }],
          },
        ],
      },
    };
    expect(manifestSchema.safeParse(bad).success).toBe(false);
  });
});
