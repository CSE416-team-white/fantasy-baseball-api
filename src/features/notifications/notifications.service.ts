import type { Response } from 'express';

export interface NotificationEvent {
  type: string;
  data: Record<string, unknown>;
  message: string;
  timestamp: string;
}

export class NotificationsService {
  private clients = new Set<Response>();

  private getArchiveUrl(): string | null {
    return process.env.NOTIFICATION_ARCHIVE_URL?.trim() || null;
  }

  private getArchiveApiKey(): string | null {
    return process.env.NOTIFICATION_ARCHIVE_API_KEY?.trim() || null;
  }

  private async archiveNotification(payload: NotificationEvent): Promise<void> {
    const archiveUrl = this.getArchiveUrl();
    const archiveApiKey = this.getArchiveApiKey();

    if (!archiveUrl || !archiveApiKey) {
      return;
    }

    try {
      const response = await fetch(archiveUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': archiveApiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = (await response.text()).trim();
        console.error(
          `[notifications] archive failed with ${response.status}: ${errorText || 'unknown error'}`,
        );
      }
    } catch (error) {
      console.error('[notifications] archive request failed', error);
    }
  }

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
    void this.archiveNotification(payload);
    console.log(
      `[notifications] pushed "${event.type}" to ${this.clients.size} client(s)`,
    );
  }

  schedulePush(
    event: Omit<NotificationEvent, 'timestamp'>,
    delayMs: number,
  ): NodeJS.Timeout {
    return setTimeout(() => {
      this.push(event);
    }, delayMs);
  }

  get clientCount(): number {
    return this.clients.size;
  }
}

export const notificationsService = new NotificationsService();
