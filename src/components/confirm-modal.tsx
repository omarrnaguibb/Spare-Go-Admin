"use client";

import { useState } from "react";
import { AlertTriangle, X, RefreshCw } from "lucide-react";

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isOpen: boolean;
  onConfirm: () => Promise<void> | void;
  onCancel?: () => void;
  onClose?: () => void;
  children?: React.ReactNode;
}

export function ConfirmModal({
  title,
  message,
  confirmText = "تأكيد الإجراء",
  cancelText = "إلغاء",
  isDestructive = false,
  isOpen,
  onConfirm,
  onCancel,
  onClose,
  children,
}: ConfirmModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleClose = onCancel || onClose || (() => {});

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] w-full max-w-sm rounded-2xl border border-[#DFDCD5] shadow-2xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isDestructive
                ? "bg-[#FDF2F0] text-[#A8452F]"
                : "bg-[#FBF4EC] text-[#B8752E]"
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-sm text-[#1F2421]">{title}</h3>
            <p className="text-xs text-[#5C6460] mt-1 leading-relaxed">{message}</p>
            {children && <div className="mt-3">{children}</div>}
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-1 text-[#8A928D] hover:text-[#1F2421] rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-[#DFDCD5]">
          <button
            type="button"
            disabled={loading}
            onClick={handleClose}
            className="flex-1 py-2 px-3 bg-[#FAF8F5] border border-[#DFDCD5] hover:bg-white text-[#5C6460] font-semibold rounded-xl text-xs"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleConfirm}
            className={`flex-1 py-2 px-3 font-bold text-white rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors ${
              isDestructive
                ? "bg-[#A8452F] hover:bg-[#8F3B28]"
                : "bg-[#B8752E] hover:bg-[#9E6122]"
            }`}
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
