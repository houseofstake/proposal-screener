# NEAR Proposal Screener

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

A focused tool for **evaluating NEAR governance proposal drafts** with AI. Paste a proposal, sign with your NEAR wallet, and receive a structured screening report with concrete suggested edits for any issue the model flags.

This repo is a stripped-down fork of the broader NEAR Governance Dashboard. Discourse summarisation, conversational drafting, revision tracking, and the rest of the dashboard surface area have all been removed; what remains is the single screening pipeline.

## User Journey

1. Paste a proposal title and body into the screener.
2. Connect a NEAR wallet (NEP-413 sign-in).
3. The proposal is screened by `openai/gpt-oss-120b` on NEAR AI Cloud.
4. The UI renders pass/fail per criterion, attention scores, an overall summary, and — for any failing quality criterion — a markdown **suggested edit** the author can paste back into the draft.
5. Each run is persisted under a server-generated `submissionId` so the same author can fetch their result later.

## Screening Criteria

Each evaluation returns six **Quality Criteria** (all must pass for the proposal to be marked ready) and two **Attention Scores**.

**Quality (pass / fail + suggestedEdit on failure):**

1. **Complete** — Includes all required template elements for the proposal type (funding, governance, operational).
2. **Legible** — Clearly identifies *what* will be done, *who* will do it, *why* it should be approved, and *what outcomes* are expected.
3. **Consistent** — Budgets, dates, scope, and team members do not contradict each other across sections.
4. **Compliant** — Adheres to the NEAR Constitution, HSP-001 template, and Code of Conduct.
5. **Justified** — Logical chain from problem → solution → resources → outcomes.
6. **Measurable** — Includes at least one concrete, verifiable success metric.

**Attention (informational, scored high / medium / low):**

- **Relevant** — Relevance to the NEAR ecosystem.
- **Material** — Magnitude of potential impact or risk.

For each failing quality criterion the model returns a self-contained markdown snippet anchored to the relevant HSP-001 section, ready to paste into the draft. Passing criteria return an empty `suggestedEdit`.

## Tech Stack

| Category           | Technology                            |
| ------------------ | ------------------------------------- |
| **Framework**      | Next.js (Pages Router)                |
| **Language**       | TypeScript                            |
| **Database**       | PostgreSQL + Drizzle ORM              |
| **AI Provider**    | NEAR AI Cloud (`openai/gpt-oss-120b`) |
| **NEAR Wallet**    | `@hot-labs/near-connect`              |
| **Authentication** | `near-sign-verify` (NEP-413)          |
| **UI**             | shadcn/ui, Tailwind CSS               |
| **Tests**          | Vitest, Playwright                    |
| **Package mgr**    | Bun                                   |

## Quick Start

```bash
# 1. Install
bun install

# 2. Configure environment
cp .env.example .env.local
# Required:  DATABASE_URL, NEAR_AI_CLOUD_API_KEY
# Optional:  NEXT_PUBLIC_PLAUSIBLE_DOMAIN, NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
#            NEXT_PUBLIC_SITE_URL / APP_BASE_URL,
#            INTEL_TDX_ATTESTATION_URL + INTEL_TDX_API_KEY (for TEE attestation),
#            VERIFY_USE_MOCKS=true (skips Intel / NRAS calls in dev)
# Note: NEAR network id is auto-selected — testnet in dev, mainnet in production.

# 3. Run migrations
bun run db:migrate

# 4. Start
bun run dev
```

The dev server runs at <http://localhost:3000>. The whole app is a single page — `/` — that loads the screener form.

## API Endpoints

| Method | Path                                | Auth          | Purpose                                                  |
| ------ | ----------------------------------- | ------------- | -------------------------------------------------------- |
| `POST` | `/api/screen`                       | NEP-413 token | Sanitize → screen via NEAR AI → persist → return result. |
| `GET`  | `/api/getAnalysis/[submissionId]`   | NEP-413 token | Fetch a previously-saved screening (submitter-only).     |
| `GET`  | `/api/verification/proof`           | -             | Verifiable-inference proof retrieval.                    |
| `GET`  | `/api/verification/nras`            | -             | NRAS attestation lookup.                                 |
| `POST` | `/api/verification/register-session`| -             | Register a verification session.                         |
| `GET`  | `/api/verification/session`         | -             | Fetch a verification session.                            |

`POST /api/screen` returns:

```jsonc
{
  "submissionId": "uuid",
  "evaluation": { /* Evaluation object — see src/types/evaluation.ts */ },
  "authenticatedAs": "alice.near",
  "verification": { /* TEE attestation metadata, if available */ },
  "verificationId": "msg-id",
  "model": "openai/gpt-oss-120b"
}
```

## Authentication Flow

The client uses `near-sign-verify`'s `sign()` to produce a Bearer token from the connected wallet (`recipient: "social.near"`). The server verifies the token in `src/server/screening.ts` via `verify(token, { expectedRecipient: "social.near", nonceMaxAge: 5min })` and treats the recovered `accountId` as the authenticated submitter.

Rate limiting is keyed off `accountId` and configured in `src/config/rateLimit.ts`.

## Persistence Model

All results are persisted to a single `screening_results` table keyed on a server-generated UUID `submissionId`. There is no notion of revisions, topics, or external forum sources — every screening run is a fresh row.

See `src/lib/db/schema.ts` and `drizzle/0000_init_screening_results.sql` for the exact shape.

## Repository Layout

```
src/
├── components/
│   ├── nav/                  Navigation
│   ├── proposal/             ProposalScreener.tsx (the entire UI surface)
│   ├── ui/                   shadcn/ui primitives
│   └── verification/         TEE attestation widgets
├── config/                   NEAR + rate-limit config
├── hooks/                    useNear, useVerification
├── lib/
│   ├── db/                   Drizzle schema + queries (submissionId-keyed)
│   ├── prompts/              screenProposal.ts (the screening prompt)
│   └── analytics.ts          Plausible
├── pages/
│   ├── api/screen.ts         POST screen + persist
│   ├── api/getAnalysis/      GET stored analysis
│   ├── api/verification/     Attestation endpoints
│   └── index.tsx             Renders <ProposalScreener />
├── server/                   Server-only screening + auth helpers
├── types/                    Evaluation + verification types
└── utils/                    Attestation/verification helpers
```

## Resources

- [NEAR AI Cloud](https://near.ai)
- [NEP-413 (off-chain wallet signing)](https://github.com/near/NEPs/blob/master/neps/nep-0413.md)
- [HSP-001 governance proposal template](https://github.com/near/governance)

## License

MIT
