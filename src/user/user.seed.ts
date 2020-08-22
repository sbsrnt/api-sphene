import { Factory, Seeder } from 'typeorm-seeding';

import { User } from './user.entity';

export default class CreateUser implements Seeder {
  public async run(factory: Factory): Promise<any> {
    await factory(User)().create();
  }
}
