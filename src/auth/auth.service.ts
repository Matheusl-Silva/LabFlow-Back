import {
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

@Injectable()
export class AuthService {
    constructor(@InjectRepository(User) private readonly userRepo: Repository<User>,
                @InjectRepository(UserRole) private readonly userRoleRepo: Repository<UserRole>,
                @InjectRepository(RefreshToken) private readonly refreshRepo: Repository<RefreshToken>,
                private jwt: JwtService,
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
        this.logger.warn(
          `Refresh token reapresentado após revogação (usuário ${stored.userId}, ` +
            `sessão ${stored.familyId}, revogação anterior: ${atual?.revokedReason ?? 'desconhecida'}). ` +
            'Cadeia inteira derrubada — possível cookie copiado.',
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
