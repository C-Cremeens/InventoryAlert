import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ContactsClient from "./ContactsClient";

export default async function ContactsPage() {
  const session = await auth();
  if (!session) return null;

  if (session.user.tier !== "PRO") {
    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-on-surface font-headline">Contacts</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Reusable alert contacts are available on the Pro plan.
          </p>
        </div>

        <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6 space-y-4">
          <p className="text-on-surface font-medium">
            Upgrade to Pro to manage shared alert recipients.
          </p>
          <p className="text-sm text-on-surface-variant">
            Pro contacts let you reuse recipients across items, mute email delivery per contact,
            and store cell phone numbers for future SMS support.
          </p>
          <Link
            href="/settings"
            className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:bg-primary-container transition-colors"
          >
            Upgrade in Settings
          </Link>
        </div>
      </div>
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
      _count: {
        select: {
          itemRecipients: true,
        },
      },
    },
    orderBy: [{ name: "asc" }, { email: "asc" }],
  });

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface font-headline">Contacts</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Manage shared notification recipients for your Pro inventory alerts.
        </p>
      </div>

      <ContactsClient
        initialContacts={contacts.map((contact) => ({
          id: contact.id,
          name: contact.name,
          email: contact.email,
          cellPhone: contact.cellPhone,
          emailEnabled: contact.emailEnabled,
          smsOptIn: contact.smsOptIn,
          assignedItemCount: contact._count.itemRecipients,
        }))}
      />
    </div>
  );
}
