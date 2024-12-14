import { Controller, Get, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { join } from 'path';
import { Response } from 'express';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectPinoLogger(AppController.name)
    private readonly logger: PinoLogger,
  ) {}

  @Get('health')
  healthCheck() {
    this.logger.info('Health check endpoint called');
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    };
  }

  @Get()
  getStaticImage(@Res() res: Response): void {
    const imagePath = join(__dirname, '..', 'public/images/jarvis.png');
    res.sendFile(imagePath);
  }
}
