import { getCheckoutFormData, initCheckoutAddressForm, resetCheckoutAddressForm } from "./checkoutForm.js";

export const CART_KEY = "aasif_cart_v2";
export const DELIVERY_CHARGE = 150;

export function formatMoney(v) {
  return window.__formatPKR__
    ? window.__formatPKR__(v)
    : `PKR ${Number(v || 0).toLocaleString("en-PK")}`;
}

export function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function escapeAttr(s) {
  return String(s).replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

export function parseColors(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((c) => c && c.name);
  return [];
}

export function productUrl(table, id) {
  return `product.html?table=${encodeURIComponent(table)}&id=${encodeURIComponent(id)}`;
}

export function getWhatsAppNumber() {
  const items = document.querySelectorAll(".footer__contact-item");
  for (const item of items) {
    const m = item.textContent.match(/\+?\d[\d\s-]{8,}/);
    if (m) return m[0].replace(/\D/g, "");
  }
  return "923422244752";
}

export function buildWhatsAppHref(name, price, colorName, qty = 1) {
  let msg = `Hi, I'm interested in ${name}`;
  if (colorName) msg += ` (${colorName} color)`;
  if (qty > 1) msg += ` x${qty}`;
  msg += ` - Price: ${formatMoney(price)}. Please share more details.`;
  return `https://wa.me/${getWhatsAppNumber()}?text=${encodeURIComponent(msg)}`;
}

export function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  } catch {
    return [];
  }
}

export function setCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items || []));
}

export function cartKeyOf(it) {
  return `${it.source_table}:${it.source_id}:${it.color_name || ""}`;
}

export function calcTotals(cart) {
  const subtotal = cart.reduce((sum, it) => sum + Number(it.unit_price || 0) * Number(it.qty || 1), 0);
  const delivery = cart.length ? DELIVERY_CHARGE : 0;
  return { subtotal, delivery, total: subtotal + delivery };
}

export function addToCart(item, { openDrawer = true } = {}) {
  const cart = getCart();
  const k = cartKeyOf(item);
  const found = cart.find((x) => cartKeyOf(x) === k);
  if (found) found.qty = Number(found.qty || 1) + Number(item.qty || 1);
  else cart.push({ ...item, qty: Number(item.qty || 1) });
  setCart(cart);
  renderCart();
  if (openDrawer) window.openCart?.();
}

export function buyNow(item) {
  addToCart(item, { openDrawer: false });
  window.closeCart?.();
  window.openCheckout?.();
}

export function itemFromActionBtn(btn, card) {
  const activeColor = card?.querySelector(".color-swatch.active, .detail-color.active");
  return {
    source_table: btn.getAttribute("data-source-table"),
    source_id: Number(btn.getAttribute("data-source-id")),
    name: btn.getAttribute("data-name") || "",
    image_url: btn.getAttribute("data-image") || "",
    color_name: activeColor?.getAttribute("data-color-name") || btn.getAttribute("data-color-name") || "",
    unit_price: Number(btn.getAttribute("data-unit-price") || 0),
    actual_price: Number(btn.getAttribute("data-actual-price") || 0),
    qty: Number(btn.getAttribute("data-qty") || 1),
  };
}

export function syncActionButtons(card) {
  if (!card) return;
  const activeColor = card.querySelector(".color-swatch.active");
  if (!activeColor) return;
  const imgUrl = activeColor.getAttribute("data-color-image") || "";
  const colorName = activeColor.getAttribute("data-color-name") || "";
  card.querySelectorAll("[data-add-to-cart], [data-buy-now]").forEach((btn) => {
    if (imgUrl) btn.setAttribute("data-image", imgUrl);
    btn.setAttribute("data-color-name", colorName);
  });
}

export function updateQty(source_table, source_id, color_name, delta) {
  const cart = getCart();
  const k = `${source_table}:${source_id}:${color_name || ""}`;
  const found = cart.find((x) => cartKeyOf(x) === k);
  if (!found) return;
  const next = Number(found.qty || 1) + delta;
  if (next <= 0) setCart(cart.filter((x) => cartKeyOf(x) !== k));
  else {
    found.qty = next;
    setCart(cart);
  }
  renderCart();
}

