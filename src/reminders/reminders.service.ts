import { Injectable, NotFoundException, UnauthorizedException, UnprocessableEntityException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Types } from "mongoose";
import { MongoRepository, ObjectID } from "typeorm";

import { NETWORK_RESPONSE } from "../errors";
import { User } from "../user/user.entity";
import { UserService } from "../user/user.service";
import { checkIfUserExists } from "../utils";
import { OccurrenceType, Reminder, ReminderType } from "./reminders.entity";
const ObjectId = require('mongodb').ObjectId;

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

  async addReminder({ email }: User, { title, remindAt, ...reminderReq }: ReminderReq): Promise<ReminderReq | UnprocessableEntityException> {
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
  async getReminder({ email }: User, id: ObjectID): Promise<any> {
    const { id: userId } = await checkIfUserExists(email, this.userService, true);

    const reminder = await this.reminderRepository.findOne(id);

    if (!reminder) throw new NotFoundException(NETWORK_RESPONSE.ERRORS.REMINDER.NOT_FOUND)

    if (reminder.userId.toString() !== userId.toString()) throw new UnauthorizedException(NETWORK_RESPONSE.ERRORS.GENERAL.UNAUTHORIZED)

    return reminder
  }

  async updateReminder({ email }: User, { id, title, remindAt, ...reminder }: ReminderReq & { id: ObjectID}): Promise<ReminderReq | UnprocessableEntityException> {
    const { id: userId } = await checkIfUserExists(email, this.userService, true);

    if(!title) {
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.REMINDER.MISSING_TITLE)
    }

    if(!remindAt) {
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.REMINDER.MISSING_REMIND_AT)
    }

    try {
      const { value: updatedReminder } = await this.reminderRepository.findOneAndUpdate(
        {
          $and: [
            { _id: ObjectId(id) },
            { userId }
          ]
        },
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
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.REMINDER.UPDATE_FAIL);
    }
  }

  async deleteReminder({ email }: User, id: ObjectID): Promise<any> {
    const { id: userId } = await checkIfUserExists(email, this.userService, true);

    try {
      await this.reminderRepository.deleteOne({
        $and: [
          { _id: ObjectId(id) },
          { userId }
        ]
      });

      return await id
    } catch(e) {
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.REMINDER.DELETE_FAIL);
    }
  }
}
