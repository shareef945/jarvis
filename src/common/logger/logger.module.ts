import { Global, Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule, Logger } from 'nestjs-pino';
import { appConfig, AppConfig } from '../../app.config';

@Global()
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [appConfig.KEY],
      useFactory: (config: AppConfig) => ({
        pinoHttp: {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              ignore: 'pid,hostname',
              singleLine: true,
              translateTime: 'UTC:yyyy-mm-dd HH:MM:ss.l',
            },
          },
          autoLogging: true,
          level: config.app.env === 'prod' ? 'info' : 'debug',
        },
      }),
    }),
  ],
  providers: [Logger],
  exports: [PinoLoggerModule, Logger],
})
export class LoggerModule {}
