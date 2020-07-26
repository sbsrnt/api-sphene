import { NotFoundException } from '@nestjs/common';

export const findItem = ({id, items, errorLabel}: {id: string, items: any[], errorLabel: string}): [unknown, number] => {
  const itemIndex = items.findIndex(item => item.id == id);

  if(itemIndex === -1) throw new NotFoundException(`Could not find ${errorLabel}`);

  const item = items[itemIndex];

  return [item, itemIndex];
}
