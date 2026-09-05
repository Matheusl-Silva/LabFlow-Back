import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { AuditAction, AuditEntity } from './audit.types';
import { SwaggerAdmin } from '../common/swagger.decorators';

export const AuditSwagger = {
  findLogs: () =>
    applyDecorators(
      // Sem decorator de papel no controller: o RolesGuard é fail-closed, então
      // a rota já é exclusiva de administrador. Auditar é administrar o sistema,
      // e não vira papel delegável.
      SwaggerAdmin(),
      ApiOperation({
        summary: 'Consultar a trilha de auditoria (admin)',
        description:
          'Cada evento traz o nome de quem agiu e o nome do registro afetado ' +
          'já resolvidos — inclusive de usuários e registros excluídos, que é ' +
          'justamente quando o histórico importa.',
      }),
      ApiQuery({
        name: 'entity',
        required: false,
        enum: AuditEntity,
        description: 'Filtra por tipo de registro',
      }),
      ApiQuery({
        name: 'entityId',
        required: false,
        type: Number,
        description: 'Filtra por um registro específico; use junto de `entity`',
      }),
      ApiQuery({
        name: 'action',
        required: false,
        enum: AuditAction,
        description: 'Filtra por tipo de ação',
      }),
      ApiQuery({
        name: 'userId',
        required: false,
        type: Number,
        description: 'Filtra por quem executou a ação',
      }),
      ApiQuery({ name: 'page', required: false, type: Number, description: 'Padrão 1' }),
      ApiQuery({ name: 'limit', required: false, type: Number, description: 'Padrão 20' }),
      ApiResponse({
        status: 200,
        description: 'Página de eventos de auditoria',
        schema: {
          example: {
            data: [
              {
                id: 128,
                action: 'UPDATE',
                entity: 'EXAM',
                entityId: 42,
                userId: 3,
                userName: 'Ana Souza',
                entityName: 'Hematologia',
                before: { observation: null },
                after: { observation: 'Amostra levemente hemolisada.' },
                createdAt: '2026-09-04T09:12:00.000Z',
              },
            ],
            total: 1,
          },
        },
      }),
    ),
};
