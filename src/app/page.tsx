import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, isValidSessionValue } from "@/lib/auth";

export default async function Home() {
  const cookieStore = await cookies();
  const valid = await isValidSessionValue(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  redirect(valid ? "/admin" : "/login");
}
