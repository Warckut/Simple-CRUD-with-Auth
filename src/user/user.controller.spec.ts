import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { UserController } from './user.controller';
import { AuthGuard } from '../auth/auth.guard';
import { UserService } from './user.service';
import { User } from '../entities/user.entity';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

describe('UserController', () => {
  let app: INestApplication;
  let controller: UserController;
  let userRepo: Repository<User>;
  let jwtService: JwtService;

  const USER_TOKEN_REPOSITORY = getRepositoryToken(User);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({}),
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test.local',
        }),
      ],
      controllers: [UserController],
      providers: [
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
      ],
    }).compile();

    userRepo = module.get<Repository<User>>(USER_TOKEN_REPOSITORY);
    controller = module.get<UserController>(UserController);
    jwtService = module.get<JwtService>(JwtService);

    app = module.createNestApplication();
    await app.init();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(userRepo).toBeDefined();
    expect(jwtService).toBeDefined();
  });

  it('authorized user can get data about himself', async () => {
    const user: User = {
      id: 0,
      email: 'user@mail.ru',
      password: '123456',
      name: 'name',
      address: 'address',
      phonenumber: '+7 999 999-99-99',
      summary: 'summary',
    };

    const token = jwtService.sign(
      { id: user.id },
      { secret: process.env.AT_SECRET, expiresIn: '1m' },
    );

    jest
      .spyOn(userRepo, 'findOne')
      .mockImplementation(() => Promise.resolve(user));

    const response = await request(app.getHttpServer())
      .get('/user/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(user);
  });
});
