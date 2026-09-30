import { vi, describe, it, expect, beforeEach } from "vitest";
const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));
import { sendAlertEmail, sendPasswordResetEmail } from "./resend";
beforeEach(() => send.mockReset());
describe("email provider responses", () => {
  it("rejects a returned SDK error instead of silently accepting it", async () => {
    send.mockResolvedValue({ data: null, error: { name: "validation_error" } });
    await expect(
      sendAlertEmail("recipient@example.com", "Soap"),
    ).rejects.toThrow("validation_error");
    await expect(
      sendPasswordResetEmail(
        "recipient@example.com",
        "https://example.com/reset",
      ),
    ).rejects.toThrow();
  });
  it("requires a provider message ID", async () => {
    send.mockResolvedValue({ data: {}, error: null });
    await expect(
      sendAlertEmail("recipient@example.com", "Soap"),
    ).rejects.toThrow("missing_message_id");
  });
  it("escapes item text and passes a stable retry key", async () => {
    send.mockResolvedValue({ data: { id: "email_1" }, error: null });
    await expect(
      sendAlertEmail("recipient@example.com", '<img src="evil">', "request-1"),
    ).resolves.toBe("email_1");
    expect(send.mock.calls[0][0].html).not.toContain('<img src="evil">');
    expect(send.mock.calls[0][1]).toEqual({ idempotencyKey: "request-1" });
  });
});
