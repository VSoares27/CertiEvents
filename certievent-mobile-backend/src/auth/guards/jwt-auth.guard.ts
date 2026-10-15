import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

// Guard que exige um token JWT valido no cabecalho Authorization
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de autenticação não fornecido.');
    }

    const token = authHeader.slice(7);

    try {
      const decoded = await this.jwtService.verifyAsync(token);
      request['user'] = decoded;
      return true;
    } catch {
      throw new UnauthorizedException('Token de autenticação inválido ou expirado.');
    }
  }
}
