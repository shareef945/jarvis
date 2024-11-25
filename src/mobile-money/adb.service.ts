import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class AdbService {
  constructor(
    @InjectPinoLogger(AdbService.name)
    private readonly logger: PinoLogger,
  ) {}

  async executeUssd(code: string): Promise<void> {
    try {
      await execAsync(
        `adb shell am start -a android.intent.action.DIAL -d tel:${code}`,
      );
      // Wait for USSD dialog
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // Press "Call" button
      await execAsync('adb shell input keyevent 66');
    } catch (error) {
      this.logger.error('Failed to execute USSD code:', error);
      throw new Error('Failed to execute mobile money operation');
    }
  }

  async inputText(text: string): Promise<void> {
    try {
      await execAsync(`adb shell input text "${text}"`);
    } catch (error) {
      this.logger.error('Failed to input text:', error);
      throw new Error('Failed to input text');
    }
  }

  async pressKey(keycode: number): Promise<void> {
    try {
      await execAsync(`adb shell input keyevent ${keycode}`);
    } catch (error) {
      this.logger.error('Failed to press key:', error);
      throw new Error('Failed to press key');
    }
  }
}
