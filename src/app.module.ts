import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TelegramModule } from './telegram/telegram.module';
import { GoogleSheetsModule } from './google-sheets/google-sheets.module';
import { FileManagerModule } from './file-manager/file-manager.module';

@Module({
  imports: [TelegramModule, GoogleSheetsModule, FileManagerModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
