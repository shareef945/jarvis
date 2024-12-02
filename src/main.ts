import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { appConfig, AppConfig } from './app.config';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<AppConfig>(appConfig.KEY);
  const logger = app.get(Logger);
  app.useLogger(logger);
  app.enableCors();

  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  // Log all registered routes
  const server = app.getHttpServer();
  const router = server._events.request._router;

  console.log('Registered Routes:');
  router.stack.forEach((layer) => {
    if (layer.route) {
      const path = layer.route?.path;
      const method = layer.route?.stack[0].method;
      console.log(`${method.toUpperCase()} ${path}`);
    }
  });

  // Add debug logging
  const port = parseInt(config.app.port) || 3001;
  console.log(`Attempting to start server on port: ${port}`);
  console.log('Environment variables:', {
    configPort: config.app.port,
    envPort: process.env.PORT,
  });

  try {
    await app.listen(port);
    console.log(`Listening on ${await app.getUrl()}`);

    console.log(`Application is running on port: ${port}`);
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}
bootstrap();
