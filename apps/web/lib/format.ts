const VN_TZ = 'Asia/Ho_Chi_Minh';

export const vnd = (n: number) => (n === 0 ? 'Miễn phí' : `${n.toLocaleString('vi-VN')}đ`);

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', {
    timeZone: VN_TZ, hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric',
  });

/** Giá trị <input type="datetime-local"> (giờ VN) -> ISO có múi giờ +07:00. */
export const localToIso = (local: string) => `${local}:00+07:00`;

export const productTypeLabel = { LOUNGE: 'Phòng chờ thương gia', FAST_TRACK: 'Fast Track' } as const;
export const scopeLabel = { DOMESTIC: 'Nội địa', INTERNATIONAL: 'Quốc tế' } as const;
export const directionLabel = { DEPARTURE: 'Khởi hành', ARRIVAL: 'Nhập cảnh / Đến' } as const;
export const paxLabel = { ADULT: 'Người lớn', CHILD: 'Trẻ em (2–11)', INFANT: 'Em bé (<2)' } as const;

export const orderStatusLabel: Record<string, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  PROCESSING: 'Đang xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PARTIALLY_CONFIRMED: 'Xác nhận một phần',
  FAILED: 'Không thành công',
  CANCELLED: 'Đã hủy',
  EXPIRED: 'Hết hạn thanh toán',
};

export const itemStatusLabel: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  PROCESSING: 'Đang xác nhận',
  CONFIRMED: 'Đã xác nhận',
  FAILED: 'Không thành công',
  CANCELLED: 'Đã hủy',
};

export const paymentStatusLabel: Record<string, string> = {
  UNPAID: 'Chưa thanh toán',
  PAID: 'Đã thanh toán',
  PARTIALLY_REFUNDED: 'Đã hoàn một phần',
  REFUNDED: 'Đã hoàn tiền',
};
