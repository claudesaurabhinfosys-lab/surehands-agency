(() => {
  const style = document.createElement("style");
  style.textContent = `
    .back-to-top {
      position: fixed;
      right: 1.5rem;
      bottom: 5.75rem;
      z-index: 49;
      display: grid;
      width: 3rem;
      height: 3rem;
      place-items: center;
      border: 1px solid rgba(255, 255, 255, 0.24);
      border-radius: 999px;
      background: #1d3461;
      color: #fff;
      box-shadow: 0 12px 28px -10px rgba(29, 52, 97, 0.55);
      cursor: pointer;
      opacity: 0;
      pointer-events: none;
      transform: translateY(12px);
      transition: opacity 0.25s ease, transform 0.25s ease, background 0.25s ease;
    }

    .back-to-top.is-visible {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0);
    }

    .back-to-top:hover {
      background: #5c8fbf;
      transform: translateY(-2px);
    }

    .back-to-top:focus-visible {
      outline: 3px solid rgba(92, 143, 191, 0.45);
      outline-offset: 3px;
    }

    @media (prefers-reduced-motion: reduce) {
      .back-to-top {
        transition: none;
      }
    }
  `;
  document.head.appendChild(style);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "back-to-top";
  button.setAttribute("aria-label", "Back to top");
  button.setAttribute("title", "Back to top");
  button.innerHTML = `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 15L12 9L18 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `;
  document.body.appendChild(button);

  const updateVisibility = () => {
    button.classList.toggle("is-visible", window.scrollY > 500);
  };

  button.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  });

  window.addEventListener("scroll", updateVisibility, { passive: true });
  updateVisibility();
})();
