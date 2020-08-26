import {
  Column,
  CreateDateColumn,
  Entity,
  ObjectID,
  ObjectIdColumn,
  UpdateDateColumn
} from "typeorm";

export enum ReminderType {
  payment,
  birthday,
  event
}

export enum OccurrenceType {
  daily,
  every_other_day,
  weekly,
  bi_weekly,
  monthly,
  quarterly ,
  half_yearly,
  yearly
}

@Entity('reminders')
export class Reminder {
  @ObjectIdColumn()
  _id: ObjectID;

  @Column()
  userId: string;

  @Column()
  title: string;

  @Column({
    default: undefined
  })
  description: string | null;

  @Column({
    type: 'enum',
    enum: ReminderType,
    default: ReminderType.event
  })
  type: ReminderType | string;

  @Column({
    type: 'enum',
    enum: OccurrenceType,
    default: OccurrenceType.yearly,
  })
  occurrence: OccurrenceType | string | null;

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
