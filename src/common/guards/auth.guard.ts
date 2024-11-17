import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.from?.id;
    const userRoles = this.configService.get('app.userRoles');
    const requiredRoles = Reflect.getMetadata('roles', context.getHandler());

    if (!userId || !userRoles[userId]) return false;
    return requiredRoles.includes(userRoles[userId]);
  }
}
