import type { Response } from 'express';

export interface NotificationEvent {
  type: string;
  data: Record<string, unknown>;
  message: string;
  timestamp: string;
}

export class NotificationsService {
  private clients = new Set<Response>();

  addClient(res: Response): void {
    this.clients.add(res);
  }

  removeClient(res: Response): void {
    this.clients.delete(res);
  }

  push(event: Omit<NotificationEvent, 'timestamp'>): void {
    const payload: NotificationEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };
    const sseMessage = `data: ${JSON.stringify(payload)}\n\n`;
    for (const client of this.clients) {
      client.write(sseMessage);
    }
    console.log(`[notifications] pushed "${event.type}" to ${this.clients.size} client(s)`);
  }

  get clientCount(): number {
    return this.clients.size;
  }
}

export const notificationsService = new NotificationsService();
