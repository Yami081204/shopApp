# Mô tả hệ thống ShopApp — SOLID và Design Patterns

ShopApp là hệ thống thương mại điện tử (frontend React + backend Express/MySQL). Domain chính gồm sản phẩm, giỏ hàng, đơn hàng, voucher, thanh toán COD/VietQR, thông báo và hỗ trợ khách hàng.

Backend tách thành **Controller → Facade/Service → Repository/Adapter**. Composition root nằm ở `backend/container.js`: controller nhận service đã ghép sẵn; service nghiệp vụ nhận các port/repository qua constructor thay vì tự import model hoặc database.

## SOLID

### Single Responsibility (S)
Các module được chia theo trách nhiệm nghiệp vụ:

- Controller nhận HTTP, không tính giá hay ghi DB.
- `orderService` điều phối tạo/hủy/cập nhật đơn; `orderQueryService` lo đọc đơn và thống kê.
- Checkout tách phân tích mặt hàng, giữ tồn kho, địa chỉ giao hàng và áp dụng voucher thành các service nhỏ.
- `cartService`, `catalogService`, `authService` điều phối nghiệp vụ riêng; phần truy cập dữ liệu nằm trong repository.
- Repository truy cập Sequelize/MySQL.
- Strategy tính chiết khấu, phí ship, hoặc chuẩn bị thanh toán.
- Observer ghi thông báo sau khi sự kiện đơn hàng được phát.

### Open/Closed (O)
Payment/discount factory có registry và `register()`. Thêm implementation phù hợp hợp đồng rồi đăng ký ở composition root; luồng checkout không cần biết lớp cụ thể. Shipping là strategy được tiêm vào, nên đổi cách tính không sửa order workflow.

### Liskov Substitution (L)
Các payment strategy dùng hợp đồng `prepare`, `planReport`, `planConfirmation`; discount dùng `calculate`; shipping dùng `calculate`. Factory xác thực hình dạng strategy khi đăng ký ở `backend/contracts/strategyContracts.js`, và kiểm thử hợp đồng chung nằm trong `backend/tests/strategy-contracts.test.js`.

### Interface Segregation (I)
Service chỉ nhận các phụ thuộc nó dùng. `orderService` nhận các port hẹp `commands`, `inventory`, `addresses`; `orderQueryService` nhận `query` và `stats`. `paymentService` không nhận voucher repository; observer chỉ cần thao tác ghi notification. Controller checkout chỉ nói chuyện với `checkoutFacade`.

### Dependency Inversion (D)
Service nghiệp vụ phụ thuộc các hợp đồng được tiêm vào (repository, `paymentStrategyFactory`, `shippingStrategy`, `eventPublisher`, `tokenService`), không import Sequelize, model hay database. `container.js` ghép implementation thật; repository và adapter là lớp duy nhất biết chi tiết Sequelize, JWT, VietQR hoặc SMTP. Test có thể thay dependency bằng fake.

## Design Patterns (tối thiểu 6 mẫu, đủ 3 nhóm)

### Creational (2+)

| Mẫu | Vai trò trong ShopApp | Vị trí |
| --- | --- | --- |
| **Factory Method** | Registry chọn payment strategy (COD/VietQR) và discount strategy theo dữ liệu đầu vào; strategy được đăng ký khi lắp ráp ứng dụng. | `backend/factories/paymentStrategyFactory.js`, `backend/strategies/discount/discountStrategyFactory.js` |
| **Builder** | Dựng giá đơn hàng theo bước: dòng hàng → giảm giá → phí ship → tổng. Tránh tính toán rời rạc, dễ sai làm tròn. | `backend/builders/orderPricingBuilder.js` (dùng trong `orderService.createOrder`) |
| **Singleton** (bổ sung) | Helper cache một app container; test xác nhận chỉ tạo một instance. Composition root hiện được cache theo module ES. | `backend/singletons/appContainer.js` |

### Structural (2+)

| Mẫu | Vai trò trong ShopApp | Vị trí |
| --- | --- | --- |
| **Adapter** | Bọc API ảnh QR của VietQR thành hợp đồng nội bộ `createPaymentInstructions`. Thanh toán không phụ thuộc URL/query của nhà cung cấp. | `backend/adapters/vietQrAdapter.js` |
| **Facade** | Gom đặt hàng, phương thức thanh toán, xác nhận/báo chuyển khoản, cập nhật trạng thái thành một API checkout. Controller không gọi song song `orderService` + `paymentService`. | `backend/facades/checkoutFacade.js`, `backend/controllers/orderController.js` |

### Behavioral (2+)

| Mẫu | Vai trò trong ShopApp | Vị trí |
| --- | --- | --- |
| **Strategy** | Hoán đổi thuật toán: thanh toán COD/VietQR, voucher %, voucher số tiền, miễn ship theo ngưỡng. | `backend/strategies/payment/*`, `backend/strategies/discount/*`, `backend/strategies/shipping/thresholdShippingStrategy.js` |
| **Observer** | Sau khi commit đơn/thanh toán, publisher phát sự kiện; observer ghi notification. Lỗi một observer không chặn các observer khác. | `backend/events/eventPublisher.js`, `backend/events/orderNotificationObserver.js` |
| **State** (bổ sung) | Chỉ cho phép chuyển trạng thái hợp lệ của đơn (`PENDING → CONFIRMED → …`) và thanh toán (`PENDING → PAID`, không đảo ngược). | `backend/services/orderState.js`, `backend/states/paymentState.js` |

## Luồng checkout gắn với các mẫu

1. HTTP vào `orderController` → **Facade** `placeOrder`.
2. `orderService` kiểm tra tồn kho, rồi **Builder** cộng dòng hàng.
3. **Factory** chọn discount strategy; shipping **Strategy** tính phí.
4. Payment **Factory** chọn COD hoặc VietQR; VietQR **Adapter** tạo QR.
5. Sau commit, **Observer** nhận `order.created` và tạo thông báo.
6. VietQR có thể chạy với xác nhận tự động qua SePay (`VIETQR_MODE=live`) hoặc QR nhận tiền thật và admin đối soát thủ công (`VIETQR_MODE=manual`); demo (`VIETQR_MODE=demo`) không tạo QR thanh toán. Payment state chỉ được cập nhật theo luồng xác nhận tương ứng.

## Kiểm thử

Các kiểm thử trong `backend/tests/` bao phủ hợp đồng service/repository, strategy, factory, adapter, observer, state, builder, facade, auth, cart và catalog. Chạy:

```bash
cd backend && npm test
```
