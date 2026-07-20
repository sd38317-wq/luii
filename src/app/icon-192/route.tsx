import { ImageResponse } from "next/og";
import { MessageBubbleIcon } from "@/lib/appIcon";

export async function GET() {
  return new ImageResponse(<MessageBubbleIcon size={192} />, {
    width: 192,
    height: 192,
  });
}
