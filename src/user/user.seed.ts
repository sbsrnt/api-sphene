import { Factory, Seeder } from 'typeorm-seeding';

import { Reminder } from "../reminders/reminders.entity";
import { User } from './user.entity';

export default class CreateUser implements Seeder {
  public async run(factory: Factory): Promise<any> {
    await factory(User)('test@test.test')
      .map(async (user: User): Promise<any> => {
        await factory(Reminder)(user._id).createMany(5)
        return user;
      })
      .create();

    await factory(User)('test2@test.test')
      .map(async (user: User): Promise<any> => {
        await factory(Reminder)(user._id).createMany(5)
        return user;
      })
      .create();
  }
}
