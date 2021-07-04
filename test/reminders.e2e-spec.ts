import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
const sinon = require('sinon')

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
import { RemindersService } from "../src/reminders/reminders.service";
import { addDays, addMinutes, addYears } from "date-fns";
import { ScheduleModule } from "@nestjs/schedule";

describe('RemindersController (e2e)', () => {
  let app: INestApplication;
  let userService = UserService;
  let authService = AuthService;
  let remindersService = RemindersService;
  let token = null;
  let user2token = null;
  let reminderId = null;
  let urlWithReminderId = null;
  const url = '/reminders';

  const commonReminderReq = {
    title: 'test title',
    remindAt: addDays(new Date(), 1)
  }

  const commonExpectedReminderRes = {
    title: 'test title',
    type: 2, // event
    occurrence: 'yearly',
    remindAt: expect.any(String),
    updatedAt: expect.any(String),
    createdAt: expect.any(String),
    _id: expect.any(String),
  }

  const commonPutExpectedReminderRes = {
    title: 'test title',
    type: 'event',
    occurrence: 'yearly',
    remindAt: expect.any(String),
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
        TypeOrmModule.forFeature([User, EmailVerification, ForgottenPassword]),
        ScheduleModule.forRoot(),
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
    remindersService = moduleFixture.get<RemindersService>(RemindersService);
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
      .post('/reminders')
      .set('Authorization', `Bearer ${access_token}`)
      .send({
        ...commonReminderReq,
        description: 'test desc',
      })
      .expect(201)
      .then(({ body: reminder }) => {
        reminderId = reminder._id;
        urlWithReminderId = `/reminders/${reminder._id}`;
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

    it('RemindersService should be defined', () => {
      expect(remindersService).toBeDefined();
    });
  })

  describe('/POST', () => {
    describe('throws 401 with invalid token', () => {
      it('without header', () =>
        request(app.getHttpServer())
          .post(url)
          .send({
            ...commonReminderReq,
            description: 'test desc',
            type: 0,
            occurrence: 4,
          })
          .expect(401)
      )

      it('with header', () =>
        request(app.getHttpServer())
          .post(url)
          .set('Authorization', 'Bearer 123')
          .send({
            ...commonReminderReq,
            description: 'test desc',
            type: 0,
            occurrence: 4,
          })
          .expect(401)
      )
    })

    describe('throws 422', () => {
      it('on missing title', () =>
        request(app.getHttpServer())
          .post(url)
          .set('Authorization', `Bearer ${token}`)
          .send({
            remindAt: new Date()
          })
          .expect(422)
      )

      it('on missing remindAt', () =>
        request(app.getHttpServer())
          .post(url)
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: 'test title'
          })
          .expect(422)
      )
    })

    describe("doesn't create reminder when", () => {
      describe("type:", () => {
        it("is not supported", () =>
          request(app.getHttpServer())
            .post(url)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonReminderReq,
              type: -1,
            })
            .expect(422)
        )


        it(">number< is string", () =>
          request(app.getHttpServer())
            .post(url)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonReminderReq,
              type: '1',
            })
            .expect(422)
        )

        it("is string", () =>
          request(app.getHttpServer())
            .post(url)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonReminderReq,
              type: 'birthday',
            })
            .expect(422)
        )

        it("not supported reminder type is string", () =>
          request(app.getHttpServer())
            .post(url)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonReminderReq,
              type: 'test type',
            })
            .expect(422)
        )
      })

      describe("occurrence:", () => {
        it("reminder occurrence is not supported", () =>
          request(app.getHttpServer())
            .post(url)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonReminderReq,
              occurrence: -1,
            })
            .expect(422)
        )


        it(">number< is string", () =>
          request(app.getHttpServer())
            .post(url)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonReminderReq,
              occurrence: '1',
            })
            .expect(422)
        )

        it("is string", () =>
          request(app.getHttpServer())
            .post(url)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonReminderReq,
              occurrence: 'daily',
            })
            .expect(422)
        )

        it("not supported reminder occurrence is string", () =>
          request(app.getHttpServer())
            .post(url)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonReminderReq,
              occurrence: 'test type',
            })
            .expect(422)
        )
      })
    })

    describe('creates reminder', () => {
      it('without description', () =>
        request(app.getHttpServer())
          .post(url)
          .set('Authorization', `Bearer ${token}`)
          .send(commonReminderReq)
          .expect(201)
          .then(({ body: reminder }) => {
            expect(reminder).toMatchObject(commonExpectedReminderRes)
          })
      )

      it('with all possible data', () =>
        request(app.getHttpServer())
          .post(url)
          .set('Authorization', `Bearer ${token}`)
          .send({
            ...commonReminderReq,
            description: 'test desc',
            type: 2,
            occurrence: 4,
          })
          .expect(201)
          .then(({ body: reminder }) => {
            expect(reminder).toMatchObject({
              ...commonExpectedReminderRes,
              occurrence: 'monthly'
            })
          })
      )

      describe('with type:', () => {
        it('payment', () =>
          request(app.getHttpServer())
            .post(url)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonReminderReq,
              type: 0,
            })
            .expect(201)
            .then(({ body: reminder }) => {
              expect(reminder).toMatchObject({
                ...commonExpectedReminderRes,
                type: 0
              })
            })
        )

        it('birthday', () =>
          request(app.getHttpServer())
            .post(url)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonReminderReq,
              type: 1,
            })
            .expect(201)
            .then(({ body: reminder }) => {
              expect(reminder).toMatchObject({
                ...commonExpectedReminderRes,
                type: 1
              })
            })
        )

        it('event (in req)', () =>
          request(app.getHttpServer())
            .post(url)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonReminderReq,
              type: 2,
            })
            .expect(201)
            .then(({ body: reminder }) => {
              expect(reminder).toMatchObject(commonExpectedReminderRes)
            })
        )

        it('events (not in req) (default)', () =>
          request(app.getHttpServer())
            .post(url)
            .set('Authorization', `Bearer ${token}`)
            .send(commonReminderReq)
            .expect(201)
            .then(({ body: reminder }) => {
              expect(reminder).toMatchObject(commonExpectedReminderRes)
            })
        )
      })

      describe('with occurrence:', () => {
        it('daily', () =>
          request(app.getHttpServer())
            .post(url)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonReminderReq,
              occurrence: 0,
            })
            .expect(201)
            .then(({ body: reminder }) => {
              expect(reminder).toMatchObject({
                ...commonExpectedReminderRes,
                occurrence: 'daily'
              })
            })
        )

        it('every_other_day', () =>
          request(app.getHttpServer())
            .post(url)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonReminderReq,
              occurrence: 1,
            })
            .expect(201)
            .then(({ body: reminder }) => {
              expect(reminder).toMatchObject({
                ...commonExpectedReminderRes,
                occurrence: 'every_other_day'
              })
            })
        )

        it('weekly', () =>
          request(app.getHttpServer())
            .post(url)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonReminderReq,
              occurrence: 2,
            })
            .expect(201)
            .then(({ body: reminder }) => {
              expect(reminder).toMatchObject({
                ...commonExpectedReminderRes,
                occurrence: 'weekly'
              })
            })
        )

        it('bi_weekly', () => request(app.getHttpServer())
          .post(url)
          .set('Authorization', `Bearer ${token}`)
          .send({
            ...commonReminderReq,
            occurrence: 3,
          })
          .expect(201)
          .then(({ body: reminder }) => {
            expect(reminder).toMatchObject({
              ...commonExpectedReminderRes,
              occurrence: "bi_weekly"
            })
          })
        )

        it('monthly', () =>
          request(app.getHttpServer())
            .post(url)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonReminderReq,
              occurrence: 4,
            })
            .expect(201)
            .then(({ body: reminder }) => {
              expect(reminder).toMatchObject({
                ...commonExpectedReminderRes,
                occurrence: "monthly"
              })
            })
        )

        it('quarterly', () =>
          request(app.getHttpServer())
            .post(url)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonReminderReq,
              occurrence: 5,
            })
            .expect(201)
            .then(({ body: reminder }) => {
              expect(reminder).toMatchObject({
                ...commonExpectedReminderRes,
                occurrence: "quarterly"
              })
            })
        )

        it('half_yearly', () =>
          request(app.getHttpServer())
            .post(url)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonReminderReq,
              occurrence: 6,
            })
            .expect(201)
            .then(({ body: reminder }) => {
              expect(reminder).toMatchObject({
                ...commonExpectedReminderRes,
                occurrence: "half_yearly"
              })
            })
        )

        it('yearly (in req)', () =>
          request(app.getHttpServer())
            .post(url)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonReminderReq,
              occurrence: 7,
            })
            .expect(201)
            .then(({ body: reminder }) => {
              expect(reminder).toMatchObject({
                ...commonExpectedReminderRes,
                occurrence: "yearly"
              })
            })
        )

        it('yearly (not in req) (default)', () =>
          request(app.getHttpServer())
            .post(url)
            .set('Authorization', `Bearer ${token}`)
            .send(commonReminderReq)
            .expect(201)
            .then(({ body: reminder }) => {
              expect(reminder).toMatchObject(commonExpectedReminderRes)
            })
        )
      })
    })
  })

  describe('/PUT', () => {
    describe('throws 401 with invalid token', () => {
      it('without header', () =>
        request(app.getHttpServer())
          .put(urlWithReminderId)
          .send({
            ...commonReminderReq,
            description: 'test desc',
            type: 0,
            occurrence: 4,
          })
          .expect(401)
      )

      it('with header', () =>
        request(app.getHttpServer())
          .put(urlWithReminderId)
          .set('Authorization', 'Bearer 123')
          .send({
            ...commonReminderReq,
            description: 'test desc',
            type: 0,
            occurrence: 4,
          })
          .expect(401)
      )
    })

    describe('throws 422', () => {
      it('on missing title', () =>
        request(app.getHttpServer())
          .put(urlWithReminderId)
          .set('Authorization', `Bearer ${token}`)
          .send({
            remindAt: new Date()
          })
          .expect(422)
      )

      it('on missing remindAt', () =>
        request(app.getHttpServer())
          .put(urlWithReminderId)
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: 'test title'
          })
          .expect(422)
      )

      it('on non-existing reminder', () =>
        request(app.getHttpServer())
          .put('/reminders/123')
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: 'test title'
          })
          .expect(422)
      )
    })

    describe('updates reminder', () => {
      it('without description', () =>
        request(app.getHttpServer())
          .put(urlWithReminderId)
          .set('Authorization', `Bearer ${token}`)
          .send({
            ...commonReminderReq,
            title: 'foo'
          })
          .expect(200)
          .then(({ body: reminder }) => {
            expect(reminder).toMatchObject({
              ...commonPutExpectedReminderRes,
              title: 'foo'
            })
          })
      )

      it('with all possible data', () => {
        const newRemindAt = new Date();
        request(app.getHttpServer())
          .put(urlWithReminderId)
          .set('Authorization', `Bearer ${token}`)
          .send({
            ...commonReminderReq,
            description: 'test desc',
            type: 2,
            occurrence: 4,
            remindAt: newRemindAt
          })
          .expect(200)
          .then(({ body: reminder }) => {
            expect(reminder).toMatchObject({
              ...commonPutExpectedReminderRes,
              occurrence: 'monthly',
              remindAt: newRemindAt.toISOString()
            })
          })
      })

      describe('with type:', () => {
        it('payment', () =>
          request(app.getHttpServer())
            .put(urlWithReminderId)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonReminderReq,
              type: 0,
            })
            .expect(200)
            .then(({ body: reminder }) => {
              expect(reminder).toMatchObject({
                ...commonPutExpectedReminderRes,
                type: 'payment'
              })
            })
        )

        it('birthday', () =>
          request(app.getHttpServer())
            .put(urlWithReminderId)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonReminderReq,
              type: 1,
            })
            .expect(200)
            .then(({ body: reminder }) => {
              expect(reminder).toMatchObject({
                ...commonPutExpectedReminderRes,
                type: 'birthday'
              })
            })
        )

        it('event (in req)', () =>
          request(app.getHttpServer())
            .put(urlWithReminderId)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonReminderReq,
              type: 2,
            })
            .expect(200)
            .then(({ body: reminder }) => {
              expect(reminder).toMatchObject(commonPutExpectedReminderRes)
            })
        )

        it('events (not in req) (default)', () =>
          request(app.getHttpServer())
            .put(urlWithReminderId)
            .set('Authorization', `Bearer ${token}`)
            .send(commonReminderReq)
            .expect(200)
            .then(({ body: reminder }) => {
              expect(reminder).toMatchObject(commonPutExpectedReminderRes)
            })
        )
      })

      describe('with occurrence:', () => {
        it('daily', () =>
          request(app.getHttpServer())
            .put(urlWithReminderId)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonReminderReq,
              occurrence: 0,
            })
            .expect(200)
            .then(({ body: reminder }) => {
              expect(reminder).toMatchObject({
                ...commonPutExpectedReminderRes,
                occurrence: 'daily'
              })
            })
        )

        it('every_other_day', () =>
          request(app.getHttpServer())
            .put(urlWithReminderId)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonReminderReq,
              occurrence: 1,
            })
            .expect(200)
            .then(({ body: reminder }) => {
              expect(reminder).toMatchObject({
                ...commonPutExpectedReminderRes,
                occurrence: 'every_other_day'
              })
            })
        )

        it('weekly', () =>
          request(app.getHttpServer())
            .put(urlWithReminderId)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonReminderReq,
              occurrence: 2,
            })
            .expect(200)
            .then(({ body: reminder }) => {
              expect(reminder).toMatchObject({
                ...commonPutExpectedReminderRes,
                occurrence: 'weekly'
              })
            })
        )

        it('bi_weekly', () => request(app.getHttpServer())
          .put(urlWithReminderId)
          .set('Authorization', `Bearer ${token}`)
          .send({
            ...commonReminderReq,
            occurrence: 3,
          })
          .expect(200)
          .then(({ body: reminder }) => {
            expect(reminder).toMatchObject({
              ...commonPutExpectedReminderRes,
              occurrence: 'bi_weekly'
            })
          })
        )

        it('monthly', () =>
          request(app.getHttpServer())
            .put(urlWithReminderId)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonReminderReq,
              occurrence: 4,
            })
            .expect(200)
            .then(({ body: reminder }) => {
              expect(reminder).toMatchObject({
                ...commonPutExpectedReminderRes,
                occurrence: 'monthly'
              })
            })
        )

        it('quarterly', () =>
          request(app.getHttpServer())
            .put(urlWithReminderId)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonReminderReq,
              occurrence: 5,
            })
            .expect(200)
            .then(({ body: reminder }) => {
              expect(reminder).toMatchObject({
                ...commonPutExpectedReminderRes,
                occurrence: 'quarterly'
              })
            })
        )

        it('half_yearly', () =>
          request(app.getHttpServer())
            .put(urlWithReminderId)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonReminderReq,
              occurrence: 6,
            })
            .expect(200)
            .then(({ body: reminder }) => {
              expect(reminder).toMatchObject({
                ...commonPutExpectedReminderRes,
                occurrence: 'half_yearly'
              })
            })
        )

        it('yearly (in req)', () =>
          request(app.getHttpServer())
            .put(urlWithReminderId)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonReminderReq,
              occurrence: 7,
            })
            .expect(200)
            .then(({ body: reminder }) => {
              expect(reminder).toMatchObject({
                ...commonPutExpectedReminderRes,
                occurrence: 'yearly'
              })
            })
        )

        it('yearly (not in req) (default)', () =>
          request(app.getHttpServer())
            .put(urlWithReminderId)
            .set('Authorization', `Bearer ${token}`)
            .send(commonReminderReq)
            .expect(200)
            .then(({ body: reminder }) => {
              expect(reminder).toMatchObject(commonPutExpectedReminderRes)
            })
        )
      })
    })

    describe("doesn't update reminder when", () => {
      describe("type:", () => {
        it("reminder type is not supported", () =>
          request(app.getHttpServer())
            .put(urlWithReminderId)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonReminderReq,
              type: -1,
            })
            .expect(422)
        )


        it(">number< is string", () =>
          request(app.getHttpServer())
            .put(urlWithReminderId)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonReminderReq,
              type: '1',
            })
            .expect(422)
        )

        it("is string", () =>
          request(app.getHttpServer())
            .put(urlWithReminderId)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonReminderReq,
              type: 'birthday',
            })
            .expect(422)
        )

        it("not supported reminder type is string", () =>
          request(app.getHttpServer())
            .put(urlWithReminderId)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonReminderReq,
              type: 'test type',
            })
            .expect(422)
        )
      })

      describe("occurrence:", () => {
        it("reminder occurrence is not supported", () =>
          request(app.getHttpServer())
            .put(urlWithReminderId)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonReminderReq,
              occurrence: -1,
            })
            .expect(422)
        )


        it(">number< is string", () =>
          request(app.getHttpServer())
            .put(urlWithReminderId)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonReminderReq,
              occurrence: '1',
            })
            .expect(422)
        )

        it("is string", () =>
          request(app.getHttpServer())
            .put(urlWithReminderId)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonReminderReq,
              occurrence: 'daily',
            })
            .expect(422)
        )

        it("not supported reminder occurrence is string", () =>
          request(app.getHttpServer())
            .put(urlWithReminderId)
            .set('Authorization', `Bearer ${token}`)
            .send({
              ...commonReminderReq,
              occurrence: 'test type',
            })
            .expect(422)
        )
      })

      it('tokens mismatch', async () => {
        await request(app.getHttpServer())
          .post('/reminders')
          .set('Authorization', `Bearer ${token}`)
          .send({
            ...commonReminderReq,
            description: 'test desc',
            type: 2,
            occurrence: 4,
          })
          .expect(201)
          .then(({ body: reminder }) => {
            expect(reminder).toMatchObject({
              ...commonExpectedReminderRes,
              occurrence: 'monthly'
            })
          })

        await request(app.getHttpServer())
          .put(urlWithReminderId)
          .set('Authorization', `Bearer ${user2token}`)
          .send(commonReminderReq)
          .expect(401)

        await request(app.getHttpServer())
          .put(urlWithReminderId)
          .set('Authorization', `Bearer ${token}`)
          .send({
            ...commonReminderReq,
            occurrence: 4,
          })
          .expect(200)
          .then(({ body: reminder }) => {
            expect(reminder).toMatchObject({
              ...commonPutExpectedReminderRes,
              occurrence: 'monthly'
            })
          })
      })
    })
  })

  describe('/GET', () => {
    describe('single user reminder', () => {
      describe('throws 401 with invalid token', () => {
        it('without header', () =>
          request(app.getHttpServer())
            .get(urlWithReminderId)
            .expect(401)
        )

        it('when one user wants to get other user reminder', () =>
          request(app.getHttpServer())
            .get(urlWithReminderId)
            .set('Authorization', `Bearer ${user2token}`)
            .expect(401)
        )

        it('with header', () =>
          request(app.getHttpServer())
            .get(urlWithReminderId)
            .set('Authorization', 'Bearer 123')
            .send({
              ...commonReminderReq,
              description: 'test desc',
              type: 0,
              occurrence: 4,
            })
            .expect(401)
        )
      })

      it('throws 404 on non-existing reminder', () =>
        request(app.getHttpServer())
          .get(`/reminders/15`)
          .set('Authorization', `Bearer ${token}`)
          .expect(404)
      )

      it('gets reminder', () =>
        request(app.getHttpServer())
          .get(urlWithReminderId)
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
      )
    })

    describe('all user reminders', () => {
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
            .send({
              ...commonReminderReq,
              description: 'test desc',
              type: 0,
              occurrence: 4,
            })
            .expect(401)
        )
      })

      describe('gets', () => {
        it('zero reminders', async () => {
          await deleteAllEntities(app, token, url);
        })

        it('one reminder', async () => {
          await request(app.getHttpServer())
            .post(url)
            .set('Authorization', `Bearer ${token}`)
            .send(commonReminderReq)
            .expect(201)
            .then(({ body: reminder }) => {
              reminderId = reminder._id;
              urlWithReminderId = `/reminders/${reminder._id}`;
            })

          await request(app.getHttpServer())
            .get(url)
            .set('Authorization', `Bearer ${token}`)
            .expect(200)
            .then(({ body }) => {
              expect(body.length).toEqual(1);
            })
        })

        it('few reminders', async () => {
          await request(app.getHttpServer())
            .post(url)
            .set('Authorization', `Bearer ${token}`)
            .send(commonReminderReq)
            .expect(201)
            .then(({ body: reminder }) => {
              expect(reminder).toMatchObject(commonExpectedReminderRes)
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

    describe('upcoming reminders', () => {
      describe('throws 401 with invalid token', () => {
        it('without header', () =>
          request(app.getHttpServer())
            .get('/reminders/upcoming')
            .expect(401)
        )

        it('with header', () =>
          request(app.getHttpServer())
            .get('/reminders/upcoming')
            .set('Authorization', 'Bearer 123')
            .send({
              ...commonReminderReq,
              description: 'test desc',
              type: 0,
              occurrence: 4,
            })
            .expect(401)
        )
      })

      describe('returns upcoming reminders in the next hour: ', () => {
        let reminder;
        const remindAt = addMinutes(new Date(), 10);
        const remindAt2 = addMinutes(new Date(), 50);
        const remindAtHourThreshold = addMinutes(new Date(), 60);
        const remindAtAfterHourThreshold = addMinutes(new Date(), 61);

        describe('0 when', () => {
          it('none reminder is present', async () => {
            await request(app.getHttpServer())
              .post(url)
              .set('Authorization', `Bearer ${token}`)
              .send({
                ...commonReminderReq,
                remindAt: remindAtAfterHourThreshold,
              })
              .expect(201)

            await request(app.getHttpServer())
              .get('/reminders/upcoming')
              .set('Authorization', `Bearer ${token}`)
              .expect(200)
              .then(({ body: upcomingReminders }) => {
                expect(upcomingReminders).toHaveLength(0);
              })
          })

          it('reminder is created literally now', async () => {
            await request(app.getHttpServer())
              .post(url)
              .set('Authorization', `Bearer ${token}`)
              .send({
                ...commonReminderReq,
              })
              .expect(201)

            await request(app.getHttpServer())
              .get('/reminders/upcoming')
              .set('Authorization', `Bearer ${token}`)
              .expect(200)
              .then(({ body: upcomingReminders }) => {
                expect(upcomingReminders).toHaveLength(0);
              })
          })
        })

        describe('1 when', () => {
          it('reminder is added between now and upcoming  hour', async () => {
            await request(app.getHttpServer())
              .post(url)
              .set('Authorization', `Bearer ${token}`)
              .send({
                ...commonReminderReq,
                remindAt,
              })
              .expect(201)

            await request(app.getHttpServer())
              .get('/reminders/upcoming')
              .set('Authorization', `Bearer ${token}`)
              .expect(200)
              .then(({ body: upcomingReminders }) => {
                reminder = upcomingReminders[0]._id;
                expect(upcomingReminders).toHaveLength(1);
                expect(upcomingReminders[0]).toMatchObject({
                  ...commonPutExpectedReminderRes,
                  type: 2
                })
              })

            await request(app.getHttpServer())
              .get(`/reminders/${reminder}`)
              .set('Authorization', `Bearer ${token}`)
              .expect(200)
              .then(({ body: updatedReminder }) => {
                expect(updatedReminder).toMatchObject({
                  ...commonPutExpectedReminderRes,
                  type: 2,
                  remindAt: addYears(remindAt, 1).toISOString() // yearly by default
                })
              })
          })

          it('reminder is added on the edge of upcoming hour', async () => {
            await request(app.getHttpServer())
              .post(url)
              .set('Authorization', `Bearer ${token}`)
              .send({
                ...commonReminderReq,
                remindAt: remindAtHourThreshold,
              })
              .expect(201)

            await request(app.getHttpServer())
              .get('/reminders/upcoming')
              .set('Authorization', `Bearer ${token}`)
              .expect(200)
              .then(({ body: upcomingReminders }) => {
                expect(upcomingReminders).toHaveLength(1);
                expect(upcomingReminders[0]).toMatchObject({
                  ...commonPutExpectedReminderRes,
                  type: 2
                })
              })
          })
        })

        describe('multiple when', () => {
          it('two reminders are added between now and upcoming hour', async () => {
            await request(app.getHttpServer())
              .post(url)
              .set('Authorization', `Bearer ${token}`)
              .send({
                ...commonReminderReq,
                remindAt,
              })
              .expect(201)

            await request(app.getHttpServer())
              .post(url)
              .set('Authorization', `Bearer ${token}`)
              .send({
                ...commonReminderReq,
                remindAt: remindAt2,
                title: "foo"
              })
              .expect(201)

            await request(app.getHttpServer())
              .get('/reminders/upcoming')
              .set('Authorization', `Bearer ${token}`)
              .expect(200)
              .then(({ body: upcomingReminders }) => {
                expect(upcomingReminders).toHaveLength(2);
                expect(upcomingReminders[0]).toMatchObject({
                  ...commonPutExpectedReminderRes,
                  type: 2
                })
                expect(upcomingReminders[1]).toMatchObject({
                  ...commonPutExpectedReminderRes,
                  type: 2,
                  title: "foo"
                })
              })
          })

          it('three reminders are added but only two are returned due to 3rd being added after next hour', async () => {
            await request(app.getHttpServer())
              .post(url)
              .set('Authorization', `Bearer ${token}`)
              .send({
                ...commonReminderReq,
                remindAt,
              })
              .expect(201)

            await request(app.getHttpServer())
              .post(url)
              .set('Authorization', `Bearer ${token}`)
              .send({
                ...commonReminderReq,
                remindAt: remindAt2,
                title: "foo"
              })
              .expect(201)

            await request(app.getHttpServer())
              .post(url)
              .set('Authorization', `Bearer ${token}`)
              .send({
                ...commonReminderReq,
                remindAt: remindAtAfterHourThreshold,
                title: "foo"
              })
              .expect(201)

            await request(app.getHttpServer())
              .get('/reminders/upcoming')
              .set('Authorization', `Bearer ${token}`)
              .expect(200)
              .then(({ body: upcomingReminders }) => {
                expect(upcomingReminders).toHaveLength(2);
                expect(upcomingReminders[0]).toMatchObject({
                  ...commonPutExpectedReminderRes,
                  type: 2
                })
                expect(upcomingReminders[1]).toMatchObject({
                  ...commonPutExpectedReminderRes,
                  type: 2,
                  title: "foo"
                })
              })
          })
        })
      })
    })
  })

  describe('/DELETE', () => {
    describe('single user reminder', () => {
      describe('throws 401 with invalid token', () => {
        it('without header', () =>
          request(app.getHttpServer())
            .delete(urlWithReminderId)
            .expect(401)
        )

        it('with header', () =>
          request(app.getHttpServer())
            .delete(urlWithReminderId)
            .set('Authorization', 'Bearer 123')
            .send({
              ...commonReminderReq,
              description: 'test desc',
              type: 0,
              occurrence: 4,
            })
            .expect(401)
        )
      })

      it('throws 404 on non-existing reminder', async () => {
        await request(app.getHttpServer())
          .delete('/reminders/123')
          .set('Authorization', `Bearer ${token}`)
          .expect(404)
      })

      it("throws 401 if user wants to delete other user reminder", async () => {
        await request(app.getHttpServer())
          .delete(urlWithReminderId)
          .set('Authorization', `Bearer ${user2token}`)
          .expect(401)

        await request(app.getHttpServer())
          .get(urlWithReminderId)
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
      })

      it('deletes reminder', async () => {
        await request(app.getHttpServer())
          .delete(urlWithReminderId)
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
          .then(({ body: { _id } }) => {
            expect(_id).toEqual(reminderId);
          })

        await request(app.getHttpServer())
          .get(urlWithReminderId)
          .set('Authorization', `Bearer ${token}`)
          .expect(404)
      })
    })

    describe('all user reminders', () => {
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
            .send({
              ...commonReminderReq,
              description: 'test desc',
              type: 0,
              occurrence: 4,
            })
            .expect(401)
        )
      })

      it('deletes all reminders', async () => {
        await deleteAllEntities(app, token, url);
      })
    })
  })

  describe.skip('CRON', () => {
    let clock: sinon.SinonFakeTimers;

    describe('Overdue Reminders', () => {
      it('executes at 3am updating reminders based on their occurrence', async () => {
        let reminder;
                                                                                //           T        Z
        const taskCreation = new Date(2020, 1, 10, 10),                         // 2020-02-10 10:00:00
           overdueReminder = new Date(2020, 1, 11, 16).toISOString(),           // 2020-02-11 16:00:00
             scheduledCron = new Date(2020, 1, 13, 3, 59, 59),                  // 2020-02-13 02:59:59
                       now = new Date(2020, 1, 13, 10),                         // 2020-02-13 10:00:00
              expectedDate = new Date(2020, 1, 13, 16).toISOString();           // 2020-02-13 16:00:00

        await deleteAllEntities(app, token, url);

        clock = await sinon.useFakeTimers({ now: +taskCreation })               // 2020-02-10 10:00:00

        // Create reminder
        await request(app.getHttpServer())
          .post(url)
          .set('Authorization', `Bearer ${token}`)
          .send({
            ...commonReminderReq,
            remindAt: overdueReminder,
            occurrence: 0,
          })
          .expect(201)
          .then(({ body: reminder }) => {
            expect(reminder).toMatchObject(
              {
                ...commonExpectedReminderRes,
                remindAt: overdueReminder,
                occurrence: 'daily'
              })
          })

        // Get existing reminders
        await request(app.getHttpServer())
          .get(url)
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
          .then(({ body }) => {
            reminder = body[0];
            expect(body.length).toEqual(1);
          })
                                                                     //           T        Z
        expect(reminder.remindAt).toEqual(overdueReminder);          // 2020-02-11 16:00:00
        clock = await sinon.useFakeTimers({ now: +scheduledCron })   // 2020-02-13 02:59:59
        await clock.tick(1000);                                      // 2020-02-13 03:00:00
        expect(reminder.remindAt).toEqual(expectedDate);             // 2020-02-11 16:00:00 | should be 2020-02-13 16:00:00
      })
    })
  })
})

