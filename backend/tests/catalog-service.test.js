import test from 'node:test';
import assert from 'node:assert/strict';
import { createCatalogService } from '../services/catalogService.js';

const makeCatalogService = () => {
  const calls = [];
  const catalogRepository = {
    listProducts: async (criteria) => {
      calls.push(criteria);
      return { rows: [], count: 0 };
    },
    findCategory: async (id) => (id === 4 ? { id, name: 'Clothing' } : null),
    createProduct: async (data, variants) => {
      calls.push({ data, variants });
      return 12;
    },
    findProduct: async (id, options) => ({
      id,
      isActive: true,
      options
    })
  };
  return { service: createCatalogService({ catalogRepository }), calls };
};

test('catalog service validates filters before sending a persistence-neutral query', async () => {
  const { service, calls } = makeCatalogService();

  const result = await service.listProducts({
    category: '4',
    minPrice: '10',
    maxPrice: '20',
    search: '  jacket  ',
    size: ' M ',
    page: '2',
    limit: '5',
    sort: 'price-asc'
  });

  assert.deepEqual(result, { rows: [], count: 0, page: 2, limit: 5 });
  assert.deepEqual(calls[0], {
    includeInactive: false,
    categoryId: 4,
    minPrice: 10,
    maxPrice: 20,
    search: 'jacket',
    size: 'M',
    color: undefined,
    sort: 'price-asc',
    limit: 5,
    offset: 5
  });
  await assert.rejects(() => service.listProducts({ minPrice: '30', maxPrice: '20' }), {
    code: 'VALIDATION_ERROR'
  });
});

test('catalog service validates and normalizes product input before repository writes', async () => {
  const { service, calls } = makeCatalogService();

  const product = await service.createProduct({
    name: ' Jacket ',
    price: '200',
    countInStock: '9',
    categoryId: '4',
    image: ' /images/jacket.png ',
    variants: [{ sku: 'J-M-BLACK', size: 'M', color: 'Black', stock: '3' }]
  });

  assert.equal(product.id, 12);
  assert.equal(calls[0].data.name, 'Jacket');
  assert.equal(calls[0].data.image, '/images/jacket.png');
  assert.equal(calls[0].data.countInStock, 3);
  assert.equal(calls[0].variants[0].stock, 3);
  await assert.rejects(() => service.createProduct({
    name: 'Unsafe',
    price: 200,
    image: 'javascript:alert(1)'
  }), { code: 'VALIDATION_ERROR' });
});
