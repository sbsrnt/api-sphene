import { Injectable } from '@nestjs/common';

import { findItem } from '../utils';
import { Reminder } from './reminder.model';

@Injectable()
export class RemindersService {
  private reminders: Reminder[] = [];

  async addReminder(title: string, body: string): Promise<Reminder> {
    const id = this.reminders.length.toString();
    const newReminder = await new Reminder(id, title, body);
    this.reminders.push(newReminder);
    return newReminder;
  }

  async getAllReminders(): Promise<Reminder[]> {
    return [...this.reminders];
  }

  async getReminder(id: string): Promise<Reminder | ExceptionInformation> {
    const [reminder] = await findItem({id, items: this.reminders, errorLabel: 'reminder'});
    return reminder;
  }

  async updateReminder(id: string, title: string, body: string): Promise<Reminder | ExceptionInformation> {
    const [reminder, reminderIndex] = await findItem({id, items: this.reminders, errorLabel: 'reminder'});
    this.reminders[reminderIndex] = {
      ...reminder as Reminder,
      ...(title && { title }),
      ...(body && { body }),
    };

    return this.reminders[reminderIndex];
  }

  async deleteReminder(id: string): Promise<Reminder[]> {
    return this.reminders.filter(reminder => reminder.id !== id);
  }
}
