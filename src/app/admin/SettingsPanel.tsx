"use client";

import { useEffect, useState, FormEvent } from "react";
import { DEFAULT_CHECKOUT_NOTICE_TEMPLATE, DEFAULT_FOLLOWUP_TEMPLATE } from "@/lib/messageTemplates";

type Settings = {
  cafeName: string | null;
  address: string | null;
  parkingInfo: string | null;
  rules: string | null;
  checkoutDaysAfter: number | null;
  checkoutTime: string | null;
  reviewLink: string | null;
  giftEventContact: string | null;
  adOptOutNumber: string | null;
  checkoutNoticeTemplate: string | null;
  followUpTemplate: string | null;
};

const emptySettings: Settings = {
  cafeName: "",
  address: "",
  parkingInfo: "",
  rules: "",
  checkoutDaysAfter: 1,
  checkoutTime: "11:59",
  reviewLink: "",
  giftEventContact: "",
  adOptOutNumber: "",
  checkoutNoticeTemplate: DEFAULT_CHECKOUT_NOTICE_TEMPLATE,
  followUpTemplate: DEFAULT_FOLLOWUP_TEMPLATE,
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
          checkoutDaysAfter: data.checkoutDaysAfter ?? 1,
          checkoutTime: data.checkoutTime ?? "11:59",
          reviewLink: data.reviewLink ?? "",
          giftEventContact: data.giftEventContact ?? "",
          adOptOutNumber: data.adOptOutNumber ?? "",
          checkoutNoticeTemplate: data.checkoutNoticeTemplate ?? DEFAULT_CHECKOUT_NOTICE_TEMPLATE,
          followUpTemplate: data.followUpTemplate ?? DEFAULT_FOLLOWUP_TEMPLATE,
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
            여기에 적어두면 예약 안내 문자(전날 20시 안내 + 30분 전 안내)에 자동으로 들어갑니다. 비워두면 그
            줄은 문자에서 빠집니다.
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

          <div className="mt-2 border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-500">
              마지막 리뷰 요청 문자(③번)는 예약 시각 기준 아래 기준으로 발송됩니다. 광고성 문자는 법적으로
              밤 9시~아침 8시에 보낼 수 없으니, 발송 시각은 그 사이를 피해서 정해주세요.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-sm text-gray-700">예약일 +</span>
            <input
              type="number"
              min={0}
              placeholder="1"
              value={settings.checkoutDaysAfter ?? ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  checkoutDaysAfter: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              className="w-16 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 focus:border-orange-400 focus:outline-none sm:text-sm"
            />
            <span className="whitespace-nowrap text-sm text-gray-700">일 후</span>
            <input
              type="time"
              value={settings.checkoutTime ?? ""}
              onChange={(e) => setSettings({ ...settings, checkoutTime: e.target.value })}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 focus:border-orange-400 focus:outline-none sm:text-sm"
            />
          </div>

          <input
            placeholder="리뷰 작성 링크 (네이버 플레이스 리뷰 URL, 선택)"
            value={settings.reviewLink ?? ""}
            onChange={(e) => setSettings({ ...settings, reviewLink: e.target.value })}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 focus:border-orange-400 focus:outline-none sm:text-sm"
          />

          <input
            placeholder="인증/환급 받을 연락처 (예: 010-0000-0000, 비워두면 관련 안내 문구 빠짐)"
            value={settings.giftEventContact ?? ""}
            onChange={(e) => setSettings({ ...settings, giftEventContact: e.target.value })}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 focus:border-orange-400 focus:outline-none sm:text-sm"
          />
          <p className="-mt-2 text-xs text-gray-400">
            이 연락처로 퇴실 정돈 사진, 세븐일레븐 영수증+계좌번호, 리뷰 캡처를 받습니다. 확인 후 환급/상품권
            지급은 사장님이 직접 해주셔야 해요 (자동 아님).
          </p>

          <input
            placeholder="무료수신거부 080 번호 (예: 080-1234-5678)"
            value={settings.adOptOutNumber ?? ""}
            onChange={(e) => setSettings({ ...settings, adOptOutNumber: e.target.value })}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 focus:border-orange-400 focus:outline-none sm:text-sm"
          />
          <p className="-mt-2 text-xs text-gray-400">
            상품권/환급 혜택이 들어간 ②③번 문자는 법적으로 광고성 문자라서, 앞에 (광고) 표기와 끝에
            무료수신거부 080 번호가 자동으로 붙어요. 080 번호는 알리고 사이트의 부가서비스 메뉴에서
            개통할 수 있습니다 (개통 전까지는 (광고) 표기만 붙어요).
          </p>

          <div className="mt-2 border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-500">
              ②번 퇴실 안내 문자는 예약마다 등록한 <strong>퇴실 시간 10분 전</strong>에 나갑니다 (퇴실
              시간을 안 적으면 이용 시작 1시간 후에 나가요). ②③번 문자 내용은 아래에서 직접 고칠 수 있어요.
              <br />
              사용 가능한 자리표시자: <code>{"{고객명}"}</code>, <code>{"{카페명}"}</code>,{" "}
              <code>{"{연락처}"}</code>
              {" (③번은 "}
              <code>{"{리뷰링크}"}</code>
              {"도 사용 가능)"}
            </p>
          </div>

          <textarea
            placeholder="② 퇴실 안내 문자"
            rows={6}
            value={settings.checkoutNoticeTemplate ?? ""}
            onChange={(e) => setSettings({ ...settings, checkoutNoticeTemplate: e.target.value })}
            className="col-span-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 focus:border-orange-400 focus:outline-none sm:text-sm"
          />

          <textarea
            placeholder="③ 리뷰 요청 문자 (마지막 문자)"
            rows={8}
            value={settings.followUpTemplate ?? ""}
            onChange={(e) => setSettings({ ...settings, followUpTemplate: e.target.value })}
            className="col-span-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 focus:border-orange-400 focus:outline-none sm:text-sm"
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
