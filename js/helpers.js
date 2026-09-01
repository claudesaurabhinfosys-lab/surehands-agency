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
    `;
  }

  window.initHelpersSection = initHelpersSection;
  window.initHelperDetails = initHelperDetails;
})();
