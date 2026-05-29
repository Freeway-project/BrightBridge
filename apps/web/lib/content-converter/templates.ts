import "server-only"

/**
 * Brightspace Content Converter — server-side template + HTML builder logic.
 *
 * Ported from the standalone "Brightspace Content Converter" HTML tool. All of
 * this runs on the server so the Anthropic API key (read from env in the route
 * handler) never reaches the browser. The browser only uploads the document and
 * receives finished HTML back.
 */

export type ConverterTemplate =
  | "syllabus"
  | "introduction"
  | "content"
  | "video"
  | "discussion"
  | "assignment"
  | "quiz"
  | "conclusion"

export const TEMPLATE_LABELS: Record<ConverterTemplate, string> = {
  syllabus: "Course Syllabus",
  introduction: "Module Introduction",
  content: "Content Page",
  video: "Video Lecture",
  discussion: "Discussion",
  assignment: "Assignment",
  quiz: "Quiz",
  conclusion: "Conclusion",
}

export const TEMPLATE_DESCRIPTIONS: Record<ConverterTemplate, string> = {
  syllabus: "Interactive accordion layout with instructor info, schedule, evaluation, and policies.",
  introduction: "Module introduction with learning outcomes, recommended materials, and assessment callout.",
  content: "General-purpose content page with headings, text blocks, and a callout box.",
  video: "Video lecture page with an embedded video player and a follow-up activity section.",
  discussion: "Discussion prompt page with instructions and a discussion link placeholder.",
  assignment: "Assignment instructions page with details and a submission link placeholder.",
  quiz: "Quiz instructions page with details and a quiz link placeholder.",
  conclusion: "Module wrap-up page summarising learning and directing students to the next step.",
}

export function isConverterTemplate(value: unknown): value is ConverterTemplate {
  return typeof value === "string" && value in TEMPLATE_LABELS
}

// -- Non-syllabus templates ----------------------------------------------------
// The template HTML is passed directly to Claude, which fills in the placeholders
// and returns the complete HTML unchanged except for placeholder text.

const TMPL_INTRODUCTION = `<!DOCTYPE html>
<html lang="en"><head>
    <!-- Required meta tags -->
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <title>Module Introduction Page</title>
		<script type="module" src="/shared/D2L/Courseware_HTML_Templates/V5/latest/_assets/js/global.min.js"></script>
		<script src="/shared/D2L/Courseware_HTML_Templates/V5/latest/_assets/js/client.js"></script>
		<script defer="" src="https://templates.lcs.brightspace.com/lib/assets/js/scripts.min.js"></script>
		<link rel="stylesheet" href="/shared/D2L/Courseware_HTML_Templates/V5/latest/_assets/css/global.min.css">
		<link rel="stylesheet" href="/shared/D2L/Courseware_HTML_Templates/V5/latest/_assets/css/client.min.css">
		<link rel="stylesheet" href="/shared/HTML-Template-Library/HTML-Templates-V5/css/custom.css">
		<link rel="stylesheet" href="/d2l/le/contentstyler/6606/files/View">
</head><body><div class="courseware-container-fluid courseware-themes">
<div class="courseware-layouts-content-wrapper">
<div class="courseware-headers-hero courseware-headers-intersect courseware-helper-bg-img-wrapper mceEditable">
<p><img src="../img/module-banner_sample-module.jpg" alt="" title="" data-d2l-editor-default-img-style="true" style="max-width: 100%;"></p>
<div class="courseware-headers-overlay-content mceEditable">
<h1>[Module Title] Introduction</h1>
</div>
</div>
<p>[insert module introduction content]</p>
<hr>
<h2>Learning Outcomes</h2>
<p>By the end of the module, you will be able to:</p>
<ol class="courseware-list-box courseware-list-box-number">
<li>[Insert module learning outcome 1]</li>
<li>[Insert module learning outcome 2]</li>
<li>[Insert module learning outcome 3]</li>
<li>[Insert module learning outcome 4]</li>
</ol>
<p>[Tips for writing learning outcomes - remove before publishing: Each outcome should use a verb that describes a measurable action or behavior. Include the specific circumstances under which the learner is to perform the targeted action or behavior. Keep your learning outcomes focused and concise. Ensure your outcomes are realistic and target the appropriate level of Bloom's taxonomy.]</p>
<h2>[Recommended Materials]</h2>
<p>[List any helpful resources for the module. Use bullets to organize if necessary.]</p>
<div class="courseware-callout courseware-callout-icon mceNonEditable">
<div class="courseware-callout-icon-container mceEditable">
<p><img src="../img/icon_alert.svg" alt=""></p>
</div>
<div class="courseware-callout-text">
<div class="courseware-callout-title mceEditable">Attention</div>
<div class="mceEditable">
<p>At the end of this module, you will complete [describe assessment and provide any relevant details].</p>
</div>
</div>
</div>
</div>
<footer class="mceNonEditable"><!-- To add static year, add data-year attribute with the year in quotes. Ex. data-year="2023" --><!-- By default, will dynamically append current year --><!-- <p class="courseware-helper-client-copyright mceEditable">&copy; [Client]</p> -->
<p><img src="/shared/HTML-Template-Library/HTML-Templates-V5/img/logo.png" class="mceEditable" alt="logo"></p>
</footer></div></body></html>`

