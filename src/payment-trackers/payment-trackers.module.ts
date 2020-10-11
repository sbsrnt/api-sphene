import { Module } from '@nestjs/common';
import { TypeOrmModule } from "@nestjs/typeorm";

import { UserModule } from "../user/user.module";
import { PaymentTrackersController } from "./payment-trackers.controller";
import { PaymentTrackers } from "./payment-trackers.entity";
import { PaymentTrackersService } from "./payment-trackers.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentTrackers]),
    UserModule
  ],
  controllers: [PaymentTrackersController],
  providers: [PaymentTrackersService],
  exports: [PaymentTrackersService],
})
export class PaymentTrackersModule {}
