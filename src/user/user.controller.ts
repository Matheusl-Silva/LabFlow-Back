import {
  Body,
  Controller,
  Get,
  Put,
  Delete,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { User } from '../entities/user.entity';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}
  @Get()
  async get(): Promise<User[]> {
    try {
      return await this.userService.get();
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number): Promise<User | null> {
    try {
      return await this.userService.getById(id);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

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
