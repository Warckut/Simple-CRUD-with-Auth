import { Controller, Get, HttpCode, Request } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @HttpCode(200)
  @Get('me')
  async me(@Request() req) {
    return this.userService.getProfile(req.user.id);
  }
}
