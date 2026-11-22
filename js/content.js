// All site content lives here. Edit this file to add a paper or a project.

export const profile = {
  name: 'Supun Manathunga',
  // The name as the hero draws it: a terminal banner made with figlet (the npm package, 1.8.0),
  // font "Larry 3D", one word at a time: SUPUN, then MANATHUNGA.
  // Plain ASCII only, so every character is in Courier Prime and the columns line up.
  banner: [
    " ____    __  __  ____    __  __  __  __",
    "/\\  _`\\ /\\ \\/\\ \\/\\  _`\\ /\\ \\/\\ \\/\\ \\/\\ \\",
    "\\ \\,\\L\\_\\ \\ \\ \\ \\ \\ \\L\\ \\ \\ \\ \\ \\ \\ `\\\\ \\",
    " \\/_\\__ \\\\ \\ \\ \\ \\ \\ ,__/\\ \\ \\ \\ \\ \\ , ` \\",
    "   /\\ \\L\\ \\ \\ \\_\\ \\ \\ \\/  \\ \\ \\_\\ \\ \\ \\`\\ \\",
    "   \\ `\\____\\ \\_____\\ \\_\\   \\ \\_____\\ \\_\\ \\_\\",
    "    \\/_____/\\/_____/\\/_/    \\/_____/\\/_/\\/_/",
    "         ______  __  __  ______  ______  __  __  __  __  __  __  ____    ______",
    " /'\\_/`\\/\\  _  \\/\\ \\/\\ \\/\\  _  \\/\\__  _\\/\\ \\/\\ \\/\\ \\/\\ \\/\\ \\/\\ \\/\\  _`\\ /\\  _  \\",
    "/\\      \\ \\ \\L\\ \\ \\ `\\\\ \\ \\ \\L\\ \\/_/\\ \\/\\ \\ \\_\\ \\ \\ \\ \\ \\ \\ `\\\\ \\ \\ \\L\\_\\ \\ \\L\\ \\",
    "\\ \\ \\__\\ \\ \\  __ \\ \\ , ` \\ \\  __ \\ \\ \\ \\ \\ \\  _  \\ \\ \\ \\ \\ \\ , ` \\ \\ \\L_L\\ \\  __ \\",
    " \\ \\ \\_/\\ \\ \\ \\/\\ \\ \\ \\`\\ \\ \\ \\/\\ \\ \\ \\ \\ \\ \\ \\ \\ \\ \\ \\_\\ \\ \\ \\`\\ \\ \\ \\/, \\ \\ \\/\\ \\",
    "  \\ \\_\\\\ \\_\\ \\_\\ \\_\\ \\_\\ \\_\\ \\_\\ \\_\\ \\ \\_\\ \\ \\_\\ \\_\\ \\_____\\ \\_\\ \\_\\ \\____/\\ \\_\\ \\_\\",
    "   \\/_/ \\/_/\\/_/\\/_/\\/_/\\/_/\\/_/\\/_/  \\/_/  \\/_/\\/_/\\/_____/\\/_/\\/_/\\/___/  \\/_/\\/_/",
  ],
  prompt: 'supun@mcgill:~$',
  // The hero opens with the visitor logging in: `local` is their prompt, `command` what they type.
  login: { local: '$', command: 'ssh supun@mcgill' },
  line: 'Bayesian methods, sequential Monte Carlo and machine learning for infectious disease epidemiology.',
  lab: { label: 'D3MOD lab', url: 'https://mchi.mcgill.ca/#/labs/d3mod' },
  links: [
    // the CV without funding amounts or contact details, made from ~/Desktop/PhD/CVs/CV.docx
    { label: 'CV (PDF)', url: 'assets/Supun-Manathunga-CV.pdf' },
    { label: 'Google Scholar', url: 'https://scholar.google.com/citations?user=oewW6r4AAAAJ&hl=en' },
    { label: 'GitHub', url: 'https://github.com/ssm123ssm' },
    { label: 'D3MOD lab', url: 'https://mchi.mcgill.ca/#/labs/d3mod' },
  ],
  // About, in the first person. {lab} becomes a link to the lab.
  about: 'I am a PhD candidate in Experimental Medicine at McGill University, in the {lab}. My research interests are Bayesian methods, sequential Monte Carlo and machine learning for infectious disease epidemiology.',
  // Before McGill (wording the user chose: no places or dates).
  background: 'I obtained my MBBS from the Faculty of Medicine, University of Peradeniya, and worked as a medical doctor in both the curative and preventive health sectors. I then joined the University of Peradeniya as a lecturer, before coming to McGill for my PhD.',
  hobby: 'Outside research, I {photograph the night sky}: nebulae, galaxies, comets and the Moon.', // {..} links to the photos
};

