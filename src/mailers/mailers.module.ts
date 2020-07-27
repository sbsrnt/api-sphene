import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserModule } from '../user/user.module';
import { EmailVerification, ForgottenPassword } from './mailers.entity';
import { MailersService } from './mailers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailVerification, ForgottenPassword]),
    UserModule
  ],
  providers: [MailersService],
  exports: [MailersService],
})
export class MailersModule {}
