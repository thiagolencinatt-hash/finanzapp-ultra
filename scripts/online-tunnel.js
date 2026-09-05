const localtunnel = require("localtunnel");

async function start() {
  console.log("🌐 Configurando túnel web público para FinanzApp...");
  let publicIp = "201.176.72.55";
  try {
    const res = await fetch("https://api.ipify.org");
    publicIp = await res.text();
  } catch (e) {}

  try {
    const tunnel = await localtunnel({
      port: 3000,
      subdomain: "finanzapp-" + Math.floor(Math.random() * 8999 + 1000),
    });

    console.log("\n========================================================");
    console.log("✨ ¡TU APP ESTÁ 100% ONLINE EN VIVO! ✨");
    console.log(`🔗 Enlace Web Público: ${tunnel.url}`);
    console.log(`🔑 Contraseña de acceso (si te la pide): ${publicIp.trim()}`);
    console.log("========================================================\n");

    tunnel.on("close", () => {
      console.log("Túnel cerrado. Reiniciando en 3 segundos...");
      setTimeout(start, 3000);
    });

    tunnel.on("error", (err) => {
      console.error("Error en el túnel:", err.message);
    });
  } catch (err) {
    console.error("Error al iniciar localtunnel:", err.message);
    setTimeout(start, 5000);
  }
}

start();
