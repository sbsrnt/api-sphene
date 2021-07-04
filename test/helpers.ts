import * as request from 'supertest';

const testUser = {
  email: 'test@test.test',
  firstName: 'test',
  password: 'pwd'
}

export const registerTestUser = (app, user = testUser) => {
  return request(app.getHttpServer())
    .post('/auth/register')
    .send(user)
    .set('Accept', 'application/json')
}

export const deleteAllEntities = async (app, token, url) => {
  await request(app.getHttpServer())
    .delete(url)
    .set('Authorization', `Bearer ${token}`)
    .expect(200)

  await request(app.getHttpServer())
    .get(url)
    .set('Authorization', `Bearer ${token}`)
    .expect(200)
    .then(({ body }) => {
      expect(body.length).toEqual(0);
    })
}

export const loginTestUser = async (app, auth: {token?: string} = {}, user = testUser) => {
  const userCreated = await registerTestUser(app, user);

  if(!!userCreated) {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: user.email,
        password: user.password
      })
      .expect(201)
      .expect('Content-Type', /json/)
      .then(function(res) {
        auth.token = res.body.access_token;
      })
  }
}
