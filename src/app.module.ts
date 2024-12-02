import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TelegramModule } from './telegram/telegram.module';
import { GoogleSheetsModule } from './google-sheets/google-sheets.module';
import { FileManagerModule } from './file-manager/file-manager.module';
import { ConfigModule } from '@nestjs/config';
import { appConfig, validationSchema } from './app.config';
import { LoggerModule } from './common/logger/logger.module';
import { MobileMoneyModule } from './mobile-money/mobile-money.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validationSchema,
      cache: true,
    }),
    LoggerModule,
    MobileMoneyModule,
    TelegramModule,
    GoogleSheetsModule,
    FileManagerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
