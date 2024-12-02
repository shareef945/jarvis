import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { MobileMoneyService } from './mobile-money.service';

@Controller('mobile-money')
export class MobileMoneyController {
  constructor(private readonly mobileMoneyService: MobileMoneyService) {}

  @Post('send')
  async sendMoney(@Body() body: { amount: number; phoneNumber: string }) {
    try {
      await this.mobileMoneyService.sendMoney(body.amount, body.phoneNumber);
      return { success: true, message: 'Money sent successfully' };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('test-connection')
  async testConnection() {
    const isConnected = await this.mobileMoneyService.testConnection();
    return { connected: isConnected };
  }
}
