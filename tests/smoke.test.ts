import { describe, it, expect, vi } from "vitest";
import { checkHealth, smoke } from "../scripts/smoke.mjs";

const expected = { appEnv: "uat", revision: "abc123" };
const healthy = { ok: true, appEnv: "uat", dbEnv: "uat", revision: "abc123" };

function response(body: unknown, status = 200) {
  return {
    status,
    json: async () => {
      if (body === undefined) throw new Error("not json");
      return body;
    },
  };
}

describe("checkHealth", () => {
  it("accepts a healthy response for the expected environment and revision", () => {
    expect(checkHealth(healthy, expected)).toEqual([]);
  });

  it("rejects the wrong app environment, database marker or revision", () => {
    expect(
      checkHealth({ ...healthy, appEnv: "production" }, expected)[0],
    ).toContain("APP_ENV");
    expect(
      checkHealth({ ...healthy, dbEnv: "production" }, expected)[0],
    ).toContain("environment marker");
    expect(checkHealth({ ...healthy, dbEnv: null }, expected)).toHaveLength(1);
    expect(checkHealth({ ...healthy, revision: "old" }, expected)[0]).toContain(
      "revision",
    );
    expect(checkHealth({ ...healthy, ok: false }, expected)[0]).toContain(
      "unreachable",
    );
  });

  it("rejects a non-JSON body", () => {
    expect(checkHealth(undefined, expected)).toHaveLength(1);
  });
});

describe("smoke", () => {
  it("retries until the new deployment answers", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response({ ...healthy, revision: "old" }))
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValueOnce(response(healthy));
    expect(
      await smoke("https://uat.example.com", expected, {
        fetchImpl,
        delayMs: 0,
      }),
    ).toEqual([]);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(String(fetchImpl.mock.calls[0][0])).toBe(
      "https://uat.example.com/api/health",
    );
  });

  it("fails after the last attempt with the last error", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(response({ ...healthy, appEnv: "dev" }));
    const errors = await smoke("https://uat.example.com", expected, {
      fetchImpl,
      attempts: 2,
      delayMs: 0,
    });
    expect(errors[0]).toContain("APP_ENV");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("treats an access-protection redirect or non-200 status as a failure", async () => {
    const redirect = vi.fn().mockResolvedValue(response(undefined, 302));
    expect(
      (
        await smoke("https://uat.example.com", expected, {
          fetchImpl: redirect,
          attempts: 1,
        })
      )[0],
    ).toContain("HTTP 302");
    const unhealthy = vi.fn().mockResolvedValue(response(healthy, 503));
    expect(
      (
        await smoke("https://uat.example.com", expected, {
          fetchImpl: unhealthy,
          attempts: 1,
        })
      )[0],
    ).toContain("HTTP 503");
  });

  it("sends the protection bypass header only when configured", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(healthy));
    await smoke("https://uat.example.com", expected, {
      fetchImpl,
      bypassSecret: "s3cret",
    });
    expect(
      fetchImpl.mock.calls[0][1].headers["x-vercel-protection-bypass"],
    ).toBe("s3cret");
    await smoke("https://uat.example.com", expected, { fetchImpl });
    expect(fetchImpl.mock.calls[1][1].headers).not.toHaveProperty(
      "x-vercel-protection-bypass",
    );
  });
});
