import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            singleLine: true,
            translateTime: 'UTC:yyyy-mm-dd HH:MM:ss.l',
            level: 'debug',
          },
        },
        autoLogging: true,
        level: 'debug',
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