const TMPL_CONTENT = `<!DOCTYPE html>
<html lang="en">

<head>
    <!-- Required meta tags -->
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <title>Content Page</title>
		<script type="module" src="/shared/D2L/Courseware_HTML_Templates/V5/latest/_assets/js/global.min.js"></script>
		<script src="/shared/D2L/Courseware_HTML_Templates/V5/latest/_assets/js/client.js"></script>
		<script defer="" src="https://templates.lcs.brightspace.com/lib/assets/js/scripts.min.js"></script>
		<link rel="stylesheet" href="/shared/D2L/Courseware_HTML_Templates/V5/latest/_assets/css/global.min.css">
		<link rel="stylesheet" href="/shared/D2L/Courseware_HTML_Templates/V5/latest/_assets/css/client.min.css">
		<link rel="stylesheet" href="/shared/HTML-Template-Library/HTML-Templates-V5/css/custom.css">
		<link rel="stylesheet" href="/d2l/le/contentstyler/6606/files/View">
</head>

<body>
    <div class="courseware-container-fluid courseware-themes">
        <div class="courseware-layouts-content-wrapper">
            <div
                class="courseware-headers-hero courseware-headers-intersect courseware-helper-bg-img-wrapper mceEditable">
                <p><img src="../img/module-banner_sample-module.jpg" alt="" title=""
                        data-d2l-editor-default-img-style="true" style="max-width: 100%;"></p>
                <div class="courseware-headers-overlay-content mceEditable">
                    <h1>Basic Page</h1>
                </div>
            </div>
            <p>This Basic page is a general-purpose layout.</p>
            <h2>Easy Editing Using the HTML Editor</h2>
            <p>You can use the HTML editor to make quick and easy changes without needing any prior knowledge of HTML.
                Enter your content and use the available controls to apply formatting to your text.</p>
            <div class="courseware-themes courseware-theme-green">
                <h3>Copying Text</h3>
                <p>Pro Tip: When writing content, it is a great practice to first write content in a document, such as
                    Microsoft Word. It allows stakeholders to easily collaborate and track changes to content. It also
                    allows you to spot spelling and grammar errors early on.</p>
                <p>When pasting text from a Word document into the HTML editor, however, some of the document's text
                    styling will copy over. This will clash with the styles that are carefully crafted for this
                    template. So, we recommend to paste the text without formatting.</p>
            </div>
            <div class="courseware-callout courseware-callout-icon mceNonEditable">
                <div class="courseware-callout-icon-container mceEditable"><img
                        src="../img/Callout_icon.png" alt=""></div>
                <div class="courseware-callout-text mceNonEditable">
                    <div class="mceEditable">
                        <p>To paste text without formatting, you can use Ctrl+Shift+V (Cmd+Shift+V on Mac) to paste
                            copied text as unformatted text to HTML editor.</p>
                    </div>
                </div>
            </div>
        </div>
        <footer class="mceNonEditable">
            <!-- To add static year, add data-year attribute with the year in quotes. Ex. data-year="2023" -->
            <!-- By default, will dynamically append current year -->
            <!-- <p class="courseware-helper-client-copyright mceEditable">&copy; [Client]</p> -->
            <p><img src="/shared/HTML-Template-Library/HTML-Templates-V5/img/logo.png" class="mceEditable"
                    alt="logo"></p>
        </footer>
    </div>
</body>

</html>`

const TMPL_VIDEO = `<!DOCTYPE html>
<html lang="en">

<head>
    <!-- Required meta tags -->
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <title>Video Lecture</title>
		<script type="module" src="/shared/D2L/Courseware_HTML_Templates/V5/latest/_assets/js/global.min.js"></script>
		<script src="/shared/D2L/Courseware_HTML_Templates/V5/latest/_assets/js/client.js"></script>
		<script defer="" src="https://templates.lcs.brightspace.com/lib/assets/js/scripts.min.js"></script>
		<link rel="stylesheet" href="/shared/D2L/Courseware_HTML_Templates/V5/latest/_assets/css/global.min.css">
		<link rel="stylesheet" href="/shared/D2L/Courseware_HTML_Templates/V5/latest/_assets/css/client.min.css">
		<link rel="stylesheet" href="/shared/HTML-Template-Library/HTML-Templates-V5/css/custom.css">
		<link rel="stylesheet" href="/d2l/le/contentstyler/6606/files/View">
</head>

<body>
    <div class="courseware-container-fluid courseware-themes">
        <div class="courseware-layouts-content-wrapper">
            <div
                class="courseware-headers-hero courseware-headers-intersect courseware-helper-bg-img-wrapper mceEditable">
                <p><img src="../img/module-banner_sample-module.jpg" alt="" title=""
                        data-d2l-editor-default-img-style="true" style="max-width: 100%;"></p>
                <div class="courseware-headers-overlay-content mceEditable">
                    <h1>Video Lecture</h1>
                </div>
            </div>
            <p>[Include an introduction to the video]</p>
            <iframe width="560" height="315"
                src="https://www.youtube.com/embed/7E5ChiJqoAA?si=Qj2O_YQlnTq8RE-Q&amp;wmode=opaque&amp;rel=0"
                title="YouTube video player" frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen="allowfullscreen"></iframe>
            <h2>Activity</h2>
            <p>[Add an action for students to take after watching the video. (e.g., answer a question, reflect on a
                topic, read additional sources, etc.)]</p>
        </div>
        <footer class="mceNonEditable">
            <!-- To add static year, add data-year attribute with the year in quotes. Ex. data-year="2023" -->
            <!-- By default, will dynamically append current year -->
            <!-- <p class="courseware-helper-client-copyright mceEditable">&copy; [Client]</p> -->
            <p><img src="/shared/HTML-Template-Library/HTML-Templates-V5/img/logo.png" class="mceEditable"
                    alt="logo"></p>
        </footer>
    </div>
</body>

</html>`

const TMPL_DISCUSSION = `<!DOCTYPE html>
<html lang="en"><head>
    <!-- Required meta tags -->
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <title>Discussion</title>
		<script type="module" src="/shared/D2L/Courseware_HTML_Templates/V5/latest/_assets/js/global.min.js"></script>
		<script src="/shared/D2L/Courseware_HTML_Templates/V5/latest/_assets/js/client.js"></script>
		<script defer="" src="https://templates.lcs.brightspace.com/lib/assets/js/scripts.min.js"></script>
		<link rel="stylesheet" href="/shared/D2L/Courseware_HTML_Templates/V5/latest/_assets/css/global.min.css">
		<link rel="stylesheet" href="/shared/D2L/Courseware_HTML_Templates/V5/latest/_assets/css/client.min.css">
		<link rel="stylesheet" href="/shared/HTML-Template-Library/HTML-Templates-V5/css/custom.css">
		<link rel="stylesheet" href="/d2l/le/contentstyler/6606/files/View">
</head><body><div class="courseware-container-fluid courseware-themes">
<div class="courseware-layouts-content-wrapper">
<div class="courseware-headers-hero courseware-headers-intersect courseware-helper-bg-img-wrapper mceEditable">
<p><img src="../img/module-banner_sample-module.jpg" alt="" title="" data-d2l-editor-default-img-style="true" style="max-width: 100%;"></p>
<div class="courseware-headers-overlay-content mceEditable">
<h1>Discussion</h1>
</div>
</div>
<p>Discussion Topics can be added as Quicklinks directly on the page, as below, or added as a page in the Table of Contents.</p>
<p>It is important to provide detailed instructions for each Discussion in the course. In your instructions, you can clarify the following: &nbsp;</p>
<ul>
<li>Description</li>
<li>Discussion post length expectations</li>
<li>Whether learners need to respond to other Discussion posts</li>
<li>Due Date</li>
<li>Weight (if being assessed)</li>
<li>Grading Criteria</li>
</ul>
<p>[Insert Discussion instructions here]</p>
<div class="courseware-callout courseware-callout-icon mceNonEditable">
<div class="courseware-callout-icon-container mceEditable">
<p><img src="../img/icon_alert.svg" alt=""></p>
</div>
<div class="courseware-callout-text mceNonEditable">
<div class="mceEditable">
<div class="courseware-callout-title mceEditable">Attention</div>
<p>Select the link to contribute to the Discussion:</p>
<p><a href="/d2l/common/dialogs/quickLink/quickLink.d2l?ou=6669&amp;type=discuss&amp;rcode=65C5EB64-1731-48D2-B886-C2A01750A9A9-35103" target="_blank" rel="noopener">Sample Discussion Topic</a></p>
</div>
</div>
</div>
</div>
<footer class="mceNonEditable"><!-- To add static year, add data-year attribute with the year in quotes. Ex. data-year="2023" --><!-- By default, will dynamically append current year -->
<!-- <p class="courseware-helper-client-copyright mceEditable">&copy; [Client]</p> -->
<p><img src="/shared/HTML-Template-Library/HTML-Templates-V5/img/logo.png" class="mceEditable" alt="logo"></p>
</footer></div></body></html>`

