import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  ParseIntPipe,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { QueryFailedError } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserService, type UserView } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserSwagger } from './user.swagger';
import { Authenticated } from '../common/decorators/authenticated.decorator';
import { UserFromJwt } from '../common/decorators/user-jwt.decorator';
import type { JwtPayload } from '../common/types/jwt.payload.type';

@ApiTags('Usuários')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UserSwagger.findUsers()
  @Authenticated()
  @Get()
  async get(@UserFromJwt() user: JwtPayload): Promise<UserView[] | User[]> {
    try {
      // Só o admin vê a lista completa (e-mail, papéis, situação da conta).
      // Para os demais é uma lista de nomes, usada para escolher preceptor e
      // responsável no exame.
      if (user.isAdmin) return await this.userService.get();
      return await this.userService.getPrivate();
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  @UserSwagger.findUserById()
  @Authenticated()
  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number, @UserFromJwt() user: JwtPayload): Promise<UserView> {
    // Ver o próprio perfil é sempre permitido; o de outra pessoa, só admin.
    if(!user.isAdmin && user.id !== id) throw new ForbiddenException();
    return await this.userService.getById(id);
  }

  @UserSwagger.createUser()
  @Post()
  async create(@Body() dto: CreateUserDto, @UserFromJwt() actor: JwtPayload): Promise<UserView> {
    try {
      return await this.userService.create(dto, actor.id);
    } catch (err) {
      console.error(err);
      if (err instanceof QueryFailedError && err.driverError.code == '23505') {
        throw new ConflictException('User already registered');
      }
      throw err;
    }
  }

  @UserSwagger.updateUser()
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @UserFromJwt() actor: JwtPayload,
  ): Promise<{ message: string }> {
    try {
      await this.userService.update(id, dto, actor.id);
      return { message: 'User has been updated successfully' };
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  @UserSwagger.deleteUser()
  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number, @UserFromJwt() actor: JwtPayload): Promise<{ message: string }> {
    try {
      await this.userService.delete(id, actor.id);
      return { message: 'User has been deleted successfully' };
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
}
