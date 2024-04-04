import { IsString } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  name?: string;

  @IsString()
  phonenumber?: string;

  @IsString()
  address?: string;

  @IsString()
  summary?: string;
}
