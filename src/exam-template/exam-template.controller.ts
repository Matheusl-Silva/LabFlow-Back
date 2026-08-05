import {
  Body,
  Controller,
  Get,
  ParseIntPipe,
  Post,
  Param,
  Put,
  Delete
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ExamTemplateService } from './exam-template.service';
import { ExamTemplate } from '../entities/exam-template.entity';
import { CreateExamTemplateDto } from './dto/create-exam-template.dto';
import { CreateNewVersionExamTemplateDto } from './dto/create-new-version-exam-template.dto';
import { UpdateExamTemplateDto } from './dto/update-exam-template.dto';
import { ExamTemplateSwagger } from './exam-template.swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { UserFromJwt } from '../common/decorators/user-jwt.decorator';
import type { JwtPayload } from '../common/types/jwt.payload.type';

@ApiTags('Templates de Exame')
// Modelos de exame são configuração: só o papel EXAM_TEMPLATES mexe neles.
// Quem tem apenas EXAMS lança exames, mas não altera a estrutura dos modelos.
@Roles(Role.EXAM_TEMPLATES)
@Controller('/template')
export class ExamTemplateController {
  constructor(private readonly service: ExamTemplateService) {}

  @ExamTemplateSwagger.findActiveTemplates()
  @Get()
  async getActives(): Promise<ExamTemplate[]> {
    return await this.service.getActives();
  }

  @ExamTemplateSwagger.findAllTemplates()
  @Get('/all')
  async getAll(): Promise<ExamTemplate[]> {
    return this.service.getAll();
  }

  @ExamTemplateSwagger.findTemplateById()
  @Get('/:id')
  async getById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ExamTemplate | null> {
    return this.service.getById(id);
  }

  @ExamTemplateSwagger.createTemplate()
  @Post()
  async create(
    @Body() dto: CreateExamTemplateDto,
    @UserFromJwt() user: JwtPayload,
  ): Promise<ExamTemplate> {
    return this.service.create(dto, user.id);
  }

  @ExamTemplateSwagger.createNewVersion()
  @Post('/update/:id')
  async createNewVersion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateNewVersionExamTemplateDto,
    @UserFromJwt() user: JwtPayload,
  ): Promise<ExamTemplate> {
    return this.service.createNewVersion(id, dto, user.id);
  }

  @ExamTemplateSwagger.updateTemplate()
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExamTemplateDto,
    @UserFromJwt() user: JwtPayload,
  ): Promise<{message: string}> {
    await this.service.update(id, dto, user.id);
    return {message: "Exam template has been updated successfully"}
  }

  @ExamTemplateSwagger.deleteTemplate()
  @Delete(':id')
  async softDelete(
    @Param('id', ParseIntPipe) id: number,
    @UserFromJwt() user: JwtPayload,
  ): Promise<{message: string}>{
    await this.service.softDelete(id, user.id);
    return {message: 'Exam template has been deleted successfully'};
  }
}

