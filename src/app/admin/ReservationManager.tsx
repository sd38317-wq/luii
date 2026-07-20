"use client";

import { useEffect, useState, useCallback, FormEvent } from "react";
import { useRouter } from "next/navigation";

type Reservation = {
  id: string;
  customerName: string;
  phone: string;
  reservationTime: string;
  partySize: number | null;
  memo: string | null;
  status: "PENDING" | "CANCELLED";
  reminderSentAt: string | null;
  createdAt: string;
};

const emptyForm = {
  customerName: "",
  phone: "",
  reservationTime: "",
  partySize: "",
  memo: "",
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function minutesUntil(iso: string) {
  const diffMs = new Date(iso).getTime() - Date.now();
  return Math.round(diffMs / 60000);
}

function StatusBadge({ r }: { r: Reservation }) {
  if (r.status === "CANCELLED") {
    return <span className="rounded-full bg-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600">취소됨</span>;
  }
  if (r.reminderSentAt) {
    return <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">문자 발송완료</span>;
  }
  const mins = minutesUntil(r.reservationTime);
  if (mins < 0) {
    return <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">시간 경과</span>;
  }
  if (mins <= 30) {
    return <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-700">발송 대기 (곧 발송)</span>;
  }
  return <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">예약됨</span>;
}

export default function ReservationManager() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchReservations = useCallback(async () => {
    const res = await fetch("/api/reservations", { cache: "no-store" });
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    const data = await res.json();
    setReservations(data);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    fetchReservations();
    const interval = setInterval(fetchReservations, 20000);
    return () => clearInterval(interval);
  }, [fetchReservations]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        reservationTime: form.reservationTime
          ? new Date(form.reservationTime).toISOString()
          : "",
        partySize: form.partySize || null,
      }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "등록에 실패했습니다.");
      return;
    }

    setForm(emptyForm);
    fetchReservations();
  }

  async function handleCancel(id: string) {
    await fetch(`/api/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    fetchReservations();
  }

  async function handleDelete(id: string) {
    if (!confirm("이 예약을 삭제할까요?")) return;
    await fetch(`/api/reservations/${id}`, { method: "DELETE" });
    fetchReservations();
  }

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  }

  const upcoming = reservations.filter((r) => r.status === "PENDING");
  const others = reservations.filter((r) => r.status !== "PENDING");

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">키즈카페 예약 관리</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 underline hover:text-gray-700"
          >
            로그아웃
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mb-8 grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-2"
        >
          <h2 className="col-span-full text-sm font-semibold text-gray-700">
            네이버 예약 알림 받으면 여기에 등록하세요
          </h2>

          <input
            required
            placeholder="고객명 *"
            value={form.customerName}
            onChange={(e) => setForm({ ...form, customerName: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
          />
          <input
            required
            placeholder="연락처 * (010-1234-5678)"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
          />
          <input
            required
            type="datetime-local"
            value={form.reservationTime}
            onChange={(e) => setForm({ ...form, reservationTime: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
          />
          <input
            type="number"
            min={1}
            placeholder="인원수 (선택)"
            value={form.partySize}
            onChange={(e) => setForm({ ...form, partySize: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
          />
          <input
            placeholder="메모 (선택)"
            value={form.memo}
            onChange={(e) => setForm({ ...form, memo: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none sm:col-span-2"
          />

          {error && <p className="col-span-full text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="col-span-full rounded-lg bg-orange-500 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
          >
            {submitting ? "등록 중..." : "예약 등록"}
          </button>
        </form>

        <h2 className="mb-3 text-sm font-semibold text-gray-700">예정된 예약 ({upcoming.length})</h2>
        {loading ? (
          <p className="text-sm text-gray-400">불러오는 중...</p>
        ) : upcoming.length === 0 ? (
          <p className="text-sm text-gray-400">등록된 예약이 없습니다.</p>
        ) : (
          <ul className="mb-8 space-y-2">
            {upcoming.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{r.customerName}</span>
                    <StatusBadge r={r} />
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {formatDateTime(r.reservationTime)} · {r.phone}
                    {r.partySize ? ` · ${r.partySize}명` : ""}
                  </p>
                  {r.memo && <p className="mt-0.5 text-xs text-gray-400">{r.memo}</p>}
                </div>
                <div className="flex gap-2 text-sm">
                  <button
                    onClick={() => handleCancel(r.id)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-gray-600 hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-red-500 hover:bg-red-50"
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {others.length > 0 && (
          <>
            <h2 className="mb-3 text-sm font-semibold text-gray-700">지난 / 취소된 예약</h2>
            <ul className="space-y-2">
              {others.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-white/60 p-4 text-sm text-gray-500"
                >
                  <div>
                    <span className="font-medium text-gray-700">{r.customerName}</span>{" "}
                    · {formatDateTime(r.reservationTime)} · {r.phone}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge r={r} />
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-500 hover:bg-red-50"
                    >
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
