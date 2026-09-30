import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { it, expect } from "vitest";
it("applies every migration to an empty PostgreSQL engine and preserves an existing inventory item", async () => {
  const db = new PGlite();
  try {
    const root = join(process.cwd(), "prisma/migrations");
    const migrations = readdirSync(root)
      .filter((name) => /^\d/.test(name))
      .sort();
    for (const name of migrations) {
      if (name.startsWith("202609")) {
        await db.exec(`INSERT INTO "User" ("id","email","tier","updatedAt") VALUES ('migration-user','migration@example.com','FREE',now());
          INSERT INTO "User" ("id","email","hashedPassword","tier","updatedAt") VALUES ('google-user','google@example.com','legacy-password','FREE',now());
          INSERT INTO "AuthIdentity" ("id","userId","provider","providerAccountId","updatedAt") VALUES ('google-id','google-user','GOOGLE','provider-id',now()), ('credentials-id','google-user','CREDENTIALS','google-user',now());
          INSERT INTO "InventoryItem" ("id","name","alertEmail","qrCodeId","userId","updatedAt") VALUES ('migration-item','Soap','migration@example.com','qr','migration-user',now());`);
      }
      await db.exec(readFileSync(join(root, name, "migration.sql"), "utf8"));
    }
    const users = await db.query<{
      sessionVersion: number;
      emailVerifiedAt: Date | null;
    }>(
      'SELECT "sessionVersion", "emailVerifiedAt" FROM "User" WHERE "id" = $1',
      ["migration-user"],
    );
    expect(users.rows[0]).toEqual({ sessionVersion: 1, emailVerifiedAt: null });
    expect(
      (
        await db.query('SELECT "name" FROM "InventoryItem" WHERE "id" = $1', [
          "migration-item",
        ])
      ).rows,
    ).toEqual([{ name: "Soap" }]);
    expect(
      (await db.query('SELECT count(*)::int AS n FROM "NotificationJob"')).rows,
    ).toEqual([{ n: 0 }]);
    expect(
      (
        await db.query(
          'SELECT "hashedPassword", "sessionVersion" FROM "User" WHERE "id" = $1',
          ["google-user"],
        )
      ).rows,
    ).toEqual([{ hashedPassword: null, sessionVersion: 2 }]);
    expect(
      (
        await db.query(
          'SELECT "provider" FROM "AuthIdentity" WHERE "userId" = $1',
          ["google-user"],
        )
      ).rows,
    ).toEqual([{ provider: "GOOGLE" }]);
    // An already-deployed FREE/PRO database must safely accept the bridge out of chronological order.
    await db.exec(
      readFileSync(
        join(root, "20260418190000_prepare_tier_refactor", "migration.sql"),
        "utf8",
      ),
    );
    const defaults = await db.query<{ column_default: string }>(
      `SELECT column_default FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'tier'`,
    );
    expect(defaults.rows[0].column_default).toContain("FREE");
  } finally {
    await db.close();
  }
}, 30000);
