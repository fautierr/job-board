import 'reflect-metadata';
import { createApp } from './app';
import { getEnv } from './config/env';
import { logger } from './config/logger';
import { AppDataSource } from './db/data-source';

async function bootstrap(): Promise<void> {
  const env = getEnv();

  await AppDataSource.initialize();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`Servidor escuchando en el puerto ${env.PORT}`);
  });

  const shutdown = (): void => {
    server.close(() => {
      if (AppDataSource.isInitialized) {
        void AppDataSource.destroy();
      }
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((error: unknown) => {
  logger.error('No se pudo iniciar la aplicación', error);
  process.exit(1);
});
