import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Fly.io Launch 자동 연동이 생성한 CommonJS 스크립트 (우리 Dockerfile에서는 사용하지 않음)
    "dbsetup.js",
  ]),
]);

export default eslintConfig;
