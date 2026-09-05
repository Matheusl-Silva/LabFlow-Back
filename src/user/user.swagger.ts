import { applyDecorators } from "@nestjs/common"
import { ApiOperation, ApiParam, ApiResponse } from "@nestjs/swagger"
import { User } from "../entities/user.entity"
import { SwaggerAdmin, SwaggerAuthUser } from "../common/swagger.decorators"

export const UserSwagger = {
    findUsers: () =>
        applyDecorators(
            // @Authenticated() no guard: qualquer logado chama. Quem restringe
            // é o handler, devolvendo recortes diferentes conforme o perfil.
            SwaggerAuthUser(),
            ApiOperation({
                summary: 'Listar usuários',
                description:
                    'Administrador recebe a lista completa; usuário comum ' +
                    'recebe o recorte reduzido.',
            }),
            ApiResponse({
                status: 200,
                description: 'Lista de usuários retornada com sucesso',
                type: [User],
            }),
        ),

    findExamStaff: () =>
        applyDecorators(
            SwaggerAuthUser(),
            ApiOperation({
                summary:
                    'Listar quem pode ser preceptor/responsável de exame ' +
                    '(administradores ativos)',
            }),
            ApiResponse({
                status: 200,
                description: 'Lista de {id, name} retornada com sucesso',
                type: [User],
            }),
        ),

    findUserById: () =>
        applyDecorators(
            // @Authenticated() no guard; o handler é que exige ser admin OU o
            // próprio usuário. Anotar como SwaggerAdmin escondia o segundo caso.
            SwaggerAuthUser(),
            ApiOperation({
                summary: 'Buscar usuário por ID',
                description:
                    'Permitido ao administrador ou ao próprio usuário consultado.',
            }),
            ApiParam({ name: 'id', description: 'ID do usuário', type: Number }),
            ApiResponse({
                status: 200,
                description: 'Usuário retornado com sucesso',
                type: User,
            }),
            ApiResponse({
                status: 403,
                description: 'Consulta ao registro de outro usuário sem ser admin',
            }),
            ApiResponse({ status: 404, description: 'Usuário não encontrado' }),
        ),

    createUser: () =>
        applyDecorators(
            SwaggerAdmin(),
            ApiOperation({ summary: 'Criar usuário (admin) — nasce ativo, sem aprovação' }),
            ApiResponse({
                status: 201,
                description: 'Usuário criado com sucesso',
                type: User,
            }),
            ApiResponse({ status: 409, description: 'Usuário já cadastrado' }),
        ),

    updateUser: () =>
        applyDecorators(
            SwaggerAdmin(),
            ApiOperation({ summary: 'Atualizar dados de usuário (inclui aprovar/desativar via isActive)' }),
            ApiParam({ name: 'id', description: 'ID do usuário', type: Number }),
            ApiResponse({
                status: 200,
                description: 'Usuário atualizado com sucesso',
                schema: { example: { message: 'User has been updated successfully' } },
            }),
            ApiResponse({ status: 404, description: 'Usuário não encontrado' }),
        ),

    deleteUser: () =>
        applyDecorators(
            SwaggerAdmin(),
            ApiOperation({ summary: 'Deletar usuário' }),
            ApiParam({ name: 'id', description: 'ID do usuário', type: Number }),
            ApiResponse({
                status: 200,
                description: 'Usuário deletado com sucesso',
                schema: { example: { message: 'User has been deleted successfully' } },
            }),
            ApiResponse({ status: 404, description: 'Usuário não encontrado' }),
        ),
}