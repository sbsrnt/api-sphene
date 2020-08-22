import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { MailersService } from '../mailers/mailers.service';
import { User, UserRegistration } from '../user/user.entity';
import { UserService } from '../user/user.service';
import { checkIfUserExists } from '../utils';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private mailersService: MailersService,
    private jwtService: JwtService
  ) {}

  async validateUser(email: string, password: string): Promise<Omit<User, 'password'> | null> {
    const user = await checkIfUserExists(email, this.userService, true);

    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async register(user: UserRegistration): Promise<{ access_token?: string }> {
    const payload = await this.userService.addUser(user);
    const token = await this.mailersService.createEmailToken(user.email);
    token && await this.mailersService.sendEmailVerification(user.email);

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async login(user: User): Promise<{ access_token: string }> {
    const payload = { email: user.email, sub: user.id};
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async verifyEmail(token: string): Promise<any> {
    return this.mailersService.verifyEmail(token);
  }

  async createForgottenPasswordToken(email: string): Promise<{ success: boolean }> {
    const tokenCreated = await this.mailersService.createForgottenPasswordToken(email);
    const token = tokenCreated ? await this.mailersService.sendEmailForgotPassword(email) : null;

    return {
      success: !!token,
      ...(process.env.BUILD_ENV === 'dev' && { token }),
    }
  }

  async resetPassword({token, newPassword, confirmNewPassword}: { token: string, newPassword: string, confirmNewPassword: string }): Promise<any> {
    await this.mailersService.resetPassword({token, newPassword, confirmNewPassword} )
  }
}
