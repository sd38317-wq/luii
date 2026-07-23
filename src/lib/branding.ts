import { connection } from "next/server";
import { prisma } from "./prisma";

// 화면에 표시되는 앱 이름(로그인 화면, 브라우저 탭, PWA 이름)을 설정의 카페명에서 가져온다.
// 코드에 가게 이름을 박아두지 않아야, 같은 코드를 다른 가게에 배포할 때 코드 수정 없이
// 설정만으로 그 가게 이름이 뜬다 (판매용 템플릿화의 핵심).
export async function getAppTitle(): Promise<string> {
  try {
    // 빌드(프리렌더) 시점에는 프로덕션 DB가 없으므로, 요청 시점에만 DB를 읽도록 한다.
    await connection();
    const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
    const cafeName = settings?.cafeName || process.env.CAFE_NAME;
    return cafeName ? `${cafeName} 예약관리` : "예약관리";
  } catch {
    return process.env.CAFE_NAME ? `${process.env.CAFE_NAME} 예약관리` : "예약관리";
  }
}
