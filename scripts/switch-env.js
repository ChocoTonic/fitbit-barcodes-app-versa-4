#!/usr/bin/env node

/**
 * Environment Configuration Switcher for Fitbit SDK
 *
 * Usage:
 *   node scripts/switch-env.js dev   - Switch to development/emulator config
 *   node scripts/switch-env.js prod  - Switch to production config
 *
 * This merges the base package.json config with environment-specific
 * devDependencies and build targets.
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const env = process.argv[2];

if (!env || !["dev", "prod"].includes(env)) {
    console.error("Usage: node scripts/switch-env.js [dev|prod]");
    console.error("  dev  - Use emulator-compatible SDK & targets");
    console.error("  prod - Use production SDK & device targets");
    process.exit(1);
}

const rootDir = path.join(__dirname, "..");
const configDir = path.join(rootDir, "config");

// Read base config and environment-specific config
const baseConfig = JSON.parse(
    fs.readFileSync(path.join(configDir, "package.base.json"), "utf8"),
);
const envConfig = JSON.parse(
    fs.readFileSync(path.join(configDir, `env.${env}.json`), "utf8"),
);

// Read current package.json to preserve scripts and type
const currentPackage = JSON.parse(
    fs.readFileSync(path.join(rootDir, "package.json"), "utf8"),
);

// Merge configs - environment config fully replaces devDependencies and buildTargets
const finalConfig = {
    type: currentPackage.type,
    devDependencies: envConfig.devDependencies,
    fitbit: {
        ...baseConfig.fitbit,
        buildTargets: envConfig.buildTargets,
    },
    scripts: currentPackage.scripts || {},
};

// Write to package.json
fs.writeFileSync(
    path.join(rootDir, "package.json"),
    JSON.stringify(finalConfig, null, 4) + "\n",
);

console.log(`✓ Switched to ${env.toUpperCase()} environment`);
console.log(
    `  SDK: ${Object.entries(envConfig.devDependencies)
        .map(([k, v]) => `${k}@${v}`)
        .join(", ")}`,
);
console.log(`  Build targets: ${envConfig.buildTargets.join(", ")}`);

// Automatically run npm install after switching
try {
    console.log("Running npm install to update dependencies...");
    execSync("npm install", { stdio: "inherit", cwd: rootDir });
    console.log("✓ npm install complete");
} catch (err) {
    console.error("✗ npm install failed:", err.message);
    process.exit(1);
}
