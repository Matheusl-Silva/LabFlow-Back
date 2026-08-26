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

    forgotPassword: () =>
        applyDecorators(
            SwaggerPublic(),
            ApiOperation({
                summary: 'Pedir link de redefinição de senha',
                description:
                    'Envia por e-mail um link de uso único para escolher uma nova senha. ' +
                    'A resposta é SEMPRE a mesma, exista ou não uma conta com o endereço informado — ' +
                    'do contrário a rota viraria um verificador de quais e-mails têm cadastro. ' +
                    'Contas inativas (pendentes de aprovação) não recebem o link: redefinir a senha ' +
                    'não libera o acesso delas.',
            }),
            ApiResponse({
                status: 202,
                description: 'Pedido recebido (não confirma se o e-mail existe)',
                schema: {
                    example: {
                        message:
                            'Se houver uma conta ativa com este e-mail, um link de redefinição foi enviado.',
                    },
                },
            }),
            ApiResponse({ status: 429, description: 'Muitos pedidos a partir deste IP' }),
        ),

    resetPassword: () =>
        applyDecorators(
            SwaggerPublic(),
            ApiOperation({
                summary: 'Redefinir a senha com o token recebido por e-mail',
                description:
                    'Consome o token (uso único) e grava a nova senha. Derruba TODAS as sessões ' +
                    'abertas do usuário e apaga o cookie de refresh deste navegador: quem redefine ' +
                    'a senha normalmente suspeita de conta comprometida, e um refresh de dias ' +
                    'manteria o invasor logado depois da troca.',
            }),
            ApiResponse({
                status: 200,
                description: 'Senha redefinida',
                schema: {
                    example: { message: 'Senha redefinida com sucesso. Entre com a nova senha.' },
                },
            }),
            ApiResponse({
                status: 400,
                description: 'Token inexistente, expirado, já usado, ou conta inativa',
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
