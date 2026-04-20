"use client";

import { useMemo, useState } from "react";
import type { AlertContactOption, ItemRecipientDraft } from "./recipientTypes";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function makeId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export default function AlertRecipientManager({
  contacts,
  recipients,
  onChange,
  allowCustomRecipientEntry = true,
}: {
  contacts: AlertContactOption[];
  recipients: ItemRecipientDraft[];
  onChange: (recipients: ItemRecipientDraft[]) => void;
  allowCustomRecipientEntry?: boolean;
}) {
  const [contactSearch, setContactSearch] = useState("");
  const [inlineEmail, setInlineEmail] = useState("");
  const [newContact, setNewContact] = useState({
    name: "",
    email: "",
    cellPhone: "",
    emailEnabled: true,
    smsOptIn: false,
  });
  const [localError, setLocalError] = useState("");

  const selectedContactIds = new Set(
    recipients.flatMap((recipient) =>
      recipient.kind === "CONTACT" ? [recipient.contactId] : []
    )
  );

  const filteredContacts = useMemo(() => {
    const query = contactSearch.trim().toLowerCase();
    return contacts.filter((contact) => {
      if (selectedContactIds.has(contact.id)) return false;
      if (!query) return true;

      return (
        contact.name.toLowerCase().includes(query) ||
        contact.email.toLowerCase().includes(query)
      );
    });
  }, [contactSearch, contacts, selectedContactIds]);

  function addContact(contactId: string) {
    onChange([
      ...recipients,
      {
        clientId: makeId("contact"),
        kind: "CONTACT",
        contactId,
      },
    ]);
    setLocalError("");
  }

  function addInlineEmail() {
    const email = inlineEmail.trim();
    if (!email) return;
    if (!isValidEmail(email)) {
      setLocalError("Enter a valid one-off email address.");
      return;
    }

    onChange([
      ...recipients,
      {
        clientId: makeId("inline"),
        kind: "INLINE_EMAIL",
        email,
      },
    ]);
    setInlineEmail("");
    setLocalError("");
  }

  function addNewContact() {
    if (!newContact.name.trim()) {
      setLocalError("New contacts need a name.");
      return;
    }

    if (!isValidEmail(newContact.email)) {
      setLocalError("Enter a valid email for the new contact.");
      return;
    }

    onChange([
      ...recipients,
      {
        clientId: makeId("new"),
        kind: "NEW_CONTACT",
        name: newContact.name.trim(),
        email: newContact.email.trim(),
        cellPhone: newContact.cellPhone.trim(),
        emailEnabled: newContact.emailEnabled,
        smsOptIn: newContact.smsOptIn,
      },
    ]);
    setNewContact({
      name: "",
      email: "",
      cellPhone: "",
      emailEnabled: true,
      smsOptIn: false,
    });
    setLocalError("");
  }

  function removeRecipient(clientId: string) {
    onChange(recipients.filter((recipient) => recipient.clientId !== clientId));
  }

  return (
    <div className="space-y-4 rounded-xl border border-outline-variant p-4 bg-surface-container-low">
      <div>
        <p className="text-sm font-medium text-on-surface">Alert recipients</p>
        <p className="text-xs text-outline mt-0.5">
          {allowCustomRecipientEntry
            ? "Add saved contacts, create a new contact inline, or add one-off email recipients."
            : "Add saved contacts to this item."}
        </p>
      </div>

      {localError && (
        <div className="bg-error-container border border-error/20 text-on-error-container text-sm rounded-lg px-4 py-3">
          {localError}
        </div>
      )}

      <div className="space-y-3">
        {recipients.length === 0 ? (
          <div className="rounded-xl border border-dashed border-outline px-4 py-5 text-sm text-on-surface-variant">
            No recipients selected yet.
          </div>
        ) : (
          recipients.map((recipient) => {
            if (recipient.kind === "CONTACT") {
              const contact = contacts.find((entry) => entry.id === recipient.contactId);
              if (!contact) return null;

              return (
                <div
                  key={recipient.clientId}
                  className="rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-on-surface">{contact.name}</p>
                      {!contact.emailEnabled && (
                        <span className="inline-flex rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-medium text-on-surface-variant">
                          Email muted
                        </span>
                      )}
                      {contact.smsOptIn && (
                        <span className="inline-flex rounded-full bg-secondary-container/40 px-2 py-0.5 text-[10px] font-medium text-on-secondary-container">
                          SMS opt-in
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant mt-1">{contact.email}</p>
                    <p className="text-xs text-on-surface-variant">
                      Cell phone: {contact.cellPhone || "-"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRecipient(recipient.clientId)}
                    className="rounded-full border border-outline px-3 py-1 text-xs text-on-surface hover:bg-surface-container-low transition-colors"
                  >
                    Remove
                  </button>
                </div>
              );
            }

            if (recipient.kind === "INLINE_EMAIL") {
              return (
                <div
                  key={recipient.clientId}
                  className="rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 flex items-start justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-medium text-on-surface">{recipient.email}</p>
                    <p className="text-xs text-on-surface-variant mt-1">
                      One-off email recipient
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRecipient(recipient.clientId)}
                    className="rounded-full border border-outline px-3 py-1 text-xs text-on-surface hover:bg-surface-container-low transition-colors"
                  >
                    Remove
                  </button>
                </div>
              );
            }

            return (
              <div
                key={recipient.clientId}
                className="rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-on-surface">{recipient.name}</p>
                    <span className="inline-flex rounded-full bg-primary-fixed px-2 py-0.5 text-[10px] font-medium text-primary">
                      New contact
                    </span>
                    {!recipient.emailEnabled && (
                      <span className="inline-flex rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-medium text-on-surface-variant">
                        Email muted
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1">{recipient.email}</p>
                  <p className="text-xs text-on-surface-variant">
                    Cell phone: {recipient.cellPhone || "-"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeRecipient(recipient.clientId)}
                  className="rounded-full border border-outline px-3 py-1 text-xs text-on-surface hover:bg-surface-container-low transition-colors"
                >
                  Remove
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
        <div>
          <p className="text-sm font-medium text-on-surface">Add saved contact</p>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Search your contact list and add existing recipients.
          </p>
        </div>
        <input
          type="text"
          value={contactSearch}
          onChange={(e) => setContactSearch(e.target.value)}
          placeholder="Search contacts by name or email"
          className="w-full border border-outline rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-surface-container-lowest text-on-surface"
        />
        <div className="max-h-52 overflow-auto space-y-2">
          {filteredContacts.length === 0 ? (
            <p className="text-xs text-on-surface-variant">No matching saved contacts.</p>
          ) : (
            filteredContacts.map((contact) => (
              <button
                key={contact.id}
                type="button"
                onClick={() => addContact(contact.id)}
                className="w-full text-left rounded-xl border border-outline-variant px-3 py-2 hover:bg-surface-container-low transition-colors"
              >
                <span className="block text-sm font-medium text-on-surface">{contact.name}</span>
                <span className="block text-xs text-on-surface-variant">{contact.email}</span>
                {!contact.emailEnabled && (
                  <span className="mt-1 inline-flex rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-medium text-on-surface-variant">
                    Email muted
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {allowCustomRecipientEntry && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
            <div>
              <p className="text-sm font-medium text-on-surface">Add one-off email</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Use this when you do not want to save the recipient as a shared contact.
              </p>
            </div>
            <input
              type="email"
              value={inlineEmail}
              onChange={(e) => setInlineEmail(e.target.value)}
              placeholder="alerts@yourcompany.com"
              className="w-full border border-outline rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-surface-container-lowest text-on-surface"
            />
            <button
              type="button"
              onClick={addInlineEmail}
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:bg-primary-container transition-colors"
            >
              Add email
            </button>
          </div>

          <div className="space-y-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
            <div>
              <p className="text-sm font-medium text-on-surface">Create new contact</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                This contact will be created when you save the item.
              </p>
            </div>

            <input
              type="text"
              value={newContact.name}
              onChange={(e) => setNewContact((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Team member name"
              className="w-full border border-outline rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-surface-container-lowest text-on-surface"
            />
            <input
              type="email"
              value={newContact.email}
              onChange={(e) => setNewContact((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="teammate@yourcompany.com"
              className="w-full border border-outline rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-surface-container-lowest text-on-surface"
            />
            <input
              type="tel"
              value={newContact.cellPhone}
              onChange={(e) => setNewContact((prev) => ({ ...prev, cellPhone: e.target.value }))}
              placeholder="Cell phone (optional)"
              maxLength={30}
              className="w-full border border-outline rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-surface-container-lowest text-on-surface"
            />
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm text-on-surface">Email enabled</span>
              <input
                type="checkbox"
                checked={newContact.emailEnabled}
                onChange={(e) => setNewContact((prev) => ({ ...prev, emailEnabled: e.target.checked }))}
                className="h-4 w-4 accent-primary"
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm text-on-surface">SMS opt-in</span>
              <input
                type="checkbox"
                checked={newContact.smsOptIn}
                onChange={(e) => setNewContact((prev) => ({ ...prev, smsOptIn: e.target.checked }))}
                className="h-4 w-4 accent-primary"
              />
            </label>
            <button
              type="button"
              onClick={addNewContact}
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:bg-primary-container transition-colors"
            >
              Queue new contact
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
