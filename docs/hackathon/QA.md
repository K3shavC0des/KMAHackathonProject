# Integration review — 2026-11-14

Review target: Matthew integration `e547c0f`. Keshav owns the isolated
`hackathon/K3shavC0des/integration-qa` branch. Active map feature edits remain
with Arman; backend/schema work remains with Matthew.

## Verified and fixed

The standalone backend serves observed collections, but the map launch server
had its own sample-only rank implementation and no collection endpoint. This
made `/api/rank?dataset=observed` silently return sample ranking and prevented
the map from loading observed data on the same origin.

The map server now dispatches `/api/*` and `/map/api/*` to the backend server's
request handler. It retains the dataset query and backend POST, OPTIONS and
error behavior. It does not open another listening port. Both API prefixes
return four observed analysis tiles, choose SW with NISAR and return no first
stop without NISAR. Default collections remain explicitly synthetic.

Validation: 18 Node tests pass, including three new HTTP integration tests;
`git diff --check` passes. Run:

```powershell
node --test backend/rank.test.mjs frontend/map/observations.test.mjs frontend/scenario/scenario.test.mjs tests/integration/map-api.test.mjs
```

## Remaining work and owners

| Work | Owner | Acceptance |
| --- | --- | --- |
| Review/integrate this server patch | Matthew | Both API prefixes pass HTTP tests on combined branch |
| Observed mode and pan/zoom/tap map | Arman | Explicit dataset labels, four tiles and dated evidence; missing SMAP remains unavailable |
| Strict schema validation at API/stored-data boundaries | Matthew | Shared schema validates before ranking; malformed stored/request collections rejected |
| Desktop/mobile browser journey | Keshav/team | Open combined map, switch dataset, select tile, inspect evidence, refresh and exercise missing/error states |
| SMAP current/history QC | Matthew | Suitable local files opened, same-cell recommended AM history with at least five valid years |
| Review pilot-verifier PR #12 | Matthew | Coordinate/metadata mismatch tests and actual pair reproduction accepted |

Browser verification was attempted using existing Edge. Computer Use stopped
because it could not confidently determine the current browser URL. No visual,
mobile or interactive browser pass is claimed. This does not block the HTTP
checks above. The old scenario remains outside the user's active demo scope.

## Context tools

Claude Mem work state confirmed pilot-verification PR #12 and an older open
review. Memory search and timeline returned no matching observations; semantic
search reported Chroma offline. No missing memory facts were inferred.

The original Graphify graph covered setup/research context. A local AST refresh
on this integration produced 544 nodes and 657 edges before the server patch.
Traversal connected the standalone backend collection handler
(`backend/server.mjs`, `collections` at L7 and `makeServer()` at L29) and the
separate map server (`frontend/map/serve.mjs`, `makeServer()` at L28).
Direct source inspection and HTTP tests established the routing defect.
The AST graph omits unsupported files and does not establish runtime behavior.

No full observed fusion, historical risk flag, field validation, browser pass,
deployment or submission is claimed.
