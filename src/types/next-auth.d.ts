import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { role: string; memberId?: number } & DefaultSession["user"];
  }
  interface User {
    role: string;
    memberId?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    memberId?: number;
  }
}
