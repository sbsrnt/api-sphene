import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createTransport } from 'nodemailer';
import { MongoRepository } from 'typeorm';

import { UserService } from '../user/user.service';
import { EmailVerification } from './mailers.entity';

@Injectable()
export class MailersService {
  constructor(
    @InjectRepository(EmailVerification)
    private readonly emailVerificationRepository: MongoRepository<EmailVerification>,
    private userService: UserService,
  ) {}

  async createEmailToken(email: string): Promise<UnprocessableEntityException | true> {
    const [user] = await this.userService.findOne(email);
    if(!user) throw new UnprocessableEntityException('User with given email doesn\'t exist.');

    const [emailToken] = await this.findOne(email);

    if (emailToken && ((new Date().getTime() - emailToken.timestamp.getTime()) / 60000 < 15 )){
      throw new UnprocessableEntityException();
    } else {
      await this.findOneAndUpdate(email);
      return true;
    }
  }

  async verifyEmail(token: string): Promise<ForbiddenException | NotFoundException | boolean> {
    const emailToken = await this.emailVerificationRepository.findOne({ emailToken: token });

    if (!emailToken) throw new ForbiddenException();

    const [user] = await this.userService.findOne(emailToken.email);

    if (!user) throw new NotFoundException('User not found.');

    if (user) {
      user.verified = true;
      user.updatedAt = new Date();
      const savedUser = await this.userService.updateUser(user);

      await this.emailVerificationRepository.deleteOne({
        emailToken: token
      });

      return !!savedUser;
    }
  }

  async sendEmailVerification(email: string): Promise<boolean> {
    const [user] = await this.userService.findOne(email);
    if (!user) throw new NotFoundException('User with given email not found');

    const [mailer] = await this.findOne(email);
    if (!mailer?.emailToken)
      throw new ForbiddenException('User not registered.');
    const transporter = createTransport({
      // @ts-ignore
      host: process.env.MAILER_HOST,
      port: process.env.MAILER_PORT,
      auth: {
        user: process.env.MAILER_USER,
        pass: process.env.MAILER_PASS,
      },
    });

    const mailerOptions = {
      from: '"Company" <' + process.env.MAILER_USER + '>',
      to: email, // list of receivers (separated by ,)
      subject: 'Verify Email',
      text: 'Verify Email',
      html: 'Hi! <br><br> Thanks for your registration<br><br>' +
        '<a href=' + process.env.MAILER_URL + mailer.emailToken + '>Click here to activate your account</a>'
    };

    return await new Promise<boolean>(async function(resolve, reject) {
      await transporter.sendMail(mailerOptions, async (error, info) => {
        try {
          console.info('Message sent: %s', info?.messageId);
          resolve(true);
        } catch (e) {
          console.error('Message sent: %s', e);
          return reject(false);
        }
      });
    })
  }

  async findOne(email: string): Promise<any> {
    return this.emailVerificationRepository.find({
      where: {
        email: {
          $eq: email
        }
      }
    });
  }

  async findOneAndUpdate(email: string): Promise<any> {
    const emailToken = (Math.floor(Math.random() * (9000000)) + 1000000).toString(); //Generate 7 digits number
    return this.emailVerificationRepository.findOneAndUpdate(
      { email },
      {
        $set: {
          email,
          emailToken,
          timestamp: new Date()
        }
      },
      {upsert: true}
    );
  }
}
