import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { Anamnesis } from '../entities/anamnesis.entity';
import { Role } from '../common/enums/role.enum';
import { SwaggerRoles } from '../common/swagger.decorators';

export const AnamnesisSwagger = {
  createAnamnesis: () =>
    applyDecorators(
      SwaggerRoles(Role.ANAMNESIS),
      ApiOperation({ summary: 'Registrar anamnese de um paciente' }),
      ApiResponse({
        status: 201,
        description: 'Anamnese registrada com sucesso',
        type: Anamnesis,
      }),
      ApiResponse({ status: 400, description: 'Dados inválidos' }),
    ),

  findAnamnesisById: () =>
    applyDecorators(
      SwaggerRoles(Role.ANAMNESIS),
      ApiOperation({ summary: 'Buscar anamnese por ID' }),
      ApiParam({ name: 'id', description: 'ID da anamnese', type: Number }),
      ApiResponse({
        status: 200,
        description: 'Anamnese retornada com sucesso',
        type: Anamnesis,
      }),
      ApiResponse({ status: 404, description: 'Anamnese não encontrada' }),
    ),

  findAnamnesesByPatient: () =>
    applyDecorators(
      SwaggerRoles(Role.ANAMNESIS),
      ApiOperation({
        summary: 'Listar anamneses de um paciente',
        description: 'O `id` do caminho é o do PACIENTE, não o da anamnese.',
      }),
      ApiParam({ name: 'id', description: 'ID do paciente', type: Number }),
      ApiResponse({
        status: 200,
        description: 'Lista de anamneses retornada com sucesso',
        type: [Anamnesis],
      }),
    ),

  updateAnamnesis: () =>
    applyDecorators(
      SwaggerRoles(Role.ANAMNESIS),
      ApiOperation({ summary: 'Atualizar anamnese' }),
      ApiParam({ name: 'id', description: 'ID da anamnese', type: Number }),
      ApiResponse({
        status: 200,
        description: 'Anamnese atualizada com sucesso',
        schema: { example: true },
      }),
      ApiResponse({ status: 404, description: 'Anamnese não encontrada' }),
    ),

  deleteAnamnesis: () =>
    applyDecorators(
      SwaggerRoles(Role.ANAMNESIS),
      ApiOperation({
        summary: 'Excluir anamnese',
        description:
          'Exclusão lógica (soft delete): a linha permanece no banco com ' +
          '`deleted_at` preenchido e some das consultas.',
      }),
      ApiParam({ name: 'id', description: 'ID da anamnese', type: Number }),
      ApiResponse({
        status: 200,
        description: 'Anamnese excluída com sucesso',
        schema: { example: true },
      }),
      ApiResponse({ status: 404, description: 'Anamnese não encontrada' }),
    ),
};
