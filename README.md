# NEAR Proposal Screener

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

BETA tool for **evaluating NEAR governance proposal drafts** with AI. Paste a proposal, sign with your NEAR wallet, and receive a structured screening report with concrete suggested edits for any issue the model flags.

This repo is a stripped-down fork of the broader [NEAR Governance Dashboard](https://github.com/houseofstake/neargov). Discourse summarisation, conversational drafting, revision tracking, and the rest of the dashboard surface area have all been removed; what remains is the single screening pipeline.

> **Status: internal preview (v1).** Access requires a NEAR wallet signature. Screening results are private to the submitting account.

## User Journey

1. Paste a proposal title and body into the screener.
2. Connect a NEAR wallet (NEP-413 sign-in).
3. The proposal is screened by the configured AI provider. By default this is `openai/gpt-oss-120b` on NEAR AI Cloud; `SCREENING_MODEL_PROVIDER=minimax` switches screening to MiniMax.
4. The UI renders pass/fail per criterion, attention scores, an overall summary, and — for any failing quality criterion — a markdown **suggested edit** the author can paste back into the draft.
5. Each run is persisted under a server-generated `submissionId` and gets a read-only URL (`/screening/<submissionId>`) the submitting wallet can open later.

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

- **Relevant** — Relevance to the NEAR ecosystem and the current House of Stake season mandate.
- **Material** — Magnitude of potential impact or risk.

For each failing quality criterion the model returns a self-contained markdown snippet anchored to the relevant HSP-001 section, ready to paste into the draft. Passing criteria return an empty `suggestedEdit`.

## Tech Stack

| Category           | Technology                            |
| ------------------ | ------------------------------------- |
| **Framework**      | Next.js (Pages Router)                |
| **Language**       | TypeScript                            |
| **Database**       | PostgreSQL + Drizzle ORM              |
| **AI Provider**    | NEAR AI Cloud (`openai/gpt-oss-120b`) or MiniMax (`MiniMax-M2.7`) |
| **NEAR Wallet**    | `@hot-labs/near-connect`              |
| **Authentication** | `near-sign-verify` (NEP-413)          |
| **UI**             | shadcn/ui, Tailwind CSS               |
| **Tests**          | Vitest, Playwright                    |
| **Package mgr**    | pnpm                                  |

## Quick Start

```bash
# 1. Install
pnpm install

# 2. Configure environment
cp .env.example .env.local
# Required:  DATABASE_URL plus the selected provider key:
#            NEAR_AI_CLOUD_API_KEY (nearai) or MINIMAX_API_KEY (minimax)
# Optional:  NEXT_PUBLIC_PLAUSIBLE_DOMAIN, NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
#            NEXT_PUBLIC_SITE_URL,
#            INTEL_TDX_ATTESTATION_URL + INTEL_TDX_API_KEY (for TEE attestation),
#            SCREENING_MODEL_PROVIDER=minimax + MINIMAX_API_KEY,
#            VERIFY_USE_MOCKS=true (skips Intel / NRAS calls in dev)
# Note: NEAR network id is auto-selected — testnet in dev, mainnet in production.

# 3. Run migrations
pnpm run db:migrate

# 4. Start
pnpm run dev
```

The dev server runs at <http://localhost:3000>. The two pages are `/` (the screener form) and `/screening/<submissionId>` (a read-only view of a saved screening).

## Access control

Both `/api/screen` and `/api/getAnalysis/[submissionId]` are gated by NEP-413 wallet authentication. Saved analyses are readable only by the original submitting wallet; other accounts receive a 404 for that `submissionId`.

## Pages

| Route                          | Description                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `/`                            | Screener form. Paste → wallet sign → screen → result with a "Copy share link" button.                  |
| `/screening/<submissionId>`    | Read-only view of a saved screening. Requires wallet connect + sign as the original submitting account. |

## API Endpoints

| Method | Path                                | Auth                | Purpose                                                       |
| ------ | ----------------------------------- | ------------------- | ------------------------------------------------------------- |
| `POST` | `/api/screen`                       | NEP-413 | Sanitize → screen via configured AI provider → persist → return result. |
| `GET`  | `/api/getAnalysis/[submissionId]`   | NEP-413 | Fetch a saved screening. Readable by the original submitting account. |
| `GET`  | `/api/verification/proof`           | -                   | Verifiable-inference proof retrieval.                         |
| `GET`  | `/api/verification/nras`            | -                   | NRAS attestation lookup.                                      |
| `POST` | `/api/verification/register-session`| -                   | Register a verification session.                              |
| `GET`  | `/api/verification/session`         | -                   | Fetch a verification session.                                 |

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

The corresponding result URL is `${NEXT_PUBLIC_SITE_URL}/screening/<submissionId>`.

## Authentication Flow

The client uses `near-sign-verify`'s `sign()` to produce a Bearer token from the connected wallet (`recipient: "social.near"`). The server verifies the token in `src/server/screening.ts` via `verify(token, { expectedRecipient: "social.near", nonceMaxAge: 5min })` and treats the recovered `accountId` as the authenticated caller.

Rate limiting is keyed off `accountId` and configured in `src/config/rateLimit.ts`.

## Persistence Model

All results are persisted to a single `screening_results` table keyed on a server-generated UUID `submissionId`. There is no notion of revisions, topics, or external forum sources — every screening run is a fresh row. Saved rows are readable only by the submitting NEAR account.

See `src/lib/db/schema.ts` and `drizzle/0000_init_screening_results.sql` for the exact shape.

## Deployment

The v1 internal preview runs on **Railway** with Railway Postgres. Required production env vars:

- `NEAR_AI_CLOUD_API_KEY` when `SCREENING_MODEL_PROVIDER` is unset or `nearai`
- `MINIMAX_API_KEY` when `SCREENING_MODEL_PROVIDER=minimax`
- `DATABASE_URL=${{Postgres.DATABASE_URL}}`

Optional:

- `SCREENING_MODEL_PROVIDER` (`nearai` by default; also accepts `nirai` / `near`; set `minimax` for MiniMax)
- `NEAR_AI_MODEL` (defaults to `openai/gpt-oss-120b`)
- `MINIMAX_MODEL` (defaults to `MiniMax-M2.7`)
- `NEXT_PUBLIC_SITE_URL` (only if you want to force a custom canonical origin; otherwise Railway's public domain is used)
- `INTEL_TDX_ATTESTATION_URL` + `INTEL_TDX_API_KEY` (TEE attestation; if unset, attestation verification is skipped)
- `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`

Confirm `VERIFY_USE_MOCKS` is **unset** in production. Railway runs `pnpm run db:migrate` before each deployment; for a manual production migration, run that same command with `DATABASE_URL` set.

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
│   ├── api/screen.ts         POST screen + persist (NEP-413)
│   ├── api/getAnalysis/      GET stored analysis (NEP-413)
│   ├── api/verification/     Attestation endpoints
│   ├── screening/            [submissionId].tsx — read-only result view
│   └── index.tsx             Renders <ProposalScreener />
├── server/                   Server-only screening, auth, and access-control helpers
├── types/                    Evaluation + verification types
└── utils/                    Attestation/verification helpers
```

## Resources

- [NEAR AI Cloud](https://near.ai)
- [NEP-413 (off-chain wallet signing)](https://github.com/near/NEPs/blob/master/neps/nep-0413.md)
- [HSP-001 governance proposal template](https://github.com/near/governance)

## License

MIT
