/** Escapa o que vai para dentro do HTML do e-mail (o nome vem do cadastro). */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface PasswordResetContent {
  subject: string;
  html: string;
  text: string;
}

/**
 * E-mail do link de redefinição.
 *
 * HTML deliberadamente simples e em tabela: cliente de e-mail não é navegador —
 * flex/grid e CSS externo não sobrevivem no Outlook. O `text` acompanha porque
 * sem ele o Resend geraria um alternativo automático, e filtros de spam
 * penalizam mensagem só-HTML.
 */
export function passwordResetEmail(params: {
  name: string;
  link: string;
  minutes: number;
}): PasswordResetContent {
  const { name, link, minutes } = params;
  const nome = escapeHtml(name);

  return {
    subject: 'Redefinição de senha — LabFlow',
    html: `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
       style="background:#f1f5f9;padding:24px 0;font-family:Arial,Helvetica,sans-serif">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="max-width:520px;background:#ffffff;border-radius:8px;padding:32px">
        <tr>
          <td style="font-size:20px;font-weight:bold;color:#0f172a;padding-bottom:16px">
            Redefinição de senha
          </td>
        </tr>
        <tr>
          <td style="font-size:15px;color:#334155;line-height:1.6;padding-bottom:24px">
            Olá, ${nome}.<br /><br />
            Recebemos um pedido para redefinir a senha da sua conta no LabFlow.
            Clique no botão abaixo para escolher uma nova senha. O link vale por
            ${minutes} minutos e só pode ser usado uma vez.
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-bottom:24px">
            <a href="${link}"
               style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;
                      padding:12px 28px;border-radius:6px;font-size:15px;font-weight:bold">
              Redefinir senha
            </a>
          </td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#64748b;line-height:1.6">
            Se o botão não funcionar, copie e cole este endereço no navegador:<br />
            <span style="word-break:break-all;color:#0f766e">${link}</span>
          </td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#64748b;line-height:1.6;padding-top:24px;
                     border-top:1px solid #e2e8f0;margin-top:24px">
            Se você não pediu esta redefinição, ignore este e-mail — sua senha
            atual continua valendo.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`.trim(),
    text: [
      `Olá, ${name}.`,
      '',
      'Recebemos um pedido para redefinir a senha da sua conta no LabFlow.',
      `Abra o endereço abaixo para escolher uma nova senha. O link vale por ${minutes} minutos e só pode ser usado uma vez.`,
      '',
      link,
      '',
      'Se você não pediu esta redefinição, ignore este e-mail — sua senha atual continua valendo.',
    ].join('\n'),
  };
}
