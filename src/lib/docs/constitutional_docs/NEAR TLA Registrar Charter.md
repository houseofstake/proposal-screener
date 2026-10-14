Source: https://docs.houseofstake.org/docs/structure/legal-documents/tla-registrar-charter (retrieved 2026-10-06)

# NEAR Top-Level Namespace Registrar Charter

### A.1 Purpose

This **NEAR Top-Level Namespace Registrar Charter (“Registrar Charter”)** defines the authority, duties, and limitations of the **NEAR Top-Level Account Registrar (“Registrar”)** within the governance framework of NEAR House of Stake (“HoS”).

The **House of Stake Security Council (“Security Council”)** acts as Registrar and is authorized to perform **Registrar Actions** in accordance with this Registrar Charter and the House of Stake Constitutional Documents.
The Registrar is an execution function. It administers NEAR’s protocol-level authority to create Top-Level Accounts (“TLAs”) but does not operate the TLA platform or govern individual namespaces after their creation.

### A.2 Governance and Accountability

The Registrar operates under the authority of NEAR Tokenholders through House of Stake.

The Security Council shall perform Registrar Actions in accordance with:

- the approved House of Stake proposal establishing the Registrar;

- this Registrar Charter;

- the House of Stake Mandate;

- the House of Stake Constitutional Documents;

- applicable Foundation Legal Documents; and

- valid governance decisions adopted under those documents.

Security Council members obtain no independent authority over the NEAR top-level namespace by virtue of acting as Registrar or being signers of the Registrar account.

### A.3 Registrar Actions

A Registrar Action is an on-chain action performed or caused to be performed by the Registrar within the authority granted under this Registrar Charter.

The Registrar may perform only the following Registrar Actions:

#### A.3.1 Create Top-Level Accounts

Create previously non-existent bare TLAs on the NEAR Protocol where creation has been properly authorized under the applicable TLA governance and operational processes.

For example, the Registrar may create:
universe
which can subsequently serve as the root for accounts such as:
alice.universe
bob.universe

The Registrar’s authority over a TLA ends once the TLA has been successfully created, except for Registrar Actions strictly necessary to complete or verify that creation.

Creation of a TLA does not grant the Registrar, HoS, or the Security Council authorization to act through, administer, or access the created TLA or assets held within it.

#### A.3.2 Administer the TLA Root

Perform the root-level actions necessary to bring a newly created TLA into service and to maintain the Registrar account itself, limited to:

a) funding a newly created TLA with the storage balance required for it to operate;
b) setting the access key configuration of a TLA at or immediately after creation, so the account is left in its intended state;
c) any action strictly necessary to complete or verify a creation under A.3.1; and
d) maintaining the Registrar account's own membership, balance and configuration.

This section confers no authority over a TLA once it has been brought into service, and no authority over accounts created beneath it.

#### A.3.3 Execute Valid TLA Creation Instructions

Where an approved platform process results in a TLA creation instruction requiring a Registrar Action, the Registrar may execute or cause that Registrar Action to be executed.

The Registrar shall execute the instruction where:

- the requested action falls within the Registrar’s authority under this Registrar Charter;

- the applicable process and technical conditions have been satisfied; and

- execution would not violate this Registrar Charter, applicable HoS governance, or applicable law.

The Security Council applies these criteria in determining whether to execute the requested Registrar Action. This determination need not be automated or enforced by smart contracts.

The Registrar does not assess or reconsider the commercial merits of the underlying platform decision.

#### A.3.4 Protective Registrar Actions

The Registrar may suspend, delay, or take other root-level Registrar Actions reasonably necessary to respond to:

- compromise or suspected compromise of Registrar authority;

- a critical protocol or contract vulnerability;

- malformed, fraudulent, or unauthorized creation instructions;

- an active exploit or material security incident; or

- another circumstance in which execution would create an immediate and material risk to the NEAR Protocol or the Registrar.

Protective Registrar Actions may be used only to protect the integrity of the Registrar, the TLA root, or the NEAR Protocol. They shall not be used to override ordinary allocation decisions, commercial disagreements, or valid rights and authorizations established under the applicable platform and account mechanisms.

#### A.3.5 Registrar Infrastructure

The Registrar may maintain and upgrade technical infrastructure required to perform Registrar Actions, provided such changes do not materially expand the Registrar’s authority or alter the governance boundaries established by this Registrar Charter.

