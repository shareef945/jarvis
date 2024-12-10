import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { appConfig, AppConfig } from './app.config';
import { ValidationExceptionFilter } from './common/filters/http-exception.filter';
import { AllExceptionsFilter } from './common/filters/global-exception.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule);
    const config = app.get<AppConfig>(appConfig.KEY);
    const port = config.app.port || 3000;
    app.enableCors();
    app.useGlobalFilters(
      new ValidationExceptionFilter(),
      new AllExceptionsFilter(),
    );
    const docsConfig = new DocumentBuilder()
      .setTitle('Jarvis - Personal Assistant')
      .setDescription('imagine, Innovate, Implement')
      .addServer(`http://localhost:${port}`, 'Local server')
      .addServer(config.baseUrl.production, 'Production server')
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, docsConfig);
    SwaggerModule.setup('api', app, document);

    await app.listen(port);
    logger.log(`Application successfully started on port ${port}`);
  } catch (error) {
    logger.error(`Failed to start application: ${error.message}`);
    process.exit(1);
  }
}

['unhandledRejection', 'uncaughtException'].forEach((event) => {
  process.on(event, (error: Error) => {
    const logger = new Logger('Bootstrap');
    logger.error(`${event}: ${error.message}`);
    process.exit(1);
  });
});

bootstrap();
