import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto.js';
import { IsNull, LessThan, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import {
  RefreshToken,
  RefreshRevokeReason,
} from '../entities/refresh-token.entity';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { MailService } from '../mail/mail.service';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { hash, verify } from 'argon2';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { UserRole } from '../entities/user-role.entity';
import { Role } from '../common/enums/role.enum';

/** Par de tokens entregue no login e em cada renovação. */
export interface IssuedSession {
  /** JWT curto, usado no header Authorization de toda requisição. */
  token: string;
  /** Token opaco de longa duração — vai para o cookie httpOnly. */
  refreshToken: string;
  refreshExpiresAt: Date;
}

/**
 * Resposta única do pedido de redefinição — a mesma para e-mail cadastrado e
 * não cadastrado. Extraída para constante justamente para que ninguém
 * personalize um dos caminhos sem perceber que está vazando a existência da
 * conta.
 */
const FORGOT_PASSWORD_MESSAGE =
  'Se houver uma conta ativa com este e-mail, um link de redefinição foi enviado.';

/** Idem para a segunda etapa: nunca dizer QUAL das condições reprovou. */
const RESET_INVALID_MESSAGE = 'Link de redefinição inválido ou expirado.';

@Injectable()
export class AuthService {
    constructor(@InjectRepository(User) private readonly userRepo: Repository<User>,
                @InjectRepository(UserRole) private readonly userRoleRepo: Repository<UserRole>,
                @InjectRepository(RefreshToken) private readonly refreshRepo: Repository<RefreshToken>,
                @InjectRepository(PasswordResetToken) private readonly resetRepo: Repository<PasswordResetToken>,
                private jwt: JwtService,
                private mail: MailService,
                private config: ConfigService){}

  private readonly logger = new Logger(AuthService.name);

  async signin(dto: SignInDto): Promise<IssuedSession> {
    const user = await this.userRepo.findOneBy({ email: dto.email });
    // Mensagem uniforme para credencial inválida: não revela se o e-mail existe.
    if (!user) throw new UnauthorizedException('Wrong credentials');

    if (!(await verify(user.passwordHash, dto.pass))) {
      throw new UnauthorizedException('Wrong credentials');
    }

    // Conta pendente de aprovação: a senha está certa, mas o acesso ainda não
    // foi liberado por um administrador.
    if (!user.isActive) {
      throw new ForbiddenException('Conta pendente de aprovação de um administrador');
    }

    // Os papéis não vêm no findOneBy acima (relação lazy por padrão), então
    // buscamos aqui: são eles que o token carrega.
    const roles = await this.rolesOf(user.id);

    const refresh = await this.issueRefreshToken(user.id);
    return {
      token: await this.signToken(user.id, roles),
      refreshToken: refresh.raw,
      refreshExpiresAt: refresh.expiresAt,
    };
  }

  /**
   * Troca um refresh token válido por um access token novo — e por um refresh
   * novo (rotação): o token apresentado morre no processo.
   *
   * Os papéis são relidos do BANCO aqui, não copiados do token anterior. É o
   * que faz uma concessão ou revogação de papel valer em no máximo 15 minutos,
   * em vez de esperar o usuário relogar.
   */
  async refresh(rawToken: string): Promise<IssuedSession> {
    const stored = await this.refreshRepo.findOneBy({
      tokenHash: this.hashToken(rawToken),
    });
    // Token desconhecido: ou nunca existiu, ou a faxina já o removeu.
    if (!stored) throw new UnauthorizedException('Sessão inválida');

    // Antes do consumo: a validade não muda enquanto a requisição roda, então
    // checar aqui evita marcar como "rotacionado" um token que já estava morto
    // — e mantém o motivo da revogação contando a verdade.
    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Sessão expirada');
    }

    // CONSUMO ATÔMICO. Ler a linha e só depois gravar deixaria uma janela entre
    // o SELECT e o UPDATE em que duas requisições com o MESMO token passariam
    // as duas — e a detecção de reuso, que é a razão de o refresh ser rotativo,
    // nunca dispararia. Aqui quem fica com o token é decidido pelo banco: só um
    // UPDATE encontra a linha ainda com revoked_at NULL.
    const consumo = await this.refreshRepo.update(
      { id: stored.id, revokedAt: IsNull() },
      { revokedAt: new Date(), revokedReason: 'ROTATED' },
    );

    if (consumo.affected === 0) {
      // Alguém consumiu antes. Reler é obrigatório: o `stored` acima pode ter
      // sido lido justamente na corrida e não sabe por que a linha caiu.
      const atual = await this.refreshRepo.findOneBy({ id: stored.id });

      // Corrida entre abas: duas abas tomaram 401 ao mesmo tempo e renovaram
      // com o mesmo cookie. Derrubar a sessão aqui seria punir o uso normal do
      // sistema, então o token vale por mais alguns segundos.
      //
      // A checagem do MOTIVO é o que impede a tolerância de virar um furo: um
      // token revogado por roubo ou por logout não ganha carona nenhuma. Sem
      // isso, derrubar a família em resposta a um roubo daria ao atacante uma
      // janela para renovar — e o token emitido nessa janela nasceria válido,
      // anulando a revogação inteira.
      const corridaEntreAbas =
        atual?.revokedReason === 'ROTATED' &&
        !!atual.revokedAt &&
        this.withinReuseGrace(atual.revokedAt);

      if (!corridaEntreAbas) {
        // Um token já consumido voltando fora dessa janela é o sintoma clássico
        // de cookie copiado: o ladrão e o dono usam a mesma cadeia. Não há como
        // saber qual é qual, então a família cai e os dois refazem o login.
        await this.revokeFamily(stored.familyId, 'REUSED');
        // Derrubar a sessão de alguém em silêncio deixa o suporte sem nada para
        // investigar: este aviso é o único rastro de que houve indício de
        // credencial copiada.
        // Só 'ROTATED' fora da janela é sintoma de cookie copiado. Reapresentar
        // um token derrubado por logout, desativação ou redefinição de senha é
        // o comportamento NORMAL das outras abas do próprio dono — chamar isso
        // de roubo no log treinaria quem lê a ignorar o aviso que importa.
        const anterior = atual?.revokedReason ?? 'desconhecida';
        this.logger.warn(
          `Refresh token reapresentado após revogação (usuário ${stored.userId}, ` +
            `sessão ${stored.familyId}, revogação anterior: ${anterior}). ` +
            (anterior === 'ROTATED'
              ? 'Cadeia inteira derrubada — possível cookie copiado.'
              : 'Cadeia inteira derrubada — esperado após o encerramento da sessão.'),
        );
        throw new UnauthorizedException('Sessão inválida');
      }
    }

    const user = await this.userRepo.findOneBy({ id: stored.userId });
    // Conta apagada ou desativada por um admin: a sessão morre junto, sem
    // esperar os dias de validade do refresh.
    if (!user || !user.isActive) {
      await this.revokeFamily(stored.familyId, 'ACCOUNT_DISABLED');
      throw new UnauthorizedException('Sessão inválida');
    }

    const roles = await this.rolesOf(user.id);
    const next = await this.issueRefreshToken(user.id, stored.familyId);

    return {
      token: await this.signToken(user.id, roles),
      refreshToken: next.raw,
      refreshExpiresAt: next.expiresAt,
    };
  }

  /**
   * Logout de verdade: derruba a família inteira, não só o token apresentado.
   * Silencioso de propósito — sair da sessão nunca deve devolver erro ao
   * usuário, mesmo com um cookie velho ou já inválido na mão.
   */
  async logout(rawToken: string): Promise<void> {
    const stored = await this.refreshRepo.findOneBy({
      tokenHash: this.hashToken(rawToken),
    });
    if (stored) await this.revokeFamily(stored.familyId, 'LOGOUT');
  }

  async signup(dto: SignUpDto): Promise<{ message: string }> {
    const { pass, ...remainingData } = dto;

    // Bootstrap: se ainda não existe nenhum usuário, o primeiro cadastro vira o
    // administrador inicial (ativo). Sem isso, um sistema recém-instalado ficaria
    // travado — todo mundo pendente e ninguém para aprovar.
    const isFirstUser = (await this.userRepo.count()) === 0;

    const newUser = this.userRepo.create({
      passwordHash: await hash(pass),
      ...remainingData,
      isAdmin: isFirstUser,
      isActive: isFirstUser,
    });
    const saved = await this.userRepo.save(newUser);

    // O primeiro usuário precisa do papel ADMIN, ou o sistema nasce sem
    // ninguém capaz de conceder papéis. Quem se auto-cadastra depois nasce sem
    // papel nenhum: quem define o que ele acessa é o admin que o aprovar.
    if (isFirstUser) {
      await this.userRoleRepo.save(
        this.userRoleRepo.create({ userId: saved.id, role: Role.ADMIN }),
      );
    }

    return {
      message: isFirstUser
        ? 'Conta de administrador criada com sucesso. Você já pode entrar.'
        : 'Cadastro recebido. Aguarde a aprovação de um administrador para acessar.',
    };
  }

  /**
   * Primeira etapa da redefinição: cria um token de uso único e manda o link
   * por e-mail.
   *
   * A resposta é SEMPRE a mesma, exista ou não a conta. Devolver "e-mail não
   * encontrado" transformaria esta rota em um verificador de cadastro — quem
   * quisesse saber quais endereços têm conta no laboratório bastaria consultar
   * aqui. É a mesma razão do "Wrong credentials" uniforme no signin.
   *
   * Falha de envio também não vaza para a resposta: o MailService loga e
   * devolve false, e o usuário vê a mensagem genérica de qualquer forma.
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.userRepo.findOneBy({ email });

    // Conta inativa não recebe link: redefinir a senha não libera o acesso —
    // quem libera é a aprovação de um administrador. Mandar o e-mail aqui só
    // faria o usuário achar que resolveu.
    if (!user || !user.isActive) {
      this.logger.log(
        'Pedido de redefinição para e-mail sem conta ativa; nenhum e-mail enviado.',
      );
      return { message: FORGOT_PASSWORD_MESSAGE };
    }

    // Um pedido novo invalida os anteriores: se a pessoa clicou três vezes em
    // "esqueci minha senha", só o último link funciona. Sem isso, cada pedido
    // deixaria mais uma chave válida circulando na caixa de entrada.
    await this.resetRepo.delete({ userId: user.id });

    const raw = randomBytes(32).toString('base64url');
    const minutes = this.resetTtlMinutes();
    const saved = await this.resetRepo.save(
      this.resetRepo.create({
        userId: user.id,
        tokenHash: this.hashToken(raw),
        expiresAt: new Date(Date.now() + minutes * 60 * 1000),
      }),
    );

    // SEM await: a chamada à Resend leva centenas de milissegundos, e esperá-la
    // faria o caminho da conta existente responder muito mais devagar que o da
    // conta inexistente — um cronômetro separaria os dois casos e desfaria a
    // mensagem uniforme acima. Soltar aqui é seguro porque sendPasswordReset
    // nunca lança: ele já converte qualquer falha em log e `false`.
    void this.mail.sendPasswordReset({
      to: user.email,
      name: user.name,
      link: `${this.frontBaseUrl()}/recover?token=${encodeURIComponent(raw)}`,
      minutes,
      tokenId: saved.id,
    });

    return { message: FORGOT_PASSWORD_MESSAGE };
  }

  /**
   * Segunda etapa: troca a senha e derruba TODAS as sessões abertas do usuário.
   *
   * A derrubada não é zelo excessivo — o motivo mais comum de redefinir senha é
   * suspeita de conta comprometida, e deixar de pé os refresh tokens de sete
   * dias deixaria o invasor logado depois da troca.
   */
  async resetPassword(
    rawToken: string,
    novaSenha: string,
  ): Promise<{ message: string }> {
    const stored = await this.resetRepo.findOneBy({
      tokenHash: this.hashToken(rawToken),
    });

    // Motivo único para token inexistente, vencido, já usado ou de conta
    // inativa: distinguir os casos contaria ao visitante se aquele link um dia
    // existiu.
    if (!stored) throw new BadRequestException(RESET_INVALID_MESSAGE);
    if (stored.usedAt) throw new BadRequestException(RESET_INVALID_MESSAGE);
    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException(RESET_INVALID_MESSAGE);
    }

    // CONSUMO ATÔMICO, pelo mesmo motivo do refresh: entre o SELECT acima e a
    // troca de senha há uma janela em que dois envios com o mesmo link
    // passariam os dois. Só um UPDATE encontra a linha com used_at ainda NULL.
    const consumo = await this.resetRepo.update(
      { id: stored.id, usedAt: IsNull() },
      { usedAt: new Date() },
    );
    if (consumo.affected === 0)
      throw new BadRequestException(RESET_INVALID_MESSAGE);

    const user = await this.userRepo.findOneBy({ id: stored.userId });
    // Desativado ou removido entre o pedido e o clique: o link não ressuscita
    // a conta. O token já foi consumido acima, então ele também não sobra.
    if (!user || !user.isActive)
      throw new BadRequestException(RESET_INVALID_MESSAGE);

    const passwordHash = await hash(novaSenha);

    // Em transação: a troca de senha e a queda das sessões precisam valer
    // juntas. Se a senha mudasse e a revogação falhasse, o usuário sairia da
    // operação achando que expulsou o invasor — com a sessão dele ainda de pé.
    await this.userRepo.manager.transaction(async (manager) => {
      await manager.update(User, { id: user.id }, { passwordHash });
      await manager.update(
        RefreshToken,
        { userId: user.id, revokedAt: IsNull() },
        { revokedAt: new Date(), revokedReason: 'PASSWORD_RESET' },
      );
    });

    this.logger.log(
      `Senha redefinida via link de e-mail (usuário ${user.id}); sessões abertas revogadas.`,
    );

    return {
      message: 'Senha redefinida com sucesso. Entre com a nova senha.',
    };
  }

  /** Papéis concedidos ao usuário, na forma que o token carrega. */
  private async rolesOf(userId: number): Promise<Role[]> {
    const rows = await this.userRoleRepo.findBy({ userId });
    return rows.map((row) => row.role);
  }

  private async signToken(id: number, roles: Role[]): Promise<string> {
    const payload = {
      sub: id,
      // Derivado, não fonte da verdade: o guard decide por `roles`. Mantido no
      // payload porque os controllers ainda recortam a resposta por perfil.
      isAdmin: roles.includes(Role.ADMIN),
      roles,
    };
    // Curto por desenho: é ele que carrega os papéis, e um papel revogado só
    // deixa de valer quando o token que o carrega expira. Quem sustenta a
    // sessão do usuário é o refresh, não a validade deste token.
    //
    // O cast existe porque o jsonwebtoken tipa `expiresIn` como template
    // literal (`15m`, `7d`…), e uma env var é string qualquer.
    const expiresIn = this.configText(
      'JWT_EXPIRES_IN',
      '15m',
    ) as JwtSignOptions['expiresIn'];

    return this.jwt.sign(payload, {
      expiresIn,
      secret: this.config.get('JWT_SECRET'),
    });
  }

  /**
   * Cria a próxima sessão. Sem `familyId` é um login novo (família nova); com
   * ele, é mais um elo da cadeia iniciada naquele login.
   */
  private async issueRefreshToken(
    userId: number,
    familyId?: string,
  ): Promise<{ raw: string; expiresAt: Date }> {
    // Faxina em toda emissão, e não só no login: quem fica logado renova a cada
    // 15 minutos e pode passar meses sem passar pelo signin — purgar só ali
    // deixaria a tabela crescer para sempre. Como toda linha vence em
    // REFRESH_TOKEN_DAYS, limpar aqui mantém o total por usuário limitado à
    // janela de validade.
    await this.purgeExpiredTokens(userId);

    // 32 bytes de CSPRNG: espaço de busca grande o bastante para tornar
    // adivinhação irrelevante, sem depender do rate limit para isso.
    const raw = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.refreshTtlMs());

    await this.refreshRepo.save(
      this.refreshRepo.create({
        userId,
        tokenHash: this.hashToken(raw),
        familyId: familyId ?? randomUUID(),
        expiresAt,
      }),
    );

    return { raw, expiresAt };
  }

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Derruba a cadeia inteira. Só toca no que ainda está vivo: um token já
   * revogado preserva o motivo original, que é o que a tolerância consulta.
   */
  private async revokeFamily(
    familyId: string,
    reason: RefreshRevokeReason,
  ): Promise<void> {
    await this.refreshRepo.update(
      { familyId, revokedAt: IsNull() },
      { revokedAt: new Date(), revokedReason: reason },
    );
  }

  /** Remove sessões vencidas do usuário — elas não renovam mais nada. */
  private async purgeExpiredTokens(userId: number): Promise<void> {
    await this.refreshRepo.delete({ userId, expiresAt: LessThan(new Date()) });
  }

  /**
   * Env var declarada mas VAZIA (`CHAVE=`, o estilo do .env.example) chega como
   * string vazia — que `??` NÃO intercepta, porque '' não é null nem undefined.
   * Sem normalizar aqui, `Number('')` viraria 0 e zeraria a validade do refresh
   * token: todo token nasceria expirado e o sistema voltaria à sessão de 15
   * minutos que este mecanismo existe para resolver.
   */
  private configText(key: string, fallback: string): string {
    const value = this.config.get<string>(key)?.trim();
    return value ? value : fallback;
  }

  /** Como `configText`, recusando também NaN e valores abaixo do mínimo. */
  private configNumber(key: string, fallback: number, minimo = 1): number {
    const raw = this.configText(key, String(fallback));
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= minimo) return parsed;

    // Cair no padrão em silêncio esconderia um .env errado até alguém notar
    // sessões com duração estranha.
    this.logger.warn(
      `${key}="${raw}" não é um número válido (mínimo ${minimo}); usando ${fallback}.`,
    );
    return fallback;
  }

  private refreshTtlMs(): number {
    return this.configNumber('REFRESH_TOKEN_DAYS', 7) * 24 * 60 * 60 * 1000;
  }

  /** Validade do link de redefinição, em minutos. */
  private resetTtlMinutes(): number {
    return this.configNumber('PASSWORD_RESET_MINUTES', 30);
  }

  /**
   * Base do link enviado por e-mail.
   *
   * FRONT_URL é a MESMA variável do CORS e aceita lista separada por vírgula —
   * daí o split: montar o link com a string inteira geraria uma URL quebrada
   * em toda instalação que libera mais de uma origem. A primeira entrada é a
   * origem canônica por convenção.
   */
  private frontBaseUrl(): string {
    const primeira = this.configText('FRONT_URL', 'http://localhost:3001')
      .split(',')[0]
      .trim();
    // Sem a barra final: ela seria duplicada ao concatenar com '/recover'.
    return primeira.replace(/\/+$/, '');
  }

  /**
   * Janela em que reapresentar um token já rotacionado é tratado como corrida
   * entre abas, e não como roubo. Curta de propósito: ela é o preço de não
   * deslogar quem usa o sistema em várias abas ao mesmo tempo.
   */
  private withinReuseGrace(revokedAt: Date): boolean {
    // Mínimo 0: zerar a janela é uma escolha legítima — desliga a tolerância e
    // trata qualquer reapresentação como roubo.
    const graceSeconds = this.configNumber('REFRESH_REUSE_GRACE_SECONDS', 30, 0);
    return Date.now() - revokedAt.getTime() <= graceSeconds * 1000;
  }
}
