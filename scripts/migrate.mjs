import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = neon(url);
const schemaPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "lib",
  "schema.sql"
);
const schema = readFileSync(schemaPath, "utf8");

// Strip full-line and trailing `-- ...` comments so semicolons inside comments
// don't break the naive split on ";".
const stripped = schema
  .split("\n")
  .map((line) => line.replace(/--.*$/, ""))
  .join("\n");

const statements = stripped
  .split(";")
  .map((statement) => statement.trim())
  .filter(Boolean);

for (const statement of statements) {
  await sql.query(statement);
  console.log("OK:", statement.slice(0, 70).replace(/\s+/g, " "));
}

console.log(`Applied ${statements.length} statements.`);
