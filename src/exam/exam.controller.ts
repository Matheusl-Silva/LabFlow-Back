import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Exam } from '../entities/exam.entity';
import { ExamService } from './exam.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { AllowCommonUser } from '../common/decorators/allow-common-user.decorator';
import { UserFromJwt } from '../common/decorators/user-jwt.decorator';
import { User } from '../entities/user.entity';
import { ExamSwagger } from './exam.swagger';

@ApiTags('Exames')
@Controller('exam')
export class ExamController {
    constructor(private readonly service: ExamService){}

    @ExamSwagger.findExams()
    @Get()
    async get(): Promise<Exam[]>{
        return this.service.get();
    }

    @ExamSwagger.findExamById()
    @AllowCommonUser()
    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number, @UserFromJwt() user: User): Promise<Exam | null>{
        if(user.isAdmin) return this.service.getById(id);
        return this.service.getPrivateById(id);
    }

    @ExamSwagger.findExamsByPatientId()
    @AllowCommonUser()
    @Get('/patient/:id')
    async getByPatientId(@Param('id', ParseIntPipe) patientId: number): Promise<Exam[]>{
        return this.service.getByPatientId(patientId);
    }

    @ExamSwagger.createExam()
    @AllowCommonUser()
    @Post()
    async create(@Body() dto: CreateExamDto): Promise<Exam>{
        return this.service.create(dto);
    }

    @ExamSwagger.updateExam()
    @Put(':id')
    async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateExamDto): Promise<{message: string}>{
        this.service.update(id, dto);
        return {message: "Exam has been updated successfully"};
    }

    @ExamSwagger.deleteExam()
    @Delete(':id')
    async softDelete(@Param('id', ParseIntPipe) id: number): Promise<{message: string}>{
        this.service.softDelete(id);
        return {message: "Exam has been deleted successfully"};
    }
}

