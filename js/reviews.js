(function () {
  const API_URL =
    "https://meow-service-test.flutterclone.com/api/sites/surehandagency-1785928272/reviews?nopaginate=1";
  const API_KEY = "site_237478a3ef018d77b8e9583957974d0add4db9b144a9ee63";

  let cachedReviews = null;

  async function fetchReviews() {
    if (cachedReviews) return cachedReviews;
    try {
      const res = await fetch(API_URL, {
        headers: {
          "x-site-api-key": API_KEY,
          Accept: "application/json",
        },
      });
      if (!res.ok) throw new Error("Failed to fetch reviews");
      const json = await res.json();
      const data = json?.data ?? [];
      cachedReviews = Array.isArray(data) ? data : [data];
      return cachedReviews;
    } catch (err) {
      console.log("REVIEWS GET ERROR /", err);
      return [];
    }
  }

  function getInitial(name) {
    return name ? name.charAt(0).toUpperCase() : "?";
  }

  function renderStars(count) {
    const n = Math.min(Math.max(parseInt(count, 10) || 5, 0), 5);
    return Array.from({ length: n }, () => "★").join(" ");
  }

  function createReviewCard(review, index) {
    const delay = index % 3 === 1 ? " d1" : index % 3 === 2 ? " d2" : "";
    const name =
      review.user_name || review.name || review.customer_name || "Anonymous";
    const description =
      review.review || review.caption || review.description || review.comment || "";
    const imageUrl = review.image_url || "";
    const subtitle =
      review.outlet_name || review.category_name || review.location || "";

    const card = document.createElement("figure");
    card.className = "soft-card p-8 reveal" + delay;
    card.innerHTML = `
      <div class="text-warm tracking-wider">${renderStars(review.rating ?? 5)}</div>
      <blockquote
        style="font-family: &quot;Fraunces&quot;, serif"
        class="text-xl mt-5 leading-snug"
      >
        "${description}"
      </blockquote>
      <figcaption class="mt-6 flex items-center gap-3">
        ${
          imageUrl
            ? `<img src="${imageUrl}" alt="${name}" class="w-10 h-10 rounded-full object-cover" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'"><span class="w-10 h-10 rounded-full bg-soft text-deep grid place-items-center font-bold" style="display:none">${getInitial(name)}</span>`
            : `<span class="w-10 h-10 rounded-full bg-soft text-deep grid place-items-center font-bold">${getInitial(name)}</span>`
        }
        <div>
          <div class="text-sm font-semibold">${name}</div>
          <div class="text-xs text-mist">${subtitle}</div>
        </div>
      </figcaption>
    `;
    return card;
  }

  function revealNewCards() {
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
    document
      .querySelectorAll("#reviews-grid .soft-card.reveal")
      .forEach((el) => io.observe(el));
  }

  function createFallbackCard(text, name, location, initial, index) {
    const delay = index % 3 === 1 ? " d1" : index % 3 === 2 ? " d2" : "";
    const card = document.createElement("figure");
    card.className = "soft-card p-8 reveal" + delay;
    card.innerHTML = `
      <div class="text-warm tracking-wider">★ ★ ★ ★ ★</div>
      <blockquote
        style="font-family: &quot;Fraunces&quot;, serif"
        class="text-xl mt-5 leading-snug"
      >
        "${text}"
      </blockquote>
      <figcaption class="mt-6 flex items-center gap-3">
        <span class="w-10 h-10 rounded-full bg-soft text-deep grid place-items-center font-bold">${initial}</span>
        <div>
          <div class="text-sm font-semibold">${name}</div>
          <div class="text-xs text-mist">${location}</div>
        </div>
      </figcaption>
    `;
    return card;
  }

  const FALLBACK_REVIEWS = [
    { text: "They didn't try to sell us anyone. They actually listened, then waited two weeks for someone who fit my mum's care needs. She's been with us 18 months now.", name: "Jeremy & Hui Min", location: "Eldercare · Bishan", initial: "J" },
    { text: "First-time employers and we were nervous. SureHands walked us through everything — costs, paperwork, even how to set house rules. Felt cared for the whole way.", name: "Nadia & Faisal", location: "Newborn family · Punggol", initial: "N" },
    { text: "What stood out was the aftercare. Six months in, they still check in to see how our helper and our family are getting along. That's not normal in this industry.", name: "Priya R.", location: "Working couple · Tampines", initial: "P" },
    { text: "Our previous transfer didn't work out and we were exhausted. SureHands helped us regroup, sat with us patiently, and re-matched us. Night and day difference.", name: "Lim Family", location: "Transfer match · Sengkang", initial: "L" },
    { text: "They told me honestly that one candidate I liked wasn't right for us. I appreciated that — most agencies would just close the deal. We ended up with someone perfect.", name: "Aisyah K.", location: "Twin toddlers · Woodlands", initial: "A" },
    { text: "Renewal handled smoothly, paperwork done early, and they reminded us about every deadline. Just calm, professional service from start to finish.", name: "Mr & Mrs Tan", location: "Renewal · Bedok", initial: "M" },
  ];

  async function initReviewsSection() {
    const grid = document.getElementById("reviews-grid");
    const fallbackEl = document.getElementById("reviews-fallback");
    if (!grid) return;

    const reviews = await fetchReviews();

    let idx = 0;

    if (reviews.length > 0) {
      const display = reviews.slice(0, 6);
      display.forEach((review) => {
        grid.appendChild(createReviewCard(review, idx++));
      });
    }

    FALLBACK_REVIEWS.forEach((fb) => {
      grid.appendChild(createFallbackCard(fb.text, fb.name, fb.location, fb.initial, idx++));
    });

    if (fallbackEl) fallbackEl.remove();

    revealNewCards();
  }

  window.initReviewsSection = initReviewsSection;
})();
