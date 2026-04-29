import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const devPassword = "CourseBridgeDev123!";
const devUsers = {
  admin: "admin@coursebridge.dev",
  ta: "ta@coursebridge.dev",
  communications: "communications@coursebridge.dev",
  instructor: "instructor@coursebridge.dev",
  super_admin: "superadmin@coursebridge.dev"
};

loadEnvFiles([".env.local", ".env.development", "apps/web/.env.local"]);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
  console.error(
    [
      "Missing Supabase env.",
      "Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SERVICE_ROLE_KEY."
    ].join("\n")
  );
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const tempIds = [];
let missingProfileUserId = null;

try {
  const adminProfile = await getProfileByEmail(devUsers.admin);

  if (!adminProfile) {
    throw new Error("Missing dev admin profile. Run `npm run seed:dev` first.");
  }

  const privateCourse = await createTempCourse({
    adminProfile,
    status: "course_created",
    sourceCourseId: `RLS-CHECK-PRIVATE-${randomUUID()}`
  });

  const handoffCourse = await createTempCourse({
    adminProfile,
    status: "ready_for_instructor",
    sourceCourseId: `RLS-CHECK-HANDOFF-${randomUUID()}`
  });

  await checkAdminAccess(privateCourse, handoffCourse);
  await checkTaAccess(privateCourse, handoffCourse);
  await checkInstructorAccess(privateCourse, handoffCourse);
  await checkCommunicationsAccess(privateCourse, handoffCourse);
  await checkMissingProfileAccess();

  console.log("Core RLS checks passed.");
} catch (error) {
  console.error("Core RLS checks failed.");
  console.error(error.message ?? error);
  process.exitCode = 1;
} finally {
  await cleanup();
}

async function checkAdminAccess(privateCourse, handoffCourse) {
  const client = await signIn(devUsers.admin);
  const courses = await visibleCourses(client);
  assertHasSource(courses, privateCourse.source_course_id, "admin should read private control course");
  assertHasSource(courses, handoffCourse.source_course_id, "admin should read handoff control course");

  const events = await visibleStatusEvents(client, handoffCourse.id);
  assertEqual(events.length, 1, "admin should read handoff status event");
}

async function checkTaAccess(privateCourse, handoffCourse) {
  const client = await signIn(devUsers.ta);
  const courses = await visibleCourses(client);
  assertHasSource(courses, "DEV-MOODLE-101", "TA should read assigned course");
  assertHasSource(courses, "DEV-MOODLE-202", "TA should read second assigned course");
  assertMissingSource(courses, privateCourse.source_course_id, "TA should not read unassigned private course");
  assertMissingSource(courses, handoffCourse.source_course_id, "TA should not read unassigned handoff course");

  const events = await visibleStatusEvents(client, handoffCourse.id);
  assertEqual(events.length, 0, "TA should not read unassigned handoff status event");
}

async function checkInstructorAccess(privateCourse, handoffCourse) {
  const client = await signIn(devUsers.instructor);
  const courses = await visibleCourses(client);
  assertHasSource(courses, "DEV-MOODLE-101", "instructor should read assigned course");
  assertMissingSource(courses, privateCourse.source_course_id, "instructor should not read private control course");
  assertMissingSource(courses, handoffCourse.source_course_id, "instructor should not read unassigned handoff course");
}

async function checkCommunicationsAccess(privateCourse, handoffCourse) {
  const client = await signIn(devUsers.communications);
  const courses = await visibleCourses(client);
  assertHasSource(courses, handoffCourse.source_course_id, "communications should read handoff control course");
  assertMissingSource(courses, privateCourse.source_course_id, "communications should not read private control course");

  const events = await visibleStatusEvents(client, handoffCourse.id);
  assertEqual(events.length, 1, "communications should read handoff status event");
}

async function checkMissingProfileAccess() {
  const email = `missing-profile-${randomUUID()}@coursebridge.dev`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: devPassword,
    email_confirm: true
  });

  if (error) {
    throw new Error(`Could not create missing-profile auth user: ${error.message}`);
  }

  missingProfileUserId = data.user.id;

  const client = await signIn(email);
  const { data: profiles, error: profileError } = await client
    .from("profiles")
    .select("id,role");

  if (profileError) {
    throw new Error(`Missing-profile profile query failed: ${profileError.message}`);
  }

  assertEqual(profiles.length, 0, "missing-profile user should not read any profiles");

  const courses = await visibleCourses(client);
  assertEqual(courses.length, 0, "missing-profile user should not read any courses");
}

async function createTempCourse({ adminProfile, status, sourceCourseId }) {
  const { data: course, error: courseError } = await admin
    .from("courses")
    .insert({
      source_course_id: sourceCourseId,
      target_course_id: null,
      title: "RLS Check Control Course",
      term: "RLS Check",
      department: "QA",
      status,
      created_by: adminProfile.id
    })
    .select("*")
    .single();

  if (courseError) {
    throw new Error(`Could not create control course: ${courseError.message}`);
  }

  tempIds.push(course.id);

  const { error: eventError } = await admin.from("course_status_events").insert({
    course_id: course.id,
    from_status: null,
    to_status: status,
    actor_id: adminProfile.id,
    actor_role: adminProfile.role,
    note: "Created by core RLS check script."
  });

  if (eventError) {
    throw new Error(`Could not create control status event: ${eventError.message}`);
  }

  return course;
}

async function getProfileByEmail(email) {
  const { data, error } = await admin
    .from("profiles")
    .select("id,email,role")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load profile ${email}: ${error.message}`);
  }

  return data;
}

async function signIn(email) {
  const client = createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { error } = await client.auth.signInWithPassword({
    email,
    password: devPassword
  });

  if (error) {
    throw new Error(`Could not sign in ${email}: ${error.message}`);
  }

  return client;
}

async function visibleCourses(client) {
  const { data, error } = await client
    .from("courses")
    .select("id,source_course_id,status")
    .order("source_course_id", { ascending: true });

  if (error) {
    throw new Error(`Could not query visible courses: ${error.message}`);
  }

  return data;
}

async function visibleStatusEvents(client, courseId) {
  const { data, error } = await client
    .from("course_status_events")
    .select("id,course_id,to_status")
    .eq("course_id", courseId);

  if (error) {
    throw new Error(`Could not query visible status events: ${error.message}`);
  }

  return data;
}

function assertHasSource(courses, sourceCourseId, message) {
  if (!courses.some((course) => course.source_course_id === sourceCourseId)) {
    throw new Error(message);
  }
}

function assertMissingSource(courses, sourceCourseId, message) {
  if (courses.some((course) => course.source_course_id === sourceCourseId)) {
    throw new Error(message);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}. Expected ${expected}, got ${actual}.`);
  }
}

async function cleanup() {
  if (tempIds.length > 0) {
    const { error } = await admin.from("courses").delete().in("id", tempIds);

    if (error) {
      console.error(`Could not clean up control courses: ${error.message}`);
    }
  }

  if (missingProfileUserId) {
    const { error } = await admin.auth.admin.deleteUser(missingProfileUserId);

    if (error) {
      console.error(`Could not clean up missing-profile user: ${error.message}`);
    }
  }
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
