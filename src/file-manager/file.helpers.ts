import * as path from 'path';

export class FileHelpers {
  static formatSize(sizeBytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = sizeBytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  static getDynamicPath(fileName: string): string {
    const { name, ext } = path.parse(fileName);

    // Check if it's a TV show
    const tvMatch = name.match(/(.*?)S(\d+)E(\d+)/i);
    if (tvMatch) {
      const showName = FileHelpers.sanitizeName(tvMatch[1].trim());
      const season = parseInt(tvMatch[2]);
      const episode = parseInt(tvMatch[3]);

      // Extract quality if present in square brackets
      const qualityMatch = name.match(/\[(.*?)\]/);
      const qualitySuffix = qualityMatch ? ` [${qualityMatch[1]}]` : '';

      // Check for year in show name
      const yearMatch = name.match(/(.*?)[(\s](\d{4})[)\s]/);
      let showFolder: string;
      let plexFileName: string;

      if (yearMatch) {
        const cleanShowName = FileHelpers.sanitizeName(yearMatch[1].trim());
        const year = yearMatch[2];
        showFolder = `${cleanShowName} (${year})`;
        plexFileName = `${cleanShowName} - s${season.toString().padStart(2, '0')}e${episode.toString().padStart(2, '0')}${qualitySuffix}${ext.toLowerCase()}`;
      } else {
        showFolder = showName;
        plexFileName = `${showName} - s${season.toString().padStart(2, '0')}e${episode.toString().padStart(2, '0')}${qualitySuffix}${ext.toLowerCase()}`;
      }

      return path.join(
        'tv-shows',
        showFolder,
        `Season ${season.toString().padStart(2, '0')}`,
        plexFileName,
      );
    }

    // Handle movies
    const movieMatch = name.match(/(.*?)(\d{4})/);
    if (movieMatch) {
      const movieName = FileHelpers.sanitizeName(movieMatch[1].trim());
      const year = movieMatch[2];

      const qualityMatch = name.match(/\[(.*?)\]/);
      const qualitySuffix = qualityMatch ? ` ${qualityMatch[1]}` : '';

      const plexFileName = `${movieName} (${year})${qualitySuffix}${ext.toLowerCase()}`;
      return path.join('movies', plexFileName);
    }

    // Default case
    const qualityMatch = name.match(/\[(.*?)\]/);
    const qualitySuffix = qualityMatch ? ` ${qualityMatch[1]}` : '';
    const plexFileName = `${FileHelpers.sanitizeName(name)}${qualitySuffix}${ext.toLowerCase()}`;
    return path.join('movies', plexFileName);
  }

  static sanitizeName(name: string): string {
    return name
      .replace(/[._]/g, ' ')
      .replace(/[^a-zA-Z0-9\s()]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  static isValidVideoFile(mimeType: string): boolean {
    const validVideoTypes = [
      'video/mp4',
      'video/x-matroska',
      'video/x-msvideo',
      'video/quicktime',
      'video/x-ms-wmv',
    ];
    return validVideoTypes.includes(mimeType);
  }

  static getFileExtension(fileName: string): string {
    const ext = path.extname(fileName);
    return ext ? ext.toLowerCase() : '';
  }

  static validateFileSize(size: number): boolean {
    const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
    return size > 0 && size <= MAX_FILE_SIZE;
  }
}
