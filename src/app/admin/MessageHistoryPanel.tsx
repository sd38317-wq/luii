"use client";

import { useState } from "react";

type MessageLog = {
  id: string;
  customerName: string;
  phone: string;
  messageType: "DAY_BEFORE" | "REMINDER" | "CHECKOUT_NOTICE" | "FOLLOW_UP";
  success: boolean;
  error: string | null;
  createdAt: string;
};

type Stats = {
  monthLabel: string;
  reservations: number;
  sent: number;
  failed: number;
};

const TYPE_LABELS: Record<MessageLog["messageType"], string> = {
  DAY_BEFORE: "⓪ 전날 안내",
  REMINDER: "① 예약 안내",
  CHECKOUT_NOTICE: "② 퇴실 안내",
  FOLLOW_UP: "③ 리뷰 요청",
};

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export default function MessageHistoryPanel() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (!next) return;

    setLoading(true);
    try {
      const res = await fetch("/api/message-logs");
      const data = await res.json();
      setLogs(data.logs ?? []);
      setStats(data.stats ?? null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-8 rounded-2xl border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold text-gray-700">발송 이력 · 이번 달 현황</span>
        <span className="text-gray-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-gray-100 p-5">
          {loading && <p className="text-sm text-gray-400">불러오는 중...</p>}

          {!loading && stats && (
            <div className="mb-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-lg font-bold text-gray-900">{stats.reservations}</p>
                <p className="text-xs text-gray-500">{stats.monthLabel} 예약</p>
              </div>
              <div className="rounded-lg bg-green-50 p-3 text-center">
                <p className="text-lg font-bold text-green-700">{stats.sent}</p>
                <p className="text-xs text-gray-500">발송 성공</p>
              </div>
              <div className={`rounded-lg p-3 text-center ${stats.failed > 0 ? "bg-red-50" : "bg-gray-50"}`}>
                <p className={`text-lg font-bold ${stats.failed > 0 ? "text-red-600" : "text-gray-900"}`}>
                  {stats.failed}
                </p>
                <p className="text-xs text-gray-500">발송 실패</p>
              </div>
            </div>
          )}

          {!loading && logs.length === 0 && (
            <p className="text-sm text-gray-400">아직 발송 기록이 없어요.</p>
          )}

          {!loading && logs.length > 0 && (
            <ul className="divide-y divide-gray-100">
              {logs.map((log) => (
                <li key={log.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{log.customerName}</span>{" "}
                      <span className="text-gray-400">{log.phone}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {TYPE_LABELS[log.messageType] ?? log.messageType} · {formatTime(log.createdAt)}
                    </p>
                    {!log.success && log.error && (
                      <p className="mt-0.5 break-all text-xs text-red-500">{log.error}</p>
                    )}
                  </div>
                  <span
                    className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      log.success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                    }`}
                  >
                    {log.success ? "성공" : "실패"}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {!loading && logs.length > 0 && (
            <p className="mt-3 text-xs text-gray-400">
              최근 {logs.length}건까지 표시됩니다. 기록은 90일 동안 보관돼요.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
