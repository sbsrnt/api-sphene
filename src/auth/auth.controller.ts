import { Body, Controller, Get, Param, Post, Request, UnprocessableEntityException, UseGuards } from '@nestjs/common';

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
  public async verifyEmail(@Param() params): Promise<UnprocessableEntityException | null> {
    try {
      await this.authService.verifyEmail(params.token);
      return null;
    } catch(error) {
      throw new UnprocessableEntityException();
    }
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.body);
  }
}
