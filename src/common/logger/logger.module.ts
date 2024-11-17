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
            level: 'debug', // Set to debug to see more logs
          },
        },
        autoLogging: true, // Enable auto logging
        level: 'debug', // Set to debug to see more logs
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
