import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAlertEmail } from "@/lib/resend";

type Params = { params: Promise<{ qrCodeId: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const { qrCodeId } = await params;

  const item = await prisma.inventoryItem.findUnique({
    where: { qrCodeId },
  });

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // If alert emails are disabled for this item, record the scan but skip email
  if (item.alertEmailEnabled === false) {
    await prisma.stockingRequest.create({
      data: { itemId: item.id, emailSent: false },
    });
    return NextResponse.json({
      alreadyNotified: false,
      itemName: item.name,
      externalCartLink: item.externalCartLink ?? null,
      externalPlatform: item.externalPlatform ?? null,
      emailFailed: false,
    });
  }

  // Check for a recent email-sent request within the last 60 minutes
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentEmailSent = await prisma.stockingRequest.findFirst({
    where: {
      itemId: item.id,
      emailSent: true,
      createdAt: { gte: oneHourAgo },
    },
    orderBy: { createdAt: "desc" },
  });

  if (recentEmailSent) {
    // Rate limited — create a record but don't send email
    await prisma.stockingRequest.create({
      data: { itemId: item.id, emailSent: false },
    });
    return NextResponse.json({
      alreadyNotified: true,
      itemName: item.name,
      externalCartLink: item.externalCartLink ?? null,
      externalPlatform: item.externalPlatform ?? null,
      emailFailed: false,
    });
  }

  // Create stocking request and send email
  await prisma.stockingRequest.create({
    data: { itemId: item.id, emailSent: true },
  });

  let emailFailed = false;
  try {
    await sendAlertEmail(item.alertEmail, item.name);
  } catch (err) {
    console.error("Failed to send alert email:", err);
    emailFailed = true;
  }

  return NextResponse.json({
    alreadyNotified: false,
    itemName: item.name,
    externalCartLink: item.externalCartLink ?? null,
    externalPlatform: item.externalPlatform ?? null,
    emailFailed,
  });
}
