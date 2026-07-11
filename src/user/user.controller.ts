import {
  Body,
  Controller,
  Get,
  Put,
  Delete,
  Param,
  ParseIntPipe,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User } from '../entities/user.entity';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserSwagger } from './user.swagger';
import { AllowCommonUser } from '../common/decorators/allow-common-user.decorator';
import { UserFromJwt } from '../common/decorators/user-jwt.decorator';
import type { JwtPayload } from '../common/types/jwt.payload.type';

@ApiTags('Usuários')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UserSwagger.findUsers()
  @Get()
  async get(): Promise<User[]> {
    try {
      return await this.userService.get();
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  @UserSwagger.findUserById()
  @AllowCommonUser()
  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number, @UserFromJwt() user: JwtPayload): Promise<User | null> {
    if(user.id !== id) throw new ForbiddenException();
    return await this.userService.getById(id);
  }

  @UserSwagger.updateUser()
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ): Promise<{ message: string }> {
    try {
      await this.userService.update(id, dto);
      return { message: 'User has been updated successfully' };
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  @UserSwagger.deleteUser()
  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    try {
      await this.userService.delete(id);
      return { message: 'User has been deleted successfully' };
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
}
