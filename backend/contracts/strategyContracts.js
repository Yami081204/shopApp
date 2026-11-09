const requireFunction = (strategy, name) => typeof strategy?.[name] === 'function';

const assertPaymentStrategy = (strategy) => {
  if (typeof strategy?.method !== 'string' || !strategy.method.trim() ||
      !requireFunction(strategy, 'prepare')) {
    throw new Error('Payment strategy must expose method and prepare()');
  }
  if (!requireFunction(strategy, 'planReport') || !requireFunction(strategy, 'planConfirmation')) {
    throw new Error(`Payment strategy ${strategy.method} must expose planReport() and planConfirmation()`);
  }
  if ((strategy.isAvailable !== undefined && !requireFunction(strategy, 'isAvailable')) ||
      (strategy.unavailableMessage !== undefined && !requireFunction(strategy, 'unavailableMessage')) ||
      (strategy.acceptsIncomingTransfer !== undefined &&
        typeof strategy.acceptsIncomingTransfer !== 'boolean')) {
    throw new Error(`Payment strategy ${strategy.method} has an invalid optional capability`);
  }
  return strategy;
};

const assertDiscountStrategy = (strategy) => {
  if (typeof strategy?.type !== 'string' || !strategy.type.trim() ||
      !requireFunction(strategy, 'calculate')) {
    throw new Error('Discount strategy must expose type and calculate()');
  }
  return strategy;
};

const assertShippingStrategy = (strategy) => {
  if (!requireFunction(strategy, 'calculate')) {
    throw new Error('Shipping strategy must expose calculate()');
  }
  return strategy;
};

export {
  assertPaymentStrategy,
  assertDiscountStrategy,
  assertShippingStrategy
};
