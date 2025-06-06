import { redirect } from "next/navigation";
import { FeederUI } from "./feeder-ui";
import { getFeederById } from "@/lib/actions/feeders";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FeederPage({ params }: PageProps) {
  const resolvedParams = await params;
  const feeder = await getFeederById(resolvedParams.id);

  if (!feeder) {
    redirect("/dashboard");
  }

  return <FeederUI feeder={feeder} />;
}
