# Cell Architecture Studio — Design Docs

Research and design for building a scalable interactive 3D cell-biology learning tool for students and researchers, based on a teardown of the live reference app (`cell-architecture-studio.lanshuagent.com`).

| Doc | What it is |
|---|---|
| [`teardown.html`](teardown.html) | Architecture teardown of the live reference app + a tiered scaling overview (open in a browser). |
| [`PRD.md`](PRD.md) | Product Requirements Document: personas, tiered scope, numbered requirements, data model, NFRs, milestones, risks, open questions. |
| [`reference-architecture.md`](reference-architecture.md) | Technical reference architecture: C4 diagrams, critical runtime flows, per-tier deployment topology, scaling & resilience, technology decisions. Cross-referenced to the PRD by requirement ID. |

**Core idea:** push heavy read-mostly work (app bundle, 3D assets, content manifests) to the CDN edge and GPU work to the client, so the only server compute in the hot path is a small stateless AI-tutor function. The only variable costs — CDN egress and LLM tokens — are each bounded by design (payload budget; cache-hit rate + rate limits). This keeps the read path resilient and the cost curve flat as usage grows.

> The client-side findings are observed from the live app's shipped bundle and public repo. The server-side/scaling elements are recommended additions — the reference app's backend is not public.
