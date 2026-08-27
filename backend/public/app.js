const healthStatus = document.querySelector("#healthStatus");
const form = document.querySelector("#analysisForm");
const submitButton = document.querySelector("#submitButton");
const refreshButton = document.querySelector("#refreshButton");
const requestStatus = document.querySelector("#requestStatus");
const fitGrade = document.querySelector("#fitGrade");
const fitLevel = document.querySelector("#fitLevel");
const summary = document.querySelector("#summary");
const resultJson = document.querySelector("#resultJson");
const analysesList = document.querySelector("#analysesList");
const jobUrlInput = document.querySelector("#jobUrl");
const jobDescriptionInput = document.querySelector("#jobDescription");

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const setJson = (value) => {
  resultJson.textContent = JSON.stringify(value, null, 2);
};

const setSummary = (message, state = "empty") => {
  summary.className = `summary ${state}`;
  summary.textContent = message;
};

const setGrade = (score = null, level = "0 to 100") => {
  fitGrade.textContent = Number.isFinite(score) ? String(score) : "--";
  fitLevel.textContent = level;
};

const checkHealth = async () => {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();

    if (response.ok && data.success) {
      healthStatus.textContent = "API online";
      healthStatus.className = "status-pill ok";
      return;
    }

    throw new Error("Health check failed.");
  } catch {
    healthStatus.textContent = "API offline";
    healthStatus.className = "status-pill error";
  }
};

const loadAnalyses = async () => {
  analysesList.innerHTML = "";

  try {
    const response = await fetch("/api/analyses?limit=10");
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error?.message ?? "Unable to load analyses.");
    }

    if (data.data.length === 0) {
      analysesList.innerHTML = '<div class="muted">No saved analyses.</div>';
      return;
    }

    analysesList.innerHTML = data.data
      .map((item) => {
        const title = item.jobTitle || "Untitled role";
        const company = item.company ? ` at ${item.company}` : "";
        const filename = item.resumeFilename || "resume";
        const created = new Date(item.createdAt).toLocaleString();
        const source = item.jobUrl ? `<span class="muted">${escapeHtml(item.jobUrl)}</span>` : "";

        return `
          <article class="analysis-row">
            <div>
              <strong>${escapeHtml(title)}${escapeHtml(company)}</strong>
              <span class="muted">${escapeHtml(filename)} - ${escapeHtml(created)}</span>
              ${source}
            </div>
            <div class="score">${escapeHtml(item.analysis.matchScore)}%</div>
          </article>
        `;
      })
      .join("");
  } catch (error) {
    analysesList.innerHTML = `<div class="summary error">${escapeHtml(error.message)}</div>`;
  }
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!jobUrlInput.value.trim() && !jobDescriptionInput.value.trim()) {
    requestStatus.textContent = "Missing job";
    setGrade();
    setSummary("Add a job posting URL or paste a job description.", "error");
    setJson({});
    return;
  }

  requestStatus.textContent = "Running...";
  submitButton.disabled = true;
  setGrade();
  setSummary("Sending resume and job input to the backend...", "empty");
  setJson({});

  const formData = new FormData(form);

  try {
    const response = await fetch("/api/analyses", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();

    setJson(data);

    if (!response.ok || !data.success) {
      throw new Error(data.error?.message ?? "Analysis failed.");
    }

    const analysis = data.data.analysis;
    requestStatus.textContent = "Complete";
    setGrade(analysis.matchScore, analysis.matchLevel);
    setSummary(`${analysis.matchScore}% estimated compatibility - ${analysis.summary}`, "");
    await loadAnalyses();
  } catch (error) {
    requestStatus.textContent = "Failed";
    setGrade();
    setSummary(error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
});

refreshButton.addEventListener("click", async () => {
  await checkHealth();
  await loadAnalyses();
});

void checkHealth();
void loadAnalyses();
