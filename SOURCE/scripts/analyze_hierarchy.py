"""
Analyze LMS Hierarchy CSVs and prepare data for DB insertion.

Sources:
  - ADs-Table 1.csv         → Associate Deans + their VP/Dean supervisors
  - Admin Edit-Table 1.csv  → admin_full users
  - Admin View only-Table 1.csv → admin_viewer users
  - Chairpersons-Table 1.csv → dept_head users + department names

Target tables:
  - profiles               (email, full_name, role)
  - organizational_units   (name, type, parent_id)
  - org_unit_members       (profile_id, org_unit_id, title)
"""

import csv
import json
import re
from pathlib import Path
from collections import defaultdict

DATA_DIR = Path(__file__).parent.parent / "LMS Heirarchy lists"


# ── helpers ───────────────────────────────────────────────────────────────────

def norm_email(e: str) -> str:
    return e.strip().lower()

def full_name(last: str, first: str) -> str:
    return f"{first.strip()} {last.strip()}"

def name_matches_email(last: str, first: str, email: str) -> bool:
    """Both the first initial AND some part of the surname must appear in the email prefix."""
    local = email.split("@")[0].lower()
    first_s = first.strip().lower()
    initial = first_s[0] if first_s else ""
    # Check each hyphenated part of the surname
    surname_parts = [p.lower()[:4] for p in last.strip().replace(" ", "-").split("-") if p]
    surname_ok = any(part in local for part in surname_parts)
    initial_ok = initial in local
    return surname_ok and initial_ok

def derive_name_from_email(email_local: str) -> str:
    """Guess 'Initial. Surname' from a local part like 'wwheeler' → 'W. Wheeler'."""
    clean = re.sub(r'\d+$', '', email_local.lower())
    if len(clean) < 2:
        return clean.upper() + "."
    initial = clean[0].upper()
    surname = clean[1:].capitalize()
    return f"{initial}. {surname}"


# ── 1. Load Admin Edit (admin_full) ──────────────────────────────────────────

admin_full_users: list[dict] = []
with open(DATA_DIR / "Admin Edit-Table 1.csv") as f:
    next(f)  # skip "Table 1" export header
    for row in csv.DictReader(f):
        email = norm_email(row["Email"])
        if not email:
            continue
        admin_full_users.append({
            "email": email,
            "full_name": full_name(row["Last Name"], row["First Name"]),
            "role": "admin_full",
        })

print(f"admin_full users: {len(admin_full_users)}")
for u in admin_full_users:
    print(f"  {u['full_name']:<30} {u['email']}")


# ── 2. Load Admin View (admin_viewer) ────────────────────────────────────────

admin_viewer_users: list[dict] = []
with open(DATA_DIR / "Admin View only-Table 1.csv") as f:
    next(f)  # skip "Table 1" export header
    for row in csv.DictReader(f):
        email = norm_email(row["Email"])
        if not email:
            continue
        admin_viewer_users.append({
            "email": email,
            "full_name": full_name(row["Last Name"], row["First Name"]),
            "role": "admin_viewer",
        })

print(f"\nadmin_viewer users: {len(admin_viewer_users)}")
for u in admin_viewer_users:
    print(f"  {u['full_name']:<30} {u['email']}")


# ── 3. Load ADs → derive schools and VPs ─────────────────────────────────────

# ad_email → { full_name, email, school, vp_email }
ads: dict[str, dict] = {}
# vp_email → { full_name, email, school }
vps: dict[str, dict] = {}
# school → vp_email
school_to_vp: dict[str, str] = {}

