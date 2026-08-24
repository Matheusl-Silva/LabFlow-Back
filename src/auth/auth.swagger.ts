import { applyDecorators } from '@nestjs/common'
import { ApiOperation, ApiResponse } from '@nestjs/swagger'
import { SwaggerPublic } from '../common/swagger.decorators'

export const AuthSwagger = {
    signup: () =>
        applyDecorators(
            SwaggerPublic(),
            ApiOperation({
                summary: 'Auto-cadastro de usuário (nasce pendente de aprovação)',
                description:
                    'O usuário é criado inativo e só consegue logar após um administrador aprovar. ' +
                    'Exceção: se ainda não houver nenhum usuário no sistema, o primeiro cadastro vira o administrador inicial (ativo).',
            }),
            ApiResponse({
                status: 201,
                description: 'Cadastro recebido',
                schema: { example: { message: 'Cadastro recebido. Aguarde a aprovação de um administrador para acessar.' } },
            }),
            ApiResponse({ status: 409, description: 'Usuário já cadastrado' }),
        ),

    signin: () =>
        applyDecorators(
            SwaggerPublic(),
            ApiOperation({
                summary: 'Autenticar usuário',
                description:
                    'Grava os DOIS tokens em cookies httpOnly: o access em `labflow_access` e o ' +
                    'refresh em `labflow_refresh`. Nenhum deles aparece na resposta, de propósito: ' +
                    'o JavaScript da página não deve conseguir lê-los. O corpo devolve só o perfil ' +
                    'de quem entrou — nome, papéis e situação da conta. ' +
                    'Clientes que não são navegador (este Swagger, integrações) continuam podendo ' +
                    'usar o header `Authorization: Bearer`, mas precisam obter o token por outro meio: ' +
                    'aqui ele só sai como cookie.',
            }),
            ApiResponse({
                status: 200,
                description: 'Login realizado com sucesso',
                schema: {
                    example: {
                        user: {
                            id: 1,
                            name: 'Maria',
                            email: 'maria@labflow.test',
                            isAdmin: true,
                            isActive: true,
                            roles: ['ADMIN'],
                        },
                    },
                },
            }),
            ApiResponse({ status: 401, description: 'Credenciais inválidas' }),
            ApiResponse({ status: 403, description: 'Conta pendente de aprovação de um administrador' }),
        ),

    refresh: () =>
        applyDecorators(
            SwaggerPublic(),
            ApiOperation({
                summary: 'Renovar o access token a partir do cookie de sessão',
                description:
                    'Lê o refresh token do cookie httpOnly `labflow_refresh` — não há corpo nem header a enviar. ' +
                    'Regrava os cookies `labflow_access` e `labflow_refresh` e ROTACIONA o refresh: o token ' +
                    'usado deixa de valer na hora. Nada volta no corpo (204). ' +
                    'Os papéis são relidos do banco, então uma alteração de permissão vale a partir da próxima renovação.',
            }),
            ApiResponse({ status: 204, description: 'Sessão renovada (cookies regravados)' }),
            ApiResponse({
                status: 401,
                description: 'Sessão ausente, expirada, revogada ou de usuário desativado',
            }),
        ),

    logout: () =>
        applyDecorators(
            SwaggerPublic(),
            ApiOperation({
                summary: 'Encerrar a sessão',
                description:
                    'Revoga a cadeia de renovações inteira no servidor e apaga os dois cookies. ' +
                    'Responde 204 mesmo sem cookie válido: sair nunca falha.',
            }),
            ApiResponse({ status: 204, description: 'Sessão encerrada' }),
        ),
}
