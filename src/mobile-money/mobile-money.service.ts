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
    const isConnected = await this.testConnection();
    if (!isConnected) {
      throw new Error('Phone not connected. Please check ADB connection.');
    }

    // Validate amount
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    // Validate phone number format
    if (!/^0[0-9]{9}$/.test(phoneNumber)) {
      throw new Error('Invalid phone number format');
    }

    // // Wake up and unlock screen
    // await this.adbService.executeShellCommand('input keyevent KEYCODE_WAKEUP');
    // await this.adbService.executeShellCommand('input keyevent 82'); // KEYCODE_MENU - usually unlocks
    // await new Promise((resolve) => setTimeout(resolve, 2700)); // Wait for screen to wake

    // // Check if screen is on and unlocked
    // const screenState = await this.adbService.executeShellCommand(
    //   'dumpsys power | grep "Display Power"',
    // );
    // const isScreenOn = screenState.includes('state=ON');
    // if (!isScreenOn) {
    //   throw new Error(
    //     'Failed to wake up phone screen. Please unlock manually.',
    //   );
    // }

    try {
      // Start USSD session
      await this.adbService.executeShellCommand(
        'am start -a android.intent.action.CALL -d "tel:*171%23"',
      );
      await new Promise((resolve) => setTimeout(resolve, 2700));

      // Select option 3 for "Transfer Money"
      await this.adbService.executeShellCommand('input keyevent 10'); // 3
      await this.adbService.executeShellCommand('input keyevent 66'); // Enter
      await new Promise((resolve) => setTimeout(resolve, 2700));

      // Select option 2 for "Other Networks"
      await this.adbService.executeShellCommand('input keyevent 9'); // 2
      await this.adbService.executeShellCommand('input keyevent 66'); // Enter
      await new Promise((resolve) => setTimeout(resolve, 2700));

      // Select option 2 for "Other Networks"
      await this.adbService.executeShellCommand('input keyevent 8'); // 2
      await this.adbService.executeShellCommand('input keyevent 66'); // Enter
      await new Promise((resolve) => setTimeout(resolve, 2700));

      // Enter phone number
      await this.adbService.executeShellCommand(`input text "${phoneNumber}"`);
      await this.adbService.executeShellCommand('input keyevent 66'); // Enter
      await new Promise((resolve) => setTimeout(resolve, 2700));

      // Enter phone number
      await this.adbService.executeShellCommand(`input text "${phoneNumber}"`);
      await this.adbService.executeShellCommand('input keyevent 66'); // Enter
      await new Promise((resolve) => setTimeout(resolve, 2700));

      // Enter amount
      await this.adbService.executeShellCommand(`input text "${amount}"`);
      await this.adbService.executeShellCommand('input keyevent 66'); // Enter
      await new Promise((resolve) => setTimeout(resolve, 2700));

      // Skip reference (just press enter)
      await this.adbService.executeShellCommand(`input text "jarvis"`);
      await this.adbService.executeShellCommand('input keyevent 66'); // Enter
      await new Promise((resolve) => setTimeout(resolve, 2700));

      // Enter PIN - sending each digit separately with small delays
      const pin = '4040';
      // const pin = this.appConfig.momo.pin;
      for (const digit of pin.split('')) {
        await this.adbService.executeShellCommand(`input text "${digit}"`);
        await new Promise((resolve) => setTimeout(resolve, 300)); // Small delay between digits
      }
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait before pressing enter
      await this.adbService.executeShellCommand('input keyevent 66'); // Enter

      this.logger.info('Mobile money transfer completed successfully', {
        phoneNumber,
        amount,
      });
    } catch (error) {
      this.logger.error('Failed to send money:', {
        error,
        amount,
        phoneNumber,
      });
      throw new Error(
        'Failed to complete mobile money transaction: ' + error.message,
      );
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test basic ADB connection
      const result = await this.adbService.executeShellCommand('echo "test"');
      if (result.trim() !== 'test') {
        return false;
      }

      // Check if screen is on
      const screenState = await this.adbService.executeShellCommand(
        'dumpsys power | grep "Display Power"',
      );
      const isScreenOn = screenState.includes('state=ON');

      if (!isScreenOn) {
        this.logger.warn('Phone screen is off. Attempting to wake...');
        await this.adbService.executeShellCommand(
          'input keyevent KEYCODE_WAKEUP',
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      return true;
    } catch (error) {
      this.logger.error('ADB connection test failed:', error);
      return false;
    }
  }
}
