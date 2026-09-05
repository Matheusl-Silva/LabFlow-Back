import { Controller, Get, Post, Body, Put, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { AnamnesisService } from './anamnesis.service';
import { CreateAnamnesisDto } from './dto/create-anamnesis.dto';
import { UpdateAnamnesisDto } from './dto/update-anamnesis.dto';
import { Anamnesis } from '../entities/anamnesis.entity';
import { UserFromJwt } from '../common/decorators/user-jwt.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import type { JwtPayload } from '../common/types/jwt.payload.type';
import { ApiTags } from '@nestjs/swagger';
import { AnamnesisSwagger } from './anamnesis.swagger';

// Anamnese tem papel próprio: quem lança exames não necessariamente cuida
// das anamneses, e vice-versa.
@ApiTags('Anamnese')
@Roles(Role.ANAMNESIS)
@Controller('anamnesis')
export class AnamnesisController {
  constructor(private readonly anamnesisService: AnamnesisService) {}

  @AnamnesisSwagger.createAnamnesis()
  @Post()
  create(@Body() dto: CreateAnamnesisDto, @UserFromJwt() user: JwtPayload): Promise<Anamnesis> {
    return this.anamnesisService.create(dto, user.id);
  }

  @AnamnesisSwagger.findAnamnesisById()
  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number): Promise<Anamnesis|null> {
    return this.anamnesisService.getById(id);
  }

  @AnamnesisSwagger.findAnamnesesByPatient()
  @Get('/patient/:id')
  getByPatientId(@Param('id', ParseIntPipe) id: number): Promise<Anamnesis[]>{
    return this.anamnesisService.getByPatientId(id);
  }

  @AnamnesisSwagger.updateAnamnesis()
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAnamnesisDto, @UserFromJwt() user: JwtPayload): Promise<boolean> {
    return this.anamnesisService.update(id, dto, user.id);
  }

  @AnamnesisSwagger.deleteAnamnesis()
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @UserFromJwt() user: JwtPayload): Promise<boolean> {
    return this.anamnesisService.delete(id, user.id);
  }
}
