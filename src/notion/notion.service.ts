import { Injectable } from '@nestjs/common';
import { Client } from '@notionhq/client';
import { AppConfig, InjectAppConfig } from 'src/app.config';

@Injectable()
export class NotionService {
  private notionClient: Client;

  constructor(@InjectAppConfig() private appConfig: AppConfig) {
    this.notionClient = new Client({
      auth: this.appConfig.notion.apiKey,
    });
  }

  async countProjects(): Promise<number> {
    const databaseId = this.appConfig.notion.db.projects;
    const response = await this.notionClient.databases.query({
      database_id: databaseId,
    });
    return response.results.length;
  }

  async listDatabases(): Promise<any[]> {
    const response = await this.notionClient.search({
      filter: { property: 'object', value: 'database' },
      page_size: 100,
    });
    return response.results;
  }

  async getIndustryOptions(): Promise<string[]> {
    const databaseId = this.appConfig.notion.db.companies;
    const response = await this.notionClient.databases.query({
      database_id: databaseId,
    });
    const industryOptions = new Set<string>();
    for (const page of response.results) {
      if ('properties' in page) {
        const properties = page.properties as any;
        const industryProperty = properties['Industry'];

        if (industryProperty) {
          const options =
            industryProperty.type === 'select'
              ? [industryProperty.select]
              : industryProperty.multi_select;

          options.forEach((option) => {
            if (option) {
              industryOptions.add(option.name);
            }
          });
        }
      }
    }

    return Array.from(industryOptions);
  }

  async createDeal(data: any): Promise<void> {
    const databaseId = process.env.NOTION_DEALS_DATABASE_ID;
    await this.notionClient.pages.create({
      parent: { database_id: databaseId },
      properties: {
        // map the data from Calendly to the properties of your Notion database
      },
    });
  }

  async getAllProjectDetails(): Promise<any[]> {
    const databaseId = this.appConfig.notion.db.projects;
    const response = await this.notionClient.databases.query({
      database_id: databaseId,
    });

    const cleanedResponse = response.results.map((page: any) => {
      return {
        Name: page.properties.Name.title[0]?.plain_text,
        Status: page.properties.Status.status?.name,
        'Staging URL': page.properties['Staging URL'].url,
        'Production URL': page.properties['Production URL'].url,
        Date: page?.properties?.Date?.date,
      };
    });

    return cleanedResponse;
  }
}
