import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { NotionService } from '../notion/notion.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Reports')
@Controller('/tech/reports')
export class ReportsController {
  constructor(private readonly notionService: NotionService) {}

  @Get('count')
  async getProjectsCount() {
    try {
      return {
        count: await this.notionService.countProjects(),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get project count: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('databases')
  async getDatabases() {
    try {
      return await this.notionService.listDatabases();
    } catch (error) {
      throw new HttpException(
        `Failed to get databases: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('industries')
  async getIndustryOptions() {
    try {
      return await this.notionService.getIndustryOptions();
    } catch (error) {
      throw new HttpException(
        `Failed to get industry options: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('project-details')
  async getAllProjectDetails() {
    try {
      return await this.notionService.getAllProjectDetails();
    } catch (error) {
      throw new HttpException(
        `Failed to get project details: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
