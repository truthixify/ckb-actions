import { z } from 'zod';
import { TemplateParameterMissingError } from './errors.js';

const HEX_OTX_PATTERN = /^0x[0-9a-fA-F]*$/;
const TEMPLATE_PLACEHOLDER = /\{([^{}]+)\}/g;

/**
 * Primitive parameter values transmitted in POST request bodies. Action
 * parameters reach the wire as JSON, so values are limited to the JSON
 * primitives the manifest's parameter `type` field can describe.
 *
 * @spec §6.2
 */
export const paramValueSchema = z.union([z.string(), z.number(), z.boolean()]);
/** Validated parameter value. @see {@link paramValueSchema} */
export type ParamValue = z.infer<typeof paramValueSchema>;

/**
 * Request body the Client POSTs to a resolved action `href`.
 *
 * @spec §6.2
 */
export const actionRequestSchema = z.object({
  address: z.string().min(1),
  params: z.record(z.string(), paramValueSchema).optional(),
});
/** Validated POST request body. @see {@link actionRequestSchema} */
export type ActionRequest = z.infer<typeof actionRequestSchema>;

/**
 * OTX serialization formats permitted by §6.2. `molecule` is canonical; `json`
 * is allowed for legibility.
 *
 * @spec §6.2
 */
export const otxEncodingSchema = z.enum(['molecule', 'json']);
/** Validated OTX encoding. @see {@link otxEncodingSchema} */
export type OtxEncoding = z.infer<typeof otxEncodingSchema>;

const responseBaseSchema = z.object({
  type: z.literal('transaction'),
  message: z.string().optional(),
  callback: z.url().optional(),
});

const moleculeResponseSchema = responseBaseSchema.extend({
  encoding: z.literal('molecule'),
  otx: z.string().regex(HEX_OTX_PATTERN, 'molecule OTX must be a 0x-prefixed hex string'),
});

const jsonResponseSchema = responseBaseSchema.extend({
  encoding: z.literal('json'),
  otx: z.string().min(1),
});

/**
 * Response body returned by an Action Endpoint on successful POST. The
 * `encoding` discriminator tells consumers how to decode `otx`: `molecule`
 * carries the canonical binary OTX as a `0x`-prefixed hex string; `json`
 * carries a JSON representation as a string.
 *
 * Hex-prefix enforcement on the molecule branch is stricter than the spec's
 * prose, which only says "binary" — but JSON wire transport forces an
 * encoding, and hex is the convention CKB tooling already uses.
 *
 * @spec §6.2
 */
export const actionResponseSchema = z.discriminatedUnion('encoding', [
  moleculeResponseSchema,
  jsonResponseSchema,
]);
/** Validated POST response body. @see {@link actionResponseSchema} */
export type ActionResponse = z.infer<typeof actionResponseSchema>;

/**
 * Interpolate user-supplied parameter values into an action's `href`
 * template. Placeholders take the form `{name}` and are URI-encoded on
 * substitution. An undefined value for a referenced placeholder throws so
 * the caller can return §6.3 INVALID_PARAMS instead of silently producing a
 * malformed URL.
 *
 * @spec §6.1
 */
export function resolveHref(template: string, params: Record<string, ParamValue> = {}): string {
  return template.replace(TEMPLATE_PLACEHOLDER, (_match, name: string) => {
    const value = params[name];
    if (value === undefined) {
      throw new TemplateParameterMissingError(name);
    }
    return encodeURIComponent(String(value));
  });
}
