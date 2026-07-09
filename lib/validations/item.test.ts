import { describe, it, expect } from "vitest";
import { createItemSchema, updateItemSchema } from "./item";

const validItem = {
  name: "Paper towels",
  alertEmail: "alerts@example.com",
};

describe("createItemSchema", () => {
  it("accepts a minimal valid item", () => {
    expect(createItemSchema.safeParse(validItem).success).toBe(true);
  });

  it("requires a non-empty name and caps it at 100 chars", () => {
    expect(createItemSchema.safeParse({ ...validItem, name: "" }).success).toBe(false);
    expect(
      createItemSchema.safeParse({ ...validItem, name: "x".repeat(101) }).success
    ).toBe(false);
    expect(
      createItemSchema.safeParse({ ...validItem, name: "x".repeat(100) }).success
    ).toBe(true);
  });

  it("rejects invalid alert emails but allows omission", () => {
    expect(
      createItemSchema.safeParse({ ...validItem, alertEmail: "not-an-email" }).success
    ).toBe(false);
    expect(createItemSchema.safeParse({ name: "Item" }).success).toBe(true);
  });

  it("bounds scanCooldownMinutes to 1–1440 integers", () => {
    for (const [value, ok] of [
      [1, true],
      [1440, true],
      [0, false],
      [1441, false],
      [60.5, false],
    ] as const) {
      expect(
        createItemSchema.safeParse({ ...validItem, scanCooldownMinutes: value }).success
      ).toBe(ok);
    }
  });

  it("caps scanAcknowledgement at 280 chars", () => {
    expect(
      createItemSchema.safeParse({
        ...validItem,
        scanAcknowledgement: "x".repeat(281),
      }).success
    ).toBe(false);
  });

  it("bounds lowStockThreshold and allows null", () => {
    expect(
      createItemSchema.safeParse({ ...validItem, lowStockThreshold: 0 }).success
    ).toBe(false);
    expect(
      createItemSchema.safeParse({ ...validItem, lowStockThreshold: 10000 }).success
    ).toBe(false);
    expect(
      createItemSchema.safeParse({ ...validItem, lowStockThreshold: null }).success
    ).toBe(true);
  });

  it("validates alertRecipients discriminated union", () => {
    expect(
      createItemSchema.safeParse({
        ...validItem,
        alertRecipients: [{ kind: "INLINE_EMAIL", email: "person@example.com" }],
      }).success
    ).toBe(true);
    expect(
      createItemSchema.safeParse({
        ...validItem,
        alertRecipients: [{ kind: "INLINE_EMAIL", email: "bad" }],
      }).success
    ).toBe(false);
    expect(
      createItemSchema.safeParse({
        ...validItem,
        alertRecipients: [{ kind: "CONTACT", contactId: "" }],
      }).success
    ).toBe(false);
  });
});

describe("updateItemSchema", () => {
  it("accepts partial updates", () => {
    expect(updateItemSchema.safeParse({ description: "New" }).success).toBe(true);
  });

  it("accepts a valid labelLayout and rejects unknown sizes", () => {
    const layout = {
      size: "3x1",
      qrPosition: "left",
      elements: [{ id: "a", text: "t", x: 1, y: 2, fontSize: 10, bold: false }],
    };
    expect(updateItemSchema.safeParse({ labelLayout: layout }).success).toBe(true);
    expect(
      updateItemSchema.safeParse({ labelLayout: { ...layout, size: "4x2" } }).success
    ).toBe(false);
    expect(updateItemSchema.safeParse({ labelLayout: null }).success).toBe(true);
  });
});
