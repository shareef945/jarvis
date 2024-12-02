import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectPinoLogger(AppController.name)
    private readonly logger: PinoLogger,
  ) {}

  @Get()
  getHello(): string {
    this.logger.info('Handling GET / request');
    return this.appService.getHello();
  }

  @Get('health')
  healthCheck() {
    this.logger.info('Health check endpoint called');
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
