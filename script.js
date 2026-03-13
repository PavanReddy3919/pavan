const projectGrid = document.getElementById("project-grid");
const timelineGrid = document.getElementById("timeline-grid");
const state = {
  projects: [],
};

const fetchJson = async (path) => {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return response.json();
};

const renderProjects = (projects) => {
  if (!projectGrid) return;
  projectGrid.innerHTML = projects
    .map(
      (project) => `
        <article class="project-card" data-slug="${project.slug}">
          <div>
            <span class="tag">${project.tag}</span>
            <h3>${project.title}</h3>
            <p>${project.summary}</p>
          </div>
        </article>
      `
    )
    .join("");
};

const renderTimeline = (items) => {
  if (!timelineGrid) return;
  timelineGrid.innerHTML = items
    .map((item, index) => {
      const side = index % 2 === 0 ? "left" : "right";
      const preview = Array.isArray(item.details) && item.details.length ? item.details[0] : "";
      const details = Array.isArray(item.details) && item.details.length
        ? `<ul class="timeline-details">${item.details.map((d) => `<li>${d}</li>`).join("")}</ul>`
        : "";
      return `
        <article class="timeline-card ${side}" style="--row:${index + 1}">
          <div class="timeline-card-inner">
            <div class="timeline-meta">${item.period}</div>
            <h3>${item.role}</h3>
            <p><strong>${item.company}</strong></p>
            ${preview ? `<p class="timeline-preview">${preview}</p>` : ""}
            ${details}
          </div>
        </article>
      `;
    })
    .join("");
};

const setupScrollButtons = () => {
  document.querySelectorAll("[data-scroll]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = document.querySelector(button.dataset.scroll);
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
    });
  });
};

const setupMobileMenu = () => {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".nav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
};

const restoreScrollFromProject = () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("return") !== "1") return;
  const saved = sessionStorage.getItem("portfolioScrollY");
  if (!saved) return;

  window.scrollTo(0, Number(saved));
  sessionStorage.removeItem("portfolioScrollY");
  const cleanUrl = `${window.location.pathname}${window.location.hash || ""}`;
  window.history.replaceState({}, "", cleanUrl);
};

const setupViewportTextFocus = () => {
  const selector =
    "main h1, main h2, main h3, main p, main li, main .timeline-meta, main .tag, main .lead, main .eyebrow";
  let targets = [];
  let rafId = null;

  const refreshTargets = () => {
    targets = Array.from(document.querySelectorAll(selector));
  };

  const clamp01 = (value) => Math.max(0, Math.min(1, value));
  const lerp = (a, b, t) => Math.round(a + (b - a) * t);
  const smoothstep = (edge0, edge1, x) => {
    const t = clamp01((x - edge0) / (edge1 - edge0));
    return t * t * (3 - 2 * t);
  };

  // Center 60% of viewport stays bright; top/bottom 20% softly fade to grey.
  const focusFactor = (yNorm) => {
    const distanceFromCenter = Math.abs(yNorm - 0.5);
    if (distanceFromCenter <= 0.3) return 1;
    return 1 - smoothstep(0.3, 0.5, distanceFromCenter);
  };

  const updateFocus = () => {
    if (!targets.length) return;
    const vh = window.innerHeight || 1;
    targets.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const y = (rect.top + rect.height / 2) / vh;
      const t = clamp01(focusFactor(y));
      const r = lerp(138, 255, t);
      const g = lerp(138, 255, t);
      const b = lerp(138, 255, t);
      el.style.color = `rgb(${r}, ${g}, ${b})`;
    });
  };

  const requestUpdate = () => {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      updateFocus();
    });
  };

  refreshTargets();
  updateFocus();
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);

  return {
    refreshTargets: () => {
      refreshTargets();
      requestUpdate();
    },
  };
};

const setupTimelineFocus = () => {
  const cards = Array.from(document.querySelectorAll(".timeline-card"));
  if (!cards.length) return;

  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const isExpanded = card.classList.contains("is-expanded");
      cards.forEach((item) => item.classList.remove("is-expanded"));
      if (!isExpanded) {
        card.classList.add("is-expanded");
      }
    });
  });

  const updateActive = () => {
    const midpoint = window.innerHeight / 2;
    let closest = null;
    let closestDistance = Infinity;
    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const cardMid = rect.top + rect.height / 2;
      const distance = Math.abs(cardMid - midpoint);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = card;
      }
    });

    cards.forEach((card) => {
      card.classList.toggle("is-active", card === closest);
    });
  };

  updateActive();
  window.addEventListener("scroll", () => requestAnimationFrame(updateActive), { passive: true });
  window.addEventListener("resize", () => requestAnimationFrame(updateActive));
};

const setupMarquee = () => {
  document.querySelectorAll(".marquee-row").forEach((row) => {
    row.innerHTML = `${row.innerHTML}${row.innerHTML}`;
  });
};

const init = async () => {
  restoreScrollFromProject();
  setupScrollButtons();
  setupMobileMenu();
  setupMarquee();
  const viewportFocus = setupViewportTextFocus();

  try {
    const [projects, timeline] = await Promise.all([
      fetchJson("data/projects.json"),
      fetchJson("data/timeline.json"),
    ]);
    state.projects = projects;
    renderProjects(projects);
    renderTimeline(timeline);
    setupTimelineFocus();
    viewportFocus?.refreshTargets();
  } catch (error) {
    console.error(error);
  }

  projectGrid?.addEventListener("click", (event) => {
    const card = event.target.closest(".project-card");
    if (!card) return;
    const project = state.projects.find((item) => item.slug === card.dataset.slug);
    if (project) {
      sessionStorage.setItem("portfolioScrollY", String(window.scrollY));
      window.location.href = project.link;
    }
  });

};

init();
