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

const renderProject = (project) => {
  document.getElementById("project-title").textContent = project.title;
  document.getElementById("project-tag").textContent = project.tag;
  document.getElementById("project-summary").textContent = project.summary;

  const body = document.getElementById("project-body");
  body.innerHTML = `
    <article class="timeline-card">
      <div class="timeline-meta">Overview</div>
      <p>${project.detail || project.summary}</p>
    </article>
  `;
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
};

init();
