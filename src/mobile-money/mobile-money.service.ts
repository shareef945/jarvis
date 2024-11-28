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
      // Start USSD session with *171#
      await this.adbService.executeUssd('*171#');
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Select option 3 for "Transfer Money"
      await this.adbService.pressKey(51); // ASCII for '3'
      await this.adbService.pressKey(66); // Enter key
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Select option 2 for "Other Networks"
      await this.adbService.pressKey(50); // ASCII for '2'
      await this.adbService.pressKey(66); // Enter key
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Enter phone number
      await this.adbService.inputText(phoneNumber);
      await this.adbService.pressKey(66); // Enter key
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Enter amount
      await this.adbService.inputText(amount.toString());
      await this.adbService.pressKey(66); // Enter key
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Enter reference (optional) - just press enter to skip
      await this.adbService.pressKey(66); // Enter key
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Confirm transaction (usually 1)
      await this.adbService.pressKey(49); // ASCII for '1'
      await this.adbService.pressKey(66); // Enter key
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Enter PIN
      await this.adbService.inputText(this.appConfig.momo.pin);
      await this.adbService.pressKey(66); // Enter key

      this.logger.info('Mobile money transfer completed successfully');
    } catch (error) {
      this.logger.error('Failed to send money:', error);
      throw new Error('Failed to complete mobile money transaction');
    }
  }
}
