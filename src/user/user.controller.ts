import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Put,
  Request,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @HttpCode(200)
  @Get('me')
  async getProfile(@Request() req) {
    return this.userService.getProfile(req.user.id);
  }

  @HttpCode(204)
  @Put('me')
  async updateProfile(@Request() req, @Body() updateUseDto: UpdateUserDto) {
    return this.userService.updateOne(req.user.id, updateUseDto);
  }

  @HttpCode(204)
  @Delete('me')
  async deleteProfile(@Request() req) {
    return this.userService.deleteProfile(req.user.id);
  }
}
