import { NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { NETWORK_RESPONSE } from './errors';
import { User } from './user/user.entity';
import { UserService } from './user/user.service';

export const findItem = ({id, items, errorLabel}: {id: string, items: any[], errorLabel: string}): [unknown, number] => {
  const itemIndex = items.findIndex(item => item.id == id);

  if(itemIndex === -1) throw new NotFoundException(`Could not find ${errorLabel}`);

  const item = items[itemIndex];

  return [item, itemIndex];
}

export const checkIfUserExists = async (email: string, userService: UserService, returnUser?: boolean): Promise<any> => {
  const [user] = await userService.findOne(email);
  if(!user) throw new NotFoundException(NETWORK_RESPONSE.ERRORS.USER.NOT_FOUND);
  return returnUser ? user : true;
}

export const hash = async (s: string): Promise<string> => {
  const salt = await bcrypt.genSalt(15);
  return bcrypt.hash(s, salt);
}

export const validateEmailFormat = (e: string): boolean => {
  const emailRegExp = /^\S+@\S+\.\S+$/;
  return emailRegExp.test(String(e).toLocaleLowerCase());
};
