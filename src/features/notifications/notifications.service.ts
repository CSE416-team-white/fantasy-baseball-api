import type { Response } from 'express';

export interface NotificationEvent {
  type: string;
  data: Record<string, unknown>;
  message: string;
  timestamp: string;
}

export type NotificationArchiveResult = {
  archived: boolean;
  archivedCount: number;
  status?: number;
  message?: string;
};

export class NotificationsService {
  private clients = new Set<Response>();

  private getArchiveUrl(): string | null {
    return process.env.NOTIFICATION_ARCHIVE_URL?.trim() || null;
  }

  private getArchiveApiKey(): string | null {
    return process.env.NOTIFICATION_ARCHIVE_API_KEY?.trim() || null;
  }

  private async archiveNotification(
    payload: NotificationEvent,
  ): Promise<NotificationArchiveResult> {
    const archiveUrl = this.getArchiveUrl();
    const archiveApiKey = this.getArchiveApiKey();

    if (!archiveUrl || !archiveApiKey) {
      return {
        archived: false,
        archivedCount: 0,
        message: 'Notification archive is not configured',
      };
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
        const message =
          errorText || `Archive request failed with status ${response.status}`;
        console.error(`[notifications] archive failed: ${message}`);
        return {
          archived: false,
          archivedCount: 0,
          status: response.status,
          message,
        };
      }

      const responseData = (await response.json()) as {
        data?: { archivedCount?: number };
        message?: string;
      };
      const archivedCount = responseData.data?.archivedCount ?? 0;

      return {
        archived: archivedCount > 0,
        archivedCount,
        message:
          archivedCount > 0
            ? undefined
            : (responseData.message ??
              'Notification archive completed, but no user records were available'),
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Archive request failed';
      console.error('[notifications] archive request failed', error);
      return {
        archived: false,
        archivedCount: 0,
        message,
      };
    }
  }

  addClient(res: Response): void {
    this.clients.add(res);
  }

  removeClient(res: Response): void {
    this.clients.delete(res);
  }

  async push(
    event: Omit<NotificationEvent, 'timestamp'>,
  ): Promise<NotificationArchiveResult> {
    const payload: NotificationEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };
    const sseMessage = `data: ${JSON.stringify(payload)}\n\n`;
    for (const client of this.clients) {
      client.write(sseMessage);
    }
    const archiveResult = await this.archiveNotification(payload);
    console.log(
      `[notifications] pushed "${event.type}" to ${this.clients.size} client(s)`,
    );
    return archiveResult;
  }

  schedulePush(
    event: Omit<NotificationEvent, 'timestamp'>,
    delayMs: number,
  ): NodeJS.Timeout {
    return setTimeout(() => {
      void this.push(event);
    }, delayMs);
  }

  get clientCount(): number {
    return this.clients.size;
  }
}

export const notificationsService = new NotificationsService();
