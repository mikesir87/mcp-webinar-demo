const { Client } = require("pg");

const { getInventoryForProduct } = require("./InventoryService");
const { uploadFile, getFile } = require("./StorageService");
const { publishEvent } = require("./PublisherService");

let client;
async function getClient() {
  if (!client) {
    // Configured using environment variables
    client = new Client();
    await client.connect();
  }
  return client;
}

async function teardown() {
  if (client) {
    await client.end();
  }
}

async function getProducts() {
  const client = await getClient();

  const result = await client.query("SELECT * FROM products ORDER BY id ASC");

  return result.rows;
}

async function createProduct(product) {
  const client = await getClient();

  const existingProduct = await client.query(
    "SELECT * FROM products WHERE upc = $1",
    [product.upc],
  );

  if (existingProduct.rows.length > 0)
    throw new Error("Product with this UPC already exists");

  const result = await client.query(
    "INSERT INTO products (name, upc, price, description) VALUES ($1, $2, $3, $4) RETURNING id",
    [product.name, product.upc, product.price, product.description],
  );
  const newProductId = result.rows[0].id;

  publishEvent("products", {
    action: "product_created",
    id: newProductId,
    name: product.name,
    price: product.price,
    description: product.description,
  });

  return {
    ...product,
    id: newProductId,
  };
}

async function getProductById(id) {
  const client = await getClient();

  const result = await client.query("SELECT * FROM products WHERE id = $1", [
    id,
  ]);

  if (result.rows.length === 0) {
    return null;
  }

  const product = result.rows[0];

  const inventory = await getInventoryForProduct(product.upc);

  return {
    inventory,
    ...product,
  };
}

async function getProductImage(id) {
  return getFile(id);
}

async function uploadProductImage(id, buffer) {
  const client = await getClient();

  await uploadFile(id, buffer);
  await client.query("UPDATE products SET has_image=TRUE WHERE id=$1", [id]);
}

module.exports = {
  getProducts,
  createProduct,
  getProductById,
  getProductImage,
  uploadProductImage,
  teardown,
};
