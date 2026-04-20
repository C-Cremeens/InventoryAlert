import NextAuth from "next-auth";
import { AuthProvider, type Tier } from "@prisma/client";
import { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google, { type GoogleProfile } from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { GoogleSignInRequiredError } from "@/lib/auth-errors";
import { ensureCredentialsIdentity, toSessionUser } from "@/lib/auth-identities";
import { normalizeEmail } from "@/lib/auth-validation";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      tier: Tier;
    };
  }
  interface User {
    id: string;
    email: string;
    name?: string | null;
    tier: Tier;
  }
  interface JWT {
    id: string;
    tier: Tier;
  }
}

function getGoogleProvider() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return null;
  }

  return Google({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  });
}

const googleProvider = getGoogleProvider();

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = normalizeEmail(credentials.email as string);
        const user = await prisma.user.findFirst({
          where: {
            email: {
              equals: email,
              mode: "insensitive",
            },
          },
        });

        if (!user) return null;
        if (!user.hashedPassword) {
          const hasGoogleIdentity = await prisma.authIdentity.findFirst({
            where: {
              userId: user.id,
              provider: AuthProvider.GOOGLE,
            },
            select: { id: true },
          });

          if (hasGoogleIdentity) {
            throw new GoogleSignInRequiredError();
          }

          throw new CredentialsSignin();
        }

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.hashedPassword
        );
        if (!valid) return null;

        await ensureCredentialsIdentity(user.id);

        return toSessionUser(user);
      },
    }),
    ...(googleProvider ? [googleProvider] : []),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") {
        return true;
      }

      const googleProfile = profile as GoogleProfile | undefined;
      if (
        !googleProfile?.email ||
        !googleProfile.sub ||
        !googleProfile.email_verified
      ) {
        return false;
      }

      const normalizedEmail = normalizeEmail(googleProfile.email);
      const providerAccountId = googleProfile.sub;
      const now = new Date();

      const existingIdentity = await prisma.authIdentity.findUnique({
        where: {
          provider_providerAccountId: {
            provider: AuthProvider.GOOGLE,
            providerAccountId,
          },
        },
        include: {
          user: true,
        },
      });

      let linkedUser = existingIdentity?.user;

      if (!linkedUser) {
        const matchingUser = await prisma.user.findFirst({
          where: {
            email: {
              equals: normalizedEmail,
              mode: "insensitive",
            },
          },
        });

        if (matchingUser) {
          linkedUser = await prisma.user.update({
            where: { id: matchingUser.id },
            data: {
              email: normalizedEmail,
              emailVerifiedAt: matchingUser.emailVerifiedAt ?? now,
              name: matchingUser.name ?? user.name ?? googleProfile.name,
            },
          });
        } else {
          linkedUser = await prisma.user.create({
            data: {
              email: normalizedEmail,
              emailVerifiedAt: now,
              name: user.name ?? googleProfile.name,
            },
          });
        }

        await prisma.authIdentity.create({
          data: {
            userId: linkedUser.id,
            provider: AuthProvider.GOOGLE,
            providerAccountId,
          },
        });
      } else if (!linkedUser.emailVerifiedAt || !linkedUser.name) {
        linkedUser = await prisma.user.update({
          where: { id: linkedUser.id },
          data: {
            emailVerifiedAt: linkedUser.emailVerifiedAt ?? now,
            name: linkedUser.name ?? user.name ?? googleProfile.name,
          },
        });
      }

      user.id = linkedUser.id;
      user.email = linkedUser.email;
      user.name = linkedUser.name;
      user.tier = linkedUser.tier;

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token["id"] = user.id;
        token["tier"] = user.tier;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token["id"] as string;
      session.user.tier = token["tier"] as Tier;
      session.user.email = token.email as string;
      session.user.name = token.name as string | null | undefined;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
});
