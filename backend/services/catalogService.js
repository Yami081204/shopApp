import AppError from '../utils/AppError.js';
import { parsePositiveInteger } from '../utils/parsePositiveInteger.js';

const normalizeImageUrl = (image) => {
  if (image === undefined || image === null || image === '') return image || null;
  if (typeof image !== 'string' || image.length > 2048) {
    throw new AppError('Image must be a URL or relative path up to 2048 characters', 400, 'VALIDATION_ERROR');
  }
  if (/^(javascript|data):/i.test(image.trim())) {
    throw new AppError('Unsupported image URL scheme', 400, 'VALIDATION_ERROR');
  }
  return image.trim();
};

const normalizeVariants = (variants) => {
  if (!Array.isArray(variants) || variants.length > 200) {
    throw new AppError('Variants must be an array with at most 200 entries', 400, 'VALIDATION_ERROR');
  }
  const seenSkus = new Set();
  const seenOptions = new Set();
  return variants.map((variant) => {
    const sku = typeof variant?.sku === 'string' ? variant.sku.trim() : '';
    const size = typeof variant?.size === 'string' ? variant.size.trim() : '';
    const color = typeof variant?.color === 'string' ? variant.color.trim() : '';
    const stock = Number(variant?.stock);
    const optionKey = `${size.toLocaleLowerCase()}|${color.toLocaleLowerCase()}`;
    if (!sku || sku.length > 64 || !size || size.length > 32 || !color || color.length > 64 ||
        !Number.isSafeInteger(stock) || stock < 0 || seenSkus.has(sku) || seenOptions.has(optionKey)) {
      throw new AppError('Each variant needs a unique SKU, size, color, and non-negative integer stock', 400, 'VALIDATION_ERROR');
    }
    seenSkus.add(sku);
    seenOptions.add(optionKey);
    return {
      id: variant.id ? parsePositiveInteger(variant.id, 'variantId') : undefined,
      sku,
      size,
      color,
      stock,
      isActive: variant.isActive !== false
    };
  });
};

