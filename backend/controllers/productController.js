import { catalogService } from '../container.js';
import asyncHandler from '../utils/asyncHandler.js';

const sendProducts = (res, result) => {
  res.set({
    'X-Total-Count': String(result.count),
    'X-Page': String(result.page),
    'X-Limit': String(result.limit)
  });
  res.json(result.rows);
};

const getProducts = asyncHandler(async (req, res) => {
  sendProducts(res, await catalogService.listProducts(req.query));
});

const getManageProducts = asyncHandler(async (req, res) => {
  sendProducts(res, await catalogService.listProducts(req.query, { includeInactive: true }));
});

const getProductById = asyncHandler(async (req, res) => {
  res.json(await catalogService.getProduct(req.params.id));
});

const createProduct = asyncHandler(async (req, res) => {
  res.status(201).json(await catalogService.createProduct(req.body || {}));
});

const updateProduct = asyncHandler(async (req, res) => {
  res.json(await catalogService.updateProduct(req.params.id, req.body || {}));
});

const deleteProduct = asyncHandler(async (req, res) => {
  await catalogService.archiveProduct(req.params.id);
  res.json({ message: 'Product archived' });
});

const getProductsByCategory = asyncHandler(async (req, res) => {
  sendProducts(res, await catalogService.listProducts({
    ...req.query,
    categoryId: req.params.categoryId
  }));
});

export {
  getProducts,
  getManageProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByCategory
};
