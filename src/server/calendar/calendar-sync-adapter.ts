import type { RiskLevel } from "@/features/nodiary/nodiary-model";

export type CalendarProvider = "google" | "apple";

export type LocalCalendarEvent = {
  id: string;
  provider: CalendarProvider;
  providerEventId: string;
  title: string;
  date: string;
  time: string;
  updatedAt: string;
};

export type ExternalCalendarEvent = {
  providerEventId: string;
  title: string;
  date: string;
  time: string;
  updatedAt: string;
};

export type CalendarProviderAdapter = {
  provider: CalendarProvider;
  listEvents: () => Promise<ExternalCalendarEvent[]>;
};

export type CalendarSyncProposal = {
  provider: CalendarProvider;
  providerEventId: string;
  localEventId: string;
  kind: "external_newer";
  riskLevel: RiskLevel;
  summary: string;
  patch: {
    title: string;
    date: string;
    time: string;
  };
};

export type CalendarSyncPreview = {
  proposals: CalendarSyncProposal[];
  accessIssues: Array<{
    provider: CalendarProvider;
    status: "blocked";
    message: string;
  }>;
};

export async function previewCalendarSync(
  localEvents: LocalCalendarEvent[],
  providers: CalendarProviderAdapter[]
): Promise<CalendarSyncPreview> {
  const proposals: CalendarSyncProposal[] = [];
  const accessIssues: CalendarSyncPreview["accessIssues"] = [];
  const localEventsByProviderKey = new Map(
    localEvents.map((event) => [
      createProviderKey(event.provider, event.providerEventId),
      event
    ])
  );

  for (const provider of providers) {
    let externalEvents: ExternalCalendarEvent[];

    try {
      externalEvents = await provider.listEvents();
    } catch {
      accessIssues.push({
        provider: provider.provider,
        status: "blocked",
        message: `${provider.provider} calendar preview failed`
      });
      continue;
    }

    for (const externalEvent of externalEvents) {
      const localEvent = localEventsByProviderKey.get(
        createProviderKey(provider.provider, externalEvent.providerEventId)
      );

      if (!localEvent || !isExternalEventNewer(localEvent, externalEvent)) {
        continue;
      }

      if (
        localEvent.title === externalEvent.title &&
        localEvent.date === externalEvent.date &&
        localEvent.time === externalEvent.time
      ) {
        continue;
      }

      proposals.push({
        provider: provider.provider,
        providerEventId: externalEvent.providerEventId,
        localEventId: localEvent.id,
        kind: "external_newer",
        riskLevel: "high",
        summary: `${formatProviderName(provider.provider)} 변경을 승인 큐로 가져옵니다: ${externalEvent.title} ${externalEvent.date} ${externalEvent.time}`,
        patch: {
          title: externalEvent.title,
          date: externalEvent.date,
          time: externalEvent.time
        }
      });
    }
  }

  return {
    proposals,
    accessIssues
  };
}

function createProviderKey(provider: CalendarProvider, providerEventId: string) {
  return `${provider}:${providerEventId}`;
}

function isExternalEventNewer(
  localEvent: LocalCalendarEvent,
  externalEvent: ExternalCalendarEvent
) {
  return Date.parse(externalEvent.updatedAt) > Date.parse(localEvent.updatedAt);
}

function formatProviderName(provider: CalendarProvider) {
  return provider === "google" ? "Google Calendar" : "Apple Calendar";
}
