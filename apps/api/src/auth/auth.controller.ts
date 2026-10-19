import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Post,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Response } from 'express';
import { env } from '../common/env';
import { PrismaService } from '../prisma/prisma.service';
import { AdminGuard, CurrentAdmin, CurrentPartner, PartnerSessionGuard } from './guards';
import { ADMIN_COOKIE, AdminSession, PARTNER_COOKIE, PartnerSession } from './session.types';
import { peekSsoPartner, signSsoToken, verifySsoToken } from './sso-token';

class SsoExchangeDto {
  @IsString() @IsNotEmpty() token: string;
}

class DevTokenDto {
  @IsString() @IsNotEmpty() partner: string;
  @IsString() @IsNotEmpty() uid: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
}

class AdminLoginDto {
  @IsEmail() email: string;
  @IsString() @IsNotEmpty() password: string;
}

// Hash thật của một mật khẩu ngẫu nhiên, dùng khi email không tồn tại.
const DUMMY_HASH = bcrypt.hashSync(Math.random().toString(36), 10);

const SESSION_TTL_SECONDS = 2 * 3600;
const ADMIN_TTL_SECONDS = 12 * 3600;

const cookieOpts = (maxAgeSec: number) => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.isProd,
  maxAge: maxAgeSec * 1000,
  path: '/',
});

@Controller()
export class AuthController {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  /** Mini-app nhận token SSO từ app đối tác, đổi lấy phiên làm việc. */
  @Post('partner-sso/exchange')
  @HttpCode(200)
  async exchange(@Body() dto: SsoExchangeDto, @Res({ passthrough: true }) res: Response) {
    const code = peekSsoPartner(dto.token);
    const partner = code ? await this.prisma.partner.findUnique({ where: { code } }) : null;
    if (!partner?.active) throw new UnauthorizedException('Đối tác không hợp lệ');
    const payload = verifySsoToken(dto.token, partner.ssoSecret, Math.floor(Date.now() / 1000));
    if (!payload) throw new UnauthorizedException('Token đăng nhập không hợp lệ hoặc đã hết hạn');

    const session: PartnerSession = {
      sub: payload.uid,
      pid: partner.id,
      pcode: partner.code,
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
    };
    const token = await this.jwt.signAsync(session, { secret: env.sessionSecret, expiresIn: SESSION_TTL_SECONDS });
    res.cookie(PARTNER_COOKIE, token, cookieOpts(SESSION_TTL_SECONDS));
    return { token, expiresIn: SESSION_TTL_SECONDS };
  }

  @Get('partner-sso/me')
  @UseGuards(PartnerSessionGuard)
  async me(@CurrentPartner() s: PartnerSession) {
    const partner = await this.prisma.partner.findUnique({
      where: { id: s.pid },
      select: { code: true, name: true, primaryColor: true, logoUrl: true },
    });
    return { user: { id: s.sub, name: s.name, phone: s.phone, email: s.email }, partner };
  }

  /** Chỉ dùng khi dev: giả lập app đối tác ký token SSO. */
  @Post('dev/partner-token')
  @HttpCode(200)
  async devToken(@Body() dto: DevTokenDto) {
    if (env.isProd) throw new ForbiddenException();
    const partner = await this.prisma.partner.findUnique({ where: { code: dto.partner } });
    if (!partner) throw new NotFoundException('Không tìm thấy đối tác');
    return { token: signSsoToken({ ...dto, iat: Math.floor(Date.now() / 1000) }, partner.ssoSecret) };
  }

  @Post('admin/auth/login')
  @HttpCode(200)
  async adminLogin(@Body() dto: AdminLoginDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.prisma.adminUser.findUnique({ where: { email: dto.email.toLowerCase() } });
    // So sánh với hash giả khi không có user để thời gian phản hồi không lộ email tồn tại.
    const ok = await bcrypt.compare(dto.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) throw new BadRequestException('Email hoặc mật khẩu không đúng');
    const session: AdminSession = { sub: user.id, email: user.email, name: user.name, role: user.role };
    const token = await this.jwt.signAsync(session, { secret: env.adminSecret, expiresIn: ADMIN_TTL_SECONDS });
    res.cookie(ADMIN_COOKIE, token, cookieOpts(ADMIN_TTL_SECONDS));
    return { user: { email: user.email, name: user.name, role: user.role } };
  }

  @Post('admin/auth/logout')
  @HttpCode(200)
  adminLogout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(ADMIN_COOKIE, { path: '/' });
    return { ok: true };
  }

  @Get('admin/auth/me')
  @UseGuards(AdminGuard)
  adminMe(@CurrentAdmin() a: AdminSession) {
    return { user: { email: a.email, name: a.name, role: a.role } };
  }
}
