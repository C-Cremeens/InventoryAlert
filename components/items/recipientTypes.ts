export type AlertContactOption = {
  id: string;
  name: string;
  email: string;
  cellPhone: string | null;
  emailEnabled: boolean;
  smsOptIn: boolean;
};

export type ItemRecipientDraft =
  | {
      clientId: string;
      kind: "CONTACT";
      contactId: string;
    }
  | {
      clientId: string;
      kind: "INLINE_EMAIL";
      email: string;
    }
  | {
      clientId: string;
      kind: "NEW_CONTACT";
      name: string;
      email: string;
      cellPhone: string;
      emailEnabled: boolean;
      smsOptIn: boolean;
    };