const TMPL_ASSIGNMENT = `<!DOCTYPE html>
<html lang="en"><head>
    <!-- Required meta tags -->
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <title>Assignment</title>
		<script type="module" src="/shared/D2L/Courseware_HTML_Templates/V5/latest/_assets/js/global.min.js"></script>
		<script src="/shared/D2L/Courseware_HTML_Templates/V5/latest/_assets/js/client.js"></script>
		<script defer="" src="https://templates.lcs.brightspace.com/lib/assets/js/scripts.min.js"></script>
		<link rel="stylesheet" href="/shared/D2L/Courseware_HTML_Templates/V5/latest/_assets/css/global.min.css">
		<link rel="stylesheet" href="/shared/D2L/Courseware_HTML_Templates/V5/latest/_assets/css/client.min.css">
		<link rel="stylesheet" href="/shared/HTML-Template-Library/HTML-Templates-V5/css/custom.css">
		<link rel="stylesheet" href="/d2l/le/contentstyler/6606/files/View">
</head><body><div class="courseware-container-fluid courseware-themes">
<div class="courseware-layouts-content-wrapper">
<div class="courseware-headers-hero courseware-headers-intersect courseware-helper-bg-img-wrapper mceEditable">
<p><img src="../img/module-banner_sample-module.jpg" alt="" title="" data-d2l-editor-default-img-style="true" style="max-width: 100%;"></p>
<div class="courseware-headers-overlay-content mceEditable">
<h1>Assignment</h1>
</div>
</div>
<p>Assignments can be added as Quicklinks, as below, or can be inserted in the Table of Contents.</p>
<p>It is important to provide detailed instructions for each Assignment in the course. In your instructions, you can clarify the following: &nbsp;</p>
<ul>
<li>Description</li>
<li>Due Date</li>
<li>Weight</li>
<li>Grading Criteria</li>
</ul>
<p>[Insert Assignment instructions here]</p>
<div class="courseware-callout courseware-callout-icon mceNonEditable">
<div class="courseware-callout-icon-container mceEditable">
<p><img src="../img/icon_alert.svg" alt=""></p>
</div>
<div class="courseware-callout-text mceNonEditable">
<div class="mceEditable">
<h3>Attention</h3>
<p>Go to the next page to submit your <a href="/d2l/common/dialogs/quickLink/quickLink.d2l?ou=6669&amp;type=dropbox&amp;rcode=65C5EB64-1731-48D2-B886-C2A01750A9A9-35104" target="_blank" rel="noopener">assignment</a>.</p>
</div>
</div>
</div>
</div>
<footer class="mceNonEditable"><!-- To add static year, add data-year attribute with the year in quotes. Ex. data-year="2023" --><!-- By default, will dynamically append current year -->
<!-- <p class="courseware-helper-client-copyright mceEditable">&copy; [Client]</p> -->
<p><img src="/shared/HTML-Template-Library/HTML-Templates-V5/img/logo.png" class="mceEditable" alt="logo"></p>
</footer></div></body></html>`

const TMPL_QUIZ = `<!DOCTYPE html>
<html lang="en"><head>
    <!-- Required meta tags -->
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <title>Quiz</title>
		<script type="module" src="/shared/D2L/Courseware_HTML_Templates/V5/latest/_assets/js/global.min.js"></script>
		<script src="/shared/D2L/Courseware_HTML_Templates/V5/latest/_assets/js/client.js"></script>
		<script defer="" src="https://templates.lcs.brightspace.com/lib/assets/js/scripts.min.js"></script>
		<link rel="stylesheet" href="/shared/D2L/Courseware_HTML_Templates/V5/latest/_assets/css/global.min.css">
		<link rel="stylesheet" href="/shared/D2L/Courseware_HTML_Templates/V5/latest/_assets/css/client.min.css">
		<link rel="stylesheet" href="/shared/HTML-Template-Library/HTML-Templates-V5/css/custom.css">
		<link rel="stylesheet" href="/d2l/le/contentstyler/6606/files/View">
</head><body><div class="courseware-container-fluid courseware-themes">
<div class="courseware-layouts-content-wrapper">
<div class="courseware-headers-hero courseware-headers-intersect courseware-helper-bg-img-wrapper mceEditable">
<p><img src="../img/module-banner_sample-module.jpg" alt="" title="" data-d2l-editor-default-img-style="true" style="max-width: 100%;"></p>
<div class="courseware-headers-overlay-content mceEditable">
<h1>Quiz</h1>
</div>
</div>
<p>Quizzes can be added as Quicklinks directly on the page, as below, or added as a page in the Table of Contents.</p>
<p>It is important to provide detailed instructions for each quiz in the course. In your instructions, you can clarify the following: &nbsp;</p>
<ul>
<li>Description</li>
<li>Due Date</li>
<li>Number of attempts allowed</li>
<li>Weight</li>
<li>Grading Criteria</li>
</ul>
<p>[Insert Quiz instructions here]</p>
<div class="courseware-callout courseware-callout-icon mceNonEditable">
<div class="courseware-callout-icon-container mceEditable">
<p><img src="../img/icon_alert.svg" alt=""></p>
</div>
<div class="courseware-callout-text mceNonEditable">
<div class="mceEditable">
<h3>Attention</h3>
<p>Select the link to complete the Quiz:</p>
<p><a href="/d2l/common/dialogs/quickLink/quickLink.d2l?ou=6669&amp;type=quiz&amp;rcode=65C5EB64-1731-48D2-B886-C2A01750A9A9-35106" target="_blank" rel="noopener">Sample Quiz</a></p>
</div>
</div>
</div>
</div>
<footer class="mceNonEditable"><!-- To add static year, add data-year attribute with the year in quotes. Ex. data-year="2023" --><!-- By default, will dynamically append current year -->
<!-- <p class="courseware-helper-client-copyright mceEditable">&copy; [Client]</p> -->
<p><img src="/shared/HTML-Template-Library/HTML-Templates-V5/img/logo.png" class="mceEditable" alt="logo"></p>
</footer></div></body></html>`

