# ShopApp

Ứng dụng thương mại điện tử gồm frontend React/TypeScript, backend Express và cơ sở dữ liệu MySQL. Có danh mục sản phẩm, giỏ hàng, đơn hàng, voucher, thanh toán COD/VietQR, tài khoản người dùng và trang quản trị.

## Công nghệ

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: Node.js, Express, Sequelize
- Database: MySQL 8+

## Yêu cầu

- Node.js 18 trở lên và npm
- MySQL 8 trở lên

## Cài đặt và chạy local

### 1. Tải source và cài dependencies

```bash
git clone https://github.com/Yami081204/shopApp.git
cd shopApp

cd backend
npm install
cd ../frontend
npm install
cd ..
```

### 2. Tạo database

Tạo schema ban đầu từ file `backend/schema.sql` bằng MySQL Workbench hoặc MySQL CLI:

```bash
mysql -u root -p < backend/schema.sql
```

File này tạo database `ecom_lipstick` và các bảng nền tảng. Nếu MySQL của bạn dùng user hoặc tên database khác, cập nhật lại cấu hình ở bước tiếp theo.

### 3. Cấu hình backend

Tạo file môi trường local từ mẫu:

```bash
cp backend/.env.example backend/.env
```

Trên Windows PowerShell, dùng:

```powershell
Copy-Item backend/.env.example backend/.env
```

Mở `backend/.env`, điền thông tin MySQL và thay `JWT_SECRET` bằng chuỗi bí mật dài, riêng tư:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=ecom_lipstick
DB_USER=root
DB_PASSWORD=mat_khau_mysql_cua_ban
JWT_SECRET=thay_bang_chuoi_bi_mat_dai_va_ngau_nhien
```

Không đưa `backend/.env` lên GitHub. Các giá trị VietQR/SMTP có thể để trống khi chạy thử local; chế độ thanh toán mẫu được đặt là `VIETQR_MODE=demo`, không thực hiện giao dịch thật.

### 4. Chạy database migrations

Sau khi import `schema.sql`, chạy migration để tạo các bảng và cột nghiệp vụ còn lại.

macOS/Linux:

```bash
cd backend
ALLOW_SCHEMA_MIGRATION=1 npm run db:migrate
```

Windows PowerShell:

```powershell
Set-Location backend
$env:ALLOW_SCHEMA_MIGRATION = "1"
npm run db:migrate
Remove-Item Env:ALLOW_SCHEMA_MIGRATION
Set-Location ..
```

### 5. (Tùy chọn) Tạo dữ liệu sản phẩm mẫu

```bash
cd backend
npm run db:seed:fashion
```

### 6. Khởi động backend và frontend

Mở **hai terminal** tại thư mục project.

Terminal 1 — backend:

```bash
cd backend
npm run dev
```

Backend chạy tại <http://localhost:5000>.

Terminal 2 — frontend:

```bash
cd frontend
npm run dev
```

Mở <http://localhost:8080>. Vite chuyển tiếp các request `/api` tới backend ở cổng `5000`.

## Chạy kiểm thử backend

```bash
cd backend
npm test
```

## Thanh toán và email

- Local mặc định dùng VietQR demo; thao tác này chỉ mô phỏng, không nhận tiền thật.
- Muốn dùng VietQR thật, cần cấu hình tài khoản ngân hàng cùng SePay webhook theo hướng dẫn trong `backend/.env.example` và `backend/POSTMAN_TESTING.md`.
- Email hỗ trợ mặc định chạy chế độ demo. Muốn gửi email thật, cấu hình SMTP trong `backend/.env`.

## Tài liệu thêm

- Kiến trúc và design patterns: [`ARCHITECTURE.md`](ARCHITECTURE.md)
- Hướng dẫn kiểm thử API với Postman: [`backend/POSTMAN_TESTING.md`](backend/POSTMAN_TESTING.md)
