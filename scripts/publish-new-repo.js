const { execSync } = require("child_process");
const path = require("path");

const OWNER = "thiagolencinatt-hash";
const REPO_NAME = "finanzapp-ultra";
const BRANCH = "main";

function getGitHubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    const scriptPath = path.join(__dirname, "read-cred.ps1");
    const result = execSync(
      `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`,
      { encoding: "utf8" }
    ).trim();
    if (result && result.length > 10) return result;
  } catch (e) {}
  return null;
}

async function createRepoIfNotExists(token) {
  console.log(`🔍 Verificando repositorio '${REPO_NAME}' en GitHub...`);
  const checkRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO_NAME}`, {
    headers: {
      Authorization: `token ${token}`,
      "User-Agent": "FinanzApp-Deployer",
    },
  });

  if (checkRes.status === 200) {
    console.log(`✅ El repositorio '${REPO_NAME}' ya existe en GitHub.`);
    return true;
  }

  if (checkRes.status === 404) {
    console.log(`🚀 Creando nuevo repositorio '${REPO_NAME}' en GitHub...`);
    const createRes = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers: {
        Authorization: `token ${token}`,
        "User-Agent": "FinanzApp-Deployer",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: REPO_NAME,
        description:
          "Plataforma minimalista y profesional de finanzas personales, presupuestos por categoría, control de suscripciones y salud financiera. PWA lista para cualquier dispositivo.",
        private: false,
        has_issues: true,
        has_projects: true,
        has_wiki: false,
      }),
    });

    if (createRes.status === 201) {
      console.log(`🎉 ¡Repositorio '${REPO_NAME}' creado exitosamente en GitHub!`);
      return true;
    } else {
      const errData = await createRes.json();
      console.error("❌ Error al crear repositorio:", errData);
      return false;
    }
  }

  console.error(`⚠️ Estado inesperado al verificar repo: ${checkRes.status}`);
  return false;
}

async function main() {
  const token = getGitHubToken();
  if (!token) {
    console.error("❌ No se encontró token en el Credential Manager.");
    process.exit(1);
  }

  const ok = await createRepoIfNotExists(token);
  if (!ok) process.exit(1);

  const rootDir = path.resolve(__dirname, "..");
  const authedUrl = `https://${OWNER}:${token}@github.com/${OWNER}/${REPO_NAME}.git`;
  const cleanUrl = `https://github.com/${OWNER}/${REPO_NAME}.git`;

  try {
    console.log("📦 Preparando commit de Git...");
    execSync("git add -A", { cwd: rootDir, stdio: "inherit" });

    try {
      execSync(
        'git commit -m "feat: upgrade to FinanzApp Ultra - category budgets, subscriptions tracker, health score, PWA icons, JSON backup/restore and mobile UX"',
        { cwd: rootDir, stdio: "inherit" }
      );
    } catch (commitErr) {
      console.log("ℹ️ No había cambios pendientes para commitear o commit ya realizado.");
    }

    console.log(`🚀 Empujando cambios a 'https://github.com/${OWNER}/${REPO_NAME}' (rama ${BRANCH})...`);
    execSync(`git push "${authedUrl}" ${BRANCH}:${BRANCH} -u --force`, {
      cwd: rootDir,
      stdio: "inherit",
    });

    console.log("🔒 Sanitizando remotos en .git/config (eliminando credenciales de URLs)...");
    try {
      execSync(`git remote set-url origin "${cleanUrl}"`, { cwd: rootDir });
    } catch {
      try {
        execSync(`git remote add origin "${cleanUrl}"`, { cwd: rootDir });
      } catch {}
    }

    console.log("\n========================================================");
    console.log("✨ ¡PROYECTO PUBLICADO EXITOSAMENTE EN GITHUB! ✨");
    console.log(`🔗 URL del Repositorio: ${cleanUrl}`);
    console.log("========================================================\n");
  } catch (err) {
    console.error("❌ Error durante el push a GitHub:", err.message);
    process.exit(1);
  }
}

main();
