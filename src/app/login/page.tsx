import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "./LoginForm";
import { getAppTitle } from "@/lib/branding";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await getAppTitle() };
}

export default async function LoginPage() {
  const title = await getAppTitle();
  return (
    <Suspense>
      <LoginForm title={title} />
    </Suspense>
  );
}
