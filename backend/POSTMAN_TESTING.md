# Hướng dẫn Test API với Postman

## Cài đặt

1. Tải và cài đặt [Postman](https://www.postman.com/downloads/)
2. Import các file sau vào Postman:
   - `ecom-lipstick.postman_collection.json`
   - `ecom-lipstick.postman_collection_part2.json`
   - `ecom-lipstick.postman_environment.json`

## Cấu hình môi trường

1. Trong Postman, chọn môi trường "Ecom-Lipstick Development" từ dropdown ở góc trên bên phải
2. Biến `baseUrl` đã được cấu hình sẵn là `http://localhost:5000`
3. Biến `token` sẽ được tự động cập nhật sau khi đăng nhập

### VietQR chuyển khoản thật, admin xác nhận thủ công

1. Trong `backend/.env`, cấu hình `VIETQR_BANK_ID`, `VIETQR_ACCOUNT_NUMBER` và `VIETQR_ACCOUNT_NAME` bằng thông tin tài khoản thật của cửa hàng.
2. Đặt `VIETQR_MODE=manual`. Chế độ này tạo QR có sẵn số tiền và nội dung chuyển khoản, không yêu cầu SePay webhook và không tự đánh dấu đã thanh toán.
3. Khởi động lại backend sau khi đổi cấu hình. Chỉ thử chuyển khoản thật với giao dịch nhỏ nếu chưa từng xác minh tài khoản nhận tiền.
4. Admin mở **Đơn hàng và thanh toán**, đối chiếu giao dịch tiền vào trong ứng dụng/sao kê ngân hàng, nhập mã giao dịch ngân hàng và số tiền thực nhận, rồi chọn **Xác nhận đã nhận tiền**.
5. Backend ghi nhận admin xác nhận và cập nhật trạng thái thanh toán. Không xác nhận dựa trên ảnh biên lai do khách gửi; cần thấy giao dịch tiền vào thực tế.

Không chia sẻ hoặc commit `backend/.env`. `VIETQR_MODE=live` dành cho luồng SePay tự động; `VIETQR_MODE=demo` không nhận tiền thật.

## Thứ tự test API

### 1. Khởi động server

```bash
npm run dev
```

### 2. Tạo tài khoản và đăng nhập

1. Sử dụng request "Register User" để tạo tài khoản mới
2. Sử dụng request "Login User" để đăng nhập và lấy token
   - Token sẽ tự động được lưu vào biến môi trường `token`

### 3. Test các API khác

Sau khi đã có token, bạn có thể test các API khác theo thứ tự sau:

#### Users API
- Get User Profile
- Update User Profile
- Upload User Avatar (`PUT /api/users/profile/avatar`, authenticated; raw JPEG/PNG/WebP image, maximum 2 MB)
- Get All Users (yêu cầu quyền Admin)

Ảnh đại diện được lưu trong `backend/uploads/avatars` và phục vụ tại `/uploads/avatars`. Khi chạy trên môi trường triển khai, cần dùng persistent disk hoặc cấu hình object storage để ảnh không mất khi thay instance.

#### Categories API
- Create Category
- Get All Categories
- Get Category by ID
- Update Category
- Delete Category

#### Products API
- Create Product
- Get All Products
- Get Product by ID
- Get Products by Category
- Update Product
- Delete Product

#### Cart API
- Add to Cart
- Get Cart
- Update Cart Item
- Remove from Cart
- Clear Cart

#### Orders API
- Create Order
- Get Order by ID
- Get My Orders
- Update Order to Paid
- Update Order to Delivered (yêu cầu quyền Admin)

## Lưu ý

- Các API yêu cầu xác thực sẽ tự động sử dụng token từ biến môi trường
- Một số API yêu cầu quyền Admin, bạn cần tạo tài khoản Admin trong database
- ID sản phẩm, danh mục và đơn hàng trong các request mẫu là `1`, bạn cần thay đổi cho phù hợp với dữ liệu thực tế

## Tự động xác nhận thanh toán VietQR với SePay

1. Cấu hình `VIETQR_BANK_ID`, `VIETQR_ACCOUNT_NUMBER` và `VIETQR_ACCOUNT_NAME` ở môi trường backend.
2. Tạo một API key webhook riêng, đặt vào `SEPAY_WEBHOOK_API_KEY` trong môi trường backend và cấu hình cùng khóa đó trong SePay dưới dạng header `Authorization: Apikey <key>`. Không đưa khóa vào source code hoặc chat.
3. Trong SePay, đặt URL webhook là `https://<domain-backend>/api/webhooks/sepay`. Backend phải truy cập được công khai qua HTTPS.
4. Đơn VietQR chỉ tự chuyển sang đã thanh toán khi webhook báo giao dịch tiền vào đúng số tài khoản, đúng nội dung mã `PAY-...` trên QR và đúng số tiền đơn. Thanh toán thiếu/thừa, sai nội dung hoặc sai tài khoản không được tự xác nhận.
5. Người mua không cần nhập mã giao dịch ngân hàng khi webhook đã hoạt động. Trang chi tiết đơn hàng sẽ tự làm mới trạng thái trong lúc chờ thanh toán.

## Gửi email phản hồi yêu cầu hỗ trợ

1. Khi chạy đồ án ở môi trường local, đặt `EMAIL_MODE=demo` trong `backend/.env` (mặc định khi không chạy production). Phản hồi được tạo bằng transport giả lập, trang admin ghi rõ email không được gửi ra ngoài; không cần hộp thư hoặc SMTP thật.
2. Khi cần gửi email thật, đặt `EMAIL_MODE=smtp`, cấu hình `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` và `SMTP_FROM`, rồi khởi động lại backend. Trang quản trị **Yêu cầu hỗ trợ** cho biết còn thiếu biến cấu hình nào.
3. Với Gmail, dùng `smtp.gmail.com`, cổng `465`, bật `SMTP_SECURE=true` và dùng mật khẩu ứng dụng thay cho mật khẩu đăng nhập. Nhà cung cấp khác có thể yêu cầu cổng `587` với `SMTP_SECURE=false`.
4. Không đưa mật khẩu SMTP hoặc mật khẩu ứng dụng vào source code, commit, hoặc chat.
5. Phản hồi admin được lưu thành hội thoại hỗ trợ để user đăng nhập bằng cùng email xem trong **Hồ sơ > Hộp thư hỗ trợ**; user có thể gửi tiếp tin nhắn trong cùng hội thoại. Sau khi sao lưu database, chạy migration mới từ thư mục gốc bằng `Set-Location backend; $env:ALLOW_SCHEMA_MIGRATION="1"; npm run db:migrate; Remove-Item Env:ALLOW_SCHEMA_MIGRATION` rồi khởi động lại backend.

## Tạo tài khoản Admin

Để tạo tài khoản Admin, bạn có thể sử dụng một trong các cách sau:

1. Đăng ký tài khoản thông thường, sau đó cập nhật trường `isAdmin` trong database:

```sql
UPDATE users SET isAdmin = true WHERE email = 'your_email@example.com';
```

2. Hoặc tạo trực tiếp trong database:

```sql
INSERT INTO users (name, email, password, address, phone, isAdmin) 
VALUES ('Admin User', 'admin@example.com', '$2a$10$ENCRYPTED_PASSWORD', 'Admin Address', '0987654321', true);
```

Lưu ý: Password phải được mã hóa bằng bcrypt.