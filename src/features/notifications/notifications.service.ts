import type { Response } from 'express';

export interface NotificationEvent {
  type: string;
  data: Record<string, unknown>;
  message: string;
  timestamp: string;
}

type NotificationPushInput = Omit<NotificationEvent, 'timestamp'> & {
  targetUserIds?: string[];
};

type NotificationArchivePayload = NotificationEvent & {
  targetUserIds?: string[];
};

type NotificationTargetsResponse = {
  success: boolean;
  data?: Record<string, string[]>;
  message?: string;
};

type ClientRecord = {
  res: Response;
  userId: string | null;
};

export type NotificationArchiveResult = {
  archived: boolean;
  archivedCount: number;
  status?: number;
  message?: string;
};

function stripSource(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripSource);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => key !== 'source')
        .map(([key, nestedValue]) => [key, stripSource(nestedValue)]),
    );
  }

  return value;
}

function normalizeTargetUserIds(targetUserIds?: string[]): string[] {
  if (!targetUserIds || targetUserIds.length === 0) {
    return [];
  }

  return [
    ...new Set(targetUserIds.map((userId) => userId.trim()).filter(Boolean)),
  ];
}

export class NotificationsService {
  private clients = new Set<ClientRecord>();

  private getArchiveUrl(): string | null {
    return process.env.NOTIFICATION_ARCHIVE_URL?.trim() || null;
  }

  private getArchiveApiKey(): string | null {
    return process.env.NOTIFICATION_ARCHIVE_API_KEY?.trim() || null;
  }

  private getTargetUsersUrl(): string | null {
    const configuredUrl = process.env.NOTIFICATION_TARGET_USERS_URL?.trim();

    if (configuredUrl) {
      return configuredUrl;
    }

    const archiveUrl = this.getArchiveUrl();

    if (!archiveUrl) {
      return null;
    }

    try {
      const url = new URL(archiveUrl);
      url.pathname = '/api/system/notifications/target-users';
      url.search = '';
      return url.toString();
    } catch {
      return null;
    }
  }

  private async archiveNotification(
    payload: NotificationArchivePayload,
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

  addClient(res: Response, userId?: string | null): void {
    this.clients.add({ res, userId: userId ?? null });
  }

  removeClient(res: Response): void {
    for (const client of this.clients) {
      if (client.res === res) {
        this.clients.delete(client);
      }
    }
  }

  async resolveTargetUserIdsByPlayerIds(
    playerIds: string[],
  ): Promise<Record<string, string[]>> {
    const targetUsersUrl = this.getTargetUsersUrl();
    const archiveApiKey = this.getArchiveApiKey();
    const normalizedPlayerIds = [
      ...new Set(playerIds.map((id) => id.trim()).filter(Boolean)),
    ];

    if (!targetUsersUrl || !archiveApiKey || normalizedPlayerIds.length === 0) {
      return {};
    }

    try {
      const response = await fetch(targetUsersUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': archiveApiKey,
        },
        body: JSON.stringify({ playerIds: normalizedPlayerIds }),
      });

      if (!response.ok) {
        const message = (await response.text()).trim();
        console.error(
          `[notifications] target-user lookup failed: ${message || response.status}`,
        );
        return {};
      }

      const payload = (await response.json()) as NotificationTargetsResponse;
      return payload.success && payload.data ? payload.data : {};
    } catch (error) {
      console.error('[notifications] target-user lookup request failed', error);
      return {};
    }
  }

  async push(event: NotificationPushInput): Promise<NotificationArchiveResult> {
    const targetUserIds = normalizeTargetUserIds(event.targetUserIds);
    const sanitizedEvent = {
      type: event.type,
      message: event.message,
      data: (stripSource(event.data) ?? {}) as Record<string, unknown>,
    };
    const payload: NotificationArchivePayload = {
      ...sanitizedEvent,
      ...(targetUserIds.length > 0 ? { targetUserIds } : {}),
      timestamp: new Date().toISOString(),
    };
    const sseMessage = `data: ${JSON.stringify({
      type: payload.type,
      message: payload.message,
      data: payload.data,
      timestamp: payload.timestamp,
    })}\n\n`;

    let deliveredCount = 0;

    for (const client of this.clients) {
      if (
        targetUserIds.length > 0 &&
        (!client.userId || !targetUserIds.includes(client.userId))
      ) {
        continue;
      }

      client.res.write(sseMessage);
      deliveredCount += 1;
    }

    const archiveResult = await this.archiveNotification(payload);
    console.log(
      `[notifications] pushed "${event.type}" to ${deliveredCount} client(s)`,
    );
    return archiveResult;
  }

  schedulePush(
    event: Omit<NotificationPushInput, 'timestamp'>,
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
