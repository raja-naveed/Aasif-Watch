/** Pakistan checkout address fields + live location autofill */

export const PK_PROVINCES = {
  Sindh: [
    "Karachi",
    "Hyderabad",
    "Sukkur",
    "Larkana",
    "Mirpur Khas",
    "Nawabshah",
    "Jacobabad",
    "Shikarpur",
    "Thatta",
  ],
  Punjab: [
    "Lahore",
    "Faisalabad",
    "Rawalpindi",
    "Multan",
    "Gujranwala",
    "Sialkot",
    "Bahawalpur",
    "Sargodha",
    "Gujrat",
  ],
  "Khyber Pakhtunkhwa": [
    "Peshawar",
    "Mardan",
    "Abbottabad",
    "Swat",
    "Kohat",
    "Bannu",
    "Dera Ismail Khan",
  ],
  Balochistan: ["Quetta", "Gwadar", "Turbat", "Khuzdar", "Chaman"],
  "Islamabad Capital Territory": ["Islamabad"],
  Gilgit: ["Gilgit", "Skardu"],
  "Azad Kashmir": ["Muzaffarabad", "Mirpur"],
};

/** Cities we currently deliver to (Karachi & nearby) */
export const DELIVERY_CITIES = new Set(["Karachi", "Hyderabad"]);

const KARACHI_AREAS = [
  "Orangi Town",
  "SITE Area",
  "Manghopir",
  "North Nazimabad",
  "Gulshan-e-Iqbal",
  "Gulistan-e-Johar",
  "PECHS",
  "Clifton",
  "DHA",
  "Saddar",
  "Korangi",
  "Landhi",
  "Malir",
  "Lyari",
  "Baldia Town",
  "Surjani Town",
  "Federal B Area",
  "Nazimabad",
  "Buffer Zone",
  "Shah Faisal",
];

const PROVINCE_ALIASES = {
  sindh: "Sindh",
  punjab: "Punjab",
  "khyber pakhtunkhwa": "Khyber Pakhtunkhwa",
  kp: "Khyber Pakhtunkhwa",
  balochistan: "Balochistan",
  "islamabad capital territory": "Islamabad Capital Territory",
  ict: "Islamabad Capital Territory",
  islamabad: "Islamabad Capital Territory",
  gilgit: "Gilgit",
  "gilgit-baltistan": "Gilgit",
  "azad kashmir": "Azad Kashmir",
  "azad jammu and kashmir": "Azad Kashmir",
};

function $(id) {
  return document.getElementById(id);
}

function normalizeProvince(raw) {
  if (!raw) return "";
  const key = String(raw).trim().toLowerCase();
  return PROVINCE_ALIASES[key] || raw.trim();
}

function populateProvinceSelect() {
  const sel = $("coProvince");
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = `<option value="">Select province</option>`;
  for (const p of Object.keys(PK_PROVINCES)) {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p;
    sel.appendChild(opt);
  }
  sel.value = current || "Sindh";
}

function populateCitySelect(province) {
  const sel = $("coCity");
  if (!sel) return;
  const cities = PK_PROVINCES[province] || [];
  sel.innerHTML = `<option value="">Select city</option>`;
  for (const c of cities) {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    sel.appendChild(opt);
  }
  if (cities.includes("Karachi")) sel.value = "Karachi";
  updateDeliveryNotice();
  updateAreaField();
}

function populateAreaSelect(city) {
  const sel = $("coArea");
  if (!sel || sel.tagName !== "SELECT") return;
  sel.innerHTML = `<option value="">Select area / town</option>`;
  const list = city === "Karachi" ? KARACHI_AREAS : [];
  for (const a of list) {
    const opt = document.createElement("option");
    opt.value = a;
    opt.textContent = a;
    sel.appendChild(opt);
  }
}

function updateAreaField() {
  const city = $("coCity")?.value || "";
  const wrap = $("coAreaWrap");
  const current = $("coArea");
  if (!wrap || !current) return;

  const isKarachi = city === "Karachi";
  if (isKarachi && current.tagName === "INPUT") {
    const sel = document.createElement("select");
    sel.id = "coArea";
    sel.className = current.className;
    sel.required = true;
    wrap.replaceChild(sel, current);
    populateAreaSelect("Karachi");
  } else if (!isKarachi && current.tagName === "SELECT") {
    const inp = document.createElement("input");
    inp.id = "coArea";
    inp.className = current.className;
    inp.required = true;
    inp.placeholder = "Area / town / locality";
    wrap.replaceChild(inp, current);
  }
}

