import { describe, expect, it, vi } from "vitest";

import {
  previewCalendarSync,
  type CalendarProviderAdapter,
  type LocalCalendarEvent
} from "./calendar-sync-adapter";

describe("calendar sync adapter", () => {
  it("previews Google and Apple external changes without mutating local events", async () => {
    const localEvents: LocalCalendarEvent[] = [
      {
        id: "schedule-2",
        provider: "google",
        providerEventId: "google-design-review",
        title: "디자인 리뷰",
        date: "2026-06-16",
        time: "15:00",
        updatedAt: "2026-06-16T00:00:00.000Z"
      },
      {
        id: "schedule-4",
        provider: "apple",
        providerEventId: "apple-conflict-review",
        title: "캘린더 충돌 리뷰",
        date: "2026-06-18",
        time: "16:00",
        updatedAt: "2026-06-16T00:00:00.000Z"
      }
    ];
    const googleProvider: CalendarProviderAdapter = {
      provider: "google",
      listEvents: vi.fn(async () => [
        {
          providerEventId: "google-design-review",
          title: "디자인 리뷰",
          date: "2026-06-18",
          time: "16:30",
          updatedAt: "2026-06-16T01:00:00.000Z"
        }
      ])
    };
    const appleProvider: CalendarProviderAdapter = {
      provider: "apple",
      listEvents: vi.fn(async () => [
        {
          providerEventId: "apple-conflict-review",
          title: "캘린더 충돌 리뷰",
          date: "2026-06-18",
          time: "16:00",
          updatedAt: "2026-06-16T00:00:00.000Z"
        }
      ])
    };

    const preview = await previewCalendarSync(localEvents, [
      googleProvider,
      appleProvider
    ]);

    expect(googleProvider.listEvents).toHaveBeenCalledOnce();
    expect(appleProvider.listEvents).toHaveBeenCalledOnce();
    expect(localEvents[0]).toMatchObject({
      date: "2026-06-16",
      time: "15:00"
    });
    expect(preview.proposals).toEqual([
      {
        provider: "google",
        providerEventId: "google-design-review",
        localEventId: "schedule-2",
        kind: "external_newer",
        riskLevel: "high",
        summary: "Google Calendar 변경을 승인 큐로 가져옵니다: 디자인 리뷰 2026-06-18 16:30",
        patch: {
          date: "2026-06-18",
          time: "16:30",
          title: "디자인 리뷰"
        }
      }
    ]);
  });

  it("surfaces provider failures as blocked previews", async () => {
    const provider: CalendarProviderAdapter = {
      provider: "google",
      listEvents: vi.fn(async () => [])
    };

    vi.mocked(provider.listEvents).mockRejectedValueOnce(new Error("offline"));

    const preview = await previewCalendarSync([], [provider]);

    expect(preview.accessIssues).toEqual([
      {
        provider: "google",
        status: "blocked",
        message: "google calendar preview failed"
      }
    ]);
  });
});
