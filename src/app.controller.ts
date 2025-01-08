import { Controller, Get, Res, Logger } from '@nestjs/common';
import { AppService } from './app.service';
import { join } from 'path';
import { Response } from 'express';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  @Get('health')
  healthCheck() {
    this.logger.log('Health check endpoint called');
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
