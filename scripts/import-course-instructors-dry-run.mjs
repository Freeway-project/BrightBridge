import { existsSync, readFileSync } from "node:fs";
import process from "node:process";
import pg from "pg";

const DEFAULT_CSV_PATH = "Educator Lookup(Educator Lookup).csv";
const REQUIRED_HEADERS = ["Course_Name", "email", "lastname", "firstname"];
const ASSIGNMENT_ROLE = "instructor";

loadEnvFiles([".env.local", ".env.development", "apps/web/.env.local"]);

const csvPath = process.argv[2] ?? DEFAULT_CSV_PATH;
const databaseUrl = process.env.DATABASE_URL;

if (!existsSync(csvPath)) {
  console.error(`CSV file not found: ${csvPath}`);
  process.exit(1);
}

if (!databaseUrl) {
  console.error(
    [
      "Missing DATABASE_URL.",
      "Add your Supabase Postgres connection string to .env.local or apps/web/.env.local."
    ].join("\n")
  );
  process.exit(1);
}

const csvText = readFileSync(csvPath, "utf8");
const rows = parseCsv(csvText);

for (const header of REQUIRED_HEADERS) {
  if (!rows.headers.includes(header)) {
    console.error(`Missing required CSV header: ${header}`);
    process.exit(1);
  }
}

const stats = buildStats(rows.records);

const client = new pg.Client({
  ...parseDatabaseUrl(databaseUrl),
  ssl: {
    rejectUnauthorized: false
  }
});

try {
  await client.connect();
  const dbSummary = await buildDbDryRunSummary(client, stats);

  console.log(
    JSON.stringify(
      {
        csv: {
          path: csvPath,
          total_rows: rows.records.length,
          headers: rows.headers
        },
        quality: stats.quality,
        uniques: stats.uniques,
        dry_run: dbSummary
      },
      null,
      2
    )
  );
} catch (error) {
  console.error("Dry-run import analysis failed.");
  console.error(error.message ?? error);
  process.exitCode = 1;
} finally {
  await client.end();
}

function buildStats(records) {
  const uniqueEmails = new Set();
  const uniqueCourses = new Set();
  const uniquePairs = new Set();
  const duplicatePairs = new Set();

  let missingCourseName = 0;
  let missingEmail = 0;
  let missingFirstName = 0;
  let missingLastName = 0;
  let invalidEmailFormat = 0;

  const normalizedRecords = [];

  for (const raw of records) {
    const courseName = normalizeText(raw.Course_Name);
    const email = normalizeEmail(raw.email);
    const firstName = normalizeText(raw.firstname);
    const lastName = normalizeText(raw.lastname);

    if (!courseName) {
      missingCourseName += 1;
    }
    if (!email) {
      missingEmail += 1;
    }
    if (!firstName) {
      missingFirstName += 1;
    }
    if (!lastName) {
      missingLastName += 1;
    }
    if (email && !isSimpleValidEmail(email)) {
      invalidEmailFormat += 1;
    }

    const pairKey = `${courseName}||${email}`;
    if (courseName && email) {
      if (uniquePairs.has(pairKey)) {
        duplicatePairs.add(pairKey);
      } else {
        uniquePairs.add(pairKey);
      }
    }

    if (email) {
      uniqueEmails.add(email);
    }
    if (courseName) {
      uniqueCourses.add(courseName);
    }

    normalizedRecords.push({
      course_name: courseName,
      email,
      first_name: firstName,
      last_name: lastName
    });
  }

  return {
    normalizedRecords,
    uniqueEmails: [...uniqueEmails],
    uniqueCourses: [...uniqueCourses],
    uniquePairs: [...uniquePairs],
    quality: {
      missing_course_name: missingCourseName,
      missing_email: missingEmail,
      missing_firstname: missingFirstName,
      missing_lastname: missingLastName,
      invalid_email_simple_check: invalidEmailFormat,
      duplicate_course_email_pairs: duplicatePairs.size
    },
    uniques: {
      unique_courses: uniqueCourses.size,
      unique_instructor_emails: uniqueEmails.size,
      unique_course_email_pairs: uniquePairs.size
    }
  };
}

