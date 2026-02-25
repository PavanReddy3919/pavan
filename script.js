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
          <div class="timeline-meta">${item.period}</div>
          <h3>${item.role}</h3>
          <p><strong>${item.company}</strong></p>
          ${preview ? `<p class="timeline-preview">${preview}</p>` : ""}
          ${details}
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
  setupScrollButtons();
  setupMarquee();

  try {
    const [projects, timeline] = await Promise.all([
      fetchJson("data/projects.json"),
      fetchJson("data/timeline.json"),
    ]);
    state.projects = projects;
    renderProjects(projects);
    renderTimeline(timeline);
    setupTimelineFocus();
  } catch (error) {
    console.error(error);
  }

  projectGrid?.addEventListener("click", (event) => {
    const card = event.target.closest(".project-card");
    if (!card) return;
    const project = state.projects.find((item) => item.slug === card.dataset.slug);
    if (project) {
      window.location.href = project.link;
    }
  });

};

init();
