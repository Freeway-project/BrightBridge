import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const roles = ["ta", "admin", "communications", "instructor", "super_admin"];
const users = [
  {
    email: "admin@coursebridge.dev",
    fullName: "Dev Admin",
    role: "admin"
  },
  {
    email: "ta@coursebridge.dev",
    fullName: "Dev TA",
    role: "ta"
  },
  {
    email: "communications@coursebridge.dev",
    fullName: "Dev Communications",
    role: "communications"
  },
  {
    email: "instructor@coursebridge.dev",
    fullName: "Dev Instructor",
    role: "instructor"
  },
  {
    email: "superadmin@coursebridge.dev",
    fullName: "Dev Super Admin",
    role: "super_admin"
  }
];

const password = "CourseBridgeDev123!";

loadEnvFiles([".env.local", ".env.development", "apps/web/.env.local"]);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    [
      "Missing Supabase seed env.",
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local or apps/web/.env.local.",
      "Copy .env.example if you need a template."
    ].join("\n")
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

try {
  const profiles = new Map();

  for (const user of users) {
    const authUser = await ensureAuthUser(user);
    profiles.set(user.role, {
      id: authUser.id,
      email: user.email,
      full_name: user.fullName,
      role: user.role
    });
  }

  await upsertProfiles([...profiles.values()]);
  await seedCourses(profiles);

  console.log("\nDev seed complete.");
  console.log("\nTest users:");
  for (const user of users) {
    console.log(`- ${user.role}: ${user.email} / ${password}`);
  }
} catch (error) {
  console.error("\nDev seed failed.");
  console.error(error.message ?? error);
  process.exit(1);
}

async function ensureAuthUser(user) {
  const existing = await findUserByEmail(user.email);

  if (existing) {
    return existing;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: user.fullName,
      role: user.role
    }
  });

  if (error) {
    throw new Error(`Could not create auth user ${user.email}: ${error.message}`);
  }

  return data.user;
}

async function findUserByEmail(email) {
  let page = 1;

  while (page < 20) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100
    });

    if (error) {
      throw new Error(`Could not list auth users: ${error.message}`);
    }

    const match = data.users.find((user) => user.email === email);

    if (match) {
      return match;
    }

    if (data.users.length < 100) {
      return null;
    }

    page += 1;
  }

  return null;
}

async function upsertProfiles(profiles) {
  const { error } = await supabase.from("profiles").upsert(profiles, {
    onConflict: "id"
  });

  if (error) {
    throw new Error(
      `Could not upsert profiles. Has the initial schema been applied? ${error.message}`
    );
  }
}

async function seedCourses(profiles) {
  const admin = profiles.get("admin");
  const ta = profiles.get("ta");
  const communications = profiles.get("communications");
  const instructor = profiles.get("instructor");
  const superAdmin = profiles.get("super_admin");

  const courses = [
    {
      source_course_id: "DEV-MOODLE-101",
      target_course_id: "DEV-BRIGHTSPACE-101",
      title: "Introduction to Communication Studies",
      term: "2026 Spring",
      department: "Communication",
      status: "assigned_to_ta",
      assignments: [
        { profile_id: ta.id, role: "ta" },
        { profile_id: instructor.id, role: "instructor" }
      ]
    },
    {
      source_course_id: "DEV-MOODLE-202",
      target_course_id: "DEV-BRIGHTSPACE-202",
      title: "Digital Media Methods",
      term: "2026 Spring",
      department: "Communication",
      status: "submitted_to_admin",
      assignments: [
        { profile_id: ta.id, role: "ta" },
        { profile_id: admin.id, role: "admin" },
        { profile_id: instructor.id, role: "instructor" }
      ]
    },
    {
      source_course_id: "DEV-MOODLE-303",
      target_course_id: "DEV-BRIGHTSPACE-303",
      title: "Instructor Review Sample",
      term: "2026 Summer",
      department: "Communication",
      status: "sent_to_instructor",
      assignments: [
        { profile_id: communications.id, role: "communications" },
        { profile_id: instructor.id, role: "instructor" },
        { profile_id: superAdmin.id, role: "super_admin" }
      ]
    }
  ];

  for (const course of courses) {
    const savedCourse = await upsertCourse(course, admin.id);
    await upsertAssignments(savedCourse.id, course.assignments, admin.id);
    await ensureStatusEvent(savedCourse.id, course.status, admin.id, admin.role);
    await seedReviewResponses(savedCourse.id, ta.id);
  }
}

async function upsertCourse(course, createdBy) {
  const { data: existing, error: findError } = await supabase
    .from("courses")
    .select("*")
    .eq("source_course_id", course.source_course_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (findError) {
    throw new Error(`Could not find course ${course.source_course_id}: ${findError.message}`);
  }

  if (existing) {
    const { data, error } = await supabase
      .from("courses")
      .update({
        target_course_id: course.target_course_id,
        title: course.title,
        term: course.term,
        department: course.department,
        status: course.status
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Could not update course ${course.source_course_id}: ${error.message}`);
    }

    return data;
  }

  const { data, error } = await supabase
    .from("courses")
    .insert({
      source_course_id: course.source_course_id,
      target_course_id: course.target_course_id,
      title: course.title,
      term: course.term,
      department: course.department,
      status: course.status,
      created_by: createdBy
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Could not create course ${course.source_course_id}: ${error.message}`);
  }

  return data;
}

async function upsertAssignments(courseId, assignments, assignedBy) {
  const rows = assignments.map((assignment) => ({
    course_id: courseId,
    profile_id: assignment.profile_id,
    role: assignment.role,
    assigned_by: assignedBy
  }));

  const { error } = await supabase.from("course_assignments").upsert(rows, {
    onConflict: "course_id,profile_id,role"
  });

  if (error) {
    throw new Error(`Could not upsert assignments: ${error.message}`);
  }
}

async function ensureStatusEvent(courseId, status, actorId, actorRole) {
  const { data: existing, error: findError } = await supabase
    .from("course_status_events")
    .select("id")
    .eq("course_id", courseId)
    .eq("to_status", status)
    .limit(1);

  if (findError) {
    throw new Error(`Could not find status event: ${findError.message}`);
  }

  if (existing.length > 0) {
    return;
  }

  const { error } = await supabase.from("course_status_events").insert({
    course_id: courseId,
    from_status: null,
    to_status: status,
    actor_id: actorId,
    actor_role: actorRole,
    note: "Created by dev seed script."
  });

  if (error) {
    throw new Error(`Could not create status event: ${error.message}`);
  }
}

async function seedReviewResponses(courseId, respondedBy) {
  const { data: sections, error: sectionsError } = await supabase
    .from("review_sections")
    .select("id,key");

  if (sectionsError) {
    throw new Error(`Could not load review sections: ${sectionsError.message}`);
  }

  const rows = sections.map((section) => ({
    course_id: courseId,
    section_id: section.id,
    responded_by: respondedBy,
    status: "draft",
    response_data: {
      seeded: true,
      section: section.key,
      notes: "Sample dev response. Replace during manual testing."
    }
  }));

  if (rows.length === 0) {
    return;
  }

  const { error } = await supabase.from("review_responses").upsert(rows, {
    onConflict: "course_id,section_id"
  });

  if (error) {
    throw new Error(`Could not upsert review responses: ${error.message}`);
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
