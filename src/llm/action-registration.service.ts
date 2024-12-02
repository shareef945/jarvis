import { Injectable, OnModuleInit } from '@nestjs/common';
import { MobileMoneyService } from '../mobile-money/mobile-money.service';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service';
import { FileManagerService } from '../file-manager/file-manager.service';
import { ActionRegistryService } from './action-registry.service';

@Injectable()
export class ActionRegistrationService implements OnModuleInit {
  constructor(
    private readonly actionRegistry: ActionRegistryService,
    private readonly mobileMoneyService: MobileMoneyService,
    private readonly googleSheetsService: GoogleSheetsService,
    private readonly fileManagerService: FileManagerService,
  ) {}

  onModuleInit() {
    this.registerActions();
  }

  private registerActions() {
    // Register Mobile Money Actions
    this.actionRegistry.registerAction({
      name: 'sendMoney',
      description: 'Send mobile money to a contact',
      parameters: {
        amount: {
          type: 'number',
          description: 'Amount to send in GHS',
          required: true,
        },
        phoneNumber: {
          type: 'string',
          description: 'Recipient phone number',
          required: true,
        },
      },
      handler: async (params) => {
        return this.mobileMoneyService.sendMoney(
          params.amount,
          params.phoneNumber,
        );
      },
    });

    // Register Google Sheets Actions
    this.actionRegistry.registerAction({
      name: 'recordPayment',
      description: 'Record a payment in the microfinance sheet',
      parameters: {
        productId: {
          type: 'string',
          description: 'Product ID',
          required: true,
        },
        amount: {
          type: 'number',
          description: 'Payment amount',
          required: true,
        },
      },
      handler: async (params) => {
        return this.googleSheetsService.recordWeeklySalesPayment(
          params.productId,
          params.amount,
        );
      },
    });

    // Add more actions for other commands...
  }
}
