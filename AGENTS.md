# Working on LedgerLoops

## Scope and voice

This repository is the public LedgerLoops website, not the current protocol implementation. The site should feel like a grassroots programmers’ project: curious, technically concrete, open to experimentation, and candid about unfinished work. The owner requested a cypherpunk rewrite in October 2026. Favor local trust, user-controlled ledgers, open protocols, and contributions over business growth, sales copy, or promises of financial freedom.

Keep the existing green loop logo (`assets/images/ledgerloops-logo-new-144x87.jpg`) in the site header. The owner builds with coding tools and does not hand-write code; prefer inclusive language such as “People building their own tools” over “People who write code.”

Use **LedgerLoops** consistently. Explain terms before relying on them. Separate aspirations, historical results, and behavior verified in a particular implementation. Cryptographic coordination does not eliminate counterparty trust, guarantee anonymity, or physically enforce delivery. An Internet-Draft is not an adopted IETF standard. Do not describe every repository as having the website’s historical CC BY-SA license; check individual licenses.

## Website development

- The checkout is `/workspace/ledgerloops.com` in this cloud environment. Use the existing checkout; cloud tasks are already isolated. Do not create a worktree unless the user explicitly requests one.
- This is a static HTML site. There is no package manifest, dependency installation, bundler, or application backend required for the website. Python 3 is enough to serve it:

  ```sh
  cd /workspace/ledgerloops.com
  python3 -m http.server 8000 --bind 127.0.0.1
  ```

- Main pages: `index.html` (home), `initiation.html` (roots), `description.html` (protocol), `realization.html` (experiments), `activation.html` (contributing), and `contact.html`.
- Shared presentation is in `assets/css/site.css`. The homepage’s educational clear/reset interaction is in `js/loop-example.js`. It illustrates the arithmetic of netting; it does not execute LedgerLoops protocol messages.
- Main pages use explicit `.html` links so the basic Python server works without rewrites. Preserve existing filenames and historical inbound paths. There is no routing configuration here to emulate extensionless production URLs locally.
- The main pages need no remote fonts, JavaScript libraries, or third-party requests to render. Keep the core content and navigation usable without JavaScript; use semantic HTML, visible keyboard focus, and responsive layouts.
- `demo.html`, `js/demo.js`, and `js/ledgerloops.js` are the historical browser simulation. `js/ledgerloops.js` is a large bundled artifact; do not confuse it with the organization’s current TypeScript implementations.
- Preserve historical documents unless a task explicitly calls for editing them: `whispering-merchants.html`, `economic-arrangements.html`, `blog/response-to-radical-markets.html`, `doc/`, and `plantuml/`. Date historical claims when quoting them. Some legacy pages retain old styles, claims, and URLs.
- Mobirise/Bootstrap assets remain from the October 2024 design. The rewritten main pages do not load them. Do not sweep them away without checking legacy use.
- `CNAME`, `robots.txt`, and `sitemap.xml` are deployment/search metadata; a local rewrite does not require changing the domain.

### Useful validation

1. Run `git diff --check` and check that every changed page’s local `href` and `src` target exists.
2. Serve the repository and check all six main pages in a real browser at desktop and narrow mobile widths. Verify no horizontal overflow, failed resource requests, or JavaScript exceptions.
3. On the homepage, clear the loop and check balances change from `12, 9, 6` to `6, 3, 0`; reset and check the original state returns. Net positions must remain unchanged. With JavaScript disabled, the static after-clearing explanation should remain visible.
4. Check navigation, keyboard focus, and historical resources linked by changed pages. `test.txt` is not an automated test suite; the current website has no repository-defined test runner.
5. If touching the historical demo, check its actual IOU interaction separately; loading its page alone is not a protocol test.

Python 3.12, Node 24, system Chromium, and Playwright were available during onboarding. Node is optional for this static site, and its installed version should not be assumed appropriate for other repositories. Browser checks used the cloud-provided Playwright package and `/usr/bin/chromium`, without adding npm dependencies here. Onboarding does not publish the website.

The README documents optional whitepaper generation (`latex`, `bibtex`, repeated `latex`, then `dvipdf`). It is not required for the website: `doc/whitepaper.pdf` is already tracked. Build in a temporary copy when only validating tooling, because generated paper artifacts also exist in Git. The paper was not rebuilt during this website rewrite.

## What LedgerLoops is researching

The older project centers on cryptographically triggered IOUs. Bilateral credit relationships form a graph; a cycle may allow several obligations to be reduced while preserving participants’ net positions. Local trust remains essential.

The 2024 framing separates three jobs:

1. **Detection:** find a cycle, ideally through neighbor-to-neighbor messages.
2. **Negotiation:** decide acceptable amounts, units, and changes to each relationship.
3. **Resolution:** coordinate agreed updates, with hashlocks being one approach.

A “credit lift” is the vocabulary used in later project notes. Do not flatten the entire project into a new coin, a payment product, or a single debt-search algorithm. SNAP and the messaging/transport experiments address other layers of the system.

