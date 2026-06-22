import { UserRole } from "@prisma/client";

export type IJwtPayload = {
  userId: string;
  email: string;
  role: UserRole;
};

declare global {
  namespace Express {
    interface Request {
      user?: IJwtPayload;
    }
  }
}
