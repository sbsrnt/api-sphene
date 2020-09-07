import { NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { addDays, addMonths } from "date-fns";
import { isNaN } from "lodash";

import { NETWORK_RESPONSE } from './errors';
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
  const saltRounds = process.env.BUILD_ENV === 'dev' ? 8 : 15;
  const salt = await bcrypt.genSalt(saltRounds);
  return bcrypt.hash(s, salt);
}

export const validateEmailFormat = (e: string): boolean => {
  const emailRegExp = /^\S+@\S+\.\S+$/;
  return emailRegExp.test(String(e).toLocaleLowerCase());
};

export const filterEnumKeys: any = e => Object.keys(e).filter(k => isNaN(Number(k)))
export const filterNumberEnumKeys: any = e => Object.keys(e).filter(k => !isNaN(Number(k))).map(k => Number(k))


type DaysDifferenceProps = {
  date: Date;
  days?: number;
  months?: number;
}

const daysDifference = ({ date, days, months }: DaysDifferenceProps) => {
  const d = new Date(date);
  if(days) {
    return addDays(d, days).toISOString();
  }

  if(months) {
    return addMonths(d, months).toISOString();
  }
}

export const updateRemindAtByOccurrence = (remindAt, occurrence) => {
  switch(occurrence) {
    case 'daily': return daysDifference({date: remindAt, days: 1});
    case 'every_other_day': return daysDifference({date: remindAt, days: 2});
    case 'weekly': return daysDifference({date: remindAt, days: 7});
    case 'bi_weekly': return daysDifference({date: remindAt, days: 14});
    case 'monthly': return daysDifference({date: remindAt, months: 1});
    case 'quarterly': return daysDifference({date: remindAt, months: 3});
    case 'half_yearly': return daysDifference({date: remindAt, months: 6});
    default: return daysDifference({date: remindAt, months: 12});
  }
}
