import { Injectable, UnprocessableEntityException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MongoRepository } from "typeorm";

import { NETWORK_RESPONSE } from "../errors";
import { User } from "../user/user.entity";
import { UserService } from "../user/user.service";
import { checkIfUserExists } from "../utils";
import { OccurrenceType, Reminder, ReminderType } from "./reminders.entity";

type ReminderReq = {
  title: string;
  description: string
  type: ReminderType;
  remindAt: Date;
  occurrence: OccurrenceType
}

@Injectable()
export class RemindersService {
  constructor(
    @InjectRepository(Reminder)
    private readonly reminderRepository: MongoRepository<Reminder>,
    private userService: UserService,
  ) {}

  async addReminder({ email }: User, { title, description, remindAt, occurrence, type }: ReminderReq): Promise<any> {
    const { id: userId } = await checkIfUserExists(email, this.userService, true);

    if(!title) {
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.REMINDER.MISSING_TITLE)
    }

    if(!remindAt) {
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.REMINDER.MISSING_REMIND_AT)
    }

    try {
      const reminder = {
        title,
        description,
        remindAt,
        type,
        occurrence,
        userId
      }

      await this.reminderRepository.save(reminder);
      return reminder;
    } catch(e) {
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.REMINDER.ADD_FAIL)
    }
  }

  // async getAllReminders(): Promise<Reminder[]> {
  //   return [...this.reminders];
  // }
  //
  // async getReminder(id: string): Promise<Reminder | ExceptionInformation> {
  //   const [reminder] = await findItem({id, items: this.reminders, errorLabel: 'reminder'});
  //   return reminder;
  // }
  //
  // async updateReminder(reminder: ReminderReq & { id: ObjectID }): Promise<Reminder | ExceptionInformation> {
  //   const [reminder, reminderIndex] = await findItem({id, items: this.reminders, errorLabel: 'reminder'});
  //   this.reminders[reminderIndex] = {
  //     ...reminder as Reminder,
  //     ...(title && { title }),
  //     ...(body && { body }),
  //   };
  //
  //   return this.reminders[reminderIndex];
  // }
  //
  // async deleteReminder(id: string): Promise<Reminder[]> {
  //   return this.reminders.filter(reminder => reminder.id !== id);
  // }
}
