import { DepositStatus } from './types';

export interface DepositStatusMeta {
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

export function getDepositStatusMeta(
  status?: string | DepositStatus | null,
): DepositStatusMeta | null {
  if (!status) return null;

  switch (status) {
    case 'not_required':
      return {
        label: 'بدون عربون',
        bgClass: 'bg-zinc-100 dark:bg-zinc-800',
        textClass: 'text-zinc-600 dark:text-zinc-300',
        borderClass: 'border-zinc-200 dark:border-zinc-700',
      };
    case 'pending':
      return {
        label: 'في انتظار حجز العربون',
        bgClass: 'bg-amber-50 dark:bg-amber-950/40',
        textClass: 'text-amber-700 dark:text-amber-400',
        borderClass: 'border-amber-200 dark:border-amber-800',
      };
    case 'held':
      return {
        label: 'محجوز من محفظة العميل',
        bgClass: 'bg-blue-50 dark:bg-blue-950/40',
        textClass: 'text-blue-700 dark:text-blue-400',
        borderClass: 'border-blue-200 dark:border-blue-800',
      };
    case 'captured':
      return {
        label: 'تم استقطاع العربون',
        bgClass: 'bg-emerald-50 dark:bg-emerald-950/40',
        textClass: 'text-emerald-700 dark:text-emerald-400',
        borderClass: 'border-emerald-200 dark:border-emerald-800',
      };
    case 'refund_due':
      return {
        label: 'جارٍ رد العربون',
        bgClass: 'bg-amber-50 dark:bg-amber-950/40',
        textClass: 'text-amber-700 dark:text-amber-400',
        borderClass: 'border-amber-200 dark:border-amber-800',
      };
    case 'refunded':
      return {
        label: 'رجع للمحفظة',
        bgClass: 'bg-teal-50 dark:bg-teal-950/40',
        textClass: 'text-teal-700 dark:text-teal-400',
        borderClass: 'border-teal-200 dark:border-teal-800',
      };
    case 'forfeited':
      return {
        label: 'خُصم كتعويض',
        bgClass: 'bg-rose-50 dark:bg-rose-950/40',
        textClass: 'text-rose-700 dark:text-rose-400',
        borderClass: 'border-rose-200 dark:border-rose-800',
      };
    default:
      return null;
  }
}
