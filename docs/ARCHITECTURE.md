# Capture architecture

## Release scope

| Scope | Included | Release evidence |
|---|---|---|
| Free beta MVP | F01–F13 and F15–F16. Shared account, intentional Chrome capture, manual URL save, deduplicated persistence, library, async source-backed notes, dynamic knowledge tree, topic corrections, keyword search, processing and recovery states, usage limits, related articles, and export. | P0–P8, P10 and P11 gates, including capture from the real extension, data isolation, and beta smoke tests. |
| Paid launch | F14. Stripe Checkout and Customer Portal, verified subscription events, and server-managed Free/Pro entitlements. | P9 test-mode lifecycle, measured processing costs, approved prices, and explicit approval for live billing. |
| Post-MVP | F17–F23. Semantic search, chat, cross-source synthesis, learning review, PDF/YouTube, third-party sync, and interactive knowledge graphs. Collaboration, passive capture, and additional clients are outside the launch scope. | Separate product validation after the beta. |

The initial cohort is students, developers, and self-directed learners who already save articles regularly. The beta tests whether structured notes and a growing, editable tree make those articles easier to revisit.

Users can continue saving links after reaching the AI allowance. Failed extraction or AI processing preserves the saved link and presents the applicable recovery path. The first release supports topic renaming, moving, and article reassignment. CAP-070 verifies a safe merge or documents a manual alternative.
