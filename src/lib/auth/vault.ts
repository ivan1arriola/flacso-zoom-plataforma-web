import { cookies } from "next/headers";
import { authSecret } from "@/src/lib/env";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import {
  CURRENT_SESSION_COOKIE_NAME,
  SESSION_COOKIE_NAMES,
  isSessionCookieName,
  normalizeSessionCookieName
} from "@/src/lib/auth/cookies";

const VAULT_COOKIE_NAME = process.env.NODE_ENV === "production" ? "__Secure-next-auth.vault" : "next-auth.vault";
const VAULT_COOKIE_CHUNK_PREFIX = `${VAULT_COOKIE_NAME}.`;
const MAX_COOKIE_CHUNK_SIZE = 3800;
const MAX_VAULT_ENTRIES = 2;
const VAULT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 días

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
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  // base64url es más compacto que hex y evita chars problemáticos en cookies
  return `${iv.toString("base64url")}.${encrypted.toString("base64url")}`;
}

function decrypt(text: string): string {
  try {
    const [ivEncoded, encryptedEncoded] = text.split(".");
    if (!ivEncoded || !encryptedEncoded) return "";
    const iv = Buffer.from(ivEncoded, "base64url");
    const encrypted = Buffer.from(encryptedEncoded, "base64url");
    const decipher = createDecipheriv("aes-256-cbc", getEncryptionKey(), iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (e) {
    console.error("Error decrypting vault token:", e);
    return "";
  }
}

function splitCookieValue(value: string, chunkSize: number): string[] {
  if (!value) return [];
  const chunks: string[] = [];
  for (let index = 0; index < value.length; index += chunkSize) {
    chunks.push(value.slice(index, index + chunkSize));
  }
  return chunks;
}

function sortVaultByUpdatedAt(vault: Record<string, VaultEntry>): Record<string, VaultEntry> {
  return Object.fromEntries(
    Object.entries(vault)
      .sort((left, right) => right[1].updatedAt - left[1].updatedAt)
      .slice(0, MAX_VAULT_ENTRIES)
  );
}

async function clearVaultCookies() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  for (const cookie of allCookies) {
    if (cookie.name === VAULT_COOKIE_NAME || cookie.name.startsWith(VAULT_COOKIE_CHUNK_PREFIX)) {
      cookieStore.delete(cookie.name);
    }
  }
}

async function getVault(): Promise<Record<string, VaultEntry>> {
  const cookieStore = await cookies();
  let raw = cookieStore.get(VAULT_COOKIE_NAME)?.value;
  if (!raw) {
    const chunks = cookieStore
      .getAll()
      .filter((cookie) => cookie.name.startsWith(VAULT_COOKIE_CHUNK_PREFIX))
      .sort((left, right) => {
        const leftIndex = Number(left.name.slice(VAULT_COOKIE_CHUNK_PREFIX.length));
        const rightIndex = Number(right.name.slice(VAULT_COOKIE_CHUNK_PREFIX.length));
        return leftIndex - rightIndex;
      });

    if (chunks.length > 0) {
      raw = chunks.map((chunk) => chunk.value).join("");
    }
  }

  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function saveVault(vault: Record<string, VaultEntry>) {
  const normalizedVault = sortVaultByUpdatedAt(vault);
  const serializedVault = JSON.stringify(normalizedVault);
  const cookieChunks = splitCookieValue(serializedVault, MAX_COOKIE_CHUNK_SIZE);

  await clearVaultCookies();

  const cookieStore = await cookies();
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: VAULT_COOKIE_MAX_AGE_SECONDS
  } as const;

  if (cookieChunks.length <= 1) {
    cookieStore.set(VAULT_COOKIE_NAME, serializedVault, options);
    return;
  }

  for (const [index, chunk] of cookieChunks.entries()) {
    cookieStore.set(`${VAULT_COOKIE_CHUNK_PREFIX}${index}`, chunk, options);
  }
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
    if (isSessionCookieName(cookie.name)) {
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
      sessionChunks[normalizeSessionCookieName(name)] = base.value;
    }
    // Buscar fragmentos .0, .1, .2...
    for (const c of allCookies) {
      if (c.name.startsWith(`${name}.`)) {
        sessionChunks[normalizeSessionCookieName(c.name)] = c.value;
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
    sessionChunks = { [CURRENT_SESSION_COOKIE_NAME]: decryptedRaw };
  }

  sessionChunks = Object.fromEntries(
    Object.entries(sessionChunks).map(([name, value]) => [
      normalizeSessionCookieName(name),
      value
    ])
  );

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
