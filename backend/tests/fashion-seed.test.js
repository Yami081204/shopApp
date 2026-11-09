import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { categories, validateFashionCatalog } from '../scripts/seed-fashion-products.js';

test('fashion seed includes 12 unique categories and at least 40 distinct products', () => {
  assert.doesNotThrow(validateFashionCatalog);
  assert.equal(categories.length, 12);
  assert.equal(new Set(categories.map((category) => category.name)).size, 12);
  assert.ok(categories.reduce((count, category) => count + category.products.length, 0) >= 40);
});

test('fashion seed variants have sizes, colors, and local category images', () => {
  for (const category of categories) {
    assert.ok(category.image.startsWith('/uploads/fashion/'));
    assert.equal(category.productImages.length, category.products.length);
    assert.ok(category.productImages.every((image) => image.startsWith('/uploads/fashion/')));
    assert.ok(category.sizes.length > 0);
    assert.ok(category.colors.length > 0);
    assert.ok(category.products.length > 0);
  }
  assert.ok(categories.every((category) => category.products.every((product) => Number.isInteger(product[2]) && product[2] > 0)));
});

test('every seeded product has an existing distinct local image', async () => {
  const productImages = categories.flatMap((category) => category.productImages);
  const frontendPublicDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../../frontend/public');

  assert.equal(productImages.length, 40);
  assert.equal(new Set(productImages).size, productImages.length);
  await Promise.all(productImages.map((image) =>
    access(resolve(frontendPublicDirectory, image.replace(/^\//, '')))
  ));
});
