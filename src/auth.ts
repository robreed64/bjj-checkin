import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email:    { label: "Email",    type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const user = await prisma.user.findUnique({
            where: { email: String(credentials.email) },
          });

          if (!user) return null;

          const valid = await bcrypt.compare(String(credentials.password), user.passwordHash);
          if (!valid) return null;

          return {
            id: String(user.id),
            email: user.email,
            name: user.name,
            role: user.role,
            memberId: user.memberId ?? undefined,
            mustChangePassword: user.mustChangePassword,
          };
        } catch (err) {
          console.error("[auth] authorize error:", err);
          return null;
        }
      },
    }),
  ],
});
