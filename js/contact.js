(() => {
  const SITE_SLUG = "surehandagency-1785928272";
  const API_KEY = "site_237478a3ef018d77b8e9583957974d0add4db9b144a9ee63";
  const BASE_URL = "https://meow-service-test.flutterclone.com";

  const container = document.getElementById("surehandsContactContainer");
  if (!container) return;

  container.innerHTML = `
    <div class="sh-loading">
      <div class="sh-spinner"></div>
      <p>Loading consultation enquiry form...</p>
    </div>
  `;

  let formFields = [];

  async function fetchFields() {
    try {
      const res = await fetch(`${BASE_URL}/api/sites/${SITE_SLUG}/contact-fields`, {
        headers: {
          "X-Site-Api-Key": API_KEY,
          Accept: "application/json",
        },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load form fields");
      }
      formFields = (json.data || [])
        .filter((f) => f.is_active !== false)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      renderForm(formFields);
    } catch (err) {
      console.error("Error loading contact fields:", err);
      container.innerHTML = `
        <div class="sh-error-box">
          <p>Unable to load the enquiry form right now.</p>
          <button type="button" class="btn-ghost" id="shRetryBtn" style="margin-top:12px;">Retry</button>
        </div>
      `;
      document.getElementById("shRetryBtn")?.addEventListener("click", fetchFields);
    }
  }

  function renderForm(fields) {
    if (!fields || fields.length === 0) {
      container.innerHTML = `
        <div class="sh-empty">
          <p>No contact options currently configured.</p>
        </div>
      `;
      return;
    }

    const form = document.createElement("form");
    form.id = "surehandsContactForm";
    form.className = "sh-contact-form";
    form.noValidate = true;

    const feedback = document.createElement("div");
    feedback.id = "shFormFeedback";
    feedback.className = "sh-feedback";
    feedback.style.display = "none";
    form.appendChild(feedback);

    const grid = document.createElement("div");
    grid.className = "sh-form-grid";

    fields.forEach((field) => {
      const fieldWrapper = document.createElement("div");
      fieldWrapper.className = `sh-field-group sh-type-${field.type} ${
        field.type === "textarea" ? "sh-field-full" : ""
      }`;
      fieldWrapper.dataset.key = field.field_key;

      const label = document.createElement("label");
      label.className = "sh-label";
      label.htmlFor = `sh_field_${field.field_key}`;
      label.innerHTML = `${escapeHtml(field.label)}${
        field.is_required ? ' <span class="sh-req">*</span>' : ""
      }`;
      fieldWrapper.appendChild(label);

      let inputEl;

      if (field.type === "textarea") {
        inputEl = document.createElement("textarea");
        inputEl.rows = 4;
      } else if (field.type === "select") {
        inputEl = document.createElement("select");
        const defaultOpt = document.createElement("option");
        defaultOpt.value = "";
        defaultOpt.textContent = field.placeholder || `-- Select ${field.label} --`;
        inputEl.appendChild(defaultOpt);

        const options = Array.isArray(field.options)
          ? field.options
          : typeof field.options === "string"
          ? JSON.parse(field.options || "[]")
          : [];

        options.forEach((opt) => {
          const optEl = document.createElement("option");
          optEl.value = typeof opt === "object" ? opt.value || opt.label : opt;
          optEl.textContent = typeof opt === "object" ? opt.label || opt.value : opt;
          inputEl.appendChild(optEl);
        });
      } else if (field.type === "checkbox") {
        const options = Array.isArray(field.options) ? field.options : [];
        if (options.length > 0) {
          inputEl = document.createElement("div");
          inputEl.className = "sh-checkbox-group";
          options.forEach((opt, idx) => {
            const val = typeof opt === "object" ? opt.value || opt.label : opt;
            const text = typeof opt === "object" ? opt.label || opt.value : opt;
            const cId = `sh_chk_${field.field_key}_${idx}`;
            const cWrap = document.createElement("label");
            cWrap.className = "sh-chk-label";
            cWrap.innerHTML = `
              <input type="checkbox" name="${field.field_key}" value="${escapeHtml(val)}" id="${cId}" />
              <span>${escapeHtml(text)}</span>
            `;
            inputEl.appendChild(cWrap);
          });
        } else {
          inputEl = document.createElement("input");
          inputEl.type = "checkbox";
          inputEl.name = field.field_key;
        }
      } else {
        inputEl = document.createElement("input");
        if (field.type === "email") inputEl.type = "email";
        else if (field.type === "phone") inputEl.type = "tel";
        else if (field.type === "number") inputEl.type = "number";
        else if (field.type === "date") inputEl.type = "date";
        else inputEl.type = "text";
      }

      if (field.type !== "checkbox" || !Array.isArray(field.options) || field.options.length === 0) {
        inputEl.id = `sh_field_${field.field_key}`;
        inputEl.name = field.field_key;
        inputEl.className = "sh-input";
        if (field.placeholder) inputEl.placeholder = field.placeholder;
        if (field.is_required) inputEl.required = true;
      }

      fieldWrapper.appendChild(inputEl);

      const errEl = document.createElement("div");
      errEl.className = "sh-field-error";
      errEl.id = `sh_err_${field.field_key}`;
      errEl.style.display = "none";
      fieldWrapper.appendChild(errEl);

      grid.appendChild(fieldWrapper);
    });

    form.appendChild(grid);

    const submitWrap = document.createElement("div");
    submitWrap.className = "sh-submit-wrap";
    submitWrap.innerHTML = `
      <button type="submit" class="sh-submit-btn" id="shSubmitBtn">
        <span class="sh-btn-text">Submit Enquiry</span>
        <span class="sh-btn-loader" style="display:none;">
          <span class="sh-mini-spinner"></span> Submitting...
        </span>
      </button>
    `;
    form.appendChild(submitWrap);

    container.innerHTML = "";
    container.appendChild(form);

    form.addEventListener("submit", handleSubmit);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = document.getElementById("shSubmitBtn");

    clearErrors();
    hideFeedback();

    const payloadData = {};
    let clientError = false;

    formFields.forEach((field) => {
      const key = field.field_key;
      if (field.type === "checkbox" && Array.isArray(field.options) && field.options.length > 0) {
        const checked = form.querySelectorAll(`input[name="${key}"]:checked`);
        const vals = Array.from(checked).map((c) => c.value);
        if (field.is_required && vals.length === 0) {
          showFieldError(key, `${field.label} is required.`);
          clientError = true;
        }
        payloadData[key] = vals.join(", ");
      } else if (field.type === "checkbox") {
        const el = form.querySelector(`input[name="${key}"]`);
        if (field.is_required && !el.checked) {
          showFieldError(key, `${field.label} is required.`);
          clientError = true;
        }
        payloadData[key] = el.checked ? "Yes" : "No";
      } else {
        const el = form.querySelector(`[name="${key}"]`);
        const val = el ? el.value.trim() : "";
        if (field.is_required && !val) {
          showFieldError(key, `${field.label} is required.`);
          clientError = true;
        } else if (val && field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
          showFieldError(key, "Please enter a valid email address.");
          clientError = true;
        }
        payloadData[key] = val;
      }
    });

    if (clientError) {
      showFeedback("Please complete all required fields accurately.", "error");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/api/sites/${SITE_SLUG}/contact-enquiries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Site-Api-Key": API_KEY,
        },
        body: JSON.stringify({ data: payloadData }),
      });

      const result = await res.json();

      if (res.status === 200 && result.success) {
        showFeedback(
          result.message || "Thank you! Your enquiry has been received. Our matching specialist will contact you promptly.",
          "success"
        );
        form.reset();
      } else if (res.status === 422) {
        const errData = result.data || {};
        let firstMsg = result.message || "Validation failed";
        Object.keys(errData).forEach((rawKey) => {
          const cleanKey = rawKey.replace(/^data\./, "");
          const msg = Array.isArray(errData[rawKey]) ? errData[rawKey][0] : errData[rawKey];
          showFieldError(cleanKey, msg);
        });
        showFeedback(firstMsg, "error");
      } else {
        throw new Error(result.message || `Server returned error (${res.status})`);
      }
    } catch (err) {
      console.error("Submission error:", err);
      showFeedback(
        err.message || "Something went wrong while submitting. Please try again.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  function setLoading(isLoading) {
    const btn = document.getElementById("shSubmitBtn");
    if (!btn) return;
    btn.disabled = isLoading;
    const textSpan = btn.querySelector(".sh-btn-text");
    const loaderSpan = btn.querySelector(".sh-btn-loader");
    if (textSpan) textSpan.style.display = isLoading ? "none" : "inline";
    if (loaderSpan) loaderSpan.style.display = isLoading ? "inline-flex" : "none";
  }

  function showFieldError(key, message) {
    const errEl = document.getElementById(`sh_err_${key}`);
    const grp = document.querySelector(`.sh-field-group[data-key="${key}"]`);
    if (errEl) {
      errEl.textContent = message;
      errEl.style.display = "block";
    }
    if (grp) grp.classList.add("has-error");
  }

  function clearErrors() {
    document.querySelectorAll(".sh-field-error").forEach((el) => {
      el.textContent = "";
      el.style.display = "none";
    });
    document.querySelectorAll(".sh-field-group.has-error").forEach((el) => {
      el.classList.remove("has-error");
    });
  }

  function showFeedback(msg, type) {
    const fb = document.getElementById("shFormFeedback");
    if (!fb) return;
    fb.textContent = msg;
    fb.className = `sh-feedback sh-feedback-${type}`;
    fb.style.display = "block";
  }

  function hideFeedback() {
    const fb = document.getElementById("shFormFeedback");
    if (!fb) return;
    fb.style.display = "none";
    fb.textContent = "";
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  fetchFields();
})();
