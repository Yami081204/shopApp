import { Link } from 'react-router-dom';

const Footer = () => (
  <footer className="mt-12 border-t bg-muted/30">
    <div className="container grid gap-8 py-10 sm:grid-cols-2 md:grid-cols-4">
      <div className="sm:col-span-2">
        <Link to="/" className="text-xl font-bold tracking-tight">YAMI</Link>
        <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
          Mua sắm dễ dàng với thông tin sản phẩm, tồn kho và đơn hàng được cập nhật từ hệ thống.
        </p>
      </div>
      <div>
        <h2 className="text-sm font-semibold">Khám phá</h2>
        <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
          <Link to="/products" className="hover:text-foreground">Sản phẩm</Link>
          <Link to="/about" className="hover:text-foreground">Giới thiệu</Link>
          <Link to="/contact" className="hover:text-foreground">Liên hệ</Link>
        </div>
      </div>
      <div>
        <h2 className="text-sm font-semibold">Tài khoản</h2>
        <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
          <Link to="/profile" className="hover:text-foreground">Hồ sơ & đơn hàng</Link>
          <Link to="/wishlist" className="hover:text-foreground">Yêu thích</Link>
          <Link to="/cart" className="hover:text-foreground">Giỏ hàng</Link>
        </div>
      </div>
    </div>
    <div className="border-t py-4">
      <p className="container text-xs text-muted-foreground">© {new Date().getFullYear()} YAMI. All rights reserved.</p>
    </div>
  </footer>
);

export default Footer;
