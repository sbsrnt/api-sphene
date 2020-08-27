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
    await this.mailersService.sendEmailVerification(user.email);

    return {
      access_token: this.jwtService.sign(payload),
      ...(process.env.BUILD_ENV === 'dev' && { token }),
    };
  }

  async login(req: { email: string }): Promise<{ access_token: string }> {
    const { password, id, ...user } = await checkIfUserExists(req.email, this.userService, true);
    return {
      access_token: this.jwtService.sign(user),
    };
  }

  async verifyEmail(token: string): Promise<any> {
    return this.mailersService.verifyEmail(token);
  }

  async createForgottenPasswordToken(email: string): Promise<{ success: boolean }> {
    const token = await this.mailersService.createForgottenPasswordToken(email);
    await this.mailersService.sendEmailForgotPassword(email)

    return {
      success: !!token,
      ...(process.env.BUILD_ENV === 'dev' && { token }),
    }
  }

  async resetPassword({token, newPassword, confirmNewPassword}: { token: string, newPassword: string, confirmNewPassword: string }): Promise<any> {
    await this.mailersService.resetPassword({token, newPassword, confirmNewPassword} )
  }
}
