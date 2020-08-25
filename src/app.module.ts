import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from './auth/auth.module';
import { EmailVerification, ForgottenPassword } from './mailers/mailers.entity';
import { MailersModule } from './mailers/mailers.module';
import { Reminder } from "./reminders/reminders.entity";
import { RemindersModule } from './reminders/reminders.module';
import { User } from './user/user.entity';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mongodb',
      host: process.env.DB_HOST,
      database: process.env.DB_DATABASE,
      entities: [User, EmailVerification, ForgottenPassword, Reminder],
      synchronize: true,
      keepConnectionAlive: true
    }),
    AuthModule,
    RemindersModule,
    MailersModule,
    UserModule
  ],
})
export class AppModule {}
