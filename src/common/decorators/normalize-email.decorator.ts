import { Transform } from 'class-transformer';

/**
 * Normaliza o e-mail na ENTRADA: apara espaços e passa para minúsculas.
 *
 * O Postgres compara strings com distinção de maiúsculas, então sem isto quem
 * se cadastrou como "Maria.Silva@lab.com" não é encontrado ao digitar
 * "maria.silva@lab.com". No login o sintoma é um "Wrong credentials"
 * confuso; na recuperação de senha é pior, porque a resposta é genérica de
 * propósito — a pessoa vê "link enviado" e nada chega, sem nenhuma pista.
 *
 * Normalizar na borda (e não nas consultas) mantém as buscas como igualdade
 * simples, que continua usando o índice ux_users_email_active. Um
 * `LOWER(email) = LOWER($1)` obrigaria a um índice funcional novo e deixaria
 * o dado divergente no banco.
 *
 * Só funciona com `transform: true` na ValidationPipe — o que main.ts já faz.
 */
export const NormalizeEmail = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
