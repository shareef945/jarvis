import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { appConfig, AppConfig } from '../../app.config';

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [appConfig.KEY],
      useFactory: (config: AppConfig) => {
        const isProduction = config.app.env === 'prod';

        return {
          pinoHttp: {
            transport: isProduction
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    ignore: 'pid,hostname',
                    singleLine: true,
                    translateTime: 'UTC:yyyy-mm-dd HH:MM:ss.l',
                  },
                },
            autoLogging: true,
            level: isProduction ? 'info' : 'debug',
          },
        };
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
