import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { UserService } from '../user/user.service';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { RefreshToken } from '../entities/refresh-token.entity';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { INestApplication } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth.guard';

describe('AuthController', () => {
  let app: INestApplication;
  let controller: AuthController;
  let userRepo: Repository<User>;
  let tokenRepo: Repository<RefreshToken>;
  let jwtService: JwtService;

  const USER_TOKEN_REPOSITORY = getRepositoryToken(User);
  const RT_TOKEN_REPOSITORY = getRepositoryToken(RefreshToken);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test.local',
        }),
        JwtModule.register({}),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        UserService,
        {
          provide: APP_GUARD,
          useClass: AuthGuard,
        },
        {
          provide: USER_TOKEN_REPOSITORY,
          useValue: {
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: RT_TOKEN_REPOSITORY,
          useValue: {
            save: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    userRepo = module.get<Repository<User>>(USER_TOKEN_REPOSITORY);
    tokenRepo = module.get<Repository<RefreshToken>>(RT_TOKEN_REPOSITORY);
    controller = module.get<AuthController>(AuthController);
    jwtService = module.get<JwtService>(JwtService);

    app = module.createNestApplication();
    await app.init();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(userRepo).toBeDefined();
    expect(tokenRepo).toBeDefined();
    expect(jwtService).toBeDefined();
  });

  it('User can succesfully register', async () => {
    const createUserDto: CreateUserDto = {
      email: 'email@mail.com',
      password: '123456',
    };

    jest
      .spyOn(userRepo, 'save')
      .mockImplementation((entity: CreateUserDto) =>
        Promise.resolve({ id: 0, ...entity }),
      );

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(createUserDto);

    expect(response.status).toBe(201);
    expect(typeof response.body?.refresh_token === 'string').toBeTruthy();
    expect(typeof response.body?.access_token === 'string').toBeTruthy();
  });

  it('User gets 409 because that email already exist', async () => {
    const createUserDto: CreateUserDto = {
      email: 'email@mail.com',
      password: '123456',
    };

    jest
      .spyOn(userRepo, 'findOne')
      .mockImplementation(() => Promise.resolve({ id: 0, ...createUserDto }));

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(createUserDto);

    expect(response.status).toBe(409);
  });

  it('User can succesfully login', async () => {
    const createUserDto: CreateUserDto = {
      email: 'email@mail.com',
      password: '123456',
    };

    jest
      .spyOn(userRepo, 'findOne')
      .mockImplementation(() => Promise.resolve({ id: 0, ...createUserDto }));

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send(createUserDto);

    expect(response.status).toBe(200);
    expect(typeof response.body?.refresh_token === 'string').toBeTruthy();
    expect(typeof response.body?.access_token === 'string').toBeTruthy();
  });

  it('User gets 401 on invalid credentials', async () => {
    const createUserDto: CreateUserDto = {
      email: 'Invalid',
      password: 'Invalid',
    };

    jest
      .spyOn(userRepo, 'findOne')
      .mockImplementation(() => Promise.resolve(undefined));

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send(createUserDto);

    expect(response.status).toBe(401);
  });

  it('authorized user has access to private endpoints', async () => {
    const token = jwtService.sign(
      { id: 0 },
      { secret: process.env.AT_SECRET, expiresIn: '1m' },
    );

    const response = await request(app.getHttpServer())
      .get('/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).not.toBe(401);
  });

  it('user receives 401 on expired token', async () => {
    const token = jwtService.sign(
      { id: 0 },
      { secret: process.env.AT_SECRET, expiresIn: '0ms' },
    );

    const response = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
  });

  it('User get 404 on invalid refresh token', async () => {
    jest
      .spyOn(tokenRepo, 'findOne')
      .mockImplementation(() => Promise.resolve(undefined));

    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refresh_token: 'invalid_token' });

    expect(response.status).toBe(404);
  });

  it('User can use refresh token only once', async () => {
    const token = jwtService.sign(
      { id: 0 },
      { secret: process.env.RT_SECRET, expiresIn: '1d' },
    );

    jest
      .spyOn(tokenRepo, 'findOne')
      .mockImplementationOnce(() =>
        Promise.resolve({ id: 0, token, userId: 0 }),
      );

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refresh_token: token });

    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refersh_token: token });

    expect(response.status).toBe(404);
  });

  it('Refresh tokens become invalid on logout', async () => {
    const userId = 0;
    const ac = jwtService.sign(
      { id: userId },
      { secret: process.env.RT_SECRET, expiresIn: '1m' },
    );
    const rt = jwtService.sign(
      { id: userId },
      { secret: process.env.RT_SECRET, expiresIn: '15m' },
    );

    jest
      .spyOn(tokenRepo, 'findOne')
      .mockImplementationOnce(() =>
        Promise.resolve({ id: 0, token: rt, userId }),
      );

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${ac}`);

    const response = await request(app.getHttpServer())
      .get('/auth/refresh')
      .send({ refresh_token: rt });

    expect(response.status).toBe(404);
  });

  it('Multiple refresh tokens are valid', async () => {
    const user: User = {
      id: 0,
      email: 'user@mail.ru',
      password: '123456',
    };

    const loginDto = {
      email: user.email,
      password: user.password,
    };

    jest
      .spyOn(userRepo, 'findOne')
      .mockImplementation(() => Promise.resolve(user));

    jest
      .spyOn(tokenRepo, 'findOne')
      .mockImplementationOnce(({ where }) =>
        Promise.resolve({
          id: 0,
          userId: user.id,
          token: where['token'],
        }),
      )
      .mockImplementationOnce(({ where }) =>
        Promise.resolve({
          id: 1,
          userId: user.id,
          token: where['token'],
        }),
      );

    const firstLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send(loginDto);

    const secondLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send(loginDto);

    expect(firstLoginResponse.status).toBe(200);
    expect(secondLoginResponse.status).toBe(200);

    const firstRefreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refresh_token: firstLoginResponse.body.refresh_token });

    expect(firstRefreshResponse.status).toBe(200);
    expect(
      typeof firstRefreshResponse.body?.refresh_token === 'string',
    ).toBeTruthy();
    expect(
      typeof firstRefreshResponse.body?.access_token === 'string',
    ).toBeTruthy();

    const secondRefreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refresh_token: secondLoginResponse.body.refresh_token });

    expect(secondRefreshResponse.status).toBe(200);
    expect(
      typeof secondLoginResponse.body?.refresh_token === 'string',
    ).toBeTruthy();
    expect(
      typeof secondLoginResponse.body?.access_token === 'string',
    ).toBeTruthy();
  });
});
