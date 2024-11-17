import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

@Injectable()
export class GoogleSheetsService {
  private readonly logger = new Logger(GoogleSheetsService.name);
  private sheets;
  private drive;

  constructor(private configService: ConfigService) {
    this.initializeServices();
  }

  private async initializeServices() {
    try {
      const auth = new JWT({
        keyFile: this.configService.get('google.serviceAccountPath'),
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive.readonly',
        ],
      });

      this.sheets = google.sheets({ version: 'v4', auth });
      this.drive = google.drive({ version: 'v3', auth });
      this.logger.log('Google services initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Google services:', error);
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
}
