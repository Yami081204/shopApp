import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, CheckCircle, ShoppingBag, CreditCard, Home } from "lucide-react";
import { useAllContexts } from "@/hooks/useAllContexts";

const OrderConfirmation = () => {
  const location = useLocation();
  const { user } = useAllContexts();
  
  // Get order info from navigation state
  const orderInfo = location.state || {};
  const orderId = orderInfo.orderId || 'N/A';
  const orderNumber = orderInfo.orderNumber || 'N/A';
  const isPaid = orderInfo.isPaid === true;
  const paymentMethod = orderInfo.paymentMethod;
  
  useEffect(() => {
    // Scroll to top on component mount
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="container py-16 min-h-[80vh] flex items-center justify-center">
      <div className="mx-auto w-full max-w-xl text-center">
        {/* Animated Success Icon */}
        <div className="mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-green-100 shadow-lg animate-bounce-slow">
          <CheckCircle className="h-16 w-16 text-green-600 drop-shadow-lg" />
        </div>
        <h1 className="mb-2 text-4xl font-bold text-green-700 flex items-center justify-center gap-2">
          {isPaid ? '🎉 Payment successful!' : 'Please complete your payment'}
        </h1>
        <p className="text-lg text-muted-foreground font-medium">
          {isPaid
            ? (orderInfo.message || 'Payment successful! Your order is being processed.')
            : paymentMethod === 'COD'
              ? 'Your order has been placed. Pay the courier when your order is delivered.'
              : 'Your order has been placed. Payment status will update automatically when the bank confirms your transfer.'}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          {isPaid ? 'Thank you for your purchase!' : 'Your order will be processed after payment is confirmed.'}
        </p>

        {/* Order Info Card */}
        <div className="mt-10 rounded-2xl border bg-white/80 p-8 text-left shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">Order ID</p>
            <div className="flex items-center">
              <CreditCard className="h-4 w-4 text-green-600 mr-1" />
              <span className={`text-xs font-semibold tracking-wide ${isPaid ? 'text-green-600' : 'text-amber-600'}`}>
                {isPaid ? 'PAID' : 'PENDING'}
              </span>
            </div>
          </div>
          <p className="mt-1 font-bold font-mono text-beauty-600 text-lg tracking-wider">{orderNumber}</p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {user?.email && (
              <div>
              <p className="text-xs text-muted-foreground">Email</p>
                <p className="mt-1 font-medium">{user.email}</p>
              </div>
            )}
            {orderId !== 'N/A' && (
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Order ID</p>
                <p className="mt-1 font-medium">#{orderId}</p>
              </div>
            )}
          </div>

          <div className="mt-8 space-y-2">
            {isPaid ? (
              <div className="flex items-center text-sm text-green-600 font-semibold">
                <Check className="mr-2 h-4 w-4" /> Payment confirmed
              </div>
            ) : (
              <div className="flex items-center text-sm text-orange-600 font-semibold">
                <span className="mr-2 h-4 w-4 animate-pulse">⏳</span>
                {paymentMethod === 'COD' ? 'Payment due on delivery' : 'Waiting for the bank to confirm the transfer'}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-col space-y-3 sm:flex-row sm:space-x-4 sm:space-y-0">
          <Button asChild variant="outline" className="flex-1">
            <Link to="/">
              <Home className="mr-2 h-4 w-4" /> Back to Home
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link to="/account">
              Your Account
            </Link>
          </Button>
          <Button asChild className="flex-1">
            <Link to="/products">
              <ShoppingBag className="mr-2 h-4 w-4" /> Continue Shopping
            </Link>
          </Button>
        </div>
      </div>
      {/* Custom animation for bounce */}
      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default OrderConfirmation;
