const API_URL = 'products.json';
const CART_KEY = 'tinJewelryCart';
const USER_KEY = 'tinJewelryUsers';
const CURRENT_USER_KEY = 'tinJewelryCurrentUser';
const INVENTORY_KEY = 'tinJewelryInventory';
const MESSAGES_KEY = 'tinJewelryMessages';

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initPageScripts();
});

async function fetchProducts() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('Không thể tải sản phẩm');
    const products = await response.json();

    let inventory = getInventory();
    if (!inventory || Object.keys(inventory).length === 0) {
      inventory = {};
      products.forEach((product) => {
        inventory[product.id] = product.stock ?? 0;
      });
      saveInventory(inventory);
    }

    return products.map((product) => ({
      ...product,
      stock: inventory[product.id] ?? product.stock ?? 0
    }));
  } catch (error) {
    console.error(error);
    return [];
  }
}

function formatPrice(value) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

function isNewProduct(dateAdded) {
  const DAY_IN_MS = 7 * 24 * 60 * 60 * 1000;
  const productDate = new Date(dateAdded);
  const now = new Date();
  return now - productDate <= DAY_IN_MS;
}

function getProductSaleInfo(product) {
  if (!product || !product.sale || !product.sale.active) return null;
  const sale = product.sale;
  if (typeof sale.value !== 'number' || sale.value <= 0) return null;

  if (sale.type === 'fixed') {
    return {
      price: Math.max(0, product.price - sale.value),
      label: sale.label || `Giảm ${formatPrice(sale.value)}`
    };
  }

  if (sale.type === 'percent') {
    const discountedPrice = Math.max(0, Math.round(product.price * (100 - sale.value) / 100));
    return {
      price: discountedPrice,
      label: sale.label || `Giảm ${sale.value}%`
    };
  }

  return null;
}

function getProductEffectivePrice(product) {
  const saleInfo = getProductSaleInfo(product);
  return saleInfo ? saleInfo.price : product.price;
}

function calculateCartTotals(cart, products) {
  const subtotal = cart.reduce((sum, item) => {
    const product = products.find((productItem) => productItem.id === item.id);
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);

  const total = cart.reduce((sum, item) => {
    const product = products.find((productItem) => productItem.id === item.id);
    return sum + (product ? getProductEffectivePrice(product) * item.quantity : 0);
  }, 0);

  return {
    subtotal,
    discount: Math.max(0, subtotal - total),
    total
  };
}

function getCart() {
  const cartData = localStorage.getItem(CART_KEY);
  return cartData ? JSON.parse(cartData) : [];
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}

function getOrders() {
  const ordersData = localStorage.getItem('tinJewelryOrders');
  return ordersData ? JSON.parse(ordersData) : [];
}

function saveOrders(orders) {
  localStorage.setItem('tinJewelryOrders', JSON.stringify(orders));
}

function getInventory() {
  const inventoryData = localStorage.getItem(INVENTORY_KEY);
  return inventoryData ? JSON.parse(inventoryData) : {};
}

function saveInventory(inventory) {
  localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory));
}

function getManagerMessages() {
  const messagesData = localStorage.getItem(MESSAGES_KEY);
  return messagesData ? JSON.parse(messagesData) : [];
}

function saveManagerMessages(messages) {
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
}

function getAvailableStock(productId) {
  const inventory = getInventory();
  return inventory[productId] ?? 0;
}

function getUsers() {
  const usersData = localStorage.getItem(USER_KEY);
  return usersData ? JSON.parse(usersData) : [];
}

function saveUsers(users) {
  localStorage.setItem(USER_KEY, JSON.stringify(users));
}

function getCurrentUser() {
  const currentUserData = localStorage.getItem(CURRENT_USER_KEY);
  return currentUserData ? JSON.parse(currentUserData) : null;
}

