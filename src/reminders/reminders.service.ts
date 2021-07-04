import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { add } from 'date-fns';
import { MongoRepository, ObjectID } from "typeorm";

import { NETWORK_RESPONSE } from "../errors";
import { User } from "../user/user.entity";
import { UserService } from "../user/user.service";
import { checkIfUserExists, filterNumberEnumKeys, updateRemindAtByOccurrence } from "../utils";
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

  private readonly logger = new Logger(RemindersService.name);

  @Cron(CronExpression.EVERY_DAY_AT_3AM, {
    name: 'OverdueReminders'
  })
  async handleCron() {
    const overdueReminders = await this.reminderRepository.find({
      where: {
        remindAt: {
          $lte: new Date().toISOString(),
        }
      },
    });
    if (overdueReminders.length === 0) {
      this.logger.debug(`[OverdueReminders] No overdue reminders.`)
      return;
    }
    overdueReminders.map(async reminder => {
      const remindAt = await updateRemindAtByOccurrence({remindAt: reminder.remindAt, occurrence: reminder.occurrence});

      await this.reminderRepository.findOneAndUpdate(
        { _id: reminder._id },
        {
          $set: {
            ...reminder,
            remindAt,
          }
        }
      )
      await this.logger.log(`Updated ${reminder._id}. Next occurrence: ${remindAt}`)
    })
  }

  async addReminder(
    { email }: User,
    {
      title,
      remindAt,
      type = ReminderType.event,
      occurrence = OccurrenceType.yearly,
      ...reminderReq
    }: ReminderReq): Promise<any> {
    const { _id: uid } = await checkIfUserExists(email, this.userService, true);

    if (!title) {
      this.logger.log(`Couldn't create reminder for user ${email}: Missing "title".`)
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.REMINDER.MISSING_TITLE)
    }

    if (!remindAt) {
      this.logger.log(`Couldn't create reminder for user ${email}: Missing "remindAt".`)
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.REMINDER.MISSING_REMIND_AT)
    }

    if (!filterNumberEnumKeys(ReminderType).includes(type)) {
      this.logger.log(`Couldn't create reminder for user ${email}: Unsupported type: ${type}.`)
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.REMINDER.UNSUPPORTED_TYPE)
    }

    if (!filterNumberEnumKeys(OccurrenceType).includes(occurrence)) {
      this.logger.log(`Couldn't create reminder for user ${email}: Unsupported occurrence: ${occurrence}.`)
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.REMINDER.UNSUPPORTED_OCCURRENCE)
    }

    try {
      const reminder = {
        ...reminderReq,
        title,
        remindAt,
        type,
        occurrence: OccurrenceType[occurrence],
        createdAt: new Date(),
        userId: uid,
      }

      this.logger.log(`Reminder created.`)
      const { userId, ...newReminder } = await this.reminderRepository.save(reminder)

      return newReminder;
    } catch (e) {
      this.logger.log(`Couldn't create reminder: ${e}.`)
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.REMINDER.ADD_FAIL)
    }
  }

  async getAllReminders({ email }: User | { email: string }): Promise<any> {
    const { _id: userId } = await checkIfUserExists(email, this.userService, true);
    try {
      this.logger.log(`Got all reminders for user ${email}.`)
      return await this.reminderRepository.find({ userId });
    } catch(e) {
      this.logger.log(`Couldn't get all reminders for user ${email}: ${e}.`)
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.REMINDER.GET_ALL_FAIL)
    }
  }

  async getReminder({ email }: User, id: any): Promise<any> {
    const { _id: userId } = await checkIfUserExists(email, this.userService, true);

    const hex = /[0-9A-Fa-f]{6}/g;
    id = (hex.test(id))? ObjectId(id) : id;

    const reminder = await this.reminderRepository.findOne({ _id: id});

    if (!reminder) {
      this.logger.log(`Couldn't get reminder for user ${email}: Not found.`)
      throw new NotFoundException(NETWORK_RESPONSE.ERRORS.REMINDER.NOT_FOUND)
    }

    if (reminder.userId.toString() !== userId.toString()) {
      this.logger.log(`Couldn't get reminder: "userId" mismatch. ${reminder.userId} =/= ${userId}`)
      throw new UnauthorizedException(NETWORK_RESPONSE.ERRORS.GENERAL.UNAUTHORIZED)
    }

    this.logger.log(`Got reminder for user ${email}: ${id}`)
    return reminder
  }

  async updateReminder(
    { email }: User,
    {
      id,
      title,
      remindAt,
      type = ReminderType.event,
      occurrence = OccurrenceType.yearly,
      ...reminder
    }: ReminderReq & { id: ObjectID}): Promise<ReminderReq | UnprocessableEntityException> {
    const { _id: userId } = await checkIfUserExists(email, this.userService, true);

    if(!title) {
      this.logger.log(`Couldn't update reminder for user ${email}: Missing "title".`)
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.REMINDER.MISSING_TITLE)
    }

    if(!remindAt) {
      this.logger.log(`Couldn't update reminder for user ${email}: Missing "remindAt".`)
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.REMINDER.MISSING_REMIND_AT)
    }

    if(!filterNumberEnumKeys(ReminderType).includes(type)) {
      this.logger.log(`Couldn't update reminder for user ${email}. Unsupported type: ${type}.`)
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.REMINDER.UNSUPPORTED_TYPE)
    }

    if(!filterNumberEnumKeys(OccurrenceType).includes(occurrence)) {
      this.logger.log(`Couldn't update reminder for user ${email}. Unsupported occurrence: ${occurrence}.`)
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
            type: ReminderType[type],
            occurrence: OccurrenceType[occurrence],
          }
        },
        {
          upsert: true,
          returnOriginal: false
        }
      );
      this.logger.log(`Updated reminder for user ${email}: ${id}`)
      return updatedReminder
    } catch(e) {
      this.logger.log(`Couldn't update reminder for user ${email}: ${e}.`)
      throw new UnauthorizedException(NETWORK_RESPONSE.ERRORS.REMINDER.UPDATE_FAIL);
    }
  }

  async deleteReminder({ email }: User, id: any): Promise<any> {
    const { _id: userId } = await checkIfUserExists(email, this.userService, true);

    const hex = /[0-9A-Fa-f]{6}/g;
    id = (hex.test(id))? ObjectId(id) : id;

    const reminder = await this.reminderRepository.findOne({_id: id});

    if (!reminder) {
      this.logger.log(`Couldn't delete reminder: Reminder not found.`)
      throw new NotFoundException(NETWORK_RESPONSE.ERRORS.REMINDER.NOT_FOUND)
    }

    if (reminder.userId.toString() !== userId.toString()) {
      this.logger.log(`Couldn't delete reminder: userId mismatch. ${reminder.userId} =/= ${userId}.`)
      throw new UnauthorizedException(NETWORK_RESPONSE.ERRORS.GENERAL.UNAUTHORIZED)
    }

    try {
      await this.reminderRepository.deleteOne({
        $and: [
          { _id: ObjectId(id),
            userId
          }
        ]
      });
      this.logger.log(`Deleted reminder for user ${email}: ${id}.`)
      return { _id: id }
    } catch(e) {
      this.logger.log(`Couldn't delete reminder for user ${email}: ${e}.`)
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.REMINDER.DELETE_FAIL);
    }
  }

  async deleteAllReminders({ email }: User): Promise<any> {
    const { _id: userId } = await checkIfUserExists(email, this.userService, true);

    try {
      await this.reminderRepository.deleteMany({userId});
      this.logger.log(`Deleted all reminders for user ${email}.`)
      return {
        success: true
      }
    } catch(e) {
      this.logger.log(`Couldn't delete all reminders for user ${email}: ${e}.`)
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.REMINDER.DELETE_ALL_FAIL)
    }
  }

  async getUpcomingReminders({ email }: User | { email: string }): Promise<any> {
    const { _id: userId } = await checkIfUserExists(email, this.userService, true);

    const now = new Date();
    const nextHour = add(now, {hours: 1}).toISOString()
    const upcomingReminders = await this.reminderRepository.find({
      where: {
        $and: [
          { userId },
          {
            remindAt: {
              $gte: now.toISOString(),
              $lte: nextHour,
            },
          },
        ],
      },
    });

    if (!upcomingReminders || upcomingReminders.length === 0) {
      this.logger.log(`No upcoming reminders for ${email}`);
    }

    upcomingReminders.map(async reminder => {
      const remindAt = await updateRemindAtByOccurrence({remindAt: reminder.remindAt, occurrence: reminder.occurrence});

      await this.reminderRepository.findOneAndUpdate(
        { _id: reminder._id },
        {
          $set: {
            ...reminder,
            remindAt,
          }
        }
      )
      await this.logger.log(`Updated ${reminder._id}. Next occurrence: ${remindAt}`)
    })

    this.logger.log(`Got ${upcomingReminders.length} upcoming reminder(s) for user ${email}`)

    return upcomingReminders;
  }

  // For WebSockets. See reminders.gateway.ts
  // async updateReminderNextOccurrence({ email }: any, id: ObjectID): Promise<any> {
  //   const { _id: userId } = await checkIfUserExists(email, this.userService, true);
  //
  //   const reminder = await this.reminderRepository.findOne({
  //     where: {
  //       $and: [
  //         { _id: ObjectId(id) },
  //         { userId }
  //       ]
  //     }
  //   })
  //   // get occurrence and update remindAt based on it; like new Date(remindAt) + 1 for daily or + 7 for weekly etc
  // }
}
