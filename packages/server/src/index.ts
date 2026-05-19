import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';

function main(): void {
  const config = loadConfig();
  const logger = createLogger({ level: config.LOG_LEVEL });
  const app = createApp({ config, logger });

  app.listen(config.PORT, config.HOST, () => {
    logger.info('action endpoint listening', {
      host: config.HOST,
      port: config.PORT,
      env: config.NODE_ENV,
    });
  });
}

main();
