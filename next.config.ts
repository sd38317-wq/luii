import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // tesseract.js가 런타임에 워커 스크립트 파일 경로를 동적으로 찾기 때문에,
  // 번들러가 이 패키지를 건드리면 그 경로 계산이 깨진다. 번들링에서 제외하고
  // node_modules에서 그대로 require하도록 한다.
  serverExternalPackages: ["tesseract.js", "sharp"],
};

export default nextConfig;
