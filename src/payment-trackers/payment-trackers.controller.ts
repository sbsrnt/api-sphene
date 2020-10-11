import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { ObjectID } from "typeorm";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthUser } from "../user/user.decorator";
import { User } from "../user/user.entity";
import { ChecklistItem } from "./payment-trackers.entity";
import { PaymentTrackersService } from "./payment-trackers.service";

@Controller('payment-trackers')
export class PaymentTrackersController {
  constructor(
    private readonly paymentTrackersService: PaymentTrackersService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  addPaymentTracker(
    @AuthUser() user: User,
    @Body('receiver') receiver: string,
    @Body('value') value: number,
    @Body('checklist') checklist: ChecklistItem[],
  ) {
    const payment = {
      receiver,
      value,
      checklist,
    }
    return this.paymentTrackersService.addPaymentTracker(user, payment);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  getAllPaymentTrackers(
    @AuthUser() user: User,
  ) {
    return this.paymentTrackersService.getAllPaymentTrackers(user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getPaymentTracker(
    @AuthUser() user: User,
    @Param('id') id: string
  ) {
    return this.paymentTrackersService.getPaymentTracker(user, id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  updatePaymentTracker(
    @AuthUser() user: User,
    @Param('id') id: ObjectID,
    @Body('receiver') receiver: string,
    @Body('value') value: number,
    @Body('checklist') checklist: ChecklistItem[],
  ) {
    const payment = {
      id,
      receiver,
      value,
      checklist,
    }
    return this.paymentTrackersService.updatePaymentTracker(user, payment);
  }

  @Put(':id/:paymentTrackerId')
  @UseGuards(JwtAuthGuard)
  updatePaymentTrackerChecks(
    @AuthUser() user: User,
    @Param('id') id: string,
    @Param('paymentTrackerId') paymentTrackerId: string,
    @Body('checklist') checklist: ChecklistItem[]
  ) {
    return this.paymentTrackersService.updatePaymentTrackerChecks(user, id, paymentTrackerId, checklist)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  deletePaymentTracker(
    @AuthUser() user: User,
    @Param('id') id: ObjectID
  ) {
    return this.paymentTrackersService.deletePaymentTracker(user, id);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  deleteAllPaymentTrackers(
    @AuthUser() user: User
  ) {
    return this.paymentTrackersService.deleteAllPaymentTrackers(user);
  }
}
