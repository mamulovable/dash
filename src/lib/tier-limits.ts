export type UserTier = "starter" | "pro" | "agency";

export interface TierLimits {
  queries_per_month: number;
  max_rollover: number;
  max_data_sources: number;
  max_columns: number;
  max_users: number;
  features: string[];
}

export const TIER_LIMITS: Record<UserTier, TierLimits> = {
  starter: {
    queries_per_month: 50,
    max_rollover: 100,
    max_data_sources: 5,
    max_columns: 10,
    max_users: 1,
    features: ["csv"],
  },
  pro: {
    queries_per_month: 150,
    max_rollover: 300,
    max_data_sources: 15,
    max_columns: 25,
    max_users: 5,
    features: ["csv", "sheets", "postgres", "mysql", "team", "pdf_export"],
  },
  agency: {
    queries_per_month: 300,
    max_rollover: 600,
    max_data_sources: Infinity,
    max_columns: 50,
    max_users: Infinity,
    features: [
      "csv",
      "sheets",
      "postgres",
      "mysql",
      "api",
      "team",
      "pdf_export",
      "whitelabel",
      "api_access",
    ],
  },
};

export interface User {
  id: string;
  tier: UserTier;
  queries_used: number;
  queries_limit: number;
}

export function canUseFeature(tier: UserTier, feature: string): boolean {
  return TIER_LIMITS[tier].features.includes(feature);
}

export function canAddDataSource(tier: UserTier, currentCount: number): boolean {
  return currentCount < TIER_LIMITS[tier].max_data_sources;
}

export function canSelectColumns(tier: UserTier, selectedCount: number): boolean {
  return selectedCount <= TIER_LIMITS[tier].max_columns;
}

export function canMakeQuery(user: User, isCached: boolean): boolean {
  if (isCached) return true; // Cached queries don't count
  return user.queries_used < user.queries_limit;
}

export function getRemainingQueries(user: User): number {
  return Math.max(0, user.queries_limit - user.queries_used);
}

export function getQueryStatus(user: User): "ok" | "warning" | "critical" {
  const remaining = getRemainingQueries(user);
  if (remaining <= 5) return "critical";
  if (remaining <= 15) return "warning";
  return "ok";
}

export function getUpgradeMessage(
  tier: UserTier,
  action: string
): string | null {
  if (tier === "agency") return null;
  
  const nextTier = tier === "starter" ? "Pro" : "Agency";
  
  switch (action) {
    case "data_sources":
      return `Upgrade to ${nextTier} for more data sources`;
    case "columns":
      return `Upgrade to ${nextTier} to select more columns`;
    case "queries":
      return `Upgrade to ${nextTier} for more monthly queries`;
    case "sheets":
      return "Upgrade to Pro to connect Google Sheets";
    case "database":
      return "Upgrade to Pro to connect databases";
    case "team":
      return "Upgrade to Pro for team collaboration";
    case "whitelabel":
      return "Upgrade to Agency for white-label features";
    default:
      return `Upgrade to ${nextTier} to unlock this feature`;
  }
}






