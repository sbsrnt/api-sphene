import { Injectable,UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User, UserRegistration } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async addUser({ email, password, firstName = null }: UserRegistration): Promise<any> {
    if(!email) {
      throw new UnprocessableEntityException('Please provide e-mail.')
    }

    if(!password) {
      throw new UnprocessableEntityException('Please provide password.')
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
      throw new UnprocessableEntityException('Email already in use.')
    }

    try {
      const user = {
        email,
        password,
        firstName,
        createdAt: new Date(),
        updatedAt: null,
      }

      const newUser = await this.userRepository.save(user);
      const { password: pwd, id, ...payload } = newUser;

      return payload;
    } catch(e) {
      throw new UnprocessableEntityException('Something went wrong. Try again later.')
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
