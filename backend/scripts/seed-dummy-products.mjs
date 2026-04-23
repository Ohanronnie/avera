#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API_BASE = (process.env.API_BASE || 'http://127.0.0.1:3000').replace(
  /\/$/,
  '',
);
const MEDIA_BASE = (
  process.env.MEDIA_BASE || API_BASE.replace('localhost', '127.0.0.1')
).replace(/\/$/, '');
const SOURCE_URL =
  process.env.SOURCE_URL || 'https://dummyjson.com/products?limit=30';
const EMAIL = process.env.SEED_EMAIL || 'ohanronnie@gmail.com';
const PASSWORD = process.env.SEED_PASSWORD || 'Paul123@';
const LIMIT = Number(process.env.SEED_LIMIT || 25);
const IMAGES_PER_PRODUCT = Number(process.env.SEED_IMAGES_PER_PRODUCT || 3);
const UPLOAD_IMAGES = process.env.SEED_UPLOAD_IMAGES === 'true';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FALLBACK_IMAGE_PATH =
  process.env.SEED_FALLBACK_IMAGE ||
  path.resolve(__dirname, '../src/products/shoe.jpg');
const PLACEHOLDER_IMAGE_BASE =
  process.env.SEED_PLACEHOLDER_IMAGE_BASE || 'https://placehold.co/900x900.jpg';

const CONDITIONS = ['New', 'Foreign Used', 'Local Used'];
const LOCATIONS = ['Lagos', 'Abuja', 'Rivers', 'Oyo', 'Enugu', 'Kano', 'Ogun'];

const CATEGORY_MAP = new Map([
  ['beauty', 'Beauty & Health'],
  ['fragrances', 'Beauty & Health'],
  ['skin-care', 'Beauty & Health'],
  ['furniture', 'Furniture'],
  ['home-decoration', 'Home & Kitchen'],
  ['kitchen-accessories', 'Home & Kitchen'],
  ['groceries', 'Home & Kitchen'],
  ['laptops', 'Electronics'],
  ['mobile-accessories', 'Electronics'],
  ['smartphones', 'Electronics'],
  ['tablets', 'Electronics'],
  ['motorcycle', 'Automotive'],
  ['vehicle', 'Automotive'],
  ['sports-accessories', 'Sports & Outdoors'],
  ['mens-shirts', 'Clothing'],
  ['mens-shoes', 'Clothing'],
  ['mens-watches', 'Jewelry & Accessories'],
  ['sunglasses', 'Jewelry & Accessories'],
  ['tops', 'Clothing'],
  ['womens-bags', 'Jewelry & Accessories'],
  ['womens-dresses', 'Clothing'],
  ['womens-jewellery', 'Jewelry & Accessories'],
  ['womens-shoes', 'Clothing'],
  ['womens-watches', 'Jewelry & Accessories'],
]);

