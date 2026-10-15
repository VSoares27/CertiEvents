import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

// Guard que restringe o acesso a rotas exclusivas de administradores
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request['user'];

    if (!user || user.role !== 'admin') {
      throw new ForbiddenException('Acesso restrito a administradores.');
    }

    return true;
  }
}
