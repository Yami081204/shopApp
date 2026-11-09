import { catalogService } from '../container.js';
import asyncHandler from '../utils/asyncHandler.js';

const getCategories = asyncHandler(async (req, res) => {
  res.json(await catalogService.listCategories());
});

const getCategoryById = asyncHandler(async (req, res) => {
  res.json(await catalogService.getCategory(req.params.id));
});

const createCategory = asyncHandler(async (req, res) => {
  res.status(201).json(await catalogService.createCategory(req.body || {}));
});

const updateCategory = asyncHandler(async (req, res) => {
  res.json(await catalogService.updateCategory(req.params.id, req.body || {}));
});

const deleteCategory = asyncHandler(async (req, res) => {
  await catalogService.deleteCategory(req.params.id);
  res.json({ message: 'Category removed' });
});

export {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};
