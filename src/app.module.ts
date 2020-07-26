import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from './auth/auth.module';
import { RemindersModule } from './reminders/reminders.module';
import { User } from './user/user.entity';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mongodb',
      host: 'localhost:27017',
      database: 'sphene',
      entities: [User],
      synchronize: true,
      keepConnectionAlive: true,
    }),
    AuthModule,
    RemindersModule,
    UserModule
  ],
})
export class AppModule {}
