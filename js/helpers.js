(function () {
  const HELPERS_Head = "phs_378abb7a8432abe5af13c4c3d7c39dfe8809e987d5791e81";
  const LIST_API_URL =
    "https://meow-service-test.flutterclone.com/api/public/helpers/list";
  const INFO_API_URL =
    "https://meow-service-test.flutterclone.com/api/public/helpers/info/";
  const HELPERS_PER_PAGE = 8;

  function authHeaders() {
    return { "X-Helpers-Secret": HELPERS_Head, Accept: "application/json" };
  }

  function normalizeList(json) {
    if (Array.isArray(json)) return json;
    if (json && Array.isArray(json.data)) return json.data;
    if (json && json.data && typeof json.data === "object") return [json.data];
    if (json && typeof json === "object" && "id" in json) return [json];
    return [];
  }

  async function fetchHelpersPage(page) {
    const url = `${LIST_API_URL}?status=available&per_page=${HELPERS_PER_PAGE}&page=${page}`;
    try {
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to fetch helpers");
      const json = await res.json();
      const paginator = json && json.data ? json.data : json;
      return {
        items: normalizeList(paginator),
        currentPage: paginator?.current_page || page,
        lastPage: paginator?.last_page || page,
        hasMore: Boolean(paginator?.next_page_url),
      };
    } catch (err) {
      console.log("HELPERS LIST GET ERROR /", err);
      return { items: [], currentPage: page, lastPage: page, hasMore: false };
    }
  }

  async function fetchHelperInfo(id) {
    try {
      const res = await fetch(`${INFO_API_URL}${encodeURIComponent(id)}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch helper");
      const json = await res.json();
      return json && json.data ? json.data : json;
    } catch (err) {
      console.log("HELPER INFO GET ERROR /", err);
      return null;
    }
  }

  function initials(name) {
    return (name || "?")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join("");
  }

  function statusVariant(status) {
    const s = (status || "").toLowerCase();
    if (s === "available") return "available";
    if (s === "assigned") return "assigned";
    return "default";
  }

  function formatLabel(val) {
    return String(val ?? "").replace(/_/g, " ");
  }

  function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-SG", { year: "numeric", month: "short" });
  }

  function getPhotoUrl(helper) {
    return helper.profile_photo_url || "";
  }

  window.handleHelperImgError = function (img, fallbackText) {
    const wrap = img.parentElement;
    img.remove();
    const span = document.createElement("span");
    span.className = "helper-card__initials";
    span.textContent = fallbackText;
    wrap.appendChild(span);
  };

  window.shareHelper = function (name, url) {
    if (navigator.share) {
      navigator
        .share({
          title: `${name} · SureHands Agency`,
          text: `Check out ${name}'s profile on SureHands Agency`,
          url: url,
        })
        .catch(function () {});
    } else {
      navigator.clipboard.writeText(url).then(function () {
        alert("Profile link copied to clipboard!");
      });
    }
  };

  function createHelperCard(helper) {
    const card = document.createElement("a");
    card.href = `helper-details.html?id=${encodeURIComponent(helper.id)}`;
    card.className = "helper-card";

    const photoUrl = getPhotoUrl(helper);
    const name = helper.name || "Helper";
    const status = "Available";
    const skills = helper.skills || "Skills to be confirmed";
    const years = helper.years_experience;
    const exp =
      typeof years === "number" && years > 0
        ? `${years} yr${years > 1 ? "s" : ""} experience`
        : "New helper";

    card.innerHTML = `
      <div class="helper-card__photo-wrap">
        ${
          photoUrl
            ? `<img src="${photoUrl}" alt="${name}" class="helper-card__photo" loading="lazy" onerror="window.handleHelperImgError(this, '${initials(name)}')">`
            : `<span class="helper-card__initials">${initials(name)}</span>`
        }
        ${
          status
            ? `<span class="helper-card__status helper-card__status--${statusVariant(status)}">${formatLabel(status)}</span>`
            : ""
        }
      </div>
      <div class="helper-card__body">
        <div class="helper-card__meta">
          <span>${helper.nationality || "—"}</span>
          ${helper.gender ? `<span class="helper-card__meta-dot"></span><span>${formatLabel(helper.gender)}</span>` : ""}
        </div>
        <h3 class="helper-card__name">${name}</h3>
        <p class="helper-card__skills">${skills}</p>
        <div class="helper-card__footer">
          <span class="helper-card__exp">${exp}</span>
          <span class="helper-card__view">
            View Profile
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
        </div>
      </div>
    `;
    return card;
  }

  function revealCards(selector) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
    );
    document.querySelectorAll(selector).forEach((el) => io.observe(el));
  }

  async function initHelpersSection() {
    const grid = document.getElementById("helpers-grid");
    const skeleton = document.getElementById("helpers-skeleton");
    const empty = document.getElementById("helpers-empty");
    const loadMoreBtn = document.getElementById("helpers-load-more");
    if (!grid) return;

    let page = 1;

    function setLoadMoreState(isLoading) {
      if (!loadMoreBtn) return;
      loadMoreBtn.disabled = isLoading;
      loadMoreBtn.classList.toggle("is-loading", isLoading);
    }

    async function loadPage(targetPage) {
      const { items, currentPage, hasMore } =
        await fetchHelpersPage(targetPage);

      items.forEach((helper) => {
        grid.appendChild(createHelperCard(helper));
      });

      page = currentPage;

      if (loadMoreBtn) {
        loadMoreBtn.classList.toggle("hidden", !hasMore);
      }

      return items.length;
    }

    const firstBatchCount = await loadPage(1);

    if (skeleton) skeleton.style.display = "none";

    if (!firstBatchCount) {
      if (empty) empty.classList.remove("hidden");
      return;
    }

    if (loadMoreBtn) {
      loadMoreBtn.addEventListener("click", async () => {
        setLoadMoreState(true);
        await loadPage(page + 1);
        setLoadMoreState(false);
      });
    }
  }

  const FACT_FIELDS = [
    ["nationality", "Nationality"],
    ["gender", "Gender"],
    ["age", "Age"],
    ["language", "Language"],
    ["education_level", "Education"],
    ["place_of_birth", "Place of Birth"],
    ["rest_day_preference", "Rest Day Preference"],
  ];

  function fact(label, value) {
    return `
      <div class="helper-detail__fact">
        <div class="helper-detail__fact-label">${label}</div>
        <div class="helper-detail__fact-value">${value}</div>
      </div>
    `;
  }

  function buildFactsHTML(helper) {
    const facts = FACT_FIELDS.filter(([key]) => helper[key]).map(
      ([key, label]) =>
        fact(
          label,
          key === "age" ? `${helper.age} yrs` : formatLabel(helper[key]),
        ),
    );

    if (typeof helper.years_experience === "number") {
      facts.push(
        fact(
          "Experience",
          `${helper.years_experience} year${helper.years_experience === 1 ? "" : "s"}`,
        ),
      );
    }

    if (helper.has_singapore_experience) {
      facts.push(fact("Singapore Experience", "Yes"));
    }

    return facts.join("");
  }

  const ABILITY_FIELDS = [
    ["able_to_care_pets", "Cares for pets", "hide_able_to_care_pets"],
    ["able_to_garden", "Gardening", "hide_able_to_garden"],
    ["able_to_sew", "Sewing", "hide_able_to_sew"],
    ["willing_wash_car", "Willing to wash car", "hide_willing_wash_car"],
    ["willing_work_with_another_helper", "Works with another helper", "hide_willing_work_with_another_helper"],
    ["able_to_handle_beef", "Can cook beef", "hide_able_to_handle_beef"],
    ["able_to_handle_pork", "Can cook pork", "hide_able_to_handle_pork"],
  ];

  const FOOD_FIELDS = [
    ["food_no_pork", "Avoids pork"],
    ["food_no_beef", "Avoids beef"],
    ["able_to_handle_pork", "Can cook pork"],
    ["able_to_handle_beef", "Can cook beef"],
  ];

  function boolTag(label) {
    return `<span class="helper-detail__tag helper-detail__tag--yes">${label}</span>`;
  }

  function buildAbilitiesHTML(helper) {
    const fields = ABILITY_FIELDS
      .filter(([, , hideKey]) => !helper[hideKey])
      .map(([key, label]) => ({
        key,
        label,
        value: helper[key],
      }));

    const tags = fields.map(
      (f) => `
      <span class="helper-detail__tag ${f.value ? "helper-detail__tag--yes" : "helper-detail__tag--no"}">${f.label}</span>
    `,
    );

    return `
      <div class="helper-detail__section">
        <h2 class="helper-detail__section-title">Other Information</h2>
        <div class="helper-detail__tags">${tags.join("")}</div>
      </div>
    `;
  }

  function buildAssessmentsHTML(assessments) {
    if (!assessments || !assessments.length) return "";
    const rows = assessments
      .map(
        (a) => `
        <tr>
          <td>${a.area_label || formatLabel(a.area_of_work)}</td>
          <td class="helper-detail__table-center">${a.willingness ? "✓" : "—"}</td>
          <td class="helper-detail__table-center">${a.has_experience ? "✓" : "—"}</td>
          <td class="helper-detail__table-center">${a.years_experience ?? "—"}</td>
        </tr>
      `,
      )
      .join("");

    return `
      <div class="helper-detail__section">
        <h2 class="helper-detail__section-title">Skill Assessment</h2>
        <div class="helper-detail__table-wrap">
          <table class="helper-detail__table">
            <thead>
              <tr>
                <th>Area of Work</th>
                <th style="text-align:center;">Willing</th>
                <th style="text-align:center;">Experienced</th>
                <th style="text-align:center;">Years</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  function buildEmploymentHistoryHTML(histories) {
    if (!histories || !histories.length) return "";

    const sorted = [...histories].sort(
      (a, b) => new Date(b.from_date || 0) - new Date(a.from_date || 0),
    );

    const items = sorted
      .map((h) => {
        const dateRange = [
          formatDate(h.from_date),
          formatDate(h.to_date) || "Present",
        ]
          .filter(Boolean)
          .join(" – ");
        const meta = [
          h.household_size ? `${h.household_size} in household` : "",
          h.housing_type ? formatLabel(h.housing_type) : "",
        ].filter(Boolean);

        return `
          <div class="helper-detail__timeline-item">
            <div class="helper-detail__timeline-head">
              <h3 class="helper-detail__timeline-title">${formatLabel(h.country) || "Overseas"}${h.employer ? ` · ${formatLabel(h.employer)}` : ""}</h3>
              <span class="helper-detail__timeline-date">${dateRange}</span>
            </div>
            ${meta.length ? `<div class="helper-detail__timeline-meta">${meta.join(" · ")}</div>` : ""}
            ${h.work_duties ? `<p class="helper-detail__timeline-duties">${formatLabel(h.work_duties)}</p>` : ""}
          </div>
        `;
      })
      .join("");

    return `
      <div class="helper-detail__section">
        <h2 class="helper-detail__section-title">Work Experience</h2>
        <div class="helper-detail__timeline">${items}</div>
      </div>
    `;
  }

  let videoSwiper = null;

  function buildVideoInterviewsHTML(videos) {
    if (!videos || !videos.length) return "";

    const sorted = [...videos].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    );

    const cards = sorted
      .map(
        (v) => `
        <div class="helper-detail__video-card">
          <video
            controls
            preload="none"
            ${v.thumbnail_url ? `poster="${v.thumbnail_url}"` : ""}
            class="helper-detail__video"
          >
            <source src="${v.video_url}" />
          </video>
          <div class="helper-detail__video-caption">
            <span>${v.title || "Interview"}</span>
            ${v.interviewed_at ? `<span class="helper-detail__video-date">${formatDate(v.interviewed_at)}</span>` : ""}
          </div>
        </div>
      `,
      )
      .join("");

    return `
      <div id="video-interview" class="helper-detail__section" style="scroll-margin-top:96px">
        <h2 class="helper-detail__section-title">Interview Videos</h2>
        <div class="helper-detail__video-grid">${cards}</div>
      </div>
    `;
  }

  function buildVideoInterviewsModalHTML(videos) {
    if (videoSwiper) {
      videoSwiper.destroy(true, true);
      videoSwiper = null;
    }
    if (!videos || !videos.length) return "";

    const sorted = [...videos].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    );

    const slides = sorted
      .map(
        (v) => `
        <div class="swiper-slide">
          <video
            controls
            preload="none"
            ${v.thumbnail_url ? `poster="${v.thumbnail_url}"` : ""}
            class="video-modal__video"
          >
            <source src="${v.video_url}" />
          </video>
          <div class="video-modal__caption">
            <span>${v.title || "Interview"}</span>
            ${v.interviewed_at ? `<span class="video-modal__date">${formatDate(v.interviewed_at)}</span>` : ""}
          </div>
        </div>
      `,
      )
      .join("");

    return `
      <dialog id="video-modal" class="video-modal" aria-label="Interview Videos">
        <div class="video-modal__head">
          <h2 class="video-modal__title">Interview Videos</h2>
          <button type="button" class="video-modal__close" onclick="closeVideoInterviews()" aria-label="Close">&times;</button>
        </div>
        <div class="video-modal__body">
          <div class="swiper">
            <div class="swiper-wrapper">${slides}</div>
            <div class="swiper-button-prev"></div>
            <div class="swiper-button-next"></div>
            <div class="swiper-pagination"></div>
          </div>
        </div>
      </dialog>
    `;
  }

  function pauseAllModalVideos() {
    document
      .querySelectorAll("#video-modal video")
      .forEach((vid) => vid.pause());
  }

  window.openVideoInterviews = function () {
    const modal = document.getElementById("video-modal");
    if (!modal) return;

    if (typeof modal.showModal === "function") modal.showModal();
    else modal.setAttribute("open", "");
    document.body.classList.add("modal-open");

    if (!modal.dataset.bound) {
      modal.dataset.bound = "1";
      modal.addEventListener("close", () => {
        pauseAllModalVideos();
        document.body.classList.remove("modal-open");
      });
      // click on the backdrop (outside the dialog box) closes it
      modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.close();
      });
    }

    if (typeof Swiper === "function") {
      if (!videoSwiper) {
        videoSwiper = new Swiper(modal.querySelector(".swiper"), {
          slidesPerView: 1,
          spaceBetween: 24,
          navigation: {
            nextEl: modal.querySelector(".swiper-button-next"),
            prevEl: modal.querySelector(".swiper-button-prev"),
          },
          pagination: {
            el: modal.querySelector(".swiper-pagination"),
            clickable: true,
          },
        });
        videoSwiper.on("slideChange", pauseAllModalVideos);
      } else {
        videoSwiper.update();
      }
    }
  };

  window.closeVideoInterviews = function () {
    const modal = document.getElementById("video-modal");
    if (!modal) return;
    if (typeof modal.close === "function") modal.close();
    else {
      modal.removeAttribute("open");
      pauseAllModalVideos();
      document.body.classList.remove("modal-open");
    }
  };

  function buildAppointmentModalHTML(helper) {
    const name = helper.name || "Helper";
    const details = [
      helper.nationality ? `Nationality: ${formatLabel(helper.nationality)}` : "",
      helper.gender ? `Gender: ${formatLabel(helper.gender)}` : "",
      typeof helper.years_experience === "number" ? `Experience: ${helper.years_experience} year${helper.years_experience === 1 ? "" : "s"}` : "",
      helper.skills ? `Skills: ${helper.skills}` : "",
    ].filter(Boolean).join("%0A");
    const waMsg = encodeURIComponent(`Hi SureHands, I'd like to book an appointment with ${name}.`) + (details ? "%0A%0A" + details : "");
    return `
      <dialog id="appt-modal" class="appt-modal" aria-label="Book Appointment">
        <div class="appt-modal__head">
          <h2 class="appt-modal__title">Book Appointment</h2>
          <button type="button" class="appt-modal__close" onclick="closeBookAppointment()" aria-label="Close">&times;</button>
        </div>
        <div class="appt-modal__body">
          <div class="appt-modal__section">
            <div class="appt-modal__label">Questions? Contact us</div>
            <a href="https://wa.me/6588071780?text=${waMsg}" target="_blank" rel="noopener noreferrer" class="appt-modal__btn-wa">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.05 4.91A10 10 0 0 0 4.9 19.06L4 23l4.07-1.06A10 10 0 1 0 19.05 4.91Zm-7.05 16a8 8 0 0 1-4.07-1.12l-.29-.17-2.4.63.64-2.34-.19-.3A8 8 0 1 1 12 20.91Zm4.4-5.96c-.24-.12-1.43-.71-1.65-.79-.22-.08-.38-.12-.55.12-.16.24-.63.79-.77.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.36.1-.48.1-.1.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.32-.75-1.81-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.7 2.6 4.13 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.43-.58 1.63-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z"/></svg>
              WhatsApp Us
            </a>
          </div>
          <div class="appt-modal__section">
            <div class="appt-modal__label">Book an appointment on Le Meow app</div>
            <div style="display:flex;gap:12px">
              <a href="https://apps.apple.com/my/app/le-meow/id6763483119" target="_blank" rel="noopener noreferrer" class="appt-modal__btn-app">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                App Store
              </a>
              <a href="https://play.google.com/store/apps/details?id=com.meow.lemeow" target="_blank" rel="noopener noreferrer" class="appt-modal__btn-app">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 20.5V3.5C3 2.91 3.34 2.39 3.84 2.15L13.69 12L3.84 21.85C3.34 21.61 3 21.09 3 20.5ZM16.81 15.12L6.05 21.34L14.54 12.85L16.81 15.12ZM20.16 10.81C20.5 11.08 20.75 11.5 20.75 12C20.75 12.5 20.5 12.92 20.16 13.19L17.89 14.5L15.39 12L17.89 9.5L20.16 10.81ZM6.05 2.66L16.81 8.88L14.54 11.15L6.05 2.66Z"/></svg>
                Google Play
              </a>
            </div>
          </div>
        </div>
      </dialog>
    `;
  }

  window.openBookAppointment = function () {
    const modal = document.getElementById("appt-modal");
    if (!modal) return;
    if (typeof modal.showModal === "function") modal.showModal();
    else modal.setAttribute("open", "");
    document.body.classList.add("modal-open");

    if (!modal.dataset.bound) {
      modal.dataset.bound = "1";
      modal.addEventListener("close", () => {
        document.body.classList.remove("modal-open");
      });
      modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.close();
      });
    }
  };

  window.closeBookAppointment = function () {
    const modal = document.getElementById("appt-modal");
    if (!modal) return;
    if (typeof modal.close === "function") modal.close();
    else {
      modal.removeAttribute("open");
      document.body.classList.remove("modal-open");
    }
  };

  async function initHelperDetails() {
    const container = document.getElementById("helper-detail-content");
    const notFound = document.getElementById("helper-not-found");
    const skeleton = document.getElementById("helper-detail-skeleton");
    if (!container) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) {
      if (skeleton) skeleton.style.display = "none";
      if (notFound) notFound.classList.remove("hidden");
      return;
    }

    const helper = await fetchHelperInfo(id);

    if (skeleton) skeleton.style.display = "none";

    if (!helper) {
      if (notFound) notFound.classList.remove("hidden");
      return;
    }

    document.title = `${helper.name} · SureHands Agency`;

    const photoUrl = getPhotoUrl(helper);
    const name = helper.name || "Helper";
    const status = "Available";
    const hasVideoInterviews = Array.isArray(helper.video_interviews)
      ? helper.video_interviews.length > 0
      : false;

    container.innerHTML = `
      <a href="index.html#helpers" class="helper-detail__back">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M13 6l-6 6 6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Back to all helpers
      </a>

      <div class="helper-detail__hero">
        <div class="helper-detail__photo-wrap">
          ${
            photoUrl
              ? `<img src="${photoUrl}" alt="${name}" class="helper-detail__photo" onerror="window.handleHelperImgError(this, '${initials(name)}')">`
              : `<span class="helper-card__initials">${initials(name)}</span>`
          }
        </div>
        <div class="helper-detail__intro">
          ${
            status
              ? `<span class="helper-card__status helper-card__status--${statusVariant(status)}" style="position:static;display:inline-flex;margin-bottom:14px">${formatLabel(status)}</span>`
              : ""
          }
          <h1 class="helper-detail__name">${name}</h1>
          <p class="helper-detail__skills">${helper.skills || "Skills to be confirmed"}</p>
          <button type="button" class="btn-share mt-6" onclick="shareHelper('${name.replace(/'/g, "\\'")}', '${window.location.href}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            Share ${name.split(" ")[0]}'s Profile
          </button>
          ${
            hasVideoInterviews
              ? `<button type="button" class="btn-share mt-6 sm:ml-3" onclick="openVideoInterviews()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
            Interview Videos
          </button>`
              : ""
          }

          <button type="button" class="btn-share mt-6" onclick="openBookAppointment()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Book Appointment
          </button>
          </div>
      </div>

      <div class="helper-detail__section">
        <h2 class="helper-detail__section-title">Profile</h2>
        <div class="helper-detail__facts">${buildFactsHTML(helper)}</div>
      </div>

      ${buildAssessmentsHTML(helper.skill_assessments)}
      ${buildAbilitiesHTML(helper)}
      ${buildEmploymentHistoryHTML(helper.employment_histories)}
      ${buildVideoInterviewsHTML(helper.video_interviews)}
      ${buildVideoInterviewsModalHTML(helper.video_interviews)}
      ${buildAppointmentModalHTML(helper)}
    `;
  }

  window.initHelpersSection = initHelpersSection;
  window.initHelperDetails = initHelperDetails;
})();
