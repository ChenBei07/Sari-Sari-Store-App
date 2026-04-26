import { getDb } from './database'
import bcrypt from 'bcryptjs'

// Random fallback for bcryptjs in React Native
bcrypt.setRandomFallback((len) => {
  const arr = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    arr[i] = Math.floor(Math.random() * 256)
  }
  return Array.from(arr)
})
// ── INIT TABLES ───────────────────────────────────────
export async function initAuth() {
  const db = await getDb()

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'staff',
      security_question TEXT NOT NULL,
      security_answer TEXT NOT NULL,
      is_locked INTEGER DEFAULT 0,
      manually_locked INTEGER DEFAULT 0,
      lock_start TEXT DEFAULT NULL,
      lock_end TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS store_info (
      id INTEGER PRIMARY KEY,
      store_name TEXT DEFAULT 'My Sari-Sari Store',
      store_address TEXT DEFAULT ''
    );
  `)

  // Default store info
  const store = await db.getFirstAsync('SELECT id FROM store_info WHERE id = 1')
  if (!store) {
    await db.runAsync(
      'INSERT INTO store_info (id, store_name, store_address) VALUES (1, ?, ?)',
      ['My Sari-Sari Store', '']
    )
  }
}

// ── HELPERS ───────────────────────────────────────────
export async function isFirstRun() {
  const db = await getDb()
  const row = await db.getFirstAsync('SELECT COUNT(*) as count FROM users')
  return row.count === 0
}

// ── ACCOUNT ───────────────────────────────────────────
export async function createAccount(data) {
  const db = await getDb()
  const existing = await db.getFirstAsync('SELECT id FROM users WHERE username = ?', [data.username])
  if (existing) throw new Error('Username already exists.')

  const password_hash = bcrypt.hashSync(data.password, 10)
  const security_answer = data.security_answer.trim().toLowerCase()

  await db.runAsync(
    `INSERT INTO users (full_name, username, password_hash, role, security_question, security_answer)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [data.full_name, data.username, password_hash, data.role || 'owner',
     data.security_question, security_answer]
  )
  return { success: true }
}

export async function login(username, password) {
  const db = await getDb()
  const user = await db.getFirstAsync('SELECT * FROM users WHERE username = ?', [username])
  if (!user) throw new Error('Username not found.')

  const valid = bcrypt.compareSync(password, user.password_hash)
  if (!valid) throw new Error('Incorrect password.')

  // Manual lock check
  if (user.is_locked === 1) {
    throw new Error('Your account has been locked by the owner. Please contact your store owner.')
  }

  // Schedule lock check
    if (user.role !== 'owner' && user.lock_start && user.lock_end) {
    // Use device local time (PHT = UTC+8)
    const now = new Date()
    const phOffset = 8 * 60 // minutes
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
    const currentTime = (utcMinutes + phOffset) % (24 * 60)

    const parsedStart = user.lock_start.split(':').map(Number)
    const parsedEnd = user.lock_end.split(':').map(Number)
    const startTotal = parsedStart[0] * 60 + parsedStart[1]
    const endTotal = parsedEnd[0] * 60 + parsedEnd[1]

    const withinSchedule = startTotal <= endTotal
      ? currentTime >= startTotal && currentTime <= endTotal
      : currentTime >= startTotal || currentTime <= endTotal

    if (!withinSchedule) {
      throw new Error(`Account is only active from ${user.lock_start} to ${user.lock_end}.`)
    }
  }

  return {
    id: user.id,
    full_name: user.full_name,
    username: user.username,
    role: user.role
  }
}

export async function getSecurityQuestion(username) {
  const db = await getDb()
  const user = await db.getFirstAsync('SELECT security_question FROM users WHERE username = ?', [username])
  if (!user) throw new Error('Username not found.')
  return user.security_question
}

export async function resetPassword(username, security_answer, new_password) {
  const db = await getDb()
  const user = await db.getFirstAsync('SELECT * FROM users WHERE username = ?', [username])
  if (!user) throw new Error('Username not found.')

  const match = security_answer.trim().toLowerCase() === user.security_answer
  if (!match) throw new Error('Security answer is incorrect.')

  const password_hash = bcrypt.hashSync(new_password, 10)
  await db.runAsync('UPDATE users SET password_hash = ? WHERE username = ?', [password_hash, username])
  return { success: true }
}

// ── STAFF MANAGEMENT ──────────────────────────────────
export async function getUsers() {
  const db = await getDb()
  return await db.getAllAsync(
    'SELECT id, full_name, username, role, is_locked, manually_locked, lock_start, lock_end, created_at FROM users ORDER BY created_at ASC'
  )
}

export async function addStaff(data) {
  return await createAccount({ ...data, role: 'staff' })
}

export async function deleteUser(id) {
  const db = await getDb()
  await db.runAsync('DELETE FROM users WHERE id = ?', [id])
  return { success: true }
}

export async function lockUser(id) {
  const db = await getDb()
  await db.runAsync('UPDATE users SET is_locked = 1, manually_locked = 1 WHERE id = ?', [id])
  return { success: true }
}

export async function unlockUser(id) {
  const db = await getDb()
  await db.runAsync('UPDATE users SET is_locked = 0, manually_locked = 0 WHERE id = ?', [id])
  return { success: true }
}

export async function setUserSchedule(id, lock_start, lock_end) {
  const db = await getDb()
  await db.runAsync('UPDATE users SET lock_start = ?, lock_end = ? WHERE id = ?', [lock_start, lock_end, id])
  return { success: true }
}

export async function clearUserSchedule(id) {
  const db = await getDb()
  await db.runAsync('UPDATE users SET lock_start = NULL, lock_end = NULL WHERE id = ?', [id])
  return { success: true }
}

// ── STORE INFO ────────────────────────────────────────
export async function getStoreInfo() {
  const db = await getDb()
  return await db.getFirstAsync('SELECT * FROM store_info WHERE id = 1')
}

export async function updateStoreInfo(store_name, store_address) {
  const db = await getDb()
  await db.runAsync('UPDATE store_info SET store_name = ?, store_address = ? WHERE id = 1', [store_name, store_address])
  return { success: true }
}

// ── SCHEDULE LOCK CHECKER ─────────────────────────────
export async function checkScheduleLocks() {
  const db = await getDb()
  const staff = await db.getAllAsync(`
    SELECT * FROM users
    WHERE role = 'staff'
    AND lock_start IS NOT NULL
    AND lock_end IS NOT NULL
    AND manually_locked = 0
  `)

  const now = new Date()
  const phOffset = 8 * 60
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  const currentTime = (utcMinutes + phOffset) % (24 * 60)

  for (const user of staff) {
    const [startH, startM] = user.lock_start.split(':').map(Number)
    const [endH, endM] = user.lock_end.split(':').map(Number)
    const startTotal = startH * 60 + startM
    const endTotal = endH * 60 + endM

    const withinSchedule = startTotal <= endTotal
      ? currentTime >= startTotal && currentTime <= endTotal
      : currentTime >= startTotal || currentTime <= endTotal

    const shouldBeLocked = withinSchedule ? 0 : 1
    await db.runAsync('UPDATE users SET is_locked = ? WHERE id = ?', [shouldBeLocked, user.id])
  }
}