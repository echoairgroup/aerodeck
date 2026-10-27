import { notFound } from "next/navigation";
import AeroDeck from "@/components/AeroDeck";

const sections = [
  "dashboard", "flight", "simbrief", "newsky", "airports", "aircraft", "weather",
  "vatsim", "training", "knowledge", "calculators", "logbook", "favorites", "settings"
];

export function generateStaticParams() {
  return sections.filter((section) => section !== "dashboard").map((section) => ({ section }));
}

export default async function WorkspaceSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!sections.includes(section)) notFound();
  return <AeroDeck initialSection={section} />;
}
