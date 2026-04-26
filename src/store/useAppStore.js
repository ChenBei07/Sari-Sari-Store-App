import { create } from 'zustand'

const useAppStore = create((set, get) => ({
  // ── AUTH STATE ────────────────────────────────────
  user: null,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => set({ user: null, isAuthenticated: false }),

  // ── STORE INFO ────────────────────────────────────
  storeInfo: { store_name: 'My Sari-Sari Store', store_address: '' },
  setStoreInfo: (info) => set({ storeInfo: info }),

  // ── PRODUCTS ──────────────────────────────────────
  products: [],
  setProducts: (products) => set({ products }),

  // ── LOW STOCK ─────────────────────────────────────
  lowStockItems: [],
  setLowStockItems: (items) => set({ lowStockItems: items }),

  // ── CART (for New Sale screen) ────────────────────
  cart: [],

  addToCart: (product, quantity = 1) => {
    const cart = get().cart
    const existing = cart.find(i => i.product_id === product.id)

    if (existing) {
      set({
        cart: cart.map(i =>
          i.product_id === product.id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        )
      })
    } else {
      set({
        cart: [...cart, {
          product_id: product.id,
          name: product.name,
          selling_price: product.selling_price,
          buying_price: product.buying_price,
          quantity,
          total_amount: product.selling_price * quantity
        }]
      })
    }
  },

  updateCartItem: (product_id, quantity) => {
    const cart = get().cart
    if (quantity <= 0) {
      set({ cart: cart.filter(i => i.product_id !== product_id) })
    } else {
      set({
        cart: cart.map(i =>
          i.product_id === product_id
            ? { ...i, quantity, total_amount: i.selling_price * quantity }
            : i
        )
      })
    }
  },

  removeFromCart: (product_id) => {
    set({ cart: get().cart.filter(i => i.product_id !== product_id) })
  },

  clearCart: () => set({ cart: [] }),

  getCartTotal: () => {
    return get().cart.reduce((sum, i) => sum + i.total_amount, 0)
  },

  // ── DASHBOARD ─────────────────────────────────────
  dashboard: null,
  setDashboard: (data) => set({ dashboard: data }),
}))

export default useAppStore