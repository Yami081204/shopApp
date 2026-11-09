const createThresholdShippingStrategy = ({
  freeShippingThreshold = 500000,
  standardFee = 30000
} = {}) => ({
  calculate(subtotalAfterDiscount) {
    return subtotalAfterDiscount >= freeShippingThreshold ? 0 : standardFee;
  }
});

export { createThresholdShippingStrategy };
