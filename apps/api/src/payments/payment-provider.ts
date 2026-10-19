/** Hợp đồng chung cho cổng thanh toán của từng đối tác (ngân hàng / ví). */

export interface CreatePaymentInput {
  orderCode: string;
  amount: number;
  description: string;
  returnUrl: string;
}

export interface VerifiedIpn {
  providerRef: string;
  amount: number;
  success: boolean;
}

export interface PaymentProvider {
  readonly key: string;
  createPayment(input: CreatePaymentInput): Promise<{ providerRef: string; paymentUrl: string }>;
  /** Xác thực chữ ký IPN; ném lỗi nếu không hợp lệ. */
  verifyIpn(body: unknown): VerifiedIpn;
  refund(input: { providerRef: string; amount: number; reason: string }): Promise<void>;
}
