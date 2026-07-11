import { applyDecorators } from "@nestjs/common"
import { ApiOperation, ApiParam, ApiResponse } from "@nestjs/swagger"
import { User } from "../entities/user.entity"
import { SwaggerAdmin } from "../common/swagger.decorators"

export const UserSwagger = {
    findUsers: () =>
        applyDecorators(
            SwaggerAdmin(),
            ApiOperation({ summary: 'Listar todos os usuários' }),
            ApiResponse({
                status: 200,
                description: 'Lista de usuários retornada com sucesso',
                type: [User],
            }),
        ),

    findUserById: () =>
        applyDecorators(
            SwaggerAdmin(),
            ApiOperation({ summary: 'Buscar usuário por ID' }),
            ApiParam({ name: 'id', description: 'ID do usuário', type: Number }),
            ApiResponse({
                status: 200,
                description: 'Usuário retornado com sucesso',
                type: User,
            }),
            ApiResponse({ status: 404, description: 'Usuário não encontrado' }),
        ),

    updateUser: () =>
        applyDecorators(
            SwaggerAdmin(),
            ApiOperation({ summary: 'Atualizar dados de usuário' }),
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