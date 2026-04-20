import { Prisma, RecipientKind, type Tier } from "@prisma/client";
import type { AlertContactInput } from "@/lib/validations/contact";
import type { ItemAlertRecipientInput } from "@/lib/validations/item";

type Tx = Prisma.TransactionClient;

type ContactRecipientSnapshot = {
  id: string;
  email: string;
  emailEnabled: boolean;
};

type RecipientSnapshot = {
  kind: RecipientKind;
  inlineEmail: string | null;
  contact: ContactRecipientSnapshot | null;
};

export class RecipientConfigError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 400, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function cleanEmail(email: string): string {
  return email.trim();
}

export function cleanOptionalText(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function isProTier(tier: Tier): boolean {
  return tier === "PRO";
}

function dedupeEmails(emails: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const email of emails) {
    const cleaned = cleanEmail(email);
    const normalized = normalizeEmail(cleaned);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(cleaned);
  }

  return unique;
}

export function getConfiguredRecipientEmails(
  recipients: RecipientSnapshot[]
): string[] {
  return dedupeEmails(
    recipients.flatMap((recipient) => {
      if (recipient.kind === RecipientKind.CONTACT && recipient.contact?.email) {
        return [recipient.contact.email];
      }

      if (recipient.kind === RecipientKind.INLINE_EMAIL && recipient.inlineEmail) {
        return [recipient.inlineEmail];
      }

      return [];
    })
  );
}

export function getEffectiveRecipientEmails(
  recipients: RecipientSnapshot[]
): string[] {
  return dedupeEmails(
    recipients.flatMap((recipient) => {
      if (recipient.kind === RecipientKind.CONTACT) {
        if (recipient.contact?.emailEnabled && recipient.contact.email) {
          return [recipient.contact.email];
        }

        return [];
      }

      if (recipient.kind === RecipientKind.INLINE_EMAIL && recipient.inlineEmail) {
        return [recipient.inlineEmail];
      }

      return [];
    })
  );
}

export function getPrimaryRecipientEmail(
  recipients: RecipientSnapshot[],
  fallbackEmail?: string | null
): string {
  const effectiveEmails = getEffectiveRecipientEmails(recipients);
  if (effectiveEmails.length > 0) return effectiveEmails[0];

  const configuredEmails = getConfiguredRecipientEmails(recipients);
  if (configuredEmails.length > 0) return configuredEmails[0];

  const fallback = cleanOptionalText(fallbackEmail);
  if (fallback) return fallback;

  throw new RecipientConfigError("At least one alert recipient is required.");
}

export function normalizeContactInput(input: AlertContactInput) {
  const email = cleanEmail(input.email);
  return {
    name: input.name.trim(),
    email,
    emailNormalized: normalizeEmail(email),
    cellPhone: cleanOptionalText(input.cellPhone),
    emailEnabled: input.emailEnabled ?? true,
    smsOptIn: input.smsOptIn ?? false,
  };
}

type ResolvedRecipientWrite = {
  recipients: Array<{
    kind: RecipientKind;
    contactId: string | null;
    inlineEmail: string | null;
    inlineEmailNormalized: string | null;
    position: number;
  }>;
  primaryAlertEmail: string;
  effectiveRecipientCount: number;
};