export function removeFromCart(source_table, source_id, color_name) {
  const k = `${source_table}:${source_id}:${color_name || ""}`;
  setCart(getCart().filter((x) => cartKeyOf(x) !== k));
  renderCart();
}

export function renderCart() {
  const wrap = document.getElementById("cartItems");
  if (!wrap) return;
  const cart = getCart();
  const { subtotal, delivery, total } = calcTotals(cart);

  const subtotalEl = document.getElementById("cartSubtotal");
  const deliveryEl = document.getElementById("cartDelivery");
  const totalEl = document.getElementById("cartTotal");
  if (subtotalEl) subtotalEl.textContent = formatMoney(subtotal);
  if (deliveryEl) deliveryEl.textContent = formatMoney(delivery);
  if (totalEl) totalEl.textContent = formatMoney(total);

  if (!cart.length) {
    wrap.innerHTML = `<div style="padding:24px 4px;color:var(--text-secondary);">Your cart is empty.</div>`;
    return;
  }

  wrap.innerHTML = cart
    .map(
      (it) => `
    <article class="cart__card">
      <div class="cart__card-img">
        <img src="${escapeAttr(it.image_url || "")}" alt="">
      </div>
      <div class="cart__card-info">
        <h3 class="cart__card-name">${escapeHtml(it.name || "")}</h3>
        ${it.color_name ? `<div class="cart__card-color">${escapeHtml(it.color_name)}</div>` : ""}
        <span class="cart__card-price">${formatMoney(it.unit_price)}</span>
        <div class="cart__card-controls">
          <div class="cart__qty">
            <button class="cart__qty-btn" data-cart-minus="1" data-source-table="${escapeAttr(it.source_table)}" data-source-id="${it.source_id}" data-color-name="${escapeAttr(it.color_name || "")}"><i class='bx bx-minus'></i></button>
            <span class="cart__qty-num">${Number(it.qty || 1)}</span>
            <button class="cart__qty-btn" data-cart-plus="1" data-source-table="${escapeAttr(it.source_table)}" data-source-id="${it.source_id}" data-color-name="${escapeAttr(it.color_name || "")}"><i class='bx bx-plus'></i></button>
          </div>
          <button class="cart__delete" data-cart-remove="1" data-source-table="${escapeAttr(it.source_table)}" data-source-id="${it.source_id}" data-color-name="${escapeAttr(it.color_name || "")}"><i class='bx bx-trash-alt'></i></button>
        </div>
      </div>
    </article>
  `
    )
    .join("");
}

export function initCartInteractions() {
  document.addEventListener("click", (e) => {
    const buyBtn = e.target.closest("[data-buy-now]");
    if (buyBtn) {
      e.preventDefault();
      const card = buyBtn.closest("[data-product-card]");
      buyNow(itemFromActionBtn(buyBtn, card));
      return;
    }

    const btn = e.target.closest("[data-add-to-cart]");
    if (btn) {
      const card = btn.closest("[data-product-card]");
      addToCart(itemFromActionBtn(btn, card));
      return;
    }

    const swatch = e.target.closest("[data-color-swatch]");
    if (swatch) {
      const card = swatch.closest("[data-product-card]");
      if (card) {
        card.querySelectorAll(".color-swatch").forEach((s) => s.classList.remove("active"));
        swatch.classList.add("active");
        const imgUrl = swatch.getAttribute("data-color-image") || "";
        const colorName = swatch.getAttribute("data-color-name") || "";
        const img = card.querySelector(".featured__item-visual img, .product-card__visual img, .new__item-visual img");
        if (img && imgUrl) img.src = imgUrl;
        const label = card.querySelector(".color-swatch-label");
        if (label) label.textContent = colorName;
        syncActionButtons(card);
        card.querySelectorAll("[data-whatsapp-link]").forEach((link) => {
          link.href = buildWhatsAppHref(
            link.getAttribute("data-product-name") || "",
            link.getAttribute("data-product-price") || "0",
            colorName
          );
          link.setAttribute("data-color-name", colorName);
        });
      }
      return;
    }

    const minus = e.target.closest("[data-cart-minus]");
    if (minus) {
      updateQty(minus.getAttribute("data-source-table"), Number(minus.getAttribute("data-source-id")), minus.getAttribute("data-color-name") || "", -1);
      return;
    }
    const plus = e.target.closest("[data-cart-plus]");
    if (plus) {
      updateQty(plus.getAttribute("data-source-table"), Number(plus.getAttribute("data-source-id")), plus.getAttribute("data-color-name") || "", +1);
      return;
    }
    const rem = e.target.closest("[data-cart-remove]");
    if (rem) {
      removeFromCart(rem.getAttribute("data-source-table"), Number(rem.getAttribute("data-source-id")), rem.getAttribute("data-color-name") || "");
    }
  });
}

