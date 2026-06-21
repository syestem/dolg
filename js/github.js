export async function fetchGithubData(settings) {
  const clean = validateSettings(settings, { requireToken: false });
  const response = await fetch(contentsUrl(clean), {
    headers: headers(clean.token)
  });

  if (!response.ok) {
    throw new Error(await githubError(response, "Не удалось загрузить data.json из GitHub"));
  }

  const payload = await response.json();
  if (!payload.content) {
    throw new Error("GitHub вернул пустой файл");
  }

  return {
    data: JSON.parse(decodeBase64(payload.content)),
    sha: payload.sha
  };
}

export async function pushGithubData(settings, state) {
  const clean = validateSettings(settings, { requireToken: true });
  let sha = "";

  try {
    const current = await fetchGithubData(clean);
    sha = current.sha;
  } catch (error) {
    if (!String(error.message).includes("404")) {
      throw error;
    }
  }

  const body = {
    message: `Update ${clean.path} from debt tracker`,
    content: encodeBase64(JSON.stringify(state, null, 2)),
    branch: clean.branch
  };

  if (sha) {
    body.sha = sha;
  }

  const response = await fetch(contentsUrl(clean), {
    method: "PUT",
    headers: {
      ...headers(clean.token),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(await githubError(response, "Не удалось сохранить data.json в GitHub"));
  }

  return response.json();
}

function validateSettings(settings, options = {}) {
  const clean = {
    owner: String(settings.owner || "").trim(),
    repo: String(settings.repo || "").trim(),
    branch: String(settings.branch || "main").trim(),
    path: String(settings.path || "data.json").trim().replace(/^\/+/, ""),
    token: String(settings.token || "").trim()
  };

  if (!clean.owner || !clean.repo || !clean.branch || !clean.path) {
    throw new Error("Заполните owner, repo, branch и путь к файлу");
  }

  if (options.requireToken && !clean.token) {
    throw new Error("Для записи в GitHub нужен Personal Access Token");
  }

  return clean;
}

function contentsUrl(settings) {
  const path = settings.path.split("/").map(encodeURIComponent).join("/");
  const owner = encodeURIComponent(settings.owner);
  const repo = encodeURIComponent(settings.repo);
  const branch = encodeURIComponent(settings.branch);
  return `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
}

function headers(token) {
  const base = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };

  if (token) {
    base.Authorization = `Bearer ${token}`;
  }

  return base;
}

async function githubError(response, fallback) {
  try {
    const data = await response.json();
    const message = data.message ? `${fallback}: ${data.message}` : fallback;
    return `${message} (${response.status})`;
  } catch {
    return `${fallback} (${response.status})`;
  }
}

function decodeBase64(value) {
  const binary = atob(String(value).replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}
