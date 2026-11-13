# Solventa · microservicio `emision`

ISIS-2212 Arquitecturas de software robustas · Grupo 1 · Sprint 2

**Responsabilidad:** Emisión y gestión del ciclo de vida de pólizas con alta disponibilidad (redundancia activa-activa, sondas desacopladas `@nestjs/terminus`, Rolling Update y Graceful Shutdown).

| | |
|---|---|
| Nodo de despliegue | Cluster EKS / Réplicas activas ×2 detrás de balanceador interno |
| Llama a | Ninguno |
| Lo llaman | suscripciones (HTTP) |
| Base de datos | BD Emisión (PostgreSQL, Database-per-Service) |
| Puerto interno | 3000 |
| Origen en el monolito | `src/modules/emision` |

## Correr en local

```bash
cp .env.example .env
npm ci
npm run start:dev
```

## Correr en local con Docker

```bash
docker compose -f docker-compose.local.yml up -d --build
curl localhost:3008/health/liveness
curl localhost:3008/health/readiness
docker compose -f docker-compose.local.yml down
```

## Sondas de Salud y Tácticas de Disponibilidad

- **`GET /health/liveness`**: Liveness Probe desacoplada de PostgreSQL. Verifica únicamente que el proceso NestJS esté vivo (reinicio automático ante fallo de proceso).
- **`GET /health/readiness`**: Readiness Probe acoplada al pool de PostgreSQL mediante `@nestjs/terminus` (`SELECT 1`) y al estado de `LifecycleService`. Responde `503` inmediatamente al iniciar *Graceful Shutdown* (`SIGTERM`) o si la base de datos no responde.
- **`GET /health`**: Alias del Readiness Check para AWS ALB / Docker Compose.
- **Graceful Shutdown**: Al recibir `SIGTERM`/`SIGINT` (con `RESILIENCIA_HABILITADA=true`), `LifecycleService` marca `/health/readiness` en `503` y espera `SHUTDOWN_DRAIN_MS` (por defecto `5000 ms`) para drenar transacciones en vuelo antes de cerrar el pool de TypeORM.
- **Idempotencia**: La columna `suscripcionId` (`UNIQUE`) y el header `X-Idempotency-Key` evitan emisiones duplicadas ante reintentos de conmutación desde `ms-suscripciones`.

## Endpoints de Negocio y Simulación

- `POST /polizas` — Emite una póliza `{ cotizacionId, clienteId, suscripcionId? }` (`201`, devuelve header `X-Emision-Replica`). Requiere el header `X-Socio-Id` (`400` si falta o no es UUID).
- `GET /polizas` — Lista pólizas (filtros opcionales `?clienteId=` o `?numeroPoliza=`).
- `GET /polizas/numero/:numeroPoliza` — Consulta una póliza por su número (ej. `POL-001`).
- `GET /polizas/:id` — Consulta una póliza por UUID o por `numeroPoliza`.
- `GET /metricas` — Métricas de emisiones exitosas, idempotentes, en vuelo y estado de apagado.
- `GET /simulacion/estado` — Estado actual de caos/simulación de la réplica.
- `POST /simulacion/emision` — Configura modo (`normal` | `lento` | `caido` | `readiness_fallido` | `liveness_fallido`) y `latenciaMs`.
- `POST /simulacion/kill` — Programa `{ "signal": "SIGTERM" | "SIGKILL" }` para pruebas de terminación durante tráfico continuo.
