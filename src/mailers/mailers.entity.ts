import { Column, CreateDateColumn, Entity, Index, ObjectID, ObjectIdColumn } from 'typeorm';

@Entity('email-verification-requests')
export class EmailVerification {
  @ObjectIdColumn()
  id: ObjectID;

  @Index({ unique: true })
  @Column()
  email: string;

  @Column()
  emailToken: string;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('forgotten-password-requests')
export class ForgottenPassword {
  @ObjectIdColumn()
  id: ObjectID;

  @Index({ unique: true })
  @Column()
  email: string;

  @CreateDateColumn()
  createdAt: Date;
}
