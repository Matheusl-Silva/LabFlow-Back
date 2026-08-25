import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';

/**
 * Os DOIS tokens da sessão vivem em cookies httpOnly: o JavaScript da página
 * nunca os lê, então um XSS não consegue roubá-los. É o que diferencia este
 * desenho do anterior, em que o access token ficava no localStorage — lá,
 * qualquer script injetado levava a sessão inteira embora.
 *
 * O access continua curto (15 min) e o refresh continua rotativo: o cookie
 * protege contra leitura, não contra um token vazado por outro caminho.
 */
export const ACCESS_COOKIE_NAME = 'labflow_access';
export const REFRESH_COOKIE_NAME = 'labflow_refresh';

/**
 * Env var declarada mas VAZIA (`CHAVE=`) chega como string vazia, que `??` não
 * intercepta — e um `path: ''` ou `sameSite: ''` produziria um cookie que o
 * navegador trata de forma imprevisível.
 */
function textoConfig(
  config: ConfigService,
  key: string,
  fallback: string,
): string {
  const value = config.get<string>(key)?.trim();
  return value ? value : fallback;
}

/** Atributos comuns aos dois cookies. Só o `path` difere entre eles. */
function baseCookieOptions(config: ConfigService): Omit<CookieOptions, 'path'> {
  return {
    httpOnly: true,
    // Só sobre HTTPS em produção. Em dev o front roda em http://localhost e o
    // navegador descartaria um cookie `secure`.
    //
    // Atenção: a imagem Docker roda com NODE_ENV=production até na máquina do
    // desenvolvedor, então os cookies saem `Secure` também ali. Chrome e
    // Firefox aceitam isso sobre http://localhost (origem tida como confiável);
    // o Safari não — e agora que o access token TAMBÉM é cookie, o efeito lá
    // não é perder a renovação, é não conseguir autenticar.
    secure: config.get('NODE_ENV') === 'production',
    // 'lax' basta enquanto front e API dividem o mesmo site (hoje, o mesmo
    // host; um subdomínio api.labflow.net.br também seria same-site). Só um
    // domínio de registro DIFERENTE exigiria 'none' — que por sua vez exige
    // HTTPS dos dois lados.
    //
    // Além de compatibilidade, 'lax' é hoje a defesa contra CSRF: com a
    // autenticação em cookie, o navegador anexa o access token sozinho, e é o
    // SameSite que impede um site terceiro de disparar POSTs autenticados.
    // Trocar para 'none' exige acrescentar um token anti-CSRF.
    sameSite: textoConfig(
      config,
      'AUTH_COOKIE_SAMESITE',
      // Nome antigo, de quando só o refresh era cookie. Mantido para não
      // invalidar .env já em produção.
      textoConfig(config, 'REFRESH_COOKIE_SAMESITE', 'lax'),
    ) as CookieOptions['sameSite'],
  };
}

/**
 * O access token acompanha TODA requisição à API, não só as de /auth — por
 * isso o path padrão é '/'. Restringir aqui só faz sentido se um proxy publica
 * a API inteira sob um prefixo (ex.: '/api').
 */
export function accessCookieOptions(config: ConfigService): CookieOptions {
  return {
    ...baseCookieOptions(config),
    path: textoConfig(config, 'ACCESS_COOKIE_PATH', '/'),
  };
}

export function refreshCookieOptions(config: ConfigService): CookieOptions {
  return {
    ...baseCookieOptions(config),
    // Padrão '/' porque o path do cookie é comparado com a URL vista pelo
    // NAVEGADOR, não com a rota interna do Nest: se o Apache publicar a API sob
    // um prefixo (ex.: /api), um cookie preso em '/auth' simplesmente nunca
    // seria enviado — e a sessão morreria em silêncio em produção. Onde o
    // prefixo é conhecido, restringir aqui (ex.: '/auth' ou '/api/auth') é uma
    // camada extra de defesa.
    path: textoConfig(config, 'REFRESH_COOKIE_PATH', '/'),
  };
}

/**
 * O `expires` acompanha o `exp` do próprio JWT: um cookie que sobrevivesse ao
 * token só faria o navegador mandar credencial morta em toda requisição.
 * Vencido o cookie, a requisição chega sem token, toma 401 e o front renova —
 * o mesmo caminho de sempre.
 */
export function setAccessCookie(
  res: Response,
  config: ConfigService,
  token: string,
  expiresAt: Date,
): void {
  res.cookie(ACCESS_COOKIE_NAME, token, {
    ...accessCookieOptions(config),
    expires: expiresAt,
  });
}

export function setRefreshCookie(
  res: Response,
  config: ConfigService,
  token: string,
  expiresAt: Date,
): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...refreshCookieOptions(config),
    expires: expiresAt,
  });
}

/**
 * Para o navegador APAGAR um cookie, os atributos precisam bater com os do
 * cookie original (mesmo path, mesmo sameSite, mesmo secure). Divergir aqui
 * cria um segundo cookie em vez de remover o primeiro.
 */
export function clearAccessCookie(res: Response, config: ConfigService): void {
  res.clearCookie(ACCESS_COOKIE_NAME, accessCookieOptions(config));
}

export function clearRefreshCookie(res: Response, config: ConfigService): void {
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions(config));
}
