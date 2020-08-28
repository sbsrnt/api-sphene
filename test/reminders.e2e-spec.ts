import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";

import * as request from 'supertest';

import DbModule, { mongod } from "./db-test.module";
import { deleteAllReminders, registerTestUser } from "./helpers";

import { EmailVerification, ForgottenPassword } from "../src/mailers/mailers.entity";
import { UserService } from "../src/user/user.service";
import { AuthService } from "../src/auth/auth.service";
import { MailersService } from "../src/mailers/mailers.service";
import { User } from "../src/user/user.entity";
import { AppModule } from "../src/app.module";
import { LocalStrategy } from "../src/auth/local.strategy";
import { JwtStrategy } from "../src/auth/jwt.strategy";
import { RemindersService } from "../src/reminders/reminders.service";

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
    remindAt: new Date()
  }

  const commonExpectedReminderRes = {
    title: 'test title',
    type: 2, // event
    occurrence: 7, // yearly
    remindAt: expect.any(String),
    updatedAt: expect.any(String),
    createdAt: expect.any(String),
    _id: expect.any(String),
  }

  const commonPutExpectedReminderRes = {
    title: 'test title',
    type: 2, // event
    occurrence: 7, // yearly
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
    await deleteAllReminders(app, token, url);
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
              occurrence: 4
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
                occurrence: 0
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
                occurrence: 1
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
                occurrence: 2
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
              occurrence: 3
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
                occurrence: 4
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
                occurrence: 5
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
                occurrence: 6
              })
            })
        )

        it('yearly (in req)', () =>
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
                occurrence: 0
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
              occurrence: 4,
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
                type: 0
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
                type: 1
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
                occurrence: 0
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
                occurrence: 1
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
                occurrence: 2
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
              occurrence: 3
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
                occurrence: 4
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
                occurrence: 5
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
                occurrence: 6
              })
            })
        )

        it('yearly (in req)', () =>
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
                occurrence: 0
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
              occurrence: 4
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
              occurrence: 4
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
          await deleteAllReminders(app, token, url);
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
          .then(({ body: { deletedReminderId } }) => {
            expect(deletedReminderId).toEqual(reminderId);
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
        await deleteAllReminders(app, token, url);
      })
    })
  })
})

