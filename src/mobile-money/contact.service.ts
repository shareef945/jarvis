import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { exec } from 'child_process';
import { promisify } from 'util';
import { AdbService } from './adb.service';

const execAsync = promisify(exec);

export interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
}

@Injectable()
export class ContactService {
  private contacts: Contact[] = [];
  private isConnected = false;
  private lastSyncTime?: Date;
  private retryCount = 0;
  private readonly MAX_RETRIES = 3;

  constructor(
    @InjectPinoLogger(ContactService.name)
    private readonly logger: PinoLogger,
    private readonly adbService: AdbService,
  ) {
    this.startAdbServer().catch((error) => {
      this.logger.error('Failed to start ADB server:', error);
    });

    this.initializeContacts().catch((error) => {
      this.logger.warn(
        'Initial contact load failed, will retry on next request',
        error,
      );
    });
  }

  private async initializeContacts(): Promise<void> {
    try {
      await this.loadContacts();
    } catch (error) {
      this.logger.error('Failed to initialize contacts:', error);
    }
  }

  private async startAdbServer(): Promise<void> {
    try {
      await execAsync('adb kill-server');
      await execAsync('adb start-server');
      this.logger.info('ADB server started successfully');
    } catch (error) {
      this.logger.error('Failed to start ADB server:', error);
      throw error;
    }
  }

  private async checkAdbConnection(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('adb devices');
      const devices = stdout
        .split('\n')
        .filter((line) => line.includes('device'))
        .filter((line) => !line.includes('List of devices'));

      if (devices.length === 0) {
        this.logger.error('No Android devices connected');
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('ADB not found or not properly configured:', error);
      return false;
    }
  }

  private normalizePhoneNumber(
    phone: string,
    toLocal: boolean = false,
  ): string {
    const digitsOnly = phone.replace(/\D/g, '');

    let msisdn: string;
    if (digitsOnly.startsWith('233')) {
      msisdn = digitsOnly;
    } else if (digitsOnly.startsWith('0')) {
      msisdn = `233${digitsOnly.substring(1)}`;
    } else if (digitsOnly.startsWith('7') || digitsOnly.startsWith('1')) {
      msisdn = `233${digitsOnly}`;
    } else {
      msisdn = digitsOnly;
    }

    if (toLocal && msisdn.startsWith('233')) {
      return `0${msisdn.substring(3)}`;
    }

    return msisdn;
  }

  private phoneNumberMatches(
    contactPhone: string,
    searchPhone: string,
  ): boolean {
    const normalizedContact = this.normalizePhoneNumber(contactPhone);
    const normalizedSearch = this.normalizePhoneNumber(searchPhone);

    return normalizedContact === normalizedSearch;
  }

  private async loadContacts() {
    try {
      const isAdbConnected = await this.checkAdbConnection();
      if (!isAdbConnected) {
        this.isConnected = false;
        if (this.contacts.length > 0) {
          this.logger.warn(
            'Using cached contacts due to ADB connection failure',
          );
          return;
        }
        if (this.retryCount < this.MAX_RETRIES) {
          this.retryCount++;
          this.logger.warn(
            `Retrying connection (attempt ${this.retryCount}/${this.MAX_RETRIES})`,
          );
          await new Promise((resolve) => setTimeout(resolve, 2000));
          return this.loadContacts();
        }
        throw new Error('ADB connection failed after maximum retries');
      }

      this.isConnected = true;
      this.retryCount = 0;

      const stdout = await this.adbService.executeShellCommand(
        'content query --uri content://com.android.contacts/data --projection raw_contact_id:display_name:data1 --where "mimetype=\'vnd.android.cursor.item/phone_v2\'"',
      );

      const newContacts = stdout
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => {
          const nameMatch = line.match(/display_name=([^,]+)/);
          const phoneMatch = line.match(/data1=([^,\n]+)/);

          if (!nameMatch || !phoneMatch) {
            this.logger.debug('Failed to match line:', {
              line,
              nameMatch,
              phoneMatch,
            });
            return null;
          }

          const name = nameMatch[1].trim();
          const phoneNumber = phoneMatch[1].trim().replace(/\s+/g, '');

          if (
            name === 'Apple Inc.' ||
            name === 'Petra Shortcode' ||
            name === 'Insurance Check' ||
            name.includes('Shortcode') ||
            phoneMatch[1].trim().startsWith('*')
          ) {
            return null;
          }

          const contact = {
            id: Math.random().toString(36).substr(2, 9),
            name: name,
            phoneNumber: this.normalizePhoneNumber(phoneNumber, true),
          };

          return contact;
        })
        .filter((contact): contact is Contact => contact !== null);

      if (newContacts.length > 0) {
        this.contacts = newContacts;
        this.lastSyncTime = new Date();
        this.logger.info(
          `Loaded ${this.contacts.length} contacts successfully`,
        );
      } else {
        this.logger.warn('No valid contacts found in device');
        this.logger.debug('Raw data:', stdout);
      }
    } catch (error) {
      this.logger.error('Failed to load contacts:', error);
      if (this.contacts.length === 0) {
        throw new Error(
          'Failed to load contacts and no cached contacts available',
        );
      }
    }
  }

  async getConnectionStatus(): Promise<{
    isConnected: boolean;
    contactCount: number;
    lastSync?: Date;
    retryCount: number;
  }> {
    return {
      isConnected: this.isConnected,
      contactCount: this.contacts.length,
      lastSync: this.lastSyncTime,
      retryCount: this.retryCount,
    };
  }

  async reloadContacts(): Promise<{
    success: boolean;
    message: string;
    contactCount: number;
  }> {
    try {
      await this.loadContacts();
      return {
        success: true,
        message: 'Contacts reloaded successfully',
        contactCount: this.contacts.length,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        contactCount: this.contacts.length,
      };
    }
  }

  async findContacts(searchTerm: string): Promise<Contact[]> {
    const normalizedSearch = searchTerm.toLowerCase().trim();
    return this.contacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(normalizedSearch) ||
        contact.phoneNumber.includes(normalizedSearch),
    );
  }

  async getContactByPhone(phone: string): Promise<Contact | undefined> {
    return this.contacts.find(
      (contact) =>
        contact.phoneNumber === phone ||
        contact.phoneNumber.replace(/\D/g, '') === phone.replace(/\D/g, ''),
    );
  }

  getContactByNameAndPhone(name: string, phone: string): Contact | undefined {
    return this.contacts.find(
      (contact) =>
        contact.name.toLowerCase() === name.toLowerCase() &&
        contact.phoneNumber === phone,
    );
  }
}
