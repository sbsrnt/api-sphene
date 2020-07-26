import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RemindersService } from './reminders.service';

@UseGuards(JwtAuthGuard)
@Controller('reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Post()
  addReminder(
    @Body('title') title: string,
    @Body('body') body: string
  ) {
    return this.remindersService.addReminder(title, body);
  }

  @Get()
  getAllReminders() {
    return this.remindersService.getAllReminders();
  }

  @Get(':id')
  getReminder(@Param('id') reminderId: string) {
    return this.remindersService.getReminder(reminderId);
  }

  @Put(':id')
  updateReminder(
    @Param('id') reminderId: string,
    @Body('title') title: string,
    @Body('body') body: string
  ) {
    return this.remindersService.updateReminder(reminderId, title, body);
  }

  @Delete(':id')
  deleteReminder(@Param('id') reminderId: string) {
    return this.remindersService.deleteReminder(reminderId);
  }
}
