import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { format, startOfMonth } from "date-fns";
import { MongoRepository, ObjectID } from "typeorm";
import { v4 as uuidv4 } from "uuid";

import { NETWORK_RESPONSE } from "../errors";
import { User } from "../user/user.entity";
import { UserService } from "../user/user.service";
import { checkIfUserExists } from "../utils";
import { ChecklistItem, PaymentTrackers } from "./payment-trackers.entity";
const ObjectId = require('mongodb').ObjectID;

type PaymentReq = {
  receiver: string;
  value: number;
  checklist?: ChecklistItem[];
}

@Injectable()
export class PaymentTrackersService {
  constructor(
    @InjectRepository(PaymentTrackers)
    private readonly paymentRepository: MongoRepository<PaymentTrackers>,
    private userService: UserService,
  ) {}

  private readonly logger = new Logger(PaymentTrackersService.name);

  async addPaymentTracker(
    { email }: User,
    {
      receiver,
      value,
      checklist,
    }: PaymentReq): Promise<any> {
    const { _id: uid } = await checkIfUserExists(email, this.userService, true);

    if (!receiver) {
      this.logger.log(`Couldn't create payment for user ${email}: Missing "receiver".`)
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.PAYMENT.MISSING_RECEIVER)
    }

    if (!value) {
      this.logger.log(`Couldn't create payment for user ${email}: Missing "value".`)
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.PAYMENT.MISSING_VALUE)
    }


    if (checklist && Object.values(checklist).length === 0) {
      this.logger.log(`Couldn't create payment for user ${email}: No list items.`);
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.PAYMENT.CHECKLIST_NO_ITEMS);
    }

    if (checklist && Object.values(checklist).length > 3) {
      this.logger.log(`Couldn't create payment for user ${email}: Too many list items.`);
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.PAYMENT.CHECKLIST_TOO_MANY_ITEMS);
    }

    try {
      const preparedChecklist = Object.entries(checklist || {}).map(({ 0: key, 1: value }) => ({
          id: key,
          checked: false,
          checkedTimespan: null,
          description: value || null,
        })
      );

      const payment = {
        receiver,
        history: [{
          paymentHistoryId: uuidv4(),
          value,
          attachedFiles: [],
          checklist: preparedChecklist,
          month: format(startOfMonth(new Date()), 'M-y')
        }],
        associatedReminders: [],
        createdAt: new Date(),
        userId: uid,
      }
      this.logger.log(`Payment Tracker created.`)
      // @ts-ignore
      const { userId, ...newPayment } = await this.paymentRepository.save(payment)
      return newPayment;
    } catch (e) {
      this.logger.log(`Couldn't create payment: ${e}.`)
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.PAYMENT.ADD_FAIL)
    }
  }

  async getAllPaymentTrackers({ email }: User | { email: string }): Promise<any> {
    const { _id: userId } = await checkIfUserExists(email, this.userService, true);
    try {
      this.logger.log(`Got all payments for user ${email}.`)
      return await this.paymentRepository.find({ userId });
    } catch(e) {
      this.logger.log(`Couldn't get all payments for user ${email}: ${e}.`)
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.PAYMENT.GET_ALL_FAIL)
    }
  }

  async getPaymentTracker({ email }: User, id: any): Promise<any> {
    const { _id: userId } = await checkIfUserExists(email, this.userService, true);

    const hex = /[0-9A-Fa-f]{6}/g;
    id = (hex.test(id))? ObjectId(id) : id;

    const payment = await this.paymentRepository.findOne({ _id: id});

    if (!payment) {
      this.logger.log(`Couldn't get payment for user ${email}: Not found.`)
      throw new NotFoundException(NETWORK_RESPONSE.ERRORS.PAYMENT.NOT_FOUND)
    }

    if (payment.userId.toString() !== userId.toString()) {
      this.logger.log(`Couldn't get payment: "userId" mismatch. ${payment.userId} =/= ${userId}`)
      throw new UnauthorizedException(NETWORK_RESPONSE.ERRORS.GENERAL.UNAUTHORIZED)
    }

    this.logger.log(`Got payment for user ${email}: ${id}`)
    return payment
  }

  async updatePaymentTracker(
    { email }: User,
    {
      id,
      receiver,
      value,
      checklist,
    }: PaymentReq  & { id: ObjectID}): Promise<any> {
    const { _id: userId } = await checkIfUserExists(email, this.userService, true);

    if (!receiver) {
      this.logger.log(`Couldn't create payment for user ${email}: Missing "receiver".`)
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.PAYMENT.MISSING_RECEIVER)
    }

    if (!value) {
      this.logger.log(`Couldn't create payment for user ${email}: Missing "value".`)
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.PAYMENT.MISSING_VALUE)
    }

    if (checklist && Object.values(checklist).length === 0) {
      this.logger.log(`Couldn't create payment for user ${email}: No list items.`);
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.PAYMENT.CHECKLIST_NO_ITEMS);
    }

    if (checklist && Object.values(checklist).length > 3) {
      this.logger.log(`Couldn't create payment for user ${email}: Too many list items.`);
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.PAYMENT.CHECKLIST_TOO_MANY_ITEMS);
    }

    const paymentTracker = await this.paymentRepository.findOne({ _id: ObjectId(id) });

    if (paymentTracker.userId.toString() !== userId.toString()) {
      this.logger.log(`Couldn't get payment tracker: "userId" mismatch. ${paymentTracker.userId} =/= ${userId}`)
      throw new UnauthorizedException(NETWORK_RESPONSE.ERRORS.GENERAL.UNAUTHORIZED)
    }

    try {

      const preparedChecklist = Object.entries(checklist || {}).map(({ 0: key, 1: value }: {0: string, 1: ChecklistItem}) => ({
          id: key,
          checked: value.checked,
          checkedTimespan: !value.checked ? null : new Date() ?? value.checkedTimespan,
          description: value.description || null,
        })
      );

      const payment = {
        receiver,
        history: [
          ...paymentTracker.history,
          {
            value,
            attachedFiles: [],
            checklist: preparedChecklist
          }
        ],
        associatedReminders: [],
        userId,
      }

      const { value: updatedPayment } = await this.paymentRepository.findOneAndUpdate(
        {
          $and: [
            { _id: ObjectId(id) },
            { userId }
          ]
        },
        {
          $set: payment
        },
        {
          upsert: true,
          returnOriginal: false
        }
      );
      this.logger.log(`Updated payment for user ${email}: ${id}`)
      return updatedPayment
    } catch(e) {
      this.logger.log(`Couldn't update payment for user ${email}: ${e}.`)
      throw new UnauthorizedException(NETWORK_RESPONSE.ERRORS.PAYMENT.UPDATE_FAIL);
    }
  }

  async updatePaymentTrackerChecks(
    { email }: User,
    id: string,
    paymentTrackerId: string,
    checklist: ChecklistItem[]): Promise<any> {
    const { _id: userId } = await checkIfUserExists(email, this.userService, true);

    const paymentTracker = await this.paymentRepository.findOne({ _id: ObjectId(id) });

    if (paymentTracker.userId.toString() !== userId.toString()) {
      this.logger.log(`Couldn't get payment tracker: "userId" mismatch. ${paymentTracker.userId} =/= ${userId}`)
      throw new UnauthorizedException(NETWORK_RESPONSE.ERRORS.GENERAL.UNAUTHORIZED)
    }

    const paymentTrackerChecks = paymentTracker.history.find(t => t.paymentHistoryId === paymentTrackerId);

    if(!paymentTrackerChecks) {
      this.logger.log(`Couldn't find payment tracker checks.`)
      throw new UnauthorizedException(NETWORK_RESPONSE.ERRORS.PAYMENT.CHECKLIST_NO_ITEMS)
    }

    if (checklist && Object.values(checklist).length === 0 || !paymentTrackerChecks) {
      this.logger.log(`Couldn't create payment for user ${email}: No list items.`);
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.PAYMENT.CHECKLIST_NO_ITEMS);
    }

    if (checklist && Object.values(checklist).length > 3) {
      this.logger.log(`Couldn't create payment for user ${email}: Too many list items.`);
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.PAYMENT.CHECKLIST_TOO_MANY_ITEMS);
    }


    try {
      const preparedChecklist = Object.entries(checklist || {}).map(({ 0: key, 1: value }: {0: string, 1: ChecklistItem}) => ({
          id: key,
          checked: value.checked,
          checkedTimespan: !value.checked ? null : new Date() ?? value.checkedTimespan,
          description: value.description || null,
        })
      );
      const { value: updatedPayment } = await this.paymentRepository.findOneAndUpdate(
        {
          $and: [
            { _id: ObjectId(id) },
            { userId },
            {
              "history.checklist": {
                where: {
                  paymentTrackerId
                }
              }
            }
          ]
        },
        {
          $set: {
            ...preparedChecklist
          }
        },
        {
          upsert: true,
          returnOriginal: false
        }
      );
      this.logger.log(`Updated payment tracker checks for user ${email}: ${id}`)
      console.log(updatedPayment);
      return updatedPayment
    } catch(e) {
      this.logger.log(`Couldn't update payment tracker checks for user ${email}: ${e}.`)
      throw new UnauthorizedException(NETWORK_RESPONSE.ERRORS.PAYMENT.UPDATE_FAIL);
    }
  }

  async deletePaymentTracker({ email }: User, id: any): Promise<any> {
    const { _id: userId } = await checkIfUserExists(email, this.userService, true);

    const hex = /[0-9A-Fa-f]{6}/g;
    id = (hex.test(id))? ObjectId(id) : id;

    const payment = await this.paymentRepository.findOne({_id: id});

    if (!payment) {
      this.logger.log(`Couldn't delete payment: Payment not found.`)
      throw new NotFoundException(NETWORK_RESPONSE.ERRORS.PAYMENT.NOT_FOUND)
    }

    if (payment.userId.toString() !== userId.toString()) {
      this.logger.log(`Couldn't delete payment: userId mismatch. ${payment.userId} =/= ${userId}.`)
      throw new UnauthorizedException(NETWORK_RESPONSE.ERRORS.GENERAL.UNAUTHORIZED)
    }

    try {
      await this.paymentRepository.deleteOne({
        $and: [
          { _id: ObjectId(id),
            userId
          }
        ]
      });
      this.logger.log(`Deleted payment for user ${email}: ${id}.`)
      return { _id: id }
    } catch(e) {
      this.logger.log(`Couldn't delete payment for user ${email}: ${e}.`)
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.PAYMENT.DELETE_FAIL);
    }
  }

  async deleteAllPaymentTrackers({ email }: User): Promise<any> {
    const { _id: userId } = await checkIfUserExists(email, this.userService, true);

    try {
      await this.paymentRepository.deleteMany({userId});
      this.logger.log(`Deleted all payments for user ${email}.`)
      return {
        success: true
      }
    } catch(e) {
      this.logger.log(`Couldn't delete all payments for user ${email}: ${e}.`)
      throw new UnprocessableEntityException(NETWORK_RESPONSE.ERRORS.PAYMENT.DELETE_ALL_FAIL)
    }
  }
}