with open(DATA_DIR / "ADs-Table 1.csv") as f:
    reader = csv.reader(f)
    next(reader)   # skip "Table 1" export header
    header = next(reader)
    # cols: LastName, FirstName, Email, (Reports to - blank), VP_Last, VP_First, VP_Email, , , Department
    for row in reader:
        if not any(row):
            continue
        ad_last, ad_first, ad_email = row[0], row[1], norm_email(row[2])
        vp_last, vp_first, vp_email = row[4], row[5], norm_email(row[6])
        school = row[9].strip()

        if not ad_email:
            continue

        ads[ad_email] = {
            "email": ad_email,
            "full_name": full_name(ad_last, ad_first),
            "role": "standard_user",
            "title": "associate_dean",
            "school": school,
        }

        if vp_email:
            vps[vp_email] = {
                "email": vp_email,
                "full_name": full_name(vp_last, vp_first),
                "role": "standard_user",
                "title": "vp",
                "school": school,
            }
            school_to_vp[school] = vp_email

print(f"\nAssociate Deans: {len(ads)}")
for ad in ads.values():
    print(f"  {ad['full_name']:<30} {ad['email']:<40} school={ad['school']}")

print(f"\nVPs/Deans: {len(vps)}")
for vp in vps.values():
    print(f"  {vp['full_name']:<30} {vp['email']:<40} school={vp['school']}")


# ── 4. Map AD email → school ──────────────────────────────────────────────────

ad_to_school: dict[str, str] = {
    ad["email"]: ad["school"] for ad in ads.values()
}


# ── 5. Load Chairpersons ──────────────────────────────────────────────────────

# email → { full_name, dept, supervisor_ad_emails: set }
chairs: dict[str, dict] = {}
# dept → set of AD emails
dept_to_ads: dict[str, set] = defaultdict(set)
data_issues: list[str] = []

with open(DATA_DIR / "Chairpersons-Table 1.csv") as f:
    reader = csv.reader(f)
    next(reader)  # skip "Table 1" export header
    next(reader)  # skip column headers
    for i, row in enumerate(reader, start=2):
        if not any(row):
            continue
        last, first, dept, email = row[0], row[1], row[2].strip(), norm_email(row[3])
        ad_last, ad_first, ad_email = row[5], row[6], norm_email(row[7])

        if not email:
            continue

        email_local = email.split("@")[0].lower()

        if name_matches_email(last, first, email):
            name_to_use = full_name(last, first)
        else:
            # Name columns are corrupted (CSV row-shift). Derive best-guess from email.
            name_to_use = derive_name_from_email(email_local)
            data_issues.append(
                f"Row {i}: CSV name '{full_name(last, first)}' does not match "
                f"email '{email}' — using email-derived name '{name_to_use}'"
            )

        if email not in chairs:
            chairs[email] = {
                "email": email,
                "full_name": name_to_use,
                "role": "standard_user",
                "title": "dept_head",
                "dept": dept,
                "supervisor_ad_emails": set(),
            }
        else:
            # On duplicate email (same person, second AD): keep the better name
            # (prefer name that actually matches the email)
            if name_matches_email(last, first, email):
                chairs[email]["full_name"] = full_name(last, first)
        chairs[email]["supervisor_ad_emails"].add(ad_email)
        dept_to_ads[dept].add(ad_email)

print(f"\nChairpersons (unique by email): {len(chairs)}")
for c in chairs.values():
    ads_for_chair = [ads[e]["full_name"] for e in c["supervisor_ad_emails"] if e in ads]
    print(f"  {c['full_name']:<30} {c['email']:<40} dept={c['dept']}")
    print(f"    reports to: {', '.join(ads_for_chair)}")


# ── 6. Data quality issues ────────────────────────────────────────────────────

print(f"\n{'='*60}")
print(f"DATA QUALITY ISSUES ({len(data_issues)} found):")
for issue in data_issues:
    print(f"  ⚠  {issue}")
if not data_issues:
    print("  None found.")


# ── 7. Derive org structure ───────────────────────────────────────────────────

# Departments → which school do they belong to?
dept_to_school: dict[str, str] = {}
dept_school_conflicts: list[str] = []

