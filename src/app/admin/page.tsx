import type { Metadata } from "next";
import ReservationManager from "./ReservationManager";
import { getAppTitle } from "@/lib/branding";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await getAppTitle() };
}

export default async function AdminPage() {
  const title = await getAppTitle();
  return <ReservationManager title={title} />;
}
