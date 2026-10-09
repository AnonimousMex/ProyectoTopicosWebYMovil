import type { DomainEvent } from '@rumbo/shared';
import type { InAppNotification } from '../services/notificationService.js';

export interface EmailNotice {
  to: string;
  template: string;
  data: Record<string, unknown>;
  folio?: string | null;
}

export interface Notice {
  inApp?: InAppNotification;
  email?: EmailNotice;
}

export type NoticeBuilder = (event: DomainEvent<any>) => Promise<Notice[]> | Notice[];

/**
 * Observer: cada interesado (cliente, repartidor, administración) declara a
 * qué eventos reacciona y qué avisos genera. Agregar un nuevo interesado =
 * agregar un archivo y registrarlo; el emisor del evento no se entera.
 */
export interface NotificationSubscriber {
  readonly nombre: string;
  readonly handlers: Partial<Record<string, NoticeBuilder>>;
}