const FALLBACK_PRODUCTS = [
  [
    'Wireless Noise Cancelling Headphones',
    'Electronics',
    58,
    'Clear audio, soft ear cushions, and long battery life for everyday listening.',
    'Avera Audio',
    ['headphones', 'bluetooth', 'audio'],
  ],
  [
    'Smart Fitness Watch',
    'Electronics',
    72,
    'Track workouts, heart rate, sleep, and notifications from your wrist.',
    'PulseFit',
    ['watch', 'fitness', 'wearable'],
  ],
  [
    'Portable Bluetooth Speaker',
    'Electronics',
    34,
    'Compact wireless speaker with deep bass and splash resistance.',
    'BoomBox',
    ['speaker', 'bluetooth', 'music'],
  ],
  [
    'USB-C Fast Charger',
    'Electronics',
    18,
    'Fast wall charger for phones, tablets, and small devices.',
    'VoltPro',
    ['charger', 'usb-c', 'accessory'],
  ],
  [
    'Leather Laptop Backpack',
    'womens-bags',
    45,
    'Durable backpack with padded laptop storage and everyday compartments.',
    'UrbanCarry',
    ['bag', 'laptop', 'fashion'],
  ],
  [
    'Classic White Sneakers',
    'mens-shoes',
    52,
    'Clean everyday sneakers with comfortable soles and premium finish.',
    'StreetStep',
    ['shoes', 'sneakers', 'fashion'],
  ],
  [
    'Cotton Graphic T-Shirt',
    'mens-shirts',
    16,
    'Soft cotton tee with a clean fit for casual wear.',
    'ThreadLab',
    ['shirt', 'clothing', 'casual'],
  ],
  [
    'Women Summer Dress',
    'womens-dresses',
    39,
    'Lightweight dress for casual outings, work, and weekend plans.',
    'LunaWear',
    ['dress', 'women', 'fashion'],
  ],
  [
    'Stainless Steel Wristwatch',
    'mens-watches',
    64,
    'Minimal watch with stainless strap and water-resistant build.',
    'TimeCraft',
    ['watch', 'accessory', 'fashion'],
  ],
  [
    'Gold Plated Necklace',
    'womens-jewellery',
    29,
    'Simple necklace for everyday wear and special occasions.',
    'GlowLine',
    ['jewelry', 'necklace', 'fashion'],
  ],
  [
    'Ceramic Dinner Plate Set',
    'kitchen-accessories',
    31,
    'Elegant plate set for home dining and hosting guests.',
    'HomeNest',
    ['kitchen', 'plates', 'home'],
  ],
  [
    'Non-Stick Frying Pan',
    'kitchen-accessories',
    24,
    'Durable non-stick pan for quick meals and easy cleaning.',
    'CookMate',
    ['kitchen', 'pan', 'cooking'],
  ],
  [
    'Modern Bedside Lamp',
    'home-decoration',
    28,
    'Warm table lamp for bedrooms, offices, and reading corners.',
    'BrightHome',
    ['lamp', 'decor', 'home'],
  ],
  [
    'Office Desk Chair',
    'furniture',
    86,
    'Comfortable chair with back support for work and study.',
    'ErgoSeat',
    ['chair', 'office', 'furniture'],
  ],
  [
    'Wooden Coffee Table',
    'furniture',
    95,
    'Compact living-room table with a sturdy wooden finish.',
    'OakHaus',
    ['table', 'furniture', 'home'],
  ],
  [
    'Hydrating Face Cream',
    'skin-care',
    22,
    'Daily moisturizer for smoother and fresher-looking skin.',
    'PureGlow',
    ['skincare', 'cream', 'beauty'],
  ],
  [
    'Matte Red Lipstick',
    'beauty',
    14,
    'Bold matte lipstick with smooth color and comfortable wear.',
    'VelvetCos',
    ['lipstick', 'makeup', 'beauty'],
  ],
  [
    'Luxury Eau De Parfum',
    'fragrances',
    48,
    'Long-lasting fragrance with warm and fresh notes.',
    'ScentHouse',
    ['perfume', 'fragrance', 'beauty'],
  ],
  [
    'Yoga Exercise Mat',
    'sports-accessories',
    21,
    'Non-slip mat for yoga, stretching, workouts, and meditation.',
    'FlexFit',
    ['yoga', 'fitness', 'sports'],
  ],
  [
    'Adjustable Dumbbell Pair',
    'sports-accessories',
    70,
    'Space-saving dumbbells for home strength training.',
    'IronFlex',
    ['dumbbell', 'fitness', 'gym'],
  ],
  [
    'Car Phone Holder',
    'vehicle',
    13,
    'Secure phone mount for dashboards and windshields.',
    'DriveGrip',
    ['car', 'phone-holder', 'auto'],
  ],
  [
    'Motorcycle Riding Gloves',
    'motorcycle',
    26,
    'Protective gloves with comfortable grip and breathable material.',
    'RideSafe',
    ['motorcycle', 'gloves', 'auto'],
  ],
  [
    'Premium Dog Food Bag',
    'groceries',
    33,
    'Nutritious dry food blend for active dogs.',
    'PetBowl',
    ['dog', 'pet', 'food'],
  ],
  [
    'Fresh Cooking Oil Pack',
    'groceries',
    19,
    'Quality cooking oil for home meals and food businesses.',
    'KitchenGold',
    ['oil', 'food', 'grocery'],
  ],
  [
    'Apple Fruit Pack',
    'groceries',
    12,
    'Fresh apples packed for snacks, juicing, and family meals.',
    'FreshFarm',
    ['apple', 'fruit', 'grocery'],
  ],
].map(([title, category, price, description, brand, tags], index) => ({
  id: `fallback-${index + 1}`,
  title,
  category,
  price,
  description,
  brand,
  tags,
  stock: 8 + index,
  thumbnail: null,
  images: [],
}));

function assertOk(response, label) {
  if (!response.ok) {
    throw new Error(
      `${label} failed with ${response.status} ${response.statusText}`,
    );
  }
}

function pick(items, index) {
  return items[index % items.length];
}

