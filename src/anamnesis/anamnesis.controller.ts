import { Controller, Get, Post, Body, Put, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { AnamnesisService } from './anamnesis.service';
import { CreateAnamnesisDto } from './dto/create-anamnesis.dto';
import { UpdateAnamnesisDto } from './dto/update-anamnesis.dto';
import { Anamnesis } from '../entities/anamnesis.entity';

@Controller('anamnesis')
export class AnamnesisController {
  constructor(private readonly anamnesisService: AnamnesisService) {}

  @Post()
  create(@Body() dto: CreateAnamnesisDto): Promise<Anamnesis> {
    return this.anamnesisService.create(dto);
  }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number): Promise<Anamnesis|null> {
    return this.anamnesisService.getById(id);
  }

  @Get('/patient/:id')
  getByPatientId(@Param('id', ParseIntPipe) id: number): Promise<Anamnesis[]>{
    return this.anamnesisService.getByPatientId(id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAnamnesisDto): Promise<boolean> {
    return this.anamnesisService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<boolean> {
    return this.anamnesisService.delete(id);
  }
}
