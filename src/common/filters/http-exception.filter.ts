import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { Error as MongooseError } from 'mongoose';

@Catch(MongooseError)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    if (exception instanceof MongooseError.ValidationError) {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();
      const status = HttpStatus.BAD_REQUEST;

      const validationErrors = this.formatValidationErrors(exception.errors);

      response.status(status).json({
        statusCode: status,
        message: 'Validation failed',
        errors: validationErrors,
      });
    } else {
      throw exception;
    }
  }

  private formatValidationErrors(
    errors: Record<string, any>,
  ): Record<string, string> {
    const formattedErrors = {};
    for (const [key, error] of Object.entries(errors)) {
      formattedErrors[key] = error.message;
    }
    return formattedErrors;
  }
}
