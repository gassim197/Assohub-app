/**
 * Lance une commande de développement local avec Node en « IPv4 d'abord ».
 *
 * Sur un réseau sans IPv6 fonctionnel (Wi-Fi domestique sous Windows…), Node
 * tente d'abord l'adresse IPv6 de Neon / Vercel Blob et n'échoue qu'au bout
 * d'une dizaine de secondes (« fetch failed »). `--dns-result-order=ipv4first`
 * fait essayer l'IPv4 en premier.
 *
 * Ajouté à NODE_OPTIONS (sans écraser les options existantes) pour que les
 * processus enfants — les workers de `next dev` notamment — en héritent.
 * Utilisé seulement par les scripts npm de développement : ni `build`, ni
 * `start`, ni Vercel ne passent par ici.
 *
 * Usage : node scripts/with-ipv4first.mjs <commande> [arguments…]
 */
import { spawn } from "node:child_process";

const FLAG = "--dns-result-order=ipv4first";

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error("Usage : node scripts/with-ipv4first.mjs <commande> [arguments…]");
  process.exit(1);
}

const current = process.env.NODE_OPTIONS ?? "";
const nodeOptions = current.includes("--dns-result-order") ? current : `${current} ${FLAG}`.trim();

// Une seule chaîne de commande (et non commande + tableau d'arguments) : avec
// `shell: true`, requis sous Windows pour résoudre les binaires `.cmd` de
// node_modules/.bin, Node 24 déprécie le passage d'arguments séparés.
const quote = (value) => (/[\s"]/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value);
const commandLine = [command, ...args].map(quote).join(" ");

const child = spawn(commandLine, {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, NODE_OPTIONS: nodeOptions },
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
