const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const createOrderPricingBuilder = () => {
  const lines = [];
  let discount = 0;
  let shippingPrice = 0;

  const subtotalOf = () => roundMoney(
    lines.reduce((sum, line) => sum + Number(line.price) * Number(line.quantity), 0)
  );

  return {
    addLine(price, quantity) {
      lines.push({ price: Number(price), quantity: Number(quantity) });
      return this;
    },

    applyDiscount(amount) {
      discount = roundMoney(Math.min(Math.max(0, Number(amount) || 0), subtotalOf()));
      return this;
    },

    applyShipping(calculate) {
      const discountedSubtotal = roundMoney(Math.max(0, subtotalOf() - discount));
      shippingPrice = roundMoney(
        typeof calculate === 'function' ? calculate(discountedSubtotal) : Number(calculate)
      );
      return this;
    },

    build() {
      const subtotal = subtotalOf();
      const discountedSubtotal = roundMoney(Math.max(0, subtotal - discount));
      return {
        subtotal,
        discountPrice: discount,
        shippingPrice,
        totalPrice: roundMoney(discountedSubtotal + shippingPrice)
      };
    }
  };
};

export { createOrderPricingBuilder, roundMoney };
