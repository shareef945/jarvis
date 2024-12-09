import { Injectable, Logger } from '@nestjs/common';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { AppConfig, InjectAppConfig } from '../app.config';
import bigInt from 'big-integer';
import { Api } from 'telegram';

@Injectable()
export class MTProtoService {
  private client: TelegramClient;
  private readonly logger = new Logger(MTProtoService.name);

  constructor(@InjectAppConfig() private readonly appConfig: AppConfig) {
    this.initializeClient();
  }

  private async initializeClient() {
    try {
      const stringSession = new StringSession(''); // You can store session string here
      this.client = new TelegramClient(
        stringSession,
        parseInt(this.appConfig.telegram.apiId),
        this.appConfig.telegram.apiHash,
        {
          connectionRetries: 5,
        },
      );

      await this.client.connect();
      this.logger.log('Telegram MTProto client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Telegram client:', error);
      throw error;
    }
  }

  async downloadFile(
    fileId: string,
    accessHash: string,
    fileReference: Buffer,
    fileType: 'photo' | 'document',
    thumbSize?: string,
    progressCallback?: (progress: number) => Promise<void>,
  ): Promise<Buffer> {
    try {
      if (!this.client.connected) {
        await this.client.connect();
      }

      let inputLocation;
      if (fileType === 'photo') {
        inputLocation = new Api.InputPhotoFileLocation({
          id: bigInt(fileId),
          accessHash: bigInt(accessHash),
          fileReference,
          thumbSize: thumbSize || 'x',
        });
      } else {
        inputLocation = new Api.InputDocumentFileLocation({
          id: bigInt(fileId),
          accessHash: bigInt(accessHash),
          fileReference,
          thumbSize: '', // empty for documents
        });
      }

      const result = await this.client.downloadFile(inputLocation, {
        dcId: 2,
        fileSize: bigInt(0),
        progressCallback: progressCallback
          ? async (progress) => {
              await progressCallback(Number(progress) * 100); // Convert BigInteger to Number before multiplication
            }
          : undefined,
      });

      if (progressCallback) {
        await progressCallback(100);
      }

      return Buffer.from(result);
    } catch (error) {
      this.logger.error('Error downloading file via Telegram client:', error);
      throw error;
    }
  }

  // async getDocument(fileId: string) {
  //   if (!this.client.connected) {
  //     await this.client.connect();
  //   }

  //   const result = await this.client.invoke(
  //     new Api.upload.GetFile({
  //       location: new Api.InputDocumentFileLocation({
  //         id: bigInt(fileId),
  //         accessHash: bigInt(0), // camelCase, not snake_case
  //         file_reference: Buffer.from([]),
  //         thumb_size: '',
  //       }),
  //       offset: bigInt(0),
  //       limit: 1024,
  //     }),
  //   );

  //   return result;
  // }
}
