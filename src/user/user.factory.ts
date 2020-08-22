import { define } from 'typeorm-seeding';

import { hash } from '../utils';
import { User } from './user.entity';

define<Promise<User>, Promise<any>>(User, async () => {
  const email = 'test@test.test';
  const password = 'password';
  const firstName = null;

  const user = await new User();
  user.email = await email;
  user.password = await hash(password);
  user.firstName = await firstName;

  return await user;
})
