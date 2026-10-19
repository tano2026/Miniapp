# Airport Services Mini-app — Phòng chờ & Fast Track

Hệ thống bán **phòng chờ thương gia** và **Fast Track** tại sân bay Việt Nam, đóng gói dạng mini-app H5 để nhúng vào app ngân hàng / ví điện tử (white-label, mỗi đối tác một theme và cổng thanh toán riêng).

```
apps/
  api/   NestJS 11 + Prisma 6 + PostgreSQL — catalog, đơn hàng, thanh toán, fulfillment, back-office API
  web/   Next.js 15 — mini-app cho khách (/), cổng thanh toán giả lập (/pay/mock), back-office (/admin)
```

## Chạy local

Yêu cầu: Node 22, pnpm 10, PostgreSQL 16 (hoặc `docker compose up -d`).

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm db:migrate        # tạo bảng
pnpm db:seed           # 5 sân bay, 18 sản phẩm mẫu, 2 đối tác, 2 tài khoản admin
pnpm dev               # API :4000, web :3000
```

| Vào đâu | URL | Ghi chú |
|---|---|---|
| Mini-app (giả lập app ngân hàng mở vào) | http://localhost:3000/demo | Chọn `DEMO` hoặc `WALLETX` để thấy theme khác nhau |
| Back-office | http://localhost:3000/admin | `admin@demo.vn / Admin@123` (ADMIN), `ops@demo.vn / Ops@12345` (OPS) |

Kiểm thử:

```bash
pnpm --filter api test                 # unit test quy tắc nghiệp vụ + SSO token
node apps/api/scripts/smoke.mjs        # end-to-end trên API đang chạy (cần đã seed)
```

> Dữ liệu seed (tên phòng chờ, giá, giờ mở cửa) **chỉ để minh họa**. Thay bằng dữ liệu theo hợp đồng NCC trước khi mở bán.

## Luồng nghiệp vụ

```
App đối tác ──token SSO──▶ /sso ──▶ chọn sân bay/dịch vụ ──▶ đặt (server tính giá, kiểm tra luật)
   ──▶ Order PENDING_PAYMENT (giữ 15 phút) ──▶ cổng thanh toán đối tác ──IPN có chữ ký──▶ PROCESSING
   ──▶ Fulfillment: mỗi dịch vụ đi theo adapter của NCC
         ├─ NCC có API  → xác nhận tức thì, sinh voucher
         └─ NCC ký tay  → vào Hàng đợi ops (SLA 2h) → ops gửi NCC, nhập mã → xác nhận
   ──▶ chốt đơn: CONFIRMED / PARTIALLY_CONFIRMED / FAILED (tự hoàn tiền phần lỗi) ──▶ báo khách
```

Quy tắc chính (`apps/api/src/orders/order-rules.ts`, có unit test):
- Ít nhất 1 người lớn, mỗi em bé cần 1 người lớn, tối đa 9 khách / dịch vụ.
- **Thời gian đặt trước tối thiểu** theo từng sản phẩm (NCC ký tay 12–24h, NCC có API 3–4h).
- Giá luôn tính lại ở server; client không gửi giá.
- IPN idempotent, kiểm tra số tiền; tiền về sau khi đơn hết hạn thì tự hoàn.
- API NCC lỗi thì đơn **không fail** mà chuyển sang hàng đợi ops xử lý tay.
- Một đơn có thể gồm nhiều dịch vụ (vd. Fast Track + phòng chờ), mỗi dịch vụ chốt riêng.

## Tích hợp với đối tác (ngân hàng / ví)

**1. SSO vào mini-app**: đối tác mở webview tới `https://<domain>/sso?token=<token>&next=/services/LOUNGE`

```
token = base64url(JSON payload) + "." + base64url(HMAC_SHA256(ssoSecret, base64url(JSON payload)))
payload = { "partner": "DEMO", "uid": "<id khách phía đối tác>", "name"?, "phone"?, "email"?, "iat": <unix giây> }
```

Token sống 5 phút. Mini-app đổi token lấy cookie phiên httpOnly (2 giờ). `ssoSecret` cấp riêng cho từng đối tác (bảng `Partner`).

**2. Thanh toán**: mỗi đối tác có `paymentProvider`. Để thêm cổng thật, implement `PaymentProvider` (`apps/api/src/payments/payment-provider.ts`):
`createPayment` → trả URL thanh toán; `verifyIpn` → kiểm tra chữ ký; `refund`. Sau đó đăng ký trong `PaymentProviderRegistry`. IPN gọi vào `POST /api/payments/ipn/<provider>`.

## Thêm nhà cung cấp có API

Implement `SupplierAdapter` (`apps/api/src/suppliers/supplier-adapter.ts`) với `book()` (và `cancel()` nếu có), đăng ký trong `SupplierRegistry`, rồi tạo bản ghi `Supplier` với `adapterKey` tương ứng. `MockAggregatorAdapter` là mẫu tham khảo. Mã sản phẩm chứa `SOLDOUT` sẽ giả lập hết chỗ để test luồng hoàn tiền.

## Bán kèm vé máy bay (Abtrip)

Điểm nối tự nhiên: sau khi xuất vé qua Abtrip, deep-link sang `/products/<id>`, kèm số hiệu chuyến bay và giờ bay để điền sẵn form. Có thể làm thêm endpoint `GET /api/flight-offers?pnr=` để gợi ý phòng chờ / Fast Track theo sân bay và nhà ga của chuyến bay.

## Trước khi lên production

- [ ] Đổi toàn bộ secret trong `.env`; mã hóa `Partner.ssoSecret` (KMS).
- [ ] Nối cổng thanh toán thật của từng đối tác và tắt cổng mock (các endpoint mock và `/dev/*` đã tự chặn khi `NODE_ENV=production`).
- [ ] `NotificationService`: gửi email / SMS / Zalo ZNS cho khách, email cho NCC.
- [ ] Đưa các tác vụ nền (dispatch sau IPN, hết hạn đơn) sang hàng đợi (BullMQ) khi chạy nhiều instance.
- [ ] Rate limit, audit log admin, pentest theo yêu cầu của ngân hàng; hạ tầng đặt tại Việt Nam.
- [ ] Màn hình đối soát hằng ngày với đối tác và NCC (dữ liệu đã có sẵn trong `Payment` / `OrderItem.netAmount`).
