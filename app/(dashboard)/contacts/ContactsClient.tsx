"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Contact = {
  id: string;
  name: string;
  email: string;
  cellPhone: string | null;
  emailEnabled: boolean;
  smsOptIn: boolean;
  assignedItemCount: number;
};

const emptyForm = {
  name: "",
  email: "",
  cellPhone: "",
  emailEnabled: true,
  smsOptIn: false,
};

export default function ContactsClient({ initialContacts }: { initialContacts: Contact[] }) {
  const router = useRouter();
  const [contacts, setContacts] = useState(initialContacts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function startEditing(contact: Contact) {
    setEditingId(contact.id);
    setForm({
      name: contact.name,
      email: contact.email,
      cellPhone: contact.cellPhone ?? "",
      emailEnabled: contact.emailEnabled,
      smsOptIn: contact.smsOptIn,
    });
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload = {
      name: form.name,
      email: form.email,
      cellPhone: form.cellPhone || undefined,
      emailEnabled: form.emailEnabled,
      smsOptIn: form.smsOptIn,
    };

    try {
      const res = await fetch(
        editingId ? `/api/contacts/${editingId}` : "/api/contacts",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      if (editingId) {
        setContacts((prev) =>
          prev.map((contact) =>
            contact.id === editingId
              ? { ...contact, ...data }
              : contact
          )
        );
      } else {
        setContacts((prev) => [{ ...data, assignedItemCount: 0 }, ...prev]);
      }

      resetForm();
      router.refresh();
    } catch {
      setLoading(false);
      setError("An unexpected error occurred. Please try again.");
    }
  }

  async function handleDelete(contact: Contact) {
    if (!confirm(`Delete "${contact.name}"?`)) return;

    setError("");
    setDeletingId(contact.id);

    try {
      const res = await fetch(`/api/contacts/${contact.id}`, { method: "DELETE" });
      const data = await res.json();
      setDeletingId(null);

      if (!res.ok) {
        setError(data.error || "Could not delete contact.");
        return;
      }

      setContacts((prev) => prev.filter((current) => current.id !== contact.id));
      if (editingId === contact.id) resetForm();
      router.refresh();
    } catch {
      setDeletingId(null);
      setError("An unexpected error occurred. Please try again.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="bg-surface-container-lowest rounded-xl shadow-sm p-4 sm:p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-on-surface font-headline">
            {editingId ? "Edit Contact" : "New Contact"}
          </h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Contacts can be reused across items. Email muting is managed here.
          </p>
        </div>

        {error && (
          <div className="bg-error-container border border-error/20 text-on-error-container text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">
              Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
              maxLength={100}
              className="w-full border border-outline rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-surface-container-lowest text-on-surface"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              required
              className="w-full border border-outline rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-surface-container-lowest text-on-surface"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">
              Cell phone
            </label>
            <input
              type="tel"
              value={form.cellPhone}
              onChange={(e) => setForm((prev) => ({ ...prev, cellPhone: e.target.value }))}
              maxLength={30}
              placeholder="Optional"
              className="w-full border border-outline rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-surface-container-lowest text-on-surface"
            />
          </div>

          <div className="space-y-3 rounded-xl border border-outline-variant bg-surface-container-low p-4">
            <label className="flex items-center justify-between gap-3">
              <span>
                <span className="block text-sm font-medium text-on-surface">Email alerts</span>
                <span className="block text-xs text-on-surface-variant">
                  Allow this contact to receive alert emails.
                </span>
              </span>
              <input
                type="checkbox"
                checked={form.emailEnabled}
                onChange={(e) => setForm((prev) => ({ ...prev, emailEnabled: e.target.checked }))}
                className="h-4 w-4 accent-primary"
              />
            </label>

            <label className="flex items-center justify-between gap-3">
              <span>
                <span className="block text-sm font-medium text-on-surface">SMS opt-in</span>
                <span className="block text-xs text-on-surface-variant">
                  Stored for future SMS support. No texts are sent yet.
                </span>
              </span>
              <input
                type="checkbox"
                checked={form.smsOptIn}
                onChange={(e) => setForm((prev) => ({ ...prev, smsOptIn: e.target.checked }))}
                className="h-4 w-4 accent-primary"
              />
            </label>
          </div>

          <div className="md:col-span-2 flex flex-col-reverse gap-3 pt-2 sm:flex-row">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto bg-primary text-on-primary rounded-full px-5 py-2 text-sm font-medium hover:bg-primary-container disabled:opacity-50 transition-colors"
            >
              {loading ? (editingId ? "Saving..." : "Creating...") : editingId ? "Save contact" : "Create contact"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="w-full sm:w-auto border border-outline text-on-surface rounded-full px-5 py-2 text-sm hover:bg-surface-container-low transition-colors"
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
        {contacts.length === 0 ? (
          <div className="px-5 py-12 text-center text-on-surface-variant text-sm">
            No contacts yet. Create one above to reuse it across inventory items.
          </div>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {contacts.map((contact) => (
              <li key={contact.id} className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-on-surface">{contact.name}</h3>
                      {!contact.emailEnabled && (
                        <span className="inline-flex items-center rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-medium text-on-surface-variant">
                          Email muted
                        </span>
                      )}
                      {contact.smsOptIn && (
                        <span className="inline-flex items-center rounded-full bg-secondary-container/40 px-2 py-0.5 text-[10px] font-medium text-on-secondary-container">
                          SMS opt-in
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-on-surface-variant break-all">{contact.email}</p>
                    <p className="text-xs text-on-surface-variant">
                      Cell phone: {contact.cellPhone || "-"}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      Assigned to {contact.assignedItemCount} item{contact.assignedItemCount === 1 ? "" : "s"}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => startEditing(contact)}
                      className="border border-outline text-on-surface rounded-full px-4 py-2 text-sm hover:bg-surface-container-low transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(contact)}
                      disabled={deletingId === contact.id}
                      className="border border-error/30 text-error rounded-full px-4 py-2 text-sm hover:bg-error-container disabled:opacity-50 transition-colors"
                    >
                      {deletingId === contact.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
