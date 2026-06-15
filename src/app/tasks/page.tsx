import { AppShell } from "@/components/layout/app-shell";
import { TasksScreen } from "@/features/task/tasks-screen";

export default function TasksPage() {
  return (
    <AppShell active="tasks">
      <TasksScreen />
    </AppShell>
  );
}

