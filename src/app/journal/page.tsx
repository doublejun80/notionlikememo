import { AppShell } from "@/components/layout/app-shell";
import { JournalScreen } from "@/features/journal/journal-screen";

export default function JournalPage() {
  return (
    <AppShell active="journal">
      <JournalScreen />
    </AppShell>
  );
}

