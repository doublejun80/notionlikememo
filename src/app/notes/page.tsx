import { AppShell } from "@/components/layout/app-shell";
import { NotesScreen } from "@/features/note/notes-screen";

export default function NotesPage() {
  return (
    <AppShell active="notes">
      <NotesScreen />
    </AppShell>
  );
}

