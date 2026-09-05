const { spawn } = require("child_process");

console.log("Iniciando túnel para compartir online...");
const lt = spawn("npx", ["-y", "localtunnel", "--port", "3000"], {
  shell: true,
  stdio: ["ignore", "pipe", "pipe"],
});

lt.stdout.on("data", (data) => {
  const text = data.toString().trim();
  if (text) console.log("ONLINE_LINK:", text);
});

lt.stderr.on("data", (data) => {
  const text = data.toString().trim();
  if (text) console.log("LOG:", text);
});

lt.on("close", (code) => {
  console.log("Túnel cerrado con código:", code);
});
