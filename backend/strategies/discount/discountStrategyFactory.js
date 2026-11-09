import { createStrategyRegistry } from '../../factories/strategyRegistry.js';
import { assertDiscountStrategy } from '../../contracts/strategyContracts.js';
import { noDiscountStrategy } from './noDiscountStrategy.js';
import { percentageVoucherStrategy } from './percentageVoucherStrategy.js';
import { fixedAmountVoucherStrategy } from './fixedAmountVoucherStrategy.js';

const createDiscountStrategyFactory = () => {
  const registry = createStrategyRegistry({
    keyName: 'type',
    unknownMessage: 'Unsupported voucher type',
    unknownStatus: 409,
    unknownCode: 'INVALID_VOUCHER'
  });
  registry
    .register(assertDiscountStrategy(noDiscountStrategy))
    .register(assertDiscountStrategy(percentageVoucherStrategy))
    .register(assertDiscountStrategy(fixedAmountVoucherStrategy));

  const factory = {
    register(strategy) {
      registry.register(assertDiscountStrategy(strategy));
      return factory;
    },

    forType(type) {
      return registry.forKey(type);
    },

    forVoucher(voucher) {
      if (!voucher) {
        return registry.has(noDiscountStrategy.type)
          ? registry.forKey(noDiscountStrategy.type)
          : noDiscountStrategy;
      }
      return registry.forKey(voucher.type);
    },

    registeredTypes() {
      return registry.all().map((strategy) => strategy.type);
    }
  };

  return factory;
};

export { createDiscountStrategyFactory };
