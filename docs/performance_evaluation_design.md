# Performance and system evaluation

This phase adds lightweight research monitoring on top of the existing prototype. It does not retrain models, change ranking, or introduce a production observability stack.

> Academic Research Prototype. These figures are for college review only. They are not government accuracy, production monitoring, or an official eligibility decision.

## Architecture

```text
React /system-evaluation  -->  GET /api/v1/system-evaluation  (JWT)
                              |-- existing evaluation_service artifacts
                              |-- in-process performance_service counters
                              '-- health: database / model loaded / evaluation ready

Selected existing routes --> PerformanceMiddleware
                              records count, min/avg/max ms, errors
```

The Decision Tree, eligibility rules, hybrid ranking, authentication, wallet, history, comparison, PDF, documents, readiness, insights, notifications, catalog, datasets, and existing API contracts are unchanged.

`GET /health` and `GET /api/v1/evaluation/*` stay as they are. The new summary only reads those sources.

## What is measured

Live, in-process timings for:

| Key | Existing route |
| --- | --- |
| `/predict` | `POST /api/v1/predict` |
| `/recommend` | `POST /api/v1/recommend` |
| `/schemes` | `GET /api/v1/schemes` |
| `/evaluation` | `GET /api/v1/evaluation/*` |
| `/insights` | `GET /api/v1/insights` |

Each key stores request count, error count (`status >= 400`), and min/average/max response time. Counters live in memory and reset when the process restarts.

The collector never stores request bodies, query strings, passwords, JWTs, Google tokens, identity numbers, or wallet fields.

## Research evaluation shown on the page

These values are existing Phase 4/5 artifacts. They are not recomputed from live traffic.

| Section | Source |
| --- | --- |
| ML Performance | `GET /api/v1/evaluation/models` via `evaluation_service` |
| Hybrid Agreement | `GET /api/v1/evaluation/hybrid` |
| Dataset Summary | `GET /api/v1/evaluation/overview` |
| API Performance | in-process counters |
| System Health | database check, model-loaded flag, evaluation artifacts |

The UI states that ML/dataset/hybrid numbers are saved research metrics, while API timings are live for this process only.

## API

`GET /api/v1/system-evaluation` requires a JWT. The response contains public research numbers only. Another user is not given another person's wallet or profile.

## Limitations

This is academic in-process monitoring. It is not Prometheus, APM, multi-instance aggregation, or a government reporting service.
