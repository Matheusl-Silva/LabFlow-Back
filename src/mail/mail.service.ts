import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { passwordResetEmail } from './mail.templates';

/**
 * Envio de e-mail transacional via Resend.
 *
 * Nenhum método aqui LANÇA: quem chama são fluxos que não podem contar ao
 * cliente se o e-mail existe ou se a entrega deu certo (ver
 * AuthService.forgotPassword). A falha vira log do servidor, não resposta HTTP.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly client: Resend | null;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.text('RESEND_API_KEY');

    // Sem chave o serviço nasce desligado em vez de quebrar o boot: em
    // desenvolvimento ninguém precisa de conta na Resend para trabalhar no
    // resto do sistema — o link cai no console (ver logDevFallback).
    this.client = apiKey ? new Resend(apiKey) : null;
    if (!this.client) {
      this.logger.warn(
        'RESEND_API_KEY não configurada: nenhum e-mail será enviado. ' +
          'Fora de produção, o link de redefinição é impresso no log.',
      );
    }
  }

  /**
   * Manda o link de redefinição. Devolve `true` só quando a Resend aceitou a
   * mensagem — o chamador usa isso para log, nunca para a resposta HTTP.
   */
  async sendPasswordReset(params: {
    to: string;
    name: string;
    link: string;
    minutes: number;
    /** Id da linha em password_reset_tokens; vira a chave de idempotência. */
    tokenId: number;
  }): Promise<boolean> {
    const { to, name, link, minutes, tokenId } = params;
    const content = passwordResetEmail({ name, link, minutes });

    if (!this.client) {
      this.logDevFallback(to, link);
      return false;
    }

    // try/catch aqui é só para falha de REDE: o SDK devolve `{ data, error }`
    // em vez de lançar quando a API responde erro, e um DNS fora do ar
    // derrubaria o pedido inteiro se não fosse capturado.
    try {
      const { data, error } = await this.client.emails.send(
        {
          from: this.from(),
          to: [to],
          subject: content.subject,
          html: content.html,
          text: content.text,
        },
        {
          // Vira o header Idempotency-Key. Cada token gera uma chave distinta,
          // então o retry de uma falha transitória não manda o e-mail duas vezes
          // — mas um pedido NOVO de redefinição (token novo) continua enviando
          // normalmente.
          idempotencyKey: `password-reset/${tokenId}`,
        },
      );

      if (error) {
        // Sem o endereço no log: o objetivo é diagnosticar a integração, não
        // deixar rastro de quem pediu redefinição no arquivo de log.
        this.logger.error(
          `Resend recusou o e-mail de redefinição (token ${tokenId}): ${error.name} — ${error.message}`,
        );
        this.logDevFallback(to, link);
        return false;
      }

      this.logger.log(
        `E-mail de redefinição enviado (token ${tokenId}, resend id ${data?.id ?? 'desconhecido'}).`,
      );
      return true;
    } catch (err) {
      this.logger.error(
        `Falha de rede ao chamar a Resend (token ${tokenId})`,
        err instanceof Error ? err.stack : String(err),
      );
      this.logDevFallback(to, link);
      return false;
    }
  }

  /**
   * Remetente. Precisa ser de domínio verificado em resend.com/domains — o
   * padrão `onboarding@resend.dev` só entrega para o e-mail dono da conta
   * Resend, então serve para o primeiro teste e mais nada.
   */
  private from(): string {
    const configured = this.text('MAIL_FROM');
    if (configured) return configured;

    this.logger.warn(
      'MAIL_FROM não configurada: usando o remetente de teste da Resend, ' +
        'que só entrega para o e-mail dono da conta.',
    );
    return 'LabFlow <onboarding@resend.dev>';
  }

  /**
   * Em desenvolvimento, imprime o link que não foi enviado — é o que permite
   * testar o fluxo inteiro sem conta na Resend. Em produção fica calado: link
   * de redefinição em log é credencial em texto puro no disco.
   */
  private logDevFallback(to: string, link: string): void {
    if (this.config.get('NODE_ENV') === 'production') return;
    this.logger.debug(`[DEV] Link de redefinição para ${to}: ${link}`);
  }

  /** Env var declarada mas vazia (`CHAVE=`) chega como '' e não como undefined. */
  private text(key: string): string | null {
    const value = this.config.get<string>(key)?.trim();
    return value ? value : null;
  }
}
