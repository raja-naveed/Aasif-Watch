import { supabase } from "./supabaseClient.js";

const AUTH_KEY = "aasif_admin_authed";
const ADMIN_USERNAME = "aasif";
const ADMIN_PASSWORD = "Aasifkhan";

const bucket = "aasif-watch";

const $ = (id) => document.getElementById(id);
const loginView = $("loginView");
const appView = $("appView");
const logoutBtn = $("logoutBtn");

function setMsg(el, text, ok = true) {
  el.textContent = text || "";
  el.style.color = ok ? "rgba(255,255,255,.65)" : "rgba(255,120,120,.9)";
}

function authed() {
  return localStorage.getItem(AUTH_KEY) === "1";
}

function requireAuthUI() {
  const isAuthed = authed();
  loginView.hidden = isAuthed;
  appView.hidden = !isAuthed;
}

function moneyPKR(v) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));
}

async function uploadImage(file, folder) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeExt = ext.replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${safeExt}`;

  const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (upErr) throw upErr;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("Failed to get public URL");
  return data.publicUrl;
}

async function ensureBucketHint() {
  // Storage bucket must exist in Supabase dashboard.
  // If it doesn't, uploads will fail with a clear error.
  return true;
}

async function fetchHeroSetting() {
  const { data, error } = await supabase
    .from("site_settings")
    .select("hero_image_url")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function setHeroImage(url) {
  // Table: site_settings (singleton row id=1)
  const { error } = await supabase
    .from("site_settings")
    .upsert({ id: 1, hero_image_url: url }, { onConflict: "id" });
  if (error) throw error;
}

async function clearHeroImage() {
  const { error } = await supabase
    .from("site_settings")
    .upsert({ id: 1, hero_image_url: null }, { onConflict: "id" });
  if (error) throw error;
}

async function addFeatured(payload) {
  const { error } = await supabase.from("featured_timepieces").insert(payload);
  if (error) throw error;
}

async function addProduct(payload) {
  const { error } = await supabase.from("premium_products").insert(payload);
  if (error) throw error;
}

async function updateRow(table, id, payload) {
  const { error } = await supabase.from(table).update(payload).eq("id", id);
  if (error) throw error;
}

async function fetchOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id,customer_name,phone,address,subtotal_amount,delivery_amount,total_amount,status,created_at"
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function fetchOrderItems(orderId) {
  const { data, error } = await supabase
    .from("order_items")
    .select("id,order_id,name,image_url,unit_price,qty,line_total,source_table,source_id")
    .eq("order_id", orderId)
    .order("id", { ascending: true });
  if (error) throw error;
  return data || [];
}

async function markOrderComplete(orderId) {
  const { error } = await supabase.from("orders").update({ status: "completed" }).eq("id", orderId);
  if (error) throw error;
}

async function fetchFeatured() {
  const { data, error } = await supabase
    .from("featured_timepieces")
    .select("id,name,image_url,actual_price,my_price,created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function fetchProducts() {
  const { data, error } = await supabase
    .from("premium_products")
    .select("id,name,image_url,actual_price,my_price,created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function deleteRow(table, id) {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}

function renderList(container, rows, table) {
  container.innerHTML = "";
  if (!rows.length) {
    const empty = document.createElement("div");
    empty.className = "msg";
    empty.textContent = "No items yet.";
    container.appendChild(empty);
    return;
  }

  for (const r of rows) {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="item__left">
        <img class="thumb" src="${r.image_url || ""}" alt="" />
        <div class="meta">
          <div class="name">${escapeHtml(r.name || "")}</div>
          <div class="prices">Actual: ${moneyPKR(r.actual_price)} · Your: ${moneyPKR(r.my_price)}</div>
        </div>
      </div>
      <div class="item__actions">
        <button class="iconBtn" type="button" data-action="edit" title="Edit"><i class='bx bx-edit'></i></button>
        <button class="iconBtn" type="button" data-action="delete" title="Delete"><i class='bx bx-trash'></i></button>
      </div>
    `;
    const editBtn = el.querySelector('[data-action="edit"]');
    const delBtn = el.querySelector('[data-action="delete"]');

    editBtn.addEventListener("click", () => openItemModal({ table, mode: "edit", row: r }));
    delBtn.addEventListener("click", async () => {
      if (!confirm("Delete this item?")) return;
      delBtn.disabled = true;
      try {
        await deleteRow(table, r.id);
        await refreshLists();
      } catch (e) {
        console.error(e);
        alert(e.message || String(e));
      } finally {
        delBtn.disabled = false;
      }
    });
    container.appendChild(el);
  }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(s) {
  return String(s).replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

async function refreshLists() {
  const featuredList = $("featuredList");
  const productList = $("productList");
  const [featured, products] = await Promise.all([fetchFeatured(), fetchProducts()]);
  renderList(featuredList, featured, "featured_timepieces");
  renderList(productList, products, "premium_products");
}

function renderOrders(container, orders) {
  container.innerHTML = "";
  if (!orders.length) {
    const empty = document.createElement("div");
    empty.className = "msg";
    empty.textContent = "No orders yet.";
    container.appendChild(empty);
    return;
  }

  for (const o of orders) {
    const el = document.createElement("div");
    el.className = "item";
    const status = (o.status || "pending").toUpperCase();
    el.innerHTML = `
      <div class="item__left">
        <div class="meta" style="min-width:0">
          <div class="name">Order #${o.id} · ${escapeHtml(o.customer_name || "")}</div>
          <div class="prices">${escapeHtml(o.phone || "")} · ${escapeHtml(o.address || "")}</div>
          <div class="prices">Total: ${moneyPKR(o.total_amount)} · Status: ${status}</div>
        </div>
      </div>
      <div class="item__actions">
        <button class="iconBtn" type="button" data-action="view" title="View"><i class='bx bx-show'></i></button>
        ${
          o.status === "completed"
            ? ""
            : `<button class="iconBtn" type="button" data-action="complete" title="Mark complete"><i class='bx bx-check'></i></button>`
        }
      </div>
    `;

    el.querySelector('[data-action="view"]').addEventListener("click", () => openOrderModal(o));
    const comp = el.querySelector('[data-action="complete"]');
    if (comp) comp.addEventListener("click", () => completeOrderFlow(o.id));
    container.appendChild(el);
  }
}

async function refreshOrders() {
  const ordersMsg = $("ordersMsg");
  const ordersList = $("ordersList");
  try {
    setMsg(ordersMsg, "Loading orders…");
    const orders = await fetchOrders();
    renderOrders(ordersList, orders);
    setMsg(ordersMsg, "");
  } catch (e) {
    console.error(e);
    setMsg(ordersMsg, e.message || String(e), false);
  }
}

let currentOrderId = null;
async function openOrderModal(order) {
  currentOrderId = order.id;
  $("orderModalTitle").textContent = `Order #${order.id}`;
  setMsg($("orderModalMsg"), "");
  const detail = $("orderDetail");
  detail.innerHTML = `<div class="msg">Loading…</div>`;

  try {
    const items = await fetchOrderItems(order.id);
    const itemsHtml = items
      .map(
        (it) => `
      <div class="item" style="box-shadow:none;">
        <div class="item__left">
          <img class="thumb" src="${escapeAttr(it.image_url || "")}" alt="">
          <div class="meta">
            <div class="name">${escapeHtml(it.name || "")}</div>
            <div class="prices">${moneyPKR(it.unit_price)} × ${it.qty} = ${moneyPKR(it.line_total)}</div>
          </div>
        </div>
      </div>
    `
      )
      .join("");

    detail.innerHTML = `
      <div class="p" style="margin:0">
        <div><strong>Name:</strong> ${escapeHtml(order.customer_name || "")}</div>
        <div><strong>Phone:</strong> ${escapeHtml(order.phone || "")}</div>
        <div><strong>Address:</strong> ${escapeHtml(order.address || "")}</div>
      </div>
      <div class="p" style="margin:0">
        <div><strong>Subtotal:</strong> ${moneyPKR(order.subtotal_amount)}</div>
        <div><strong>Delivery:</strong> ${moneyPKR(order.delivery_amount)}</div>
        <div><strong>Total:</strong> ${moneyPKR(order.total_amount)}</div>
        <div><strong>Status:</strong> ${(order.status || "pending").toUpperCase()}</div>
      </div>
      <div style="display:grid;gap:10px;margin-top:4px;">
        ${itemsHtml || '<div class="msg">No items found.</div>'}
      </div>
    `;
  } catch (e) {
    console.error(e);
    detail.innerHTML = `<div class="msg" style="color:rgba(255,120,120,.9)">Error: ${escapeHtml(
      e.message || String(e)
    )}</div>`;
  }

  openModal("orderModal");
  const markBtn = $("markCompleteBtn");
  if (markBtn) markBtn.disabled = order.status === "completed";
}

async function completeOrderFlow(orderId) {
  if (!confirm("Mark this order as completed?")) return;
  const msg = $("ordersMsg");
  try {
    setMsg(msg, "Updating…");
    await markOrderComplete(orderId);
    setMsg(msg, "Order marked completed.");
    await refreshOrders();
  } catch (e) {
    console.error(e);
    setMsg(msg, e.message || String(e), false);
  }
}

$("markCompleteBtn")?.addEventListener("click", async () => {
  if (!currentOrderId) return;
  await completeOrderFlow(currentOrderId);
});

async function refreshHeroPreview() {
  const heroMsg = $("heroMsg");
  const heroPreview = $("heroPreview");
  try {
    const settings = await fetchHeroSetting();
    const url = settings?.hero_image_url;
    heroPreview.style.backgroundImage = url ? `url('${url}')` : "none";
    setMsg(heroMsg, url ? "Loaded current hero image." : "Hero removed (using default on website).");
  } catch (e) {
    console.error(e);
    setMsg(heroMsg, e.message || String(e), false);
  }
}

// ===== Sidebar navigation =====
const pageTitle = $("pageTitle");
const primaryActionBtn = $("primaryActionBtn");
const panels = ["heroSection", "featuredSection", "productsSection", "ordersSection"];

function setActivePanel(id) {
  panels.forEach((pid) => {
    const p = $(pid);
    if (p) p.classList.toggle("active", pid === id);
  });
  document.querySelectorAll(".nav__item").forEach((b) => {
    b.classList.toggle("active", b.getAttribute("data-target") === id);
  });

  if (id === "heroSection") {
    pageTitle.textContent = "Hero Image";
    primaryActionBtn.textContent = "Change Hero";
    primaryActionBtn.onclick = () => openModal("heroModal");
  } else if (id === "featuredSection") {
    pageTitle.textContent = "Featured";
    primaryActionBtn.textContent = "Add Featured";
    primaryActionBtn.onclick = () =>
      openItemModal({ table: "featured_timepieces", mode: "add" });
  } else if (id === "ordersSection") {
    pageTitle.textContent = "Orders";
    primaryActionBtn.textContent = "Refresh";
    primaryActionBtn.onclick = () => refreshOrders();
    refreshOrders().catch(console.error);
  } else {
    pageTitle.textContent = "Premium Products";
    primaryActionBtn.textContent = "Add Product";
    primaryActionBtn.onclick = () =>
      openItemModal({ table: "premium_products", mode: "add" });
  }
}

document.querySelectorAll(".nav__item").forEach((btn) => {
  btn.addEventListener("click", () => setActivePanel(btn.getAttribute("data-target")));
});

// Hero quick actions
$("changeHeroBtn")?.addEventListener("click", () => openModal("heroModal"));
$("removeHeroBtn")?.addEventListener("click", async () => {
  if (!confirm("Remove hero image and use the default?")) return;
  try {
    setMsg($("heroMsg"), "Removing…");
    await clearHeroImage();
    await refreshHeroPreview();
  } catch (e) {
    console.error(e);
    setMsg($("heroMsg"), e.message || String(e), false);
  }
});

// ===== Modals =====
function openModal(id) {
  const el = $(id);
  if (!el) return;
  el.hidden = false;
}
function closeModal(id) {
  const el = $(id);
  if (!el) return;
  el.hidden = true;
}
document.querySelectorAll("[data-close]").forEach((el) => {
  el.addEventListener("click", () => closeModal(el.getAttribute("data-close")));
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  ["heroModal", "itemModal"].forEach((id) => closeModal(id));
});

function openItemModal({ table, mode, row }) {
  $("itemTable").value = table;
  $("itemId").value = mode === "edit" ? String(row.id) : "";
  $("itemExistingImage").value = mode === "edit" ? (row.image_url || "") : "";
  $("itemName").value = mode === "edit" ? (row.name || "") : "";
  $("itemActual").value = mode === "edit" ? String(row.actual_price ?? "") : "";
  $("itemMy").value = mode === "edit" ? String(row.my_price ?? "") : "";
  $("itemFile").value = "";
  $("itemModalTitle").textContent =
    mode === "edit"
      ? `Edit ${table === "featured_timepieces" ? "Featured" : "Product"}`
      : `Add ${table === "featured_timepieces" ? "Featured" : "Product"}`;
  $("itemSubmitBtn").textContent = mode === "edit" ? "Update" : "Save";
  setMsg($("itemModalMsg"), "");
  openModal("itemModal");
}

$("addFeaturedBtn").addEventListener("click", () =>
  (async () => {
    try {
      const existing = await fetchFeatured();
      if (existing.length >= 3) {
        setMsg($("featuredMsg"), "Max 3 featured items allowed. Delete one to add a new one.", false);
        return;
      }
      openItemModal({ table: "featured_timepieces", mode: "add" });
    } catch (e) {
      console.error(e);
      setMsg($("featuredMsg"), e.message || String(e), false);
    }
  })()
);
$("addProductBtn").addEventListener("click", () =>
  openItemModal({ table: "premium_products", mode: "add" })
);

// ===== Login / Logout =====
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem(AUTH_KEY);
  requireAuthUI();
});

