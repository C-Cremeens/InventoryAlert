import { getAppEnv } from "@/lib/app-env";

export default function NonProductionBanner() {
  const label =
    getAppEnv() === "uat" ? "UAT" : getAppEnv() === "dev" ? "DEV" : "PREVIEW";
  return (
    <div
      role="note"
      className="w-full bg-amber-400 px-4 py-1 text-center text-xs font-semibold text-black"
    >
      {label} environment — test data only. Not the live InventoryAlert service.
    </div>
  );
}
