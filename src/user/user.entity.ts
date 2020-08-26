import { Column, CreateDateColumn, Entity, Index, ObjectID, ObjectIdColumn, UpdateDateColumn } from 'typeorm';

export type UserRegistration = {
  email: string,
  password: string
  firstName: string
}

@Entity('users')
export class User {
  @ObjectIdColumn()
  _id: ObjectID;

  @Index({ unique: true })
  @Column()
  email: string;

  @Column()
  password: string;

  @Column()
  firstName: string;

  @Column({
    default: false
  })
  verified: boolean;

  @CreateDateColumn({
    default: new Date()
  })
  createdAt: Date;

  @UpdateDateColumn({
    default: null
  })
  updatedAt: Date;
}
