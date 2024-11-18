import { Inject } from '@nestjs/common';
import { ConfigType, registerAs } from '@nestjs/config';
import * as Joi from 'joi';

function parseUserRoles(rolesString: string = ''): Record<number, string> {
  return rolesString
    .split(',')
    .filter((role) => role.includes(':'))
    .reduce((acc, role) => {
      const [userId, userRole] = role.split(':');
      acc[parseInt(userId)] = userRole;
      return acc;
    }, {});
}

export const appConfig = registerAs('app', () => {
  return {
    telegram: {
      apiId: process.env.API_ID,
      apiHash: process.env.API_HASH,
      botToken: process.env.BOT_TOKEN,
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
  GOOGLE_SERVICE_ACCOUNT_PATH: Joi.string().required(),
  MICROFINANCE_WORKBOOK_ID: Joi.string().required(),
  MINCROFINANCE_WORKBOOK_INPUT_SHEETNAME: Joi.string().required(),
  MINCROFINANCE_WORKBOOK_PRODUCT_DATA_SHEETNAME: Joi.string().required(),
  NODE_ENV: Joi.string().valid('dev', 'prod').default('dev'),
});
