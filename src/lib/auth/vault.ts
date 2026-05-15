import { cookies } from "next/headers";
import { authSecret } from "@/src/lib/env";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const VAULT_COOKIE_NAME = process.env.NODE_ENV === "production" ? "__Secure-next-auth.vault" : "next-auth.vault";

// Nombres de cookies posibles para NextAuth/Auth.js v5
const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token"
];

export type VaultIdentity = {
  email: string;
  name?: string | null;
  image?: string | null;
  role?: string;
  firstName?: string | null;
  lastName?: string | null;
};

export type VaultEntry = VaultIdentity & {
  token: string; // Token cifrado
  updatedAt: number;
};

// Utilidades de cifrado simples usando el AUTH_SECRET
function getEncryptionKey() {
  return scryptSync(authSecret || "default-secret", "salt", 32);
}

function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", getEncryptionKey(), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

function decrypt(text: string): string {
  try {
    const [ivHex, encryptedHex] = text.split(":");
    if (!ivHex || !encryptedHex) return "";
    const iv = Buffer.from(ivHex, "hex");
    const decipher = createDecipheriv("aes-256-cbc", getEncryptionKey(), iv);
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (e) {
    console.error("Error decrypting vault token:", e);
    return "";
  }
}

async function getVault(): Promise<Record<string, VaultEntry>> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(VAULT_COOKIE_NAME)?.value;
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function saveVault(vault: Record<string, VaultEntry>) {
  const cookieStore = await cookies();
  cookieStore.set(VAULT_COOKIE_NAME, JSON.stringify(vault), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30 // 30 días
  });
}

export async function getVaultIdentities(): Promise<VaultIdentity[]> {
  const vault = await getVault();
  return Object.values(vault)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map(({ token, updatedAt, ...identity }) => identity);
}

async function clearSessionCookies() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  for (const cookie of allCookies) {
    if (SESSION_COOKIE_NAMES.some(name => cookie.name === name || cookie.name.startsWith(`${name}.`))) {
      cookieStore.delete(cookie.name);
    }
  }
}

export async function updateCurrentInVault(identity: VaultIdentity) {
  const cookieStore = await cookies();
  const vault = await getVault();
  const email = identity.email.toLowerCase();

  // Buscar todos los fragmentos de la cookie de sesión actual
  const allCookies = cookieStore.getAll();
  const sessionChunks: Record<string, string> = {};
  
  for (const name of SESSION_COOKIE_NAMES) {
    // Buscar cookie base
    const base = cookieStore.get(name);
    if (base) {
      sessionChunks[name] = base.value;
    }
    // Buscar fragmentos .0, .1, .2...
    for (const c of allCookies) {
      if (c.name.startsWith(`${name}.`)) {
        sessionChunks[c.name] = c.value;
      }
    }
    
    if (Object.keys(sessionChunks).length > 0) break;
  }

  if (Object.keys(sessionChunks).length === 0) return;

  vault[email] = {
    ...identity,
    token: encrypt(JSON.stringify(sessionChunks)),
    updatedAt: Date.now()
  };

  await saveVault(vault);
}

export async function switchSession(targetEmail: string): Promise<boolean> {
  const email = targetEmail.toLowerCase();
  const vault = await getVault();
  const entry = vault[email];
  if (!entry) return false;

  const decryptedRaw = decrypt(entry.token);
  if (!decryptedRaw) return false;

  let sessionChunks: Record<string, string> = {};
  try {
    sessionChunks = JSON.parse(decryptedRaw);
  } catch {
    // Retrocompatibilidad con tokens no JSON (viejos)
    const cookieName = process.env.NODE_ENV === "production" ? "__Secure-authjs.session-token" : "authjs.session-token";
    sessionChunks = { [cookieName]: decryptedRaw };
  }

  const cookieStore = await cookies();
  
  // 1. Limpiar sesión actual completamente
  await clearSessionCookies();

  // 2. Restaurar todos los fragmentos
  for (const [name, value] of Object.entries(sessionChunks)) {
    cookieStore.set(name, value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" || name.startsWith("__Secure-"),
      sameSite: "lax",
      path: "/"
    });
  }

  return true;
}

export async function removeFromVault(email: string) {
  const vault = await getVault();
  const normalized = email.toLowerCase();
  if (vault[normalized]) {
    delete vault[normalized];
    await saveVault(vault);
  }
}
