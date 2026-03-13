#!/usr/bin/env node
/**
 * Output the user_preferences migration SQL so you can run it in the Supabase SQL editor.
 * Usage: node scripts/run-user-preferences-migration.js
 * Then paste the output into Supabase Dashboard → SQL Editor → New query → Run.
 */

const fs = require("fs");
const path = require("path");

const migrationPath = path.join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20250227000000_add_user_preferences.sql"
);

if (!fs.existsSync(migrationPath)) {
  console.error("Migration file not found:", migrationPath);
  process.exit(1);
}

const sql = fs.readFileSync(migrationPath, "utf8");
console.log("-- Run this in Supabase Dashboard → SQL Editor\n");
console.log(sql);
