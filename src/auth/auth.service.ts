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

import { HttpException, HttpStatus } from '@nestjs/common';

export class NotFoundException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.NOT_FOUND);
  }
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly tokenRepository: Repository<RefreshToken>,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async logout(userId: number) {
    await this.tokenRepository.delete({ userId });
  }

  async refresh(refreshToken: string) {
    const rt = await this.tokenRepository.findOne({
      where: { token: refreshToken },
    });

    if (!rt) {
      throw new NotFoundException('');
    }

    const tokens = await this.getTokens(rt.userId);
    await this.tokenRepository.save({ ...rt, token: tokens.refresh_token });
    return tokens;
  }

  async signUp(createUserDto: CreateUserDto) {
    let user = await this.userService.findOneBy('email', createUserDto.email);

    if (user) {
      throw new ConflictException('User with this email already exists');
    }

    user = await this.userService.createOne(createUserDto);
    const tokens = await this.getTokens(user.id);
    await this.tokenRepository.save({
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

    const tokens = await this.getTokens(user.id);
    await this.tokenRepository.save({
      userId: user.id,
      token: tokens.refresh_token,
    });

    return tokens;
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