export async function resolveRecipientWritePayload(args: {
  tx: Tx;
  userId: string;
  tier: Tier;
  alertEmail?: string | null;
  alertRecipients?: ItemAlertRecipientInput[];
  fallbackAlertEmail?: string | null;
}) {
  const { tx, userId, tier, fallbackAlertEmail } = args;

  if (!isProTier(tier)) {
    if (args.alertRecipients && args.alertRecipients.length > 0) {
      throw new RecipientConfigError(
        "Multiple alert recipients are a Pro feature.",
        403,
        "PRO_FEATURE_REQUIRED"
      );
    }

    const alertEmail = cleanOptionalText(args.alertEmail);
    if (!alertEmail) {
      throw new RecipientConfigError("Alert email is required.");
    }

    return {
      recipients: [
        {
          kind: RecipientKind.INLINE_EMAIL,
          contactId: null,
          inlineEmail: alertEmail,
          inlineEmailNormalized: normalizeEmail(alertEmail),
          position: 0,
        },
      ],
      primaryAlertEmail: alertEmail,
      effectiveRecipientCount: 1,
    } satisfies ResolvedRecipientWrite;
  }

  const requestedRecipients =
    args.alertRecipients && args.alertRecipients.length > 0
      ? args.alertRecipients
      : args.alertEmail
        ? [{ kind: "INLINE_EMAIL", email: args.alertEmail } satisfies ItemAlertRecipientInput]
        : [];

  if (requestedRecipients.length === 0) {
    throw new RecipientConfigError("At least one alert recipient is required.");
  }

  const contactIds = requestedRecipients.flatMap((recipient) =>
    recipient.kind === "CONTACT" ? [recipient.contactId] : []
  );

  const existingContacts =
    contactIds.length > 0
      ? await tx.alertContact.findMany({
          where: {
            userId,
            id: { in: Array.from(new Set(contactIds)) },
          },
          select: {
            id: true,
            name: true,
            email: true,
            emailNormalized: true,
            cellPhone: true,
            emailEnabled: true,
            smsOptIn: true,
          },
        })
      : [];

  const contactById = new Map(existingContacts.map((contact) => [contact.id, contact]));
  if (contactById.size !== new Set(contactIds).size) {
    throw new RecipientConfigError("One or more selected contacts no longer exist.", 404);
  }

  const newContactInputs = requestedRecipients
    .filter((recipient): recipient is Extract<ItemAlertRecipientInput, { kind: "NEW_CONTACT" }> => recipient.kind === "NEW_CONTACT")
    .map((recipient) => normalizeContactInput({
      name: recipient.name,
      email: recipient.email,
      cellPhone: recipient.cellPhone,
      emailEnabled: recipient.emailEnabled,
      smsOptIn: recipient.smsOptIn,
    }));

  const newContactEmailNormalized = Array.from(
    new Set(newContactInputs.map((contact) => contact.emailNormalized))
  );

  const existingByNormalized =
    newContactEmailNormalized.length > 0
      ? await tx.alertContact.findMany({
          where: {
            userId,
            emailNormalized: { in: newContactEmailNormalized },
          },
          select: {
            id: true,
            name: true,
            email: true,
            emailNormalized: true,
            cellPhone: true,
            emailEnabled: true,
            smsOptIn: true,
          },
        })
      : [];

  const contactByNormalized = new Map(
    [...existingContacts, ...existingByNormalized].map((contact) => [
      contact.emailNormalized,
      contact,
    ])
  );

  const createdContactByNormalized = new Map<string, ContactRecipientSnapshot>();
  const recipients: ResolvedRecipientWrite["recipients"] = [];
  const configuredEmails: string[] = [];
  const effectiveEmails: string[] = [];
  const seenRecipientKeys = new Set<string>();

  for (const requestedRecipient of requestedRecipients) {
    if (requestedRecipient.kind === "INLINE_EMAIL") {
      const email = cleanEmail(requestedRecipient.email);
      const normalized = normalizeEmail(email);
      const recipientKey = `INLINE_EMAIL:${normalized}`;
      if (seenRecipientKeys.has(recipientKey)) continue;
      seenRecipientKeys.add(recipientKey);
      configuredEmails.push(email);
      effectiveEmails.push(email);
      recipients.push({
        kind: RecipientKind.INLINE_EMAIL,
        contactId: null,
        inlineEmail: email,
        inlineEmailNormalized: normalized,
        position: recipients.length,
      });
      continue;
    }

    let contact: ContactRecipientSnapshot | undefined;

    if (requestedRecipient.kind === "CONTACT") {
      const existing = contactById.get(requestedRecipient.contactId);
      if (!existing) {
        throw new RecipientConfigError("One or more selected contacts no longer exist.", 404);
      }

      contact = {
        id: existing.id,
        email: existing.email,
        emailEnabled: existing.emailEnabled,
      };
    } else {
      const normalizedInput = normalizeContactInput({
        name: requestedRecipient.name,
        email: requestedRecipient.email,
        cellPhone: requestedRecipient.cellPhone,
        emailEnabled: requestedRecipient.emailEnabled,
        smsOptIn: requestedRecipient.smsOptIn,
      });

      const existing = contactByNormalized.get(normalizedInput.emailNormalized);
      if (existing) {
        contact = {
          id: existing.id,
          email: existing.email,
          emailEnabled: existing.emailEnabled,
        };
      } else {
        const cached = createdContactByNormalized.get(normalizedInput.emailNormalized);
        if (cached) {
          contact = cached;
        } else {
          const created = await tx.alertContact.create({
            data: {
              userId,
              ...normalizedInput,
            },
            select: {
              id: true,
              email: true,
              emailEnabled: true,
            },
          });

          createdContactByNormalized.set(normalizedInput.emailNormalized, created);
          contact = created;
        }
      }
    }

    const recipientKey = `CONTACT:${contact.id}`;
    if (seenRecipientKeys.has(recipientKey)) continue;
    seenRecipientKeys.add(recipientKey);
    configuredEmails.push(contact.email);
    if (contact.emailEnabled) {
      effectiveEmails.push(contact.email);
    }
    recipients.push({
      kind: RecipientKind.CONTACT,
      contactId: contact.id,
      inlineEmail: null,
      inlineEmailNormalized: null,
      position: recipients.length,
    });
  }

  const primaryAlertEmail =
    effectiveEmails[0] ??
    configuredEmails[0] ??
    cleanOptionalText(fallbackAlertEmail) ??
    (() => {
      throw new RecipientConfigError("At least one alert recipient is required.");
    })();

  return {
    recipients,
    primaryAlertEmail,
    effectiveRecipientCount: dedupeEmails(effectiveEmails).length,
  } satisfies ResolvedRecipientWrite;
}

export async function refreshItemAlertEmailMirrors(
  tx: Tx,
  itemIds: string[]
): Promise<void> {
  const uniqueItemIds = Array.from(new Set(itemIds.filter(Boolean)));
  if (uniqueItemIds.length === 0) return;

  const items = await tx.inventoryItem.findMany({
    where: { id: { in: uniqueItemIds } },
    select: {
      id: true,
      alertEmail: true,
      alertRecipients: {
        orderBy: { position: "asc" },
        select: {
          kind: true,
          inlineEmail: true,
          contact: {
            select: {
              id: true,
              email: true,
              emailEnabled: true,
            },
          },
        },
      },
    },
  });

  for (const item of items) {
    const nextAlertEmail = getPrimaryRecipientEmail(item.alertRecipients, item.alertEmail);
    if (nextAlertEmail === item.alertEmail) continue;

    await tx.inventoryItem.update({
      where: { id: item.id },
      data: { alertEmail: nextAlertEmail },
    });
  }
}
