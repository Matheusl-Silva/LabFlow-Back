import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { Injectable } from "@nestjs/common";
import type { Request } from "express";
import { JwtPayload } from "../types/jwt.payload.type";
import { Role } from "../enums/role.enum";
import { ACCESS_COOKIE_NAME } from "../../auth/auth-cookies";

/**
 * O access token do navegador chega em cookie httpOnly — a página não o lê,
 * então também não teria como montar o header Authorization.
 */
function doCookie(req: Request): string | null {
    const cookies = req?.cookies as Record<string, string> | undefined;
    return cookies?.[ACCESS_COOKIE_NAME] ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt'){
    constructor(config : ConfigService){
        super({
            // Cookie primeiro (o navegador), Bearer depois. O header continua
            // valendo para quem não é navegador: o Swagger, os testes e
            // qualquer integração servidor-a-servidor, que não têm cookie jar.
            jwtFromRequest: ExtractJwt.fromExtractors([
                doCookie,
                ExtractJwt.fromAuthHeaderAsBearerToken(),
            ]),
            secretOrKey: config.getOrThrow<string>("JWT_SECRET")
        });
    }

    async validate(payload): Promise<JwtPayload>{
        // Compatibilidade com tokens emitidos ANTES dos papéis existirem: eles
        // só trazem `isAdmin`. Sem este fallback, quem estivesse logado no
        // momento do deploy levaria 403 até o token expirar (15 min). O
        // fallback do usuário comum reproduz o que ele já podia fazer.
        // Pode sair quando a Fase 6 remover `isAdmin` do payload.
        const roles: Role[] = Array.isArray(payload.roles)
            ? payload.roles
            : payload.isAdmin
              ? [Role.ADMIN]
              : [Role.EXAMS, Role.EXAM_TEMPLATES, Role.ANAMNESIS, Role.PATIENTS];

        return {
            id: payload.sub,
            isAdmin: roles.includes(Role.ADMIN),
            roles
        }
    }
}
