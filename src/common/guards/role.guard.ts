import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Context } from 'grammy';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AppConfig, InjectAppConfig } from 'src/app.config';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectAppConfig() private readonly appConfig: AppConfig,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndMerge(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const ctx = context.getArgByIndex(0) as Context;
    const userId = ctx.from?.id;
    const userRoles = this.appConfig.app.userRoles;

    console.log('Required Roles:', requiredRoles);
    console.log('User ID:', userId);
    console.log('User Roles Config:', userRoles);

    if (!userId || !userRoles[userId]) return false;
    return requiredRoles.includes(userRoles[userId]);
  }
}
