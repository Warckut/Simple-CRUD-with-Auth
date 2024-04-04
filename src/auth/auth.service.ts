import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    @InjectRepository(RefreshToken)
    private readonly tokenService: Repository<RefreshToken>,
  ) {}

  async signUp(createUserDto: CreateUserDto) {
    let user = await this.userService.findOneBy('email', createUserDto.email);

    if (user) {
      throw new ConflictException('User with this email already exists');
    }

    user = await this.userService.createOne(createUserDto);
    const tokens = await this.getTokens(user.id);
    await this.tokenService.save({
      userId: user.id,
      token: tokens.refresh_token,
    });

    return tokens;
  }

  async signIn(createUserDto: CreateUserDto) {
    const user = await this.userService.findOneBy('email', createUserDto.email);
    if (user?.password !== createUserDto.password) {
      throw new UnauthorizedException();
    }
  }

  async getTokens(id: number) {
    const payload = { id };
    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.AT_SECRET,
        expiresIn: '5m',
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.RT_SECRET,
        expiresIn: '7d',
      }),
    ]);
    return { access_token: at, refresh_token: rt };
  }
}
