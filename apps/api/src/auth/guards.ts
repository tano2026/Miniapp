import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { env } from '../common/env';
import { ADMIN_COOKIE, AdminSession, PARTNER_COOKIE, PartnerSession } from './session.types';

function readToken(req: Request, cookie: string): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.[cookie];
}

@Injectable()
export class PartnerSessionGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<Request & { partnerSession?: PartnerSession }>();
    const token = readToken(req, PARTNER_COOKIE);
    if (!token) throw new UnauthorizedException('Phiên đăng nhập đã hết hạn, vui lòng mở lại từ ứng dụng');
    try {
      req.partnerSession = await this.jwt.verifyAsync<PartnerSession>(token, { secret: env.sessionSecret });
      return true;
    } catch {
      throw new UnauthorizedException('Phiên đăng nhập đã hết hạn, vui lòng mở lại từ ứng dụng');
    }
  }
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<Request & { admin?: AdminSession }>();
    const token = readToken(req, ADMIN_COOKIE);
    if (!token) throw new UnauthorizedException();
    try {
      req.admin = await this.jwt.verifyAsync<AdminSession>(token, { secret: env.adminSecret });
    } catch {
      throw new UnauthorizedException();
    }
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (roles?.length && !roles.includes(req.admin.role)) throw new ForbiddenException();
    return true;
  }
}

export const CurrentPartner = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().partnerSession as PartnerSession,
);

export const CurrentAdmin = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().admin as AdminSession,
);