function saveCurrentUser(user) {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

function clearCurrentUser() {
  localStorage.removeItem(CURRENT_USER_KEY);
}

function getUserInitials(name) {
  if (!name) return '';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function updateAuthHeader() {
  const user = getCurrentUser();
  const authWrappers = document.querySelectorAll('.header-auth-buttons');
  authWrappers.forEach((wrapper) => {
    if (!wrapper) return;
    if (user) {
      wrapper.innerHTML = `
        <a href="user.html" class="header-user-badge">
          <span class="header-user-avatar">${getUserInitials(user.name)}</span>
          <span>${user.name.split(' ')[0]}</span>
        </a>
      `;
    } else {
      wrapper.innerHTML = `
        <a href="contact.html?view=login" class="header-auth-btn">Đăng nhập</a>
        <a href="contact.html?view=register" class="header-auth-btn">Đăng ký</a>
      `;
    }
  });
}

function updateCartCount() {
  const countElement = document.getElementById('cart-count');
  if (!countElement) return;
  const cart = getCart();
  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  countElement.textContent = totalQuantity;
}

function initHeader() {
  const cartAnchor = document.querySelector('.cart');
  if (cartAnchor && !document.getElementById('cart-count')) {
    const badge = document.createElement('span');
    badge.className = 'cart-count';
    badge.id = 'cart-count';
    badge.textContent = '0';
    cartAnchor.appendChild(badge);
  }
  updateCartCount();
  updateAuthHeader();
  initHeaderSearch();
}

function initHeaderSearch() {
  const searchInput = document.querySelector('.search-wrapper input');
  if (!searchInput) return;
  const searchIcon = document.querySelector('.search-wrapper .search-icon');

  function submitSearch() {
    const query = searchInput.value.trim();
    if (!query) return;
    window.location.href = `products.html?search=${encodeURIComponent(query)}`;
  }

  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      submitSearch();
    }
  });

  if (searchIcon) {
    searchIcon.addEventListener('click', submitSearch);
  }
}

function initPageScripts() {
  const body = document.body;
  if (body.classList.contains('home-page')) {
    initHomePage();
  }
  if (body.classList.contains('products-page')) {
    initProductsPage();
  }
  if (body.classList.contains('detail-page')) {
    initDetailPage();
  }
  if (body.classList.contains('cart-page')) {
    initCartPage();
  }
  if (body.classList.contains('contact-page')) {
    initContactPage();
  }
  if (body.classList.contains('user-page')) {
    initUserPage();
  }
}

async function initHomePage() {
  const latestContainer = document.querySelector('.latest-products');
  if (!latestContainer) return;
  const products = await fetchProducts();
  const latestProducts = products
    .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
    .slice(0, 8);
  latestContainer.innerHTML = latestProducts.map(productCardTemplate).join('');
  latestContainer.querySelectorAll('.add-to-cart-btn').forEach((button) => {
    button.addEventListener('click', handleAddToCartButton);
  });
}

