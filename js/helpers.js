(function () {
  const HELPERS_Head = "";
  const LIST_API_URL =
    "https://meow-service-test.flutterclone.com/api/public/helpers/list?nopaginate=1";
  const INFO_API_URL =
    "https://meow-service-test.flutterclone.com/api/public/helpers/info/";

  let cachedHelpers = null;

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

  async function fetchHelpersList() {
    if (cachedHelpers) return cachedHelpers;
    try {
      const res = await fetch(LIST_API_URL, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to fetch helpers");
      cachedHelpers = normalizeList(await res.json());
      return cachedHelpers;
    } catch (err) {
      console.log("HELPERS LIST GET ERROR /", err);
      return [];
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

  function formatLabel(str) {
    return (str || "").replace(/_/g, " ");
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
    const slide = document.createElement("div");
    slide.className = "swiper-slide";

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
    slide.appendChild(card);
    return slide;
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
    if (!grid) return;

    const helpers = await fetchHelpersList();

    if (skeleton) skeleton.style.display = "none";

    if (!helpers.length) {
      if (empty) empty.classList.remove("hidden");
      return;
    }

    helpers.forEach((helper) => {
      grid.appendChild(createHelperCard(helper));
    });

    const swiperEl = grid.closest(".swiper");
    if (swiperEl && typeof Swiper !== "undefined") {
      new Swiper(swiperEl, {
        slidesPerView: 1.15,
        spaceBetween: 16,
        centeredSlides: true,
        pagination: {
          el: swiperEl.querySelector(".swiper-pagination"),
          clickable: true,
        },
        navigation: {
          nextEl: swiperEl.querySelector(".swiper-button-next"),
          prevEl: swiperEl.querySelector(".swiper-button-prev"),
        },
        breakpoints: {
          640: { slidesPerView: 2.15, spaceBetween: 20, centeredSlides: false },
          1024: { slidesPerView: 3, spaceBetween: 24, centeredSlides: false },
        },
      });
    }
  }

  const FACT_FIELDS = [
    ["nationality", "Nationality"],
    ["gender", "Gender"],
    ["language", "Language"],
    ["religion", "Religion"],
    // ["marital_status", "Marital Status"],
    ["education_level", "Education"],
    ["rest_day_preference", "Rest Day Preference"],
  ];

  function buildFactsHTML(helper) {
    const facts = FACT_FIELDS.filter(([key]) => helper[key]).map(
      ([key, label]) => `
        <div class="helper-detail__fact">
          <div class="helper-detail__fact-label">${label}</div>
          <div class="helper-detail__fact-value">${formatLabel(helper[key])}</div>
        </div>
      `,
    );

    if (typeof helper.years_experience === "number") {
      facts.push(`
        <div class="helper-detail__fact">
          <div class="helper-detail__fact-label">Experience</div>
          <div class="helper-detail__fact-value">${helper.years_experience} year${helper.years_experience === 1 ? "" : "s"}</div>
        </div>
      `);
    }

    if (helper.has_singapore_experience) {
      facts.push(`
        <div class="helper-detail__fact">
          <div class="helper-detail__fact-label">Singapore Experience</div>
          <div class="helper-detail__fact-value">Yes</div>
        </div>
      `);
    }

    return facts.join("");
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
        </div>
      </div>

      <div class="helper-detail__section">
        <h2 class="helper-detail__section-title">Profile</h2>
        <div class="helper-detail__facts">${buildFactsHTML(helper)}</div>
      </div>

      ${buildAssessmentsHTML(helper.skill_assessments)}
    `;
  }

  window.initHelpersSection = initHelpersSection;
  window.initHelperDetails = initHelperDetails;
})();
