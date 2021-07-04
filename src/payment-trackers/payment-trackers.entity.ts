import {
  Column,
  CreateDateColumn,
  Entity,
  ObjectID,
  ObjectIdColumn,
  UpdateDateColumn
} from "typeorm";

type PaymentHistory = {
  paymentHistoryId: string;
  value: number;
  attachedFiles: File[] | [];
  checklist?: ChecklistItem[] | [];
}

export type ChecklistItem = {
  id: string;
  checked: boolean;
  checkedTimespan: Date | null;
  description: string;
}

@Entity('payments')
export class PaymentTrackers {
  @ObjectIdColumn()
  _id: ObjectID;

  @Column()
  userId: string;

  @Column()
  receiver: string

  @Column()
  associatedReminders: string[]

  @Column()
  history: PaymentHistory[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn({
    default: null
  })
  updatedAt: Date;
}
