# SchemeSaathi (योजना साथी)

> **Citizen-First Government Scheme Finder, Explainable Eligibility Engine & Document Assistant for India**

SchemeSaathi empowers Indian citizens—especially farmers, students, women, job seekers, seniors, and low-income households—to discover verified government welfare schemes, understand their eligibility deterministically without guesswork, identify documentation gaps, and download customized preparation checklists.

---

## 🏛️ Key Features

### 1. Verified Scheme Database (26 Authoritative Schemes)
* **Real Government Data Only**: Grounded in official publications from [myScheme.gov.in](https://www.myscheme.gov.in/), [data.gov.in](https://data.gov.in/), Central Ministries, and the Government of Bihar.
* **Separation of Demo Data**: Fictional demonstration schemes are strictly isolated in `src/data/demoSchemes.json` with `"verificationStatus": "demo"` so production queries only touch verified records.
* **Repeatable Data Importer**: Command-line import utility (`scripts/importSchemes.js` and `src/data/importer.js`) supporting JSON and CSV, schema validation, state and category normalization, duplicate detection, and import auditing.

### 2. Explainable Deterministic Eligibility Engine
* **Four Clear Outcomes**:
  * `eligible` — All mandatory age, income, occupation, gender, state, and specific rules are satisfied.
  * `maybe` — Key criteria appear matching, but specific information (e.g., annual income, domicile certificate) is pending confirmation.
  * `not_eligible` — At least one documented statutory rule is definitively breached (e.g., age above cutoff, non-farmer, income ceiling exceeded).
  * `insufficient_info` — Not enough profile information provided to make a determination.
* **Condition Breakdown**: Every evaluation details `satisfied`, `unsatisfied`, and `missing` fields. Missing data is never treated as satisfied.
* **Non-Guaranteed Disclaimer**: Prominently informs citizens that SchemeSaathi provides preparation assistance; final sanction rests exclusively with the designated government authority.

### 3. Application Readiness Score (0–100%)
* Transparent, weighted readiness metric:
  * Profile completeness (40%)
  * Evaluated eligibility status (30%)
  * Collected required documents (30%)
* Live progress indicator with breakdown and immediate tips to raise your score.

### 4. Interactive Conversational AI Profile Autofill Assistant
* **Step-by-Step AI Question & Answer**: Proactively asks easy questions (e.g., "What is your age? / आपकी उम्र कितनी है?", "Which state do you live in?", "What is your occupation?"). The citizen tells their answer and the form field is immediately autofilled.
* **Speech Recognition (Voice Mic)**: Integrated Web Speech API (`SpeechRecognition`) supporting Hindi (`hi-IN`) and English (`en-IN`) for hands-free voice input.
* **Voice Read-Out (Text-to-Speech)**: Speaks questions aloud via `window.speechSynthesis` so rural or non-literate citizens can listen and respond with spoken words.
* **Inline `[✨ AI]` Field Triggers**: Dedicated assist button beside each individual question (Age, State, Occupation, Farmland, Income) to trigger targeted AI guidance.
* **1-Click Real-World Citizen Presets**: Instant profiles for Small Farmers (Bihar), College Students, Senior Citizens, Street Vendors, and Persons with Disabilities.
* **Freeform Speech / Natural Sentence Parser**: Speak or type a full sentence in Hindi, English, or Hinglish; extractors automatically map all details simultaneously.

### 5. Eligibility Gap Finder ("What Am I Missing?")
* Interactive quick-answer tool on results and scheme detail pages.
* Dynamically identifies missing inputs (e.g., "Do you own cultivable farmland?", "What is your annual household income?") and recalculates status on the fly.

### 5. Smart Document Checklist & Personalized PDF Export
* Categorizes required scheme documents into **Collected** and **Pending**.
* **Shared Documents Insight**: Highlights documents common across multiple eligible schemes (e.g., Aadhaar card or bank passbook unlocks 5+ schemes at once).
* **Personalized PDF Export**: High-resolution, printable PDF export generated client-side via `jspdf` and `html2canvas` for offline citizen reference.

### 6. Side-by-Side Scheme Comparison (`/compare`)
* Compare up to 3 schemes simultaneously on benefits, age limits, income ceilings, applicable states, domicile rules, and required documents.

### 7. Grounded Scheme Assistant (`/assistant`)
* Plain-language conversational guide powered by server-side Gemini 2.5 Flash.
* **Strict Grounding**: Answers only from verified local database facts; never invents scheme benefits or promises sanctions.
* **Offline / Fallback Resilience**: When API keys or network are unavailable, automatically falls back to deterministic local search over verified schemes.

### 8. Offline Scheme Finder & Local Storage
* Caches scheme rules and citizen profile in `localStorage` for offline browsing.
* Clear offline status banner warns users when operating disconnected.

### 9. Multilingual Accessibility (English, हिन्दी, اردو)
* Full translation symmetry across English, Hindi, and Urdu.
* Noto Sans, Noto Sans Devanagari, and Noto Naskh Arabic typography with traditional Jaali lattice design motifs and heritage color palette:
  * Forest Green (`#1E3B2C`)
  * Heritage Ivory (`#F5EEDC`)
  * Terracotta (`#A4461F`)
  * Warm Sage (`#A8B79B`)
  * Turmeric Accent (`#E2A82B`)

---

## 📋 Verified Schemes in Initial Database (26 Schemes)

| Scheme ID | Official Name | Ministry / Department | Category | Level |
|---|---|---|---|---|
| `pm-kisan` | PM-KISAN (Pradhan Mantri Kisan Samman Nidhi) | Ministry of Agriculture & Farmers Welfare | Agriculture | Central |
| `pmfby` | Pradhan Mantri Fasal Bima Yojana (PMFBY) | Ministry of Agriculture & Farmers Welfare | Agriculture | Central |
| `kcc-scheme` | Kisan Credit Card (KCC) Scheme | Dept of Agriculture & Farmers Welfare / RBI | Agriculture | Central |
| `brfsy-bihar` | Bihar Rajya Fasal Sahayata Yojana (BRFSY) | Dept of Co-operative, Govt of Bihar | Agriculture | State (Bihar) |
| `csss-scholarship` | Central Sector Scheme of Scholarship for College and University Students (PM-USP CSSS) | Dept of Higher Education, Ministry of Education | Education | Central |
| `post-matric-sc-st` | Post Matric Scholarship for SC/ST Students | Ministry of Social Justice and Empowerment | Education | Central |
| `bihar-student-credit-card` | Bihar Student Credit Card Scheme (MNSSBY) | Dept of Education, Govt of Bihar | Education | State (Bihar) |
| `mnssby-sha-bihar` | Mukhyamantri Nishchay Swayam Sahayata Bhatta Yojana (MNSSBY) | Dept of Planning and Development, Govt of Bihar | Employment | State (Bihar) |
| `mky-bihar` | Mukhyamantri Kanya Utthan Yojana | Dept of Social Welfare / Education, Govt of Bihar | Welfare | State (Bihar) |
| `pmjay-ayushman` | Ayushman Bharat - Pradhan Mantri Jan Arogya Yojana (PM-JAY) | National Health Authority, MoHFW | Health | Central |
| `pmmvy` | Pradhan Mantri Matru Vandana Yojana (PMMVY) | Ministry of Women and Child Development | Welfare | Central |
| `ssy` | Sukanya Samriddhi Yojana (SSY) | Dept of Economic Affairs / MoWCD | Welfare | Central |
| `ignoaps` | Indira Gandhi National Old Age Pension Scheme (IGNOAPS / NSAP) | Ministry of Rural Development | Pension | Central |
| `apy` | Atal Pension Yojana (APY) | PFRDA / Dept of Financial Services | Pension | Central |
| `pmay-g` | Pradhan Mantri Awaas Yojana - Gramin (PMAY-G) | Ministry of Rural Development | Housing | Central |
| `pmuy-ujjwala` | Pradhan Mantri Ujjwala Yojana (PMUY 2.0) | Ministry of Petroleum and Natural Gas | Welfare | Central |
| `pmmy-mudra` | Pradhan Mantri Mudra Yojana (PMMY) | Dept of Financial Services, Ministry of Finance | Business | Central |
| `pm-svanidhi` | PM Street Vendor's AtmaNirbhar Nidhi (PM SVANidhi) | Ministry of Housing and Urban Affairs | Business | Central |
| `pm-vishwakarma` | PM Vishwakarma Scheme | Ministry of Micro, Small & Medium Enterprises | Business | Central |
| `pmegp` | Prime Minister's Employment Generation Programme (PMEGP) | KVIC / Ministry of MSME | Business | Central |
| `divyangjan-swavalamban` | National Handicapped Finance and Development Schemes (Swavalamban) | Dept of Empowerment of Persons with Disabilities, MSJE | Disability | Central |
| `adip-disability` | ADIP Scheme (Assistance to Disabled Persons for Purchase/Fitting of Aids and Appliances) | Dept of Empowerment of Persons with Disabilities, MSJE | Disability | Central |
| `bihar-udyami` | Mukhyamantri Udyami Yojana (Bihar) | Dept of Industries, Govt of Bihar | Business | State (Bihar) |
| `pmgkay` | Pradhan Mantri Garib Kalyan Anna Yojana (PMGKAY) | Dept of Food & Public Distribution | Welfare | Central |
| `ddu-gky` | Deen Dayal Upadhyaya Grameen Kaushalya Yojana (DDU-GKY) | Ministry of Rural Development | Employment | Central |
| `national-apprenticeship` | National Apprenticeship Promotion Scheme (NAPS-2) | Ministry of Skill Development and Entrepreneurship | Employment | Central |

---

## 💻 Windows PowerShell Run & Test Commands

To install dependencies, run the test suites, compile, and launch SchemeSaathi on a Windows machine using Windows PowerShell:

### 1. Install Dependencies
```powershell
npm install
```

### 2. Run Test Suite (25 Tests)
Runs deterministic eligibility boundary tests, state domicile rules, readiness score checks, data import verification, and multilingual i18n symmetry checks:
```powershell
npm test
```

### 3. Run Development Server (Vite + Express Backend)
Starts the full-stack server on `http://localhost:3000`:
```powershell
npm run dev
```

### 4. Build for Production
Creates the optimized production bundle in `/dist`:
```powershell
npm run build
```

### 5. Run Production Server
Serves the compiled production app on `http://localhost:3000`:
```powershell
npm start
```

---

## 📥 Command-Line Data Import Utility

The application includes a repeatable data-import engine (`scripts/importSchemes.js` and `src/data/importer.js`) that validates schemas, normalizes state codes and categories, checks duplicates, and audits missing attributes:

### Import a JSON file:
```powershell
node scripts/importSchemes.js my_new_schemes.json
```

### Import a CSV file:
```powershell
node scripts/importSchemes.js schemes_data.csv
```

### Run Importer with Custom Output:
```powershell
node scripts/importSchemes.js incoming.json src/data/schemes.json
```

---

## 🔒 Security & Privacy

* **Zero Credentials Storage**: SchemeSaathi never prompts for, stores, or transmits Aadhaar numbers, OTPs, bank passwords, or PINs.
* **Server-Side API Keys**: When Gemini AI capabilities are enabled, the `GEMINI_API_KEY` is accessed exclusively on the backend (`server.ts`) and is never leaked to the client browser.
* **Deterministic Transparency**: Eligibility criteria evaluate against statutory boundaries (age, income ceiling, occupation, state domicile) with full explanations provided to the user.
