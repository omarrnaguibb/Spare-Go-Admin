export type DepositStatus =
  | "not_required"
  | "pending"
  | "held"
  | "captured"
  | "refund_due"
  | "refunded"
  | "forfeited";

export interface AdminUser {
  id: string;
  name: string;
  phone: string;
  role: "admin";
  canEditSettings?: boolean;
}

export interface PendingApprovalsCount {
  pendingVendors: number;
  pendingCraftsmen: number;
  total: number;
}

export interface CommissionOverride {
  rate: number;
  reason: string;
  expiresAt?: string;
  setBy?: string;
  setAt?: string;
}

export interface AdminVendor {
  _id: string;
  name: string;
  phone: string;
  storeName: string;
  area: string;
  address?: string;
  status: "pending" | "approved" | "suspended";
  strikes: number;
  rating: number | null;
  ratingCount?: number;
  mustChangePassword?: boolean;
  commissionOverride?: CommissionOverride | null;
  effectiveCommissionRate?: number;
  commissionSource?: "override" | "free_window" | "global";
  commissionFreeUntil?: string | null;
  createdAt: string;
}

export interface AdminCraftsman {
  _id: string;
  name: string;
  phone: string;
  workshopName: string;
  specialty: string;
  area: string;
  status: "pending" | "approved" | "suspended";
  rating: number | null;
  ratingCount?: number;
  commissionDues: number;
  totalJobs: number;
  isAvailable: boolean;
  mustChangePassword?: boolean;
  commissionOverride?: CommissionOverride | null;
  effectiveCommissionRate?: number;
  commissionSource?: "override" | "free_window" | "global";
  commissionFreeUntil?: string | null;
  createdAt: string;
}

export interface AdminCustomer {
  _id: string;
  name: string;
  phone: string;
  area?: string;
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  title: string;
  brand?: string;
  model?: string;
  year?: number | string;
  partNumber?: string;
  price: number;
  quantity: number;
}

export interface CraftsmanQuote {
  _id?: string;
  craftsmanId: string;
  craftsmanName: string;
  workshopName: string;
  rating: number | null;
  laborPrice: number;
  estimatedArrival: string;
  note?: string;
  status: "pending" | "accepted" | "rejected";
  createdAt?: string;
}

export interface PartIssueReport {
  reportedBy: string;
  reason: string;
  photoUrl: string;
  notes?: string;
  reportedAt: string;
}

