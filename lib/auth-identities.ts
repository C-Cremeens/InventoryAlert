import { AuthProvider, type Tier } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type SessionUserShape = {
  id: string;
  email: string;
  name?: string | null;
  tier: Tier;
};

export async function ensureCredentialsIdentity(userId: string) {
  await prisma.authIdentity.upsert({
    where: {
      provider_providerAccountId: {
        provider: AuthProvider.CREDENTIALS,
        providerAccountId: userId,
      },
    },
    update: { userId },
    create: {
      userId,
      provider: AuthProvider.CREDENTIALS,
      providerAccountId: userId,
    },
  });
}

export function toSessionUser(user: SessionUserShape) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    tier: user.tier,
  };
}
