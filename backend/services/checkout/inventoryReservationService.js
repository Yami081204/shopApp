import AppError from '../../utils/AppError.js';

const createInventoryReservationService = ({ inventoryRepository }) => ({
  async reserve(quantities, transaction) {
    const orderLines = [];
    for (const { productId, variantId, quantity } of quantities) {
      const product = await inventoryRepository.findProductForUpdate(productId, transaction);
      if (!product || !product.isActive) {
        throw new AppError(`Product ${productId} is unavailable`, 409, 'CONFLICT');
      }
      const hasVariants = inventoryRepository.hasActiveVariants
        ? await inventoryRepository.hasActiveVariants(productId, transaction) > 0
        : false;
      let variant = null;
      if (variantId !== null) {
        variant = await inventoryRepository.findVariantForUpdate(variantId, productId, transaction);
        if (!variant) throw new AppError('Selected product variant is unavailable', 409, 'CONFLICT');
      } else if (hasVariants) {
        throw new AppError(`Choose a size and color for ${product.name}`, 400, 'VARIANT_REQUIRED');
      }
      const availableStock = variant ? Number(variant.stock) : Number(product.countInStock);
      if (availableStock < quantity) {
        throw new AppError(`Insufficient stock for ${product.name}`, 409, 'INSUFFICIENT_STOCK');
      }
      const price = product.salePrice !== null && product.salePrice !== undefined
        ? Number(product.salePrice)
        : Number(product.price);
      orderLines.push({ product, variant, quantity, price });
    }
    return orderLines;
  },

  async commit(orderId, orderLines, transaction) {
    const orderItems = [];
    for (const line of orderLines) {
      const [updated] = line.variant
        ? await inventoryRepository.decrementVariantStock(
          line.variant.id,
          line.product.id,
          line.quantity,
          transaction
        )
        : await inventoryRepository.decrementStock(line.product.id, line.quantity, transaction);
      if (updated !== 1) {
        throw new AppError(`Insufficient stock for ${line.product.name}`, 409, 'INSUFFICIENT_STOCK');
      }
      if (line.variant) {
        await inventoryRepository.syncProductStockFromVariants(line.product.id, transaction);
      }
      orderItems.push({
        orderId,
        productId: line.product.id,
        productName: line.product.name,
        productImage: line.product.image,
        variantId: line.variant?.id || null,
        variantSku: line.variant?.sku || null,
        variantSize: line.variant?.size || null,
        variantColor: line.variant?.color || null,
        quantity: line.quantity,
        price: line.price
      });
    }
    return orderItems;
  },

  async restore(orderItems, transaction) {
    for (const item of orderItems) {
      if (item.variantId) {
        await inventoryRepository.restoreVariantStock(item.variantId, item.quantity, transaction);
        await inventoryRepository.syncProductStockFromVariants(item.productId, transaction);
      } else {
        await inventoryRepository.restoreStock(item.productId, item.quantity, transaction);
      }
    }
  }
});

export { createInventoryReservationService };