function updateDeliveryNotice() {
  const city = $("coCity")?.value || "";
  const notice = $("coDeliveryNotice");
  if (!notice) return;
  if (!city) {
    notice.textContent = "Delivery available in Karachi & nearby areas only.";
    notice.className = "checkout-notice";
    return;
  }
  if (DELIVERY_CITIES.has(city)) {
    notice.textContent =
      city === "Karachi"
        ? "✓ Delivery available in your selected Karachi area."
        : "✓ Delivery available in Hyderabad & nearby Sindh areas.";
    notice.className = "checkout-notice checkout-notice--ok";
  } else {
    notice.textContent = "We currently deliver in Karachi & Hyderabad (nearby) only. Please select a supported city.";
    notice.className = "checkout-notice checkout-notice--warn";
  }
}

function fillFromGeocode(data) {
  const addr = data?.address || {};
  const province = normalizeProvince(addr.state || addr.region || "");
  const city =
    addr.city || addr.town || addr.city_district || addr.county || addr.state_district || "";
  const area =
    addr.suburb || addr.neighbourhood || addr.quarter || addr.residential || addr.village || "";
  const road = [addr.house_number, addr.road || addr.pedestrian || addr.footway]
    .filter(Boolean)
    .join(", ");
  const landmark = addr.amenity || addr.building || "";

  if ($("coProvince") && province) {
    populateProvinceSelect();
    if (PK_PROVINCES[province]) {
      $("coProvince").value = province;
      populateCitySelect(province);
    }
  }

  if ($("coCity") && city) {
    const citySel = $("coCity");
    const match = [...citySel.options].find(
      (o) => o.value.toLowerCase() === city.toLowerCase() || city.toLowerCase().includes(o.value.toLowerCase())
    );
    if (match) {
      citySel.value = match.value;
    } else {
      const opt = document.createElement("option");
      opt.value = city;
      opt.textContent = city;
      citySel.appendChild(opt);
      citySel.value = city;
    }
    updateAreaField();
    updateDeliveryNotice();
  }

  const areaEl = $("coArea");
  if (areaEl && area) {
    if (areaEl.tagName === "SELECT") {
      const areaMatch = [...areaEl.options].find((o) =>
        o.value.toLowerCase().includes(area.toLowerCase())
      );
      if (areaMatch) areaEl.value = areaMatch.value;
      else {
        const opt = document.createElement("option");
        opt.value = area;
        opt.textContent = area;
        areaEl.appendChild(opt);
        areaEl.value = area;
      }
    } else {
      areaEl.value = area;
    }
  }

  if ($("coStreet") && road) $("coStreet").value = road;
  if ($("coLandmark") && landmark) $("coLandmark").value = landmark;
}

export async function useMyLocation() {
  const btn = $("coLocateBtn");
  const msg = $("checkoutMsg");
  const original = btn?.innerHTML;

  if (!navigator.geolocation) {
    if (msg) msg.textContent = "Location is not supported on this device.";
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> Locating…`;
  }
  if (msg) msg.textContent = "Fetching your location…";

  try {
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 60000,
      });
    });

    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    if ($("coLat")) $("coLat").value = String(lat);
    if ($("coLng")) $("coLng").value = String(lng);

    const url = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&format=json&addressdetails=1&accept-language=en`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("Could not resolve address from location.");
    const data = await res.json();
    if (data?.address?.country_code && data.address.country_code.toLowerCase() !== "pk") {
      throw new Error("Your location appears outside Pakistan. Please enter a Pakistan delivery address.");
    }
    fillFromGeocode(data);
    if (msg) msg.textContent = "Address filled from your location. Please verify before placing order.";
  } catch (err) {
    console.error(err);
    const text =
      err?.code === 1
        ? "Location permission denied. Allow location access or enter address manually."
        : err?.message || "Could not fetch location. Please enter address manually.";
    if (msg) msg.textContent = text;
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = original || `<i class='bx bx-map'></i> Use My Location`;
    }
  }
}

