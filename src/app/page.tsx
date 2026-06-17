import { NodiaryWorkspace } from "@/features/nodiary/nodiary-workspace";
import { getNodiaryTodayIsoDate } from "@/features/nodiary/nodiary-model";

export const dynamic = "force-dynamic";

export default function HomePage({
  todayIsoDate = getNodiaryTodayIsoDate()
}: {
  todayIsoDate?: string;
} = {}) {
  return <NodiaryWorkspace todayIsoDate={todayIsoDate} />;
}