function productCardTemplate(product) {
  const saleInfo = getProductSaleInfo(product);
  const saleBadge = saleInfo ? `<span class="product-badge sale-badge">${saleInfo.label}</span>` : '';
  const priceHtml = saleInfo
    ? `<p class="product-price sale-price">${formatPrice(saleInfo.price)}</p><p class="original-price">${formatPrice(product.price)}</p>`
    : `<p class="product-price">${formatPrice(product.price)}</p>`;
  const newBadge = isNewProduct(product.dateAdded) ? '<span class="product-badge new-badge">New</span>' : '';
  const outOfStock = product.stock <= 0;
  const stockInfo = outOfStock
    ? '<p class="product-stock out-of-stock">Hết hàng</p>'
    : `<p class="product-stock">Kho còn: ${product.stock}</p>`;
  return `
    <article class="product-card product">
      <div class="product-image">
        ${newBadge}
        ${saleBadge}
        <a href="detail.html?id=${product.id}" class="product-link">
          <img src="${product.image}" alt="${product.name}">
        </a>
      </div>
      <div class="product-content">
        <div class="product-meta">
          <h3>${product.name}</h3>
          ${priceHtml}
          ${stockInfo}
        </div>
        <div class="product-actions">
          <a href="detail.html?id=${product.id}" class="detail-link">Xem chi tiết</a>
          <button class="add-to-cart-btn" data-product-id="${product.id}" ${outOfStock ? 'disabled' : ''}>
            ${outOfStock ? 'Hết hàng' : 'Thêm vào giỏ'}
          </button>
        </div>
      </div>
    </article>
  `;
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function getRandomRelatedProducts(products, currentProductId, count = 3) {
  const availableProducts = products.filter((item) => item.id !== currentProductId);
  if (availableProducts.length <= count) {
    return availableProducts;
  }
  return shuffleArray([...availableProducts]).slice(0, count);
}

function relatedProductTemplate(product) {
  const saleInfo = getProductSaleInfo(product);
  const priceHtml = saleInfo
    ? `<p class="related-price"><span class="sale-price">${formatPrice(saleInfo.price)}</span> <span class="original-price">${formatPrice(product.price)}</span></p>`
    : `<p class="related-price">${formatPrice(product.price)}</p>`;
  return `
    <a href="detail.html?id=${product.id}" class="related-product">
      <img src="${product.image}" alt="${product.name}">
      <h3>${product.name}</h3>
      ${priceHtml}
    </a>
  `;
}

function renderRelatedProducts(products, currentProductId) {
  const relatedGrid = document.getElementById('related-products-grid');
  if (!relatedGrid) return;
  const relatedProducts = getRandomRelatedProducts(products, currentProductId, 3);
  if (relatedProducts.length === 0) {
    relatedGrid.innerHTML = '<p>Không có sản phẩm liên quan.</p>';
    return;
  }
  relatedGrid.innerHTML = relatedProducts.map(relatedProductTemplate).join('');
}

function handleAddToCartButton(event) {
  const id = Number(event.currentTarget.dataset.productId);
  if (addProductToCart(id, 1)) {
    event.currentTarget.textContent = 'Đã thêm';
    event.currentTarget.disabled = true;
  }
}

async function initProductsPage() {
  const products = await fetchProducts();
  const categorySelect = document.getElementById('category-filter');
  const priceRangeSelect = document.getElementById('price-range');
  const searchInput = document.getElementById('product-search');
  const gridBtn = document.querySelector('.grid-btn');
  const listBtn = document.querySelector('.list-btn');
  const productSection = document.querySelector('.products-grid');
  const controlsDiv = document.querySelector('.controls');
  const urlParams = new URLSearchParams(window.location.search);
  const initialSearch = urlParams.get('search')?.trim() || '';
  const headerSearchInput = document.querySelector('.search-wrapper input');

  if (searchInput && initialSearch) {
    searchInput.value = initialSearch;
  }
  if (headerSearchInput && initialSearch) {
    headerSearchInput.value = initialSearch;
  }

  if (!productSection) return;
  fillCategoryOptions(products, categorySelect);

  function getPriceRange(rangeValue) {
    const ranges = {
      'all': { min: 0, max: Number.MAX_SAFE_INTEGER },
      '5-10': { min: 5000000, max: 10000000 },
      '10-30': { min: 10000000, max: 30000000 },
      '30+': { min: 30000000, max: Number.MAX_SAFE_INTEGER }
    };
    return ranges[rangeValue] || ranges['all'];
  }

  function updateFilterVisuals() {
    const categoryIsActive = categorySelect.value !== 'all';
    const priceIsActive = priceRangeSelect.value !== 'all';
    const searchIsActive = searchInput.value.trim() !== '';
    
    if (categoryIsActive || priceIsActive || searchIsActive) {
      controlsDiv.classList.add('filters-active');
    } else {
      controlsDiv.classList.remove('filters-active');
    }
  }

  function render() {
    const categoryValue = categorySelect.value;
    const priceRange = getPriceRange(priceRangeSelect.value);
    const searchValue = searchInput.value.trim().toLowerCase();
    const filteredProducts = products.filter((product) => {
      const nameMatch = product.name.toLowerCase().includes(searchValue);
      const categoryMatch = categoryValue === 'all' || product.category === categoryValue;
      const priceMatch = product.price >= priceRange.min && product.price <= priceRange.max;
      return nameMatch && categoryMatch && priceMatch;
    });
    productSection.innerHTML = filteredProducts.map(productCardTemplate).join('');
    productSection.querySelectorAll('.add-to-cart-btn').forEach((button) => {
      button.addEventListener('click', handleAddToCartButton);
    });
    updateFilterVisuals();
  }

  categorySelect.addEventListener('change', render);
  priceRangeSelect.addEventListener('change', render);
  searchInput.addEventListener('input', render);

  gridBtn.addEventListener('click', () => {
    productSection.classList.remove('list');
    gridBtn.classList.add('active');
    listBtn.classList.remove('active');
  });

  listBtn.addEventListener('click', () => {
    productSection.classList.add('list');
    listBtn.classList.add('active');
    gridBtn.classList.remove('active');
  });

  render();
}

function fillCategoryOptions(products, selectElement) {
  if (!selectElement) return;
  const categories = Array.from(new Set(products.map((product) => product.category)));
  selectElement.innerHTML = '<option value="all">Tất cả danh mục</option>' +
    categories.map((category) => `<option value="${category}">${category}</option>`).join('');
}

async function initDetailPage() {
  const params = new URLSearchParams(window.location.search);
  const productId = Number(params.get('id'));
  const detailName = document.getElementById('detail-name');
  const detailPrice = document.getElementById('detail-price');
  const detailDescription = document.getElementById('detail-description');
  const detailSpecs = document.getElementById('detail-specs');
  const detailImage = document.getElementById('detail-main-image');
  const thumbnails = document.getElementById('detail-thumbnails');
  const quantityInput = document.getElementById('detail-quantity');
  const addToCartBtn = document.getElementById('detail-add-to-cart');
  const tabDesc = document.getElementById('tab-desc');

  const products = await fetchProducts();
  const product = products.find((item) => item.id === productId) || products[0];

  if (!product) {
    detailName.textContent = 'Sản phẩm không tồn tại';
    return;
  }

  detailName.textContent = product.name;
  const saleInfo = getProductSaleInfo(product);
  if (saleInfo) {
    detailPrice.innerHTML = `
      <span class="sale-price">${formatPrice(saleInfo.price)}</span>
      <span class="original-price">${formatPrice(product.price)}</span>
    `;
  } else {
    detailPrice.textContent = formatPrice(product.price);
  }
  const stockText = product.stock > 0 ? `Kho còn: ${product.stock}` : 'Hết hàng';
  const detailStock = document.getElementById('detail-stock');
  if (detailStock) detailStock.textContent = stockText;
  detailDescription.textContent = product.description;
  detailSpecs.innerHTML = product.specs.map((spec) => `<li>${spec}</li>`).join('');
  detailImage.src = product.image;
  detailImage.alt = product.name;
  thumbnails.innerHTML = product.images.map((src, index) => `
      <img class="thumb" src="${src}" alt="${product.name} ${index + 1}" data-src="${src}">
    `).join('');

  thumbnails.querySelectorAll('.thumb').forEach((thumb) => {
    thumb.addEventListener('click', () => {
      detailImage.src = thumb.dataset.src;
    });
  });

  quantityInput.max = product.stock;
  if (product.stock === 0) {
    addToCartBtn.disabled = true;
    addToCartBtn.textContent = 'Hết hàng';
    quantityInput.value = 0;
  }

  addToCartBtn.addEventListener('click', () => {
    const quantity = Math.max(1, Math.min(Number(quantityInput.value) || 1, product.stock));
    if (addProductToCart(product.id, quantity)) {
      addToCartBtn.textContent = 'Đã thêm vào giỏ';
    }
  });

  renderRelatedProducts(products, product.id);
}

function addProductToCart(productId, quantity) {
  const stock = getAvailableStock(productId);
  const cart = getCart();
  const existingItem = cart.find((item) => item.id === productId);
  const currentQuantity = existingItem ? existingItem.quantity : 0;
  const desiredQuantity = currentQuantity + quantity;

  if (stock <= 0) {
    alert('Sản phẩm này hiện đã hết hàng.');
    return false;
  }

  if (desiredQuantity > stock) {
    alert(`Chỉ còn ${stock} sản phẩm trong kho. Vui lòng không vượt quá.`);
    if (existingItem) {
      existingItem.quantity = stock;
    } else {
      cart.push({ id: productId, quantity: stock });
    }
    saveCart(cart);
    return false;
  }

  if (existingItem) {
    existingItem.quantity = desiredQuantity;
  } else {
    cart.push({ id: productId, quantity });
  }
  saveCart(cart);
  return true;
}

async function initCartPage() {
  const cartContainer = document.getElementById('cart-items');
  const cartTotal = document.getElementById('cart-total');
  const checkoutNotice = document.getElementById('checkout-notice');
  const cart = getCart();
  const products = await fetchProducts();

  function renderCart() {
    const currentCart = getCart();
    if (!cartContainer) return;

    if (currentCart.length === 0) {
      cartContainer.innerHTML = '<tr><td colspan="5">Giỏ hàng trống.</td></tr>';
      if (cartTotal) cartTotal.textContent = formatPrice(0);
      const checkoutBtn = document.getElementById('checkout-btn');
      if (checkoutBtn) checkoutBtn.disabled = true;
      if (checkoutNotice) checkoutNotice.textContent = '';
      return;
    }

    cartContainer.innerHTML = currentCart.map((item) => {
      const product = products.find((productItem) => productItem.id === item.id);
      if (!product) return '';
      const unitPrice = getProductEffectivePrice(product);
      const lineTotal = unitPrice * item.quantity;
      const unitPriceHtml = product.price !== unitPrice
        ? `${formatPrice(unitPrice)} <span class="original-price">${formatPrice(product.price)}</span>`
        : formatPrice(unitPrice);
      return `
        <tr data-id="${item.id}">
          <td class="product-cell">
            <img src="${product.image}" alt="${product.name}" class="cart-thumb">
            <div>
              <strong>${product.name}</strong>
              <p>${product.category}</p>
            </div>
          </td>
          <td>${unitPriceHtml}</td>
          <td>
            <button class="qty-btn qty-decrease" data-id="${item.id}" aria-label="Giảm">-</button>
            <input type="number" min="1" max="${product.stock}" value="${item.quantity}" class="qty-input" data-id="${item.id}">
            <button class="qty-btn qty-increase" data-id="${item.id}" aria-label="Tăng">+</button>
            <p class="stock-info">Còn ${product.stock} sản phẩm</p>
          </td>
          <td>${formatPrice(lineTotal)}</td>
          <td><button class="remove-btn" data-id="${item.id}">Xóa</button></td>
        </tr>
      `;
    }).join('');

    const totals = calculateCartTotals(currentCart, products);
    const cartSubtotalEl = document.getElementById('cart-subtotal');
    const cartDiscountEl = document.getElementById('cart-discount');
    const cartDiscountRow = document.getElementById('cart-discount-row');
    if (cartSubtotalEl) cartSubtotalEl.textContent = formatPrice(totals.subtotal);
    if (cartDiscountEl) cartDiscountEl.textContent = formatPrice(totals.discount);
    if (cartDiscountRow) {
      cartDiscountRow.style.display = totals.discount > 0 ? 'block' : 'none';
    }
    if (cartTotal) cartTotal.textContent = formatPrice(totals.total);

    const checkoutBtn = document.getElementById('checkout-btn');
    const currentUser = getCurrentUser();
    if (checkoutBtn) {
      checkoutBtn.disabled = !currentUser;
    }
    if (checkoutNotice) {
      checkoutNotice.textContent = currentUser ? '' : 'Vui lòng đăng nhập hoặc đăng ký để thanh toán.';
    }

    cartContainer.querySelectorAll('.qty-decrease').forEach((button) => {
      button.addEventListener('click', handleQuantityChange);
    });
    cartContainer.querySelectorAll('.qty-increase').forEach((button) => {
      button.addEventListener('click', handleQuantityChange);
    });
    cartContainer.querySelectorAll('.qty-input').forEach((input) => {
      input.addEventListener('change', handleQuantityInput);
    });
    cartContainer.querySelectorAll('.remove-btn').forEach((button) => {
      button.addEventListener('click', handleRemoveItem);
    });
  }

  function handleQuantityChange(event) {
    const id = Number(event.currentTarget.dataset.id);
    const action = event.currentTarget.classList.contains('qty-increase') ? 1 : -1;
    const currentCart = getCart();
    const item = currentCart.find((product) => product.id === id);
    if (!item) return;
    const stock = getAvailableStock(id);
    if (action === 1) {
      item.quantity = Math.min(stock, item.quantity + 1);
    } else {
      item.quantity = Math.max(1, item.quantity - 1);
    }
    saveCart(currentCart);
    renderCart();
  }

  function handleQuantityInput(event) {
    const id = Number(event.currentTarget.dataset.id);
    const currentCart = getCart();
    const item = currentCart.find((product) => product.id === id);
    if (!item) return;
    const stock = getAvailableStock(id);
    const newQuantity = Math.min(stock, Math.max(1, Number(event.currentTarget.value) || 1));
    item.quantity = newQuantity;
    saveCart(currentCart);
    renderCart();
  }

  function handleRemoveItem(event) {
    const id = Number(event.currentTarget.dataset.id);
    const currentCart = getCart().filter((product) => product.id !== id);
    saveCart(currentCart);
    renderCart();
  }

  renderCart();

  const checkoutBtn = document.getElementById('checkout-btn');

  if (checkoutBtn) {

    checkoutBtn.addEventListener('click', async () => {

      const cart = getCart();
      const user = getCurrentUser();

      if (cart.length === 0) {

        const modal = document.getElementById('no-products-modal');

        modal.style.display = 'block';

        const closeBtn = modal.querySelector('.close-modal');

        closeBtn.onclick = () => modal.style.display = 'none';

        window.onclick = (event) => {

          if (event.target === modal) modal.style.display = 'none';

        };

      } else if (!user) {
        alert('Vui lòng đăng nhập hoặc đăng ký trước khi thanh toán.');
        window.location.href = 'contact.html?view=login';
      } else {

        const { subtotal, discount, total } = calculateCartTotals(cart, products);

        const orders = getOrders();
        orders.push({
          id: Date.now(),
          date: new Date().toISOString(),
          items: cart,
          subtotal,
          discount,
          total
        });
        saveOrders(orders);

        const inventory = getInventory();
        cart.forEach((item) => {
          inventory[item.id] = Math.max(0, (inventory[item.id] ?? 0) - item.quantity);
        });
        saveInventory(inventory);

        saveCart([]);

        renderCart();

        alert('Payment successful!');

      }

    });

  }

}

function initUserPage() {
  const authSection = document.getElementById('auth-section');
  const authStatus = document.getElementById('auth-status');

  if (!authSection || !authStatus) return;

  function renderAuthSection() {
    const user = getCurrentUser();
    if (user) {
      authStatus.innerHTML = `
        <div class="user-card">
          <span class="user-avatar">${getUserInitials(user.name)}</span>
          <div class="user-card__info">
            <p class="user-card__welcome">Chào mừng bạn trở lại</p>
            <h2 class="user-card__name">${user.name}</h2>
          </div>
          <button id="logout-btn" class="auth-logout-btn" type="button">Đăng xuất</button>
        </div>
      `;
      const logoutBtn = document.getElementById('logout-btn');
      logoutBtn.addEventListener('click', () => {
        clearCurrentUser();
        updateAuthHeader();
        renderAuthSection();
      });
      return;
    }

    // If not logged in, redirect to login
    window.location.href = 'contact.html?view=login';
  }

  renderAuthSection();
}

function initContactPage() {
  const contactForm = document.getElementById('contact-form');
  const contactStatus = document.getElementById('contact-status');
  const messageList = document.getElementById('message-list');
  const nameInput = document.getElementById('contact-name');
  const emailInput = document.getElementById('contact-email');
  const subjectInput = document.getElementById('contact-subject');
  const messageInput = document.getElementById('contact-message');

  const authSection = document.getElementById('auth-section');
  const authStatus = document.getElementById('auth-status');
  const authTabs = document.getElementById('auth-tabs');
  const showLoginBtn = document.getElementById('show-login');
  const showRegisterBtn = document.getElementById('show-register');
  const loginPanel = document.getElementById('login-panel');
  const registerPanel = document.getElementById('register-panel');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const loginStatus = document.getElementById('login-status');
  const registerStatus = document.getElementById('register-status');
  const contactPanel = document.getElementById('contact-panel');

  if (!contactForm || !contactStatus || !messageList || !nameInput || !emailInput || !subjectInput || !messageInput || !authSection || !authStatus || !authTabs || !showLoginBtn || !showRegisterBtn || !loginPanel || !registerPanel || !loginForm || !registerForm || !loginStatus || !registerStatus || !contactPanel) return;

  const currentUser = getCurrentUser();
  if (currentUser) {
    nameInput.value = currentUser.name || '';
    emailInput.value = currentUser.email || '';
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function renderSavedMessages() {
    const messages = getManagerMessages();
    if (messages.length === 0) {
      messageList.innerHTML = '<p>Chưa có thư nào được gửi.</p>';
      return;
    }

    messageList.innerHTML = messages
      .slice()
      .reverse()
      .map((msg) => `
        <div class="message-item">
          <time>${new Date(msg.date).toLocaleString('vi-VN')}</time>
          <strong>${escapeHtml(msg.subject)}</strong>
          <p><strong>Người gửi:</strong> ${escapeHtml(msg.name)} • ${escapeHtml(msg.email)}</p>
          <p>${escapeHtml(msg.message)}</p>
        </div>
      `)
      .join('');
  }

  function setActiveAuthTab(tab) {
    authSection.style.display = 'block';
    contactPanel.style.display = 'none';
    if (tab === 'register') {
      loginPanel.style.display = 'none';
      registerPanel.style.display = 'block';
      showLoginBtn.classList.remove('active');
      showRegisterBtn.classList.add('active');
    } else {
      loginPanel.style.display = 'block';
      registerPanel.style.display = 'none';
      showLoginBtn.classList.add('active');
      showRegisterBtn.classList.remove('active');
    }
  }

  function showContactPanel() {
    authSection.style.display = 'none';
    contactPanel.style.display = 'block';
  }

  function renderAuthSection() {
    const user = getCurrentUser();
    if (user) {
      authStatus.innerHTML = `
        <div class="user-card">
          <span class="user-avatar">${getUserInitials(user.name)}</span>
          <div class="user-card__info">
            <p class="user-card__welcome">Chào mừng bạn trở lại</p>
            <h2 class="user-card__name">${user.name}</h2>
          </div>
          <button id="logout-btn" class="auth-logout-btn" type="button">Đăng xuất</button>
        </div>
      `;
      authTabs.style.display = 'none';
      loginPanel.style.display = 'none';
      registerPanel.style.display = 'none';
      authSection.style.display = 'block';
      const logoutBtn = document.getElementById('logout-btn');
      logoutBtn.addEventListener('click', () => {
        clearCurrentUser();
        updateAuthHeader();
        renderAuthSection();
      });
      return;
    }

    authStatus.textContent = '';
    authTabs.style.display = 'flex';
    showLoginBtn.classList.add('active');
    showRegisterBtn.classList.remove('active');
    loginPanel.style.display = 'block';
    registerPanel.style.display = 'none';
  }

  showLoginBtn.addEventListener('click', () => setActiveAuthTab('login'));
  showRegisterBtn.addEventListener('click', () => setActiveAuthTab('register'));

  registerForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const phone = document.getElementById('register-phone').value.trim();
    const password = document.getElementById('register-password').value.trim();
    const errors = [];

    if (!name) errors.push('Họ tên không được để trống.');
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) errors.push('Email không đúng định dạng.');
    if (!phone || !/^[0-9]{9,12}$/.test(phone)) errors.push('Số điện thoại phải gồm 9–12 chữ số.');
    if (!password || password.length < 6) errors.push('Mật khẩu cần ít nhất 6 ký tự.');

    if (errors.length > 0) {
      registerStatus.textContent = errors.join(' ');
      registerStatus.className = 'error-message';
      return;
    }

    const users = getUsers();
    if (users.some((user) => user.email.toLowerCase() === email.toLowerCase())) {
      registerStatus.textContent = 'Email đã được sử dụng. Vui lòng chọn email khác.';
      registerStatus.className = 'error-message';
      return;
    }

    const newUser = { name, email: email.toLowerCase(), phone, password };
    users.push(newUser);
    saveUsers(users);
    saveCurrentUser(newUser);

    registerStatus.textContent = 'Đăng ký thành công! Bạn đã được đăng nhập.';
    registerStatus.className = 'success-message';
    registerForm.reset();
    renderAuthSection();
  });

  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const errors = [];

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) errors.push('Email không đúng định dạng.');
    if (!password) errors.push('Mật khẩu không được để trống.');

    if (errors.length > 0) {
      loginStatus.textContent = errors.join(' ');
      loginStatus.className = 'error-message';
      return;
    }

    const users = getUsers();
    const user = users.find((item) => item.email.toLowerCase() === email.toLowerCase() && item.password === password);
    if (!user) {
      loginStatus.textContent = 'Email hoặc mật khẩu không đúng.';
      loginStatus.className = 'error-message';
      return;
    }

    saveCurrentUser(user);
    loginStatus.textContent = 'Đăng nhập thành công.';
    loginStatus.className = 'success-message';
    loginForm.reset();
    renderAuthSection();
  });

  renderSavedMessages();
  renderAuthSection();

  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');
  if (view === 'register') {
    setActiveAuthTab('register');
  } else if (view === 'login') {
    setActiveAuthTab('login');
  } else {
    showContactPanel();
  }
}
