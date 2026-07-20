import { ImageResponse } from "next/og";
import { MessageBubbleIcon } from "@/lib/appIcon";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<MessageBubbleIcon size={32} />, { ...size });
}
