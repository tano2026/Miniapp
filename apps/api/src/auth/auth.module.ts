import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AdminGuard, PartnerSessionGuard } from './guards';

@Global()
@Module({
  // Secret truyền theo từng lần sign/verify vì phiên khách và phiên admin dùng secret khác nhau.
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [PartnerSessionGuard, AdminGuard],
  exports: [JwtModule, PartnerSessionGuard, AdminGuard],
})
export class AuthModule {}
