import { Module } from '@nestjs/common';
import { FileManagerService } from './file-manager.service';
import { FileManagerController } from './file-manager.controller';
import { HttpModule } from '@nestjs/axios';
import { MTProtoService } from './mtproto.service';

@Module({
  imports: [HttpModule],
  providers: [FileManagerService, MTProtoService],
  controllers: [FileManagerController],
  exports: [FileManagerService, MTProtoService],
})
export class FileManagerModule {}