export function initCheckout(supabase) {
  const checkoutOverlay = document.getElementById("checkoutOverlay");
  const checkoutModal = document.getElementById("checkoutModal");
  const checkoutClose = document.getElementById("checkoutClose");
  const checkoutBtn = document.getElementById("checkoutBtn");
  const checkoutForm = document.getElementById("checkoutForm");

  const openCheckout = () => {
    const cart = getCart();
    if (!cart.length) {
      alert("Your cart is empty.");
      return;
    }
    const { subtotal, delivery, total } = calcTotals(cart);
    document.getElementById("coSubtotal").textContent = formatMoney(subtotal);
    document.getElementById("coDelivery").textContent = formatMoney(delivery);
    document.getElementById("coTotal").textContent = formatMoney(total);
    document.getElementById("checkoutMsg").textContent = "";
    checkoutOverlay?.classList.add("active");
    checkoutModal?.classList.add("show-cart");
  };

  const closeCheckout = () => {
    checkoutOverlay?.classList.remove("active");
    checkoutModal?.classList.remove("show-cart");
  };

  window.openCheckout = openCheckout;

  initCheckoutAddressForm();

  checkoutBtn?.addEventListener("click", openCheckout);
  checkoutClose?.addEventListener("click", closeCheckout);
  checkoutOverlay?.addEventListener("click", closeCheckout);

  checkoutForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("checkoutMsg");
    const btn = document.getElementById("placeOrderBtn");
    const cart = getCart();
    if (!cart.length) return;

    const formData = getCheckoutFormData();
    if (!formData.valid) {
      msg.textContent = formData.errors[0] || "Please complete all required fields.";
      return;
    }

    const customer_name = formData.customer_name;
    const phone = formData.phone;
    const address = formData.address;

    const { subtotal, delivery, total } = calcTotals(cart);
    msg.textContent = "Placing order…";
    btn.disabled = true;
    try {
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          customer_name,
          phone,
          address,
          subtotal_amount: subtotal,
          delivery_amount: delivery,
          total_amount: total,
          status: "pending",
        })
        .select("id")
        .single();
      if (orderErr) throw orderErr;

      const itemsPayload = cart.map((it) => ({
        order_id: order.id,
        source_table: it.source_table,
        source_id: it.source_id,
        name: it.name,
        image_url: it.image_url,
        color_name: it.color_name || null,
        unit_price: Number(it.unit_price || 0),
        qty: Number(it.qty || 1),
        line_total: Number(it.unit_price || 0) * Number(it.qty || 1),
      }));
      const { error: itemsErr } = await supabase.from("order_items").insert(itemsPayload);
      if (itemsErr) throw itemsErr;

      setCart([]);
      renderCart();
      msg.textContent = "Order placed successfully.";
      checkoutForm.reset();
      resetCheckoutAddressForm();
      setTimeout(closeCheckout, 800);
    } catch (err) {
      console.error(err);
      msg.textContent = err?.message ? `Error: ${err.message}` : "Error placing order.";
    } finally {
      btn.disabled = false;
    }
  });
}
