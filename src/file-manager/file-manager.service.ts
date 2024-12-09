import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as fileType from 'file-type';
import { FileDownloadDto } from './file-download.dto';
import { ProgressCallback } from 'src/app.types';
import { FileHelpers } from './file.helpers';
import { AppConfig, InjectAppConfig } from 'src/app.config';
import { HttpService } from '@nestjs/axios';
import { MTProtoService } from './mtproto.service';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class FileManagerService {
  private readonly downloadDir: string;
  private readonly adminChatId: string;
  private readonly logger = new Logger(FileManagerService.name);

  constructor(
    @InjectAppConfig() private readonly appConfig: AppConfig,

    private readonly httpService: HttpService,
    private readonly mtProtoService: MTProtoService,
  ) {
    this.downloadDir = this.appConfig.app.downloadDir;
    this.adminChatId = this.appConfig.app.adminChatId;
  }

  private handleError(error: any, operation: string): never {
    this.logger.error(`Error during ${operation}:`, {
      error: error.message,
      stack: error.stack,
    });
    throw new Error(`Failed to ${operation}: ${error.message}`);
  }

  async handleFileDownload(
    fileDto: FileDownloadDto,
    fileBuffer: Buffer,
    progressCallback?: ProgressCallback,
  ): Promise<string> {
    let filePath: string | undefined;
    try {
      // Validate file size
      if (!FileHelpers.validateFileSize(fileDto.fileSize)) {
        throw new Error('Invalid file size');
      }

      const humanReadableSize = FileHelpers.formatSize(fileDto.fileSize);
      this.logger.log(
        `Received file: ${fileDto.fileName} (${humanReadableSize})`,
      );

      // Send alert if sender is not authorized
      if (fileDto.sender.username?.toLowerCase() !== 'shareef945') {
        await this.sendAdminAlert({
          sender:
            fileDto.sender.username ||
            `${fileDto.sender.firstName} ${fileDto.sender.lastName}`,
          fileName: fileDto.fileName,
          fileSize: humanReadableSize,
        });
      }

      // Get dynamic path and create directories
      const relativePath = FileHelpers.getDynamicPath(fileDto.fileName);
      filePath = path.join(this.downloadDir, relativePath);
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      // Write file with progress tracking
      await this.writeFileWithProgress(filePath, fileBuffer, progressCallback);

      // Set file permissions
      await fs.chmod(filePath, 0o644);

      // Verify file type
      const type = await fileType.fromFile(filePath);
      if (!type) {
        throw new Error('Could not determine file type');
      }

      if (!FileHelpers.isValidVideoFile(type.mime)) {
        await fs.unlink(filePath); // Delete invalid file
        throw new Error(`Invalid file type: ${type.mime}`);
      }

      this.logger.log(`File downloaded successfully: ${filePath}`);
      return filePath;
    } catch (error) {
      if (filePath) {
        await this.cleanupFailedDownload(filePath);
      }
      this.handleError(error, 'download file');
    }
  }

  private async writeFileWithProgress(
    filePath: string,
    buffer: Buffer,
    progressCallback?: ProgressCallback,
  ): Promise<void> {
    const totalSize = buffer.length;
    const chunkSize = 1024 * 1024; // 1MB chunks
    const fileHandle = await fs.open(filePath, 'w');

    try {
      let bytesWritten = 0;

      while (bytesWritten < totalSize) {
        const chunk = buffer.slice(bytesWritten, bytesWritten + chunkSize);
        await fileHandle.write(chunk);
        bytesWritten += chunk.length;

        if (progressCallback) {
          await progressCallback(bytesWritten, totalSize);
        }
      }
    } finally {
      await fileHandle.close();
    }
  }

  private async sendAdminAlert(data: {
    sender: string;
    fileName: string;
    fileSize: string;
  }): Promise<void> {
    try {
      const alertMessage =
        `🚨 File Download Alert 🚨\n` +
        `User: ${data.sender}\n` +
        `File: ${data.fileName}\n` +
        `Size: ${data.fileSize}`;

      this.logger.log(`Admin alert sent: ${alertMessage}`);
    } catch (error) {
      this.logger.error('Failed to send alert to admin:', error);
    }
  }

  async getFileInfo(filePath: string): Promise<{
    size: number;
    type: string;
    created: Date;
    modified: Date;
  }> {
    try {
      const stats = await fs.stat(filePath);
      const fileTypeInfo = await fileType.fromFile(filePath);

      return {
        size: stats.size,
        type: fileTypeInfo?.mime || 'application/octet-stream',
        created: stats.birthtime,
        modified: stats.mtime,
      };
    } catch (error) {
      this.logger.error('Error getting file info:', error);
      throw error;
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      this.logger.log(`File deleted successfully: ${filePath}`);
    } catch (error) {
      this.logger.error('Error deleting file:', error);
      throw error;
    }
  }

  async moveFile(sourcePath: string, destinationPath: string): Promise<void> {
    try {
      await fs.mkdir(path.dirname(destinationPath), { recursive: true });
      await fs.rename(sourcePath, destinationPath);
      this.logger.log(`File moved from ${sourcePath} to ${destinationPath}`);
    } catch (error) {
      this.logger.error('Error moving file:', error);
      throw error;
    }
  }

  async listFiles(directoryPath: string): Promise<string[]> {
    try {
      const files = await fs.readdir(directoryPath);
      return files;
    } catch (error) {
      this.logger.error('Error listing files:', error);
      throw error;
    }
  }

  private async cleanupFailedDownload(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      this.logger.log(`Cleaned up failed download: ${filePath}`);
    } catch (error) {
      // Just log the error since this is a cleanup operation
      this.logger.warn(`Failed to clean up file ${filePath}:`, {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  async copyFile(sourcePath: string, destinationPath: string): Promise<void> {
    try {
      await fs.mkdir(path.dirname(destinationPath), { recursive: true });
      await fs.copyFile(sourcePath, destinationPath);
      this.logger.log(`File copied from ${sourcePath} to ${destinationPath}`);
    } catch (error) {
      this.logger.error('Error copying file:', error);
      throw error;
    }
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      this.logger.debug(`Ensured directory exists: ${dirPath}`);
    } catch (error) {
      this.logger.error('Error creating directory:', error);
      throw error;
    }
  }

  async getDirectorySize(dirPath: string): Promise<number> {
    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true });
      let size = 0;

      for (const file of files) {
        const fullPath = path.join(dirPath, file.name);
        if (file.isDirectory()) {
          size += await this.getDirectorySize(fullPath);
        } else {
          const stats = await fs.stat(fullPath);
          size += stats.size;
        }
      }

      return size;
    } catch (error) {
      this.logger.error('Error calculating directory size:', error);
      throw error;
    }
  }
  // Add these new methods
  async downloadLargeFile(
    fileId: string,
    accessHash: string,
    fileReference: Buffer,
    fileType: 'photo' | 'document',
    fileDto: FileDownloadDto,
    progressCallback?: (progress: number) => Promise<void>,
  ): Promise<string> {
    try {
      const fileBuffer = await this.mtProtoService.downloadFile(
        fileId,
        accessHash,
        fileReference,
        fileType,
        undefined, // thumbSize (optional)
        async (progress) => {
          if (progressCallback) {
            await progressCallback(progress);
          }
        },
      );

      return this.handleFileDownload(fileDto, fileBuffer, progressCallback);
    } catch (error) {
      this.handleError(error, 'download large file');
    }
  }

  async downloadSmallFile(
    filePath: string,
    fileDto: FileDownloadDto,
  ): Promise<string> {
    try {
      const url = `https://api.telegram.org/file/bot${this.appConfig.telegram.botToken}/${filePath}`;
      const response = await firstValueFrom(
        this.httpService.get(url, { responseType: 'arraybuffer' }),
      );
      const fileBuffer = Buffer.from(response.data);

      return this.handleFileDownload(fileDto, fileBuffer);
    } catch (error) {
      this.handleError(error, 'download small file');
    }
  }
}
