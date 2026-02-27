const getSlug = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("slug");
};

const fetchProject = async (slug) => {
  const response = await fetch("data/projects.json");
  if (!response.ok) {
    throw new Error("Failed to load project data");
  }
  const projects = await response.json();
  return projects.find((project) => project.slug === slug) || projects[0];
};

const isLink = (value) => {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const linkLabel = (value, fallback) => {
  if (!value) return fallback;
  if (value.includes("behance.net")) return "Open Behance";
  if (value.includes("docs.google.com")) return fallback || "Open Document";
  return fallback || "Open Link";
};

const renderProject = (project) => {
  document.getElementById("project-title").textContent = project.title;
  document.getElementById("project-tag").textContent = project.tag;
  document.getElementById("project-summary").textContent = project.summary;

  const body = document.getElementById("project-body");
  let content = "";
  const sections = Array.isArray(project.sections) && project.sections.length > 0
    ? project.sections
    : [{ title: "Overview", body: project.detail || project.summary }];

  content += `
    <article class="case-panel">
      ${sections
        .map(
          (section) => `
            <section class="case-block">
              <h3>${section.title}</h3>
              ${
                isLink(section.body)
                  ? `<a class="link-button" href="${section.body}" target="_blank" rel="noreferrer">${linkLabel(section.body, section.title)}</a>`
                  : `<p>${section.body}</p>`
              }
            </section>
          `
        )
        .join("")}
    </article>
  `;

  if (Array.isArray(project.gallery) && project.gallery.length > 0) {
    const total = project.gallery.length;
    const isStatic = total <= 3;
    const tiles = project.gallery.map((item, index) => {
      const src = encodeURI(item.src);
      const offset = index % 2 === 0 ? "-16px" : "12px";
      return `
        <figure class="gallery-item" style="--offset:${offset}">
          <img src="${src}" alt="Project image" />
        </figure>
      `;
    });

    const trackTiles = isStatic ? tiles.join("") : `${tiles.join("")}${tiles.join("")}`;
    const modeClass = isStatic ? "gallery static" : "gallery marquee";

    content += `
      <section class="${modeClass}">
        <h3>Gallery</h3>
        <div class="gallery-viewport">
          <div class="gallery-track">
            ${trackTiles}
          </div>
        </div>
      </section>
    `;
  }

  body.innerHTML = content;
};

const setupGalleryLightbox = () => {
  const lightbox = document.getElementById("gallery-lightbox");
  const lightboxImage = document.getElementById("lightbox-image");
  if (!lightbox || !lightboxImage) return;

  let activeThumb = null;
  let lightboxState = "closed";

  const hideLightbox = () => {
    lightbox.setAttribute("aria-hidden", "true");
    lightbox.classList.remove("open");
    document.body.classList.remove("lightbox-active");
    lightboxImage.style.transition = "";
    lightboxImage.style.transform = "";
    lightboxState = "closed";
  };

  const openLightbox = (thumbImage) => {
    if (lightboxState !== "closed") return;
    lightboxState = "opening";
    activeThumb = thumbImage;
    lightboxImage.src = thumbImage.currentSrc || thumbImage.src;

    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("lightbox-active");
    const thumbRect = thumbImage.getBoundingClientRect();
    const finalRect = lightboxImage.getBoundingClientRect();

    const dx = thumbRect.left - finalRect.left;
    const dy = thumbRect.top - finalRect.top;
    const sx = thumbRect.width / finalRect.width;
    const sy = thumbRect.height / finalRect.height;

    lightboxImage.style.transformOrigin = "top left";
    lightboxImage.style.transition = "none";
    lightboxImage.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;

    window.requestAnimationFrame(() => {
      lightbox.classList.add("open");
      lightboxImage.style.transition = "transform 380ms cubic-bezier(0.2, 0.7, 0.12, 1)";
      lightboxImage.style.transform = "translate(0, 0) scale(1, 1)";
    });

    const onOpenEnd = () => {
      lightboxState = "open";
      lightboxImage.removeEventListener("transitionend", onOpenEnd);
    };
    lightboxImage.addEventListener("transitionend", onOpenEnd);
  };

  const closeLightbox = () => {
    if (lightboxState !== "open") return;
    lightboxState = "closing";
    if (!activeThumb) {
      hideLightbox();
      return;
    }

    const thumbRect = activeThumb.getBoundingClientRect();
    const finalRect = lightboxImage.getBoundingClientRect();
    const dx = thumbRect.left - finalRect.left;
    const dy = thumbRect.top - finalRect.top;
    const sx = thumbRect.width / finalRect.width;
    const sy = thumbRect.height / finalRect.height;

    lightbox.classList.remove("open");
    lightboxImage.style.transition = "transform 320ms cubic-bezier(0.4, 0, 0.2, 1)";
    lightboxImage.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;

    const onCloseEnd = () => {
      hideLightbox();
      activeThumb = null;
      lightboxImage.removeEventListener("transitionend", onCloseEnd);
    };
    lightboxImage.addEventListener("transitionend", onCloseEnd);
  };

  document.querySelectorAll(".gallery-item img").forEach((image) => {
    image.addEventListener("click", (event) => {
      event.stopPropagation();
      openLightbox(image);
    });
  });

  lightbox.addEventListener("click", (event) => {
    if (!event.target.closest(".lightbox-image")) {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && lightbox.getAttribute("aria-hidden") === "false") {
      closeLightbox();
    }
  });
};

const init = async () => {
  const slug = getSlug();
  try {
    const project = await fetchProject(slug);
    renderProject(project);
    setupGalleryLightbox();
  } catch (error) {
    console.error(error);
  }

  document.querySelectorAll("[data-scroll]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelector(button.dataset.scroll)?.scrollIntoView({ behavior: "smooth" });
    });
  });

  const menuToggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".nav");
  if (menuToggle && nav) {
    menuToggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  const backLink = document.querySelector(".back-link");
  if (backLink) {
    backLink.addEventListener("click", (event) => {
      event.preventDefault();
      try {
        const ref = document.referrer ? new URL(document.referrer) : null;
        const fromPortfolioHome = ref
          && ref.origin === window.location.origin
          && (ref.pathname.endsWith("/") || ref.pathname.endsWith("/index.html"));
        if (fromPortfolioHome) {
          window.history.back();
          return;
        }
      } catch {
        // fall through to direct navigation
      }
      window.location.href = "index.html?return=1#projects";
    });
  }
};

init();
