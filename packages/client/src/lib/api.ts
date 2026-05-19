import {
  actionResponseSchema,
  errorResponseSchema,
  fetchManifest as fetchManifestSdk,
  fromErrorResponse,
  ManifestParseError,
  NetworkError,
  resolveHref,
  UnexpectedResponseError,
  type ActionItem,
  type ActionResponse,
  type Manifest,
  type ParamValue,
} from '@ckb-actions/sdk';

/** Thin wrapper over the SDK's fetchManifest. */
export async function fetchManifest(url: string): Promise<Manifest> {
  return fetchManifestSdk(url);
}

/**
 * Resolve an action's `href` against the manifest URL, POST the request,
 * and parse the response. §6.3 error responses are translated into the
 * matching typed SDK error so callers see one consistent exception API.
 */
export async function submitAction(
  manifestUrl: string,
  action: ActionItem,
  params: Record<string, ParamValue>,
  address: string,
): Promise<ActionResponse> {
  const resolved = resolveHref(action.href, params);
  const target = new URL(resolved, manifestUrl);

  let response: Response;
  try {
    response = await fetch(target, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ address, params }),
    });
  } catch (cause) {
    throw new NetworkError(`Failed to POST to ${target.href}`, { cause });
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (cause) {
    throw new UnexpectedResponseError(`Action response is not valid JSON`, { cause });
  }

  if (!response.ok) {
    const parsedError = errorResponseSchema.safeParse(body);
    if (parsedError.success) throw fromErrorResponse(parsedError.data);
    throw new UnexpectedResponseError(
      `Action endpoint returned ${response.status} but body did not match §6.3 shape`,
    );
  }

  const parsed = actionResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new ManifestParseError(
      `Action response failed schema validation: ${parsed.error.message}`,
      { cause: parsed.error },
    );
  }
  return parsed.data;
}

export interface CreateInvoiceInput {
  amount: number;
  description: string;
  recipient: string;
}

export interface CreateInvoiceResult {
  id: string;
  manifestUrl: string;
}

/**
 * Call the reference invoice example's POST /create endpoint and return the
 * resulting manifest URL the publisher should share with the payer.
 */
export async function createInvoice(
  serverBaseUrl: string,
  input: CreateInvoiceInput,
): Promise<CreateInvoiceResult> {
  const target = new URL('/actions/invoice/create', serverBaseUrl);

  let response: Response;
  try {
    response = await fetch(target, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch (cause) {
    throw new NetworkError(`Failed to reach ${target.href}`, { cause });
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (cause) {
    throw new UnexpectedResponseError(`Create response is not valid JSON`, { cause });
  }

  if (!response.ok) {
    const parsedError = errorResponseSchema.safeParse(body);
    if (parsedError.success) throw fromErrorResponse(parsedError.data);
    throw new UnexpectedResponseError(`Create invoice returned ${response.status}`);
  }

  return body as CreateInvoiceResult;
}

/**
 * POST the on-chain tx hash to an action's callback URL, resolved against
 * the manifest URL the consumer originally fetched.
 */
export async function postCallback(
  manifestUrl: string,
  callbackPath: string,
  txHash: string,
): Promise<void> {
  const target = new URL(callbackPath, manifestUrl);
  try {
    await fetch(target, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ txHash }),
    });
  } catch (cause) {
    throw new NetworkError(`Failed to POST callback at ${target.href}`, { cause });
  }
}
