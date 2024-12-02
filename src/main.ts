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

  // Add debug logging
  const port = parseInt(config.app.port) || 3000;

  try {
    console.log('Initializing app...');
    await app.listen(port, '0.0.0.0');
    console.log(`Application started successfully on: ${await app.getUrl()}`);
  } catch (err) {
    console.error('Error starting the application:', err);
    process.exit(1);
  }
}
bootstrap();
