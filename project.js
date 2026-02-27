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

const init = async () => {
  const slug = getSlug();
  try {
    const project = await fetchProject(slug);
    renderProject(project);
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
      window.location.href = "index.html?return=1#projects";
    });
  }
};

init();
