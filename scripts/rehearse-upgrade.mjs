// Rehearses upgrading the schema production runs (BASE_REF, default origin/main) to this commit (#91).
// Requires DATABASE_URL pointing at an empty disposable database. See docs/database-migrations.md.
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  rmSync,
  cpSync,
  readdirSync,
  writeFileSync,
  readFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import pg from "pg";

const BASE_REF = process.env.BASE_REF || "origin/main";
const ROOT = resolve(".");
const MIGRATIONS = join(ROOT, "prisma/migrations");
const WORK = join(ROOT, ".upgrade-rehearsal");
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const prisma = (...args) =>
  execFileSync("npx", ["prisma", ...args], {
    stdio: "inherit",
    env: process.env,
  });
const fail = (message) => {
  console.log(`::error::${message}`);
  process.exit(1);
};

if (!process.env.DATABASE_URL)
  fail("DATABASE_URL must point at an empty disposable database.");

// 1. Released migrations are immutable: every migration on the base must exist here unchanged.
const released = git("ls-tree", "--name-only", `${BASE_REF}:prisma/migrations`)
  .split("\n")
  .filter((name) => /^\d/.test(name));
if (!released.length)
  fail(`${BASE_REF} has no migrations; cannot rehearse an upgrade.`);
for (const name of released) {
  try {
    git("diff", "--quiet", BASE_REF, "--", `prisma/migrations/${name}`);
  } catch {
    fail(
      `Released migration ${name} was edited or removed. Add a new migration instead.`,
    );
  }
}

// 2. Recreate the base schema. Migrations sorting up to the base's newest one are included, so
// bridge migrations (dated earlier to repair fresh installs) are part of the baseline.
const latestReleased = released.sort().at(-1);
const current = readdirSync(MIGRATIONS)
  .filter((name) => /^\d/.test(name))
  .sort();
const baseline = current.filter((name) => name <= latestReleased);
const upgrade = current.filter((name) => name > latestReleased);
rmSync(WORK, { recursive: true, force: true });
mkdirSync(join(WORK, "migrations"), { recursive: true });
try {
  for (const name of baseline)
    cpSync(join(MIGRATIONS, name), join(WORK, "migrations", name), {
      recursive: true,
    });
  cpSync(
    join(MIGRATIONS, "migration_lock.toml"),
    join(WORK, "migrations/migration_lock.toml"),
  );
  writeFileSync(
    join(WORK, "prisma.config.ts"),
    `import { defineConfig } from "prisma/config";
export default defineConfig({
  schema: ${JSON.stringify(join(ROOT, "prisma/schema.prisma"))},
  migrations: { path: ${JSON.stringify(join(WORK, "migrations"))} },
  datasource: { url: process.env["DATABASE_URL"] },
});
`,
  );
  console.log(
    `Baseline (${BASE_REF}, up to ${latestReleased}): ${baseline.length} migrations`,
  );
  prisma("migrate", "deploy", "--config", join(WORK, "prisma.config.ts"));
} finally {
  rmSync(WORK, { recursive: true, force: true });
}

// 3. Seed fixtures that use only long-standing columns, then upgrade with the real configuration.
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
try {
  await db.query(
    readFileSync(join(ROOT, "scripts/upgrade-fixtures.sql"), "utf8"),
  );
  console.log(
    `Upgrade: ${upgrade.length ? upgrade.join(", ") : "no new migrations"}`,
  );
  prisma("migrate", "deploy");
  prisma("migrate", "status");

  // 4. Existing customer data survives the upgrade.
  const { rows } = await db.query(
    `SELECT u."email", i."name" FROM "InventoryItem" i JOIN "User" u ON u."id" = i."userId"
     WHERE i."id" = 'rehearsal-item'`,
  );
  if (
    rows[0]?.email !== "rehearsal@example.com" ||
    rows[0]?.name !== "Rehearsal soap"
  )
    fail("Fixture data did not survive the upgrade.");
  console.log(
    "Upgrade rehearsal passed: fixtures preserved and no pending migrations.",
  );
} finally {
  await db.end();
}
