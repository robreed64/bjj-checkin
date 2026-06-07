import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const role       = (auth?.user as { role?: string })?.role ?? "";
      const path       = nextUrl.pathname;

      if (path.startsWith("/admin")) {
        if (!isLoggedIn) {
          const url = new URL("/login", nextUrl.origin);
          url.searchParams.set("callbackUrl", path);
          return Response.redirect(url);
        }
        if (role === "parent") return Response.redirect(new URL("/portal",  nextUrl.origin));
        if (role === "member") return Response.redirect(new URL("/member",  nextUrl.origin));
        return true;
      }

      if (path.startsWith("/portal")) {
        if (!isLoggedIn) {
          const url = new URL("/login", nextUrl.origin);
          url.searchParams.set("callbackUrl", path);
          return Response.redirect(url);
        }
        if (role === "member") return Response.redirect(new URL("/member", nextUrl.origin));
        return true;
      }

      if (path.startsWith("/member")) {
        if (!isLoggedIn) {
          const url = new URL("/login", nextUrl.origin);
          url.searchParams.set("callbackUrl", path);
          return Response.redirect(url);
        }
        if (role === "parent") return Response.redirect(new URL("/portal", nextUrl.origin));
        return true;
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.role     = (user as { role?: string }).role;
        token.memberId = (user as { memberId?: number }).memberId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { role?: unknown }).role     = token.role;
        (session.user as { memberId?: unknown }).memberId = token.memberId;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
