import { AppShell } from "@/components/layout/app-shell";
import { SearchScreen } from "@/features/search/search-screen";

export default function SearchPage() {
  return (
    <AppShell active="search">
      <SearchScreen />
    </AppShell>
  );
}

