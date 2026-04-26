import * as SQLite from 'expo-sqlite'

let db = null

export async function getDb() {
  if (!db) {
    db = await SQLite.openDatabaseAsync('sari-sales.db')
  }
  // Re-open if connection was lost
  try {
    await db.getFirstAsync('SELECT 1')
  } catch (e) {
    db = await SQLite.openDatabaseAsync('sari-sales.db')
  }
  return db
}

// ── INIT TABLES ───────────────────────────────────────
export async function initDatabase() {
  const db = await getDb()

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'General',
      buying_price REAL NOT NULL,
      selling_price REAL NOT NULL,
      stock INTEGER DEFAULT 0,
      low_stock_alert INTEGER DEFAULT 5,
      barcode TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      product_name TEXT,
      quantity INTEGER NOT NULL,
      buying_price REAL NOT NULL,
      selling_price REAL NOT NULL,
      total_amount REAL NOT NULL,
      profit REAL NOT NULL,
      payment_method TEXT DEFAULT 'Cash',
      status TEXT DEFAULT 'completed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_ref TEXT NOT NULL,
      store_name TEXT,
      store_address TEXT,
      cashier TEXT,
      items TEXT NOT NULL,
      grand_total REAL NOT NULL,
      payment_method TEXT,
      cash_received REAL,
      change_amount REAL,
      reference_no TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)
}

// ── PRODUCTS ──────────────────────────────────────────
export async function getProducts() {
  const db = await getDb()
  return await db.getAllAsync('SELECT * FROM products ORDER BY name ASC')
}

export async function addProduct(product) {
  const db = await getDb()
  if (!product.barcode) {
    product.barcode = 'SS' + Date.now() + Math.floor(Math.random() * 1000)
  }
  const result = await db.runAsync(
    `INSERT INTO products (name, category, buying_price, selling_price, stock, low_stock_alert, barcode)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [product.name, product.category, product.buying_price, product.selling_price,
     product.stock, product.low_stock_alert, product.barcode]
  )
  return { id: result.lastInsertRowId, ...product }
}

export async function updateProduct(product) {
  const db = await getDb()
  await db.runAsync(
    `UPDATE products SET name=?, category=?, buying_price=?, selling_price=?,
     stock=?, low_stock_alert=?, barcode=? WHERE id=?`,
    [product.name, product.category, product.buying_price, product.selling_price,
     product.stock, product.low_stock_alert, product.barcode, product.id]
  )
  return product
}

export async function deleteProduct(id) {
  const db = await getDb()
  await db.runAsync('DELETE FROM products WHERE id = ?', [id])
  return { success: true }
}

export async function getProductByBarcode(barcode) {
  const db = await getDb()
  return await db.getFirstAsync('SELECT * FROM products WHERE barcode = ?', [barcode])
}

// ── SALES ─────────────────────────────────────────────
export async function recordSale(sale) {
  const db = await getDb()
  const product = await db.getFirstAsync('SELECT * FROM products WHERE id = ?', [sale.product_id])
  if (!product) throw new Error('Product not found')
  if (product.stock < sale.quantity) throw new Error('Not enough stock')

  const total_amount = product.selling_price * sale.quantity
  const profit = (product.selling_price - product.buying_price) * sale.quantity

  await db.runAsync(
    `INSERT INTO sales (product_id, product_name, quantity, buying_price, selling_price, total_amount, profit, payment_method)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [product.id, product.name, sale.quantity, product.buying_price,
     product.selling_price, total_amount, profit, sale.payment_method]
  )
  await db.runAsync('UPDATE products SET stock = stock - ? WHERE id = ?', [sale.quantity, product.id])

  return { success: true, total_amount, profit }
}

