/* ==========================================================================
   KK FASHION — CORE APPLICATION LOGIC
   Cart, wishlist, recently viewed, dark mode, notifications, search, toasts.
   All state persists in LocalStorage so it carries across pages.
   ========================================================================== */

const KK_KEYS = {
  cart: "kk_cart",
  wishlist: "kk_wishlist",
  recentlyViewed: "kk_recently_viewed",
  darkMode: "kk_dark_mode",
  notifications: "kk_notifications",
  preferences: "kk_style_preferences",
  addresses: "kk_addresses",
};

/* ---------------- Storage helpers ---------------- */
function kkLoad(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}
function kkSave(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* ---------------- Toast notifications ---------------- */
function kkToast(message) {
  let container = document.getElementById("kk-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "kk-toast-container";
    container.className = "kk-toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = "kk-toast";
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 2400);
}

/* ---------------- Cart ---------------- */
function kkGetCart() {
  return kkLoad(KK_KEYS.cart, []);
}
function kkSaveCart(cart) {
  kkSave(KK_KEYS.cart, cart);
  kkUpdateHeaderCounts();
}
function kkAddToCart(productId, size, color, qty = 1) {
  const cart = kkGetCart();
  const existing = cart.find(i => i.id === productId && i.size === size && i.color === color);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ id: productId, size, color, qty });
  }
  kkSaveCart(cart);
  kkToast("Added to cart");
  kkRenderCartDrawer();
}
function kkRemoveFromCart(index) {
  const cart = kkGetCart();
  cart.splice(index, 1);
  kkSaveCart(cart);
  kkRenderCartDrawer();
}
function kkChangeCartQty(index, delta) {
  const cart = kkGetCart();
  if (!cart[index]) return;
  cart[index].qty += delta;
  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
  }
  kkSaveCart(cart);
  kkRenderCartDrawer();
}
function kkCartTotals() {
  const cart = kkGetCart();
  let subtotal = 0, originalTotal = 0;
  cart.forEach(item => {
    const p = kkGetProductById(item.id);
    if (!p) return;
    subtotal += p.price * item.qty;
    originalTotal += p.originalPrice * item.qty;
  });
  const discount = originalTotal - subtotal;
  const total = subtotal;
  return { subtotal, discount, total, count: cart.reduce((n, i) => n + i.qty, 0) };
}

/* ---------------- Wishlist ---------------- */
function kkGetWishlist() {
  return kkLoad(KK_KEYS.wishlist, []);
}
function kkIsWishlisted(productId) {
  return kkGetWishlist().includes(productId);
}
function kkToggleWishlist(productId) {
  let list = kkGetWishlist();
  if (list.includes(productId)) {
    list = list.filter(id => id !== productId);
    kkToast("Removed from wishlist");
  } else {
    list.push(productId);
    kkToast("Added to wishlist");
  }
  kkSave(KK_KEYS.wishlist, list);
  kkUpdateHeaderCounts();
  document.querySelectorAll(`[data-wishlist-id="${productId}"]`).forEach(btn => {
    btn.classList.toggle("active", list.includes(productId));
  });
}

/* ---------------- Recently viewed ---------------- */
function kkAddRecentlyViewed(productId) {
  let list = kkLoad(KK_KEYS.recentlyViewed, []);
  list = list.filter(id => id !== productId);
  list.unshift(productId);
  list = list.slice(0, 10);
  kkSave(KK_KEYS.recentlyViewed, list);
}
function kkGetRecentlyViewed() {
  return kkLoad(KK_KEYS.recentlyViewed, []).map(id => kkGetProductById(id)).filter(Boolean);
}

/* ---------------- Dark mode ---------------- */
function kkApplyDarkMode() {
  const isDark = kkLoad(KK_KEYS.darkMode, false);
  document.documentElement.classList.toggle("dark", isDark);
  document.querySelectorAll(".dark-mode-toggle").forEach(el => {
    if (el.type === "checkbox") el.checked = isDark;
  });
}
function kkToggleDarkMode(checked) {
  kkSave(KK_KEYS.darkMode, checked);
  kkApplyDarkMode();
}