$("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const u = $("loginUser").value.trim();
  const p = $("loginPass").value;
  const msg = $("loginMsg");

  if (u === ADMIN_USERNAME && p === ADMIN_PASSWORD) {
    localStorage.setItem(AUTH_KEY, "1");
    setMsg(msg, "Logged in.", true);
    requireAuthUI();
    setActivePanel("heroSection");
    Promise.all([refreshHeroPreview(), refreshLists()]).catch(console.error);
    return;
  }
  setMsg(msg, "Invalid credentials.", false);
});

// ===== Hero =====
$("heroForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = $("heroModalMsg");
  setMsg(msg, "Uploading…");
  try {
    await ensureBucketHint();
    const file = $("heroFile").files?.[0];
    if (!file) throw new Error("Select an image.");
    const url = await uploadImage(file, "hero");
    await setHeroImage(url);
    setMsg(msg, "Saved.");
    $("heroFile").value = "";
    closeModal("heroModal");
    await refreshHeroPreview();
  } catch (err) {
    console.error(err);
    setMsg(msg, err.message || String(err), false);
  }
});

// ===== Item (Featured / Products) =====
$("itemForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = $("itemModalMsg");
  setMsg(msg, "Saving…");
  try {
    await ensureBucketHint();
    const table = $("itemTable").value;
    const idRaw = $("itemId").value;
    const isEdit = Boolean(idRaw);
    const file = $("itemFile").files?.[0] || null;
    const existingImage = $("itemExistingImage").value;
    const folder = table === "featured_timepieces" ? "featured" : "products";

    const imageUrl = file ? await uploadImage(file, folder) : existingImage;
    if (!imageUrl) throw new Error("Please upload an image.");

    const payload = {
      name: $("itemName").value.trim(),
      image_url: imageUrl,
      actual_price: Number($("itemActual").value),
      my_price: Number($("itemMy").value),
    };

    if (isEdit) await updateRow(table, Number(idRaw), payload);
    else if (table === "featured_timepieces") await addFeatured(payload);
    else await addProduct(payload);

    setMsg(msg, "Saved.");
    closeModal("itemModal");
    await refreshLists();
  } catch (err) {
    console.error(err);
    setMsg(msg, err.message || String(err), false);
  }
});

// Init
requireAuthUI();
if (authed()) {
  setActivePanel("heroSection");
  Promise.all([refreshHeroPreview(), refreshLists(), refreshOrders()]).catch(console.error);
}

