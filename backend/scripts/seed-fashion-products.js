import { access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import db from '../config/database.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import ProductVariant from '../models/ProductVariant.js';

export const categories = [
  {
    name: 'Áo thun',
    description: 'Áo thun mặc hằng ngày với phom dáng thoải mái.',
    image: '/uploads/fashion/ao-thun.jpg',
    productImages: [
      '/uploads/fashion/products/01.jpg',
      '/uploads/fashion/products/03.jpg',
      '/uploads/fashion/products/04.jpg',
      '/uploads/fashion/products/45.jpg'
    ],
    skuPrefix: 'AT',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Trắng', 'Đen'],
    products: [
      ['Áo thun cotton Essential', 'Áo thun cotton mềm, thoáng khí, phù hợp mặc hằng ngày.', 249000, 219000],
      ['Áo thun cổ tròn Urban', 'Thiết kế cổ tròn tối giản, dễ phối cùng quần jeans.', 279000],
      ['Áo thun form rộng Weekend', 'Phom rộng hiện đại, chất vải mềm và nhẹ.', 329000],
      ['Áo thun kẻ ngang Classic', 'Họa tiết kẻ ngang thanh lịch với chất liệu cotton co giãn.', 299000]
    ]
  },
  {
    name: 'Áo sơ mi',
    description: 'Áo sơ mi lịch sự cho công sở và những dịp thường ngày.',
    image: '/uploads/fashion/ao-so-mi.jpg',
    productImages: [
      '/uploads/fashion/products/05.jpg',
      '/uploads/fashion/products/06.jpg',
      '/uploads/fashion/products/07.jpg',
      '/uploads/fashion/products/08.jpg'
    ],
    skuPrefix: 'ASM',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Trắng', 'Xanh nhạt'],
    products: [
      ['Áo sơ mi Oxford thanh lịch', 'Sơ mi Oxford đứng phom, phù hợp đi làm và gặp gỡ.', 499000, 449000],
      ['Áo sơ mi linen mùa hè', 'Chất linen thoáng mát, bề mặt vải tự nhiên.', 559000],
      ['Áo sơ mi cổ đức Everyday', 'Thiết kế cổ đức cổ điển, dễ phối nhiều phong cách.', 459000],
      ['Áo sơ mi tay ngắn Resort', 'Sơ mi tay ngắn nhẹ nhàng cho ngày nắng.', 429000]
    ]
  },
  {
    name: 'Áo polo',
    description: 'Áo polo cổ bẻ cân bằng giữa năng động và chỉn chu.',
    image: '/uploads/fashion/ao-polo.svg',
    productImages: [
      '/uploads/fashion/products/15.jpg',
      '/uploads/fashion/products/16.jpg',
      '/uploads/fashion/products/38.jpg',
      '/uploads/fashion/products/67.jpg'
    ],
    skuPrefix: 'AP',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Xanh navy', 'Trắng'],
    products: [
      ['Áo polo pique Heritage', 'Áo polo vải pique thoáng khí với cổ bẻ gọn gàng.', 399000, 359000],
      ['Áo polo viền cổ Minimal', 'Điểm nhấn viền cổ tinh tế trên nền thiết kế tối giản.', 429000],
      ['Áo polo dáng regular Daily', 'Phom regular dễ mặc, phù hợp nhiều hoàn cảnh.', 379000],
      ['Áo polo cotton Premium', 'Cotton mềm mịn, cổ áo giữ phom tốt.', 469000]
    ]
  },
  {
    name: 'Áo khoác',
    description: 'Áo khoác ngoài tiện dụng cho thời tiết và nhiều phong cách.',
    image: '/uploads/fashion/ao-khoac.svg',
    productImages: [
      '/uploads/fashion/products/02.jpg',
      '/uploads/fashion/products/09.jpg',
      '/uploads/fashion/products/10.jpg',
      '/uploads/fashion/products/35.jpg'
    ],
    skuPrefix: 'AK',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Đen', 'Nâu'],
    products: [
      ['Áo khoác denim Classic', 'Áo khoác denim bền chắc với phom dáng vượt thời gian.', 899000],
      ['Áo khoác bomber City', 'Bomber nhẹ, bo viền gọn, phù hợp phong cách đường phố.', 1099000, 989000],
      ['Áo khoác da dáng ngắn', 'Thiết kế dáng ngắn hiện đại với bề mặt giả da.', 1299000],
      ['Áo khoác cardigan dệt kim', 'Cardigan dệt kim mềm, phù hợp mặc nhiều lớp.', 799000]
    ]
  },
  {
    name: 'Quần jeans',
    description: 'Quần jeans với phom dáng linh hoạt và dễ phối đồ.',
    image: '/uploads/fashion/quan-jeans.svg',
    productImages: [
      '/uploads/fashion/products/12.jpg',
      '/uploads/fashion/products/13.jpg',
      '/uploads/fashion/products/49.jpg'
    ],
    skuPrefix: 'QJ',
    sizes: ['28', '29', '30', '31', '32', '34'],
    colors: ['Xanh denim', 'Đen'],
    products: [
      ['Quần jeans straight fit', 'Phom straight fit cân đối, chất denim bền và thoải mái.', 699000, 629000],
      ['Quần jeans slim xanh nhạt', 'Dáng slim gọn gàng với sắc xanh denim sáng.', 729000],
      ['Quần jeans ống rộng Vintage', 'Ống rộng thời thượng, cảm hứng denim cổ điển.', 779000]
    ]
  },
  {
    name: 'Quần âu',
    description: 'Quần âu chỉn chu cho môi trường công sở và sự kiện.',
    image: '/uploads/fashion/quan-au.svg',
    productImages: [
      '/uploads/fashion/products/32.jpg',
      '/uploads/fashion/products/33.jpg',
      '/uploads/fashion/products/65.jpg'
    ],
    skuPrefix: 'QA',
    sizes: ['28', '29', '30', '31', '32', '34'],
    colors: ['Đen', 'Xám'],
    products: [
      ['Quần âu slim office', 'Quần âu phom slim, phù hợp phối cùng sơ mi công sở.', 649000],
      ['Quần âu ống đứng Classic', 'Ống đứng cổ điển, đường may gọn gàng.', 699000],
      ['Quần âu ly giữa Modern', 'Ly giữa tạo vẻ chỉn chu với chất vải ít nhăn.', 759000, 689000]
    ]
  },
  {
    name: 'Quần short',
    description: 'Quần short thoải mái cho hoạt động thường ngày và du lịch.',
    image: '/uploads/fashion/quan-short-candidate.jpg',
    productImages: [
      '/uploads/fashion/quan-short-candidate.jpg',
      '/uploads/fashion/products/43.jpg',
      '/uploads/fashion/quan-short.jpg'
    ],
    skuPrefix: 'QS',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Be', 'Đen'],
    products: [
      ['Quần short kaki Everyday', 'Kaki mềm, lưng vừa vặn, tiện dụng cho ngày năng động.', 399000],
      ['Quần short denim Summer', 'Denim nhẹ với phom thoải mái cho mùa hè.', 429000, 389000],
      ['Quần short linen Relax', 'Linen thoáng mát với thiết kế tối giản.', 459000]
    ]
  },
  {
    name: 'Váy và đầm',
    description: 'Váy và đầm cho phong cách nữ tính trong nhiều dịp.',
    image: '/uploads/fashion/vay-dam-candidate.jpg',
    productImages: [
      '/uploads/fashion/products/18.jpg',
      '/uploads/fashion/products/19.jpg',
      '/uploads/fashion/products/62.jpg'
    ],
    skuPrefix: 'VD',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Be', 'Đen'],
    products: [
      ['Đầm midi cổ vuông', 'Đầm midi thanh lịch với cổ vuông và phom nhẹ nhàng.', 899000, 799000],
      ['Váy liền hoa nhí', 'Họa tiết hoa nhí trang nhã, phù hợp dạo phố.', 829000],
      ['Đầm sơ mi thắt eo', 'Đầm sơ mi dễ mặc với chi tiết thắt eo tinh tế.', 949000]
    ]
  },
  {
    name: 'Chân váy',
    description: 'Chân váy dễ phối cùng áo thun, sơ mi và áo len.',
    image: '/uploads/fashion/chan-vay.svg',
    productImages: [
      '/uploads/fashion/products/63.jpg',
      '/uploads/fashion/products/66.jpg',
      '/uploads/fashion/chan-vay.svg'
    ],
    skuPrefix: 'CV',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Nâu', 'Đen'],
    products: [
      ['Chân váy chữ A Classic', 'Chân váy chữ A tôn dáng, chất vải đứng phom.', 599000],
      ['Chân váy midi xếp ly', 'Thiết kế xếp ly mềm mại, dài qua gối.', 699000, 629000],
      ['Chân váy denim dáng dài', 'Denim bền đẹp với đường xẻ tiện di chuyển.', 729000]
    ]
  },
  {
    name: 'Giày dép',
    description: 'Giày dép tiện dụng để hoàn thiện trang phục hằng ngày.',
    image: '/uploads/fashion/giay-dep.svg',
    productImages: [
      '/uploads/fashion/products/21.jpg',
      '/uploads/fashion/products/54.jpg',
      '/uploads/fashion/giay-dep.svg'
    ],
    skuPrefix: 'GD',
    sizes: ['36', '37', '38', '39', '40', '41', '42', '43'],
    colors: ['Trắng', 'Đen'],
    products: [
      ['Giày sneaker Court', 'Sneaker phom gọn, dễ phối cùng trang phục thường ngày.', 899000, 799000],
      ['Giày loafer Urban', 'Loafer tối giản cho phong cách thanh lịch.', 1099000],
      ['Dép quai ngang Minimal', 'Dép quai ngang nhẹ và tiện dụng khi di chuyển.', 399000]
    ]
  },
  {
    name: 'Túi xách',
    description: 'Túi xách và ba lô tiện dụng cho nhiều nhu cầu.',
    image: '/uploads/fashion/tui-xach.svg',
    productImages: [
      '/uploads/fashion/products/27.jpg',
      '/uploads/fashion/products/28.jpg',
      '/uploads/fashion/products/58.jpg'
    ],
    skuPrefix: 'TX',
    sizes: ['FREESIZE'],
    colors: ['Nâu', 'Đen'],
    products: [
      ['Túi đeo vai Daily', 'Túi đeo vai gọn nhẹ với ngăn chứa đồ thiết yếu.', 799000, 729000],
      ['Túi tote canvas Weekend', 'Túi tote canvas rộng rãi cho đi học và dạo phố.', 399000],
      ['Ba lô Urban Compact', 'Ba lô phom gọn với ngăn chứa tiện lợi.', 899000]
    ]
  },
  {
    name: 'Phụ kiện thời trang',
    description: 'Phụ kiện hoàn thiện phong cách cá nhân.',
    image: '/uploads/fashion/phu-kien.jpg',
    productImages: [
      '/uploads/fashion/products/29.jpg',
      '/uploads/fashion/products/30.jpg',
      '/uploads/fashion/products/31.jpg'
    ],
    skuPrefix: 'PK',
    sizes: ['FREESIZE'],
    colors: ['Vàng nhạt', 'Bạc'],
    products: [
      ['Khuyên tai vòng thanh mảnh', 'Khuyên tai dáng vòng tối giản, dễ phối trang phục.', 249000],
      ['Dây chuyền mặt tròn', 'Dây chuyền mảnh với mặt tròn nhỏ tinh tế.', 329000, 289000],
      ['Thắt lưng da tối giản', 'Thắt lưng thiết kế gọn, phù hợp nhiều kiểu quần.', 459000]
    ]
  }
];

export const validateFashionCatalog = () => {
  const productNames = categories.flatMap((category) => category.products.map(([name]) => name));
  if (categories.length !== 12 || productNames.length < 40 || new Set(productNames).size !== productNames.length) {
    throw new Error('Fashion seed must define 12 categories and at least 40 uniquely named products.');
  }
  if (categories.some((category) =>
    category.productImages.length !== category.products.length
    || category.productImages.some((image) => !image.startsWith('/uploads/fashion/'))
  )) {
    throw new Error('Every fashion product must have a local fashion image.');
  }
};

const slug = (value) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .replace(/[^a-zA-Z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .toUpperCase();

const assertSchema = async () => {
  const queryInterface = db.getQueryInterface();
  const [products, variants] = await Promise.all([
    queryInterface.describeTable('products'),
    queryInterface.describeTable('product_variants')
  ]);
  const missing = [];

  if (!products.salePrice) missing.push('products.salePrice');
  if (!variants.productId || !variants.sku || !variants.size || !variants.color || !variants.stock) {
    missing.push('product_variants columns');
  }

  if (missing.length) {
    throw new Error(`Run database migrations before seeding; missing ${missing.join(', ')}.`);
  }
};

const seed = async () => {
  validateFashionCatalog();
  const frontendPublicDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../../frontend/public');
  const imagePaths = new Set(categories.flatMap((category) => [category.image, ...category.productImages]));
  await Promise.all([...imagePaths].map((image) =>
    access(resolve(frontendPublicDirectory, image.replace(/^\//, '')))
  ));
  await db.authenticate();
  await assertSchema();

  let createdCategories = 0;
  let createdProducts = 0;
  let skippedProducts = 0;
  let updatedProductImages = 0;

  await db.transaction(async (transaction) => {
    for (let categoryIndex = 0; categoryIndex < categories.length; categoryIndex += 1) {
      const definition = categories[categoryIndex];
      const [category, categoryCreated] = await Category.findOrCreate({
        where: { name: definition.name },
        defaults: {
          description: definition.description,
          image: definition.image
        },
        transaction
      });

      if (categoryCreated) createdCategories += 1;

      for (let productIndex = 0; productIndex < definition.products.length; productIndex += 1) {
        const [name, description, price, salePrice] = definition.products[productIndex];
        const image = definition.productImages[productIndex];
        const existing = await Product.findOne({ where: { name }, transaction });
        if (existing) {
          if (existing.image !== image) {
            await existing.update({ image }, { transaction });
            updatedProductImages += 1;
          }
          skippedProducts += 1;
          continue;
        }

        const variantRows = [];
        for (let colorIndex = 0; colorIndex < definition.colors.length; colorIndex += 1) {
          const color = definition.colors[colorIndex];
          for (let sizeIndex = 0; sizeIndex < definition.sizes.length; sizeIndex += 1) {
            const size = definition.sizes[sizeIndex];
            variantRows.push({
              sku: `YAMI-${definition.skuPrefix}-${String(productIndex + 1).padStart(2, '0')}-${slug(color)}-${slug(size)}`,
              size,
              color,
              stock: 5 + ((categoryIndex + productIndex + colorIndex + sizeIndex) % 12),
              isActive: true
            });
          }
        }

        const countInStock = variantRows.reduce((total, variant) => total + variant.stock, 0);
        const product = await Product.create({
          name,
          description,
          price,
          salePrice: salePrice ?? null,
          image,
          countInStock,
          isActive: true,
          color: definition.colors.join(', '),
          brand: 'YAMI',
          categoryId: category.id
        }, { transaction });

        await ProductVariant.bulkCreate(
          variantRows.map((variant) => ({ ...variant, productId: product.id })),
          { transaction }
        );
        createdProducts += 1;
      }
    }
  });

  console.log(`Fashion seed complete: ${createdCategories} categories created, ${createdProducts} products created, ${updatedProductImages} product images updated, ${skippedProducts} existing products skipped.`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  seed()
    .catch((error) => {
      console.error('Fashion seed failed:', error.message);
      process.exitCode = 1;
    })
    .finally(async () => {
      await db.close();
    });
}
