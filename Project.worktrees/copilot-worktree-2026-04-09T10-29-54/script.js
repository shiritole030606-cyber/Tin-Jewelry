const API_URL = 'products.json';
const CART_KEY = 'gduTechStoreCart';

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initPageScripts();
});

async function fetchProducts() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('Không thể tải sản phẩm');
    return await response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

function formatPrice(value) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

function getCart() {
  const cartData = localStorage.getItem(CART_KEY);
  return cartData ? JSON.parse(cartData) : [];
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
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
  return `
    <article class="product-card">
      <a href="detail.html?id=${product.id}" class="product-link">
        <img src="${product.image}" alt="${product.name}">
      </a>
      <div class="product-meta">
        <h3>${product.name}</h3>
        <p>${formatPrice(product.price)}</p>
      </div>
      <div class="product-actions">
        <a href="detail.html?id=${product.id}" class="detail-link">Xem chi tiết</a>
        <button class="add-to-cart-btn" data-product-id="${product.id}">Thêm vào giỏ</button>
      </div>
    </article>
  `;
}

function handleAddToCartButton(event) {
  const id = Number(event.currentTarget.dataset.productId);
  addProductToCart(id, 1);
  event.currentTarget.textContent = 'Đã thêm';
  event.currentTarget.disabled = true;
}

async function initProductsPage() {
  const products = await fetchProducts();
  const categorySelect = document.getElementById('category-filter');
  const minPriceInput = document.getElementById('min-price');
  const maxPriceInput = document.getElementById('max-price');
  const searchInput = document.getElementById('product-search');
  const gridBtn = document.querySelector('.grid-btn');
  const listBtn = document.querySelector('.list-btn');
  const productSection = document.querySelector('.products-grid');

  if (!productSection) return;
  fillCategoryOptions(products, categorySelect);

  function render() {
    const categoryValue = categorySelect.value;
    const minPrice = Number(minPriceInput.value) || 0;
    const maxPrice = Number(maxPriceInput.value) || Number.MAX_SAFE_INTEGER;
    const searchValue = searchInput.value.trim().toLowerCase();
    const filteredProducts = products.filter((product) => {
      const nameMatch = product.name.toLowerCase().includes(searchValue);
      const categoryMatch = categoryValue === 'all' || product.category === categoryValue;
      const priceMatch = product.price >= minPrice && product.price <= maxPrice;
      return nameMatch && categoryMatch && priceMatch;
    });
    productSection.innerHTML = filteredProducts.map(productCardTemplate).join('');
    productSection.querySelectorAll('.add-to-cart-btn').forEach((button) => {
      button.addEventListener('click', handleAddToCartButton);
    });
  }

  categorySelect.addEventListener('change', render);
  minPriceInput.addEventListener('input', render);
  maxPriceInput.addEventListener('input', render);
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
  detailPrice.textContent = formatPrice(product.price);
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

  addToCartBtn.addEventListener('click', () => {
    const quantity = Number(quantityInput.value) || 1;
    addProductToCart(product.id, quantity);
    addToCartBtn.textContent = 'Đã thêm vào giỏ';
  });
}

function addProductToCart(productId, quantity) {
  const cart = getCart();
  const existingItem = cart.find((item) => item.id === productId);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({ id: productId, quantity });
  }
  saveCart(cart);
}

async function initCartPage() {
  const cartContainer = document.getElementById('cart-items');
  const cartTotal = document.getElementById('cart-total');
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
      return;
    }

    cartContainer.innerHTML = currentCart.map((item) => {
      const product = products.find((productItem) => productItem.id === item.id);
      if (!product) return '';
      return `
        <tr data-id="${item.id}">
          <td class="product-cell">
            <img src="${product.image}" alt="${product.name}" class="cart-thumb">
            <div>
              <strong>${product.name}</strong>
              <p>${product.category}</p>
            </div>
          </td>
          <td>${formatPrice(product.price)}</td>
          <td>
            <button class="qty-btn qty-decrease" data-id="${item.id}" aria-label="Giảm">-</button>
            <input type="number" min="1" value="${item.quantity}" class="qty-input" data-id="${item.id}">
            <button class="qty-btn qty-increase" data-id="${item.id}" aria-label="Tăng">+</button>
          </td>
          <td>${formatPrice(product.price * item.quantity)}</td>
          <td><button class="remove-btn" data-id="${item.id}">Xóa</button></td>
        </tr>
      `;
    }).join('');

    const total = currentCart.reduce((sum, item) => {
      const product = products.find((productItem) => productItem.id === item.id);
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);
    if (cartTotal) cartTotal.textContent = formatPrice(total);

    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) checkoutBtn.disabled = false;

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
    item.quantity = Math.max(1, item.quantity + action);
    saveCart(currentCart);
    renderCart();
  }

  function handleQuantityInput(event) {
    const id = Number(event.currentTarget.dataset.id);
    const newQuantity = Math.max(1, Number(event.currentTarget.value) || 1);
    const currentCart = getCart();
    const item = currentCart.find((product) => product.id === id);
    if (!item) return;
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

    checkoutBtn.addEventListener('click', () => {

      const cart = getCart();

      if (cart.length === 0) {

        const modal = document.getElementById('no-products-modal');

        modal.style.display = 'block';

        const closeBtn = modal.querySelector('.close-modal');

        closeBtn.onclick = () => modal.style.display = 'none';

        window.onclick = (event) => {

          if (event.target === modal) modal.style.display = 'none';

        };

      } else {

        saveCart([]);

        renderCart();

        alert('Payment successful!');

      }

    });

  }

}

function initContactPage() {
  const form = document.getElementById('contact-form');
  const nameField = document.getElementById('contact-name');
  const emailField = document.getElementById('contact-email');
  const phoneField = document.getElementById('contact-phone');
  const messageField = document.getElementById('contact-message');
  const statusBox = document.getElementById('contact-status');

  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = nameField.value.trim();
    const email = emailField.value.trim();
    const phone = phoneField.value.trim();
    const message = messageField.value.trim();
    const errors = [];

    if (!name) errors.push('Họ tên không được để trống.');
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) errors.push('Email không đúng định dạng.');
    if (!phone || !/^\d{9,12}$/.test(phone)) errors.push('Số điện thoại phải là số hợp lệ.');
    if (!message) errors.push('Nội dung không được để trống.');

    if (errors.length > 0) {
      statusBox.textContent = errors.join(' ');
      statusBox.className = 'error-message';
      return;
    }

    statusBox.textContent = 'Gửi thành công! Cảm ơn bạn đã liên hệ.';
    statusBox.className = 'success-message';
    form.reset();
  });
}
