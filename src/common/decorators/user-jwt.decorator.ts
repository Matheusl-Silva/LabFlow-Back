import { createParamDecorator } from "@nestjs/common";
import { ExecutionContext } from "@nestjs/common";
import { JwtPayload } from "../types/jwt.payload.type";

export const UserFromJwt = createParamDecorator((data: unknown, context: ExecutionContext): JwtPayload => {
    const req = context.switchToHttp().getRequest();
    return req.user;
})