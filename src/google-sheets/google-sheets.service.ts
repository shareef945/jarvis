import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { AppConfig, InjectAppConfig } from 'src/app.config';

@Injectable()
export class GoogleSheetsService {
  private sheets;
  private drive;
  private readonly logger = new Logger(GoogleSheetsService.name);
  public currentWorkbook: string;
  public currentWorksheet: string;

  constructor(@InjectAppConfig() private readonly appConfig: AppConfig) {
    this.initializeServices();
  }

  public readonly GSHEET_CONFIGS = {
    sales_tracking: {
      workbook_id: this.appConfig.google.sheets.microfinance.workbookId,
      worksheet_name: this.appConfig.google.sheets.microfinance.sheetName,
      product_data: {
        worksheet_name: this.appConfig.google.sheets.microfinance.productInfo,
        range: 'A2:P',
        columns: {
          product_id: 2,
          customer_name: 4,
          weekly_installment: 13,
          other_info: 3,
        },
      },
      columns: {
        product_id: 0,
        amount: 2,
        date: 3,
        days_late: 4,
      },
    },
    maintenance_cost: {
      workbook_id: this.appConfig.google.sheets.realEstate.workbookId,
      worksheet_name: this.appConfig.google.sheets.realEstate.maintSheet,
      property_data: {
        worksheet_name: this.appConfig.google.sheets.realEstate.propertyInfo,
        range: 'A2:P',
        columns: {
          unique_id: 2,
          property_name: 6,
        },
      },
      columns: {
        date: 0,
        unique_id: 1,
        property_name: 2,
        category: 3,
        description: 4,
        amount: 6,
      },
    },
    capex: {
      workbook_id: this.appConfig.google.sheets.realEstate.workbookId,
      worksheet_name: this.appConfig.google.sheets.realEstate.capexSheet,
      property_data: {
        worksheet_name: this.appConfig.google.sheets.realEstate.propertyInfo,
        range: 'A2:P',
        columns: {
          unique_id: 2,
          property_name: 6,
        },
      },
      columns: {
        date: 2,
        unique_id: 0,
        property_name: 1,
        description: 5,
        amount: 4,
      },
    },
  };

  async getValues(spreadsheetId: string, range: string) {
    try {
      if (!this.sheets) {
        throw new Error('Google Sheets service not initialized');
      }

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      // this.logger.debug('Successfully retrieved values from spreadsheet');
      return response.data.values;
    } catch (error) {
      this.logger.error('Error getting values:', error);
      throw error;
    }
  }

  private async initializeServices() {
    try {
      const auth = new JWT({
        keyFile: this.appConfig.google.serviceAccountPath,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive.readonly',
        ],
      });

      this.sheets = google.sheets({ version: 'v4', auth });
      this.drive = google.drive({ version: 'v3', auth });
      this.logger.log('Google sheet & drive initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Google services:', error);
      throw new Error('Failed to initialize Google services');
    }
  }

  async listWorkbooks() {
    try {
      const response = await this.drive.files.list({
        q: "mimeType='application/vnd.google-apps.spreadsheet'",
        fields: 'files(id, name)',
        pageSize: 50,
      });

      return response.data.files;
    } catch (error) {
      this.logger.error('Error listing workbooks:', error);
      throw error;
    }
  }

  async listWorksheets(spreadsheetId: string) {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId,
      });

      return response.data.sheets.map((sheet) => sheet.properties.title);
    } catch (error) {
      this.logger.error('Error listing worksheets:', error);
      throw error;
    }
  }

  async getProductDetails(productId: string) {
    try {
      const config = this.GSHEET_CONFIGS.sales_tracking;
      const range = `${config.product_data.worksheet_name}!${config.product_data.range}`;

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: config.workbook_id,
        range,
      });

      const rows = response.data.values;
      if (!rows) return null;

      return rows.find(
        (row) => row[config.product_data.columns.product_id] === productId,
      );
    } catch (error) {
      this.logger.error('Error getting product details:', error);
      throw error;
    }
  }

  async recordWeeklySalesPayment(productId: string, amount: number) {
    try {
      const config = this.GSHEET_CONFIGS.sales_tracking;
      const today = new Date().toISOString().split('T')[0];
      const daysLate = await this.calculateDaysLate();

      const rowData = Array(
        Math.max(...Object.values(config.columns)) + 1,
      ).fill('');
      rowData[config.columns.product_id] = productId;
      rowData[config.columns.amount] = amount.toString();
      rowData[config.columns.date] = today;
      rowData[config.columns.days_late] = daysLate.toString();

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: config.workbook_id,
        range: config.worksheet_name,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [rowData],
        },
      });
      this.logger.log(
        `Payment recorded successfully for ${productId} - GHS ${amount.toString()}`,
      );
      return {
        productId,
        amount,
        date: today,
        daysLate,
      };
    } catch (error) {
      this.logger.error('Error recording payment:', error);
      throw error;
    }
  }

  async recordMaintenanceCost(
    propertyId: string,
    amount: number,
    category: string,
    description: string,
    propertyName: string,
  ) {
    try {
      const config = this.GSHEET_CONFIGS.maintenance_cost;
      const today = new Date().toISOString().split('T')[0];

      const rowData = Array(
        Math.max(...Object.values(config.columns)) + 1,
      ).fill('');
      rowData[config.columns.date] = today;
      rowData[config.columns.unique_id] = propertyId;
      rowData[config.columns.amount] = amount.toString();
      rowData[config.columns.category] = category;
      rowData[config.columns.description] = description;
      rowData[config.columns.property_name] = propertyName;

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: config.workbook_id,
        range: config.worksheet_name,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [rowData],
        },
      });
      this.logger.log(
        `Payment recorded successfully for ${propertyId} - GHS ${amount.toString()}`,
      );
      return {
        propertyId,
        amount,
        date: today,
        category,
        description,
        propertyName,
      };
    } catch (error) {
      this.logger.error('Error recording payment:', error);
      throw error;
    }
  }

  async calculateDaysLate(): Promise<number> {
    // Implement your days late calculation logic here
    return 0; // Placeholder
  }

  async recordCapex(
    propertyId: string,
    propertyName: string,
    amount: number,
    description: string,
  ) {
    try {
      const config = this.GSHEET_CONFIGS.capex;
      const today = new Date().toISOString().split('T')[0];

      const rowData = Array(
        Math.max(...Object.values(config.columns)) + 1,
      ).fill('');

      rowData[config.columns.date] = today;
      rowData[config.columns.unique_id] = propertyId;
      rowData[config.columns.amount] = amount.toString();
      rowData[config.columns.description] = description;
      rowData[config.columns.property_name] = propertyName;

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: config.workbook_id,
        range: config.worksheet_name,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [rowData],
        },
      });

      this.logger.log(
        `Capex recorded successfully for ${propertyId} - GHS ${amount.toString()}`,
      );

      const result = {
        propertyId,
        propertyName,
        description,
        amount,
        date: today,
      };

      this.logger.debug('Returning result:', result);
      return result;
    } catch (error) {
      this.logger.error('Error recording capex:', {
        error: error.message,
        stack: error.stack,
        propertyId,
        propertyName,
        amount,
        description,
      });
      throw error;
    }
  }
}
