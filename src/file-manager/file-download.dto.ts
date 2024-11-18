export class FileDownloadDto {
  fileName: string;
  fileSize: number;
  mimeType: string;
  sender: {
    username?: string;
    firstName?: string;
    lastName?: string;
  };
}
