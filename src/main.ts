import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { appConfig, AppConfig } from './app.config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    logger.log('Creating NestJS application...');
    const app = await NestFactory.create(AppModule);

    logger.log('Getting application config...');
    const config = app.get<AppConfig>(appConfig.KEY);

    const port = config.app.port || 3000;
    logger.log(`Attempting to start server on port ${port}...`);

    // Wait for both the HTTP server and any async init to complete
    await Promise.all([
      app.listen(port),
      // Add a small delay to ensure Telegram bot is fully initialized
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);

    logger.log(`Application successfully started on port ${port}`);
  } catch (error) {
    logger.error(`Failed to start application: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

// Add specific error handlers for common issues
process.on('unhandledRejection', (error: Error) => {
  const logger = new Logger('Bootstrap');
  logger.error(`Unhandled Rejection: ${error.message}`);
  logger.error(error.stack);
  process.exit(1);
});

process.on('uncaughtException', (error: Error) => {
  const logger = new Logger('Bootstrap');
  logger.error(`Uncaught Exception: ${error.message}`);
  logger.error(error.stack);
  process.exit(1);
});

bootstrap().catch((error) => {
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});
