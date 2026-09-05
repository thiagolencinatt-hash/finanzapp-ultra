const fs = require("fs");
const path = require("path");

const checkpointSource = path.resolve(__dirname, "..", "..", "CHECKPOINT.md");
const content = fs.readFileSync(checkpointSource, "utf8");

// Obsidian paths
const obsidianVault = "C:/Users/thiago/Desktop/inteligencia artificial/antigravity/antigravity";
const checkpointsDir = path.join(obsidianVault, "04_BITACORA_Y_SESIONES", "checkpoints");
const projectDir = path.join(obsidianVault, "01_PROYECTOS", "Control-gastos");

try {
  if (!fs.existsSync(checkpointsDir)) fs.mkdirSync(checkpointsDir, { recursive: true });
  fs.writeFileSync(path.join(checkpointsDir, "CHECKPOINT_LATEST.md"), content, "utf8");
  console.log("✅ Checkpoint copiado a:", path.join(checkpointsDir, "CHECKPOINT_LATEST.md"));

  if (!fs.existsSync(projectDir)) fs.mkdirSync(projectDir, { recursive: true });
  fs.writeFileSync(path.join(projectDir, "CURRENT_STATE.md"), content, "utf8");
  console.log("✅ CURRENT_STATE copiado a:", path.join(projectDir, "CURRENT_STATE.md"));
} catch (e) {
  console.error("Error al sincronizar con Obsidian:", e.message);
}
