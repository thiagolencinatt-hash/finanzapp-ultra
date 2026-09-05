const { execSync } = require("child_process");
const path = require("path");

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

async function testAuth() {
  const token = getGitHubToken();
  if (!token) {
    console.log("No token found");
    return;
  }
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `token ${token}`,
      "User-Agent": "FinanceApp-Publisher",
    },
  });
  const user = await res.json();
  console.log("Authenticated as:", user.login);
}

testAuth();
