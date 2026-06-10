const projectGrid = document.getElementById("project-grid");
const timelineGrid = document.getElementById("timeline-grid");
const state = {
  projects: [],
};

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const fetchJson = async (path) => {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return response.json();
};

/* ---------------------------------- */
/*  Projects — bento grid              */
/* ---------------------------------- */

const renderProjects = (projects) => {
  if (!projectGrid) return;
  projectGrid.innerHTML = projects
    .map((project, index) => {
      const featured = index === 0 ? " featured" : "";
      const skills = Array.isArray(project.skills) && project.skills.length
        ? `<div class="project-skills">${project.skills
            .slice(0, 4)
            .map((skill) => `<span class="chip">${skill}</span>`)
            .join("")}</div>`
        : "<div></div>";
      return `
        <article class="project-card${featured} reveal" data-slug="${project.slug}">
          <div>
            <span class="tag">${project.tag}</span>
            <h3>${project.title}</h3>
            <p>${project.summary}</p>
          </div>
          <div class="project-foot">
            ${skills}
            <span class="project-arrow" aria-hidden="true">→</span>
          </div>
        </article>
      `;
    })
    .join("");
};

/* ---------------------------------- */
/*  Timeline — journey beam            */
/* ---------------------------------- */

const renderTimeline = (items) => {
  if (!timelineGrid) return;
  const cards = items
    .map((item, index) => {
      const side = index % 2 === 0 ? "left" : "right";
      const details = Array.isArray(item.details) && item.details.length
        ? `<ul class="timeline-details">${item.details.map((d) => `<li>${d}</li>`).join("")}</ul>`
        : "";
      return `
        <article class="timeline-card ${side}" style="--row:${index + 1}">
          <div class="timeline-card-inner">
            <span class="timeline-meta">${item.period}</span>
            <h3>${item.role}</h3>
            <p class="timeline-company">${item.company}</p>
            <p class="timeline-preview">${item.summary}</p>
            ${details}
            ${details ? `<span class="timeline-toggle">Details</span>` : ""}
          </div>
        </article>
      `;
    })
    .join("");
  timelineGrid.insertAdjacentHTML("beforeend", cards);
};

const setupTimelineBeam = () => {
  if (!timelineGrid) return;
  const cards = Array.from(timelineGrid.querySelectorAll(".timeline-card"));
  if (!cards.length) return;

  // click to expand/collapse
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const isExpanded = card.classList.contains("is-expanded");
      cards.forEach((item) => item.classList.remove("is-expanded"));
      if (!isExpanded) {
        card.classList.add("is-expanded");
      }
    });
  });

  if (prefersReducedMotion) {
    timelineGrid.style.setProperty("--beam", "100%");
    cards.forEach((card) => card.classList.add("lit"));
    return;
  }

  let rafId = null;

  const update = () => {
    rafId = null;
    const rect = timelineGrid.getBoundingClientRect();
    // the beam head tracks a point ~58% down the viewport
    const focusY = window.innerHeight * 0.58;
    const progress = Math.max(0, Math.min(1, (focusY - rect.top) / rect.height));
    timelineGrid.style.setProperty("--beam", `${(progress * 100).toFixed(2)}%`);

    const beamY = rect.top + rect.height * progress;
    cards.forEach((card) => {
      const dotY = card.getBoundingClientRect().top + 36;
      card.classList.toggle("lit", dotY <= beamY);
    });
  };

  const requestUpdate = () => {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(update);
  };

  update();
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
};

/* ---------------------------------- */
/*  Scroll reveals                     */
/* ---------------------------------- */

const setupReveals = () => {
  const targets = document.querySelectorAll(".reveal");
  if (!targets.length) return;

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("in-view"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  targets.forEach((el) => observer.observe(el));
};

/* ---------------------------------- */
/*  Stat counters                      */
/* ---------------------------------- */

const setupCounters = () => {
  const counters = document.querySelectorAll("[data-count]");
  if (!counters.length) return;

  const animate = (el) => {
    const target = Number(el.dataset.count);
    if (prefersReducedMotion || !Number.isFinite(target)) {
      el.textContent = el.dataset.count;
      return;
    }
    const duration = 1100;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = String(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  if (!("IntersectionObserver" in window)) {
    counters.forEach((el) => (el.textContent = el.dataset.count));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animate(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.6 }
  );

  counters.forEach((el) => observer.observe(el));
};

/* ---------------------------------- */
/*  Nav — active section highlight     */
/* ---------------------------------- */

const setupActiveNav = () => {
  const links = Array.from(document.querySelectorAll(".nav a[href^='#']"));
  if (!links.length || !("IntersectionObserver" in window)) return;

  const sections = links
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  const setActive = (id) => {
    links.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(visible.target.id);
    },
    { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.2, 0.5] }
  );

  sections.forEach((section) => observer.observe(section));
};

/* ---------------------------------- */
/*  Chrome                             */
/* ---------------------------------- */

const setupScrollButtons = () => {
  document.querySelectorAll("[data-scroll]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = document.querySelector(button.dataset.scroll);
      if (target) {
        target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
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

const setupMarquee = () => {
  document.querySelectorAll(".marquee-row").forEach((row) => {
    row.innerHTML = `${row.innerHTML}${row.innerHTML}`;
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

/* ---------------------------------- */
/*  Init                               */
/* ---------------------------------- */

const init = async () => {
  restoreScrollFromProject();
  setupScrollButtons();
  setupMobileMenu();
  setupMarquee();
  setupCounters();
  setupActiveNav();

  try {
    const [projects, timeline] = await Promise.all([
      fetchJson("data/projects.json"),
      fetchJson("data/timeline.json"),
    ]);
    state.projects = projects;
    renderProjects(projects);
    renderTimeline(timeline);
    setupTimelineBeam();
  } catch (error) {
    console.error(error);
  }

  setupReveals();

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
