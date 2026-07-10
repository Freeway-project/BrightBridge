#!/usr/bin/env node

/**
 * scripts/dev-setup.mjs
 * 
 * Automates bootstrapping of a local development environment.
 * Runs cross-platform (Linux, macOS, WSL2/Windows).
 */

import cp from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import readline from "node:readline";


const ROOT_DIR = path.resolve(import.meta.dirname, "..");
const BACKUP_DIR = path.join(ROOT_DIR, "backups");
const WEB_ENV_LOCAL = path.join(ROOT_DIR, "apps/web/.env.local");
const WEB_ENV_EXAMPLE = path.join(ROOT_DIR, "apps/web/.env.example");

// Mask connection URLs for safe logging
function maskUrl(url) {
  if (!url) return "";
  return url.replace(/(postgresql?:\/\/)[^@]+@/, "$1****@");
}

// Simple env file parser
function parseEnvFile(filepath) {
  if (!fs.existsSync(filepath)) return {};
  const env = {};
  const content = fs.readFileSync(filepath, "utf8");
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    env[key] = val;
  }
  return env;
}

function resolveProdUrl() {
  if (process.env.PROD_DATABASE_URL) {
    return process.env.PROD_DATABASE_URL;
  }
  const mirrorEnv = parseEnvFile(path.join(ROOT_DIR, ".env.mirror"));
  if (mirrorEnv.PROD_DATABASE_URL) {
    return mirrorEnv.PROD_DATABASE_URL;
  }
  const prodEnv = parseEnvFile(path.join(ROOT_DIR, "apps/web/.env.prod"));
  if (prodEnv.DATABASE_URL) {
    return prodEnv.DATABASE_URL;
  }
  return null;
}

