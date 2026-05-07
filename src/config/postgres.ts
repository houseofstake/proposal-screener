const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL must be set for Postgres access.");
}

export const postgresConfig = {
  url: DATABASE_URL,
};
