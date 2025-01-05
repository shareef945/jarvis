import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TelegramModule } from './telegram/telegram.module';
import { GoogleSheetsModule } from './google-sheets/google-sheets.module';
import { ConfigModule } from '@nestjs/config';
import { appConfig, validationSchema } from './app.config';
import { LoggerModule } from './common/logger/logger.module';
import { MobileMoneyModule } from './mobile-money/mobile-money.module';
import { NotionModule } from './notion/notion.module';
import { ReportsModule } from './reports/reports.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validationSchema,
      cache: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    LoggerModule,
    MobileMoneyModule,
    GoogleSheetsModule,
    TelegramModule,
    NotionModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
