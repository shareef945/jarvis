import { Module } from '@nestjs/common';
import { MobileMoneyService } from './mobile-money.service';
import { ContactService } from './contact.service';
import { AdbService } from './adb.service';
import { MobileMoneyCommand } from 'src/telegram/commands/mobile-money.command';

@Module({
  providers: [
    MobileMoneyService,
    MobileMoneyCommand,
    ContactService,
    AdbService,
  ],
  exports: [MobileMoneyService],
})
export class MobileMoneyModule {}
