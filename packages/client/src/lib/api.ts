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

/**
 * Fetch the manifest for an Action URL. Thin wrapper over the SDK helper.
 */
export async function fetchManifest(url: string): Promise<Manifest> {
  return fetchManifestSdk(url);
}

/**
 * Resolve an action's `href` against the manifest URL, POST the request body,
 * and parse the response. Endpoint error responses are translated into the
 * matching typed SDK error.
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
    if (parsedError.success) {
      throw fromErrorResponse(parsedError.data);
    }
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
