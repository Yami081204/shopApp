import 'dotenv/config';
import db from './config/database.js';
import Address from './models/Address.js';
import Cart from './models/Cart.js';
import CartItem from './models/CartItem.js';
import Category from './models/Category.js';
import Notification from './models/Notification.js';
import SupportMessage from './models/SupportMessage.js';
import SupportReply from './models/SupportReply.js';
import Order from './models/Order.js';
import OrderItem from './models/OrderItem.js';
import OrderStatusHistory from './models/OrderStatusHistory.js';
import Payment from './models/Payment.js';
import PaymentTransaction from './models/PaymentTransaction.js';
import Product from './models/Product.js';
import ProductVariant from './models/ProductVariant.js';
import RevokedToken from './models/RevokedToken.js';
import User from './models/User.js';
import Voucher from './models/Voucher.js';
import { createVietQrAdapter } from './adapters/vietQrAdapter.js';
import { createAvatarStorageAdapter } from './adapters/avatarStorageAdapter.js';
import { createEventPublisher } from './events/eventPublisher.js';
import { createOrderNotificationObserver } from './events/orderNotificationObserver.js';
import { createPaymentStrategyFactory } from './factories/paymentStrategyFactory.js';
import { createCheckoutFacade } from './facades/checkoutFacade.js';
import { assertShippingStrategy } from './contracts/strategyContracts.js';
import { createNotificationRepository } from './repositories/notificationRepository.js';
import { createAuthRepository } from './repositories/authRepository.js';
import { createCartRepository } from './repositories/cartRepository.js';
import { createCatalogRepository } from './repositories/catalogRepository.js';
import { createOrderRepository } from './repositories/orderRepository.js';
import { createPaymentRepository } from './repositories/paymentRepository.js';
import { createSupportRepository } from './repositories/supportRepository.js';
import { createVoucherRepository } from './repositories/voucherRepository.js';
import { codPaymentStrategy } from './strategies/payment/codPaymentStrategy.js';
import { createDiscountStrategyFactory } from './strategies/discount/discountStrategyFactory.js';
import { createVietQrPaymentStrategy } from './strategies/payment/vietQrPaymentStrategy.js';
import { createThresholdShippingStrategy } from './strategies/shipping/thresholdShippingStrategy.js';
import { createInventoryReservationService } from './services/checkout/inventoryReservationService.js';
import { createShippingAddressService } from './services/checkout/shippingAddressService.js';
import { createVoucherApplicationService } from './services/checkout/voucherApplicationService.js';
import { createOrderService } from './services/orderService.js';
import { createOrderQueryService } from './services/orderQueryService.js';
import { createAuthService } from './services/authService.js';
import { createJwtTokenAdapter } from './adapters/jwtTokenAdapter.js';
import { createNotificationService } from './services/notificationService.js';
import { createCartService } from './services/cartService.js';
import { createCatalogService } from './services/catalogService.js';
import { createPaymentService } from './services/paymentService.js';
import { createSupportService } from './services/supportService.js';
import { createEmailService } from './services/emailService.js';
import { createVoucherService } from './services/voucherService.js';

const orderRepository = createOrderRepository({
  db,
  Address,
  Cart,
  CartItem,
  Order,
  OrderItem,
  OrderStatusHistory,
  Payment,
  PaymentTransaction,
  Product,
  ProductVariant,
  User
});
const paymentRepository = createPaymentRepository({ db, Order, Payment, PaymentTransaction });
const authRepository = createAuthRepository({ db, User, RevokedToken });
const avatarStorage = createAvatarStorageAdapter();
const cartRepository = createCartRepository({ db, Cart, CartItem, Product, ProductVariant });
const catalogRepository = createCatalogRepository({ db, Category, Product, ProductVariant });
const voucherRepository = createVoucherRepository({ Voucher });
const notificationRepository = createNotificationRepository({ Notification });
const supportRepository = createSupportRepository({ SupportMessage, SupportReply });
const emailService = createEmailService();
const eventPublisher = createEventPublisher();
const vietQrAdapter = createVietQrAdapter();
const configuredVietQrMode = process.env.VIETQR_MODE?.trim().toLowerCase();
const vietQrMode = ['demo', 'manual'].includes(configuredVietQrMode)
  ? configuredVietQrMode
  : 'live';
const vietQrPaymentStrategy = createVietQrPaymentStrategy({
  vietQrAdapter,
  mode: vietQrMode,
  isAutomaticConfirmationEnabled: () => Boolean(
    process.env.VIETQR_ACCOUNT_NUMBER?.trim()
    && process.env.SEPAY_WEBHOOK_API_KEY?.trim()
  )
});
const paymentStrategyFactory = createPaymentStrategyFactory({
  strategies: [codPaymentStrategy, vietQrPaymentStrategy]
});
const discountStrategyFactory = createDiscountStrategyFactory();
const shippingStrategy = assertShippingStrategy(createThresholdShippingStrategy());

eventPublisher.subscribe('*', createOrderNotificationObserver({ notificationRepository }));

const paymentService = createPaymentService({
  paymentRepository,
  paymentStrategyFactory,
  eventPublisher,
  vietQrAccountNumber: process.env.VIETQR_ACCOUNT_NUMBER,
  sepayWebhookApiKey: process.env.SEPAY_WEBHOOK_API_KEY,
  vietQrMode
});
const authService = createAuthService({
  authRepository,
  avatarStorage,
  tokenService: createJwtTokenAdapter({
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d'
  })
});
const notificationService = createNotificationService({ notificationRepository });
const cartService = createCartService({ cartRepository });
const catalogService = createCatalogService({ catalogRepository });
const orderService = createOrderService({
  orderRepository: orderRepository.commands,
  voucherRepository,
  discountStrategyFactory,
  shippingStrategy,
  paymentService,
  eventPublisher,
  inventoryReservationService: createInventoryReservationService({
    inventoryRepository: orderRepository.inventory
  }),
  shippingAddressService: createShippingAddressService({
    addressRepository: orderRepository.addresses
  }),
  voucherApplicationService: createVoucherApplicationService({
    voucherRepository,
    discountStrategyFactory
  })
});
const orderQueryService = createOrderQueryService({
  orderQueryRepository: orderRepository.query,
  orderStatsRepository: orderRepository.stats
});
const voucherService = createVoucherService({ voucherRepository });
const supportService = createSupportService({ supportRepository, emailService });
const checkoutFacade = createCheckoutFacade({ orderService, orderQueryService, paymentService });

export {
  eventPublisher,
  notificationRepository,
  notificationService,
  orderRepository,
  orderService,
  orderQueryService,
  paymentRepository,
  authRepository,
  authService,
  cartRepository,
  cartService,
  catalogRepository,
  catalogService,
  paymentService,
  paymentStrategyFactory,
  voucherRepository,
  voucherService,
  supportService,
  checkoutFacade
};
