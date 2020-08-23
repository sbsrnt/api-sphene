import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createTransport } from 'nodemailer';
import { MongoRepository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { NETWORK_RESPONSE } from '../errors';
import { UserService } from '../user/user.service';
import { checkIfUserExists, hash } from '../utils';
import { EmailVerification, ForgottenPassword } from './mailers.entity';

type repositories = MongoRepository<EmailVerification> | MongoRepository<ForgottenPassword>;

@Injectable()
export class MailersService {
  constructor(
    @InjectRepository(EmailVerification)
    private readonly emailVerificationRepository: MongoRepository<EmailVerification>,
    @InjectRepository(ForgottenPassword)
    private readonly forgottenPasswordRepository: MongoRepository<ForgottenPassword>,
    private userService: UserService,
  ) {}

  async createEmailToken(email: string): Promise<UnprocessableEntityException | true> {
    await checkIfUserExists(email, this.userService);

    const params = { value: email, repository: this.emailVerificationRepository };
    const [token] = await this.findOne(params);

    if (token && ((new Date().getTime() - token.createdAt.getTime()) / 60000 < 15 )){
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.GENERAL.TOKEN_INVALID);
    } else {
      const updatedToken = await this.findOneAndUpdate(params);

      if (updatedToken) return updatedToken;
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.GENERAL.DEFAULT)
    }
  }

  async verifyEmail(t: string): Promise<ForbiddenException | NotFoundException | boolean> {
    const token = await this.emailVerificationRepository.findOne({ token: t });
    if (!token) throw new ForbiddenException(NETWORK_RESPONSE.ERRORS.GENERAL.TOKEN_INVALID);

    const [user] = await this.userService.findOne(token.email);
    await checkIfUserExists(token.email, this.userService);

    user.verified = true;
    user.updatedAt = new Date();
    const savedUser = await this.userService.updateUser(user);

    await this.emailVerificationRepository.deleteOne({ token });

    return !!savedUser;
  }

  async sendEmailVerification(email: string): Promise<boolean> {
    await checkIfUserExists(email, this.userService);

    const params = { value: email, repository: this.emailVerificationRepository };
    const [mailer] = await this.findOne(params);

    if (!mailer?.token) {
      throw new ForbiddenException(NETWORK_RESPONSE.ERRORS.GENERAL.TOKEN_INVALID);
    }

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
        '<a href=' + process.env.MAILER_URL + '/auth/verify/' +  mailer.token + '>Click here to verify your account</a>'
    };

    return await new Promise<boolean>(async function(resolve, reject) {
      await transporter.sendMail(mailerOptions, async (error, info) => {
        try {
          // console.info('Message sent: %s', info?.messageId);
          resolve(true);
        } catch (e) {
          // console.error('Message sent: %s', e);
          reject(false);
        }
      });
    })
  }

  async createForgottenPasswordToken(email: string): Promise<ForgottenPassword> {
    await checkIfUserExists(email, this.userService);

    const [token] = await this.findOne({value: email, repository: this.forgottenPasswordRepository});

    if (token && ((new Date().getTime() - token.createdAt.getTime()) / 60000 < 15 )){
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.EMAIL.RECENTLY_SENT);
    }

   const updatedToken = await this.findOneAndUpdate({value: email, repository: this.forgottenPasswordRepository});
   if(!updatedToken) throw new ForbiddenException(NETWORK_RESPONSE.ERRORS.GENERAL.TOKEN_INVALID);
   return updatedToken;
  }

  async sendEmailForgotPassword(email: string): Promise<boolean> {
    await checkIfUserExists(email, this.userService);

    const params = { value: email, repository: this.forgottenPasswordRepository };
    const [forgottenPasswordModel] = await this.findOne(params);

    if (!forgottenPasswordModel?.token) {
      throw new ForbiddenException(NETWORK_RESPONSE.ERRORS.GENERAL.TOKEN_INVALID);
    }

    const transporter = createTransport({
      // @ts-ignore
      host: process.env.MAILER_HOST,
      port: process.env.MAILER_PORT,
      auth: {
        user: process.env.MAILER_USER,
        pass: process.env.MAILER_PASS,
      },
    });

    const mailOptions = {
      from: '"Company" <' + process.env.MAILER_USER + '>',
      to: email, // list of receivers (separated by ,)
      subject: 'Forgotten Password',
      text: 'Forgot Password',
      html: 'Hi! <br><br> If you requested to reset your password<br><br>'+
        '<a href='+ process.env.MAILER_URL + '/auth/reset-password/'+ forgottenPasswordModel.token + '>Click here</a>'
    };

    return await new Promise<boolean>(async function(resolve, reject) {
      return transporter.sendMail(mailOptions, async (error, info) => {
        try {
          // console.info('Message sent: %s', info?.messageId);
          resolve(true);
        } catch (e) {
          // console.error('Message sent: %s', e);
          reject(false);
        }
      });
    })
  }

  async resetPassword({token, newPassword, confirmNewPassword}: { token: string, newPassword: string, confirmNewPassword: string }): Promise<any> {
    if (!newPassword || !confirmNewPassword || newPassword !== confirmNewPassword ) throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.USER.PASSWORD_MISMATCH);

    const existingToken = await this.forgottenPasswordRepository.findOne({ token });
    if(!existingToken) throw new ForbiddenException(NETWORK_RESPONSE.ERRORS.GENERAL.TOKEN_INVALID);

    const [user] = await this.userService.findOne(existingToken.email);
    await checkIfUserExists(existingToken.email, this.userService);

    user.password = await hash(newPassword);
    user.updatedAt = new Date();
    const savedUser = await this.userService.updateUser(user);

    await this.forgottenPasswordRepository.deleteOne({ token });

    return !!savedUser;
  }

  async findOne({value , repository, key = 'email' }: { value: string; repository: repositories; key?: string}): Promise<any> {
    return repository.find({
      where: {
        [key]: {
          $eq: value
        }
      }
    });
  }

  async findOneAndUpdate({value , repository, key = 'email' }: { value: string; repository: repositories, key?: string }): Promise<any> {
    const token = await uuidv4();
    const createdAt = await new Date();
    await repository.findOneAndUpdate(
      { [key]: value },
      {
        $set: {
          [key]: value,
          token,
          createdAt,
          expiresAt: createdAt.setDate(createdAt.getDate() + 1)
        }
      },
      { upsert: true }
    );

    return process.env.BUILD_ENV === 'dev' ? token : true;
  }
}
