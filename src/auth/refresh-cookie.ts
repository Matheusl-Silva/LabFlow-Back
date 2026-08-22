import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';

/**
 * O refresh token vive num cookie httpOnly: o JavaScript da página nunca o lê,
 * então um XSS não consegue roubá-lo. É a razão de o access token poder ser
 * curto (15 min) sem derrubar o usuário a cada quinze minutos.
 */
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

export function refreshCookieOptions(config: ConfigService): CookieOptions {
  return {
    httpOnly: true,
    // Só sobre HTTPS em produção. Em dev o front roda em http://localhost e o
    // navegador descartaria um cookie `secure`.
    secure: config.get('NODE_ENV') === 'production',
    // 'lax' basta enquanto front e API dividem o mesmo site (hoje, o mesmo
    // host; um subdomínio api.labflow.net.br também seria same-site). Só um
    // domínio de registro DIFERENTE exigiria 'none' — que por sua vez exige
    // HTTPS dos dois lados.
    sameSite: textoConfig(
      config,
      'REFRESH_COOKIE_SAMESITE',
      'lax',
    ) as CookieOptions['sameSite'],
    // Padrão '/' porque o path do cookie é comparado com a URL vista pelo
    // NAVEGADOR, não com a rota interna do Nest: se o Apache publicar a API sob
    // um prefixo (ex.: /api), um cookie preso em '/auth' simplesmente nunca
    // seria enviado — e a sessão morreria em silêncio em produção. Onde o
    // prefixo é conhecido, restringir aqui (ex.: '/auth' ou '/api/auth') é uma
    // camada extra de defesa.
    path: textoConfig(config, 'REFRESH_COOKIE_PATH', '/'),
  };
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
export function clearRefreshCookie(res: Response, config: ConfigService): void {
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions(config));
}
