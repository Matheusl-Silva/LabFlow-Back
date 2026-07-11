import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { Injectable } from "@nestjs/common";
import { JwtPayload } from "../types/jwt.payload.type";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt'){
    constructor(config : ConfigService){
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: config.getOrThrow<string>("JWT_SECRET")
        });
    }

    async validate(payload): Promise<JwtPayload>{
        return {
            id: payload.sub,
            isAdmin: payload.isAdmin
        }
    }
}