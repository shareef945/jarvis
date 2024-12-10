import { Module } from '@nestjs/common';
import { ReportsController } from './tech.reports.controller';
import { ReportsService } from './reports.service';
import { NotionModule } from 'src/notion/notion.module';

@Module({
  imports: [NotionModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
