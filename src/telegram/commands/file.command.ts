import { Injectable } from '@nestjs/common';
import { Context } from 'grammy';
import { Command } from 'src/common/decorators/command.decorator';
import { BaseCommand } from './base.command';
import { FileManagerService } from 'src/file-manager/file-manager.service';

@Injectable()
@Command({
  name: 'file',
  description: 'Handle file downloads',
  usage: 'Send any video file to download it',
})
export class FileCommand extends BaseCommand {
  constructor(private readonly fileManagerService: FileManagerService) {
    super();
  }

  async execute(ctx: Context): Promise<void> {
    await ctx.reply(
      '📁 File Handler\n\n' +
        'Simply send me any video file, and I will process it for you.\n\n' +
        'Supported formats: MP4, MKV, AVI\n' +
        'Maximum file size: 2GB',
    );
  }
}