function slugToWords(value = '') {
  return value
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getExtension(contentType = '') {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  return 'jpg';
}

function sanitizeFilename(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function getErrorMessage(value) {
  if (Array.isArray(value)) return value.join(', ');
  if (value && typeof value === 'object') {
    return value.message || JSON.stringify(value);
  }
  return value || 'Unknown error';
}

function isAbsoluteUrl(value) {
  return /^https?:\/\//i.test(String(value || ''));
}

function normalizeUploadedImageUrl(file) {
  const uploadedPath = file?.path || file?.url;
  if (!uploadedPath) return null;
  if (isAbsoluteUrl(uploadedPath)) return uploadedPath;

  const pathWithoutSlash = String(uploadedPath).replace(/^\/+/, '');
  if (pathWithoutSlash.startsWith('media/')) {
    return `${MEDIA_BASE}/${pathWithoutSlash}`;
  }

  return `${MEDIA_BASE}/media/${pathWithoutSlash}`;
}

function getSourceImageUrls(product) {
  return [...new Set([product.thumbnail, ...(product.images || [])])]
    .filter((url) => isAbsoluteUrl(url))
    .slice(0, Math.min(IMAGES_PER_PRODUCT, 5));
}

async function assertImageUrlReachable(url) {
  const response = await request(
    url,
    { method: 'GET' },
    `Checking image ${url}`,
  );
  assertOk(response, `Checking image ${url}`);

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) {
    throw new Error(`Image URL is not serving an image: ${url}`);
  }
}

function getPlaceholderImageUrl(productTitle, index = 1) {
  const text = encodeURIComponent(productTitle || `Avera product ${index}`);
  const separator = PLACEHOLDER_IMAGE_BASE.includes('?') ? '&' : '?';
  return `${PLACEHOLDER_IMAGE_BASE}${separator}text=${text}`;
}

async function request(url, options, label) {
  try {
    return await fetch(url, options);
  } catch (error) {
    throw new Error(
      `${label} failed: ${error.message}. Is the backend running and reachable at ${API_BASE}?`,
    );
  }
}

async function login() {
  const response = await request(
    `${API_BASE}/auth/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    },
    'Login request',
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      `Login failed: ${getErrorMessage(data) || response.statusText}`,
    );
  }

  if (!data.accessToken) {
    throw new Error('Login succeeded but no accessToken was returned');
  }

  return data.accessToken;
}

async function fetchSourceProducts() {
  try {
    const response = await request(
      SOURCE_URL,
      undefined,
      'Fetching source products',
    );
    assertOk(response, 'Fetching source products');
    const data = await response.json();
    const products = (data.products || []).slice(0, LIMIT);

    if (products.length) return products;

    throw new Error('Source returned no products');
  } catch (error) {
    console.warn(
      `Source API unavailable, using built-in fallback catalog: ${error.message}`,
    );
    return FALLBACK_PRODUCTS.slice(0, LIMIT);
  }
}

async function fetchCategories() {
  const response = await request(
    `${API_BASE}/categories`,
    undefined,
    'Fetching categories',
  );
  assertOk(response, 'Fetching categories');
  const categories = await response.json();

  if (!Array.isArray(categories) || categories.length === 0) {
    throw new Error('No categories returned by backend');
  }

  return categories;
}

function resolveCategoryId(product, categories) {
  const desiredName = CATEGORY_MAP.get(product.category) || 'Electronics';
  const matched = categories.find((category) => category.name === desiredName);
  return (matched || categories[0]).id;
}

async function downloadImage(url, productTitle, index) {
  const response = await request(url, undefined, `Downloading image ${url}`);
  assertOk(response, `Downloading image ${url}`);

  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const extension = getExtension(contentType);
  const arrayBuffer = await response.arrayBuffer();
  const filename = `${sanitizeFilename(productTitle)}-${index}.${extension}`;

  return {
    blob: new Blob([arrayBuffer], { type: contentType }),
    filename,
    contentType,
  };
}

async function getFallbackImage(productTitle) {
  const buffer = await fs.readFile(FALLBACK_IMAGE_PATH);
  return {
    blob: new Blob([buffer], { type: 'image/jpeg' }),
    filename: `${sanitizeFilename(productTitle)}-fallback.jpg`,
  };
}

async function uploadImages(product) {
  if (!UPLOAD_IMAGES) {
    const sourceUrls = getSourceImageUrls(product);
    return sourceUrls.length
      ? sourceUrls
      : [getPlaceholderImageUrl(product.title)];
  }

  const urls = [...new Set([product.thumbnail, ...(product.images || [])])]
    .filter(Boolean)
    .slice(0, Math.min(IMAGES_PER_PRODUCT, 5));

  const formData = new FormData();
  let appendedImages = 0;

  for (const [index, url] of urls.entries()) {
    try {
      const image = await downloadImage(url, product.title, index + 1);
      formData.append('images', image.blob, image.filename);
      appendedImages++;
    } catch (error) {
      console.warn(
        `Image download failed for ${product.title}: ${error.message}`,
      );
    }
  }

  if (appendedImages === 0) {
    const fallbackImage = await getFallbackImage(product.title);
    formData.append('images', fallbackImage.blob, fallbackImage.filename);
  }

  const response = await request(
    `${API_BASE}/uploads/images`,
    {
      method: 'POST',
      body: formData,
    },
    'Image upload request',
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      `Image upload failed: ${getErrorMessage(data) || response.statusText}`,
    );
  }

  const uploadedFiles = data.files || [];

  if (!uploadedFiles.length) {
    throw new Error('Image upload returned no files');
  }

  const uploadedUrls = uploadedFiles
    .map(normalizeUploadedImageUrl)
    .filter(Boolean);
  if (!uploadedUrls.length) {
    throw new Error('Image upload returned no usable URLs');
  }

  await Promise.all(uploadedUrls.map((url) => assertImageUrlReachable(url)));

  return uploadedUrls;
}

function buildPayload(product, categories, index, images) {
  const brandText = product.brand ? `${product.brand} ` : '';
  const categoryText = slugToWords(product.category);
  const priceInNaira = Math.max(
    1000,
    Math.round(Number(product.price || 10) * 1500),
  );
  const tags = Array.from(
    new Set(
      [product.brand, product.category, categoryText, ...(product.tags || [])]
        .filter(Boolean)
        .map((tag) => String(tag).toLowerCase().replace(/\s+/g, '-')),
    ),
  ).slice(0, 6);

  return {
    name: `${brandText}${product.title}`.slice(0, 180),
    description:
      `${product.description}\n\nImported test listing from DummyJSON for local marketplace development.`.slice(
        0,
        1900,
      ),
    price: priceInNaira,
    categoryId: resolveCategoryId(product, categories),
    images,
    quantity: Math.max(1, Math.min(Number(product.stock || 1), 25)),
    condition: pick(CONDITIONS, index),
    tags,
    currency: 'NGN',
    location: pick(LOCATIONS, index),
  };
}

async function createProduct(payload, token) {
  const response = await request(
    `${API_BASE}/products/create`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
    'Create product request',
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`Create product failed: ${JSON.stringify(data)}`);
  }

  return data;
}

async function main() {
  console.log(`Logging in to ${API_BASE} as ${EMAIL}`);
  const token = await login();

  console.log('Fetching categories from backend');
  const categories = await fetchCategories();

  console.log(`Fetching source products from ${SOURCE_URL}`);
  const products = await fetchSourceProducts();

  if (products.length < LIMIT) {
    console.warn(`Only received ${products.length} products from source`);
  }

  const results = [];

  for (const [index, product] of products.entries()) {
    const label = `${index + 1}/${products.length} ${product.title}`;

    try {
      console.log(
        `${UPLOAD_IMAGES ? 'Uploading' : 'Resolving'} images for ${label}`,
      );
      let images;
      try {
        images = await uploadImages(product);
      } catch (error) {
        const sourceUrls = getSourceImageUrls(product);
        images = sourceUrls.length
          ? sourceUrls
          : [getPlaceholderImageUrl(product.title, index + 1)];
        console.warn(
          `Image upload unavailable for ${product.title}; using ${
            sourceUrls.length ? 'source image URLs' : 'placeholder image'
          }: ${error.message}`,
        );
      }
      const payload = buildPayload(product, categories, index, images);

      console.log(`Creating product ${label}`);
      await createProduct(payload, token);
      results.push({ name: product.title, status: 'created' });
      console.log(`Created ${product.title}`);
    } catch (error) {
      results.push({
        name: product.title,
        status: 'failed',
        error: error.message,
      });
      console.error(`Failed ${product.title}: ${error.message}`);
    }
  }

  const created = results.filter(
    (result) => result.status === 'created',
  ).length;
  const failed = results.length - created;

  console.log('\nSeed complete');
  console.log(`Created: ${created}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailures:');
    results
      .filter((result) => result.status === 'failed')
      .forEach((result) => console.log(`- ${result.name}: ${result.error}`));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
