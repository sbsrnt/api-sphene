import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { MailersService } from '../mailers/mailers.service';
import { User, UserRegistration } from '../user/user.entity';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private mailersService: MailersService,
    private jwtService: JwtService
  ) {}

  async validateUser(email: string, password: string): Promise<Omit<User, 'password'> | null> {
    const [user] = await this.userService.findOne(email);
    if (user?.password === password) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async register(user: UserRegistration): Promise<{ access_token?: string }> {
    const payload = await this.userService.addUser(user);
    await this.mailersService.createEmailToken(user.email);

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async login(user: any): Promise<{ access_token: string }> {
    const payload = { email: user.email, sub: user.id};
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async verifyEmail(token: string): Promise<any> {
    return this.mailersService.verifyEmail(token);
  }
}
