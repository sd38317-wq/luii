"use client";

import { useEffect, useState, useCallback, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import SettingsPanel from "./SettingsPanel";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

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
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

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

  async function handleImageAttach(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setParsing(true);
    setParseError(null);

    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/reservations/parse-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mediaType: file.type }),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setParseError(data.error ?? "사진에서 정보를 읽지 못했습니다.");
        return;
      }

      const pad = (n: number) => String(n).padStart(2, "0");
      setForm({
        customerName: data.customerName ?? "",
        phone: data.phone ?? "",
        reservationTime: `${data.year}-${pad(data.month)}-${pad(data.day)}T${pad(data.hour)}:${pad(data.minute)}`,
        partySize: data.partySize ? String(data.partySize) : "",
        memo: "",
      });
    } catch {
      setParseError("사진 처리 중 오류가 발생했습니다.");
    } finally {
      setParsing(false);
    }
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
          <h1 className="text-xl font-bold text-gray-900">바른프라이빗키즈룸 _ 괴정점 예약관리</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 underline hover:text-gray-700"
          >
            로그아웃
          </button>
        </div>

        <SettingsPanel />

        <form
          onSubmit={handleSubmit}
          className="mb-8 grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-2"
        >
          <h2 className="col-span-full text-sm font-semibold text-gray-700">
            네이버 예약 알림 받으면 여기에 등록하세요
          </h2>

          <label className="col-span-full flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-orange-300 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-700 hover:bg-orange-100">
            {parsing ? "사진에서 읽는 중..." : "📷 예약창 캡처로 자동 입력"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={parsing}
              onChange={handleImageAttach}
            />
          </label>
          {parseError && <p className="col-span-full text-sm text-red-500">{parseError}</p>}

          <input
            required
            placeholder="고객명 *"
            autoComplete="name"
            value={form.customerName}
            onChange={(e) => setForm({ ...form, customerName: e.target.value })}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 focus:border-orange-400 focus:outline-none sm:text-sm"
          />
          <input
            required
            placeholder="연락처 * (010-1234-5678)"
            inputMode="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 focus:border-orange-400 focus:outline-none sm:text-sm"
          />
          <input
            required
            type="datetime-local"
            value={form.reservationTime}
            onChange={(e) => setForm({ ...form, reservationTime: e.target.value })}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 focus:border-orange-400 focus:outline-none sm:text-sm"
          />
          <input
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="인원수 (선택)"
            value={form.partySize}
            onChange={(e) => setForm({ ...form, partySize: e.target.value })}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 focus:border-orange-400 focus:outline-none sm:text-sm"
          />
          <input
            placeholder="메모 (선택)"
            value={form.memo}
            onChange={(e) => setForm({ ...form, memo: e.target.value })}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 focus:border-orange-400 focus:outline-none sm:text-sm sm:col-span-2"
          />

          {error && <p className="col-span-full text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="col-span-full rounded-lg bg-orange-500 py-3 text-base font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50 sm:py-2.5 sm:text-sm"
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
                  <p className="mt-0.5 text-sm text-gray-700">
                    {formatDateTime(r.reservationTime)} · {r.phone}
                    {r.partySize ? ` · ${r.partySize}명` : ""}
                  </p>
                  {r.memo && <p className="mt-0.5 text-xs text-gray-600">{r.memo}</p>}
                </div>
                <div className="flex gap-2 text-sm">
                  <button
                    onClick={() => handleCancel(r.id)}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-gray-600 hover:bg-gray-50 sm:flex-none sm:py-1.5"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="flex-1 rounded-lg border border-red-200 px-3 py-2 text-red-500 hover:bg-red-50 sm:flex-none sm:py-1.5"
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
                  className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-white/60 p-4 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between"
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
