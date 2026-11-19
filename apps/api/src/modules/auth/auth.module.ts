import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtAuthGuard, RolesGuard } from '../../common/guards.js';
import { requireSecret } from '../../common/secrets.js';

@Module({
  imports: [
    // Access-token secret only; refresh tokens are signed with JWT_REFRESH_SECRET (see AuthService).
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: requireSecret('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  providers: [AuthService, JwtAuthGuard, RolesGuard],
  controllers: [AuthController],
  exports: [AuthService, JwtModule, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
