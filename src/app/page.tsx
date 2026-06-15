import { AppShell } from "@/components/layout/app-shell";
import { TodayScreen } from "@/features/today/today-screen";

export default function HomePage() {
  return (
    <AppShell active="today">
      <TodayScreen />
    </AppShell>
  );
}
