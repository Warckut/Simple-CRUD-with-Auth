import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { RefreshToken } from '../entities/refresh-token.entity';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { INestApplication } from '@nestjs/common';
import { Repository } from 'typeorm';

describe('AuthController', () => {
  let app: INestApplication;
  // let controller: AuthController;
  let userRepo: Repository<User>;
  // let tokenRepo: Repository<RefreshToken>;
  let jwtService: JwtService;

  const USER_TOKEN_REPOSITORY = getRepositoryToken(User);
  const RT_TOKEN_REPOSITORY = getRepositoryToken(RefreshToken);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      // imports: [JwtModule.register({})],
      controllers: [AuthController],
      providers: [
        AuthService,
        UserService,
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
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    userRepo = module.get<Repository<User>>(USER_TOKEN_REPOSITORY);
    // tokenRepo = module.get<Repository<RefreshToken>>(RT_TOKEN_REPOSITORY);
    // controller = module.get<AuthController>(AuthController);
    jwtService = module.get<JwtService>(JwtService);

    app = module.createNestApplication();
    await app.init();
  });

  // it('should be defined', () => {
  //   expect(controller).toBeDefined();
  // });

  // it('User Repo should be defined', () => {
  //   expect(userRepo).toBeDefined();
  // });

  it('User can succesfully register', async () => {
    const createUserDto: CreateUserDto = {
      email: 'email@mail.com',
      password: '123456',
    };

    /* const mockSaveUser = */ jest
      .spyOn(userRepo, 'save')
      .mockImplementation((entity: CreateUserDto) =>
        Promise.resolve({ id: 0, ...entity }),
      );

    /* const mockSignToken = */ jest
      .spyOn(jwtService, 'signAsync')
      .mockImplementation(() => Promise.resolve('fakeToken1'));

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(createUserDto);

    expect(response.status).toBe(201);
    expect(typeof response.body?.refresh_token === 'string').toBeTruthy();
    expect(typeof response.body?.access_token === 'string').toBeTruthy();

    // expect(mockSaveUser).toHaveBeenCalledWith(createUserDto);
    // expect(mockSignToken).toHaveBeenCalledWith({ id: 0 }, expect.anything());
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

  it('User can succesfully login', async () => {});
  it('User gets 403 on invalid credentials', () => {});
  it('User receives 401 on expired token', () => {});
  it('User get 404 on invalid refresh token', () => {});
  it('User can use refresh token only once', () => {});
  it('Refresh tokens become invalid on logout', () => {});
  it('Multiple refresh tokens are valid', () => {});
});
