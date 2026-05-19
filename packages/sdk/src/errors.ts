import { z } from 'zod';

const WIRE_ERROR_CODES = [
  'INVALID_ADDRESS',
  'INSUFFICIENT_CAPACITY',
  'INVALID_PARAMS',
  'UNSUPPORTED_NETWORK',
  'EXPIRED',
  'INTERNAL',
] as const;

/**
 * Normative wire-protocol error codes returned by Action Endpoints.
 *
 * @spec §6.3
 */
export const errorCodeSchema = z.enum(WIRE_ERROR_CODES);
/** Validated wire-protocol error code. @see {@link errorCodeSchema} */
export type ErrorCode = (typeof WIRE_ERROR_CODES)[number];

/**
 * The JSON body an Endpoint returns alongside a non-2xx HTTP status when an
 * action fails.
 *
 * @spec §6.3
 */
export const errorResponseSchema = z.object({
  error: errorCodeSchema,
  message: z.string(),
});
/** Validated §6.3 error response body. @see {@link errorResponseSchema} */
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

/**
 * Discriminator union of every error variety produced by this SDK. Normative
 * §6.3 codes are uppercase; SDK-internal tags are snake_case so they cannot
 * collide with the wire codes at a glance.
 */
export type SdkErrorTag =
  | ErrorCode
  | 'manifest_parse_error'
  | 'request_parse_error'
  | 'response_parse_error'
  | 'template_parameter_missing'
  | 'unexpected_response'
  | 'network_error';

/**
 * Base class for every error this SDK throws. A `tag` field discriminates the
 * variety so callers can `switch` instead of `instanceof`-chaining.
 */
export abstract class SdkError extends Error {
  abstract readonly tag: SdkErrorTag;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
  }
}

/** §6.3 INVALID_ADDRESS — the consumer's address failed validation. */
export class InvalidAddressError extends SdkError {
  readonly tag = 'INVALID_ADDRESS' as const;
}

/** §6.3 INSUFFICIENT_CAPACITY — the consumer cannot fund the action. */
export class InsufficientCapacityError extends SdkError {
  readonly tag = 'INSUFFICIENT_CAPACITY' as const;
}

/** §6.3 INVALID_PARAMS — user-supplied parameters failed validation. */
export class InvalidParamsError extends SdkError {
  readonly tag = 'INVALID_PARAMS' as const;
}

/** §6.3 UNSUPPORTED_NETWORK — the wallet is on a network the action does not target. */
export class UnsupportedNetworkError extends SdkError {
  readonly tag = 'UNSUPPORTED_NETWORK' as const;
}

/** §6.3 EXPIRED — the action expired before submission. */
export class ExpiredError extends SdkError {
  readonly tag = 'EXPIRED' as const;
}

/** §6.3 INTERNAL — an unexpected condition inside the Endpoint. */
export class InternalError extends SdkError {
  readonly tag = 'INTERNAL' as const;
}

/** Schema validation of a Manifest payload failed. */
export class ManifestParseError extends SdkError {
  readonly tag = 'manifest_parse_error' as const;
}

/** Schema validation of a POST request body failed. */
export class RequestParseError extends SdkError {
  readonly tag = 'request_parse_error' as const;
}

/** Schema validation of a POST response body failed. */
export class ResponseParseError extends SdkError {
  readonly tag = 'response_parse_error' as const;
}

/**
 * An action's `href` template referenced a parameter the request did not
 * include. The Endpoint rejected the request before composing the OTX.
 */
export class TemplateParameterMissingError extends SdkError {
  readonly tag = 'template_parameter_missing' as const;
  readonly parameterName: string;

  constructor(parameterName: string, options?: ErrorOptions) {
    super(`No value supplied for templated parameter "${parameterName}"`, options);
    this.parameterName = parameterName;
  }
}

/** Endpoint returned a response that matched neither §6.2 nor §6.3. */
export class UnexpectedResponseError extends SdkError {
  readonly tag = 'unexpected_response' as const;
}

/** A transport-level error reaching the Endpoint (DNS, TLS, timeout, abort). */
export class NetworkError extends SdkError {
  readonly tag = 'network_error' as const;
}

const wireErrorTags: ReadonlySet<string> = new Set(WIRE_ERROR_CODES);

/** Type guard: true if `tag` is a normative §6.3 wire error code. */
export function isWireErrorCode(tag: SdkErrorTag): tag is ErrorCode {
  return wireErrorTags.has(tag);
}

/**
 * Serialize an SDK error into the §6.3 JSON body. Returns `null` for
 * SDK-internal errors that have no defined wire representation — callers
 * decide whether to mask them as `INTERNAL` or rethrow.
 *
 * @spec §6.3
 */
export function toErrorResponse(err: SdkError): ErrorResponse | null {
  return isWireErrorCode(err.tag) ? { error: err.tag, message: err.message } : null;
}

/**
 * Construct the typed SDK error corresponding to a parsed §6.3 response. Used
 * by Clients to surface Endpoint failures as throwable typed errors.
 *
 * @spec §6.3
 */
export function fromErrorResponse(response: ErrorResponse): SdkError {
  switch (response.error) {
    case 'INVALID_ADDRESS':
      return new InvalidAddressError(response.message);
    case 'INSUFFICIENT_CAPACITY':
      return new InsufficientCapacityError(response.message);
    case 'INVALID_PARAMS':
      return new InvalidParamsError(response.message);
    case 'UNSUPPORTED_NETWORK':
      return new UnsupportedNetworkError(response.message);
    case 'EXPIRED':
      return new ExpiredError(response.message);
    case 'INTERNAL':
      return new InternalError(response.message);
  }
}