/* ---------------- Notifications ---------------- */
const KK_DEFAULT_NOTIFICATIONS = [
  { id: 1, text: "Your order #KK10234 has been shipped.", time: "2 hours ago", read: false },
  { id: 2, text: "New collection is now available — explore Autumn Edit.", time: "1 day ago", read: false },
  { id: 3, text: "You earned 100 KK Rewards points on your last order.", time: "3 days ago", read: false },
  { id: 4, text: "Flat 30% off on selected styles, this weekend only.", time: "5 days ago", read: true },
];
function kkGetNotifications() {
  return kkLoad(KK_KEYS.notifications, KK_DEFAULT_NOTIFICATIONS);
}
function kkMarkNotificationRead(id) {
  const list = kkGetNotifications();
  const n = list.find(x => x.id === id);
  if (n) n.read = true;
  kkSave(KK_KEYS.notifications, list);
}
function kkUnreadNotificationCount() {
  return kkGetNotifications().filter(n => !n.read).length;
}

/* ---------------- Header counts (cart / wishlist badges) ---------------- */
function kkUpdateHeaderCounts() {
  const cartCount = kkCartTotals().count;
  const wishCount = kkGetWishlist().length;
  document.querySelectorAll(".cart-count").forEach(el => {
    el.textContent = cartCount;
    el.style.display = cartCount > 0 ? "flex" : "none";
  });
  document.querySelectorAll(".wishlist-count").forEach(el => {
    el.textContent = wishCount;
    el.style.display = wishCount > 0 ? "flex" : "none";
  });
}

/* ---------------- Cart drawer ---------------- */
function kkRenderCartDrawer() {
  const body = document.getElementById("cart-drawer-body");
  const footer = document.getElementById("cart-drawer-footer");
  if (!body) return;
  const cart = kkGetCart();
  if (cart.length === 0) {
    body.innerHTML = `<div class="cart-empty">
      <p>Your bag is empty.</p>
      <a href="products.html" class="btn btn-primary">Start Shopping</a>
    </div>`;
    if (footer) footer.style.display = "none";
    return;
  }
  if (footer) footer.style.display = "block";
  body.innerHTML = cart.map((item, index) => {
    const p = kkGetProductById(item.id);
    if (!p) return "";
    return `
    <div class="cart-item">
      <img src="${p.image}" alt="${p.name}" loading="lazy" decoding="async" width="900" height="1150" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=900&h=1150&q=80';">
      <div class="cart-item-info">
        <p class="cart-item-name">${p.name}</p>
        <p class="cart-item-meta">Size: ${item.size} &middot; Color: ${item.color}</p>
        <p class="cart-item-price">${kkFormatPrice(p.price)}</p>
        <div class="qty-control">
          <button aria-label="Decrease quantity" onclick="kkChangeCartQty(${index}, -1)">&minus;</button>
          <span>${item.qty}</span>
          <button aria-label="Increase quantity" onclick="kkChangeCartQty(${index}, 1)">&plus;</button>
        </div>
      </div>
      <button class="cart-item-remove" aria-label="Remove item" onclick="kkRemoveFromCart(${index})">&times;</button>
    </div>`;
  }).join("");

  const totals = kkCartTotals();
  if (footer) {
    footer.innerHTML = `
      <div class="cart-summary-row"><span>Subtotal</span><span>${kkFormatPrice(totals.subtotal)}</span></div>
      <div class="cart-summary-row discount"><span>You Save</span><span>&minus;${kkFormatPrice(totals.discount)}</span></div>
      <div class="cart-summary-row total"><span>Total</span><span>${kkFormatPrice(totals.total)}</span></div>
      <button class="btn btn-primary btn-block" onclick="kkCheckout()">Checkout</button>
    `;
  }
}
function kkOpenCartDrawer() {
  const drawer = document.getElementById("cart-drawer");
  const overlay = document.getElementById("drawer-overlay");
  if (!drawer) return;
  kkRenderCartDrawer();
  drawer.classList.add("open");
  overlay.classList.add("open");
  document.body.classList.add("no-scroll");
}
function kkCloseDrawers() {
  document.querySelectorAll(".drawer").forEach(d => d.classList.remove("open"));
  const overlay = document.getElementById("drawer-overlay");
  if (overlay) overlay.classList.remove("open");
  document.body.classList.remove("no-scroll");
}
function kkCheckout() {
  const totals = kkCartTotals();
  if (totals.count === 0) return;
  kkToast(`Order placed successfully — ${kkFormatPrice(totals.total)} total`);
  kkSave(KK_KEYS.cart, []);
  kkUpdateHeaderCounts();
  kkRenderCartDrawer();
  setTimeout(() => { window.location.href = "orders.html"; }, 900);
}

