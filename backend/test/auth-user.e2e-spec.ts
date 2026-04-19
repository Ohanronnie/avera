import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Auth & User Endpoints (e2e)', () => {
  let app: INestApplication;
  let jwtToken: string;
  let userId: number;
  let refreshToken: string;
  const testEmail = `test${Date.now()}@example.com`;
  const testPassword = 'Test1234!';
  const testUsername = `user${Date.now()}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/auth/register (POST) - should register a user', async () => {
    const res = await request(app.getHttpServer()).post('/auth/register').send({
      email: testEmail,
      password: testPassword,
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('email', testEmail);
    userId = res.body.id;
  });

  it('/auth/login (POST) - should login and return tokens', async () => {
    // Simulate account verification for login
    await app
      .get('PrismaService')
      .user.update({ where: { id: userId }, data: { accountVerified: true } });
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testEmail, password: testPassword });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('access_token');
    expect(res.body).toHaveProperty('refresh_token');
    jwtToken = res.body.access_token;
    refreshToken = res.body.refresh_token;
  });

  it('/auth/check-username (POST) - should check username availability', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/check-username')
      .send({ username: testUsername });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('available', true);
  });

  it('/auth/refresh-token (POST) - should refresh tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/refresh-token')
      .send({ refreshToken });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('access_token');
    expect(res.body).toHaveProperty('refresh_token');
  });

  it('/auth/resend-otp/:userId (POST) - should resend OTP', async () => {
    const res = await request(app.getHttpServer()).post(
      `/auth/resend-otp/${userId}`,
    );
    expect([200, 201]).toContain(res.status);
  });

  it('/auth/update-info (PUT) - should update user info', async () => {
    const res = await request(app.getHttpServer())
      .put('/auth/update-info')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        firstName: 'Test',
        lastName: 'User',
        phoneNumber: '+12345678901',
        username: testUsername,
        bio: 'Test bio',
      });
    expect([200, 201]).toContain(res.status);
  });

  it('/auth/password-reset/send-otp (POST) - should send password reset OTP', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/password-reset/send-otp')
      .send({ email: testEmail });
    expect([200, 201]).toContain(res.status);
  });

  // Add more tests for OTP validation, password reset, etc. as needed
});
