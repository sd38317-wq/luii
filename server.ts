import { createServer } from "http";
import cron from "node-cron";
import next from "next";
import {
  runDayBeforeReminderCheck,
  runReminderCheck,
  runFollowUpCheck,
  runCheckoutNoticeCheck,
} from "./src/lib/reminder";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT) || 3000;
const app = next({ dev });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer((req, res) => {
      handle(req, res);
    }).listen(port, () => {
      console.log(`> Ready on http://localhost:${port}`);
    });

    cron.schedule("* * * * *", async () => {
      try {
        const sentCount = await runDayBeforeReminderCheck();
        if (sentCount > 0) {
          console.log(`[cron] day-before reminder check sent ${sentCount} message(s)`);
        }
      } catch (err) {
        console.error("[cron] day-before reminder check failed:", err);
      }

      try {
        const sentCount = await runReminderCheck();
        if (sentCount > 0) {
          console.log(`[cron] reminder check sent ${sentCount} message(s)`);
        }
      } catch (err) {
        console.error("[cron] reminder check failed:", err);
      }

      try {
        const sentCount = await runFollowUpCheck();
        if (sentCount > 0) {
          console.log(`[cron] follow-up check sent ${sentCount} message(s)`);
        }
      } catch (err) {
        console.error("[cron] follow-up check failed:", err);
      }

      try {
        const sentCount = await runCheckoutNoticeCheck();
        if (sentCount > 0) {
          console.log(`[cron] checkout-notice check sent ${sentCount} message(s)`);
        }
      } catch (err) {
        console.error("[cron] checkout-notice check failed:", err);
      }
    });

    console.log(
      "[cron] 전날 안내 + 30분 전 예약 알림 + 이용 후 안내 + 리뷰 안내 스케줄러 시작 (1분마다 확인)",
    );
  })
  .catch((err) => {
    console.error("[server] failed to prepare Next.js app:", err);
    process.exit(1);
  });
