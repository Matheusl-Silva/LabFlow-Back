import { SetMetadata } from "@nestjs/common";

export const ALLOW_COMMON_USER_KEY = 'allowCommonUser';
export const AllowCommonUser = () => SetMetadata(ALLOW_COMMON_USER_KEY, true);