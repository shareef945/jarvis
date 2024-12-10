import { Inject } from '@nestjs/common';
import { ConfigType, registerAs } from '@nestjs/config';
import * as Joi from 'joi';
import { parseUserRoles } from './app.utils';

export const appConfig = registerAs('app', () => {
  return {
    telegram: {
      apiId: process.env.API_ID,
      apiHash: process.env.API_HASH,
      botToken: process.env.BOT_TOKEN,
    },
    momo: { pin: process.env.MOMO_PIN },
    baseUrl: { production: process.env.BASE_URL_PROD },
    notion: {
      apiKey: process.env.NOTION_API_KEY,
      db: {
        projects: process.env.NOTION_PROJECTS_DATABASE_ID,
        companies: process.env.NOTION_COMPANIES_DATABASE_ID,
        deals: process.env.NOTION_DEALS_DATABASE_ID,
      },
    },
    google: {
      serviceAccountPath: process.env.GOOGLE_SERVICE_ACCOUNT_PATH,
      sheets: {
        microfinance: {
          workbookId: process.env.MICROFINANCE_WORKBOOK_ID,
          sheetName: process.env.MINCROFINANCE_WORKBOOK_INPUT_SHEETNAME,
          productInfo:
            process.env.MINCROFINANCE_WORKBOOK_PRODUCT_DATA_SHEETNAME,
        },
        realEstate: {
          workbookId: process.env.REAL_ESTATE_WORKBOOK_ID,
          maintSheet: process.env.REAL_ESTATE_WORKBOOK_MAINT_SHEETNAME,
          capexSheet: process.env.REAL_ESTATE_WORKBOOK_CAPEX_SHEETNAME,
          propertyInfo:
            process.env.REAL_ESTATE_WORKBOOK_PROPERTY_INFO_SHEETNAME,
        },
      },
    },
    app: {
      downloadDir: process.env.DOWNLOAD_DIR || '/app/downloads',
      adminChatId: process.env.ADMIN_CHAT_ID,
      port: process.env.PORT,
      userRoles: parseUserRoles(process.env.USER_ROLES),
      env: process.env.NODE_ENV || 'dev',
    },
  };
});

export type AppConfig = ConfigType<typeof appConfig>;

export const InjectAppConfig = () => Inject(appConfig.KEY);

export const validationSchema = Joi.object({
  API_ID: Joi.number().required(),
  API_HASH: Joi.string().required(),
  BOT_TOKEN: Joi.string().required(),
  USER_ROLES: Joi.string().required(),
  DOWNLOAD_DIR: Joi.string().required(),
  ADMIN_CHAT_ID: Joi.number().required(),
  BASE_URL_PROD: Joi.string().required(),
  NOTION_API_KEY: Joi.string().required(),
  NOTION_PROJECTS_DATABASE_ID: Joi.string().required(),
  NOTION_COMPANIES_DATABASE_ID: Joi.string().required(),
  NOTION_DEALS_DATABASE_ID: Joi.string().required(),
  PORT: Joi.number().default(3000),
  GOOGLE_SERVICE_ACCOUNT_PATH: Joi.string().required(),
  MICROFINANCE_WORKBOOK_ID: Joi.string().required(),
  MINCROFINANCE_WORKBOOK_INPUT_SHEETNAME: Joi.string().required(),
  MINCROFINANCE_WORKBOOK_PRODUCT_DATA_SHEETNAME: Joi.string().required(),
  REAL_ESTATE_WORKBOOK_ID: Joi.string().required(),
  REAL_ESTATE_WORKBOOK_MAINT_SHEETNAME: Joi.string().required(),
  REAL_ESTATE_WORKBOOK_CAPEX_SHEETNAME: Joi.string().required(),
  REAL_ESTATE_WORKBOOK_PROPERTY_INFO_SHEETNAME: Joi.string().required(),
  NODE_ENV: Joi.string().valid('dev', 'prod').default('dev'),
  MOMO_PIN: Joi.string().required(),
});
