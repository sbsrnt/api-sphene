import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { omit } from 'lodash';
import { Repository } from 'typeorm';

import { NETWORK_RESPONSE } from '../errors';
import { hash, validateEmailFormat } from '../utils';
import { User, UserRegistration } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async addUser({ email, password, firstName = null }: UserRegistration): Promise<any> {
    if(!email) {
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.USER.MISSING_EMAIL)
    }

    if(!validateEmailFormat(email)) {
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.EMAIL.INVALID_FORMAT)
    }

    if(!password) {
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.USER.MISSING_PASSWORD)
    }

    const [emailExists] = await this.userRepository.find({
      where: {
        email: {
          $eq: email,
          $exists: true
        }
      }
    })

    if(!!emailExists) {
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.USER.EMAIL_EXISTS)
    }

    try {
      const user = {
        email,
        password: await hash(password),
        firstName,
        createdAt: new Date(),
        updatedAt: null,
      }

      const newUser = await this.userRepository.save(user);
      const { password: pwd, id, ...payload } = newUser;

      return payload;
    } catch(e) {
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.GENERAL.DEFAULT)
    }
  }

  async updateUser(user): Promise<any> {
    const [userFromDb] = await this.findOne(user.email);

    if(!userFromDb) throw new NotFoundException('User not found.');

    try {
      const updatedUser = {
        ...omit(userFromDb, 'id'),
        ...omit(user, 'id')
      };
      await this.userRepository.update({ email: user.email }, updatedUser);
      return true;
    } catch(e) {
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.USER.UPDATE_FAIL);
    }
  }

  async findOne(email: string): Promise<any> {
    return this.userRepository.find({
      where: {
        email: {
          $eq: email
        }
      }
    });
  }
}
