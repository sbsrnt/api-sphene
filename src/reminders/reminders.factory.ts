import Faker from 'faker'
import {isNaN, random} from 'lodash';
import { define } from 'typeorm-seeding';

import { OccurrenceType, Reminder, ReminderType } from "./reminders.entity";

const filterEnumKeys = e => Object.keys(e).filter(k => isNaN(Number(k)))
const firstDayOfTheYear = new Date(new Date().getFullYear(), 0, 1);
const lastDayOfTheYear = new Date(new Date().getFullYear(), 11, 31);


define(Reminder,  (faker: typeof Faker, userId: string) => {
  const randomType = ReminderType[random(filterEnumKeys(ReminderType).length - 1)];
  const randomOccurrence = random(8) === 1 ? null : OccurrenceType[random(filterEnumKeys(OccurrenceType).length - 1)];

  const title = faker.random.words(4);
  const description = random(4) === 1 ? null : faker.random.words(6);
  const type = randomType;
  const occurrence = randomOccurrence;
  const createdAt = faker.date.between(firstDayOfTheYear, lastDayOfTheYear)
  const remindAt = faker.date.between(firstDayOfTheYear, lastDayOfTheYear)
  const updatedAt = faker.date.between(createdAt, lastDayOfTheYear)
  const reminder = new Reminder();

  reminder.userId = userId;
  reminder.title = title;
  reminder.description = description;
  reminder.type = type;
  reminder.occurrence = occurrence;
  reminder.createdAt = createdAt;
  reminder.remindAt = remindAt;
  reminder.updatedAt = updatedAt;

  return reminder;
})