export interface AdminOrder {
  _id: string;
  orderNumber?: string;
  orderType: string;
  craftsmanType?: string;
  status: string;
  isFlagged: boolean;
  carBrand: string;
  carModel: string;
  carYear: number;
  items: OrderItem[];
  shop?: {
    name: string;
    area: string;
    address?: string;
    phone?: string;
  };
  vendorId?: string;
  craftsmanId?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  deliveryArea?: string;
  depositAmount: number;
  depositStatus: string;
  partPrice: number;
  laborPrice?: number;
  totalPrice: number;
  cashOnDelivery: number;
  vendorPayout?: number;
  platformCommission?: number;
  craftsmanEarnings?: number;
  respondBy: string;
  quotesDeadline?: string;
  completionLocked?: boolean;
  completionAttempts?: number;
  rejectionReason?: string;
  adminNotes?: string;
  quotes?: CraftsmanQuote[];
  partIssues?: PartIssueReport[];
  handoverConfirmedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicket {
  _id: string;
  ticketNumber: string;
  userId: string;
  userRole: "customer" | "craftsman" | "vendor";
  orderId?: string;
  reason: string;
  description: string;
  photoUrl?: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  adminNotes?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface LedgerEntry {
  _id: string;
  type: string;
  orderId?: string;
  partyType: string;
  partyId?: string;
  amount: number;
  reference?: string;
  createdAt: string;
}

export interface AuditLog {
  _id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetType: string;
  targetId: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface SystemConfig {
  depositEnabled: boolean;
  depositAmount: number;
  minDeposit: number;
  maxDeposit: number;
  depositRate: number;
  vendorCommissionRate: number;
  craftsmanCommissionRate: number;
  serviceAreas: string[];
  warrantyText?: string | null;
  responseWindowMinutes: number;
  quotesWindowMinutes: number;
  walletEnabled?: boolean;
  walletMinTopup?: number;
  walletMaxTopup?: number;
  walletMaxBalance?: number;
  walletMaxPendingTopups?: number;
  walletTopupExpiryHours?: number;
  walletWithdrawalsEnabled?: boolean;
  walletTermsText?: string | null;
}

export interface PaymentMethod {
  _id: string;
  type: "instapay" | "vodafone_cash" | "orange_cash" | "etisalat_cash" | "we_pay" | "other";
  label: string;
  accountName: string;
  accountHandle: string;
  instructions: string;
  minAmount?: number;
  maxAmount?: number;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TopUpRequest {
  _id: string;
  customerId: {
    _id: string;
    name: string;
    phone: string;
  };
  methodId?: {
    _id: string;
    label: string;
    type: string;
    accountHandle: string;
  };
  amount: number;
  approvedAmount?: number;
  senderIdentifier: string;
  transactionReference: string;
  proofUrl: string;
  status: "pending" | "approved" | "rejected" | "expired";
  reviewedBy?: {
    _id: string;
    name: string;
    phone: string;
  };
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WithdrawalRequest {
  _id: string;
  customerId: {
    _id: string;
    name: string;
    phone: string;
  };
  amount: number;
  destinationType: string;
  destinationHandle: string;
  destinationAccountName?: string;
  status: "pending" | "paid" | "rejected";
  reference?: string;
  reviewedBy?: {
    _id: string;
    name: string;
    phone: string;
  };
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalletItem {
  _id: string;
  customerId:
    | {
        _id: string;
        name: string;
        phone: string;
      }
    | string;
  available: number;
  held: number;
  version: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface WalletEntry {
  _id: string;
  walletId: string;
  customerId: string;
  type: string;
  bucket: string;
  amount: number;
  orderId?: string;
  topUpId?: string;
  withdrawalId?: string;
  reference?: string;
  note?: string;
  actor?: string;
  createdAt: string;
}

export interface WalletDetail {
  customer: {
    _id: string;
    name: string;
    phone: string;
  };
  wallet: WalletItem;
  entries: WalletEntry[];
}

export interface ReconciliationSummary {
  totalWallets: number;
  totalAvailable: number;
  totalHeld: number;
  totalLiabilities: number;
  approvedTopUps: number;
  depositsHeld: number;
  depositsReleased: number;
  depositsCaptured: number;
  depositsForfeited: number;
  withdrawalsPaid: number;
  adminAdjustments: number;
}

export interface ReconciliationReport {
  timestamp: string;
  summary: ReconciliationSummary;
  hasDiscrepancies: boolean;
  discrepanciesCount: number;
  mismatches: Array<{
    customerId: string;
    storedAvailable: number;
    computedAvailable: number;
    storedHeld: number;
    computedHeld: number;
  }>;
}

export type SettingType =
  | "boolean"
  | "number"
  | "percent"
  | "integer"
  | "string"
  | "text"
  | "stringList"
  | "date";

export type SettingUnit = "EGP" | "%" | "minutes" | "hours" | "count";

export interface AdminSettingItem {
  key: string;
  group: string;
  type: SettingType;
  default: any;
  min?: number;
  max?: number;
  unit?: SettingUnit;
  labelAr: string;
  descriptionAr: string;
  risky: boolean;
  value: any;
  source: "db" | "env" | "default";
}

export interface AdminSettingsResponse {
  settingsVersion: number;
  lastChange?: {
    adminName: string;
    updatedAt: string;
    key?: string;
  } | null;
  groups: Array<{
    group: string;
    labelAr: string;
    settings: AdminSettingItem[];
  }>;
}

export interface SettingHistoryItem {
  _id: string;
  key: string;
  before: any;
  after: any;
  reason: string;
  adminId: string;
  adminName: string;
  createdAt: string;
  revertOf?: string;
}

export interface SimulationResult {
  tier: number;
  partPrice: number;
  laborPrice: number;
  current: {
    depositAmount: number;
    cashOnDelivery: number;
    craftsmanCommission: number;
    craftsmanNet: number;
    vendorCommission: number;
    vendorPayout: number;
  };
  proposed: {
    depositAmount: number;
    cashOnDelivery: number;
    craftsmanCommission: number;
    craftsmanNet: number;
    vendorCommission: number;
    vendorPayout: number;
  };
}

export interface PartRequestAnswer {
  _id?: string;
  vendorId: string;
  vendorName: string;
  vendorPhone: string;
  productId?: string;
  productTitle?: string;
  price: number;
  notes?: string;
  createdAt: string;
}

export interface AdminPartRequest {
  _id: string;
  customerId: {
    _id: string;
    name: string;
    phone: string;
  };
  carBrand: string;
  carModel: string;
  carYear: number;
  partDescription: string;
  photoUrl?: string;
  status: "open" | "answered" | "closed" | "cancelled";
  answersCount: number;
  answers: PartRequestAnswer[];
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