const TMPL_CONCLUSION = `<!DOCTYPE html>
<html lang="en">

<head>
    <!-- Required meta tags -->
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <title>Conclusion</title>
		<script type="module" src="/shared/D2L/Courseware_HTML_Templates/V5/latest/_assets/js/global.min.js"></script>
		<script src="/shared/D2L/Courseware_HTML_Templates/V5/latest/_assets/js/client.js"></script>
		<script defer="" src="https://templates.lcs.brightspace.com/lib/assets/js/scripts.min.js"></script>
		<link rel="stylesheet" href="/shared/D2L/Courseware_HTML_Templates/V5/latest/_assets/css/global.min.css">
		<link rel="stylesheet" href="/shared/D2L/Courseware_HTML_Templates/V5/latest/_assets/css/client.min.css">
		<link rel="stylesheet" href="/shared/HTML-Template-Library/HTML-Templates-V5/css/custom.css">
		<link rel="stylesheet" href="/d2l/le/contentstyler/6606/files/View">
</head>

<body>
    <div class="courseware-container-fluid courseware-themes">
        <div class="courseware-layouts-content-wrapper">
            <div
                class="courseware-headers-hero courseware-headers-intersect courseware-helper-bg-img-wrapper mceEditable">
                <p><img src="../Img/module-banner_sample-module.jpg" alt="" title=""
                        data-d2l-editor-default-img-style="true" style="max-width: 100%;"></p>
                <div class="courseware-headers-overlay-content mceEditable">
                    <h1>[Module Title] Conclusion</h1>
                </div>
            </div>
            <p>You have completed this [insert module name].</p>
            <p>[Insert short description of what they should have learned by the end of this module].&nbsp;</p>
            <hr class="courseware-horizontal-rule-icon">
            <div class="courseware-horizontal-rule-icon-container mceEditable"><img
                    src="../img/PageBreak_icon-01.png" alt="">
            </div>
            <div class="courseware-callout courseware-callout-standard mceNonEditable">
                <div class="courseware-callout-text mceEditable">
                    <div class="courseware-callout-title mceEditable">What's next?</div>
                    <p>You may now proceed to the assessment, where your understanding of this module will be gauged. <strong>[Provide details about assessment such as
                                number of attempts, pass score, etc.]</strong></p>
                    <p>If you are not comfortable with your understanding of this material, please review the content
                        before proceeding with the assessment. Good luck!</p>
                    <p><strong>When you exit after completing the assessment, the module will be recorded as
                            complete.</strong></p>
                </div>
            </div>
        </div>
        <footer class="mceNonEditable">
            <!-- To add static year, add data-year attribute with the year in quotes. Ex. data-year="2023" -->
            <!-- By default, will dynamically append current year -->
            <!-- <p class="courseware-helper-client-copyright mceEditable">&copy; [Client]</p> -->
            <p><img src="/shared/HTML-Template-Library/HTML-Templates-V5/img/logo.png" class="mceEditable"
                    alt="logo"></p>
        </footer>
    </div>
</body>

</html>`

const TEMPLATE_HTML: Record<Exclude<ConverterTemplate, "syllabus">, string> = {
  introduction: TMPL_INTRODUCTION,
  content: TMPL_CONTENT,
  video: TMPL_VIDEO,
  discussion: TMPL_DISCUSSION,
  assignment: TMPL_ASSIGNMENT,
  quiz: TMPL_QUIZ,
  conclusion: TMPL_CONCLUSION,
}

export function buildTemplatePrompt(template: Exclude<ConverterTemplate, "syllabus">): string {
  const tmpl = TEMPLATE_HTML[template]
  return `You are a Brightspace course designer. Populate the following Brightspace HTML template with content extracted from the provided document.

Rules:
- Return ONLY the complete HTML document. No markdown fences, no explanation, nothing before or after the HTML.
- Include ALL content from the uploaded document. Do not summarise, condense, skip, or omit any information. Every piece of content in the document must appear in the output.
- Replace every placeholder (text in [square brackets]) with real content from the document. Add additional <p> or <li> elements inside the existing structure as needed to fit all the content.
- The <img src="../img/module-banner_sample-module.jpg"> hero image tag must be preserved exactly as written. Do not alter the src path in any way.
- Do NOT add any CSS styles, inline styles, or style attributes that are not already present in the template.
- Do NOT add any new wrapper elements, classes, or structural changes beyond what is needed to hold the content.
- Preserve every HTML tag, attribute, class, src, href, and Brightspace-specific attribute exactly as-is.
- If the document does not contain information for a specific placeholder, remove that placeholder text but leave its surrounding HTML structure intact.

TEMPLATE:
${tmpl}`
}

// -- Syllabus extraction prompt ------------------------------------------------
// Claude's only job for the syllabus template: read the document, return pure JSON.
export const EXTRACTION_PROMPT = `You are extracting structured data from a course syllabus. Return ONLY a valid JSON object -- no markdown fences, no explanation, nothing else before or after the JSON.

IMPORTANT: Extract ALL content from the document. Do not summarise, condense, skip, or omit any information. Every piece of content in the document must be captured in the JSON.

Extract the following fields. Use null for anything not found. All HTML in body fields must use only these tags: <p>, <strong>, <em>, <ul>, <ol>, <li>, <a href="...">, <table>, <tbody>, <tr>, <td>, <br>. Use &amp; for & in table cells.

{
  "courseCode": "e.g. BIOL 131",
  "courseTitle": "e.g. Human Anatomy and Physiology I - Laboratory",
  "term": "e.g. Fall 2025",
  "description": "Full calendar/course description as plain text.",

  "instructor": {
    "name": "Full name with title",
    "email": "email@domain.ca",
    "officeHours": "e.g. By appointment",
    "officeLocation": "e.g. Room 204, Penticton Campus",
    "section": "e.g. L51",
    "campus": "e.g. Penticton"
  },

  "schedule": {
    "days": "e.g. Tuesdays",
    "times": "e.g. 3:30 pm - 6:20 pm",
    "room": "e.g. C10",
    "deliveryFormat": "e.g. In-person laboratory",
    "creditHours": "e.g. 3",
    "prerequisites": "e.g. BIOL 111 or equivalent"
  },

  "materials": ["Array of required materials as plain text strings, e.g. 'Biology 131 Lab Manual (2025), Okanagan College'"],

  "outcomes": ["Array of learning outcomes as plain text strings"],

  "classSchedule": {
    "title": "e.g. Lab Schedule or Class Schedule",
    "columns": ["e.g. Date", "Topic", "Notes"],
    "rows": [
      { "cells": ["Sept 9", "Lab A - Microscopes", ""], "isExam": false },
      { "cells": ["Oct 14", "Lab Exam I", ""], "isExam": true }
    ]
  },

  "evaluation": {
    "items": [
      { "component": "Quizzes and Assignments", "weight": "20%" },
      { "component": "Lab Exam I (October 14th)", "weight": "40%" }
    ],
    "notes": "Any footnotes or clarifications about the evaluation scheme as plain text."
  },

  "policies": [
    {
      "title": "Policy name, e.g. Attendance Policy",
      "bodyHTML": "<p>Policy text here. Use <strong> for emphasis.</strong></p><ul><li>Bullet point if applicable</li></ul>"
    }
  ],

  "transferInfo": "e.g. See bctransferguide.ca for transfer credit information.",
  "pdfFilename": "e.g. BIOL131_LabSyllabus_Fall2025.pdf"
}

Include ALL policies found: attendance, academic integrity, AI/generative AI, misconduct, passing grade requirements, disability services, etc. Each gets its own object in the policies array.`

