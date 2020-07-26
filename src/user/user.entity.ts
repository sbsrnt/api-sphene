import { Column, CreateDateColumn, Entity, Index, ObjectID, ObjectIdColumn, UpdateDateColumn } from 'typeorm';

export type UserRegistration = {
  email: string,
  password: string
  firstName: string
}

@Entity('users')
export class User {
  @ObjectIdColumn()
  id: ObjectID;

  @Index({ unique: true })
  @Column()
  email: string;

  @Column()
  password: string;

  @Column()
  firstName: string;

  @Column()
  resetPasswordToken?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
