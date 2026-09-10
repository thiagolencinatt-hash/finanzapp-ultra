import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  currency: string;
  salary: number;
  createdAt: string;
  updatedAt: string;
}

// Ruta persistente para el almacén de cuentas de usuario
function getDataDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join("/tmp", "data");
  }
  return path.join(process.cwd(), "data");
}

function getUsersFile(): string {
  return path.join(getDataDir(), "users.json");
}

// In-memory cache para acceso de altísima velocidad
const usersCache = new Map<string, UserAccount>();
let isLoaded = false;

function ensureLoaded() {
  if (isLoaded) return;
  try {
    const dir = getDataDir();
    const file = getUsersFile();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, "utf-8");
      const list: UserAccount[] = JSON.parse(content);
      for (const u of list) {
        usersCache.set(u.email.toLowerCase().trim(), u);
      }
    }
  } catch (err) {
    console.warn("⚠️ No se pudo leer archivo de usuarios, usando memoria:", err);
  }
  isLoaded = true;
}

function persistToFile() {
  try {
    const dir = getDataDir();
    const file = getUsersFile();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const list = Array.from(usersCache.values());
    fs.writeFileSync(file, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    console.warn("⚠️ No se pudo guardar archivo de usuarios en disco:", err);
  }
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
}

export function getUserByEmail(email: string): UserAccount | null {
  ensureLoaded();
  const normalized = email.toLowerCase().trim();
  return usersCache.get(normalized) || null;
}

export function registerUser({
  email,
  password,
  name,
  currency = "ARS",
  salary = 980000,
}: {
  email: string;
  password?: string;
  name?: string;
  currency?: string;
  salary?: number;
}): { success: boolean; user?: UserAccount; error?: string } {
  ensureLoaded();
  const normalized = email.toLowerCase().trim();

  if (!email || !email.includes("@")) {
    return { success: false, error: "Correo electrónico no válido" };
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = password ? hashPassword(password, salt) : "";

  const existing = usersCache.get(normalized);
  const now = new Date().toISOString();

  const user: UserAccount = {
    id: existing?.id || crypto.randomUUID(),
    email: normalized,
    name: name || existing?.name || normalized.split("@")[0],
    passwordHash: passwordHash || existing?.passwordHash || "",
    salt: salt || existing?.salt || "",
    currency: currency || existing?.currency || "ARS",
    salary: Number(salary) || existing?.salary || 980000,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  usersCache.set(normalized, user);
  persistToFile();

  console.log(`✅ [User Store] Cuenta registrada/actualizada: ${normalized}`);
  return { success: true, user };
}

export function verifyUserPassword(
  email: string,
  passwordAttempt: string
): { valid: boolean; user?: UserAccount; error?: string } {
  ensureLoaded();
  const normalized = email.toLowerCase().trim();
  const user = usersCache.get(normalized);

  if (!user) {
    return { valid: false, error: "No existe ninguna cuenta registrada con este correo" };
  }

  if (!user.passwordHash || !user.salt) {
    return {
      valid: false,
      error: "Esta cuenta aún no tiene contraseña establecida. Puedes ingresar con código OTP o definir una contraseña.",
    };
  }

  const attemptHash = hashPassword(passwordAttempt, user.salt);
  if (attemptHash !== user.passwordHash) {
    return { valid: false, error: "Contraseña incorrecta. Verifica e intenta nuevamente." };
  }

  return { valid: true, user };
}

export function setPasswordForUser(
  email: string,
  newPassword: string
): { success: boolean; user?: UserAccount; error?: string } {
  ensureLoaded();
  const normalized = email.toLowerCase().trim();
  let user = usersCache.get(normalized);

  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: "La contraseña debe tener al menos 6 caracteres" };
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(newPassword, salt);
  const now = new Date().toISOString();

  if (!user) {
    user = {
      id: crypto.randomUUID(),
      email: normalized,
      name: normalized.split("@")[0],
      passwordHash,
      salt,
      currency: "ARS",
      salary: 980000,
      createdAt: now,
      updatedAt: now,
    };
  } else {
    user.passwordHash = passwordHash;
    user.salt = salt;
    user.updatedAt = now;
  }

  usersCache.set(normalized, user);
  persistToFile();

  console.log(`✅ [User Store] Contraseña fijada exitosamente para: ${normalized}`);
  return { success: true, user };
}
