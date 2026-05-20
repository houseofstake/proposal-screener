# House of Stake Proposal Screening — Additional Requirements (Living Document)

> **This file is a living document.** Add new screening rules here as House of Stake's expectations evolve. Anything written under a category heading below is treated as **binding** by the screening agent, on equal footing with the canonical Article 6 requirements and the Season 1 scope reference.

## How to use this file

- **Each H2 heading below corresponds to one screening criterion.** Add new rules as bullet points under the matching heading.
- **Use the `## Global / All Criteria` section** for rules that apply to every criterion (e.g., a baseline check that must hold across the whole proposal).
- **Be specific.** Each rule should be precise enough that two different reviewers would reach the same decision. Bad: "proposal should be clear." Good: "if the proposal requests more than 10,000 NEAR, the Approach must compare against at least one alternative use of the same funds."
- **Cite the Article 6 section the rule attaches to** when relevant, e.g., "the **## Implementation Plan** must include a rollback procedure if the Payload modifies on-chain state."
- **If a rule should also produce a `suggestedEdit` snippet on failure**, write the rule in a way that makes the fix obvious — the agent will draft a suggested edit anchored to the relevant Article 6 section.
- **Empty sections mean no extra rules apply for that criterion** — leave the heading in place to keep the structure stable.
- **Restart the dev server after editing** — the file is loaded once at module startup.

---

## Global / All Criteria

**All Stakeholders confirmed availability and bandwidth** _(added 2026-05-07)_. For any proposal, the proposal author must confirm that ALL stakeholders listed in the RACI and across the proposal:
- Have explicitly confirmed their availability and sufficient bandwidth to execute within the proposed timelines
- If the House of Stake team (HoS) is included in the RACI, their availability, capacity, and bandwidth have been explicitly confirmed
- If the HoS is not included in the RACI, assess whether their involvement is required; if so, request clarification and update the RACI accordingly\
- It is not acceptable to defer confirmation of stakeholder availability, bandwidth, or timelines until after proposal approval

**End-to-end Value Hypothesis** _(added 2026-05-07)_. A Proposals must be structured to deliver the full stated value through the execution of the proposal itself. The proposal should be complete and self-sufficient, without relying on undefined future work.
The following patterns are not acceptable:
- Deferring core components to future proposals (e.g., “The technical and financial details of the reward distribution mechanism (including smart contract specifications, distribution frequency, calculation methods, and claiming procedures) are beyond the scope of this proposal and will be addressed in a separate technical implementation proposal.”) → All critical technical, operational, and financial components must be included in a single, comprehensive proposal
- Requesting full funding while planning an initial test phase that might affect the value hypothesis, the deliverables, milestones, stakeholders, RACI (e.g., ““We’ll run a test first, and based on the learnings we’ll build the final product with a funding requirement outlined in this proposal.” )→ Instead, request funding for the test phase, return with validated results, and submit a follow-up proposal for full implementation
- Referencing future or undefined partnerships (e.g., “We’ll onboard additional partners.”) → If partners are critical to success, they must be secured in advance, included in the stakeholder list/RACI, and reflected in the proposal

## Complete

**Mechanisms Specification** _(added 2026-05-07)_. All mechanisms included in a proposal must be fully and unambiguously specified to enable implementation.

Any calculations (e.g., performance criteria for rewards) must include:
a) A concise plain-language description of the logic and intent
b) The exact mathematical formula required for implementation
c) A complete definition of all variables and parameters used in the formula\

## Legible

_Additional clarity / readability requirements._

- _(none yet)_

## Consistent

_Additional internal-coherence requirements._

- _(none yet)_


## Compliant

_Additional formatting, conduct, or HoS-norm requirements beyond §6.2 / §6.3._

**RACI placement** _(added 2026-05-15)_. The RACI matrix may appear in any section of the proposal. It is not required to be in **## Stakeholders**. Fail only if no RACI matrix is present anywhere in the proposal.

## Justified

_Additional logical-chain requirements._

- _(none yet)_


## Measurable

_Additional KPI / success-criteria requirements._

- _(none yet)_

## Relevant

_Additional Season-mandate / scope rules beyond the Season 1 reference._

- _(none yet)_

## Material

_Additional impact / risk-magnitude rules._

- _(none yet)_

---

## Notes / Discussion (non-binding)

**Frontmatter title/description character limits removed** _(added 2026-05-15)_. The Article 6 template previously specified a maximum of 44 characters for the frontmatter `title` field and 140 characters for the `description` field. These limits were a technical constraint of the 2025 voting system and no longer apply. Do not flag proposals for exceeding these lengths.

_Use this section for context, rationale, or links that inform the rules above but should NOT be enforced as standalone requirements. The agent treats this section as informational only._

**Opportunity-cost comparison for funding requests** _(added 2026-05-07)_. Any proposal whose **## Budget & Resources** requests more than **10,000 NEAR** (or equivalent in USD/USDC stablecoins, using the rate stated in the proposal or the prevailing rate at submission) must, in **## Approach**, name at least one concrete alternative use of the same funds and explain why the proposed use is preferable. The alternative does not have to be a real competing proposal — it can be a hypothetical or a "do-nothing" baseline — but it must be specific enough that a reader can compare expected outcomes. Generic statements such as "this is the best use of funds" or "no alternatives were considered" do not satisfy the rule. On failure, the suggestedEdit should append a short comparison subsection to **## Approach** that pulls in the proposal's own Outcome and Dependencies and contrasts them against a named alternative.

**Budget internal consistency** _(added 2026-05-07, updated 2026-05-08)_. For any proposal whose **## Budget & Resources** section is not "Not applicable.", all individual budget line items stated anywhere in the proposal (across **## Abstract**, **## Approach**, **## Implementation Plan**, **## Milestones**, and **## Budget & Resources**) must be internally consistent and sum to the total amount declared in **## Budget & Resources**. On failure, the suggestedEdit should identify the conflicting figures and propose a single reconciled set of numbers anchored to the declared total in **## Budget & Resources**.