## Research basis and historical milestones

Findings were checked on 2026-10-09 against the website checkout at `024d0c013de214e577c8161ecf5107e5003d6865`, the public [organization listing](https://github.com/orgs/ledgerloops/repositories) (23 repositories, one page), available rendered README content, and Git histories fetched for the four core algorithm repositories. This is a public repository survey, not an audit of every implementation or a claim that all projects were built/tested. Public metadata can change; dates below describe evidence, not guarantees of ongoing maintenance.

- **2011:** The website traces its origin to an [Unhosted mailing-list proposal](https://groups.google.com/g/unhosted/c/2IUC2ralu-U/m/qwGENz65t_EJ). This predates the website’s local Git history.
- **2016:** Local history starts March 16. October work moved from OpenTabs (`269a074`), developed cycle detection, settlements, signatures and simulations, and renamed the project (`854c5ec`). The Whispering Merchants story arrived with `101ed1c`. November split the whitepaper and demo code into other repositories (`33b5776`). The history includes explicit failing tests, race conditions, and iterative repairs: experimental work, not a finished financial network.
- **2017:** Website commits recorded a move to Ripple and connections with Interledger (`75dee12`, `82db85a`).
- **2018–2019:** Development resumed (`a5c59d2`); terminology moved to hashlocks (`5a3e7ca`); version 0.8 whitepaper revisions and browser/Web Monetization experiments followed. Whitepaper source returned to this repository (`43b063a`); the paper’s issue link was redirected here in 2019 (`efc6268`). SNAP, messaging, and browser projects provide another strand of the organization’s work.
- **2020–2023:** `snap-solid` describes a Solid World May 2020 presentation. The website records Federated Bookkeeping meetings in 2021–22, Ponder Source/Connect Your Books, and the 2023 CoFi gathering. These claims come from the project narrative, not from a continuous annual website commit record.
- **2024:** Strategy Pit begins in March; the site’s April rewrite explains detection, negotiation, and resolution. Work explores Cabal, Earthstar, Braid, and a Deno implementation. Jerboa begins September 20, followed by the October prototype and business-oriented Mobirise redesign. The pre-redesign homepage at [`f764116`](https://github.com/ledgerloops/ledgerloops.com/blob/f764116/index.html) is useful context for the project’s technical voice.
- **2025:** Website HEAD updates the explanation in March. The algorithm repositories continue into June: Jaribu starts June 2; Jerboa removes its semaphore and experiments with randomized probe timers. Do not repeat the old website’s hope of launching an MVP “in 2025” as a current forecast or infer that it happened.

## Organization repository map

Links point to the repositories reviewed. “Archived” refers to the public listing as observed; other entries should not automatically be called active or production-ready.

| Repository | Role and observed status |
| --- | --- |
| [ledgerloops.com](https://github.com/ledgerloops/ledgerloops.com) | Static website, historical demo, paper, and explanatory documents. |
| [strategy-pit](https://github.com/ledgerloops/strategy-pit) | TypeScript experimentation ground; Sarafu-derived graph conversion, DFS, Python/OR-Tools min-cost flow, analysis, DLD and lift-resolution notes. History March 2024–June 2025. |
| [jerboa](https://github.com/ledgerloops/jerboa) | State-driven TypeScript node, successor to Strategy Pit strategies; prototype messaging and netting experiments. History September 2024–June 2025. See the README/code discrepancy below. |
| [jaribu](https://github.com/ledgerloops/jaribu) | June 2025 peer-to-peer DFS messaging experiment; README explicitly says work in progress. pnpm workflow; history explores queues and multiple search “worms.” |
| [ledgerloops](https://github.com/ledgerloops/ledgerloops) | Current README describes a TypeScript/Deno node with DLD, greedy lift negotiation, cooperative resolution, local-node interactions, and XCH units. History reviewed spans October 2018–May 2024; not simply the unchanged implementation embedded in the old browser demo. |
| [saiga](https://github.com/ledgerloops/saiga) | Strawman agent for detection, negotiation, execution; README redirects to `ledgerloops`. |
| [ledgerloops-earthstar](https://github.com/ledgerloops/ledgerloops-earthstar) | Archived. Deno/Earthstar transport experiment; README says abandoned in favor of work tracked in Saiga. |
| [ledgerloops-cabal](https://github.com/ledgerloops/ledgerloops-cabal) | Cabal messaging experiment; README says work in progress and describes initialization/latency problems. |
| [braided-snap](https://github.com/ledgerloops/braided-snap) | SNAP using Braid; two participant servers, transaction lists, version counters, and subscriptions. README describes in-memory storage with no restart recovery. May 2024 experiment. |
| [snap-checker](https://github.com/ledgerloops/snap-checker) | SNAP transaction/state-transition validation. Simplex/channel watchers and message-log replay reconstruct balances; checks trust limits, expiry, and hash conditions. |
| [snap-server](https://github.com/ledgerloops/snap-server) | SNAP ledgers behind Hubbie; Node/Postgres. README describes ToS;DR project finance as an initial development use case. |
| [snap-solid](https://github.com/ledgerloops/snap-solid) | SNAP in the browser on Solid; README links the May 2020 presentation and points to `nlt-kit` for running it. |
| [nlt-kit](https://github.com/ledgerloops/nlt-kit) | Fork; Network Ledger Technology/Solid experimentation kit. README requires Redis and notes an identity-provider restriction on localhost. These requirements do not apply to this website. |
| [hubbie](https://github.com/ledgerloops/hubbie) | WebSocket client/server and in-process messaging manager, reconnection/queueing; README connects its origin to BtpSpider/Interledger work. |
| [hashlocks](https://github.com/ledgerloops/hashlocks) | Listing describes SHA-256 hashlocks for the network ledger. No rendered README was available in the reviewed page; avoid inventing API or readiness claims. |
| [network-money](https://github.com/ledgerloops/network-money) | Archived browser extensions; README explicitly says outdated. |
| [unicurn.network](https://github.com/ledgerloops/unicurn.network) | Archived companion website; brief README links its domain. |
| [ledgerloops-whitepaper](https://github.com/ledgerloops/ledgerloops-whitepaper) | Archived; listing explicitly says merged into `ledgerloops.com`. Current paper source belongs here. |
| [ddcd-dfs](https://github.com/ledgerloops/ddcd-dfs) | Archived/deprecated decentralized cycle detection in directed graphs; 2016 branch of the research. |
| [ledgerloops-django](https://github.com/ledgerloops/ledgerloops-django) | Archived/deprecated Django peer-ledger app; README labels it work in progress. |
| [ledgerloops-peer](https://github.com/ledgerloops/ledgerloops-peer) | Archived/deprecated early peer component; minimal README. |
| [ledgerloops-challenge](https://github.com/ledgerloops/ledgerloops-challenge) | Archived/deprecated challenge component for cryptographically triggered IOUs. |
| [boilerplate](https://github.com/ledgerloops/boilerplate) | Archived TypeScript/Jest scaffolding; README says outdated and points elsewhere. |

### Important qualifications when describing experiments

- Strategy Pit constructs a **fictitious debt graph from real Sarafu transactions**. It uses standard transfers as bilateral balance changes; it is not measuring actual unpaid Sarafu debts or a live deployment of LedgerLoops.
- The Strategy Pit README reports about **67% cleared for MCF+DFS and 60% for DFS** on its full-data experiment. It explicitly calls that DFS baseline centralized. Do not call it a proven decentralized benchmark just because a distributed variant is a goal.
- Jerboa’s README describes different, smaller-fixture results (roughly **18.9%, 16.6%, and 15.3%** for its comparison). Do not mix these with the full-data percentages. None of these benchmarks was rerun during website onboarding.
- **Jerboa README/code drift matters:** the README still describes the 2024 centralized Semaphore Service and a planned 2025 rewrite. Commit [`12cf6e37de3377e5b76a3e3e5667df9eea8bf0fa`](https://github.com/ledgerloops/jerboa/commit/12cf6e37de3377e5b76a3e3e5667df9eea8bf0fa) on June 5, 2025 deletes `src/SemaphoreService.ts`. Later commits add randomized node timers and change probe/nack behavior. The reviewed HEAD contains `probeStartingTimer()` and timer scheduling in `src/Jerboa.ts`, and a simulation harness in `src/SingleThread.ts`. Do not claim the latest code still requires the removed service, or infer complete decentralization/security from its removal.
- Jerboa’s reviewed manifest pins Volta Node **20.12.2**, declares Node `>=20.9 <21`, uses npm/TypeScript/Jest, and has lint before build. The website’s installed Node 24 is not its pinned toolchain. Its README commands are research pointers, not setup commands tested here.
- Jaribu’s README suggests `pnpm prettier`, which writes files. Do not run broad formatters just to inspect or onboard another repository.

Core repository tips used for the Git-history review:

| Repository | Commit |
| --- | --- |
| Jerboa | `c09ef8f` (2025-06-06) |
| Jaribu | `06311d3c542f2f051a0690cc8d1706e62ae122ce` (2025-06-04) |
| Strategy Pit | `a7308a9138bf3318d8366723bd833b3e64414154` (2025-06-04) |
| LedgerLoops implementation | `107ce3fc88e4cf111f5de0dd27e37a4946014d58` (2024-05-24) |

## Boundaries for future work

Preserve existing user edits. Keep website dependencies minimal. Updating prose or styles should not rebuild legacy bundles or modify the research implementations. When checking external projects, inspect their current instructions and version pins rather than copying this website’s setup. Research checkouts used during this review lived under `/tmp`; they are not required website dependencies or part of the saved repository membership.

When reporting work, distinguish the website’s browser checks from algorithm test suites and historical benchmark claims. No organization-wide test pass or production-readiness claim follows from this documentation review.
