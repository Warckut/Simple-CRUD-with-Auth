import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { RefreshToken } from '../entities/refresh-token.entity';
// import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken]),
    // JwtModule.registerAsync({
    //   // inject: [ConfigService],
    //   useFactory: (configService: ConfigService) => {
    //     // console.log(configService.get<string>('JWT_SECRET'));
    //     console.log(process.env.JWT_SECRET);
    //     return {
    //       global: true,
    //       secret: configService.get<string>('JWT_SECRET'),
    //       signOptions: { expiresIn: '3000s' },
    //     };
    //   },
    // }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '3000s' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, UserService],
})
export class AuthModule {}
