import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Response } from 'express';
import { NotificationsService } from './notifications.service.js';

function mockRes(): Response {
  return { write: vi.fn() } as unknown as Response;
}

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(() => {
    service = new NotificationsService();
    delete process.env.NOTIFICATION_ARCHIVE_URL;
    delete process.env.NOTIFICATION_ARCHIVE_API_KEY;
    vi.restoreAllMocks();
  });

  describe('clientCount', () => {
    it('starts at zero', () => {
      expect(service.clientCount).toBe(0);
    });

    it('increments when a client is added', () => {
      service.addClient(mockRes());
      service.addClient(mockRes());
      expect(service.clientCount).toBe(2);
    });

    it('decrements when a client is removed', () => {
      const res = mockRes();
      service.addClient(res);
      service.addClient(mockRes());
      service.removeClient(res);
      expect(service.clientCount).toBe(1);
    });

    it('does not go below zero on removing unknown client', () => {
      service.removeClient(mockRes());
      expect(service.clientCount).toBe(0);
    });
  });

  describe('push', () => {
    it('writes an SSE data line to every connected client', async () => {
      const res1 = mockRes();
      const res2 = mockRes();
      service.addClient(res1);
      service.addClient(res2);

      await service.push({
        type: 'injury-update',
        message: 'Player injured',
        data: { player: 'Judge' },
      });

      expect(res1.write).toHaveBeenCalledOnce();
      expect(res2.write).toHaveBeenCalledOnce();
    });

    it('sends valid SSE format (data: ...\\n\\n)', async () => {
      const res = mockRes();
      service.addClient(res);

      await service.push({ type: 'test-event', message: 'hello', data: {} });

      const written = (res.write as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as string;
      expect(written).toMatch(/^data: /);
      expect(written).toMatch(/\n\n$/);
    });

    it('includes type, message, and timestamp in the payload', async () => {
      const res = mockRes();
      service.addClient(res);

      await service.push({
        type: 'depth-charts-updated',
        message: 'Charts refreshed',
        data: { count: 30 },
      });

      const written = (res.write as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as string;
      const payload = JSON.parse(written.replace('data: ', '').trim());
      expect(payload.type).toBe('depth-charts-updated');
      expect(payload.message).toBe('Charts refreshed');
      expect(payload.data).toEqual({ count: 30 });
      expect(payload.timestamp).toBeDefined();
      expect(new Date(payload.timestamp).getTime()).not.toBeNaN();
    });

    it('does not throw when there are no connected clients', async () => {
      await expect(
        service.push({ type: 'orphan', message: 'no one listening', data: {} }),
      ).resolves.toMatchObject({ archived: false, archivedCount: 0 });
    });

    it('does not write to removed clients', async () => {
      const res = mockRes();
      service.addClient(res);
      service.removeClient(res);

      await service.push({ type: 'late-event', message: 'too late', data: {} });

      expect(res.write).not.toHaveBeenCalled();
    });

    it('only writes to clients connected at push time', async () => {
      const earlyClient = mockRes();
      service.addClient(earlyClient);

      await service.push({ type: 'early', message: 'early push', data: {} });

      const lateClient = mockRes();
      service.addClient(lateClient);

      expect(earlyClient.write).toHaveBeenCalledOnce();
      expect(lateClient.write).not.toHaveBeenCalled();
    });

    it('archives pushed notifications when archive env vars are configured', async () => {
      process.env.NOTIFICATION_ARCHIVE_URL =
        'https://draft-kit-backend.example.com/api/system/notifications/archive';
      process.env.NOTIFICATION_ARCHIVE_API_KEY = 'archive-key';

      const fetchSpy = vi
        .spyOn(global, 'fetch')
        .mockResolvedValue(
          new Response(
            JSON.stringify({ success: true, data: { archivedCount: 2 } }),
            { status: 201 },
          ),
        );

      const result = await service.push({
        type: 'test-event',
        message: 'archive this',
        data: { source: 'unit-test' },
      });

      expect(fetchSpy).toHaveBeenCalledOnce();
      expect(result.archived).toBe(true);
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://draft-kit-backend.example.com/api/system/notifications/archive',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': 'archive-key',
          }),
        }),
      );
    });
  });
});
