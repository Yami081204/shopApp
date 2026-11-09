import { createStrategyRegistry } from './strategyRegistry.js';
import { assertPaymentStrategy } from '../contracts/strategyContracts.js';
import { codPaymentStrategy } from '../strategies/payment/codPaymentStrategy.js';

const createPaymentStrategyFactory = ({
  defaultMethod,
  strategies = [codPaymentStrategy],
  aliases = [
    ['BANK_TRANSFER', 'VIETQR'],
    ['BANKING', 'VIETQR']
  ]
} = {}) => {
  const registry = createStrategyRegistry({
    keyName: 'method',
    unknownMessage: 'Unsupported payment method'
  });
  for (const strategy of strategies) registry.register(assertPaymentStrategy(strategy));
  for (const [alias, method] of aliases) registry.registerAlias(alias, method);
  const fallbackMethod = defaultMethod || strategies.at(-1)?.method;

  const factory = {
    register(strategy) {
      registry.register(assertPaymentStrategy(strategy));
      return factory;
    },

    registerAlias(alias, method) {
      registry.registerAlias(alias, method);
      return factory;
    },

    normalizeMethod(method) {
      return registry.normalize(method, { fallback: fallbackMethod });
    },

    forMethod(method) {
      return registry.forKey(method, { fallback: fallbackMethod });
    },

    availableMethods(context) {
      return registry.all()
        .filter((strategy) => !strategy.isAvailable || strategy.isAvailable(context))
        .map((strategy) => strategy.method);
    },

    registeredMethods() {
      return registry.all().map((strategy) => strategy.method);
    }
  };

  return factory;
};

export { createPaymentStrategyFactory };
