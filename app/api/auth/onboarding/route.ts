import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TERMS_VERSION } from "@/lib/security";
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.emailVerifiedAt)
    return Response.json(
      { error: "Verify your email first." },
      { status: 401 },
    );
  const body = await req.json().catch(() => null);
  if (body?.termsAccepted !== true)
    return Response.json(
      { error: "Terms acceptance is required." },
      { status: 400 },
    );
  await prisma.user.update({
    where: { id: session.user.id },
    data: { termsAcceptedAt: new Date(), termsVersion: TERMS_VERSION },
  });
  return Response.json({ ok: true });
}
