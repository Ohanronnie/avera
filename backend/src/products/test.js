import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

// ===== Config =====
const API_BASE = 'http://localhost:3000'; // Replace with your API base URL
const MAX_IMAGES = 5; // Max images per product
const LOCAL_IMAGE_PATH = './shoe.jpg'; // Default local image path
const CONCURRENCY_LIMIT = 3; // Max concurrent requests

// ===== Products to upload =====
const PRODUCTS = [
  {
    name: 'Wireless Bluetooth Headphones',
    description:
      'High-quality noise-canceling wireless headphones with 20-hour battery life.',
    price: 15000,
    categoryName: 'Electronics',
    imageUrls: [LOCAL_IMAGE_PATH],
    quantity: 25,
    condition: 'New',
    tags: ['headphones', 'bluetooth', 'audio', 'tech'],
    currency: 'NGN',
    location: 'Lagos',
  },
  {
    name: 'Leather Laptop Backpack',
    description:
      'Stylish and durable leather backpack for laptops up to 15 inches.',
    price: 12000,
    categoryName: 'Fashion',
    imageUrls: [LOCAL_IMAGE_PATH],
    quantity: 15,
    condition: 'New',
    tags: ['backpack', 'leather', 'fashion', 'travel'],
    currency: 'NGN',
    location: 'Port Harcourt',
  },
  // ... add more products here
];

// ===== Helpers =====

// Get category ID by name
async function getCategoryId(name) {
  try {
    const res = await axios.get(`${API_BASE}/categories`, { timeout: 5000 });
    const categories = res.data;

    if (!categories.length) throw new Error('No categories available');

    // Pick a random category
    const randomCategory =
      categories[Math.floor(Math.random() * categories.length)];
    return randomCategory.id;
  } catch (err) {
    throw new Error(`Failed to fetch categories: ${err.message}`);
  }
}

// Upload images and return array of uploaded paths
async function uploadImages(urls) {
  const uploadedPaths = [];

  for (const url of urls.slice(0, MAX_IMAGES)) {
    try {
      if (!fs.existsSync(url)) throw new Error(`File not found: ${url}`);
      const buffer = fs.readFileSync(url);
      const filename = path.basename(url);

      const form = new FormData();
      form.append('images', buffer, { filename });

      const res = await axios.post(`${API_BASE}/uploads/images`, form, {
        headers: {
          ...form.getHeaders(),
          'Content-Length': form.getLengthSync(),
        },
        timeout: 10000,
      });

      uploadedPaths.push(...res.data.files.map((f) => f.path));
    } catch (err) {
      console.warn(`Failed to upload image ${url}: ${err.message}`);
    }
  }

  if (!uploadedPaths.length)
    throw new Error('No images were successfully uploaded');
  return uploadedPaths;
}

// Create a single product
async function createProduct(product) {
  try {
    const categoryId = await getCategoryId(product.categoryName);
    const images = await uploadImages(product.imageUrls);

    const payload = {
      name: product.name,
      description: product.description,
      price: product.price,
      categoryId,
      images,
      quantity: product.quantity,
      condition: product.condition,
      tags: product.tags,
      currency: product.currency,
      location: product.location,
    };

    const res = await axios.post(`${API_BASE}/products/create`, payload, {
      timeout: 10000,
    });
    console.log(`✅ Created product: ${res.data.id} - ${product.name}`);
    return { product: product.name, status: 'success', data: res.data };
  } catch (err) {
    console.log(err);
    console.error(
      `❌ Failed to create product ${product.name}: ${err.message}`,
    );
    return { product: product.name, status: 'error', error: err.message };
  }
}

// ===== Main Runner with concurrency =====
(async () => {
  const results = [];
  let activeRequests = 0;
  let i = 0;

  async function processNext() {
    if (i >= PRODUCTS.length) return;
    const product = PRODUCTS[i++];
    activeRequests++;
    createProduct(product)
      .then((result) => {
        results.push(result);
      })
      .finally(() => {
        activeRequests--;
        processNext(); // Start next
      });
  }

  // Start initial concurrent workers
  for (let j = 0; j < CONCURRENCY_LIMIT && j < PRODUCTS.length; j++) {
    processNext();
  }

  // Wait until all are done
  while (results.length < PRODUCTS.length) {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n=== Upload Summary ===');
  results.forEach((r) => {
    console.log(
      `${r.product}: ${r.status}${r.status === 'error' ? ` - ${r.error}` : ''}`,
    );
  });
})();
