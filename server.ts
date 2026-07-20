import { createServer } from "http";
import cron from "node-cron";
import next from "next";
import { runReminderCheck } from "./src/lib/reminder";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT) || 3000;
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    handle(req, res);
  }).listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });

  cron.schedule("* * * * *", async () => {
    try {
      const sentCount = await runReminderCheck();
      if (sentCount > 0) {
        console.log(`[cron] reminder check sent ${sentCount} message(s)`);
      }
    } catch (err) {
      console.error("[cron] reminder check failed:", err);
    }
  });

  console.log("[cron] 30분 전 예약 알림 스케줄러 시작 (1분마다 확인)");
});
