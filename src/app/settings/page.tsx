"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Sliders,
  History,
  AlertTriangle,
  RotateCcw,
  Check,
  X,
  RefreshCw,
  Power,
  ShieldAlert,
  Calculator,
  ChevronDown,
  Info,
  Calendar,
  Lock,
} from "lucide-react";
import { adminApi, ApiError } from "@/lib/api";
import {
  AdminSettingItem,
  AdminSettingsResponse,
  SettingHistoryItem,
  SimulationResult,
} from "@/lib/types";
import { useAdmin } from "@/lib/admin-context";
import { ConfirmModal } from "@/components/confirm-modal";

export default function AdminSettingsPage() {
  const { admin } = useAdmin();
  const canEdit = admin?.canEditSettings !== false;

  const [activeTab, setActiveTab] = useState<"settings" | "history">("settings");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Settings data
  const [settingsData, setSettingsData] = useState<AdminSettingsResponse | null>(null);
  const [draftValues, setDraftValues] = useState<Record<string, any>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Review & Simulation Dialog
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [changeReason, setChangeReason] = useState("");
  const [confirmRisky, setConfirmRisky] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResults, setSimulationResults] = useState<SimulationResult[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});

  // Reset Modal
  const [resetKey, setResetKey] = useState<string | null>(null);
  const [resetReason, setResetReason] = useState("");
  const [resetting, setResetting] = useState(false);

  // Kill Switch Confirmation Modal
  const [showKillSwitchModal, setShowKillSwitchModal] = useState(false);
  const [pendingKillSwitchState, setPendingKillSwitchState] = useState(false);
  const [killSwitchMessage, setKillSwitchMessage] = useState("");
  const [killSwitchReason, setKillSwitchReason] = useState("");

  // History Tab state
  const [historyItems, setHistoryItems] = useState<SettingHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyKeyFilter, setHistoryKeyFilter] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);

  // Revert Modal
  const [revertItem, setRevertItem] = useState<SettingHistoryItem | null>(null);
  const [revertReason, setRevertReason] = useState("");
  const [reverting, setReverting] = useState(false);

  // Fetch Settings
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getSettings();
      setSettingsData(data);
      const initial: Record<string, any> = {};
      data.groups.forEach((g) => {
        g.settings.forEach((s) => {
          initial[s.key] = s.value;
        });
      });
      setDraftValues(initial);
      setFieldErrors({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل الإعدادات");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch History
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await adminApi.getSettingsHistory({
        key: historyKeyFilter || undefined,
        page: historyPage,
        limit: 25,
      });
      setHistoryItems(res.history);
      setHistoryTotal(res.total);
    } catch (err) {
      // ignore
    } finally {
      setHistoryLoading(false);
    }
  }, [historyKeyFilter, historyPage]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  // Compute dirty changes
  const dirtyChanges = useMemo(() => {
    if (!settingsData) return [];
    const changes: Array<{
      key: string;
      setting: AdminSettingItem;
      before: any;
      after: any;
    }> = [];

    settingsData.groups.forEach((g) => {
      g.settings.forEach((s) => {
        const currentDraft = draftValues[s.key];
        const original = s.value;

        let isDifferent = false;
        if (Array.isArray(original) && Array.isArray(currentDraft)) {
          isDifferent = JSON.stringify(original) !== JSON.stringify(currentDraft);
        } else {
          isDifferent = original !== currentDraft;
        }

        if (isDifferent) {
          changes.push({
            key: s.key,
            setting: s,
            before: original,
            after: currentDraft,
          });
        }
      });
    });

    return changes;
  }, [settingsData, draftValues]);

  const hasRiskyChanges = useMemo(() => {
    return dirtyChanges.some((c) => c.setting.risky);
  }, [dirtyChanges]);

  // Inline Validation
  const validateField = (key: string, val: any, allDrafts: Record<string, any>) => {
    if (!settingsData) return null;
    let def: AdminSettingItem | undefined;
    for (const g of settingsData.groups) {
      def = g.settings.find((s) => s.key === key);
      if (def) break;
    }
    if (!def) return null;

    if (def.type === "number" || def.type === "percent" || def.type === "integer") {
      const n = Number(val);
      if (isNaN(n)) return "القيمة يجب أن تكون رقمية";
      if (def.min !== undefined && n < def.min) return `أقل قيمة مسموح بها هي ${def.min}`;
      if (def.max !== undefined && n > def.max) return `أكبر قيمة مسموح بها هي ${def.max}`;
    }

    if (key === "deposit.min" || key === "deposit.max") {
      const min = key === "deposit.min" ? Number(val) : Number(allDrafts["deposit.min"]);
      const max = key === "deposit.max" ? Number(val) : Number(allDrafts["deposit.max"]);
      if (!isNaN(min) && !isNaN(max) && min > max) {
        return "الحد الأدنى للعربون يجب ألا يتجاوز الحد الأقصى";
      }
    }

    if (key === "wallet.maxTopup" || key === "wallet.maxBalance") {
      const topup = key === "wallet.maxTopup" ? Number(val) : Number(allDrafts["wallet.maxTopup"]);
      const bal = key === "wallet.maxBalance" ? Number(val) : Number(allDrafts["wallet.maxBalance"]);
      if (!isNaN(topup) && !isNaN(bal) && topup > bal) {
        return "الحد الأقصى للشحن يجب ألا يتجاوز سعة المحفظة";
      }
    }

    if (key === "service.areas") {
      if (!Array.isArray(val) || val.length === 0 || val.every((a: string) => !a.trim())) {
        return "يجب تحديد منطقة خدمة واحدة على الأقل";
      }
    }

    return null;
  };

  const handleFieldChange = (key: string, value: any) => {
    const nextDrafts = { ...draftValues, [key]: value };
    setDraftValues(nextDrafts);

    const err = validateField(key, value, nextDrafts);
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (err) next[key] = err;
      else delete next[key];
      return next;
    });
  };

  // Open Review Dialog & Simulate
  const handleOpenReview = async () => {
    setShowReviewModal(true);
    setChangeReason("");
    setConfirmRisky(false);
    setSaveErrors({});
    setIsSimulating(true);

    try {
      const changes = dirtyChanges.map((c) => ({
        key: c.key,
        value: c.after,
      }));
      const sim = await adminApi.simulateSettings(changes);
      setSimulationResults(sim.simulation || []);
    } catch {
      setSimulationResults([]);
    } finally {
      setIsSimulating(false);
    }
  };

  // Save changes
  const handleSaveChanges = async () => {
    if (!changeReason.trim()) {
      alert("يرجى كتابة سبب التعديل للتوثيق الإداري والمحاسبي");
      return;
    }

    if (hasRiskyChanges && !confirmRisky) {
      alert("يرجى تأكيد الإقرار بتعديل الإعدادات الحساسة");
      return;
    }

    setSaving(true);
    setSaveErrors({});
    try {
      const changes = dirtyChanges.map((c) => ({
        key: c.key,
        value: c.after,
      }));
      await adminApi.updateSettings({
        changes,
        reason: changeReason,
        confirm: confirmRisky,
      });

      setShowReviewModal(false);
      await fetchSettings();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        alert(err.message);
      } else {
        alert("فشل حفظ التغييرات");
      }
    } finally {
      setSaving(false);
    }
  };

  // Reset setting
  const handleConfirmReset = async () => {
    if (!resetKey || !resetReason.trim()) return;
    setResetting(true);
    try {
      await adminApi.resetSetting(resetKey, resetReason);
      setResetKey(null);
      setResetReason("");
      await fetchSettings();
    } catch (err) {
      alert(err instanceof Error ? err.message : "فشل استعادة القيمة");
    } finally {
      setResetting(false);
    }
  };

  // Revert history
  const handleConfirmRevert = async () => {
    if (!revertItem || !revertReason.trim()) return;
    setReverting(true);
    try {
      await adminApi.revertSetting(revertItem._id, revertReason);
      setRevertItem(null);
      setRevertReason("");
      await fetchHistory();
      await fetchSettings();
    } catch (err) {
      alert(err instanceof Error ? err.message : "فشل التراجع عن التعديل");
    } finally {
      setReverting(false);
    }
  };

  // Kill Switch
  const ordersAcceptingSetting = settingsData?.groups
    .flatMap((g) => g.settings)
    .find((s) => s.key === "orders.acceptingEnabled");
  const ordersAcceptingMessage = settingsData?.groups
    .flatMap((g) => g.settings)
    .find((s) => s.key === "orders.acceptingMessage");

  const isAcceptingOrders = ordersAcceptingSetting ? ordersAcceptingSetting.value : true;

  const handleToggleKillSwitch = () => {
    const nextState = !isAcceptingOrders;
    setPendingKillSwitchState(nextState);
    setKillSwitchMessage(
      (ordersAcceptingMessage?.value as string) ||
        "نعتذر عن استقبال طلبات جديدة حالياً للصيانة الدورية والتحسينات."
    );
    setKillSwitchReason("");
    setShowKillSwitchModal(true);
  };

  const handleConfirmKillSwitch = async () => {
    if (!killSwitchReason.trim()) {
      alert("يرجى كتابة سبب التغيير");
      return;
    }
    try {
      await adminApi.updateSettings({
        changes: [
          { key: "orders.acceptingEnabled", value: pendingKillSwitchState },
          { key: "orders.acceptingMessage", value: killSwitchMessage },
        ],
        reason: killSwitchReason,
        confirm: true,
      });
      setShowKillSwitchModal(false);
      await fetchSettings();
    } catch (err) {
      alert(err instanceof Error ? err.message : "فشل تحديث حالة استقبال الطلبات");
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#DFDCD5] rounded-2xl p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[#1F2421]">إعدادات وسياسات المنظومة</h1>
            {settingsData && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#FAF8F5] border border-[#DFDCD5] text-[#5C6460]">
                الإصدار v{settingsData.settingsVersion}
              </span>
            )}
            {!canEdit && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FDF2F0] text-[#A8452F] border border-[#A8452F]/30 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>للقراءة فقط</span>
              </span>
            )}
          </div>
          <p className="text-xs text-[#5C6460] mt-1">
            {settingsData?.lastChange
              ? `آخر تعديل بواسطة: ${settingsData.lastChange.adminName} (${new Date(
                  settingsData.lastChange.updatedAt
                ).toLocaleString("ar-EG")})`
              : "التحكم المركزي في الرسوم والعربون والمهل الزمنية والمحفظة"}
          </p>
        </div>

        {/* Global Kill Switch Banner / Toggle */}
        <div className="flex items-center gap-3 bg-[#FAF8F5] p-2.5 rounded-xl border border-[#DFDCD5]">
          <div className="text-right">
            <span className="text-xs font-bold block text-[#1F2421]">استقبال الطلبات:</span>
            <span
              className={`text-[11px] font-semibold ${
                isAcceptingOrders ? "text-[#3F6B58]" : "text-[#A8452F]"
              }`}
            >
              {isAcceptingOrders ? "مفعل (يعمل بصورة طبيعية)" : "متوقف مؤقتاً (503)"}
            </span>
          </div>
          <button
            onClick={handleToggleKillSwitch}
            disabled={!canEdit}
            className={`p-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs ${
              isAcceptingOrders
                ? "bg-[#FDF2F0] text-[#A8452F] hover:bg-[#FBE5E1] border border-[#A8452F]/30"
                : "bg-[#EDF5F1] text-[#3F6B58] hover:bg-[#DCEDE4] border border-[#3F6B58]/30"
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{isAcceptingOrders ? "إيقاف مؤقت للطلبات" : "إعادة تشغيل الاستقبال"}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#DFDCD5] gap-4">
        <button
          onClick={() => setActiveTab("settings")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "settings"
              ? "border-[#B8752E] text-[#B8752E]"
              : "border-transparent text-[#5C6460] hover:text-[#1F2421]"
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>بطاقات الإعدادات</span>
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "history"
              ? "border-[#B8752E] text-[#B8752E]"
              : "border-transparent text-[#5C6460] hover:text-[#1F2421]"
          }`}
        >
          <History className="w-4 h-4" />
          <span>سجل التغييرات والرقابة</span>
        </button>
      </div>

      {/* Tab 1: Settings Form */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          {loading ? (
            <div className="p-12 text-center text-xs text-[#5C6460] space-y-2 bg-white rounded-2xl border border-[#DFDCD5]">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#B8752E]" />
              <p>جاري تحميل سجل الإعدادات...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-[#FDF2F0] border border-[#A8452F] text-[#A8452F] rounded-2xl text-xs font-bold">
              {error}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {settingsData?.groups.map((group) => (
                <div
                  key={group.group}
                  className="bg-white border border-[#DFDCD5] rounded-2xl p-5 shadow-xs space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-[#DFDCD5]">
                    <h3 className="font-bold text-sm text-[#1F2421]">{group.labelAr}</h3>
                    <span className="text-[11px] text-[#8A928D] font-mono">
                      {group.settings.length} إعدادات
                    </span>
                  </div>

                  <div className="space-y-4">
                    {group.settings.map((s) => {
                      const currentVal = draftValues[s.key];
                      const isDirty = s.value !== currentVal;
                      const fieldError = fieldErrors[s.key];

                      return (
                        <div
                          key={s.key}
                          className={`p-3.5 rounded-xl border transition-colors space-y-2 ${
                            isDirty
                              ? "bg-[#FAF8F5] border-[#B8752E]"
                              : "bg-white border-[#DFDCD5]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-[#1F2421]">
                                  {s.labelAr}
                                </span>
                                {s.risky && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FDF2F0] text-[#A8452F] border border-[#A8452F]/30">
                                    حساس
                                  </span>
                                )}
                                {isDirty && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#B8752E] text-white">
                                    معدل
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#5C6460] mt-0.5">
                                {s.descriptionAr}
                              </p>
                            </div>

                            {/* Source badge and Reset button */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  s.source === "db"
                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                    : s.source === "env"
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                                }`}
                              >
                                {s.source === "db"
                                  ? "من الإعدادات"
                                  : s.source === "env"
                                  ? "من البيئة"
                                  : "افتراضي"}
                              </span>

                              {canEdit && s.source !== "default" && (
                                <button
                                  type="button"
                                  title="استعادة القيمة الأصلية"
                                  onClick={() => setResetKey(s.key)}
                                  className="p-1 text-[#8A928D] hover:text-[#B8752E] rounded"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Control By Type */}
                          <div className="pt-1">
                            {/* Boolean Switch */}
                            {s.type === "boolean" && (
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  disabled={!canEdit}
                                  checked={Boolean(currentVal)}
                                  onChange={(e) => handleFieldChange(s.key, e.target.checked)}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#B8752E]"></div>
                                <span className="mr-2 text-xs font-semibold text-[#1F2421]">
                                  {currentVal ? "مفعل" : "معطل"}
                                </span>
                              </label>
                            )}

                            {/* Numeric / Percent / Integer Inputs */}
                            {(s.type === "number" ||
                              s.type === "percent" ||
                              s.type === "integer") && (
                              <div className="relative max-w-xs">
                                <input
                                  type="number"
                                  disabled={!canEdit}
                                  value={currentVal ?? ""}
                                  min={s.min}
                                  max={s.max}
                                  step={s.type === "integer" ? "1" : "any"}
                                  onChange={(e) =>
                                    handleFieldChange(
                                      s.key,
                                      e.target.value === "" ? "" : Number(e.target.value)
                                    )
                                  }
                                  className="w-full p-2 text-xs bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl outline-none focus:border-[#B8752E] font-mono num-tabular pl-12"
                                />
                                <span className="absolute left-3 top-2 text-[11px] font-bold text-[#8A928D]">
                                  {s.unit || (s.type === "percent" ? "%" : "")}
                                </span>
                              </div>
                            )}

                            {/* Text / String */}
                            {s.type === "string" && (
                              <input
                                type="text"
                                disabled={!canEdit}
                                value={currentVal ?? ""}
                                onChange={(e) => handleFieldChange(s.key, e.target.value)}
                                className="w-full p-2 text-xs bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl outline-none focus:border-[#B8752E]"
                              />
                            )}

                            {/* Textarea */}
                            {s.type === "text" && (
                              <textarea
                                rows={2}
                                disabled={!canEdit}
                                value={currentVal ?? ""}
                                onChange={(e) => handleFieldChange(s.key, e.target.value)}
                                className="w-full p-2 text-xs bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl outline-none focus:border-[#B8752E]"
                              />
                            )}

                            {/* StringList (Chips Editor for Areas) */}
                            {s.type === "stringList" && (
                              <div className="space-y-2">
                                <div className="flex flex-wrap gap-1.5">
                                  {Array.isArray(currentVal) &&
                                    currentVal.map((item: string, idx: number) => (
                                      <span
                                        key={idx}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-[#FAF8F5] border border-[#DFDCD5] font-semibold text-[#1F2421]"
                                      >
                                        <span>{item}</span>
                                        {canEdit && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const next = currentVal.filter((_: any, i: number) => i !== idx);
                                              handleFieldChange(s.key, next);
                                            }}
                                            className="text-[#8A928D] hover:text-[#A8452F]"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        )}
                                      </span>
                                    ))}
                                </div>
                                {canEdit && (
                                  <input
                                    type="text"
                                    placeholder="أدخل اسم المنطقة واضغط Enter..."
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && e.currentTarget.value.trim()) {
                                        e.preventDefault();
                                        const next = [
                                          ...(Array.isArray(currentVal) ? currentVal : []),
                                          e.currentTarget.value.trim(),
                                        ];
                                        handleFieldChange(s.key, next);
                                        e.currentTarget.value = "";
                                      }
                                    }}
                                    className="w-full p-2 text-xs bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl outline-none focus:border-[#B8752E]"
                                  />
                                )}
                              </div>
                            )}

                            {/* Date Picker (Free-Until) */}
                            {s.type === "date" && (
                              <div className="flex items-center gap-2 max-w-xs">
                                <input
                                  type="date"
                                  disabled={!canEdit}
                                  value={
                                    currentVal
                                      ? new Date(currentVal).toISOString().split("T")[0]
                                      : ""
                                  }
                                  onChange={(e) =>
                                    handleFieldChange(
                                      s.key,
                                      e.target.value ? new Date(e.target.value).toISOString() : null
                                    )
                                  }
                                  className="w-full p-2 text-xs bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl outline-none focus:border-[#B8752E]"
                                />
                                {canEdit && currentVal && (
                                  <button
                                    type="button"
                                    onClick={() => handleFieldChange(s.key, null)}
                                    className="p-1.5 text-xs text-[#8A928D] hover:text-[#A8452F]"
                                    title="مسح التاريخ"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Error / Constraints */}
                          {fieldError && (
                            <p className="text-[11px] text-[#A8452F] font-bold">{fieldError}</p>
                          )}
                          <div className="flex justify-between items-center text-[10px] text-[#8A928D] pt-1">
                            <span>
                              القيمة الافتراضية:{" "}
                              {Array.isArray(s.default)
                                ? s.default.join("، ")
                                : String(s.default)}
                            </span>
                            {s.min !== undefined && s.max !== undefined && (
                              <span>
                                النطاق: {s.min} - {s.max}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sticky Review Bar */}
          {dirtyChanges.length > 0 && canEdit && (
            <div className="fixed bottom-0 right-0 left-0 lg:right-64 bg-white/95 backdrop-blur-md border-t border-[#DFDCD5] p-4 shadow-lg z-30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-[#B8752E] animate-ping" />
                <div>
                  <span className="text-xs font-bold text-[#1F2421]">
                    لديك {dirtyChanges.length} إعدادات معدلة وغير محفوظة
                  </span>
                  <span className="text-[11px] text-[#5C6460] block">
                    {hasRiskyChanges
                      ? "⚠️ تتضمن تعديلات مالية حساسة تتطلب تأكيداً إضافياً"
                      : "يمكنك مراجعة الفروق والمحاكاة قبل الاعتماد النهائي"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchSettings}
                  className="py-2 px-3 text-xs font-bold text-[#5C6460] hover:text-[#1F2421]"
                >
                  إلغاء الكل
                </button>
                <button
                  type="button"
                  onClick={handleOpenReview}
                  disabled={Object.keys(fieldErrors).length > 0}
                  className="py-2.5 px-5 bg-[#B8752E] hover:bg-[#9E6122] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <Calculator className="w-4 h-4" />
                  <span>مراجعة التغييرات والمحاكاة</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: History Table */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 bg-white border border-[#DFDCD5] rounded-2xl p-4">
            <div className="flex items-center gap-3 flex-1">
              <input
                type="text"
                placeholder="بحث بمفتاح الإعداد (مثال: deposit.rate)..."
                value={historyKeyFilter}
                onChange={(e) => {
                  setHistoryKeyFilter(e.target.value);
                  setHistoryPage(1);
                }}
                className="p-2 text-xs bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl outline-none focus:border-[#B8752E] w-64"
              />
            </div>
            <button
              onClick={fetchHistory}
              className="py-2 px-3 bg-white border border-[#DFDCD5] hover:border-[#B8752E] rounded-xl text-xs font-bold text-[#1F2421] flex items-center gap-1.5 shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? "animate-spin" : ""}`} />
              <span>تحديث السجل</span>
            </button>
          </div>

          <div className="bg-white border border-[#DFDCD5] rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#FAF8F5] border-b border-[#DFDCD5] text-[#5C6460]">
                  <tr>
                    <th className="py-3 px-4">التاريخ والوقت</th>
                    <th className="py-3 px-4">المسؤول</th>
                    <th className="py-3 px-4">مفتاح الإعداد</th>
                    <th className="py-3 px-4">القيمة السابقة</th>
                    <th className="py-3 px-4">القيمة الجديدة</th>
                    <th className="py-3 px-4">سبب التعديل</th>
                    <th className="py-3 px-4 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECEAE4]">
                  {historyItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-[#8A928D]">
                        لا توجد سجلات تعديل سابقة.
                      </td>
                    </tr>
                  ) : (
                    historyItems.map((item) => (
                      <tr key={item._id} className="hover:bg-[#FAF8F5]/50">
                        <td className="py-3 px-4 text-[#5C6460] font-mono text-[11px]">
                          {new Date(item.createdAt).toLocaleString("ar-EG")}
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#1F2421]">
                          {item.adminName}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-[#B8752E]">
                          {item.key}
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-500">
                          {typeof item.before === "object"
                            ? JSON.stringify(item.before)
                            : String(item.before)}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-[#3F6B58]">
                          {typeof item.after === "object"
                            ? JSON.stringify(item.after)
                            : String(item.after)}
                        </td>
                        <td className="py-3 px-4 text-[#5C6460] max-w-xs truncate" title={item.reason}>
                          {item.reason}
                          {item.revertOf && (
                            <span className="block text-[10px] text-amber-700 font-bold">
                              (تراجع عن تعديل سابق)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => {
                                setRevertItem(item);
                                setRevertReason("");
                              }}
                              className="py-1 px-2.5 bg-white border border-[#DFDCD5] hover:border-[#B8752E] rounded-lg text-xs font-bold text-[#1F2421]"
                            >
                              تراجع
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Review & Simulation Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl border border-[#DFDCD5]">
            <div className="flex items-center justify-between border-b border-[#DFDCD5] pb-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-[#B8752E]" />
                <h3 className="font-bold text-base text-[#1F2421]">
                  مراجعة التغييرات والمحاكاة المالية
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="text-[#8A928D] hover:text-[#1F2421]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Changes Table */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs text-[#1F2421]">
                الإعدادات المراد حفظها ({dirtyChanges.length}):
              </h4>
              <div className="border border-[#DFDCD5] rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#FAF8F5] border-b border-[#DFDCD5] text-[#5C6460]">
                    <tr>
                      <th className="py-2 px-3">الإعداد</th>
                      <th className="py-2 px-3">القيمة السابقة</th>
                      <th className="py-2 px-3">القيمة الجديدة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECEAE4]">
                    {dirtyChanges.map((c) => (
                      <tr key={c.key}>
                        <td className="py-2 px-3 font-semibold text-[#1F2421]">
                          {c.setting.labelAr} ({c.key})
                        </td>
                        <td className="py-2 px-3 font-mono text-zinc-500">
                          {typeof c.before === "object" ? JSON.stringify(c.before) : String(c.before)}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-[#3F6B58]">
                          {typeof c.after === "object" ? JSON.stringify(c.after) : String(c.after)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Simulation Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-[#1F2421]">
                  المحاكاة المالية الفورية (مقارنة الوضع الحالي بالمقترح):
                </h4>
                {isSimulating && (
                  <span className="text-[11px] text-[#B8752E] flex items-center gap-1 font-semibold">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>جاري الحساب...</span>
                  </span>
                )}
              </div>

              <div className="border border-[#DFDCD5] rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#FAF8F5] border-b border-[#DFDCD5] text-[#5C6460]">
                    <tr>
                      <th className="py-2 px-3">سعر القطعة (المصنعية ١٥٠)</th>
                      <th className="py-2 px-3">العربون (حالي / مقترح)</th>
                      <th className="py-2 px-3">الكاش عند التسليم</th>
                      <th className="py-2 px-3">عمولة وصافي الفني</th>
                      <th className="py-2 px-3">عمولة ومستحق التاجر</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECEAE4]">
                    {simulationResults.map((s) => (
                      <tr key={s.tier}>
                        <td className="py-2 px-3 font-bold text-[#1F2421] num-tabular">
                          {s.partPrice} ج.م
                        </td>
                        <td className="py-2 px-3 num-tabular">
                          <span className="text-zinc-500">{s.current.depositAmount}</span>
                          {" ➔ "}
                          <span className="font-bold text-[#B8752E]">
                            {s.proposed.depositAmount} ج.م
                          </span>
                        </td>
                        <td className="py-2 px-3 num-tabular">
                          <span className="text-zinc-500">{s.current.cashOnDelivery}</span>
                          {" ➔ "}
                          <span className="font-bold text-[#3F6B58]">
                            {s.proposed.cashOnDelivery} ج.م
                          </span>
                        </td>
                        <td className="py-2 px-3 num-tabular">
                          <span className="text-zinc-500">
                            {s.current.craftsmanCommission} ({s.current.craftsmanNet})
                          </span>
                          {" ➔ "}
                          <span className="font-bold text-[#1F2421]">
                            {s.proposed.craftsmanCommission} ({s.proposed.craftsmanNet} ج.م)
                          </span>
                        </td>
                        <td className="py-2 px-3 num-tabular">
                          <span className="text-zinc-500">
                            {s.current.vendorCommission} ({s.current.vendorPayout})
                          </span>
                          {" ➔ "}
                          <span className="font-bold text-[#1F2421]">
                            {s.proposed.vendorCommission} ({s.proposed.vendorPayout} ج.م)
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Risky warning */}
            {hasRiskyChanges && (
              <div className="p-3.5 bg-[#FDF2F0] border border-[#A8452F]/40 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-[#A8452F] font-bold text-xs">
                  <ShieldAlert className="w-4 h-4" />
                  <span>تنبيه: يتضمن هذا التعديل معايير مالية وتشغيلية حساسة (Risky)</span>
                </div>
                <p className="text-[11px] text-[#A8452F]">
                  تغيير نسب العمولات، حدود المحفظة، أو إيقاف استقبال الطلبات يؤثر مباشرة على حسابات
                  التجار والفنيين وإجراءات الدفع الحية.
                </p>
                <label className="flex items-center gap-2 pt-1 text-xs font-bold text-[#A8452F] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmRisky}
                    onChange={(e) => setConfirmRisky(e.target.checked)}
                    className="w-4 h-4 rounded text-[#A8452F]"
                  />
                  <span>أقر بمسؤوليتي الإدارية عن تطبيق هذه التعديلات الحساسة فوراً</span>
                </label>
              </div>
            )}

            {/* Mandatory Reason */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#1F2421]">
                سبب التعديل (إلزامي للتوثيق في سجل الرقابة والتدقيق):
              </label>
              <textarea
                rows={2}
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="اكتب مبرر القرار الإداري (مثال: تحديث عمولة الفنيين بناءً على اجتماع الإدارة)..."
                className="w-full p-2.5 text-xs bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl outline-none focus:border-[#B8752E]"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#DFDCD5]">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="py-2.5 px-4 text-xs font-bold text-[#5C6460] hover:text-[#1F2421]"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={saving || !changeReason.trim() || (hasRiskyChanges && !confirmRisky)}
                className="py-2.5 px-6 bg-[#B8752E] hover:bg-[#9E6122] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري الحفظ والتعميم...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>تأكيد وحفظ الإعدادات</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Modal */}
      {resetKey && (
        <ConfirmModal
          isOpen={true}
          title="استعادة الإعداد للقيمة الأصلية"
          message={`هل أنت متأكد من رغبتك في حذف القيمة المخصصة من قاعدة البيانات للإعداد (${resetKey}) والعودة للبيئة أو الافتراضي؟`}
          confirmText={resetting ? "جاري الاستعادة..." : "استعادة الإعداد"}
          isDestructive={false}
          onClose={() => setResetKey(null)}
          onConfirm={handleConfirmReset}
        >
          <div className="mt-3">
            <input
              type="text"
              placeholder="سبب الاستعادة (إلزامي)..."
              value={resetReason}
              onChange={(e) => setResetReason(e.target.value)}
              className="w-full p-2 text-xs bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl outline-none focus:border-[#B8752E]"
            />
          </div>
        </ConfirmModal>
      )}

      {/* Revert Modal */}
      {revertItem && (
        <ConfirmModal
          isOpen={true}
          title="التراجع عن تغيير سابق"
          message={`هل أنت متأكد من رغبتك في التراجع عن تعديل (${revertItem.key}) والعودة للقيمة السابقة (${revertItem.before})؟`}
          confirmText={reverting ? "جاري التراجع..." : "تأكيد التراجع"}
          isDestructive={true}
          onClose={() => setRevertItem(null)}
          onConfirm={handleConfirmRevert}
        >
          <div className="mt-3">
            <input
              type="text"
              placeholder="سبب التراجع (إلزامي)..."
              value={revertReason}
              onChange={(e) => setRevertReason(e.target.value)}
              className="w-full p-2 text-xs bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl outline-none focus:border-[#B8752E]"
            />
          </div>
        </ConfirmModal>
      )}

      {/* Kill Switch Modal */}
      {showKillSwitchModal && (
        <ConfirmModal
          isOpen={true}
          title={
            pendingKillSwitchState
              ? "تأكيد إعادة تشغيل استقبال الطلبات"
              : "تأكيد إيقاف استقبال الطلبات مؤقتاً (Kill Switch)"
          }
          message={
            pendingKillSwitchState
              ? "سيتمكن العملاء من إنشاء ومعاينة طلبات جديدة فوراً."
              : "سيتوقف استقبال أي طلبات جديدة وسيرد الخادم برمز 503 مع الرسالة المحددة. الطلبات القائمة ستستمر بصورة طبيعية."
          }
          confirmText={pendingKillSwitchState ? "تشغيل الاستقبال" : "إيقاف الاستقبال فوراً"}
          isDestructive={!pendingKillSwitchState}
          onClose={() => setShowKillSwitchModal(false)}
          onConfirm={handleConfirmKillSwitch}
        >
          <div className="space-y-2 mt-3 text-right">
            {!pendingKillSwitchState && (
              <div>
                <label className="block text-[11px] font-bold text-[#1F2421] mb-1">
                  رسالة الإغلاق التي تظهر للعملاء:
                </label>
                <textarea
                  rows={2}
                  value={killSwitchMessage}
                  onChange={(e) => setKillSwitchMessage(e.target.value)}
                  className="w-full p-2 text-xs bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl outline-none focus:border-[#B8752E]"
                />
              </div>
            )}
            <div>
              <label className="block text-[11px] font-bold text-[#1F2421] mb-1">
                سبب القرار (إلزامي للتوثيق):
              </label>
              <input
                type="text"
                placeholder="أدخل مبرر التغيير..."
                value={killSwitchReason}
                onChange={(e) => setKillSwitchReason(e.target.value)}
                className="w-full p-2 text-xs bg-[#FAF8F5] border border-[#DFDCD5] rounded-xl outline-none focus:border-[#B8752E]"
              />
            </div>
          </div>
        </ConfirmModal>
      )}
    </div>
  );
}
