import {
  AdminUser,
  PendingApprovalsCount,
  AdminVendor,
  AdminCraftsman,
  AdminCustomer,
  AdminOrder,
  SupportTicket,
  LedgerEntry,
  AuditLog,
  SystemConfig,
  PaymentMethod,
  TopUpRequest,
  WithdrawalRequest,
  WalletItem,
  WalletDetail,
  ReconciliationReport,
  AdminSettingsResponse,
  SettingHistoryItem,
  SimulationResult,
  AdminPartRequest,
} from "./types";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api/backend/${path}`, {
    ...options,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const responseText = await response.text();
  let payload: unknown;
  try {
    payload = responseText ? JSON.parse(responseText) : undefined;
  } catch {
    payload = undefined;
  }

  if (!response.ok) {
    if (
      response.status === 401 &&
      typeof window !== "undefined" &&
      !path.startsWith("auth/login")
    ) {
      window.dispatchEvent(new Event("spare-go-admin-session-expired"));
    }

    const message =
      payload && typeof payload === "object" && "message" in payload
        ? (payload.message as string | string[])
        : "حدث خطأ غير متوقع";
    throw new ApiError(
      Array.isArray(message) ? message.join("، ") : message,
      response.status,
    );
  }

  return payload as T;
}

export const adminApi = {
  login: async (phone: string, password: string) => {
    return apiRequest<{
      message?: string;
      user: AdminUser;
    }>("auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, password }),
    });
  },

  logout: async () => {
    return apiRequest<{ message: string }>("auth/logout", {
      method: "POST",
    });
  },

  getMe: async () => {
    return apiRequest<AdminUser>("auth/me");
  },

  getPendingApprovalsCount: async () => {
    return apiRequest<PendingApprovalsCount>("admin/approvals/pending-counts");
  },

  getConfig: async () => {
    return apiRequest<SystemConfig>("admin/config");
  },

  getAuditLogs: async (limit = 100, skip = 0) => {
    return apiRequest<AuditLog[]>(`admin/audit-logs?limit=${limit}&skip=${skip}`);
  },

  listVendors: async (status?: string) => {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    return apiRequest<AdminVendor[]>(`admin/vendors${q}`);
  },

  updateVendorStatus: async (
    id: string,
    status: "pending" | "approved" | "suspended",
    note?: string,
  ) => {
    return apiRequest<AdminVendor>(`admin/vendors/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, note }),
    });
  },

  listCraftsmen: async (status?: string) => {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    return apiRequest<AdminCraftsman[]>(`admin/craftsmen${q}`);
  },

  updateCraftsmanStatus: async (
    id: string,
    status: "pending" | "approved" | "suspended",
    note?: string,
  ) => {
    return apiRequest<AdminCraftsman>(`admin/craftsmen/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, note }),
    });
  },

  createCraftsman: async (dto: {
    name: string;
    phone: string;
    password: string;
    specialty: string;
    workshopName: string;
    area: string;
  }) => {
    return apiRequest<{ message: string; craftsman: AdminCraftsman }>(
      "admin/craftsmen",
      {
        method: "POST",
        body: JSON.stringify(dto),
      },
    );
  },

  resetCraftsmanPassword: async (id: string, temporaryPassword: string) => {
    return apiRequest<{ message: string }>(`admin/craftsmen/${id}/reset-password`, {
      method: "PATCH",
      body: JSON.stringify({ temporaryPassword }),
    });
  },

  createVendor: async (dto: {
    name: string;
    phone: string;
    storeName: string;
    location?: string;
    temporaryPassword: string;
  }) => {
    return apiRequest<{ message: string; vendor: AdminVendor }>("admin/vendors", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  },

  resetVendorPassword: async (id: string, temporaryPassword: string) => {
    return apiRequest<{ message: string }>(`admin/vendors/${id}/reset-password`, {
      method: "PATCH",
      body: JSON.stringify({ temporaryPassword }),
    });
  },

  listCustomers: async () => {
    return apiRequest<AdminCustomer[]>("admin/customers");
  },

  listOrders: async (filters: {
    status?: string;
    isFlagged?: boolean;
    vendorId?: string;
    craftsmanId?: string;
  } = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.isFlagged !== undefined) params.set("isFlagged", String(filters.isFlagged));
    if (filters.vendorId) params.set("vendorId", filters.vendorId);
    if (filters.craftsmanId) params.set("craftsmanId", filters.craftsmanId);

    const qs = params.toString();
    return apiRequest<AdminOrder[]>(`admin/orders${qs ? `?${qs}` : ""}`);
  },

  getOrderDetails: async (id: string) => {
    return apiRequest<{
      order: AdminOrder;
      ledgerEntries: LedgerEntry[];
    }>(`admin/orders/${id}`);
  },

  cancelOrder: async (id: string, reason: string) => {
    return apiRequest<{ message: string; order: AdminOrder }>(
      `admin/orders/${id}/cancel`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      },
    );
  },

  reassignOrderVendor: async (id: string, newVendorId: string) => {
    return apiRequest<{ message: string; order: AdminOrder }>(
      `admin/orders/${id}/reassign`,
      {
        method: "POST",
        body: JSON.stringify({ newVendorId }),
      },
    );
  },

  unlockOrderCompletion: async (id: string) => {
    return apiRequest<{ message: string; order: AdminOrder }>(
      `admin/orders/${id}/unlock-completion`,
      {
        method: "POST",
      },
    );
  },

  addOrderNote: async (id: string, note: string) => {
    return apiRequest<{ message: string; order: AdminOrder }>(
      `admin/orders/${id}/notes`,
      {
        method: "POST",
        body: JSON.stringify({ note }),
      },
    );
  },

  updateOrderDeposit: async (
    id: string,
    action: "mark_paid" | "mark_refunded",
    amount?: number,
    reference?: string,
  ) => {
    return apiRequest<{ message: string; depositStatus: string }>(
      `admin/orders/${id}/deposit`,
      {
        method: "PATCH",
        body: JSON.stringify({ action, amount, reference }),
      },
    );
  },

  listTickets: async (status?: string) => {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    return apiRequest<SupportTicket[]>(`admin/tickets${q}`);
  },

  resolveTicket: async (
    id: string,
    action: "refund_deposit" | "compensate_craftsman" | "strike_vendor" | "close",
    adminNotes: string,
  ) => {
    return apiRequest<SupportTicket>(`admin/tickets/${id}/resolve`, {
      method: "PATCH",
      body: JSON.stringify({ action, adminNotes }),
    });
  },

  settleVendorOrders: async (
    vendorId: string,
    orderIds: string[],
    reference?: string,
  ) => {
    return apiRequest<{ message: string; settledCount: number }>(
      "admin/settlements/vendors",
      {
        method: "POST",
        body: JSON.stringify({ vendorId, orderIds, reference }),
      },
    );
  },

  settleCraftsmanDues: async (
    craftsmanId: string,
    amount: number,
    reference?: string,
  ) => {
    return apiRequest<{ message: string; amount: number }>(
      "admin/settlements/craftsmen",
      {
        method: "POST",
        body: JSON.stringify({ craftsmanId, amount, reference }),
      },
    );
  },

  getLedgerEntries: async (filters: {
    type?: string;
    partyType?: string;
    partyId?: string;
    limit?: number;
    skip?: number;
  } = {}) => {
    const params = new URLSearchParams();
    if (filters.type) params.set("type", filters.type);
    if (filters.partyType) params.set("partyType", filters.partyType);
    if (filters.partyId) params.set("partyId", filters.partyId);
    if (filters.limit) params.set("limit", String(filters.limit));
    if (filters.skip) params.set("skip", String(filters.skip));

    const qs = params.toString();
    return apiRequest<LedgerEntry[]>(`admin/ledger${qs ? `?${qs}` : ""}`);
  },

  // --- Payment Methods ---
  listPaymentMethods: async () => {
    return apiRequest<PaymentMethod[]>("admin/payment-methods");
  },

  getPaymentMethod: async (id: string) => {
    return apiRequest<PaymentMethod>(`admin/payment-methods/${id}`);
  },

  createPaymentMethod: async (dto: Partial<PaymentMethod>) => {
    return apiRequest<PaymentMethod>("admin/payment-methods", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  },

  updatePaymentMethod: async (id: string, dto: Partial<PaymentMethod>) => {
    return apiRequest<PaymentMethod>(`admin/payment-methods/${id}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
  },

  deletePaymentMethod: async (id: string) => {
    return apiRequest<{ message: string }>(`admin/payment-methods/${id}`, {
      method: "DELETE",
    });
  },

  // --- Top-Ups ---
  listTopUps: async (filters: {
    status?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.limit) params.set("limit", String(filters.limit));

    const qs = params.toString();
    return apiRequest<{
      topUps: TopUpRequest[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`admin/topups${qs ? `?${qs}` : ""}`);
  },

  approveTopUp: async (
    id: string,
    dto: { approvedAmount?: number; note?: string },
  ) => {
    return apiRequest<{ message: string; topUp: TopUpRequest }>(
      `admin/topups/${id}/approve`,
      {
        method: "POST",
        body: JSON.stringify(dto),
      },
    );
  },

  rejectTopUp: async (id: string, dto: { note?: string }) => {
    return apiRequest<{ message: string; topUp: TopUpRequest }>(
      `admin/topups/${id}/reject`,
      {
        method: "POST",
        body: JSON.stringify(dto),
      },
    );
  },

  // --- Withdrawals ---
  listWithdrawals: async (filters: {
    status?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.limit) params.set("limit", String(filters.limit));

    const qs = params.toString();
    return apiRequest<{
      withdrawals: WithdrawalRequest[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`admin/withdrawals${qs ? `?${qs}` : ""}`);
  },

  payWithdrawal: async (id: string, dto: { reference: string }) => {
    return apiRequest<{ message: string; withdrawal: WithdrawalRequest }>(
      `admin/withdrawals/${id}/pay`,
      {
        method: "POST",
        body: JSON.stringify(dto),
      },
    );
  },

  rejectWithdrawal: async (id: string, dto: { note?: string }) => {
    return apiRequest<{ message: string; withdrawal: WithdrawalRequest }>(
      `admin/withdrawals/${id}/reject`,
      {
        method: "POST",
        body: JSON.stringify(dto),
      },
    );
  },

  // --- Wallets ---
  searchWallets: async (filters: {
    phone?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    const params = new URLSearchParams();
    if (filters.phone) params.set("phone", filters.phone);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.limit) params.set("limit", String(filters.limit));

    const qs = params.toString();
    return apiRequest<{
      wallets: WalletItem[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`admin/wallets${qs ? `?${qs}` : ""}`);
  },

  getWalletDetails: async (customerId: string) => {
    return apiRequest<WalletDetail>(`admin/wallets/${customerId}`);
  },

  adjustWallet: async (
    customerId: string,
    dto: {
      amount: number;
      direction: "credit" | "debit";
      reason: string;
    },
  ) => {
    return apiRequest<{ message: string; wallet: WalletItem }>(
      `admin/wallets/${customerId}/adjust`,
      {
        method: "POST",
        body: JSON.stringify(dto),
      },
    );
  },

  // --- Reconciliation ---
  getReconciliation: async () => {
    return apiRequest<ReconciliationReport>("admin/wallet/reconciliation");
  },

  // --- Settings ---
  getSettings: async () => {
    return apiRequest<AdminSettingsResponse>("admin/settings");
  },

  updateSettings: async (dto: {
    changes: Array<{ key: string; value: any }>;
    reason: string;
    confirm?: boolean;
  }) => {
    return apiRequest<{ message: string; settingsVersion: number }>(
      "admin/settings",
      {
        method: "PATCH",
        body: JSON.stringify(dto),
      },
    );
  },

  resetSetting: async (key: string, reason: string) => {
    return apiRequest<{ message: string; key: string }>(
      `admin/settings/${encodeURIComponent(key)}/reset`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      },
    );
  },

  simulateSettings: async (changes: Array<{ key: string; value: any }>) => {
    return apiRequest<{ simulation: SimulationResult[] }>(
      "admin/settings/simulate",
      {
        method: "POST",
        body: JSON.stringify({ changes }),
      },
    );
  },

  getSettingsHistory: async (filters: {
    key?: string;
    adminId?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    const params = new URLSearchParams();
    if (filters.key) params.set("key", filters.key);
    if (filters.adminId) params.set("adminId", filters.adminId);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.limit) params.set("limit", String(filters.limit));

    const qs = params.toString();
    return apiRequest<{
      history: SettingHistoryItem[];
      total: number;
      page: number;
      limit: number;
    }>(`admin/settings/history${qs ? `?${qs}` : ""}`);
  },

  revertSetting: async (id: string, reason: string) => {
    return apiRequest<{ message: string; key: string }>(
      `admin/settings/history/${id}/revert`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      },
    );
  },

  // --- Account Commission Overrides ---
  setVendorCommission: async (
    id: string,
    dto: { rate?: number; reason: string; expiresAt?: string; clear?: boolean },
  ) => {
    return apiRequest<{ message: string; vendor: AdminVendor }>(
      `admin/vendors/${id}/commission`,
      {
        method: "PATCH",
        body: JSON.stringify(dto),
      },
    );
  },

  setCraftsmanCommission: async (
    id: string,
    dto: { rate?: number; reason: string; expiresAt?: string; clear?: boolean },
  ) => {
    return apiRequest<{ message: string; craftsman: AdminCraftsman }>(
      `admin/craftsmen/${id}/commission`,
      {
        method: "PATCH",
        body: JSON.stringify(dto),
      },
    );
  },

  // --- Part Requests ---
  listPartRequests: async (filters: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.search) params.set("search", filters.search);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.limit) params.set("limit", String(filters.limit));

    const qs = params.toString();
    return apiRequest<{
      partRequests: AdminPartRequest[];
      total: number;
      page: number;
      limit: number;
    }>(`admin/part-requests${qs ? `?${qs}` : ""}`);
  },

  getPartRequest: async (id: string) => {
    return apiRequest<AdminPartRequest>(`admin/part-requests/${id}`);
  },

  updatePartRequest: async (
    id: string,
    dto: { status?: string; adminNotes?: string },
  ) => {
    return apiRequest<{ message: string; partRequest: AdminPartRequest }>(
      `admin/part-requests/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(dto),
      },
    );
  },
};

