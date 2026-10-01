import { describe, it, expect } from "vitest";
import { checkDeployConfig } from "../scripts/deploy-target.mjs";

const dev = {
  GIT_REF_NAME: "dev",
  VERCEL_TOKEN: "token",
  VERCEL_ORG_ID: "team_shared",
  VERCEL_PROJECT_ID: "prj_shared",
  APP_ENV: "dev",
  VERCEL_TARGET: "preview",
  APP_BASE_URL: "https://dev.example.com",
  PRODUCTION_HOST: "app.example.com",
};
const main = {
  ...dev,
  GIT_REF_NAME: "main",
  APP_ENV: "production",
  VERCEL_TARGET: "production",
  APP_BASE_URL: "https://app.example.com",
};

describe("deployment target validation", () => {
  it("accepts correctly mapped dev, uat and main targets", () => {
    expect(checkDeployConfig(dev)).toMatchObject({
      errors: [],
      target: {
        environment: "DEV",
        vercelTarget: "preview",
        host: "dev.example.com",
      },
    });
    expect(
      checkDeployConfig({
        ...dev,
        GIT_REF_NAME: "uat",
        APP_ENV: "uat",
        APP_BASE_URL: "https://uat.example.com/",
      }).errors,
    ).toEqual([]);
    expect(checkDeployConfig(main)).toMatchObject({
      errors: [],
      target: { environment: "PROD", vercelTarget: "production" },
    });
  });

  it("rejects branches without a mapping", () => {
    expect(
      checkDeployConfig({ ...dev, GIT_REF_NAME: "feature/x" }).errors,
    ).toHaveLength(1);
  });

  it("reports every missing value without echoing secrets", () => {
    const { errors } = checkDeployConfig({ GIT_REF_NAME: "dev" });
    expect(errors).toContain("VERCEL_TOKEN is not set.");
    expect(errors).toContain("PRODUCTION_HOST is not set.");
    expect(errors).toHaveLength(7);
  });

  it("rejects an APP_ENV or Vercel target that does not match the branch", () => {
    expect(
      checkDeployConfig({ ...dev, APP_ENV: "production" }).errors[0],
    ).toContain('must target "dev"');
    expect(
      checkDeployConfig({ ...dev, VERCEL_TARGET: "production" }).errors[0],
    ).toContain('must deploy to "preview"');
    expect(
      checkDeployConfig({ ...main, VERCEL_TARGET: "preview" }).errors,
    ).toHaveLength(1);
  });

  it("never lets dev or uat use the production host", () => {
    const { errors } = checkDeployConfig({
      ...dev,
      APP_BASE_URL: "https://APP.example.com",
    });
    expect(errors[0]).toContain("can never receive the production domain");
  });

  it("requires production to use the production host", () => {
    expect(
      checkDeployConfig({ ...main, APP_BASE_URL: "https://uat.example.com" })
        .errors[0],
    ).toContain("does not match PRODUCTION_HOST");
  });

  it("requires an https origin", () => {
    expect(
      checkDeployConfig({ ...dev, APP_BASE_URL: "http://dev.example.com" })
        .errors,
    ).toEqual(["APP_BASE_URL must use https."]);
    expect(
      checkDeployConfig({ ...dev, APP_BASE_URL: "https://dev.example.com/x" })
        .errors,
    ).toHaveLength(1);
    expect(
      checkDeployConfig({ ...dev, APP_BASE_URL: "not a url" }).errors,
    ).toEqual(["APP_BASE_URL is not a valid URL."]);
  });
});
