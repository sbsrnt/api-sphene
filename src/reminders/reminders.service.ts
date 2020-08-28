import { Injectable, NotFoundException, UnauthorizedException, UnprocessableEntityException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MongoRepository, ObjectID } from "typeorm";

import { NETWORK_RESPONSE } from "../errors";
import { User } from "../user/user.entity";
import { UserService } from "../user/user.service";
import { checkIfUserExists, filterNumberEnumKeys } from "../utils";
import { OccurrenceType, Reminder, ReminderType } from "./reminders.entity";
const ObjectId = require('mongodb').ObjectID;

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

  async addReminder({ email }: User, { title, remindAt, type = ReminderType.event, occurrence = OccurrenceType.yearly, ...reminderReq }: ReminderReq): Promise<ReminderReq | UnprocessableEntityException> {
    const { _id: uid } = await checkIfUserExists(email, this.userService, true);

    if(!title) {
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.REMINDER.MISSING_TITLE)
    }

    if(!remindAt) {
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.REMINDER.MISSING_REMIND_AT)
    }

    if(!filterNumberEnumKeys(ReminderType).includes(type)) {
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.REMINDER.UNSUPPORTED_TYPE)
    }

    if(!filterNumberEnumKeys(OccurrenceType).includes(occurrence)) {
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.REMINDER.UNSUPPORTED_OCCURRENCE)
    }

    try {
      const reminder = {
        ...reminderReq,
        title,
        remindAt,
        type,
        occurrence,
        createdAt: new Date(),
        userId: uid,
      }

      const { userId, ...newReminder } = await this.reminderRepository.save(reminder)
      return newReminder;
    } catch(e) {
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.REMINDER.ADD_FAIL)
    }
  }

  async getAllReminders({ email }: User): Promise<any> {
    const { _id: userId } = await checkIfUserExists(email, this.userService, true);
    try {
      return await this.reminderRepository.find({ userId });
    } catch(e) {
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.REMINDER.GET_ALL_FAIL)
    }
  }

  async getReminder({ email }: User, id: any): Promise<any> {
    const { _id: userId } = await checkIfUserExists(email, this.userService, true);

    const hex = /[0-9A-Fa-f]{6}/g;
    id = (hex.test(id))? ObjectId(id) : id;

    const reminder = await this.reminderRepository.findOne({ _id: id});

    if (!reminder) throw new NotFoundException(NETWORK_RESPONSE.ERRORS.REMINDER.NOT_FOUND)

    if (reminder.userId.toString() !== userId.toString()) throw new UnauthorizedException(NETWORK_RESPONSE.ERRORS.GENERAL.UNAUTHORIZED)

    return reminder
  }

  async updateReminder({ email }: User, { id, title, remindAt, type = ReminderType.event, occurrence = OccurrenceType.yearly, ...reminder }: ReminderReq & { id: ObjectID}): Promise<ReminderReq | UnprocessableEntityException> {
    const { _id: userId } = await checkIfUserExists(email, this.userService, true);

    if(!title) {
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.REMINDER.MISSING_TITLE)
    }

    if(!remindAt) {
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.REMINDER.MISSING_REMIND_AT)
    }

    if(!filterNumberEnumKeys(ReminderType).includes(type)) {
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.REMINDER.UNSUPPORTED_TYPE)
    }

    if(!filterNumberEnumKeys(OccurrenceType).includes(occurrence)) {
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.REMINDER.UNSUPPORTED_OCCURRENCE)
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
            type,
            occurrence
          }
        },
        {
          upsert: true,
          returnOriginal: false
        }
      );
      return updatedReminder
    } catch(e) {
      throw new UnauthorizedException(NETWORK_RESPONSE.ERRORS.REMINDER.UPDATE_FAIL);
    }
  }

  async deleteReminder({ email }: User, id: any): Promise<any> {
    const { _id: userId } = await checkIfUserExists(email, this.userService, true);

    const hex = /[0-9A-Fa-f]{6}/g;
    id = (hex.test(id))? ObjectId(id) : id;

    const reminder = await this.reminderRepository.findOne({_id: id});

    if (!reminder) throw new NotFoundException(NETWORK_RESPONSE.ERRORS.REMINDER.NOT_FOUND)

    if (reminder.userId.toString() !== userId.toString()) throw new UnauthorizedException(NETWORK_RESPONSE.ERRORS.GENERAL.UNAUTHORIZED)

    try {
      await this.reminderRepository.deleteOne({
        $and: [
          { _id: ObjectId(id),
            userId
          }
        ]
      });
      return { deletedReminderId: id }
    } catch(e) {
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.REMINDER.DELETE_FAIL);
    }
  }

  async deleteAllReminders({ email }: User): Promise<any> {
    const { _id: userId } = await checkIfUserExists(email, this.userService, true);

    try {
      await this.reminderRepository.deleteMany({userId});
      return {
        success: true
      }
    } catch(e) {
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.REMINDER.DELETE_ALL_FAIL)
    }
  }
}
