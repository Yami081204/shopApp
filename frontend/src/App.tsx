import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";
import { AllContextsProvider } from "@/hooks/useAllContexts";

// Layout
import Layout from "./components/layout/Layout";

// Admin
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Products from "./pages/admin/Products";
import Categories from "./pages/admin/Categories";
import Orders from "./pages/admin/Orders";
import Users from "./pages/admin/Users";
import Vouchers from "./pages/admin/Vouchers";
import Support from "./pages/admin/Support";

// Client pages
import Index from "./pages/Index";
import ProductsPage from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Wishlist from "./pages/Wishlist";
import OrderConfirmation from "./pages/OrderConfirmation";
import OrderDetail from "./pages/OrderDetail";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AllContextsProvider>
        <Router>
          <Routes>
            {/* Client Routes */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Index />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="products/:id" element={<ProductDetail />} />
              <Route path="about" element={<About />} />
              <Route path="contact" element={<Contact />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route path="cart" element={<Cart />} />
              <Route path="checkout" element={<Checkout />} />
              <Route path="wishlist" element={<Wishlist />} />
              <Route path="order-confirmation" element={<OrderConfirmation />} />
              <Route path="orders/:id" element={<OrderDetail />} />
              <Route path="profile" element={<Profile />} />
              <Route path="dashboard" element={<Navigate to="/admin/dashboard" replace />} />
            </Route>
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout><Navigate to="/admin/dashboard" replace /></AdminLayout>} />
            <Route path="/admin/dashboard" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
            <Route path="/admin/products" element={<AdminLayout><Products /></AdminLayout>} />
            <Route path="/admin/categories" element={<AdminLayout><Categories /></AdminLayout>} />
            <Route path="/admin/orders" element={<AdminLayout><Orders /></AdminLayout>} />
            <Route path="/admin/users" element={<AdminLayout><Users /></AdminLayout>} />
            <Route path="/admin/vouchers" element={<AdminLayout><Vouchers /></AdminLayout>} />
            <Route path="/admin/support" element={<AdminLayout><Support /></AdminLayout>} />
            
            {/* Catch-all Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </Router>
      </AllContextsProvider>
    </QueryClientProvider>
  );
}

export default App;