function main() {
  console.log("\n🚀 Starting CourseBridge local development setup...\n");

  // Step 1: Verify Docker Compose is available
  console.log("🔍 Checking Docker environment...");
  try {
    cp.execSync("docker info", { stdio: "ignore" });
    console.log("✅ Docker is running and accessible.\n");
  } catch (err) {
    console.error("❌ Docker daemon is not running or not reachable.");
    console.error("Please ensure Docker is running and your user belongs to the 'docker' group.");
    process.exit(1);
  }

  // Step 2: Run docker compose up
  console.log("🐘 Starting Postgres database container...");
  try {
    cp.execSync("docker compose up -d postgres", { stdio: "inherit", cwd: ROOT_DIR });
    console.log("✅ Database container started.\n");
  } catch (err) {
    console.error("❌ Failed to start database container via docker compose.");
    process.exit(1);
  }

  // Step 3: Poll DB health check using pg_isready inside the container
  console.log("⏳ Waiting for database container to be healthy...");
  let isReady = false;
  const timeout = 60 * 1000; // 60 seconds
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    try {
      const output = cp.execSync(
        "docker compose exec -T postgres pg_isready -U coursebridge_user -d coursebridge",
        { cwd: ROOT_DIR, encoding: "utf8", stdio: "pipe" }
      );
      if (output.includes("accepting connections")) {
        isReady = true;
        break;
      }
    } catch (e) {
      // Ignore error during startup
    }
    // Sleep 2 seconds
    cp.execSync("node -e \"setTimeout(() => {}, 2000)\"");
  }

  if (!isReady) {
    console.error("❌ Timeout: Database container did not become healthy within 60 seconds.");
    process.exit(1);
  }
  console.log("✅ Database is healthy and accepting connections.\n");

  // Step 4: Check if profiles table exists
  console.log("📊 Inspecting database schema...");
  let tableExists = false;
  try {
    const output = cp.execSync(
      "docker compose exec -T postgres psql -U coursebridge_user -d coursebridge -t -c \"SELECT to_regclass('public.profiles');\"",
      { cwd: ROOT_DIR, encoding: "utf8" }
    ).trim();
    if (output === "profiles" || output === "public.profiles") {
      tableExists = true;
    }
  } catch (err) {
    console.error("⚠️ Failed to check schema status. Proceeding under empty assumption...");
  }

  if (tableExists) {
    console.log("ℹ️ Database contains existing data (profiles table exists). Skipping restore.\n");
  } else {
    console.log("ℹ️ Database is empty.");
    const prodUrl = resolveProdUrl();
    if (prodUrl) {
      console.log(`📡 Production database connection found: ${maskUrl(prodUrl)}`);
      console.log("🔄 Pulling fresh database backup from production...");
      try {
        cp.execSync("bash scripts/backup-db.sh --prod", { 
          stdio: "inherit", 
          cwd: ROOT_DIR,
          env: { ...process.env, PROD_DATABASE_URL: prodUrl }
        });
        
        // Find the newest dump file in backups/
        const files = fs.readdirSync(BACKUP_DIR);
        const dumps = files
          .filter(f => f.startsWith("prod-full-") && f.endsWith(".dump"))
          .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime() }))
          .sort((a, b) => b.time - a.time);
          
        if (dumps.length === 0) {
          throw new Error("No backup dump file was created.");
        }
        
                const latestDump = path.join("backups", dumps[0].name);
        console.log(`🔄 Restoring ${latestDump} to local container...`);
        
        const restoreResult = cp.spawnSync("bash", ["scripts/restore-db-backup.sh", latestDump], {
          cwd: ROOT_DIR,
          input: "RESTORE\nlocalhost\n",
          stdio: ["pipe", "inherit", "inherit"],
          env: {
            ...process.env,
            RESTORE_DATABASE_URL: "postgresql://coursebridge_user:localdev@localhost:5433/coursebridge"
          }
        });
        
        if (restoreResult.status !== 0) {
          throw new Error(`Restore process exited with code ${restoreResult.status}`);
        }
        console.log("✅ Production backup successfully restored to local DB.\n");
      } catch (err) {
        console.error(`⚠️ Failed to backup/restore prod database: ${err.message}`);
        console.log("Setting up schema-only local database...\n");
      }
    } else {
      console.log("⚠️ No production database credentials found in environment (.env.mirror / .env.prod).");
      console.log("Skip database restore. Setting up schema-only local database...\n");
    }
  }

  // Step 5: Run migrations to ensure local database matches code state
  console.log("🔧 Running migrations...");
  try {
    cp.execSync("npm run dev:db:migrate", { stdio: "inherit", cwd: ROOT_DIR });
    console.log("✅ Database migrations applied.\n");
  } catch (err) {
    console.error("❌ Migrations failed.");
    process.exit(1);
  }

  // Step 6: Seed local DB to reset showcase passwords to 'Dev1234!'
  console.log("🌱 Seeding showcase account credentials...");
  try {
    cp.execSync("npm run dev:db:seed", { stdio: "inherit", cwd: ROOT_DIR });
    console.log("✅ Showcase credentials seeded.\n");
  } catch (err) {
    console.warn("⚠️ Database seed failed or skipped. Real users might not be unlocked.");
  }

  // Step 7: Create apps/web/.env.local if missing, fill config
  console.log("📝 Configuring apps/web/.env.local...");
  let webEnvContent = "";
  if (fs.existsSync(WEB_ENV_LOCAL)) {
    webEnvContent = fs.readFileSync(WEB_ENV_LOCAL, "utf8");
  } else if (fs.existsSync(WEB_ENV_EXAMPLE)) {
    webEnvContent = fs.readFileSync(WEB_ENV_EXAMPLE, "utf8");
  }

  // Helper to ensure key is present with a value
  function setEnvVar(content, key, val) {
    const regex = new RegExp(`^#?\\s*${key}=.*$`, "m");
    if (regex.test(content)) {
      return content.replace(regex, `${key}=${val}`);
    } else {
      return content.trim() + `\n${key}=${val}\n`;
    }
  }

  webEnvContent = setEnvVar(
    webEnvContent,
    "DATABASE_URL",
    "postgresql://coursebridge_user:localdev@localhost:5433/coursebridge"
  );
  webEnvContent = setEnvVar(webEnvContent, "ENABLE_DEV_LOGIN", "true");
  webEnvContent = setEnvVar(webEnvContent, "NEXT_PUBLIC_ENABLE_DEV_LOGIN", "true");
  webEnvContent = setEnvVar(webEnvContent, "NEXT_PUBLIC_CHAT_ENABLED", "true");

  // Generate SESSION_SECRET if missing or blank
  const currentEnv = parseEnvFile(WEB_ENV_LOCAL);
  if (!currentEnv.SESSION_SECRET) {
    const secret = crypto.randomBytes(32).toString("base64");
    webEnvContent = setEnvVar(webEnvContent, "SESSION_SECRET", `"${secret}"`);
  }
  if (!currentEnv.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY) {
    const key = crypto.randomBytes(32).toString("base64");
    webEnvContent = setEnvVar(webEnvContent, "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY", `"${key}"`);
  }

  fs.writeFileSync(WEB_ENV_LOCAL, webEnvContent, "utf8");
  console.log("✅ apps/web/.env.local successfully updated.\n");

  // Step 8: Log instructions
  console.log("✨ Setup complete! Showcase accounts unlocked:");
  console.log("   - Super Admin:   superadmin@coursebridge.dev / Dev1234!");
  console.log("   - Full Admin:    admin@coursebridge.dev / Dev1234!");
  console.log("   - TA / Staff:    ta@coursebridge.dev / Dev1234!");
  console.log("\n📡 Launching Next.js dev server...\n");

  // Step 9: Launch next dev
  const devProcess = cp.spawn("npm", ["run", "dev"], {
    cwd: ROOT_DIR,
    stdio: "inherit",
    shell: true
  });

  devProcess.on("exit", (code) => {
    process.exit(code || 0);
  });
}

main();

