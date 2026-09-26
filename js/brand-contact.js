(function () {
  "use strict";

  const script = document.currentScript;
  const brandSlug = script?.dataset.brandSlug;
  const apiUrl = "https://meow-service-test.flutterclone.com/api/user/brand";
  if (!brandSlug) return;

  const getContactContainer = (element) => {
    const row = element.closest("[data-brand-contact-item], .info-row");
    const listItem = element.closest("li");
    const labelledItem =
      listItem && /^(phone|email|whatsapp|address)\b/i.test(listItem.textContent.trim());
    return row || (labelledItem ? listItem : element);
  };

  const hideContactElement = (element) => {
    getContactContainer(element).hidden = true;
  };

  const setLink = (anchor, value, type) => {
    if (!value) return;

    const original = new URL(anchor.href, window.location.href);
    if (type === "phone") {
      const digits = value.replace(/\D/g, "");
      anchor.href =
        original.hostname === "wa.me"
          ? `https://wa.me/${digits}${original.search}`
          : `tel:${value.replace(/\s/g, "")}`;
      if (anchor.hasAttribute("data-brand-phone-label")) anchor.textContent = value;
      else if (/^\+?[\d\s()-]+$/.test(anchor.textContent.trim())) anchor.textContent = value;
    } else {
      anchor.href = `mailto:${value}${original.search}`;
      if (anchor.hasAttribute("data-brand-email-label") || anchor.textContent.includes("@")) {
        anchor.textContent = value;
      }
    }

    anchor.hidden = false;
    getContactContainer(anchor).hidden = false;
  };

  const renderContactList = (element, brand) => {
    const fields = [
      ["Name", brand.name],
      ["Phone", brand.phone],
      ["Email", brand.email],
      ["Address", brand.address],
    ].filter(([, value]) => Boolean(value));

    element.replaceChildren(
      ...fields.map(([label, value]) => {
        const row = document.createElement("p");
        row.className = "brand-contact-row";
        const strong = document.createElement("strong");
        strong.textContent = `${label}: `;
        row.append(strong, document.createTextNode(value));
        return row;
      }),
    );
    element.hidden = fields.length === 0;
  };

  const findAll = (root, selector) => [
    ...(root.matches?.(selector) ? [root] : []),
    ...(root.querySelectorAll?.(selector) || []),
  ];

  const applyBrandContact = (root, brand) => {
    findAll(root, 'a[href^="tel:"], a[href^="mailto:"], a[href*="wa.me/"]').forEach(
      (anchor) => {
        const href = anchor.getAttribute("href") || "";
        const isEmail = href.startsWith("mailto:");
        setLink(anchor, isEmail ? brand.email : brand.phone, isEmail ? "email" : "phone");
      },
    );

    findAll(root, "[data-brand-phone-text]").forEach((element) => {
      if (!brand.phone) return;
      element.textContent = brand.phone;
      element.hidden = false;
      getContactContainer(element).hidden = false;
    });
    findAll(root, "[data-brand-email-text]").forEach((element) => {
      if (!brand.email) return;
      element.textContent = brand.email;
      element.hidden = false;
      getContactContainer(element).hidden = false;
    });
    findAll(root, "[data-brand-address-text]").forEach((element) => {
      if (!brand.address) return;
      element.textContent = brand.address;
      element.hidden = false;
      getContactContainer(element).hidden = false;
    });
    findAll(root, "[data-brand-contact-list]")
      .forEach((element) => renderContactList(element, brand));
  };

  document
    .querySelectorAll(
      'a[href^="tel:"], a[href^="mailto:"], a[href*="wa.me/"], [data-brand-phone-text], [data-brand-email-text], [data-brand-address-text], [data-brand-contact-list]',
    )
    .forEach(hideContactElement);

  window.brandContactPromise = fetch(apiUrl, { headers: { Accept: "application/json" } })
    .then((response) => {
      if (!response.ok) throw new Error(`Brand request failed (${response.status})`);
      return response.json();
    })
    .then((payload) => {
      const brand = payload?.data?.find(
        (item) => item.slug?.toLowerCase() === brandSlug.toLowerCase(),
      );
      if (!brand) return null;

      applyBrandContact(document, brand);
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) applyBrandContact(node, brand);
          });
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
      return brand;
    })
    .catch((error) => {
      console.error("Unable to load brand contact information", error);
      return null;
    });
})();