// -- Syllabus JSON types -------------------------------------------------------
interface SyllabusInstructor {
  name?: string | null
  email?: string | null
  officeHours?: string | null
  officeLocation?: string | null
  section?: string | null
  campus?: string | null
}
interface SyllabusSchedule {
  days?: string | null
  times?: string | null
  room?: string | null
  deliveryFormat?: string | null
  creditHours?: string | null
  prerequisites?: string | null
}
interface SyllabusScheduleRow {
  cells?: string[]
  isExam?: boolean
}
interface SyllabusClassSchedule {
  title?: string | null
  columns?: string[]
  rows?: SyllabusScheduleRow[]
}
interface SyllabusEvalItem {
  component?: string
  weight?: string
}
interface SyllabusEvaluation {
  items?: SyllabusEvalItem[]
  notes?: string | null
}
interface SyllabusPolicy {
  title?: string | null
  bodyHTML?: string | null
}
export interface SyllabusData {
  courseCode?: string | null
  courseTitle?: string | null
  term?: string | null
  description?: string | null
  instructor?: SyllabusInstructor | null
  schedule?: SyllabusSchedule | null
  materials?: string[] | null
  outcomes?: string[] | null
  classSchedule?: SyllabusClassSchedule | null
  evaluation?: SyllabusEvaluation | null
  policies?: SyllabusPolicy[] | null
  transferInfo?: string | null
  pdfFilename?: string | null
}

// -- HTML builder --------------------------------------------------------------
// Assembles the exact Brightspace accordion HTML from the extracted JSON data.
// Claude never touches this HTML -- it is always built here programmatically.

function esc(s: string | null | undefined): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function card(index: number, title: string, bodyHTML: string): string {
  return `<div class="card">
<div class="card-header">
<div class="card-title" data-itemprop="${index}|0">${esc(title)}</div>
</div>
<div class="collapse">
<div class="card-body" data-itemprop="${index}|1">
${bodyHTML}
</div>
</div>
</div>`
}

function accordionSection(uid: string, cards: string[]): string {
  return `<div class="d2l-element mceNonEditable" data-idx="0" data-type="unnumbered" role="section" aria-describedby="${uid}">
<p id="${uid}" class="sr-only">Accordion</p>
<div class="instruction" data-prop="1|null">Select each item to learn more.</div>
<div class="accordion" data-prop="0|unnumbered">
${cards.join("\n")}
</div>
</div>`
}

function buildInstructorHTML(inst: SyllabusInstructor | null | undefined): string {
  if (!inst) return "<p>No instructor information provided.</p>"
  const fields: [string, string][] = [
    inst.name ? ["Professor", esc(inst.name)] : null,
    inst.email ? ["Email", `<a href="mailto:${esc(inst.email)}">${esc(inst.email)}</a>`] : null,
    inst.officeHours ? ["Office Hours", esc(inst.officeHours)] : null,
    inst.officeLocation ? ["Office Location", esc(inst.officeLocation)] : null,
    inst.section ? ["Section", esc(inst.section)] : null,
    inst.campus ? ["Campus", esc(inst.campus)] : null,
  ].filter(Boolean) as [string, string][]
  return fields.map(([k, v]) => `<p><strong>${esc(k)}</strong>: ${v}</p>`).join("\n")
}

function buildScheduleInfoHTML(
  sched: SyllabusSchedule | null | undefined,
  code: string,
  title: string,
  term: string,
  transfer: string | null | undefined,
): string {
  const fields: [string, string][] = [
    (code || title) ? ["Course Title", esc([code, title, term].filter(Boolean).join(" - "))] : null,
    sched?.deliveryFormat ? ["Delivery Format", esc(sched.deliveryFormat)] : null,
    sched?.room ? ["Location", esc(sched.room)] : null,
    (sched?.days || sched?.times) ? ["Meeting Times", esc([sched.days, sched.times].filter(Boolean).join(", "))] : null,
    sched?.creditHours ? ["Credit Hours", esc(sched.creditHours)] : null,
    sched?.prerequisites ? ["Prerequisites/Co-requisites", esc(sched.prerequisites)] : null,
    transfer
      ? ["Transfer Information", `${esc(transfer)} <a href="https://www.bctransferguide.ca" target="_blank" rel="noopener">www.bctransferguide.ca</a>`]
      : null,
  ].filter(Boolean) as [string, string][]
  return fields.map(([k, v]) => `<p><strong>${esc(k)}</strong>: ${v}</p>`).join("\n")
}

function buildMaterialsHTML(mats: string[] | null | undefined): string {
  if (!mats || !mats.length) return "<p>See instructor for required materials.</p>"
  return "<ul>\n" + mats.map((m) => `<li>${esc(m)}</li>`).join("\n") + "\n</ul>"
}

function buildOutcomesHTML(outcomes: string[] | null | undefined): string {
  if (!outcomes || !outcomes.length) return "<p>See course calendar for learning outcomes.</p>"
  return "<ul>\n" + outcomes.map((o) => `<li>${esc(o)}</li>`).join("\n") + "\n</ul>"
}

function buildScheduleTableHTML(cs: SyllabusClassSchedule | null | undefined): string {
  if (!cs || !cs.rows || !cs.rows.length) return "<p>No schedule provided.</p>"
  const cols = cs.columns || ["Date", "Topic"]
  const colPct = Math.floor(100 / cols.length)
  const colgroup = cols.map(() => `<col style="width:${colPct}%;">`).join("")

  const headerRow =
    "<tr>\n" + cols.map((c) => `<td style="border-color:#000000;"><strong>${esc(c)}</strong></td>`).join("\n") + "\n</tr>"

  const bodyRows = cs.rows
    .map((row) => {
      const isExam = row.isExam
      const cells = (row.cells || [])
        .map((c) =>
          isExam
            ? `<td style="border-color:#000000;"><strong>${esc(c)}</strong></td>`
            : `<td style="border-color:#000000;">${esc(c)}</td>`,
        )
        .join("\n")
      return `<tr>\n${cells}\n</tr>`
    })
    .join("\n")

  return `<table border="1" style="border-collapse:collapse;width:100%;border:1px solid #000000;"><colgroup>${colgroup}</colgroup>
<tbody>
${headerRow}
${bodyRows}
</tbody>
</table>`
}

