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

@ApiTags('Templates de Exame')
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
  async create(@Body() dto: CreateExamTemplateDto): Promise<ExamTemplate> {
    return this.service.create(dto);
  }

  @ExamTemplateSwagger.createNewVersion()
  @Post('/update/:id')
  async createNewVersion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateNewVersionExamTemplateDto,
  ): Promise<ExamTemplate> {
    return this.service.createNewVersion(id, dto);
  }

  @ExamTemplateSwagger.updateTemplate()
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExamTemplateDto,
  ): Promise<{message: string}> {
    await this.service.update(id, dto);
    return {message: "Exam template has been updated successfully"}
  }

  @ExamTemplateSwagger.deleteTemplate()
  @Delete(':id')
  async softDelete(@Param('id', ParseIntPipe) id: number): Promise<{message: string}>{
    await this.service.softDelete(id);
    return {message: 'Exam template has been deleted successfully'};
  }
}

