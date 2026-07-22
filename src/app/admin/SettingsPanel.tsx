"use client";

import { useEffect, useState, FormEvent } from "react";

type Settings = {
  cafeName: string | null;
  address: string | null;
  parkingInfo: string | null;
  rules: string | null;
};

const emptySettings: Settings = {
  cafeName: "",
  address: "",
  parkingInfo: "",
  rules: "",
};

export default function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(emptySettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) =>
        setSettings({
          cafeName: data.cafeName ?? "",
          address: data.address ?? "",
          parkingInfo: data.parkingInfo ?? "",
          rules: data.rules ?? "",
        }),
      );
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });

    setSaving(false);
    setSaved(true);
  }

  return (
    <div className="mb-8 rounded-2xl border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold text-gray-700">문자 안내 문구 설정</span>
        <span className="text-gray-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 border-t border-gray-100 p-5">
          <p className="text-xs text-gray-500">
            여기에 적어두면 예약 안내 문자에 자동으로 들어갑니다. 비워두면 그 줄은 문자에서 빠집니다.
          </p>

          <input
            placeholder="가게 이름"
            value={settings.cafeName ?? ""}
            onChange={(e) => setSettings({ ...settings, cafeName: e.target.value })}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 focus:border-orange-400 focus:outline-none sm:text-sm"
          />
          <input
            placeholder="오시는 길 (주소)"
            value={settings.address ?? ""}
            onChange={(e) => setSettings({ ...settings, address: e.target.value })}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 focus:border-orange-400 focus:outline-none sm:text-sm"
          />
          <input
            placeholder="주차 안내"
            value={settings.parkingInfo ?? ""}
            onChange={(e) => setSettings({ ...settings, parkingInfo: e.target.value })}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 focus:border-orange-400 focus:outline-none sm:text-sm"
          />
          <input
            placeholder="이용 안내 (실내화/양말 착용, 보호자 동반 등)"
            value={settings.rules ?? ""}
            onChange={(e) => setSettings({ ...settings, rules: e.target.value })}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 focus:border-orange-400 focus:outline-none sm:text-sm"
          />

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
            {saved && <span className="text-sm text-green-600">저장됐어요!</span>}
          </div>
        </form>
      )}
    </div>
  );
}
