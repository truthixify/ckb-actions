import type { ActionItem, ActionResponse, Manifest, ParamValue, Parameter } from '@ckb-actions/sdk';
import { create } from 'zustand';

export type Phase = 'idle' | 'fetching' | 'ready' | 'submitting' | 'received' | 'error';

export interface ActionError {
  /** SdkErrorTag or freeform tag. */
  tag: string;
  message: string;
}

export interface ActionStoreState {
  url: string;
  phase: Phase;
  manifest: Manifest | null;
  selectedAction: ActionItem | null;
  paramValues: Record<string, ParamValue>;
  response: ActionResponse | null;
  error: ActionError | null;
}

export interface ActionStoreActions {
  setUrl(url: string): void;
  setManifest(manifest: Manifest): void;
  setError(error: ActionError): void;
  setSubmitting(): void;
  setResponse(response: ActionResponse): void;
  startFetching(): void;
  selectAction(action: ActionItem | null): void;
  setParam(name: string, value: ParamValue): void;
  reset(): void;
}

const initialState: ActionStoreState = {
  url: '',
  phase: 'idle',
  manifest: null,
  selectedAction: null,
  paramValues: {},
  response: null,
  error: null,
};

export const useActionStore = create<ActionStoreState & ActionStoreActions>((set) => ({
  ...initialState,
  setUrl: (url) => set({ url }),
  startFetching: () => set({ phase: 'fetching', error: null, manifest: null, response: null }),
  setManifest: (manifest) =>
    set({ manifest, phase: 'ready', error: null, selectedAction: null, paramValues: {} }),
  setError: (error) => set({ error, phase: 'error' }),
  setSubmitting: () => set({ phase: 'submitting', error: null, response: null }),
  setResponse: (response) => set({ response, phase: 'received' }),
  selectAction: (action) => set({ selectedAction: action, paramValues: {}, response: null }),
  setParam: (name, value) => set((s) => ({ paramValues: { ...s.paramValues, [name]: value } })),
  reset: () => set(initialState),
}));

/** Predicate: required params are present in paramValues. */
export function isParamsComplete(
  parameters: readonly Parameter[] | undefined,
  values: Record<string, ParamValue>,
): boolean {
  if (!parameters) return true;
  return parameters.every((p) => !p.required || values[p.name] !== undefined);
}
