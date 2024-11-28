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
      // Replace # with %23 for URL encoding
      const encodedCode = code.replace('#', '%23');

      // Launch dialer with USSD code
      await execAsync(
        `adb shell am start -a android.intent.action.DIAL -d "tel:${encodedCode}"`,
      );

      // Wait for dialer to load
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Press call button (KEYCODE_CALL = 5)
      await execAsync('adb shell input keyevent 5');

      // Wait for USSD dialog
      await new Promise((resolve) => setTimeout(resolve, 2000));
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
      // For number keys (0-9), we need to convert ASCII to KEYCODE
      // ASCII: 48-57 ('0'-'9') -> KEYCODE: 7-16
      if (keycode >= 48 && keycode <= 57) {
        keycode = keycode - 41; // Convert ASCII to KEYCODE
      }

      await execAsync(`adb shell input keyevent ${keycode}`);
      this.logger.debug(`Pressed key: ${keycode}`);
    } catch (error) {
      this.logger.error('Failed to press key:', error);
      throw new Error('Failed to press key');
    }
  }

  async executeShellCommand(command: string): Promise<string> {
    try {
      const escapedCommand = command.replace(/'/g, "'\"'\"'");
      const fullCommand = `adb shell '${escapedCommand}'`;

      this.logger.debug('Executing command:', fullCommand);

      const { stdout, stderr } = await execAsync(fullCommand);

      if (stderr) {
        this.logger.warn('ADB command produced stderr:', stderr);
      }

      if (!stdout.trim()) {
        this.logger.warn('Command returned empty output:', {
          command: fullCommand,
          stderr,
        });
      }

      return stdout;
    } catch (error) {
      this.logger.error('Failed to execute ADB shell command:', {
        error,
        command,
      });
      throw new Error(`Failed to execute ADB command: ${error.message}`);
    }
  }

  async triggerTaskerIntent(
    action: string,
    extras: Record<string, string>,
  ): Promise<void> {
    try {
      // Build the am broadcast command with extras
      let command = `adb shell am broadcast -a ${action}`;

      // Add each extra parameter
      Object.entries(extras).forEach(([key, value]) => {
        command += ` --es ${key} ${value}`;
      });

      await execAsync(command);
      this.logger.debug('Tasker intent triggered:', { action, extras });
    } catch (error) {
      this.logger.error('Failed to trigger Tasker intent:', error);
      throw new Error('Failed to trigger mobile money operation');
    }
  }
}
