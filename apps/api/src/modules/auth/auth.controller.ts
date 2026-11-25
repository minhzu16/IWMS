import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AUTH_THROTTLE, REFRESH_THROTTLE } from '../../common/throttle.config.js';
import { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { LoginSchema } from '@iwms/shared';
import { JwtAuthGuard } from '../../common/guards.js';
import { CurrentUser, RequestUser } from '../../common/decorators.js';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private authService: AuthService) {}

  @Throttle(AUTH_THROTTLE)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const validated = LoginSchema.parse(body);
    const result = await this.authService.login(validated);

    // Set HTTP-only cookie for secure refresh
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const { refreshToken: _rt, ...responseBody } = result;
    return responseBody;
  }

  @Throttle(REFRESH_THROTTLE)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawToken = (req.cookies?.refreshToken as string | undefined) || (body?.refreshToken as string | undefined);
    if (!rawToken) {
      res.clearCookie('refreshToken');
      throw new UnauthorizedException('Refresh token is required');
    }

    try {
      const result = await this.authService.refreshToken(rawToken);
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      const { refreshToken: _rt, ...responseBody } = result;
      return responseBody;
    } catch (err) {
      res.clearCookie('refreshToken');
      throw err;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('refreshToken');
    return { message: 'Đăng xuất thành công' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: RequestUser) {
    return this.authService.getProfile(user.id);
  }
}