export async function recordMultiSale(items, payment_method) {
  const db = await getDb()

  for (const item of items) {
    const product = await db.getFirstAsync('SELECT * FROM products WHERE id = ?', [item.product_id])
    if (!product) throw new Error(`Product not found: ${item.name}`)
    if (product.stock < item.quantity) throw new Error(`Not enough stock for ${product.name}`)

    const total_amount = product.selling_price * item.quantity
    const profit = (product.selling_price - product.buying_price) * item.quantity

    await db.runAsync(
      `INSERT INTO sales (product_id, product_name, quantity, buying_price, selling_price, total_amount, profit, payment_method)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [product.id, product.name, item.quantity, product.buying_price,
       product.selling_price, total_amount, profit, payment_method]
    )
    await db.runAsync('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, product.id])
  }

  return { success: true }
}

export async function getSales(filters = {}) {
  const db = await getDb()
  let query = `SELECT * FROM sales WHERE status = 'completed'`
  const params = []

  if (filters.date_from) {
    query += ` AND DATE(created_at) >= DATE(?)`
    params.push(filters.date_from)
  }
  if (filters.date_to) {
    query += ` AND DATE(created_at) <= DATE(?)`
    params.push(filters.date_to)
  }
  if (filters.payment_method && filters.payment_method !== 'All') {
    query += ` AND payment_method = ?`
    params.push(filters.payment_method)
  }

  query += ` ORDER BY created_at DESC`
  return await db.getAllAsync(query, params)
}

export async function voidSale(id) {
  const db = await getDb()
  const sale = await db.getFirstAsync('SELECT * FROM sales WHERE id = ?', [id])
  if (!sale) throw new Error('Sale not found')

  await db.runAsync(`UPDATE sales SET status = 'void' WHERE id = ?`, [id])
  await db.runAsync('UPDATE products SET stock = stock + ? WHERE id = ?', [sale.quantity, sale.product_id])
  return { success: true }
}

// ── DASHBOARD ─────────────────────────────────────────
export async function getDashboard() {
  const db = await getDb()
  const today = new Date().toISOString().split('T')[0]

  const todaySales = await db.getFirstAsync(`
    SELECT
      COUNT(*) as total_transactions,
      COALESCE(SUM(total_amount), 0) as total_sales,
      COALESCE(SUM(profit), 0) as total_profit
    FROM sales
    WHERE DATE(created_at) = DATE(?) AND status = 'completed'
  `, [today])

  const weeklySales = await db.getFirstAsync(`
    SELECT
      COALESCE(SUM(total_amount), 0) as total_sales,
      COALESCE(SUM(profit), 0) as total_profit
    FROM sales
    WHERE DATE(created_at) >= DATE(?, '-7 days') AND status = 'completed'
  `, [today])

  const monthlySales = await db.getFirstAsync(`
    SELECT
      COALESCE(SUM(total_amount), 0) as total_sales,
      COALESCE(SUM(profit), 0) as total_profit
    FROM sales
    WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', ?) AND status = 'completed'
  `, [today])

  const topProducts = await db.getAllAsync(`
    SELECT
      product_name,
      SUM(quantity) as total_qty,
      SUM(total_amount) as total_revenue,
      SUM(profit) as total_profit
    FROM sales
    WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', ?) AND status = 'completed'
    GROUP BY product_name
    ORDER BY total_revenue DESC
    LIMIT 5
  `, [today])

  const paymentBreakdown = await db.getAllAsync(`
    SELECT
      payment_method,
      COUNT(*) as count,
      COALESCE(SUM(total_amount), 0) as total
    FROM sales
    WHERE DATE(created_at) = DATE(?) AND status = 'completed'
    GROUP BY payment_method
  `, [today])

  return { todaySales, weeklySales, monthlySales, topProducts, paymentBreakdown }
}

export async function getLowStock() {
  const db = await getDb()
  return await db.getAllAsync(`
    SELECT * FROM products
    WHERE stock <= low_stock_alert
    ORDER BY stock ASC
  `)
}

// ── RECEIPTS ──────────────────────────────────────────
export async function saveReceipt(receipt) {
  const db = await getDb()
  const result = await db.runAsync(
    `INSERT INTO receipts (receipt_ref, store_name, store_address, cashier, items, grand_total, payment_method, cash_received, change_amount, reference_no)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      receipt.receipt_ref,
      receipt.store_name,
      receipt.store_address,
      receipt.cashier,
      JSON.stringify(receipt.items),
      receipt.grand_total,
      receipt.payment_method,
      receipt.cash_received || null,
      receipt.change_amount || null,
      receipt.reference_no || null
    ]
  )
  return { id: result.lastInsertRowId }
}

export async function getReceipts() {
  const db = await getDb()
  return await db.getAllAsync('SELECT * FROM receipts ORDER BY created_at DESC')
}

export async function getReceiptByRef(receipt_ref) {
  const db = await getDb()
  return await db.getFirstAsync('SELECT * FROM receipts WHERE receipt_ref = ?', [receipt_ref])
}

export async function deleteReceipt(id) {
  const db = await getDb()
  await db.runAsync('DELETE FROM receipts WHERE id = ?', [id])
  return { success: true }
}