// The featured piece of work, shown in the hero next to its scene.
export const spotlight = {
  label: 'Current work',
  title: 'A model-based adaptive sampling framework for infectious disease surveillance',
  authors: 'S Manathunga, N Osgood, SF O\'Brien, DL Buckeridge, WA Russell',
  venue: 'arXiv:2611.01199, 2026',
  // From the SMDM prize page, which lists the 2026 winners.
  prize: {
    label: 'Lee B. Lusted Student Prize, SMDM 2026',
    url: 'https://smdm.org/lee-b-lusted-student-prize-competition/',
    note: 'Quantitative Methods and Theoretical Developments, for the poster "Using a stochastic epidemic model to guide efficient seroprevalence sampling decisions".',
  },
  text: 'How many samples does the next surveillance round really need? A particle filter keeps a state-space epidemic model up to date as data arrive. Its one-step-ahead prediction feeds a Bayesian assurance criterion, which picks the cheapest design likely to reach a target credible-interval width. Tested in simulation and on SARS-CoV-2 serosurveillance of Canadian blood donors.',
  links: [
    { label: 'Paper', url: 'https://arxiv.org/abs/2611.01199' },
    { label: 'Code', url: 'https://github.com/ssm123ssm/Adaptive_sampling_public' },
    { label: 'Poster supplement', url: 'https://ssm123ssm.github.io/adaptive-sampling/' },
  ],
};

// Shown in the hero, one per state of the scene: scattered, four partial steps, resolved.
export const stages = [
  'Before any data, the shape could be anything. Each particle is one guess, and the guesses are scattered everywhere.',
  'The first data arrive. Guesses that fit are kept and copied; the ones that do not are dropped.',
  'The survivors spread out a little to predict what comes next, then meet the next batch of data.',
  'Every round is the same loop: predict, compare with the data, resample.',
  'With each pass the cloud tightens around what the data support.',
  'The shape is resolved. That is a particle filter: many rough guesses, refined by data, round after round.',
];

// After the login, the hero's terminal runs fig. 1 as scrolling moves through it: the first
// stage runs `first`, each later one `next`, and the stage text above is the command's output.
export const stageShell = { first: 'pf init --particles 16000', next: 'pf step' };

// What the terminal types as each later section comes into view; the section prints as its
// output. A Papers tab adds its topic as a folder (ls -t papers/bayes/).
export const commands = {
  work: 'cat current-work.md',
  research: 'cat research.md',
  papers: 'ls -t papers/',
  projects: 'ls projects/',
  awards: 'cat awards.md',
  astro: 'ls ~/astro',
  contact: 'mail supun',
  about: 'whoami',
};

// fig. 1 is a real particle filter. These point readers at its code and at the script that
// checks its output against the target; both are served with the site.
const pfCode = 'js/particle-filter.js';
const pfCheck = 'tools/check-filter.mjs';

// Shown in the hero, under the scroll hint.
export const filterNote = {
  text: 'This is a real particle filter: 16,000 particles tempered toward a 3D density shaped like the virion, with systematic resampling and Metropolis-Hastings moves.',
  links: [{ label: 'Particle filter code', url: pfCode }],
};

