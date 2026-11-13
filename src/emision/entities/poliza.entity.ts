import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { EstadoPoliza } from '../enums/estado-poliza.enum';

/**
 * Contrato de seguro emitido a partir de una cotizacion aceptada.
 *
 * Las relaciones hacia Cliente (identidad), Cotizacion (cotizacion) y
 * Suscripcion (suscripciones) se mantienen como columnas de UUID sin FK
 * entre bases de datos (Database-per-Service).
 */
@Entity('polizas')
export class Poliza {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Numero de poliza visible para el cliente. */
  @Column({ unique: true })
  numeroPoliza!: string;

  @Column({ type: 'enum', enum: EstadoPoliza })
  estado!: EstadoPoliza;

  @Column({ type: 'timestamp' })
  fechaInicioVigencia!: Date;

  @Column({ type: 'timestamp' })
  fechaFinVigencia!: Date;

  @Column({ type: 'uuid', nullable: true })
  clienteId!: string | null;

  @Index('IDX_polizas_cotizacionId')
  @Column({ type: 'uuid', nullable: true })
  cotizacionId!: string | null;

  /** Clave de idempotencia asociada a la transaccion en ms-suscripciones. */
  @Column({ type: 'uuid', nullable: true, unique: true })
  suscripcionId!: string | null;
}
