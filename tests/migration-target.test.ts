import { describe, it, expect, afterAll } from "vitest";
import pg from "pg";
import {
  checkConfig,
  checkMarker,
  checkNeonEndpoint,
  readTarget,
} from "../scripts/migration-target.mjs";

const dev = {
  GIT_REF_NAME: "dev",
  APP_ENV: "dev",
  NEON_PROJECT_ID: "proj-shared",
  NEON_BRANCH_ID: "br-dev",
  NEON_ENDPOINT_ID: "ep-dev-123",
  MIGRATION_DATABASE_URL:
    "postgresql://migrator:secret@ep-dev-123.us-east-2.aws.neon.tech/neondb?sslmode=require",
};

describe("migration target validation", () => {
  it("accepts a correctly mapped dev target", () => {
    expect(checkConfig(dev)).toEqual([]);
    expect(
      checkMarker(dev, { app_env: "dev", neon_branch_id: "br-dev" }),
    ).toEqual([]);
  });

  it("rejects branches without a mapping", () => {
    expect(checkConfig({ ...dev, GIT_REF_NAME: "feature/x" })).toHaveLength(1);
  });

  it("fails closed when configuration is missing", () => {
    expect(checkConfig({ ...dev, NEON_BRANCH_ID: "" })).toEqual([
      "NEON_BRANCH_ID is not set.",
    ]);
  });

  it("rejects an APP_ENV that does not match the Git branch", () => {
    expect(checkConfig({ ...dev, APP_ENV: "production" })[0]).toContain(
      'must target "dev"',
    );
    expect(
      checkConfig({ ...dev, GIT_REF_NAME: "main", APP_ENV: "uat" })[0],
    ).toContain('must target "production"');
  });

  it("rejects a dev job whose credentials point at the UAT or production endpoint", () => {
    const errors = checkConfig({
      ...dev,
      MIGRATION_DATABASE_URL:
        "postgresql://migrator:secret@ep-prod-999.us-east-2.aws.neon.tech/neondb?sslmode=require",
    });
    expect(errors[0]).toContain('expected "ep-dev-123"');
    expect(errors.join()).not.toContain("secret");
  });

  it("rejects a dev database marked as UAT or production", () => {
    expect(
      checkMarker(dev, { app_env: "uat", neon_branch_id: "br-uat" }),
    ).toHaveLength(2);
    expect(
      checkMarker(dev, { app_env: "production", neon_branch_id: "br-prod" })[0],
    ).toContain('marked "production"');
  });

  it("rejects a production marker copied into a child branch", () => {
    const uat = {
      ...dev,
      GIT_REF_NAME: "uat",
      APP_ENV: "uat",
      NEON_BRANCH_ID: "br-uat",
    };
    expect(
      checkMarker(uat, {
        app_env: "production",
        neon_branch_id: "br-prod",
      }).join(" "),
    ).toContain("copied from a parent branch");
  });

  it("rejects a missing marker", () => {
    expect(checkMarker(dev, undefined)[0]).toContain("no environment marker");
  });

  it("requires the direct endpoint and TLS", () => {
    const pooled = checkConfig({
      ...dev,
      MIGRATION_DATABASE_URL:
        "postgresql://migrator:secret@ep-dev-123-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require",
    });
    expect(pooled[0]).toContain("pooler");
    const plain = checkConfig({
      ...dev,
      MIGRATION_DATABASE_URL:
        "postgresql://migrator:secret@ep-dev-123.us-east-2.aws.neon.tech/neondb",
    });
    expect(plain[0]).toContain("sslmode");
  });

  it("rejects a Neon endpoint that belongs to another branch or project", () => {
    expect(
      checkNeonEndpoint(dev, {
        project_id: "proj-shared",
        branch_id: "br-dev",
      }),
    ).toEqual([]);
    expect(
      checkNeonEndpoint(dev, {
        project_id: "proj-other",
        branch_id: "br-prod",
      }),
    ).toHaveLength(2);
  });
});

describe.skipIf(!process.env.TEST_DATABASE_URL)(
  "environment marker lookup",
  () => {
    const url = process.env.TEST_DATABASE_URL!;
    const sql = async (text: string) => {
      const client = new pg.Client({ connectionString: url });
      await client.connect();
      try {
        await client.query(text);
      } finally {
        await client.end();
      }
    };
    afterAll(() => sql("DROP SCHEMA IF EXISTS invalert_ops CASCADE"));

    it("reports a missing marker and reads a provisioned one with a restore point", async () => {
      await sql("DROP SCHEMA IF EXISTS invalert_ops CASCADE");
      expect((await readTarget(url)).marker).toBeUndefined();
      await sql(`CREATE SCHEMA invalert_ops;
      CREATE TABLE invalert_ops.environment_marker (
        singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
        app_env text NOT NULL CHECK (app_env IN ('dev', 'uat', 'production')),
        neon_branch_id text NOT NULL,
        provisioned_at timestamptz NOT NULL DEFAULT now()
      );
      INSERT INTO invalert_ops.environment_marker (app_env, neon_branch_id) VALUES ('dev', 'br-dev');`);
      const target = await readTarget(url);
      expect(target.marker).toEqual({
        app_env: "dev",
        neon_branch_id: "br-dev",
      });
      expect(target.restorePoint.lsn).toMatch(/^[0-9A-F]+\/[0-9A-F]+$/);
    });
  },
);
