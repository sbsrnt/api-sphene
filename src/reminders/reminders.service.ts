import { Injectable, UnprocessableEntityException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MongoRepository, ObjectID } from "typeorm";

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

  async addReminder({ email }: User, { title, remindAt, ...reminderReq }: ReminderReq): Promise<any> {
    const { id: userId } = await checkIfUserExists(email, this.userService, true);

    if(!title) {
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.REMINDER.MISSING_TITLE)
    }

    if(!remindAt) {
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.REMINDER.MISSING_REMIND_AT)
    }

    try {
      const reminder = {
        ...reminderReq,
        title,
        remindAt,
        userId,
      }

      await this.reminderRepository.save(reminder)
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

  async updateReminder({ email }: User, { id, title, remindAt, ...reminder }: ReminderReq & { id: ObjectID}): Promise<any> {
    await checkIfUserExists(email, this.userService, true);

    if(!title) {
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.REMINDER.MISSING_TITLE)
    }

    if(!remindAt) {
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.REMINDER.MISSING_REMIND_AT)
    }

    try {
      const { value: updatedReminder } = await this.reminderRepository.findOneAndUpdate(
        { id },
        {
          $set: {
            ...reminder,
            title,
            remindAt,
          }
        },
        {
          upsert: true,
          returnOriginal: false
        }
      );

      return updatedReminder
    } catch(e) {
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.GENERAL.DEFAULT);
    }
  }

  // async deleteReminder(id: string): Promise<Reminder[]> {
  //   return this.reminders.filter(reminder => reminder.id !== id);
  // }
}
