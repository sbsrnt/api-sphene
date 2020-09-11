import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards
} from "@nestjs/common";
import { ObjectID } from "typeorm";

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser } from "../user/user.decorator";
import { User } from "../user/user.entity";
import { OccurrenceType, ReminderType } from "./reminders.entity";
// import { RemindersGateway } from "./reminders.gateway";
import { RemindersService } from './reminders.service';

@Controller('reminders')
export class RemindersController {
  constructor(
    private readonly remindersService: RemindersService,
    // private readonly remindersGateway: RemindersGateway
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  addReminder(
    @AuthUser() user: User,
    @Body('title') title: string,
    @Body('description') description: string,
    @Body('type') type: ReminderType,
    @Body('remindAt') remindAt: Date,
    @Body('occurrence') occurrence: OccurrenceType,
  ) {
    const reminder = {
      title,
      description,
      type,
      remindAt,
      occurrence
    }
    return this.remindersService.addReminder(user, reminder);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  getAllReminders(
    @AuthUser() user: User,
  ) {
    return this.remindersService.getAllReminders(user);
  }

  @Get('upcoming')
  @UseGuards(JwtAuthGuard)
  getUpcomingReminders(
    @AuthUser() user: User
  ) {
    return this.remindersService.getUpcomingReminders(user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getReminder(
    @AuthUser() user: User,
    @Param('id') id: ObjectID
  ) {
    return this.remindersService.getReminder(user, id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateReminder(
    @AuthUser() user: User,
    @Param('id') id: ObjectID,
    @Body('title') title: string,
    @Body('description') description: string,
    @Body('type') type: ReminderType,
    @Body('remindAt') remindAt: Date,
    @Body('occurrence') occurrence: OccurrenceType,
  ) {
    const reminder = {
      id,
      title,
      description,
      type,
      remindAt,
      occurrence
    }
    return await this.remindersService.updateReminder(user, reminder);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  deleteReminder(
    @AuthUser() user: User,
    @Param('id') id: ObjectID
  ) {
    return this.remindersService.deleteReminder(user, id);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  deleteAllReminders(
    @AuthUser() user: User
  ) {
    return this.remindersService.deleteAllReminders(user);
  }
}
