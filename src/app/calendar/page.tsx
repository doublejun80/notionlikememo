import { AppShell } from "@/components/layout/app-shell";
import { CalendarScreen } from "@/features/calendar/calendar-screen";

export default function CalendarPage() {
  return (
    <AppShell active="calendar">
      <CalendarScreen />
    </AppShell>
  );
}