const createCatalogService = ({ catalogRepository }) => {
  const listProducts = async (query = {}, { includeInactive = false } = {}) => {
    const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
    const category = query.category ?? query.categoryId;
    const categoryId = category === undefined || category === ''
      ? undefined
      : parsePositiveInteger(category, 'category');
    const minPrice = query.minPrice === undefined ? undefined : Number(query.minPrice);
    const maxPrice = query.maxPrice === undefined ? undefined : Number(query.maxPrice);
    if ((minPrice !== undefined && (!Number.isFinite(minPrice) || minPrice < 0)) ||
        (maxPrice !== undefined && (!Number.isFinite(maxPrice) || maxPrice < 0)) ||
        (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice)) {
      throw new AppError('Invalid price range', 400, 'VALIDATION_ERROR');
    }

    let search = '';
    if (query.search) {
      search = String(query.search).trim();
      if (search.length > 100) throw new AppError('Search query is too long', 400, 'VALIDATION_ERROR');
    }

    const size = typeof query.size === 'string' && query.size.trim() ? query.size.trim() : undefined;
    const color = typeof query.color === 'string' && query.color.trim() ? query.color.trim() : undefined;
    const result = await catalogRepository.listProducts({
      includeInactive,
      categoryId,
      minPrice,
      maxPrice,
      search,
      size,
      color,
      sort: query.sort,
      limit,
      offset: (page - 1) * limit
    });
    return { rows: result.rows, count: result.count, page, limit };
  };

  const getProduct = async (id, { includeInactive = false } = {}) => {
    const product = await catalogRepository.findProduct(
      parsePositiveInteger(id, 'id'),
      { includeInactive }
    );
    if (!product || (!includeInactive && !product.isActive)) {
      throw new AppError('Product not found', 404, 'NOT_FOUND');
    }
    return product;
  };

  const createProduct = async (data = {}) => {
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    const price = Number(data.price);
    const stock = Number(data.countInStock ?? 0);
    const salePrice = data.salePrice === undefined || data.salePrice === null || data.salePrice === ''
      ? null
      : Number(data.salePrice);
    const variants = data.variants === undefined ? null : normalizeVariants(data.variants);
    if (!name || !Number.isFinite(price) || price < 0 ||
        !Number.isSafeInteger(stock) || stock < 0 ||
        (salePrice !== null && (!Number.isFinite(salePrice) || salePrice < 0 || salePrice >= price))) {
      throw new AppError('Valid name, non-negative price and stock are required', 400, 'VALIDATION_ERROR');
    }
    const categoryId = data.categoryId === undefined || data.categoryId === null || data.categoryId === ''
      ? null
      : parsePositiveInteger(data.categoryId, 'categoryId');
    if (categoryId !== null && !(await catalogRepository.findCategory(categoryId))) {
      throw new AppError('Category not found', 404, 'NOT_FOUND');
    }

    const productId = await catalogRepository.createProduct({
      name,
      description: data.description || null,
      price,
      salePrice,
      image: normalizeImageUrl(data.image),
      countInStock: variants
        ? variants.filter((variant) => variant.isActive).reduce((sum, variant) => sum + variant.stock, 0)
        : stock,
      color: data.color || null,
      brand: data.brand || null,
      categoryId,
      isActive: data.isActive === undefined ? true : Boolean(data.isActive)
    }, variants);
    return getProduct(productId, { includeInactive: true });
  };

  const updateProduct = async (id, data = {}) => {
    const productId = parsePositiveInteger(id, 'id');
    await catalogRepository.transaction(async (transaction) => {
      const product = await catalogRepository.findProductForUpdate(productId, transaction);
      if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');
      const updates = {};

      if (Object.hasOwn(data, 'name')) {
        if (typeof data.name !== 'string' || !data.name.trim()) {
          throw new AppError('Product name cannot be empty', 400, 'VALIDATION_ERROR');
        }
        updates.name = data.name.trim();
      }
      if (Object.hasOwn(data, 'price')) {
        const price = Number(data.price);
        if (!Number.isFinite(price) || price < 0) {
          throw new AppError('Price must be non-negative', 400, 'VALIDATION_ERROR');
        }
        updates.price = price;
      }
      if (Object.hasOwn(data, 'salePrice')) {
        const salePrice = data.salePrice === null || data.salePrice === '' ? null : Number(data.salePrice);
        const effectivePrice = Object.hasOwn(data, 'price') ? Number(data.price) : Number(product.price);
        if (salePrice !== null && (!Number.isFinite(salePrice) || salePrice < 0 || salePrice >= effectivePrice)) {
          throw new AppError('Sale price must be non-negative and lower than the regular price', 400, 'VALIDATION_ERROR');
        }
        updates.salePrice = salePrice;
      }
      if (Object.hasOwn(data, 'countInStock')) {
        const countInStock = Number(data.countInStock);
        if (!Number.isSafeInteger(countInStock) || countInStock < 0) {
          throw new AppError('Stock must be a non-negative integer', 400, 'VALIDATION_ERROR');
        }
        updates.countInStock = countInStock;
      }
      for (const field of ['description', 'color', 'brand', 'categoryId', 'isActive']) {
        if (Object.hasOwn(data, field)) updates[field] = data[field];
      }
      if (Object.hasOwn(data, 'image')) updates.image = normalizeImageUrl(data.image);
      if (updates.categoryId) {
        const categoryId = parsePositiveInteger(updates.categoryId, 'categoryId');
        if (!(await catalogRepository.findCategory(categoryId, transaction))) {
          throw new AppError('Category not found', 404, 'NOT_FOUND');
        }
        updates.categoryId = categoryId;
      }

      if (Object.hasOwn(data, 'variants')) {
        const variants = normalizeVariants(data.variants);
        const currentVariants = await catalogRepository.findVariantsForUpdate(productId, transaction);
        const currentById = new Map(currentVariants.map((variant) => [variant.id, variant]));
        for (const { id: variantId, ...variant } of variants) {
          if (variantId) {
            if (!currentById.has(variantId)) {
              throw new AppError('Variant does not belong to this product', 400, 'VALIDATION_ERROR');
            }
            await catalogRepository.updateVariant(productId, variantId, variant, transaction);
            currentById.delete(variantId);
          } else {
            await catalogRepository.createVariant(productId, variant, transaction);
          }
        }
        for (const variant of currentById.values()) {
          await catalogRepository.deactivateVariant(productId, variant.id, transaction);
        }
        const totalStock = await catalogRepository.sumActiveVariantStock(productId, transaction);
        updates.countInStock = Number(totalStock || 0);
      }

      await catalogRepository.saveProduct(productId, updates, transaction);
    });
    return getProduct(productId, { includeInactive: true });
  };

  const archiveProduct = async (id) => {
    const productId = parsePositiveInteger(id, 'id');
    const updated = await catalogRepository.archiveProduct(productId);
    if (!updated) throw new AppError('Product not found', 404, 'NOT_FOUND');
  };

  const listCategories = () => catalogRepository.listCategories();

  const getCategory = async (id) => {
    const category = await catalogRepository.findCategory(parsePositiveInteger(id, 'id'));
    if (!category) throw new AppError('Category not found', 404, 'NOT_FOUND');
    return category;
  };

  const createCategory = ({ name, description, image } = {}) => {
    if (typeof name !== 'string' || !name.trim()) {
      throw new AppError('Category name is required', 400, 'VALIDATION_ERROR');
    }
    return catalogRepository.createCategory({
      name: name.trim(),
      description: description || null,
      image: normalizeImageUrl(image)
    });
  };

  const updateCategory = async (id, data = {}) => {
    const categoryId = parsePositiveInteger(id, 'id');
    if (!(await catalogRepository.findCategory(categoryId))) {
      throw new AppError('Category not found', 404, 'NOT_FOUND');
    }
    const updates = {};
    if (Object.hasOwn(data, 'name')) {
      if (typeof data.name !== 'string' || !data.name.trim()) {
        throw new AppError('Category name cannot be empty', 400, 'VALIDATION_ERROR');
      }
      updates.name = data.name.trim();
    }
    if (Object.hasOwn(data, 'description')) updates.description = data.description;
    if (Object.hasOwn(data, 'image')) updates.image = normalizeImageUrl(data.image);
    const updated = await catalogRepository.updateCategory(categoryId, updates);
    if (!updated) throw new AppError('Category not found', 404, 'NOT_FOUND');
    return updated;
  };

  const deleteCategory = async (id) => {
    const category = await getCategory(id);
    if (await catalogRepository.countProductsByCategory(category.id)) {
      throw new AppError('Category is assigned to products and cannot be deleted', 409, 'CONFLICT');
    }
    await catalogRepository.deleteCategory(category.id);
  };

  return {
    listProducts,
    getProduct,
    createProduct,
    updateProduct,
    archiveProduct,
    listCategories,
    getCategory,
    createCategory,
    updateCategory,
    deleteCategory
  };
};

export { createCatalogService, normalizeImageUrl, normalizeVariants };
