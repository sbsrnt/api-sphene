import { NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

export const findItem = ({id, items, errorLabel}: {id: string, items: any[], errorLabel: string}): [unknown, number] => {
  const itemIndex = items.findIndex(item => item.id == id);

  if(itemIndex === -1) throw new NotFoundException(`Could not find ${errorLabel}`);

  const item = items[itemIndex];

  return [item, itemIndex];
}

export const hash = async (s: string): Promise<string> => {
  const salt = await bcrypt.genSalt(15);
  return bcrypt.hash(s, salt);
}

// export const findOne = async ({value , repository, key = 'email' }: { value: string; repository: repositories; key?: string}): Promise<any> => {
//   return repository.find({
//     where: {
//       [key]: {
//         $eq: value
//       }
//     }
//   });
// }