// fields: the main areas, shown as a line under the title.
export const themes = [
  {
    key: 'epi',
    title: 'Epidemic modelling and surveillance',
    fields: ['Adaptive sampling', 'Particle filters', 'State-space models for infectious disease'],
    text: "State-space models of infectious disease, fitted with particle filters as surveillance data arrive, and adaptive sampling that uses the model's forecast to set the size of the next round. Earlier work on transmission estimates and outbreak simulation.",
  },
  {
    key: 'bayes',
    title: 'Bayesian methods',
    fields: ['Sequential Monte Carlo', 'Bayesian assurance', 'Bayesian meta-analysis'],
    text: 'Sequential Monte Carlo for models that are refitted as data accumulate, and Bayesian assurance for choosing sample sizes, both before a study and round by round during one. Bayesian meta-analysis to pool published clinical evidence.',
  },
];

const arx = (id) => `https://arxiv.org/abs/${id}`;

// tag: epi | bayes | ai | clin.  cites: Google Scholar, Nov 2026 (null = not yet listed).
export const pubs = [
  { y: 2026, tag: 'epi', cites: null, url: arx('2611.01199'), t: 'A model-based adaptive sampling framework for infectious disease surveillance', a: 'S Manathunga, N Osgood, SF O\'Brien, DL Buckeridge, WA Russell', v: 'arXiv:2611.01199' },
  { y: 2026, tag: 'bayes', cites: null, url: arx('2602.14877'), t: 'When to repeat a biomarker test? Decomposing sources of variation from conditionally repeated measurements', a: 'S Manathunga, MP Janssen, Y Luo, WA Russell, M Pothast', v: 'arXiv:2602.14877' },
  { y: 2026, tag: 'clin', cites: 4, t: 'Potential benefits of an alternative haemoglobin deferral strategy evaluated in seven countries', a: 'A Meulenbeld, C Styles, G Shuttleworth, S Manathunga, H van Remoortel, et al.', v: 'Vox Sanguinis 121(1), 26-34' },
  { y: 2026, tag: 'clin', cites: null, t: 'Silent cardiometabolic risk among university entrance students in a South Asian country, Sri Lanka: an urgent call for early intervention', a: 'G Amiyangoda, S Manathunga, C Ratnatunga, C Herath, C Gamagedara, et al.', v: 'Atherosclerosis 419' },
  { y: 2026, tag: 'clin', cites: null, t: 'Evaluation of the efficacy of the Sampson equation for LDL-C: single-centre study at a tertiary care hospital in Sri Lanka', a: 'M Balasooriya, K Basnayake, N Galmangodage, S Manathunga, et al.', v: 'Asian Journal of Internal Medicine 5(2), 15-24' },
  { y: 2025, tag: 'bayes', cites: 63, t: 'Epidemiology of pediatric functional abdominal pain disorders: a meta-analysis', a: 'N Koen Vermeijden, L de Silva, S Manathunga, D Spoolder, J Korterink, et al.', v: 'Pediatrics 155(2), e2024067677' },
  { y: 2025, tag: 'ai', cites: 41, t: 'Artificial intelligence assisted automated short answer question scoring tool shows high correlation with human examiner markings', a: 'H Seneviratne, SS Manathunga', v: 'BMC Medical Education 25(1), 1146' },
  { y: 2025, tag: 'bayes', cites: 8, t: 'How do we define normal bowel frequency from newborn to teens? A Bayesian meta-analysis', a: 'S Munasinghe, S Manathunga, W Hathagoda, C Kuruppu, P Ranasinghe, et al.', v: 'J Pediatr Gastroenterol Nutr 80(4), 569-579' },
  { y: 2025, tag: 'ai', cites: 6, t: 'Artificial intelligence based personalized student feedback system: Sisu Athwala, to enhance exam performance of medical undergraduates', a: 'T Seneviratne, S Manathunga, W Idirisingha, K Somaratne, K Marambe, et al.', v: 'PLoS ONE 20(12), e0336154' },
  { y: 2025, tag: 'epi', cites: null, url: arx('2509.14213'), t: 'PoPStat-COVID19: leveraging population pyramids to quantify demographic vulnerability to COVID-19', a: 'B Wijenayake, A Ratnayake, L Edirisinghe, U Wijeratne, T Fonseka, R Godaliyadda, S Dharmaratne, P Ekanayake, V Herath, I Alwis, S Manathunga', v: 'arXiv:2509.14213' },
  { y: 2025, tag: 'epi', cites: 1, url: arx('2501.11514'), t: 'Devising popstat: a metric bridging population pyramids with global disease mortality', a: 'T Fonseka, B Wijenayake, A Ratnayake, I Alwis, S Manathunga, et al.', v: 'arXiv:2501.11514' },
  { y: 2025, tag: 'clin', cites: 1, t: 'Effectiveness of adrenal venous sampling in the management of primary aldosteronism: single-centered cross-sectional study at a tertiary care hospital in Sri Lanka', a: 'C Balasooriya, S Manathunga, S Nagaratnam, S Ozaal, et al.', v: 'J ASEAN Fed Endocr Soc 40(2), 126' },
  { y: 2024, tag: 'clin', cites: 2, t: 'Antibiotic prescription in critical care units in Sri Lanka: a prospective multi-centre survey', a: 'D Priyankara, A Mudalige, M Lokuge, W Samaranayake, E Sanjeeva, et al.', v: 'Ceylon Medical Journal 69(SI3)' },
  { y: 2024, tag: 'clin', cites: 1, t: 'A comparative study on outcomes of fasting vs postprandial thyroid function tests among pregnant mothers in a tertiary care setting in Sri Lanka', a: 'SB Mohideen, T Herath, S Manathunga', v: 'Laboratory Medicine 55(3), 320-324' },
  { y: 2024, tag: 'clin', cites: 1, t: 'Comparison of the effectiveness and safety of hydroxychloroquine and methotrexate in the treatment of moderate-to-severe oral lichen planus: a pilot study', a: 'S Gnanarathne, S Fonseka, SS Manathunga, R Jayasinghe, et al.', v: 'J Oral Health Community Dent 17(3), 116-120' },
  { y: 2023, tag: 'epi', cites: 115, t: 'A comparison of transmissibility of SARS-CoV-2 variants of concern', a: 'SS Manathunga, IA Abeyagunawardena, SD Dharmaratne', v: 'Virology Journal 20(1), 59' },
  { y: 2023, tag: 'ai', cites: 36, url: arx('2308.00479'), t: 'Retrieval augmented generation and representative vector summarization for large unstructured textual data in medical education', a: 'SS Manathunga, YA Illangasekara', v: 'arXiv:2308.00479' },
  { y: 2023, tag: 'ai', cites: 20, url: arx('2309.02884'), t: 'Aligning large language models for clinical tasks', a: 'S Manathunga, I Hettigoda', v: 'arXiv:2309.02884' },
  { y: 2022, tag: 'epi', cites: 1, t: 'A stochastic process based modular tool-box for simulating COVID-19 infection spread', a: 'SS Manathunga, IA Abeyagunawardena, SD Dharmaratne', v: 'Informatics in Medicine Unlocked 29, 100899' },
  { y: 2022, tag: 'clin', cites: 1, t: 'Prediction of gestational diabetes mellitus using early oral glucose tolerance test', a: 'C Kandauda, SS Manathunga, IA Abeyagunawardena, K Thilakarathne', v: 'medRxiv 2022.03.29.22273154' },
  { y: 2022, tag: 'clin', cites: 2, t: 'Health-related quality of life, personality and psychological maladjustment, emotional and behavioural problems, and family impact in children with nephrotic syndrome (abstract)', a: 'R Ranawaka, P Chathurangana, H Liyanaarachchi, P Dissanayake, et al.', v: 'Arch Dis Child 107 (Suppl 2), A99' },
  { y: 2020, tag: 'epi', cites: 76, t: 'Estimation of the basic reproduction number (R0) for the novel coronavirus disease in Sri Lanka', a: 'S Dharmaratne, S Sudaraka, I Abeyagunawardena, K Manchanayake, et al.', v: 'Virology Journal 17(1), 144' },
];