The Registrar may select, authorize, instruct, and monitor qualified technical experts or infrastructure to execute Registrar Actions on its behalf. Delegating technical execution does not transfer or reduce the Security Council’s responsibilities as Registrar.

Any change that would materially expand the Registrar’s authority, change who acts as Registrar, or alter the separation between the Registrar and TLA platform operation requires authorization through the applicable House of Stake governance process.

### A.4 Registrar Duties

In performing Registrar Actions, the Security Council shall:

- act only within the authority granted by this Registrar Charter, and the applicable House of Stake Constitutional Documents and Foundation Legal Documents

- verify that the conditions applicable to a requested Registrar Action have been satisfied;

- safeguard the integrity and security of the Registrar and TLA root;

- maintain appropriate operational and security procedures;

- ensure that Registrar Actions can be publicly reconciled with the corresponding valid instructions; and

- report material incidents, rejected instructions, unauthorized attempts, or material deviations from normal operation in accordance with applicable House of Stake procedures.

### A.5 Separation from TLA Platform Operations

**nearaccounts.com and the associated TLA platform are operated as a NEAR product by the nearaccounts.com team (“Platform Operator”).**
The Platform Operator is responsible for determining and implementing the platform’s product, technical, operational, and commercial policies, including, as applicable:

- namespace allocation processes and classes;

- eligibility and application requirements;

- pricing and fees;

- marketplace rules;

- leasing and renewal terms;

- business models and commercial terms;

- customer relationships;

- registry operations;

- account recovery mechanisms; and

- business namespace functionality.

The Platform Operator may determine and modify these policies, processes, and technical mechanisms without approval by the Registrar or a House of Stake Tokenholder Vote, provided such changes do not expand the Registrar’s authority or otherwise modify the governance boundaries established by this Registrar Charter.

The Registrar does not approve, supervise, or replace the Platform Operator in these functions.

Where an approved platform process results in a valid TLA creation instruction, the Registrar’s role is limited to determining whether the conditions for the corresponding Registrar Action have been satisfied and, if so, executing or causing the Registrar Action to be executed.

### A.6 No Account Administration Authority

The Registrar has no authority over the ordinary operation of a TLA or accounts created beneath it.

In particular, the Registrar shall not:

- create or administer ordinary subaccounts on behalf of namespace holders;

- determine or modify the rights or authorizations associated with TLAs or subaccounts;

- hold or manage NFT ownership records on behalf of users;

- operate the TLA registry;

- control leased accounts;

- manage wallet authorization;

- approve marketplace transfers;

- administer account recovery;

- custody user assets; or

- interfere with the lawful operation of a namespace.

These functions are governed by the applicable nearaccounts.com smart contracts, platform rules, account holders, and the NEAR Protocol.

### A.7 No Custody of Accounts or Assets

Performance of a Registrar Action does not grant the Registrar authorization to act through or administer individual TLAs, leased accounts, or subaccounts, and does not provide access to assets held within them.

Where nearaccounts.com uses keyless contract accounts, each account determines authorization against its applicable on-chain control set. Registry lifecycle events may cause that control set to be updated in accordance with the applicable platform contracts and authorization mechanisms.

Neither HoS nor the Security Council takes custody of user account keys or acquires access to user accounts or assets by acting as Registrar.

### A.8 Neutrality

The Registrar shall remain neutral in performing Registrar Actions.

The Security Council shall not use its Registrar authority to:

- favor or disadvantage particular applicants;

- influence pricing or commercial terms;

- reserve names for its own benefit;

- influence marketplace activity;

- obtain preferential access to namespaces; or

- advance interests inconsistent with its obligations under House of Stake governance.

Any conflicts of interest shall be handled under the applicable House of Stake Conflict of Interest Policy.

### A.9 Accountability and Transparency

The Security Council is accountable to House of Stake for its operation of the Registrar.

Registrar activity is subject to the transparency, conflicts, security, and accountability requirements applicable to the Security Council.

Material or repeated failure to comply with this Registrar Charter may result in governance action under the applicable House of Stake Constitutional Documents and Foundation Legal Documents.

### A.10 Charter Amendments

This Registrar Charter may be amended only through the governance process applicable to the proposal under which it was adopted or another process authorized by the House of Stake Constitutional Documents.

No operational procedure, platform policy, technical implementation, or Security Council decision may override or expand the authority boundaries established by this Registrar Charter.
