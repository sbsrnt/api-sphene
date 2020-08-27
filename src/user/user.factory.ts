import { define } from 'typeorm-seeding';
const ObjectId = require('mongodb').ObjectId;


import { hash } from '../utils';
import { User } from './user.entity';

define<Promise<User>, any>(User, async (_, email: string) => {
  const user = await new User();
  const password = 'password';

  user._id = ObjectId();
  user.email = email;
  user.password = await hash(password);

  return user;
})
