#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env file
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');

const env = {};
envContent.split('\n').forEach(line => {
  if (line.startsWith('#') || !line.trim()) return;
  const [key, ...valueParts] = line.split('=');
  env[key.trim()] = valueParts.join('=').trim();
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function seedTestData() {
  console.log('🌱 Starting to seed test data...\n');

  try {
    // Get users
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .limit(10);

    if (userError) throw userError;

    const taUser = users.find(u => u.role === 'ta') || users[0];
    const adminUser = users.find(u => u.role === 'admin') || users[1];

    console.log(`✓ Found TA user: ${taUser?.id}`);
    console.log(`✓ Found Admin user: ${adminUser?.id}\n`);

    // Get courses
    const { data: courses, error: courseError } = await supabase
      .from('courses')
      .select('id, course_code, status')
      .limit(7);

    if (courseError) throw courseError;

    console.log(`✓ Found ${courses.length} courses\n`);

    const issueTypes = ['escalation', 'question', 'fix_needed', 'general'];
    const severities = ['critical', 'major', 'minor'];
    const statuses = ['open', 'in_review', 'resolved'];
    const titles = [
      'Missing quiz content from Moodle',
      'Grade scale mapping unclear',
      'Forum posts not migrating correctly',
      'Assignment due dates need review',
      'Video links broken in syllabus',
      'Student roster has duplicates',
      'Gradebook formula compatibility issue',
    ];
    const descriptions = [
      'The quiz on Week 3 appears to be missing all its questions from the Moodle import. Need to verify the import log.',
      'The Moodle scale goes from 0-100 but Brightspace uses letter grades. Clarification needed on conversion.',
      'Forum discussions from Moodle are not showing up. Check if nested replies are causing issues.',
      'Some assignments have due dates in the past. Need to confirm with instructor before proceeding.',
      'Several external video links in the syllabus return 404 errors after migration.',
      'Student roster shows 5 duplicate entries. Need to deduplicate before instructor handoff.',
      'The gradebook formulas use Moodle syntax which is not compatible with Brightspace. Need manual conversion.',
    ];

    const issuesData = courses.map((course, idx) => ({
      course_id: course.id,
      type: issueTypes[idx % issueTypes.length],
      severity: severities[idx % severities.length],
      status: statuses[idx % statuses.length],
      title: titles[idx % titles.length],
      description: descriptions[idx % descriptions.length],
      created_by: taUser.id,
      created_at: new Date(Date.now() - (7 - idx) * 24 * 60 * 60 * 1000).toISOString(),
      resolved_by: idx % 3 === 0 ? adminUser.id : null,
      resolved_at: idx % 3 === 0 ? new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() : null,
    }));

    console.log(`📝 Creating ${issuesData.length} test issues...`);
    const { data: issues, error: issueError } = await supabase
      .from('course_issues')
      .insert(issuesData)
      .select();

    if (issueError) {
      console.error('Issue Error:', issueError);
      throw issueError;
    }

    console.log(`✓ Created ${issues.length} issues\n`);

    // Add comments
    const commentsText = [
      'This looks like a data import issue. Can you check the migration logs?',
      'I\'ve reviewed the mapping and it should work. Let\'s test with a sample record.',
      'Escalating to Communication team for instructor follow-up.',
      'Confirmed fixed in the staging environment. Ready for re-review.',
      'Need more context on the exact failure point.',
      'Good catch! I\'ll investigate this in the logs.',
    ];

    const allComments = [];
    issues.forEach((issue, idx) => {
      for (let i = 0; i < 2; i++) {
        allComments.push({
          course_issue_id: issue.id,
          author_id: i % 2 === 0 ? adminUser.id : taUser.id,
          body: commentsText[(idx + i) % commentsText.length],
          created_at: new Date(Date.now() - (5 - i) * 24 * 60 * 60 * 1000).toISOString(),
        });
      }
    });

    console.log(`💬 Adding ${allComments.length} test comments...`);
    const { error: commentError } = await supabase
      .from('course_issue_comments')
      .insert(allComments);

    if (commentError) throw commentError;

    console.log(`✓ Created ${allComments.length} comments\n`);

    // Summary
    console.log('═══════════════════════════════════════════════════');
    console.log('✅ Test data seeded successfully!\n');
    console.log('📊 Summary:');
    console.log(`  • ${issues.length} issues created`);
    console.log(`  • ${allComments.length} comments added`);
    console.log(`  • ${courses.length} courses with issues\n`);
    console.log('📍 Test Issues Created:');
    issues.forEach((issue, idx) => {
      const course = courses[idx];
      console.log(`  ${idx + 1}. [${issue.status.toUpperCase()}] ${issue.title}`);
      console.log(`     Course: ${course.course_code} | Type: ${issue.type} | Severity: ${issue.severity}`);
    });
    console.log('\n🚀 Ready to test! Check the issue tracker in your dev app.');

  } catch (error) {
    console.error('❌ Error seeding data:', error.message);
    console.error(error);
    process.exit(1);
  }
}

seedTestData();
