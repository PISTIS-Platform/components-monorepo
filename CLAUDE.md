# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

```bash
# Install dependencies
pnpm i

# Serve a specific component
nx serve notifications-component

# Run multiple components together
npx nx run-many -t serve -p notifications-component investment-planner-component

# Lint all projects
task lint
# or: nx run-many -t lint --all --parallel

# Test all projects
task test
# or: nx run-many -t test --all --parallel

# Test a single project
nx test [project-name]

# Lint a single project
nx lint [project-name]
```

### Docker / Local Services

```bash
task up        # Start all services (Postgres, Keycloak, Redis, etc.) via docker compose
task down      # Stop all services
task status    # Show running service status
task login     # Get a Keycloak access token (admin.tester / password)
task init-users  # Seed Keycloak with local test users
```

### Database Migrations (per component)

```bash
nx run [component]:migration:check    # Check for schema drift
nx run [component]:migration:create   # Generate a new migration
nx run [component]:migration:up       # Apply pending migrations
nx run [component]:migration:down     # Roll back last migration
nx run [component]:migration:pending  # List unapplied migrations
nx run [component]:migration:list     # List applied migrations
```

### Generating New Projects

```bash
nx g @nx/nest:app apps/my-nest-app   # New microservice
nx g @nx/nest:lib libs/my-nest-lib   # New shared library
npx nx graph                          # Visualize project dependency graph
```

### Docker Images

```bash
task dockerize   # Build Docker images for all affected components (nx affected -t container)
```

## Architecture Overview

This is an **Nx monorepo** of NestJS microservices for the PISTIS platform (a blockchain/investment data marketplace).

### Workspace Layout

- **`apps/`** — Eight standalone NestJS microservices, each with its own database, migrations, and Dockerfile: `connector-component`, `notifications-component`, `factories-registrant-component`, `intention-analytics-component`, `models-repository-component`, `sctc-component`, `investment-planner-component`, `transactions-auditor-component`.
- **`libs/`** — Reusable NestJS libraries shared across apps. Imported via `@pistis/*` path aliases defined in `tsconfig.base.json`.
- **`scripts/`** — Docker Compose files for local infrastructure.

### App → Library Relationship

Each app in `apps/` is a thin NestJS bootstrap that composes feature modules from `libs/`. The heavy business logic lives in the corresponding library (e.g., `apps/connector-component` imports `@pistis/provider` and `@pistis/consumer`). Nx enforces module boundaries — apps cannot import from other apps.

### Provider / Consumer Data Flow

The `connector-component` app is the core of the platform. It exposes two sides:

**Provider side** (`libs/provider`) — Data suppliers register assets:
1. POST `/api/provider/streaming` creates metadata in the catalog (`MetadataRepositoryService`) and a Kafka topic + user via Strimzi Kubernetes operators.
2. Returns `{ id, topic, bootstrapServers, username, password }` for the supplier to start publishing data.

**Consumer side** (`libs/consumer`) — Data buyers retrieve assets:
1. POST `/api/consumer/retrieve/:assetId` fetches metadata, then enqueues a BullMQ job.
2. The `ConnectorProcessor` handles the job based on distribution format:
   - **SQL data**: Paginated batch retrieval via `factory-data-storage` HTTP API, tracking progress via `offset` in the `AssetRetrievalInfo` entity (enables resume on retry).
   - **File data**: Single full-file download.
   - **Kafka stream**: Creates a MirrorMaker 2 connector in Kubernetes to mirror the provider's topic into the consumer's cluster. A delayed job fires at `endDate` to delete the connector automatically.
3. On completion: updates `AssetRetrievalInfo`, records a transaction in `transactions-auditor`, and sends notifications to both buyer and seller via the `notifications` service.

**Scheduled subscriptions**: `ConsumerController` uses `queue.upsertJobScheduler()` with cron patterns (hourly/daily/weekly/monthly). Scheduled jobs use fee = 0 — only the initial purchase is charged.

### BullMQ Job Processing

`@pistis/bullMq` (`libs/bullMq`) configures a single `'default'` queue (constant `CONNECTOR_QUEUE`) with:
- 3 retry attempts, exponential backoff starting at 3000ms
- Jobs auto-removed after 1 hour (success or failure)

Job names: `'retrieveData'`, `'retrieveScheduledData'`, `'deleteStreamingConnector'`.

On failure after max attempts: the partially-staged asset is deleted and a failure notification is sent.

### Kafka Streaming (`@pistis/kafka`)

`KafkaService` (`libs/kafka/src/lib/kafka.service.ts`) manages Kubernetes Strimzi custom resources:
- `createTopic(id)` → creates `KafkaTopic` CRD named `ds-{id}`
- `createProviderUser` / `createConsumerUser` → creates `KafkaUser` CRDs with SCRAM-SHA-512 auth and ACLs
- `createMM2Connector(config)` → creates a `KafkaMirrorMaker2` CRD that mirrors `ds-{sourceId}` → `ds-{targetId}` between clusters

### Module Registration Pattern

Feature libraries (e.g., `ConsumerModule`) extend `ConfigurableModuleClass` and expose both `register()` and `registerAsync()`. The async form is used everywhere to inject typed config:

```typescript
ConsumerModule.registerAsync({
  imports: [ConfigModule.forFeature(AppConfig)],
  useFactory: async (config: IAppConfig) => ({ dataStorageUrl: config.dataStorageUrl, ... }),
  inject: [AppConfig.KEY],
})
```

`registerAsync()` internally registers child modules (`DataStorageModule`, `MetadataRepositoryModule`) with the provided config options.

### Shared Infrastructure (`@pistis/shared`)

- **Logging**: Winston + custom OpenTelemetry OTLP gRPC transport. A `JwtRedactionLogProcessor` strips bearer tokens before export.
- **HTTP Logging**: Morgan middleware applied globally via `NestModule.configure()`.
- **Auth decorator**: `@AuthToken()` extracts the raw JWT string from the request.
- **Pipes**: `UserInfoPipe` parses JWT claims into a typed `UserInfo` object.
- **Telemetry**: OTEL traces/metrics/logs with GRPC exporters configured via `IAppConfig`.

### Authentication

Keycloak is the identity provider (realm: `pistis-heu`; local: `http://localhost:9090`). All apps register `KeycloakConnectModule` globally with `APP_GUARD` providers for `AuthGuard` and `RoleGuard`. Service-to-service calls (e.g., from `ConnectorProcessor` to the notifications service) use client-credentials flow to obtain a token.

### Database

MikroORM with PostgreSQL. Each app declares its own entities and migration folder. `orm.config.ts` in each app uses `@pistis/data-storage` utilities. A separate `tsconfig.orm.json` compiles migrations independently of the main build. Use `autoLoadEntities: true` — entities are registered by NestJS DI, not listed manually.

### Configuration Pattern

Every app and library uses NestJS `ConfigModule` with `registerAs()`. Configuration is sourced from `.env` files; `.env.sample` documents required variables. The shared `IAppConfig` interface defines the common base shape (port, database, keycloak, redis, external service URLs).

## Code Style

- **Formatter**: Prettier — 120-char line width, 4-space tabs, single quotes, trailing commas everywhere.
- **Linting**: ESLint with `simple-import-sort` and `unused-imports` plugins. Run `task lint` before pushing.
- **Commits**: Conventional Commits enforced by CommitLint + Husky pre-commit hooks.
- **Testing**: Jest. Each library and app has its own `jest.config.ts`.
