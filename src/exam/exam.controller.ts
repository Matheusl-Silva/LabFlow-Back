import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { Exam } from '../entities/exam.entity';
import { ExamService } from './exam.service';
import { CreateExamDto } from './dto/create-exam.dto';

@Controller('exam')
export class ExamController {
    constructor(private readonly service: ExamService){}
    @Get()
    async get(): Promise<Exam[]>{
        return this.service.get();
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number): Promise<Exam | null>{
        return this.service.getById(id);
    }

    @Get('/patient/:id')
    async getByPatientId(@Param('id', ParseIntPipe) patientId: number): Promise<Exam[]>{
        return this.service.getByPatientId(patientId);
    }

    @Post()
    async create(@Body() dto: CreateExamDto): Promise<Exam>{
        return this.service.create(dto);
    }
}
