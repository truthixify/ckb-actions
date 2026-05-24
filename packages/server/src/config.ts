import { z } from 'zod';

const configSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  /**
   * Explicit HOST wins. When omitted, the resolved default depends on
   * NODE_ENV: production binds 0.0.0.0 (PaaS load balancers need it),
   * everything else binds 127.0.0.1 (safer for local dev).
   */
  HOST: z.string().min(1).optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  CORS_ORIGIN: z.string().default('*'),
});

/** Validated server configuration. */
export type Config = z.infer<typeof configSchema> & { HOST: string };

/**
 * Parse and validate server configuration from environment variables. Throws
 * a single aggregated error if any required value is malformed.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = configSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid environment configuration: ${result.error.message}`);
  }
  const { HOST, NODE_ENV } = result.data;
  return {
    ...result.data,
    NODE_ENV,
    HOST: HOST ?? (NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1'),
  };
}