for dept, ad_emails in dept_to_ads.items():
    schools = {ad_to_school[e] for e in ad_emails if e in ad_to_school}
    if len(schools) == 1:
        dept_to_school[dept] = schools.pop()
    elif len(schools) > 1:
        dept_school_conflicts.append(
            f"  {dept}: spans schools {schools}"
        )
    else:
        dept_school_conflicts.append(
            f"  {dept}: no matching school found (AD emails: {ad_emails})"
        )

if dept_school_conflicts:
    print(f"\nDEPARTMENT→SCHOOL CONFLICTS:")
    for c in dept_school_conflicts:
        print(c)

schools = sorted(set(ad_to_school.values()))
departments = sorted(dept_to_school.keys())

print(f"\n{'='*60}")
print(f"ORG HIERARCHY SUMMARY")
print(f"  Institution:  Okanagan College")
print(f"  Schools:      {len(schools)}")
for s in schools:
    depts = [d for d, sc in dept_to_school.items() if sc == s]
    print(f"    - {s} ({len(depts)} depts)")
    for d in sorted(depts):
        print(f"        · {d}")
print(f"  Total depts:  {len(departments)}")


# ── 8. All unique standard_user profiles ─────────────────────────────────────

all_standard_users: dict[str, dict] = {}
for e, v in vps.items():
    all_standard_users[e] = v
for e, v in ads.items():
    all_standard_users[e] = v
for e, v in chairs.items():
    all_standard_users[e] = v

# Resolve conflicts: if someone appears in admin lists AND standard_user, admin wins
admin_emails = {u["email"] for u in admin_full_users + admin_viewer_users}
overlap = admin_emails & set(all_standard_users.keys())
if overlap:
    print(f"\nOVERLAP (in admin list AND hierarchy): {overlap}")


# ── 9. Final summary ──────────────────────────────────────────────────────────

total_profiles = len(admin_full_users) + len(admin_viewer_users) + len(all_standard_users)
total_org_units = 1 + len(schools) + len(departments)  # college + schools + depts
total_memberships = (
    len(vps)          # vps in schools
    + len(ads)        # ads in schools
    + len(chairs)     # chairs in departments
)

print(f"\n{'='*60}")
print("INSERTION PLAN (dry run)")
print(f"  profiles to insert:          {total_profiles}")
print(f"    admin_full:                {len(admin_full_users)}")
print(f"    admin_viewer:              {len(admin_viewer_users)}")
print(f"    standard_user (VPs):       {len(vps)}")
print(f"    standard_user (ADs):       {len(ads)}")
print(f"    standard_user (chairs):    {len(chairs)}")
print(f"  organizational_units:        {total_org_units}")
print(f"    1 institution")
print(f"    {len(schools)} schools/faculties")
print(f"    {len(departments)} departments")
print(f"  org_unit_members:            {total_memberships}")
print(f"    VPs in schools:            {len(vps)}")
print(f"    ADs in schools:            {len(ads)}")
print(f"    Chairs in departments:     {len(chairs)}")

print(f"\nRun with --generate-sql to produce the seed SQL file.")


# ── 10. Export clean data as JSON ─────────────────────────────────────────────

# Serialize sets for JSON
chairs_serializable = {}
for email, c in chairs.items():
    chairs_serializable[email] = {**c, "supervisor_ad_emails": list(c["supervisor_ad_emails"])}

output = {
    "admin_full": admin_full_users,
    "admin_viewer": admin_viewer_users,
    "vps": list(vps.values()),
    "ads": list(ads.values()),
    "chairs": list(chairs_serializable.values()),
    "schools": schools,
    "departments": list(dept_to_school.items()),
    "school_to_vp": school_to_vp,
    "data_issues": data_issues,
}

out_path = Path(__file__).parent / "hierarchy_analysis.json"
out_path.write_text(json.dumps(output, indent=2))
print(f"\nFull analysis written to: {out_path}")
