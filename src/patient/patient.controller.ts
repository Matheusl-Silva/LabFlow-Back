import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Body,
  Delete,
  ConflictException,
  Put,
} from '@nestjs/common';
import { PatientService } from './patient.service';
import { Patient } from '../entities/patient.entity';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { CreatePatientDto } from './dto/create-patient.dto';
import { QueryFailedError } from 'typeorm';
import { UserFromJwt } from '../common/decorators/user-jwt.decorator';
import { User } from '../entities/user.entity';
import { AllowCommonUser } from '../common/decorators/allow-common-user.decorator';

@Controller('patient')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @AllowCommonUser()
  @Get()
  async get(@UserFromJwt() user: User): Promise<Patient[]> {
    if(user.isAdmin) return this.patientService.get();
    return this.patientService.getPrivate();
  }

  @Get(':id')
  async getById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Patient | null> {
    try {
      return await this.patientService.getById(id);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  @Post()
  async create(@Body() dto: CreatePatientDto): Promise<Patient> {
    try {
      return await this.patientService.create(dto);
    } catch (err) {
      console.error(err);
      if (err instanceof QueryFailedError && err.driverError.code == '23505') {
        throw new ConflictException('Patient already registered');
      }
      throw err;
    }
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePatientDto,
  ): Promise<{message: string}> {
    try {
      this.patientService.update(id, dto);
      return {message: "Patient has been updated successfully"}
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number): Promise<boolean> {
    try{
      return await this.patientService.delete(id);
    }catch(err){
      console.error(err);
      throw err;
    }
  }
}
