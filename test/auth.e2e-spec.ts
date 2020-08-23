import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import * as request from 'supertest';
import * as jwtDecode from 'jwt-decode';

import DbModule, { mongod } from './db-test.module';
import { loginTestUser, registerTestUser } from './helpers';
import { AppModule } from '../src/app.module';
import { User } from '../src/user/user.entity';
import { UserService } from '../src/user/user.service';
import { AuthService } from '../src/auth/auth.service';
import { JwtStrategy } from '../src/auth/jwt.strategy';
import { LocalStrategy } from '../src/auth/local.strategy';
import { MailersService } from '../src/mailers/mailers.service';
import { EmailVerification, ForgottenPassword } from '../src/mailers/mailers.entity';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let userService = UserService;
  let authService = AuthService;
  let mailersService = MailersService;

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
    mailersService = moduleFixture.get<MailersService>(MailersService);
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });


  describe('has required services defined:', () => {
    it('AuthService should be defined', () => {
      expect(authService).toBeDefined();
    });

    it('UserService should be defined', () => {
      expect(userService).toBeDefined();
    });

    it('MailersService should be defined', () => {
      expect(mailersService).toBeDefined();
    });
  })

  describe('/POST', () => {
    let resetPasswordToken = '';

    describe('auth/register', () => {
      it(`registers user with all keys`, () => {
        return registerTestUser(app)
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(201)
      });

      it(`registers user without firstName`, () => {
        const testUser = {
          // TODO: add afterEach to remove user so we can reuse one email
          email: 'test2@test.test',
          firstName: null,
          password: 'pwd'
        }

        return registerTestUser(app, testUser)
          .expect('Content-Type', /json/)
          .expect(201)
      });

      it(`throws 422 when user doesn't provide email`, () => {
        const testUser = {
          email: null,
          firstName: 'test',
          password: 'pwd'
        }
        const errorMsg = 'Please provide e-mail.';

        return registerTestUser(app, testUser)
          .expect('Content-Type', /json/)
          .expect(422)
          .then(({ body: { message } }) => expect(message).toBe(errorMsg))
      });

      it(`throws 422 when user doesn't provide password`, () => {
        const testUser = {
          email: 'test@test.test',
          password: null,
          firstName: 'test',
        }
        const errorMsg = 'Please provide password.';

        return registerTestUser(app, testUser)
          .expect('Content-Type', /json/)
          .expect(422)
          .then(({ body: { message } }) => expect(message).toBe(errorMsg))
      });

      it(`throws 422 when user email already is taken`, () => {
        const errorMsg = 'E-mail already in use.';

        return registerTestUser(app)
          .expect('Content-Type', /json/)
          .expect(422)
          .then(({ body: { message } }) => expect(message).toBe(errorMsg))
      });

      it(`throws 422 when user email is invalid`, () => {
        const testUser = {
          email: 'test @test.test',
          password: null,
          firstName: 'test',
        }
        const errorMsg = 'E-mail has invalid format.';

        return registerTestUser(app, testUser)
          .expect('Content-Type', /json/)
          .expect(422)
          .then(({ body: { message } }) => expect(message).toBe(errorMsg))
      })

      it('registers user but is not verified by default', async () => {
        const userRegistered = await registerTestUser(app);

        if (userRegistered) {
          await request(app.getHttpServer())
            .post('/auth/login')
            .send({
              email: 'test@test.test',
              password: 'pwd'
            })
            .set('Accept', 'application/json')
            .expect(201)
            .expect(response => {
              const { access_token } = response.body;
              expect(jwtDecode(access_token).verified).toBeFalsy();
            })
        }
      })
    })

    describe('auth/login', () => {
      let auth = {
        token: null
      };

      it('logs user in (default)', async () => {
        const userRegistered = await registerTestUser(app);
        if (userRegistered) {
          return request(app.getHttpServer())
            .post('/auth/login')
            .send({
              email: 'test@test.test',
              password: 'pwd'
            })
            .set('Accept', 'application/json')
            .expect(201)
            .expect(response => {
              const { access_token } = response.body;
              expect(jwtDecode(access_token).email).toBe('test@test.test');
            })
        }

        await loginTestUser(app, auth);
        expect(jwtDecode(auth.token).email).toBe('test@test.test');
      })

      it('logs user in (via test helper)', async () => {
        await loginTestUser(app, auth);
        expect(jwtDecode(auth.token).email).toBe('test@test.test');
      })

      it('throws 401 upon wrong email', async () => {
        const testUser = {
          email: 'foo@test.test',
          password: 'p',
          firstName: 'test',
        }

        const userRegistered = await registerTestUser(app);
        const secondUserRegistered = await registerTestUser(app, testUser);

        if (userRegistered && secondUserRegistered) {
          return request(app.getHttpServer())
            .post('/auth/login')
            .send({
              email: 'foo@test.test',
              password: 'pwd'
            })
            .set('Accept', 'application/json')
            .expect(401)
        }
      })

      it('throws 401 upon wrong password', async () => {
        const userRegistered = await registerTestUser(app);

        if (userRegistered) {
          return request(app.getHttpServer())
            .post('/auth/login')
            .send({
              email: 'test@test.test',
              password: 'p'
            })
            .set('Accept', 'application/json')
            .expect(401)
        }
      })

      it('throws 422 with no email present', async () => {
        const userRegistered = await registerTestUser(app);

        if (userRegistered) {
          return request(app.getHttpServer())
            .post('/auth/login')
            .send({
              email: null,
              password: 'pwd'
            })
            .set('Accept', 'application/json')
            .expect(401) // CBA implementing custom filter for 422 passport
        }
      })

      it('throws 422 with no password present', async () => {
        const userRegistered = await registerTestUser(app);

        if (userRegistered) {
          return request(app.getHttpServer())
            .post('/auth/login')
            .send({
              email: 'test@test.test',
              password: null
            })
            .set('Accept', 'application/json')
            .expect(401) // CBA implementing custom filter for 422 passport
        }
      })

      it('throws 422 with no email & password present', async () => {
        const userRegistered = await registerTestUser(app);

        if (userRegistered) {
          return request(app.getHttpServer())
            .post('/auth/login')
            .send({
              email: null,
              password: null
            })
            .set('Accept', 'application/json')
            .expect(401) // CBA implementing custom filter for 422 passport
        }
      })
    })

    describe('auth/forgot-password', () => {
      it("creates forgot password token", async () => {
        const userRegistered = await registerTestUser(app);

        if (userRegistered) {
          process.env.BUILD_ENV = 'dev';
          return request(app.getHttpServer())
            .post('/auth/forgot-password')
            .send({ email: 'test@test.test' })
            .set('Accept', 'application/json')
            .expect(201)
            .then(res => {
              resetPasswordToken = res.body.token;
            })
        }
      })

      it("doesn't send token in response on other BUILD_ENV than dev", async () => {
        const userRegistered = await registerTestUser(app);

        if (userRegistered) {
          process.env.BUILD_ENV = 'prod';
          return request(app.getHttpServer())
            .post('/auth/forgot-password')
            .send({ email: 'test@test.test' })
            .set('Accept', 'application/json')
            .expect(422)
            .then(res => {
              expect(res.body.token).toBeUndefined();
            })
        }
      })

      it("throws 422 when token has been generated recently", async () => {
        const userRegistered = await registerTestUser(app);
        const errorMsg = 'E-mail has been sent recently.';

        if (userRegistered) {
          await request(app.getHttpServer())
            .post('/auth/forgot-password')
            .send({ email: 'test@test.test' })
            .set('Accept', 'application/json')

          return request(app.getHttpServer())
            .post('/auth/forgot-password')
            .send({ email: 'test@test.test' })
            .set('Accept', 'application/json')
            .expect(422)
            .then(({ body: { message } }) => expect(message).toBe(errorMsg))
        }
      })

      it("won't create forgot password token when e-mail is not registered", () => {
        const errorMsg = 'User with given email doesn\'t exist.';

        return request(app.getHttpServer())
          .post('/auth/forgot-password')
          .set('Accept', 'application/json')
          .expect(404)
          .then(({ body: { message } }) => expect(message).toBe(errorMsg))
      })

      it('throws 403 on non-existing token', async () => {
        const userRegistered = await registerTestUser(app);
        if (userRegistered) {
          await request(app.getHttpServer())
            .post(`/auth/reset-password/123`)
            .send({ newPassword: 'newpassword', confirmNewPassword: 'newpassword' })
            .set('Accept', 'application/json')
            .expect(403)
        }
      })

      it('resets password with good token', async () => {
        const userRegistered = await registerTestUser(app);
        if (userRegistered) {
          await request(app.getHttpServer())
            .post(`/auth/reset-password/${resetPasswordToken}`)
            .send({ newPassword: 'newpassword', confirmNewPassword: 'newpassword' })
            .set('Accept', 'application/json')
            .expect(201)
        }
      })
    })
  })

  describe('/GET', () => {
    describe('verify/:token', () => {
      let emailVerificationToken = '';

      it('throws 403 on non-existing token', async () => {
        const userRegistered = await registerTestUser(app);
        if (userRegistered) {
          await request(app.getHttpServer())
            .get(`/auth/verify-email/123`)
            .set('Accept', 'application/json')
            .expect(404)
        }
      })

      it('creates email verification token', async () => {
        process.env.BUILD_ENV = 'dev';
        await registerTestUser(app).then(res => {
          emailVerificationToken = res.body.token
        });
      })

      it("doesn't send token in response on other BUILD_ENV than dev", async () => {
        process.env.BUILD_ENV = 'prod';
        await registerTestUser(app).then(res => expect(res.body.token).toBeUndefined());
      })

      it(`throws 403 on invalid token during email verification`, async () => {
        await request(app.getHttpServer())
          .get('/auth/verify/123')
          .expect(403)
      });
    })

    describe('verify', () => {
      let emailVerificationToken = '';

      it('verifies user', async () => {
        process.env.BUILD_ENV = 'dev';
        const testUser = {
          email: 'test3@test.test',
          password: 'pwd',
          firstName: 'test',
        }

        const userRegistered = await registerTestUser(app, testUser).then(res => {
          emailVerificationToken = res.body.token
          return true;
        });

        if (userRegistered) {
          await request(app.getHttpServer())
            .get(`/auth/verify/${emailVerificationToken}`)
            .set('Accept', 'application/json')
            .expect(200)

          await request(app.getHttpServer())
            .post('/auth/login')
            .send({
              email: 'test2@test.test',
              password: 'pwd'
            })
            .set('Accept', 'application/json')
            .expect(201)
            .expect(response => {
              const { access_token } = response.body;
              expect(jwtDecode(access_token).verified).toBeTruthy();
            })
        }
      })
    })
  })
});
