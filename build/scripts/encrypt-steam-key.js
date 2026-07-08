import { createCipheriv, pbkdf2Sync, randomBytes } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

function encryptSteamApiKey(apiKey, secret) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = pbkdf2Sync(secret, salt, 310000, 32, "sha256");
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(apiKey.trim(), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    "ssg1",
    salt.toString("base64"),
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64")
  ].join(":");
}

async function main() {
  const apiKeyArg = process.argv[2] || process.env.STEAM_WEB_API_KEY;
  const secretArg = process.argv[3] || process.env.STEAM_KEY_SECRET;

  if (apiKeyArg && secretArg) {
    console.log(encryptSteamApiKey(apiKeyArg, secretArg));
    return;
  }

  const rl = createInterface({ input, output });
  try {
    const apiKey = apiKeyArg || await rl.question("Steam Web API key: ");
    const secret = secretArg || await rl.question("Encryption secret kept only on server: ");

    if (!apiKey.trim() || !secret.trim()) {
      console.error("Both Steam Web API key and encryption secret are required.");
      process.exitCode = 1;
      return;
    }

    console.log("\nSTEAM_WEB_API_KEY_ENCRYPTED=");
    console.log(encryptSteamApiKey(apiKey, secret));
    console.log("\nKeep STEAM_KEY_SECRET only in your hosting environment variables.");
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
