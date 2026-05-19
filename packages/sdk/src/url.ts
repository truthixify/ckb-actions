import {
  InvalidActionUrlError,
  ManifestParseError,
  NetworkError,
  UnexpectedResponseError,
} from './errors.js';
import { manifestSchema, type Manifest } from './manifest.js';

const SCHEME_PREFIX = 'ckb-action:';
const LOCALHOST_HOSTS: ReadonlySet<string> = new Set(['localhost', '127.0.0.1', '[::1]']);
const X_CKB_ACTION_HEADER = 'x-ckb-action';

/**
 * Parse an Action URL into the canonical underlying HTTPS URL.
 *
 * §5 accepts two forms: a bare HTTPS URL, or one prefixed with `ckb-action:`
 * for explicit handling. The prefix is stripped on success. HTTP is allowed
 * only when the host is loopback (localhost, 127.0.0.1, [::1]).
 *
 * @spec §5
 */
export function parseActionUrl(input: string): URL {
  const stripped = input.startsWith(SCHEME_PREFIX) ? input.slice(SCHEME_PREFIX.length) : input;

  let url: URL;
  try {
    url = new URL(stripped);
  } catch (cause) {
    throw new InvalidActionUrlError(`Cannot parse "${input}" as a URL`, { cause });
  }

  if (url.protocol === 'https:') return url;
  if (url.protocol === 'http:' && LOCALHOST_HOSTS.has(url.hostname)) return url;

  throw new InvalidActionUrlError(
    `Action URLs must use HTTPS; HTTP is permitted only for localhost. Got: ${url.protocol}//${url.hostname}`,
  );
}

/**
 * Fetch and validate a CKB Action Manifest. The endpoint must respond with
 * a 2xx status, an `application/json` content type, the `X-CKB-Action: true`
 * header, and a body matching the §6.1 Manifest schema. Each precondition
 * maps to a distinct typed error so callers can react precisely.
 *
 * @spec §5, §6.1
 */
export async function fetchManifest(input: string, init?: RequestInit): Promise<Manifest> {
  const url = parseActionUrl(input);

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (cause) {
    throw new NetworkError(`Failed to reach action endpoint at ${url.href}`, { cause });
  }

  if (!response.ok) {
    throw new UnexpectedResponseError(
      `Action endpoint returned ${response.status} ${response.statusText} for ${url.href}`,
    );
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw new UnexpectedResponseError(
      `Expected application/json from ${url.href}; got "${contentType || 'no content-type'}"`,
    );
  }

  if (response.headers.get(X_CKB_ACTION_HEADER) !== 'true') {
    throw new UnexpectedResponseError(
      `Response from ${url.href} is missing the X-CKB-Action: true header`,
    );
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch (cause) {
    throw new UnexpectedResponseError(`Manifest body is not valid JSON`, { cause });
  }

  const parsed = manifestSchema.safeParse(json);
  if (!parsed.success) {
    throw new ManifestParseError(`Manifest failed schema validation: ${parsed.error.message}`, {
      cause: parsed.error,
    });
  }

  return parsed.data;
}
