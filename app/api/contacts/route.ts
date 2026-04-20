import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeContactInput, RecipientConfigError, isProTier } from "@/lib/alert-recipients";
import { alertContactSchema } from "@/lib/validations/contact";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isProTier(session.user.tier)) {
    return NextResponse.json(
      { error: "Contacts are a Pro feature.", code: "PRO_FEATURE_REQUIRED" },
      { status: 403 }
    );
  }

  const contacts = await prisma.alertContact.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      cellPhone: true,
      emailEnabled: true,
      smsOptIn: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { itemRecipients: true } },
    },
    orderBy: [{ name: "asc" }, { email: "asc" }],
  });

  return NextResponse.json(
    contacts.map(({ _count, ...contact }) => ({
      ...contact,
      assignedItemCount: _count.itemRecipients,
    }))
  );
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!isProTier(session.user.tier)) {
      return NextResponse.json(
        { error: "Contacts are a Pro feature.", code: "PRO_FEATURE_REQUIRED" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = alertContactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const created = await prisma.alertContact.create({
      data: {
        userId: session.user.id,
        ...normalizeContactInput(parsed.data),
      },
      select: {
        id: true,
        name: true,
        email: true,
        cellPhone: true,
        emailEnabled: true,
        smsOptIn: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A contact with this email already exists." },
        { status: 409 }
      );
    }

    if (err instanceof RecipientConfigError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    console.error("[POST /api/contacts]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
