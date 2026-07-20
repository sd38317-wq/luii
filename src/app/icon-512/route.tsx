import { ImageResponse } from "next/og";
import { MessageBubbleIcon } from "@/lib/appIcon";

export async function GET() {
  return new ImageResponse(<MessageBubbleIcon size={512} />, {
    width: 512,
    height: 512,
  });
}
