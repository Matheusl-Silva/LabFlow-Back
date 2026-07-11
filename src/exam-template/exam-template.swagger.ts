import { applyDecorators } from '@nestjs/common'
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger'
import { ExamTemplate } from '../entities/exam-template.entity'
import { SwaggerAdmin } from '../common/swagger.decorators'

export const ExamTemplateSwagger = {
    findActiveTemplates: () =>
        applyDecorators(
            SwaggerAdmin(),
            ApiOperation({ summary: 'Listar templates de exame ativos' }),
            ApiResponse({
                status: 200,
                description: 'Lista de templates ativos retornada com sucesso',
                type: [ExamTemplate],
            }),
        ),

    findAllTemplates: () =>
        applyDecorators(
            SwaggerAdmin(),
            ApiOperation({ summary: 'Listar todos os templates de exame' }),
            ApiResponse({
                status: 200,
                description: 'Lista completa de templates retornada com sucesso',
                type: [ExamTemplate],
            }),
        ),

    findTemplateById: () =>
        applyDecorators(
            SwaggerAdmin(),
            ApiOperation({ summary: 'Buscar template de exame por ID' }),
            ApiParam({ name: 'id', description: 'ID do template', type: Number }),
            ApiResponse({
                status: 200,
                description: 'Template retornado com sucesso',
                type: ExamTemplate,
            }),
            ApiResponse({ status: 404, description: 'Template não encontrado' }),
        ),

    createTemplate: () =>
        applyDecorators(
            SwaggerAdmin(),
            ApiOperation({ summary: 'Criar novo template de exame' }),
            ApiResponse({
                status: 201,
                description: 'Template criado com sucesso',
                type: ExamTemplate,
            }),
        ),

    createNewVersion: () =>
        applyDecorators(
            SwaggerAdmin(),
            ApiOperation({ summary: 'Criar nova versão de um template de exame' }),
            ApiParam({ name: 'id', description: 'ID do template original', type: Number }),
            ApiResponse({
                status: 201,
                description: 'Nova versão do template criada com sucesso',
                type: ExamTemplate,
            }),
            ApiResponse({ status: 404, description: 'Template não encontrado' }),
        ),

    updateTemplate: () =>
        applyDecorators(
            SwaggerAdmin(),
            ApiOperation({ summary: 'Atualizar dados de template de exame' }),
            ApiParam({ name: 'id', description: 'ID do template', type: Number }),
            ApiResponse({
                status: 200,
                description: 'Template atualizado com sucesso',
                schema: { example: { message: 'Exam template has been updated successfully' } },
            }),
            ApiResponse({ status: 404, description: 'Template não encontrado' }),
        ),

    deleteTemplate: () =>
        applyDecorators(
            SwaggerAdmin(),
            ApiOperation({ summary: 'Deletar template de exame (soft delete)' }),
            ApiParam({ name: 'id', description: 'ID do template', type: Number }),
            ApiResponse({
                status: 200,
                description: 'Template deletado com sucesso',
                schema: { example: { message: 'Exam template has been deleted successfully' } },
            }),
            ApiResponse({ status: 404, description: 'Template não encontrado' }),
        ),
}
