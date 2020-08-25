import { Column, CreateDateColumn, Entity, ObjectID, ObjectIdColumn, UpdateDateColumn } from 'typeorm';

export enum ReminderType {
  PAYMENT = 'payment',
  BIRTHDAY = 'birthday',
  EVENT = 'event',
}

export enum OccurrenceType {
  DAILY = 0,
  EVERY_OTHER_DAY = 1,
  WEEKLY = 2,
  BI_WEEKLY = 3,
  MONTHLY = 4,
  QUARTERLY = 5,
  HALF_YEARLY = 6,
  YEARLY = 8
}

@Entity('reminders')
export class Reminder {
  @ObjectIdColumn()
  id: ObjectID;

  @Column()
  userId: string;

  @Column()
  title: string;

  @Column({
    default: undefined
  })
  description: string;

  @Column({
    type: 'enum',
    enum: ReminderType,
    default: ReminderType.EVENT
  })
  type: ReminderType

  @Column({
    type: 'enum',
    enum: OccurrenceType,
    default: OccurrenceType.YEARLY,
  })
  occurrence: OccurrenceType

  @CreateDateColumn()
  remindAt: Date;

  @CreateDateColumn({
    default: new Date()
  })
  createdAt: Date;

  @UpdateDateColumn({
    default: null
  })
  updatedAt: Date;
}
