import { Module } from '@nestjs/common';
import { RemindersModule } from './reminders/reminders.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user/user.entity';

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
