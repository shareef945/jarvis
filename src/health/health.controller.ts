import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  DiskHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private disk: DiskHealthIndicator,
    private memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Check system health' })
  @ApiResponse({ status: 200, description: 'System is healthy' })
  @ApiResponse({ status: 503, description: 'System is unhealthy' })
  async check() {
    try {
      await this.health.check([
        () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
        () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024),
        () =>
          this.disk.checkStorage('storage', {
            thresholdPercent: 0.9,
            path: '/',
          }),
      ]);

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        message: 'All systems operational',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV,
      };
    } catch (error) {
      console.error('Health check failed:', error);

      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        message: 'System check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