function buildEvalHTML(ev: SyllabusEvaluation | null | undefined): string {
  if (!ev || !ev.items || !ev.items.length) return "<p>No evaluation scheme provided.</p>"
  const rows = ev.items
    .map(
      (item) =>
        `<tr><td style="border-color:#000000;">${esc(item.component)}</td><td style="border-color:#000000;">${esc(item.weight)}</td></tr>`,
    )
    .join("\n")
  const notesHTML = ev.notes ? `\n<p>${esc(ev.notes)}</p>` : ""
  return `<table border="1" style="border-collapse:collapse;width:100%;border:1px solid #000000;"><colgroup><col style="width:60%;"><col style="width:40%;"></colgroup>
<tbody>
<tr><td style="border-color:#000000;"><strong>Course Component</strong></td><td style="border-color:#000000;"><strong>Percentage of Final Grade</strong></td></tr>
${rows}
<tr><td style="border-color:#000000;text-align:right;"><strong>Total</strong></td><td style="border-color:#000000;"><strong>100%</strong></td></tr>
</tbody>
</table>${notesHTML}`
}

// Client-side jsPDF export bar that is injected into the generated syllabus page.
const JSPDF_SCRIPT = `(function () {
  var s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  s.onload = boot;
  document.head.appendChild(s);
  function boot() {
    var styleEl = document.createElement('style');
    styleEl.textContent = '#oc-bar{display:flex;align-items:center;gap:12px;background:#E10054;color:#fff;padding:10px 20px;font-family:"Segoe UI",Arial,sans-serif;font-size:13px;position:sticky;bottom:0;z-index:9999;box-shadow:0 -2px 8px rgba(0,0,0,.3)}#oc-bar span{flex:1;opacity:.9;font-size:15px}#oc-btn{display:inline-flex;align-items:center;gap:6px;background:#fff;color:#E10054;border:none;border-radius:6px;padding:8px 20px;font-size:15px;font-weight:700;cursor:pointer;white-space:nowrap}#oc-btn:hover{background:#ddeeff}#oc-btn:disabled{opacity:.5;cursor:wait}#oc-st{font-size:14px;min-width:150px;opacity:.9}';
    document.head.appendChild(styleEl);
    var bar = document.createElement('div');
    bar.id = 'oc-bar';
    bar.innerHTML = '<span>Export this page as a PDF with all sections expanded</span><div id="oc-st"></div><button id="oc-btn">Download PDF</button>';
    document.body.appendChild(bar);
    document.getElementById('oc-btn').addEventListener('click', go);
  }
  function st(msg){var e=document.getElementById('oc-st');if(e)e.textContent=msg;}
  function decodeEntities(str){var t=document.createElement('textarea');t.innerHTML=str;return t.value;}
  function parsePage(){
    var data={title:'',subtitles:[],groups:[]};
    var h1=document.querySelector('.courseware-headers-overlay-content h1,h1');
    data.title=h1?h1.textContent.trim():(document.title||'Course Syllabus');
    document.querySelectorAll('h2').forEach(function(h2){var t=h2.textContent.trim();if(t)data.subtitles.push(t);});

    var brightspaceAccordions=document.querySelectorAll('d2l-cplus-accordion');
    if(brightspaceAccordions.length){
      brightspaceAccordions.forEach(function(acc,gi){
        var label='Section '+(gi+1);
        var node=acc.previousSibling;
        while(node){if(node.nodeType===1&&node.tagName==='H2'){label=node.textContent.trim();break;}node=node.previousSibling;}
        var raw=acc.getAttribute('data-panels');if(!raw)return;
        var decoded=decodeEntities(raw);var panels;
        try{panels=JSON.parse(decoded);}catch(e){try{panels=JSON.parse(decodeEntities(decoded));}catch(e2){return;}}
        var sections=panels.map(function(p){return{title:p.title,bodyHTML:decodeEntities(p.content||'')};});
        if(sections.length)data.groups.push({label:label,sections:sections});
      });
      return data;
    }

    document.querySelectorAll('.accordion').forEach(function(acc){
      var label='';
      var node=acc.parentElement?acc.parentElement.previousElementSibling:null;
      while(node){
        if(node.tagName==='H2'){label=node.textContent.trim();break;}
        node=node.previousElementSibling;
      }
      if(!label){
        var allAccordions=Array.from(document.querySelectorAll('.accordion'));
        var idx=allAccordions.indexOf(acc);
        var defaults=['Course Information','Course and Evaluation Schedule','Policies'];
        label=defaults[idx]||('Section '+(idx+1));
      }
      var sections=[];
      acc.querySelectorAll('.card').forEach(function(card){
        var title=card.querySelector('.card-title');
        var body=card.querySelector('.card-body');
        if(title&&body)sections.push({title:title.textContent.trim(),bodyHTML:body.innerHTML});
      });
      if(sections.length)data.groups.push({label:label,sections:sections});
    });
    return data;
  }
  function parseBody(html){
    var tmp=document.createElement('div');tmp.innerHTML=html;
    tmp.querySelectorAll('script,style').forEach(function(e){e.remove();});
    var blocks=[];
    function walk(node){
      if(node.nodeType===3){var t=node.textContent.trim();if(t)blocks.push({type:'text',text:t});return;}
      var tag=(node.tagName||'').toLowerCase();
      if(tag==='table'){blocks.push({type:'table',el:node});return;}
      if(tag==='ul'||tag==='ol'){blocks.push({type:'list',ordered:tag==='ol',items:Array.from(node.querySelectorAll('li')).map(function(li){return li.textContent.trim();})});return;}
      if(tag==='p'||tag==='div'){var tx=node.textContent.trim();if(tx)blocks.push({type:'para',html:node.innerHTML,text:tx});return;}
      if(tag==='br'){blocks.push({type:'br'});return;}
      node.childNodes.forEach(walk);
    }
    tmp.childNodes.forEach(walk);return blocks;
  }
  var LOGO_URL='https://learn.okanagancollege.ca/d2l/common/viewFile.d2lfile/Content/L3NoYXJlZC9PQ19QcmltYXJ5X0xvZ29fV2hpdGVfUkdCXzEwODBweEA3MnBwaV9EaWdpdGFsICgxKS5wbmc/OC_Primary_Logo_White_RGB_1080px%4072ppi_Digital%20(1).png?ou=6606';
  function fetchLogoB64(cb){var img=new Image();img.crossOrigin='anonymous';img.onload=function(){try{var c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext('2d').drawImage(img,0,0);cb(c.toDataURL('image/png'),img.naturalWidth,img.naturalHeight);}catch(e){cb(null);}};img.onerror=function(){cb(null);};img.src=LOGO_URL;}
  function go(){
    var btn=document.getElementById('oc-btn');btn.disabled=true;st('Reading\\u2026');
    var data=parsePage();
    if(!data.groups.length){st('Nothing to export.');btn.disabled=false;return;}
    st('Loading logo\\u2026');
    fetchLogoB64(function(logoDataURL,logoW,logoH){
      st('Building PDF\\u2026');
      setTimeout(function(){
        try{
          var J=window.jspdf.jsPDF;var pgW=612,pgH=792,mg=36,cW=pgW-mg*2;
          var pdf=new J({orientation:'portrait',unit:'pt',format:'letter'});
          var BL=[225,0,84],LG=[226,232,240],GR=[100,116,139],BK=[26,26,26],WH=[255,255,255];
          var y=0,pn=1;
          function ftx(){pdf.setFont('helvetica','normal');pdf.setFontSize(7.5);pdf.setTextColor(GR[0],GR[1],GR[2]);pdf.text(data.title+'  |  Page '+pn,pgW/2,pgH-14,{align:'center'});}
          function need(h){if(y+h>pgH-mg-24){pdf.addPage();pn++;y=mg;ftx();}}
          var hdrH=90;pdf.setFillColor(BL[0],BL[1],BL[2]);pdf.rect(0,0,pgW,hdrH,'F');
          if(logoDataURL){var lbw=160,lbh=54,sc=Math.min(lbw/logoW,lbh/logoH),dw=logoW*sc,dh=logoH*sc;pdf.addImage(logoDataURL,'PNG',pgW-mg-dw,(hdrH-dh)/2,dw,dh);}
          var tmw=logoDataURL?cW-170:cW;pdf.setTextColor(WH[0],WH[1],WH[2]);
          pdf.setFont('helvetica','bold');pdf.setFontSize(17);pdf.text(data.title,mg,28,{maxWidth:tmw});
          if(data.subtitles.length>0){pdf.setFont('helvetica','normal');pdf.setFontSize(10);pdf.text(data.subtitles[0],mg,48,{maxWidth:tmw});}
          if(data.subtitles.length>1){pdf.setFont('helvetica','normal');pdf.setFontSize(10);pdf.text(data.subtitles[1],mg,64,{maxWidth:tmw});}
          y=hdrH+10;ftx();
          data.groups.forEach(function(grp){
            need(30);pdf.setFillColor(BL[0],BL[1],BL[2]);pdf.rect(mg,y,cW,20,'F');
            pdf.setFont('helvetica','bold');pdf.setFontSize(11);pdf.setTextColor(WH[0],WH[1],WH[2]);
            pdf.text(grp.label.toUpperCase(),mg+8,y+14);y+=26;
            grp.sections.forEach(function(sec){
              var blocks=parseBody(sec.bodyHTML);need(32);
              pdf.setFillColor(BL[0],BL[1],BL[2]);pdf.setDrawColor(BL[0],BL[1],BL[2]);pdf.setLineWidth(0.5);
              pdf.roundedRect(mg,y,cW,22,3,3,'FD');pdf.setFont('helvetica','bold');pdf.setFontSize(9.5);
              pdf.setTextColor(WH[0],WH[1],WH[2]);pdf.text(sec.title,mg+9,y+14.5);y+=26;
              blocks.forEach(function(blk){
                var ix=mg+12,iw=cW-14;
                if(blk.type==='br'){y+=4;return;}
                if(blk.type==='text'){need(14);pdf.setFont('helvetica','normal');pdf.setFontSize(9.5);pdf.setTextColor(BK[0],BK[1],BK[2]);pdf.splitTextToSize(blk.text,iw).forEach(function(ln){need(13);pdf.text(ln,ix,y+10);y+=13;});return;}
                if(blk.type==='para'){var d=document.createElement('div');d.innerHTML=blk.html;var se=d.querySelector('strong,b'),lb='',rs='';if(se){lb=se.textContent.trim();se.remove();rs=d.textContent.trim();}else{rs=blk.text;}if(!lb&&!rs)return;need(16);if(lb){pdf.setFont('helvetica','bold');pdf.setFontSize(9.5);pdf.setTextColor(BK[0],BK[1],BK[2]);pdf.splitTextToSize(lb+(rs?':':''),iw).forEach(function(ln){need(13);pdf.text(ln,ix,y+10);y+=13;});}if(rs){pdf.setFont('helvetica','normal');pdf.setFontSize(9.5);pdf.setTextColor(BK[0],BK[1],BK[2]);pdf.splitTextToSize(rs,lb?iw-10:iw).forEach(function(ln){need(13);pdf.text(ln,lb?ix+10:ix,y+10);y+=13;});}y+=2;return;}
                if(blk.type==='list'){blk.items.forEach(function(item,i){need(14);pdf.setFont('helvetica','normal');pdf.setFontSize(9.5);pdf.setTextColor(BK[0],BK[1],BK[2]);pdf.text(blk.ordered?(i+1)+'.':'\\u2022',ix,y+10);pdf.splitTextToSize(item,iw-14).forEach(function(ln){need(13);pdf.text(ln,ix+14,y+10);y+=13;});});y+=4;return;}
                if(blk.type==='table'){var rows=Array.from(blk.el.querySelectorAll('tr'));if(!rows.length)return;var mc=Math.max.apply(null,rows.map(function(r){return r.querySelectorAll('td,th').length;}));if(!mc)return;var cw2=iw/mc,rh=20,pd=5;rows.forEach(function(row,ri){need(rh+2);if(ri===0)pdf.setFillColor(BL[0],BL[1],BL[2]);else if(ri%2===0)pdf.setFillColor(248,250,252);else pdf.setFillColor(WH[0],WH[1],WH[2]);pdf.setDrawColor(LG[0],LG[1],LG[2]);pdf.setLineWidth(0.4);pdf.rect(ix,y,iw,rh,'FD');Array.from(row.querySelectorAll('td,th')).forEach(function(cell,ci){var cx=ix+ci*cw2;if(ci>0){pdf.setDrawColor(LG[0],LG[1],LG[2]);pdf.line(cx,y,cx,y+rh);}pdf.setFont('helvetica',ri===0?'bold':'normal');pdf.setFontSize(ri===0?8.5:9);pdf.setTextColor.apply(pdf,ri===0?WH:BK);var ct=cell.textContent.trim();var fit=pdf.splitTextToSize(ct,cw2-pd*2);pdf.text(fit[0]||'',cx+pd,y+rh/2+3.5);if(fit.length>1){pdf.setFontSize(7);pdf.setTextColor(GR[0],GR[1],GR[2]);pdf.text('\\u2026',cx+cw2-pd-5,y+rh/2+3.5);}});y+=rh;});y+=6;return;}
              });y+=10;
            });y+=8;
          });
          var fn=(data.title||'Syllabus').replace(/[^a-z0-9 ]/gi,'').trim().replace(/\\s+/g,'-')+'.pdf';
          st('Saving\\u2026');pdf.save(fn);st('\\u2705 Done!');setTimeout(function(){st('');},4000);btn.disabled=false;
        }catch(err){st('\\u274C '+err.message);console.error(err);btn.disabled=false;}
      },80);
    });
  }
})();`