/* ---------------- Search ---------------- */
function kkSearchProducts(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return KK_PRODUCTS.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q) ||
    p.subCategory.toLowerCase().includes(q)
  );
}
function kkWireSearchInput(inputEl) {
  if (!inputEl) return;
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && inputEl.value.trim()) {
      window.location.href = `products.html?search=${encodeURIComponent(inputEl.value.trim())}`;
    }
  });
}

/* ---------------- Product card renderer (shared across pages) ---------------- */
function kkProductCardHTML(p) {
  const wished = kkIsWishlisted(p.id) ? "active" : "";
  const badge = p.isNew ? '<span class="badge badge-new">New</span>' : (p.isTrending ? '<span class="badge badge-trend">Trending</span>' : "");
  const productUrl = `product.html?id=${p.id}`;
  return `
  <article class="product-card product-card-clickable" role="link" tabindex="0" data-product-url="${productUrl}" aria-label="View ${p.name}">
    <div class="product-card-media">
      ${badge}
      <img src="${p.image}" alt="${p.name}" loading="lazy" decoding="async" width="900" height="1150" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=900&h=1150&q=80';">
      <button class="wishlist-btn ${wished}" data-wishlist-id="${p.id}" aria-label="Toggle wishlist" onclick="event.stopPropagation(); kkToggleWishlist(${p.id})">
        <svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 21s-7.5-4.6-10.2-9.2C.2 8.7 1.6 5 5.2 5c2 0 3.4 1 4.8 2.7C11.4 6 12.8 5 14.8 5c3.6 0 5 3.7 3.4 6.8C19.5 16.4 12 21 12 21z" fill="currentColor"/></svg>
      </button>
    </div>
    <div class="product-card-body">
      <div class="product-card-name">${p.name}</div>
      <p class="product-card-description">${p.description}</p>
      <div class="product-card-meta">
        <p class="product-card-rating">★ ${p.rating} <span>(${p.reviews})</span></p>
        <p class="product-card-price">
          <span class="price-current">${kkFormatPrice(p.price)}</span>
          <span class="price-original">${kkFormatPrice(p.originalPrice)}</span>
          <span class="price-discount">${p.discount}% off</span>
        </p>
      </div>
    </div>
  </article>`;
}

/* ---------------- Global init ---------------- */
document.addEventListener("click", (e) => {
  const card = e.target.closest(".product-card-clickable");
  if (!card || e.target.closest("button, a, input, select, textarea")) return;
  window.location.href = card.dataset.productUrl;
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const card = e.target.closest(".product-card-clickable");
  if (!card) return;
  e.preventDefault();
  window.location.href = card.dataset.productUrl;
});

document.addEventListener("DOMContentLoaded", () => {
  kkApplyDarkMode();
  kkUpdateHeaderCounts();

  const overlay = document.getElementById("drawer-overlay");
  if (overlay) overlay.addEventListener("click", kkCloseDrawers);

  document.querySelectorAll(".open-cart-btn").forEach(btn => btn.addEventListener("click", kkOpenCartDrawer));
  document.querySelectorAll(".close-drawer-btn").forEach(btn => btn.addEventListener("click", kkCloseDrawers));

  document.querySelectorAll(".header-search-input, .search-input").forEach(kkWireSearchInput);

  document.querySelectorAll(".dark-mode-toggle").forEach(toggle => {
    toggle.addEventListener("change", (e) => kkToggleDarkMode(e.target.checked));
  });
});
