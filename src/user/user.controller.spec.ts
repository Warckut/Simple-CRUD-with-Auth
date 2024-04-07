import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from '../entities/user.entity';

describe('UserController', () => {
  let controller: UserController;
  let userRepo: Repository<User>;

  const USER_TOKEN_REPOSITORY = getRepositoryToken(User);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        UserService,
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
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(userRepo).toBeDefined();
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

    jest
      .spyOn(userRepo, 'findOne')
      .mockImplementation(() => Promise.resolve(user));

    const result = await controller.me({ user: { id: 0 } });
    expect(result).toEqual(user);
  });
});
