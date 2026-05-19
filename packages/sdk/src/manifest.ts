import { z } from 'zod';

/**
 * CKB network identifier the action targets.
 *
 * @spec §6.1
 */
export const networkSchema = z.enum(['mainnet', 'testnet']);
/** Validated CKB network identifier. @see {@link networkSchema} */
export type Network = z.infer<typeof networkSchema>;

/**
 * Parameter input types accepted by the reference SDK.
 *
 * The spec example in §6.1 shows `number` and `select`. `text` is included as
 * the free-text baseline. The full normative set is tracked as an open
 * question in spec.md §12.
 *
 * @spec §6.1
 */
export const parameterTypeSchema = z.enum(['text', 'number', 'select']);
/** Validated parameter type. @see {@link parameterTypeSchema} */
export type ParameterType = z.infer<typeof parameterTypeSchema>;

/**
 * A user-supplied input declared by an action. The Client renders an input
 * field; the entered value is interpolated into the action's `href` template
 * via `{name}` placeholders before the POST request.
 *
 * @spec §6.1
 */
export const parameterSchema = z
  .object({
    name: z.string().min(1),
    label: z.string().min(1),
    type: parameterTypeSchema,
    required: z.boolean().optional(),
    options: z.array(z.string().min(1)).min(1).optional(),
  })
  .refine((p) => p.type !== 'select' || (p.options !== undefined && p.options.length > 0), {
    message: 'select parameters must declare a non-empty options list',
    path: ['options'],
  })
  .refine((p) => p.type === 'select' || p.options === undefined, {
    message: 'options are only valid for select parameters',
    path: ['options'],
  });
/** Validated parameter declaration. @see {@link parameterSchema} */
export type Parameter = z.infer<typeof parameterSchema>;

/**
 * One action button in the manifest. The Client renders a button per item;
 * on submit it interpolates parameters into `href` and POSTs to the result.
 *
 * @spec §6.1
 */
export const actionItemSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  parameters: z.array(parameterSchema).optional(),
});
/** Validated action item. @see {@link actionItemSchema} */
export type ActionItem = z.infer<typeof actionItemSchema>;

/**
 * The JSON document returned by an Action Endpoint on GET. The source of
 * truth for what a Client renders and what parameters the user must provide.
 *
 * Non-empty constraints on `title` and `label` are stricter than the spec's
 * written prose — an empty string would still parse as a `string`, but would
 * render an unusable button. The spec is silent on min lengths.
 *
 * @spec §6.1
 */
export const manifestSchema = z.object({
  type: z.literal('action'),
  title: z.string().min(1),
  description: z.string(),
  icon: z.url(),
  label: z.string().min(1),
  network: networkSchema,
  links: z.object({
    actions: z.array(actionItemSchema).min(1),
  }),
});
/** Validated CKB Action Manifest. @see {@link manifestSchema} */
export type Manifest = z.infer<typeof manifestSchema>;