export function getCheckoutFormData() {
  const customer_name = $("coName")?.value.trim() || "";
  const phone = $("coPhone")?.value.trim() || "";
  const province = $("coProvince")?.value.trim() || "";
  const city = $("coCity")?.value.trim() || "";
  const area = $("coArea")?.value.trim() || "";
  const street = $("coStreet")?.value.trim() || "";
  const landmark = $("coLandmark")?.value.trim() || "";
  const lat = $("coLat")?.value.trim() || "";
  const lng = $("coLng")?.value.trim() || "";

  const errors = [];
  if (!customer_name) errors.push("Full name is required.");
  if (!phone) errors.push("Mobile number is required.");
  else if (!/^(\+92|0)?3[0-9]{9}$/.test(phone.replace(/[\s-]/g, ""))) {
    errors.push("Enter a valid Pakistan mobile number (e.g. 03XX XXXXXXX).");
  }
  if (!province) errors.push("Province is required.");
  if (!city) errors.push("City is required.");
  if (!DELIVERY_CITIES.has(city)) {
    errors.push("Delivery is available in Karachi & Hyderabad (nearby) only.");
  }
  if (!area) errors.push("Area / town is required.");
  if (!street) errors.push("Street / house / plot number is required.");

  const parts = [street, area, city, province, "Pakistan"].filter(Boolean);
  let address = parts.join(", ");
  if (landmark) address += ` (Landmark: ${landmark})`;
  if (lat && lng) address += ` [GPS: ${lat}, ${lng}]`;

  return {
    customer_name,
    phone: phone.replace(/[\s-]/g, ""),
    address,
    province,
    city,
    area,
    street,
    landmark,
    lat,
    lng,
    errors,
    valid: errors.length === 0,
  };
}

export function resetCheckoutAddressForm() {
  populateProvinceSelect();
  populateCitySelect("Sindh");
  if ($("coLat")) $("coLat").value = "";
  if ($("coLng")) $("coLng").value = "";
  updateDeliveryNotice();
}

export function initCheckoutAddressForm() {
  populateProvinceSelect();
  populateCitySelect($("coProvince")?.value || "Sindh");

  $("coProvince")?.addEventListener("change", (e) => {
    populateCitySelect(e.target.value);
  });

  $("coCity")?.addEventListener("change", () => {
    updateAreaField();
    updateDeliveryNotice();
  });

  $("coLocateBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    useMyLocation();
  });

  updateDeliveryNotice();
}

export const CHECKOUT_ADDRESS_HTML = `
  <div class="checkout-section">
    <div class="checkout-section__head">
      <span class="checkout-section__title">Delivery Address (Pakistan)</span>
      <button type="button" class="checkout-locate-btn" id="coLocateBtn" title="Use my live location">
        <i class='bx bx-map'></i> Use My Location
      </button>
    </div>
    <p class="checkout-notice" id="coDeliveryNotice">Delivery available in Karachi &amp; nearby areas only.</p>
  </div>

  <div class="checkout-grid checkout-grid--2">
    <label class="checkout-field">
      <span>Province *</span>
      <select id="coProvince" class="checkout-input" required></select>
    </label>
    <label class="checkout-field">
      <span>City *</span>
      <select id="coCity" class="checkout-input" required></select>
    </label>
  </div>

  <label class="checkout-field">
    <span>Area / Town *</span>
    <div id="coAreaWrap">
      <select id="coArea" class="checkout-input" required></select>
    </div>
  </label>

  <label class="checkout-field">
    <span>Street / House / Plot No. *</span>
    <input id="coStreet" class="checkout-input" required placeholder="e.g. House 12, Street 5, Sector 4-B" />
  </label>

  <label class="checkout-field">
    <span>Landmark <em style="font-style:normal;opacity:.6">(optional)</em></span>
    <input id="coLandmark" class="checkout-input" placeholder="e.g. Near market, masjid, main road" />
  </label>

  <input type="hidden" id="coLat" />
  <input type="hidden" id="coLng" />
`;
