import { Op } from 'sequelize';

const createCatalogRepository = ({ db, Category, Product, ProductVariant }) => {
  const productIncludes = ({ includeInactive = false, size, color } = {}) => {
    const variantWhere = { isActive: true };
    if (size) variantWhere.size = String(size).trim();
    if (color) variantWhere.color = { [Op.like]: `%${String(color).trim()}%` };
    return [
      { model: Category },
      {
        model: ProductVariant,
        as: 'variants',
        where: variantWhere,
        required: Boolean(size || color),
        ...(includeInactive ? { where: undefined } : {})
      }
    ];
  };

  const findProduct = async (id, { includeInactive = false } = {}) => {
    const product = await Product.findByPk(id, {
      include: productIncludes({ includeInactive })
    });
    return product?.toJSON() ?? null;
  };

  const repository = {
    listProducts: async ({ includeInactive, categoryId, minPrice, maxPrice, search, size, color, sort, limit, offset }) => {
      const where = {};
      if (!includeInactive) where.isActive = true;
      if (categoryId !== undefined) where.categoryId = categoryId;
      if (minPrice !== undefined || maxPrice !== undefined) {
        const priceRange = {};
        if (minPrice !== undefined) priceRange[Op.gte] = minPrice;
        if (maxPrice !== undefined) priceRange[Op.lte] = maxPrice;
        where[Op.and] = [
          db.where(db.fn('COALESCE', db.col('salePrice'), db.col('price')), priceRange)
        ];
      }

      if (search) {
        const variantSearchWhere = { sku: { [Op.like]: `%${search}%` } };
        if (!includeInactive) variantSearchWhere.isActive = true;
        const matchingVariants = await ProductVariant.findAll({
          attributes: ['productId'],
          where: variantSearchWhere,
          raw: true
        });
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
          { id: { [Op.in]: matchingVariants.map((variant) => variant.productId) } }
        ];
      }

      const sortMap = {
        'price-asc': [[db.literal('COALESCE(salePrice, price)'), 'ASC']],
        'price-desc': [[db.literal('COALESCE(salePrice, price)'), 'DESC']],
        popular: [['rating', 'DESC']],
        newest: [['createdAt', 'DESC']]
      };
      const result = await Product.findAndCountAll({
        where,
        include: productIncludes({ includeInactive, size, color }),
        order: sortMap[sort] || sortMap.newest,
        limit,
        offset,
        distinct: true
      });
      return { rows: result.rows.map((product) => product.toJSON()), count: result.count };
    },

    findProduct,

    createProduct: async (data, variants) => db.transaction(async (transaction) => {
      const product = await Product.create(data, { transaction });
      if (variants?.length) {
        await ProductVariant.bulkCreate(variants.map(({ id, ...variant }) => ({
          ...variant,
          productId: product.id
        })), { transaction });
      }
      return product.id;
    }),

    transaction: (callback) => db.transaction(callback),

    findProductForUpdate: async (id, transaction) => {
      const product = await Product.findByPk(id, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      return product?.toJSON() ?? null;
    },

    findCategory: async (id, transaction) => {
      const category = await Category.findByPk(id, { transaction });
      return category?.toJSON() ?? null;
    },

    findVariantsForUpdate: async (productId, transaction) => (await ProductVariant.findAll({
      where: { productId },
      transaction,
      lock: transaction.LOCK.UPDATE
    })).map((variant) => variant.toJSON()),

    saveProduct: async (id, updates, transaction) => {
      const product = await Product.findByPk(id, { transaction });
      if (!product) return false;
      await product.update(updates, { transaction });
      return true;
    },

    updateVariant: (productId, id, updates, transaction) => ProductVariant.update(updates, {
      where: { id, productId },
      transaction
    }),

    createVariant: (productId, data, transaction) => ProductVariant.create({
      ...data,
      productId
    }, { transaction }),

    deactivateVariant: (productId, id, transaction) => ProductVariant.update(
      { isActive: false },
      { where: { id, productId }, transaction }
    ),

    sumActiveVariantStock: (productId, transaction) => ProductVariant.sum('stock', {
      where: { productId, isActive: true },
      transaction
    }),

    updateCategory: async (id, updates) => {
      const category = await Category.findByPk(id);
      if (!category) return null;
      await category.update(updates);
      return category.toJSON();
    },

    archiveProduct: async (id) => {
      const [updated] = await Product.update({ isActive: false }, { where: { id } });
      return updated === 1;
    },

    listCategories: async () => {
      const categories = await Category.findAll({ order: [['name', 'ASC']] });
      const counts = await Product.findAll({
        attributes: ['categoryId', [Product.sequelize.fn('COUNT', Product.sequelize.col('id')), 'count']],
        where: { isActive: true },
        group: ['categoryId'],
        raw: true
      });
      const countById = new Map(counts.map((row) => [Number(row.categoryId), Number(row.count)]));
      return categories.map((category) => ({
        ...category.toJSON(),
        count: countById.get(category.id) || 0
      }));
    },

    createCategory: async (data) => (await Category.create(data)).toJSON(),

    countProductsByCategory: (categoryId) => Product.count({ where: { categoryId } }),

    deleteCategory: (categoryId) => Category.destroy({ where: { id: categoryId } })
  };

  return repository;
};

export { createCatalogRepository };
