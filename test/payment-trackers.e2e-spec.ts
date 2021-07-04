import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";

import * as request from 'supertest';

import DbModule, { mongod } from "./db-test.module";
import { deleteAllEntities, registerTestUser } from "./helpers";

import { EmailVerification, ForgottenPassword } from "../src/mailers/mailers.entity";
import { UserService } from "../src/user/user.service";
import { AuthService } from "../src/auth/auth.service";
import { MailersService } from "../src/mailers/mailers.service";
import { User } from "../src/user/user.entity";
import { AppModule } from "../src/app.module";
import { LocalStrategy } from "../src/auth/local.strategy";
import { JwtStrategy } from "../src/auth/jwt.strategy";
import { PaymentTrackersService } from "../src/payment-trackers/payment-trackers.service";
import { PaymentTrackers } from "../src/payment-trackers/payment-trackers.entity";

describe("PaymentTrackersController (e2e)", () => {
  let app: INestApplication;
  let userService = UserService;
  let authService = AuthService;
  let paymentTrackersService = PaymentTrackersService;
  let token = null;
  let user2token = null;
  let paymentId = null;
  let urlWithId = null;
  const url = '/payment-trackers';

  const commonPaymentTrackersReq = {
    receiver: 'test receiver',
    value: '0',
  }

  const commonExpectedPaymentRes = {
    receiver: 'test receiver',
    updatedAt: expect.any(String),
    createdAt: expect.any(String),
    _id: expect.any(String),
    history: [{
      value: '0',
      attachedFiles: [],
      checklist: [],
    }]
  }

  const commonPutExpectedPaymentRes = {
    receiver: 'test receiver',
    _id: expect.any(String),
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        DbModule({
          useUnifiedTopology: true,
          name: (new Date().getTime() * Math.random()).toString(16), // <-- This is to have a "unique" name for the connection
        }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: process.env.JWT_SECRET,
          signOptions: { expiresIn: '600s' },
        }),
        TypeOrmModule.forFeature([User, EmailVerification, ForgottenPassword, PaymentTrackers]),
        AppModule
      ],
      providers: [AuthService, UserService, MailersService, LocalStrategy, JwtStrategy]
    })
      .compile();

    // @ts-ignore
    authService = moduleFixture.get<AuthService>(AuthService);
    // @ts-ignore
    userService = moduleFixture.get<UserService>(UserService);
    // @ts-ignore
    paymentTrackersService = moduleFixture.get<PaymentTrackersService>(PaymentTrackersService);
    // @ts-ignore
    app = moduleFixture.createNestApplication();
    await app.init();

    const { body: { access_token } } = await registerTestUser(app);
    const { body: { access_token: user2access_token } } = await registerTestUser(app, {
      email: 'test2@test.test',
      password: 'pwd',
      firstName: 'test',
    });
    token = access_token;
    user2token = user2access_token;

    await request(app.getHttpServer())
      .post(url)
      .set('Authorization', `Bearer ${access_token}`)
      .send(commonPaymentTrackersReq)
      .expect(201)
      .then(({ body: payment }) => {
        paymentId = payment._id;
        urlWithId = `/payment-trackers/${payment._id}`;
      })
  });

  afterAll(async () => {
    await deleteAllEntities(app, token, url);
    await app.close();
    await mongod.stop();
  });

  describe('has required services defined', () => {
    it('AuthService should be defined', () => {
      expect(authService).toBeDefined();
    });

    it('UserService should be defined', () => {
      expect(userService).toBeDefined();
    });

    it('PaymentTrackersService should be defined', () => {
      expect(paymentTrackersService).toBeDefined();
    });
  })

  describe('/POST', () => {
    describe('throws 401 with invalid token', () => {
      it('without header', () =>
        request(app.getHttpServer())
          .post(url)
          .send(commonPaymentTrackersReq)
          .expect(401)
      )

      it('with header', () =>
        request(app.getHttpServer())
          .post(url)
          .set('Authorization', 'Bearer 123')
          .send(commonPaymentTrackersReq)
          .expect(401)
      )
    })

    describe("doesn't create payment when", () => {
      it('there is missing receiver', () =>
        request(app.getHttpServer())
          .post(url)
          .set('Authorization', `Bearer ${token}`)
          .send({})
          .expect(422)
      )

      it('there is missing value', () =>
        request(app.getHttpServer())
          .post(url)
          .set('Authorization', `Bearer ${token}`)
          .send({receiver: 'foo'})
          .expect(422)
      )

      it('checklist is empty', () =>
        request(app.getHttpServer())
          .post(url)
          .set('Authorization', `Bearer ${token}`)
          .send({
            ...commonExpectedPaymentRes,
            checklist: {}
          })
          .expect(422)
      )

      it('checklist is too long', () =>
        request(app.getHttpServer())
          .post(url)
          .set('Authorization', `Bearer ${token}`)
          .send({
            ...commonExpectedPaymentRes,
            checklist: {
              item_0: 'foo',
              item_1: 'bar',
              item_2: 'baz',
              item_3: 'qwe',
            }
          })
          .expect(422)
      )
    })

    describe('creates payment', () => {
      it('without checklist', () =>
        request(app.getHttpServer())
          .post(url)
          .set('Authorization', `Bearer ${token}`)
          .send(commonPaymentTrackersReq)
          .expect(201)
          .then(({ body: payment }) => {
            expect(payment).toMatchObject(commonExpectedPaymentRes)
          })
      )

      describe('with checks:', () => {
        it('3', () =>
          request(app.getHttpServer())
            .post(url)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonPaymentTrackersReq,
              checklist: {
                item_0: 'check 1',
                item_1: 'check 2',
                item_2: 'check 3',
              }
            })
            .expect(201)
            .then(({ body: payment }) => {
              expect(payment).toMatchObject({
                ...commonExpectedPaymentRes,
                history: [
                  {
                    attachedFiles: [],
                    checklist: [
                      {
                        id: 'item_0',
                        checked: false,
                        checkedTimespan: null,
                        description: 'check 1'
                      },
                      {
                        id: 'item_1',
                        checked: false,
                        checkedTimespan: null,
                        description: 'check 2'
                      },
                      {
                        id: 'item_2',
                        checked: false,
                        checkedTimespan: null,
                        description: 'check 3'
                      },
                    ]
                  }
                ]
              })
            })
        )
        it('2', () =>
          request(app.getHttpServer())
            .post(url)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonPaymentTrackersReq,
              checklist: {
                item_0: 'check 1',
                item_1: 'check 2',
              }
            })
            .expect(201)
            .then(({ body: payment }) => {
              expect(payment).toMatchObject({
                ...commonExpectedPaymentRes,
                history: [
                  {
                    attachedFiles: [],
                    checklist: [
                      {
                        id: 'item_0',
                        checked: false,
                        checkedTimespan: null,
                        description: 'check 1'
                      },
                      {
                        id: 'item_1',
                        checked: false,
                        checkedTimespan: null,
                        description: 'check 2'
                      },
                    ]
                  }
                ]
              })
            })
        )

        it('1', () =>
          request(app.getHttpServer())
            .post(url)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonPaymentTrackersReq,
              checklist: {
                item_0: 'check 1',
              }
            })
            .expect(201)
            .then(({ body: payment }) => {
              expect(payment).toMatchObject({
                ...commonExpectedPaymentRes,
                history: [
                  {
                    attachedFiles: [],
                    checklist: [
                      {
                        id: 'item_0',
                        checked: false,
                        checkedTimespan: null,
                        description: 'check 1'
                      },
                    ]
                  }
                ]
              })
            })
        )
      })
    })
  })

  describe('/PUT', () => {
    describe('throws 401 with invalid token', () => {
      it('without header', () =>
        request(app.getHttpServer())
          .put(urlWithId)
          .send(commonPaymentTrackersReq)
          .expect(401)
      )

      it('with header', () =>
        request(app.getHttpServer())
          .put(urlWithId)
          .set('Authorization', 'Bearer 123')
          .send(commonPaymentTrackersReq)
          .expect(401)
      )
    })

    describe('throws 422', () => {
      it('on missing receiver', () =>
        request(app.getHttpServer())
          .put(urlWithId)
          .set('Authorization', `Bearer ${token}`)
          .send({})
          .expect(422)
      )

      it('on missing value', () =>
        request(app.getHttpServer())
          .put(urlWithId)
          .set('Authorization', `Bearer ${token}`)
          .send({receiver: 'foo'})
          .expect(422)
      )

      it('on non-existing payment', () =>
        request(app.getHttpServer())
          .put('/payment-trackers/123')
          .set('Authorization', `Bearer ${token}`)
          .send(commonExpectedPaymentRes)
          .expect(401)
      )
    })

    describe('updates payment', () => {
      it('with all values besides checklist', () =>
        request(app.getHttpServer())
          .put(urlWithId)
          .set('Authorization', `Bearer ${token}`)
          .send({receiver: 'test10', value: 10})
          .expect(200)
          .then(({ body: payment }) => {
            expect(payment).toMatchObject({
              ...commonExpectedPaymentRes,
              receiver: 'test10',
              history: [
                {
                  value: 10,
                  attachedFiles: [],
                  checklist: []
                }
              ]
            })
          })
      )

      it('with receiver change', () =>
        request(app.getHttpServer())
          .put(urlWithId)
          .set('Authorization', `Bearer ${token}`)
          .send({...commonPaymentTrackersReq, receiver: 'test_foo'})
          .expect(200)
          .then(({ body: payment }) => {
            expect(payment).toMatchObject({
              ...commonExpectedPaymentRes,
              receiver: 'test_foo',
              history: [
                {
                  value: "0",
                  attachedFiles: [],
                  checklist: []
                }
              ]
            })
          })
      )

      it('with value change', () =>
        request(app.getHttpServer())
          .put(urlWithId)
          .set('Authorization', `Bearer ${token}`)
          .send({...commonPaymentTrackersReq, value: 100})
          .expect(200)
          .then(({ body: payment }) => {
            expect(payment).toMatchObject({
              ...commonExpectedPaymentRes,
              history: [
                {
                  value: 100,
                  attachedFiles: [],
                  checklist: []
                }
              ]
            })
          })
      )

      it('single task is checked', () =>
        request(app.getHttpServer())
          .put(urlWithId)
          .set('Authorization', `Bearer ${token}`)
          .send({
            ...commonPaymentTrackersReq,
            checklist: {
              item_0: {
                id: 'item_0',
                checked: true,
                description: 'check 1',
                checkedTimespan: null,
              },
            }
          })
          .expect(200)
          .then(({ body: payment }) => {
            expect(payment).toMatchObject({
              ...commonExpectedPaymentRes,
              history: [
                {
                  value: "0",
                  attachedFiles: [],
                  checklist: [{
                    id: 'item_0',
                    checked: true,
                    checkedTimespan: expect.any(String),
                    description: 'check 1'
                  }]
                }
              ]
            })
          })
      )

      it('single task is checked and then unchecked', async () => {
        await request(app.getHttpServer())
          .put(urlWithId)
          .set('Authorization', `Bearer ${token}`)
          .send({
            ...commonPaymentTrackersReq,
            checklist: {
              item_0: {
                id: 'item_0',
                checked: true,
                description: 'check 1',
                checkedTimespan: null,
              },
            }
          })
          .expect(200)
          .then(({ body: payment }) => {
            expect(payment).toMatchObject({
              ...commonExpectedPaymentRes,
              history: [
                {
                  value: "0",
                  attachedFiles: [],
                  checklist: [{
                    id: 'item_0',
                    checked: true,
                    checkedTimespan: expect.any(String),
                    description: 'check 1'
                  }]
                }
              ]
            })
          })

        await request(app.getHttpServer())
          .put(urlWithId)
          .set('Authorization', `Bearer ${token}`)
          .send({
            ...commonPaymentTrackersReq,
            checklist: {
              item_0: {
                id: 'item_0',
                checked: false,
                description: 'check 1',
                checkedTimespan: new Date(),
              },
            }
          })
          .expect(200)
          .then(({ body: payment }) => {
            expect(payment).toMatchObject({
              ...commonExpectedPaymentRes,
              history: [
                {
                  value: "0",
                  attachedFiles: [],
                  checklist: [{
                    id: 'item_0',
                    checked: false,
                    checkedTimespan: null,
                    description: 'check 1'
                  }]
                }
              ]
            })
          })
      })
    })

    describe("doesn't update payment when", () => {
      it('tokens mismatch', async () => {
        await request(app.getHttpServer())
          .post(url)
          .set('Authorization', `Bearer ${token}`)
          .send(commonPaymentTrackersReq)
          .expect(201)
          .then(({ body: payment }) => {
            expect(payment).toMatchObject(commonExpectedPaymentRes)
          })

        await request(app.getHttpServer())
          .put(urlWithId)
          .set('Authorization', `Bearer ${user2token}`)
          .send(commonPaymentTrackersReq)
          .expect(401)

        await request(app.getHttpServer())
          .put(urlWithId)
          .set('Authorization', `Bearer ${token}`)
          .send(commonPaymentTrackersReq)
          .expect(200)
          .then(({ body: payment }) => {
            expect(payment).toMatchObject(commonPutExpectedPaymentRes)
          })
      })

      it('has missing receiver', () => {
        request(app.getHttpServer())
          .post(url)
          .set('Authorization', `Bearer ${token}`)
          .send({})
          .expect(422)
      })
    })
  })

  describe('/GET', () => {
    describe('single user payment', () => {
      describe('throws 401 with invalid token', () => {
        it('without header', () =>
          request(app.getHttpServer())
            .get(urlWithId)
            .expect(401)
        )

        it('when one user wants to get other user payment', () =>
          request(app.getHttpServer())
            .get(urlWithId)
            .set('Authorization', `Bearer ${user2token}`)
            .expect(401)
        )

        it('with header', () =>
          request(app.getHttpServer())
            .get(urlWithId)
            .set('Authorization', 'Bearer 123')
            .send(commonPaymentTrackersReq)
            .expect(401)
        )
      })

      it('throws 404 on non-existing payment', () =>
        request(app.getHttpServer())
          .get(`/payment-trackers/15`)
          .set('Authorization', `Bearer ${token}`)
          .expect(404)
      )

      it('gets payment', () =>
        request(app.getHttpServer())
          .get(urlWithId)
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
      )
    })

    describe('all user payment trackers', () => {
      describe('throws 401 with invalid token', () => {
        it('without header', () =>
          request(app.getHttpServer())
            .get(url)
            .expect(401)
        )

        it('with header', () =>
          request(app.getHttpServer())
            .get(url)
            .set('Authorization', 'Bearer 123')
            .send(commonPaymentTrackersReq)
            .expect(401)
        )
      })

      describe('gets', () => {
        it('zero payment trackers', async () => {
          await deleteAllEntities(app, token, url);
        })

        it('one payment', async () => {
          await request(app.getHttpServer())
            .post(url)
            .set('Authorization', `Bearer ${token}`)
            .send(commonPaymentTrackersReq)
            .expect(201)
            .then(({ body: payment }) => {
              paymentId = payment._id;
              urlWithId = `/payment-trackers/${payment._id}`;
            })

          await request(app.getHttpServer())
            .get(url)
            .set('Authorization', `Bearer ${token}`)
            .expect(200)
            .then(({ body }) => {
              expect(body.length).toEqual(1);
            })
        })

        it('few payment trackers', async () => {
          await request(app.getHttpServer())
            .post(url)
            .set('Authorization', `Bearer ${token}`)
            .send(commonPaymentTrackersReq)
            .expect(201)
            .then(({ body: payment }) => {
              expect(payment).toMatchObject(commonExpectedPaymentRes)
            })

          await request(app.getHttpServer())
            .get(url)
            .set('Authorization', `Bearer ${token}`)
            .expect(200)
            .then(({ body }) => {
              // 1 created in beforeAll(), 2 created above
              expect(body.length).toEqual(2);
            })
        })
      })
    })
  })

  describe('/DELETE', () => {
    describe('single user payment', () => {
      describe('throws 401 with invalid token', () => {
        it('without header', () =>
          request(app.getHttpServer())
            .delete(urlWithId)
            .expect(401)
        )

        it('with header', () =>
          request(app.getHttpServer())
            .delete(urlWithId)
            .set('Authorization', 'Bearer 123')
            .expect(401)
        )
      })

      it('throws 404 on non-existing payment', async () => {
        await request(app.getHttpServer())
          .delete('/payment-trackers/123')
          .set('Authorization', `Bearer ${token}`)
          .expect(404)
      })

      it("throws 401 if user wants to delete other user payment", async () => {
        await request(app.getHttpServer())
          .delete(urlWithId)
          .set('Authorization', `Bearer ${user2token}`)
          .expect(401)

        await request(app.getHttpServer())
          .get(urlWithId)
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
      })

      it('deletes payment', async () => {
        await request(app.getHttpServer())
          .delete(urlWithId)
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
          .then(({ body: { _id } }) => {
            expect(_id).toEqual(paymentId);
          })

        await request(app.getHttpServer())
          .get(urlWithId)
          .set('Authorization', `Bearer ${token}`)
          .expect(404)
      })
    })

    describe('all user payment trackers', () => {
      describe('throws 401 with invalid token', () => {
        it('without header', () =>
          request(app.getHttpServer())
            .delete(url)
            .expect(401)
        )

        it('with header', () =>
          request(app.getHttpServer())
            .delete(url)
            .set('Authorization', 'Bearer 123')
            .send(commonPaymentTrackersReq)
            .expect(401)
        )
      })

      it('deletes all payment trackers', async () => {
        await deleteAllEntities(app, token, url);
      })
    })
  })
})

