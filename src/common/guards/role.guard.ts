import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Context } from 'grammy';
import { AppConfig, InjectAppConfig } from '../../app.config';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectAppConfig() private readonly appConfig: AppConfig,
    @InjectPinoLogger(RolesGuard.name)
    private readonly logger: PinoLogger,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndMerge<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    this.logger.debug('Checking roles:', { requiredRoles });

    if (!requiredRoles?.length) {
      this.logger.debug('No roles required');
      return true;
    }

    const ctx = context.getArgByIndex(0) as Context;
    const userId = ctx.from?.id;

    this.logger.debug('User details:', {
      userId,
      configuredRoles: this.appConfig.app.userRoles,
      userRole: userId ? this.appConfig.app.userRoles[userId] : undefined,
    });

    if (!userId || !this.appConfig.app.userRoles[userId]) {
      this.logger.warn('User has no role:', { userId });
      return false;
    }

    const hasAccess = requiredRoles.includes(
      this.appConfig.app.userRoles[userId],
    );

    this.logger.debug('Access check result:', {
      hasAccess,
      userRole: this.appConfig.app.userRoles[userId],
      requiredRoles,
    });

    return hasAccess;
  }
}
