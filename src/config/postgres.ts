const isProd = process.env.NODE_ENV === "production";

const DEPLOY_DATABASE_URL =
  process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
const LOCAL_DATABASE_URL =
  process.env.LOCAL_DATABASE_URL || "postgres://localhost:5432/near_gov";
const DATABASE_URL = isProd
  ? DEPLOY_DATABASE_URL
  : process.env.LOCAL_DATABASE_URL || DEPLOY_DATABASE_URL || LOCAL_DATABASE_URL;

if (!DEPLOY_DATABASE_URL && isProd) {
  throw new Error(
    "DATABASE_URL/RAILWAY_DATABASE_URL must be set in production for Postgres access."
  );
}

export const postgresConfig = {
  url: DATABASE_URL!,
};
