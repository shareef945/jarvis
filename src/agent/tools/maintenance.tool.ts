// import { Tool } from '@langchain/core/tools';
// import { GoogleSheetsService } from '../../google-sheets/google-sheets.service';

// export function createMaintenanceTool(
//   sheetsService: GoogleSheetsService,
// ): Tool {
//   return {
//     name: 'addMaintenanceCost',
//     description:
//       'Add a maintenance cost for a property. Input should include amount, description, and property.',
//     schema: {
//       type: 'object',
//       properties: {
//         amount: { type: 'number', description: 'Cost amount' },
//         description: {
//           type: 'string',
//           description: 'Description of the maintenance',
//         },
//         property: { type: 'string', description: 'Property identifier' },
//       },
//       required: ['amount', 'description', 'property'],
//     },
//     async func({ amount, description, property }) {
//       await sheetsService.recordMaintenanceCost({
//         amount,
//         description,
//         property,
//         date: new Date(),
//       });
//       return `Successfully added ${amount} for ${description} at ${property}`;
//     },
//   };

//     //   propertyId: string,
//     // amount: number,
//     // category: string,
//     // description: string,
//     // propertyName: string,
// }
