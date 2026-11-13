--
-- BD Emision · esquema y datos semilla del microservicio emision.
-- Extraido de database/solventa.sql del monolito modular.
-- Las llaves foraneas hacia clientes y cotizaciones NO se replican:
-- esas tablas viven en ms-identidad y ms-cotizacion.
-- Nota: "cotizacionId" es indexado (NO UNIQUE) para permitir pruebas de carga
-- continuas reutilizando la cotizacion semilla, mientras que "suscripcionId"
-- es UNIQUE para garantizar idempotencia ante reintentos de ms-suscripciones.
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

DO $$
BEGIN
    CREATE TYPE public.polizas_estado_enum AS ENUM (
        'EMITIDA',
        'ACTIVA',
        'EN_RENOVACION',
        'CANCELADA'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS public.polizas (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "numeroPoliza" character varying NOT NULL,
    estado public.polizas_estado_enum NOT NULL,
    "fechaInicioVigencia" timestamp without time zone NOT NULL,
    "fechaFinVigencia" timestamp without time zone NOT NULL,
    "clienteId" uuid,
    "cotizacionId" uuid,
    "suscripcionId" uuid,
    CONSTRAINT "PK_a8b0ccc8c8d114f91b29285a5bc" PRIMARY KEY (id),
    CONSTRAINT "UQ_c6afcec8a03a006aa86ae937aa3" UNIQUE ("numeroPoliza"),
    CONSTRAINT "UQ_polizas_suscripcionId" UNIQUE ("suscripcionId")
);

CREATE INDEX IF NOT EXISTS "IDX_polizas_cotizacionId"
    ON public.polizas ("cotizacionId");

INSERT INTO public.polizas (
    id, "numeroPoliza", estado, "fechaInicioVigencia", "fechaFinVigencia",
    "clienteId", "cotizacionId", "suscripcionId"
)
VALUES (
    'a712e1ff-41ab-41fe-9137-a1e3b3807ce5',
    'POL-001',
    'ACTIVA',
    '2026-09-29 14:42:14.270153',
    '2027-09-29 14:42:14.270153',
    NULL,
    NULL,
    NULL
)
ON CONFLICT DO NOTHING;
