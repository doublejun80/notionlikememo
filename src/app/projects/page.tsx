import { AppShell } from "@/components/layout/app-shell";
import { ProjectsScreen } from "@/features/project/projects-screen";

export default function ProjectsPage() {
  return (
    <AppShell active="projects">
      <ProjectsScreen />
    </AppShell>
  );
}

