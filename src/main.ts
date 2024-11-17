import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { appConfig, AppConfig } from './app.config';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  const config = app.get<AppConfig>(appConfig.KEY);
  const logger = app.get(Logger);
  app.useLogger(logger);

  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  const port = config.app.port || 3000;
  await app.listen(port);
  logger.log(`Application is running on port: ${port}`);
}
bootstrap();