export const tagNames = { all: 'All', epi: 'Epidemics', bayes: 'Bayesian', ai: 'Language models', clin: 'Clinical' };

const gh = (r) => `https://github.com/ssm123ssm/${r}`;

// fig. 2 is a live stochastic SIR epidemic. Shown in its hover note and the Research panel;
// keep the numbers in step with PARAMS in js/sir.js.
const sirCode = 'js/sir.js';
export const sirNote = {
  text: 'This is a live stochastic SIR epidemic on a 120 x 120 grid: each day an infected person infects each neighbour with probability 0.1, rarely someone far away, and recovers with probability 0.15.',
  links: [{ label: 'SIR model code', url: sirCode }],
  hint: 'Click the grid to start an epidemic there.', // in the hover note only (mouse)
  touch: 'Tap the grid to start an epidemic there.', // in the note under the figure (touch screens)
};

// Astrophotography: finished images from the Astro projects folder, resized to 1600 px at most
// in assets/astro, with no metadata. The Astrophotography section lists them in this order and
// shows the first by default (it also becomes fig. 5's sky). y: year of the final edit.
export const astro = [
  { file: 'moon-hdr.jpg', title: 'Moon, HDR', y: 2023 },
  { file: 'carina-nebula.jpg', title: 'Carina Nebula', y: 2023 },
  { file: 'comet-atlas.jpg', title: 'Comet ATLAS', y: 2024 },
  { file: 'conjunction.jpg', title: 'Planetary conjunction at dusk', y: 2023 },
  { file: 'full-moon.jpg', title: 'Full Moon', y: 2023 },
  { file: 'horsehead-flame.jpeg', title: 'Horsehead and Flame nebulae', y: 2023 },
  { file: 'leo-triplet.jpg', title: 'Leo Triplet', y: 2023 },
  { file: 'pleiades.jpg', title: 'Pleiades (M45)', y: 2022 },
  { file: 'milky-way.jpg', title: 'Milky Way', y: 2023 },
  { file: 'orion-nebula.jpg', title: 'Orion Nebula', y: 2023 },
  { file: 'orion-sword.jpg', title: "Orion's sword", y: 2023 },
  { file: 'orion-belt.jpg', title: "Orion's belt and sword", y: 2023 },
  { file: 'gibbous-moon.jpg', title: 'Waning gibbous Moon', y: 2024 },
];

