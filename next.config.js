/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Ensure all binding reference documents (Article 6 requirements, Season 1
  // scope reference, additional-requirements living doc) are bundled with the
  // serverless API routes that load them at module init.
  // Next.js NFT (Node File Tracing) usually picks up `fs.readFileSync(path.join(process.cwd(), ...))`
  // automatically, but we trace the whole docs folder explicitly so adding new
  // files (e.g., the living requirements doc) doesn't require a config change.
  outputFileTracingIncludes: {
    "/api/screen": ["./src/lib/docs/**"],
  },
};

module.exports = config;
