import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  async getProfile(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    // if (!user) throw new UnauthorizedException(); // такого пользователя нет
    return user;
  }

  async findOneBy<T extends keyof User>(
    name: T,
    value: User[T],
  ): Promise<User> {
    return this.userRepository.findOne({
      where: { [name]: value },
      select: [
        'id',
        'email',
        'password',
        'name',
        'address',
        'phonenumber',
        'summary',
      ],
    });
  }

  async createOne(createUserDto: CreateUserDto): Promise<User> {
    return this.userRepository.save(createUserDto);
  }

  async updateOne(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    return this.userRepository
      .createQueryBuilder()
      .update()
      .where('id = :id', { id })
      .set({ ...updateUserDto })
      .returning('*')
      .execute()
      .then(({ raw }) => raw[0]);
  }

  async deleteProfile(id: number): Promise<void> {
    await this.userRepository
      .createQueryBuilder()
      .update()
      .set({ name: null, address: null, phonenumber: null, summary: null })
      .where('id = :id', { id })
      .execute();
  }
}