// links: extra links shown after Live site / Source.
export const projects = [
  {
    name: 'This portfolio', stack: 'JavaScript',
    text: 'This site, written as a terminal session. The figures come from a small renderer that draws 3D point clouds as ASCII characters, without libraries. The particle filter is a real sequential Monte Carlo sampler: 16,000 particles tempered toward a 3D density of the virion, with systematic resampling and Metropolis-Hastings moves, checked against exact draws. The research figure shows a stochastic SIR epidemic on a 120 x 120 grid, run live.',
    links: [{ label: 'Renderer', url: 'js/ascii.js' }, { label: 'Particle filter', url: pfCode }, { label: 'Check script', url: pfCheck }, { label: 'SIR model', url: sirCode }],
  },
  { name: 'adaptive-sampling', stack: 'R / HTML', text: 'Using a stochastic epidemic model to guide efficient seroprevalence sampling decisions.', live: 'https://ssm123ssm.github.io/adaptive-sampling/', code: gh('adaptive-sampling') },
  { name: 'MEDAC poster', stack: 'HTML', text: 'Sequential Bayesian assurance for adaptive data collection in mechanistic state-space models.', live: 'https://ssm123ssm.github.io/MEDAC_poster/', code: gh('MEDAC_poster') },
  { name: 'Dengue Watch', stack: 'R / Shiny', text: 'An interactive dashboard of dengue in the Gothatuwa MOH area, showing trends of spread and hotspots.', live: 'https://supun-manathunga.shinyapps.io/Dengue_Watch/' },
  { name: 'HLA matcher', stack: 'R / Shiny', text: 'Finds potential bone marrow donor matches by HLA type, for Thalassemia Circle Sri Lanka, a not-for-profit organization.', live: 'https://supun-manathunga.shinyapps.io/HLA_matcher/' },
  { name: 'Assurance paper', stack: 'Python', text: 'Companion assets for the paper on nonmonotone precision assurance in Bayesian sample size determination for binomial proportions.', code: gh('Assurance_paper') },
  { name: 'global-health-101', stack: 'TypeScript', text: 'Analysis of 84 global health course syllabi from the USA and Canada for decolonial framing, equity and epistemic justice, with an in-browser tool to score your own syllabus.', live: 'https://ssm123ssm.github.io/global-health-101/', code: gh('global-health-101') },
  { name: 'NCD Rust', stack: 'Rust / Tauri / React', text: 'Desktop application for exploring non-communicable disease admission trends in Sri Lanka: admissions, crude rates and standardized rates.', code: gh('NCD_rust') },
  { name: 'Sisu Athwala', stack: 'JavaScript', text: 'Exam performance monitoring and automatic essay scoring for the Faculty of Medicine, University of Peradeniya.', live: 'https://sisu-athwala.vercel.app', code: gh('sisu-athwala') },
  { name: 'docGPT', stack: 'Python', text: 'Document intelligence over unstructured files: retrieval and summarization, written as an abstraction over langchain.', code: gh('docGPT-pharm') },
  { name: 'Preview', stack: 'Next.js', text: 'Publish content from private GitHub repositories as authenticated websites.', live: 'https://preview-public.vercel.app', code: gh('preview_public') },
  { name: 'mailer', stack: 'Node', text: 'A free form-data to email platform: receive form submissions in your inbox without writing server-side code.', code: gh('mailer') },
  { name: 'CodePen', stack: 'HTML / CSS / JS', text: 'Smaller pieces in HTML, CSS and JavaScript.', links: [{ label: 'codepen.io/ssm123ssm', url: 'https://codepen.io/ssm123ssm' }] },
];

