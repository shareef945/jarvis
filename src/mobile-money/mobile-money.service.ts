import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AdbService } from './adb.service';
import { Contact, ContactService } from './contact.service';
import { AppConfig, InjectAppConfig } from 'src/app.config';

@Injectable()
export class MobileMoneyService {
  constructor(
    @InjectPinoLogger(MobileMoneyService.name)
    @InjectAppConfig()
    private readonly appConfig: AppConfig,

    private readonly logger: PinoLogger,
    private readonly adbService: AdbService,
    private readonly contactService: ContactService,
  ) {}

  async findContacts(name: string): Promise<Contact[]> {
    try {
      return await this.contactService.findContacts(name);
    } catch (error) {
      this.logger.error('Failed to find contacts:', error);
      throw new Error('Failed to search contacts');
    }
  }

  async getContactByPhone(phone: string): Promise<Contact | undefined> {
    try {
      return await this.contactService.getContactByPhone(phone);
    } catch (error) {
      this.logger.error('Failed to get contact by phone:', error);
      throw new Error('Failed to retrieve contact');
    }
  }

  async getConnectionStatus(): Promise<{
    isConnected: boolean;
    contactCount: number;
    lastSync?: Date;
    retryCount: number;
  }> {
    return this.contactService.getConnectionStatus();
  }

  async sendMoney(amount: number, phoneNumber: string): Promise<void> {
    try {
      // MTN Mobile Money USSD code format
      const ussdCode = `*170*1*${phoneNumber}*${amount}#`;
      await this.adbService.executeUssd(ussdCode);

      // Wait for confirmation prompt
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Press 1 to confirm
      await this.adbService.pressKey(8);

      // Wait for PIN prompt
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Enter PIN (you'll need to implement secure PIN storage)
      await this.adbService.inputText(this.appConfig.momo.pin);
    } catch (error) {
      this.logger.error('Failed to send money:', error);
      throw new Error('Failed to complete mobile money transaction');
    }
  }
}
