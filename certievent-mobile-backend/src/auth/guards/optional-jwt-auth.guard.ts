import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

// Guard opcional: autentica o usuario se um token valido for enviado, mas nao bloqueia requisicoes sem token
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      request['user'] = null;
      return true;
    }

    const token = authHeader.slice(7);

    try {
      const decoded = await this.jwtService.verifyAsync(token);
      request['user'] = decoded;
    } catch {
      request['user'] = null;
    }

    return true;
  }
}
