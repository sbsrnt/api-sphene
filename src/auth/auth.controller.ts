import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('firstName') firstName: string,
  ) {
    const user = {
      email,
      password,
      firstName
    };
    return this.authService.register(user)
  }

  @Get('verify/:token')
  public async verifyEmail(@Param('token') token): Promise<any> {
      await this.authService.verifyEmail(token);
  }

  @Post('forgot-password')
  public async sendEmailForgotPassword(
    @Body('email') email: string
  ): Promise<any> {
    return await this.authService.createForgottenPasswordToken(email);
  }

  @Post('reset-password/:token')
  public async setNewPassword(
    @Param('token') token: string,
    @Body('newPassword') newPassword: string,
    @Body('confirmNewPassword') confirmNewPassword: string,
  ): Promise<any> {
      await this.authService.resetPassword({token, newPassword, confirmNewPassword});
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.body);
  }
}
