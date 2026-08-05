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
import { ApiTags } from '@nestjs/swagger';
import { PatientService } from './patient.service';
import { Patient } from '../entities/patient.entity';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { CreatePatientDto } from './dto/create-patient.dto';
import { QueryFailedError } from 'typeorm';
import { UserFromJwt } from '../common/decorators/user-jwt.decorator';
import { User } from '../entities/user.entity';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { hasRole } from '../common/utils/has-role';
import { PatientSwagger } from './patient.swagger';
import type { JwtPayload } from '../common/types/jwt.payload.type';

@ApiTags('Pacientes')
// Cadastrar/editar/excluir paciente é do papel PATIENTS. As leituras abrem
// também para os papéis que trabalham sobre um paciente (ver os @Roles nos
// handlers): quem lança/edita exame ou faz anamnese precisa escolher um
// paciente na lista — mas recebe a versão anonimizada.
@Roles(Role.PATIENTS)
@Controller('patient')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @PatientSwagger.findPatients()
  @Roles(Role.PATIENTS, Role.EXAMS, Role.EXAM_TEMPLATES, Role.ANAMNESIS)
  @Get()
  async get(@UserFromJwt() user: JwtPayload): Promise<Patient[]> {
    if(hasRole(user, Role.PATIENTS)) return this.patientService.get();
    return this.patientService.getPrivate();
  }

  @PatientSwagger.findPatientById()
  @Roles(Role.PATIENTS, Role.EXAMS, Role.EXAM_TEMPLATES, Role.ANAMNESIS)
  @Get(':id')
  async getById(
    @Param('id', ParseIntPipe) id: number,
    @UserFromJwt() user: JwtPayload,
  ): Promise<Patient | null> {
    try {
      // Quem só tem EXAMS precisa do paciente para registrar o exame, mas não
      // pode ver os dados pessoais dele (LGPD). O dado completo é do papel
      // PATIENTS, que é quem cadastra e revisa o paciente.
      if (hasRole(user, Role.PATIENTS)) return await this.patientService.getById(id);
      return await this.patientService.getPrivateById(id);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  @PatientSwagger.createPatient()
  @Post()
  async create(
    @Body() dto: CreatePatientDto,
    @UserFromJwt() user: JwtPayload,
  ): Promise<Patient> {
    try {
      return await this.patientService.create(dto, user.id);
    } catch (err) {
      console.error(err);
      if (err instanceof QueryFailedError && err.driverError.code == '23505') {
        throw new ConflictException('Patient already registered');
      }
      throw err;
    }
  }

  @PatientSwagger.updatePatient()
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePatientDto,
    @UserFromJwt() user: JwtPayload,
  ): Promise<{message: string}> {
    try {
      await this.patientService.update(id, dto, user.id);
      return {message: "Patient has been updated successfully"}
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  @PatientSwagger.deletePatient()
  @Delete(':id')
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @UserFromJwt() user: JwtPayload,
  ): Promise<boolean> {
    try{
      return await this.patientService.delete(id, user.id);
    }catch(err){
      console.error(err);
      throw err;
    }
  }
}
