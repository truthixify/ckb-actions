import type { ActionItem, ActionResponse, Manifest, ParamValue, Parameter } from '@ckb-actions/sdk';
import { create } from 'zustand';

export type View = 'preview' | 'create';
export type Phase =
  | 'idle'
  | 'fetching'
  | 'ready'
  | 'submitting'
  | 'received'
  | 'signing'
  | 'sent'
  | 'confirmed'
  | 'error';

export interface ActionError {
  tag: string;
  message: string;
}

export interface ActionStoreState {
  view: View;
  serverBaseUrl: string;
  url: string;
  phase: Phase;
  manifest: Manifest | null;
  selectedAction: ActionItem | null;
  paramValues: Record<string, ParamValue>;
  response: ActionResponse | null;
  txHash: string | null;
  blockNumber: string | null;
  error: ActionError | null;
}

export interface ActionStoreActions {
  setView(view: View): void;
  setServerBaseUrl(url: string): void;
  setUrl(url: string): void;
  setManifest(manifest: Manifest): void;
  setError(error: ActionError): void;
  setSubmitting(): void;
  setResponse(response: ActionResponse): void;
  setSigning(): void;
  setSent(txHash: string): void;
  setConfirmed(blockNumber: string): void;
  startFetching(): void;
  selectAction(action: ActionItem | null): void;
  setParam(name: string, value: ParamValue): void;
  reset(): void;
}

const initialState: ActionStoreState = {
  view: 'preview',
  serverBaseUrl: 'http://localhost:3000',
  url: '',
  phase: 'idle',
  manifest: null,
  selectedAction: null,
  paramValues: {},
  response: null,
  txHash: null,
  blockNumber: null,
  error: null,
};

export const useActionStore = create<ActionStoreState & ActionStoreActions>((set) => ({
  ...initialState,
  setView: (view) => set({ view }),
  setServerBaseUrl: (serverBaseUrl) => set({ serverBaseUrl }),
  setUrl: (url) => set({ url }),
  startFetching: () =>
    set({
      phase: 'fetching',
      error: null,
      manifest: null,
      response: null,
      txHash: null,
      blockNumber: null,
    }),
  setManifest: (manifest) =>
    set({ manifest, phase: 'ready', error: null, selectedAction: null, paramValues: {} }),
  setError: (error) => set({ error, phase: 'error' }),
  setSubmitting: () =>
    set({
      phase: 'submitting',
      error: null,
      response: null,
      txHash: null,
      blockNumber: null,
    }),
  setResponse: (response) => set({ response, phase: 'received' }),
  setSigning: () => set({ phase: 'signing', error: null }),
  setSent: (txHash) => set({ txHash, phase: 'sent', blockNumber: null }),
  setConfirmed: (blockNumber) => set({ blockNumber, phase: 'confirmed' }),
  selectAction: (action) =>
    set({
      selectedAction: action,
      paramValues: {},
      response: null,
      txHash: null,
      blockNumber: null,
    }),
  setParam: (name, value) => set((s) => ({ paramValues: { ...s.paramValues, [name]: value } })),
  reset: () => set(initialState),
}));

/** Predicate: required parameters are present in paramValues. */
export function isParamsComplete(
  parameters: readonly Parameter[] | undefined,
  values: Record<string, ParamValue>,
): boolean {
  if (!parameters) return true;
  return parameters.every((p) => !p.required || values[p.name] !== undefined);
}
