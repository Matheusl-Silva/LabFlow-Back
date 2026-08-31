import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Exam } from '../entities/exam.entity';
import { ExamService } from './exam.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { hasRole } from '../common/utils/has-role';
import { UserFromJwt } from '../common/decorators/user-jwt.decorator';
import { ExamSwagger } from './exam.swagger';
import type { JwtPayload } from '../common/types/jwt.payload.type';

@ApiTags('Exames')
// Cadastrar e consultar exame é do papel EXAMS (o operador do dia a dia).
// Editar e excluir exame já lançado é do papel EXAM_TEMPLATES — os @Roles nos
// handlers estreitam a regra da classe onde o verbo é destrutivo.
@Roles(Role.EXAMS, Role.EXAM_TEMPLATES)
@Controller('exam')
export class ExamController {
    constructor(private readonly service: ExamService){}

    @ExamSwagger.findExams()
    @Get()
    async get(): Promise<Exam[]>{
        return this.service.get();
    }

    @ExamSwagger.findExamById()
    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number, @UserFromJwt() user: JwtPayload): Promise<Exam | null>{
        // Resultado completo só para quem cuida do paciente; para os demais,
        // a versão sem os dados identificadores.
        if(hasRole(user, Role.PATIENTS)) return this.service.getById(id);
        return this.service.getPrivateById(id);
    }

    @ExamSwagger.findExamsByPatientId()
    @Get('/patient/:id')
    async getByPatientId(@Param('id', ParseIntPipe) patientId: number): Promise<Exam[]>{
        return this.service.getByPatientId(patientId);
    }

    // Emitir laudo é leitura, não edição: fica com os mesmos papéis da classe
    // (quem consegue abrir o exame consegue imprimi-lo). O POST existe só para
    // o histórico registrar a emissão — o PDF é gerado no navegador.
    @ExamSwagger.registerExamReport()
    @Post(':id/report')
    async registerReport(@Param('id', ParseIntPipe) id: number, @UserFromJwt() user: JwtPayload): Promise<{message: string}>{
        await this.service.registerReport(id, user.id);
        return {message: "Exam report has been registered successfully"};
    }

    @ExamSwagger.createExam()
    @Post()
    async create(@Body() dto: CreateExamDto, @UserFromJwt() user: JwtPayload): Promise<Exam>{
        return this.service.create(dto, user.id);
    }

    // Editar e excluir só para EXAM_TEMPLATES: quem tem apenas EXAMS lança, mas
    // não altera o que já está registrado.
    @ExamSwagger.updateExam()
    @Roles(Role.EXAM_TEMPLATES)
    @Put(':id')
    async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateExamDto, @UserFromJwt() user: JwtPayload): Promise<{message: string}>{
        await this.service.update(id, dto, user.id);
        return {message: "Exam has been updated successfully"};
    }

    @ExamSwagger.deleteExam()
    @Roles(Role.EXAM_TEMPLATES)
    @Delete(':id')
    async softDelete(@Param('id', ParseIntPipe) id: number, @UserFromJwt() user: JwtPayload): Promise<{message: string}>{
        await this.service.softDelete(id, user.id);
        return {message: "Exam has been deleted successfully"};
    }
}

