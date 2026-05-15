const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL && process.env.NODE_ENV !== "development") {
  throw new Error("DATABASE_URL must be set for Postgres access.");
}

export const postgresConfig = {
  url: DATABASE_URL ?? "",
};