// Funding and awards, from the CV (Sep 2026), newest first. The linked pages list them: McGill's
// Tomlinson scholars (2025-2026), the AI4PH trainees (2026-2027 cohort), the OHAP trainees (2025
// cohort), SMDM's Lusted winners (2026); the FRQS one links the award's DOI.
export const awards = [
  { y: '2026', name: 'Lee B. Lusted Student Prize', by: 'Society for Medical Decision Making, 48th Annual Meeting, Oslo: Quantitative Methods and Theoretical Developments', url: 'https://smdm.org/lee-b-lusted-student-prize-competition/' },
  { y: '2026', name: 'AI4PH Trainee Scholarship', by: 'AI4PH (Artificial Intelligence for Public Health) Health Research Training Platform, 2026-27', url: 'https://ai4ph-hrtp.ca/trainees/' },
  { y: '2026', name: 'Graduate Research Enhancement and Travel Award', by: 'McGill University, to present at SMDM 2026' },
  { y: '2025', name: 'Richard H. Tomlinson Doctoral Fellowship', by: 'McGill University, 2025-26', url: 'https://www.mcgill.ca/gps/funding/achievements/tomlinson-doctoral-fellowships' },
  { y: '2025', name: "FRQS Master's Scholarship", by: 'Fonds de recherche du Québec - Santé, 2025-2026', url: 'https://doi.org/10.69777/373650' },
  { y: '2025', name: 'NSERC CREATE in One Health Against Pathogens (OHAP)', by: 'Trainee, 2025-2028', url: 'https://www.ohapcreate.ca/trainees' },
  { y: '2024', name: 'University Research Grant, principal investigator', by: 'University of Peradeniya, 2024-2026: predicting plasma leakage in dengue haemorrhagic fever' },
  { y: '2022-25', name: 'Presentation and research awards', by: 'At academic sessions in Sri Lanka, among them the Research Excellence Award of the Peradeniya Medical School Annual Research Congress (2024)' },
];

// Contact: a form that a form-delivery service emails on, so no address is on the page. Set
// endpoint to the form's URL there (Formspree: 'https://formspree.io/f/<id>'; Web3Forms:
// 'https://api.web3forms.com/submit', with fields: { access_key: '<key>' }). Until then,
// sending says it is not set up.
export const contact = {
  intro: 'Write to me here and I will reply by email.',
  endpoint: 'https://formspree.io/f/moedjgpo', // Formspree form for this site
  fields: {},
};