export function buildBrightspaceHTML(data: SyllabusData): string {
  const courseCode = data.courseCode || ""
  const courseTitle = data.courseTitle || ""
  const term = data.term || ""
  const fullTitle = [courseCode, courseTitle, term].filter(Boolean).join(" - ")

  // -- Accordion 1: Course Information ----------------------------------------
  const infoCards = [
    card(0, "Instructor Information", buildInstructorHTML(data.instructor)),
    card(1, "Course Schedule and General Information", buildScheduleInfoHTML(data.schedule, courseCode, courseTitle, term, data.transferInfo)),
    card(2, "Required Learning Materials", buildMaterialsHTML(data.materials)),
    card(3, "Learning Outcomes", buildOutcomesHTML(data.outcomes) + "\n<p><script>\n" + JSPDF_SCRIPT + "\n</script></p>"),
  ]

  // -- Accordion 2: Schedule & Evaluation -------------------------------------
  const schedTitle = (data.classSchedule && data.classSchedule.title) || "Class Schedule"
  const evalCards = [
    card(0, schedTitle, buildScheduleTableHTML(data.classSchedule)),
    card(1, "Learning Activities and Evaluation Scheme", buildEvalHTML(data.evaluation)),
  ]

  // -- Accordion 3: Policies (optional) ---------------------------------------
  let policiesSection = ""
  if (data.policies && data.policies.length) {
    const policyCards = data.policies.map((p, i) => card(i, p.title || "Policy", p.bodyHTML || ""))
    policiesSection = `\n<br>\n<h2>Policies</h2>\n` + accordionSection("d2l-uid-policies", policyCards)
  }

  return `<!DOCTYPE html>
<html lang="en"><head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <title>${esc(fullTitle)}</title>
    <script type="module" src="/shared/D2L/Courseware_HTML_Templates/V5/latest/_assets/js/global.min.js"></script>
    <script src="/shared/D2L/Courseware_HTML_Templates/V5/latest/_assets/js/client.js"></script>
    <script defer="" src="https://templates.lcs.brightspace.com/lib/assets/js/scripts.min.js"></script>
    <link rel="stylesheet" href="/shared/D2L/Courseware_HTML_Templates/V5/latest/_assets/css/global.min.css">
    <link rel="stylesheet" href="/shared/D2L/Courseware_HTML_Templates/V5/latest/_assets/css/client.min.css">
    <link rel="stylesheet" href="/shared/HTML-Template-Library/HTML-Templates-V5/css/custom.css">
    <link rel="stylesheet" href="/d2l/le/contentstyler/6606/files/View">
    <!-- Self-contained styles + accordion JS (visible outside Brightspace too) -->
    <style>
      *,*::before,*::after{box-sizing:border-box;}
      body{margin:0;font-family:"Segoe UI",Arial,sans-serif;font-size:16px;color:#1a1a1a;background:#fff;}
      .courseware-container-fluid{max-width:1100px;margin:0 auto;padding:0 1.5rem 3rem;}
      .courseware-layouts-content-wrapper{padding:0;}
      .courseware-headers-hero{position:relative;margin:0 -1.5rem 2rem;}
      .courseware-headers-hero img{width:100%;display:block;}
      .courseware-headers-overlay-content{padding:1rem 2rem;background:#E10054;display:inline-block;}
      .courseware-headers-overlay-content h1{margin:0;color:#fff;font-size:1.8rem;font-weight:700;}
      h2{font-size:1.2rem;font-weight:700;color:#E10054;margin:1.75rem 0 .5rem;border-bottom:2px solid #f0e0e8;padding-bottom:.4rem;}
      hr{border:none;border-top:3px solid #E10054;margin:1.5rem 0;}
      p{margin:.4rem 0 .7rem;line-height:1.6;}
      ul,ol{margin:.3rem 0 .7rem 1.5rem;line-height:1.7;}
      a{color:#E10054;}
      .courseware-callout{display:flex;gap:1rem;background:#fff8fa;border-left:4px solid #E10054;border-radius:6px;padding:1rem 1.25rem;margin:1rem 0 1.5rem;}
      .courseware-callout-icon-container{font-size:1.5rem;flex-shrink:0;}
      .courseware-icon[data-icon="note"]::before{content:"(note)";}
      .courseware-callout-text{flex:1;}
      table{width:100%;border-collapse:collapse;margin:.5rem 0 1rem;font-size:.92rem;}
      td,th{padding:.5rem .75rem;border:1px solid #ccc;vertical-align:top;}
      tbody tr:first-child td{background:#E10054;color:#fff;font-weight:700;}
      tbody tr:nth-child(even):not(:first-child){background:#fdf5f8;}
      .d2l-element .instruction{font-size:.82rem;color:#888;margin:.25rem 0 .75rem;font-style:italic;}
      .accordion{display:flex;flex-direction:column;gap:.5rem;margin-bottom:1rem;}
      .card{border:1px solid #e0cdd5;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06);}
      .card-header{background:#E10054;cursor:pointer;user-select:none;}
      .card-header:hover{background:#c8004b;}
      .card-title{padding:.85rem 1.1rem;color:#fff;font-weight:600;font-size:.97rem;display:flex;justify-content:space-between;align-items:center;}
      .card-title::after{content:"\\25B8";font-size:.8rem;transition:transform .2s;flex-shrink:0;}
      .card.open .card-title::after{transform:rotate(90deg);}
      .collapse{display:none;}
      .card.open .collapse{display:block;}
      .card-body{padding:1rem 1.25rem;background:#fff;font-size:.93rem;line-height:1.65;}
      .card-body p:first-child{margin-top:0;}
      .card-body p:last-child{margin-bottom:0;}
      footer{margin-top:3rem;padding-top:1rem;border-top:1px solid #e0cdd5;text-align:center;}
      footer img{max-height:40px;opacity:.6;}
    </style>
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        document.querySelectorAll('.card-header').forEach(function(header) {
          header.addEventListener('click', function() {
            this.closest('.card').classList.toggle('open');
          });
        });
        document.querySelectorAll('.accordion').forEach(function(acc) {
          var first = acc.querySelector('.card');
          if (first) first.classList.add('open');
        });
      });
    </script>

</head><body><div class="courseware-container-fluid courseware-themes">
<div class="courseware-layouts-content-wrapper">
<div class="courseware-headers-hero courseware-headers-intersect courseware-helper-bg-img-wrapper mceEditable">
<p><img src="vitaly-gariev-iUNNrEwaT0oa-unsplash.jpg" alt="" title="" data-d2l-editor-default-img-style="true" style="max-width:100%;"></p>
<div class="courseware-headers-overlay-content mceEditable">
<h1>Course Syllabus</h1>
</div>
</div>
<hr>
<h2>${esc(courseCode)}</h2>
<h2>${esc(courseTitle)}</h2>

<h2>Course Description</h2>
<p>${esc(data.description || "")}</p>
<p><br>Review the following important information about this course.&nbsp;</p>

${accordionSection("d2l-uid-815", infoCards)}

<br>
<h2>Course and Evaluation Schedule</h2>
${accordionSection("d2l-uid-363", evalCards)}
${policiesSection}

<p>&nbsp;</p>
<footer class="mceNonEditable">
<p><img src="/shared/HTML-Template-Library/HTML-Templates-V5/img/logo.png" class="mceEditable" alt="logo"></p>
</footer></div>
</div></body></html>`
}
