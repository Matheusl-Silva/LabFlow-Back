import { Role } from '../enums/role.enum';

export interface JwtPayload{
    id: number;
    /**
     * Derivado de `roles.includes(ADMIN)`. Mantido porque vários controllers
     * ainda ramificam a RESPOSTA por perfil (recorte de dado pessoal), e não
     * só o acesso.
     */
    isAdmin: boolean;
    /**
     * Papéis do usuário no momento em que o token foi emitido. Vem do TOKEN,
     * não do banco: revogar um papel só surte efeito no próximo login (o token
     * expira em 15 min). Trocar por um SELECT a cada request resolveria a
     * defasagem ao custo de uma consulta por requisição — escolha consciente,
     * não esquecimento.
     */
    roles: Role[];
}