async function buildDbDryRunSummary(client, stats) {
  const existingEmails = await fetchExistingValues(client, "profiles", "email", stats.uniqueEmails);
  const existingCourses = await fetchExistingValues(
    client,
    "courses",
    "title",
    stats.uniqueCourses
  );
  const existingPairs = await fetchExistingCourseInstructorPairs(client);

  let newAssignments = 0;
  let existingAssignments = 0;

  for (const key of stats.uniquePairs) {
    if (existingPairs.has(key)) {
      existingAssignments += 1;
    } else {
      newAssignments += 1;
    }
  }

  return {
    assumptions: {
      course_match_key: "courses.title <-> CSV Course_Name",
      assignment_role: ASSIGNMENT_ROLE
    },
    profiles: {
      existing: existingEmails.size,
      to_insert: stats.uniqueEmails.length - existingEmails.size
    },
    courses: {
      existing: existingCourses.size,
      to_insert: stats.uniqueCourses.length - existingCourses.size
    },
    course_assignments: {
      existing_pairs: existingAssignments,
      to_insert_pairs: newAssignments
    }
  };
}

async function fetchExistingValues(client, tableName, columnName, values) {
  const existing = new Set();

  for (const chunk of chunkArray(values, 1000)) {
    if (chunk.length === 0) {
      continue;
    }

    const result = await client.query(
      `select ${columnName} as value from public.${tableName} where ${columnName} = any($1::text[])`,
      [chunk]
    );

    for (const row of result.rows) {
      existing.add(normalizeText(row.value).toLowerCase());
    }
  }

  return existing;
}

async function fetchExistingCourseInstructorPairs(client) {
  const pairs = new Set();
  const result = await client.query(
    `
      select lower(trim(c.title)) as course_title, lower(trim(p.email)) as email
      from public.course_assignments ca
      join public.courses c on c.id = ca.course_id
      join public.profiles p on p.id = ca.profile_id
      where ca.role = $1
    `,
    [ASSIGNMENT_ROLE]
  );

  for (const row of result.rows) {
    pairs.add(`${row.course_title}||${row.email}`);
  }

  return pairs;
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length === 0) {
    return {
      headers: [],
      records: []
    };
  }

  const headers = parseCsvLine(lines[0]);
  const records = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCsvLine(lines[i]);
    const row = {};
    for (let j = 0; j < headers.length; j += 1) {
      row[headers[j]] = values[j] ?? "";
    }
    records.push(row);
  }

  return {
    headers,
    records
  };
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (ch === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += ch;
  }

  values.push(current);
  return values;
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function isSimpleValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function chunkArray(values, size) {
  const chunks = [];
  for (let i = 0; i < values.length; i += size) {
    chunks.push(values.slice(i, i + size));
  }
  return chunks;
}

function loadEnvFiles(files) {
  for (const file of files) {
    if (!existsSync(file)) {
      continue;
    }

    const lines = readFileSync(file, "utf8").split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const equalsIndex = trimmed.indexOf("=");

      if (equalsIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, equalsIndex).trim();
      const value = trimmed.slice(equalsIndex + 1).trim();

      if (!process.env[key]) {
        process.env[key] = value.replace(/^["']|["']$/g, "");
      }
    }
  }
}

function parseDatabaseUrl(value) {
  try {
    new URL(value);
    return {
      connectionString: value
    };
  } catch {
    return parseSupabaseDatabaseUrl(value);
  }
}

function parseSupabaseDatabaseUrl(value) {
  const protocolMatch = value.match(/^postgres(?:ql)?:\/\//);

  if (!protocolMatch) {
    throw new Error("DATABASE_URL must start with postgresql:// or postgres://.");
  }

  const withoutProtocol = value.slice(protocolMatch[0].length);
  const atIndex = withoutProtocol.lastIndexOf("@");

  if (atIndex === -1) {
    throw new Error("DATABASE_URL must include user, password, host, and database.");
  }

  const userInfo = withoutProtocol.slice(0, atIndex);
  const hostInfo = withoutProtocol.slice(atIndex + 1);
  const passwordIndex = userInfo.indexOf(":");

  if (passwordIndex === -1) {
    throw new Error("DATABASE_URL must include a database password.");
  }

  const user = userInfo.slice(0, passwordIndex);
  const password = userInfo.slice(passwordIndex + 1);
  const slashIndex = hostInfo.indexOf("/");

  if (slashIndex === -1) {
    throw new Error("DATABASE_URL must include a database name.");
  }

  const hostAndPort = hostInfo.slice(0, slashIndex);
  const databaseAndQuery = hostInfo.slice(slashIndex + 1);
  const portIndex = hostAndPort.lastIndexOf(":");
  const host = portIndex === -1 ? hostAndPort : hostAndPort.slice(0, portIndex);
  const port = portIndex === -1 ? 5432 : Number(hostAndPort.slice(portIndex + 1));
  const database = databaseAndQuery.split("?")[0];

  return {
    user,
    password,
    host,
    port,
    database
  };
}
