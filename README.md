# AI-Based Government Scheme Eligibility Predictor

Citizens store a socio-economic profile in a unified data wallet. FastAPI evaluates six CORE Tamil Nadu welfare schemes using a saved Decision Tree, compares that prediction with documented rules, and explains why a scheme was recommended.

The citizen portal is branded **Scheme Predictor / SchemeWise AI**. Predictions are research results only. They are not government approval, identity verification, or a final eligibility decision.

The project includes a citizen portal, an administrator portal, an AI document scanner, a source-backed scheme knowledge base, and a generative AI Scheme Assistant.

The **Hybrid Rule + ML engine remains the only eligibility authority**. The Scheme Assistant provides information and does not calculate eligibility. Document scanning does not verify documents or change eligibility. The AI Scheme Agent workflow is planned but has not yet been implemented.

## 🌟 What Makes This Project Unique

* Hybrid **Rule Engine + Machine Learning** eligibility prediction
* Documented scheme conditions for transparent decisions
* Personalized scheme recommendations
* Explainable “Why this result?” recommendations
* Independent Decision Tree predictions compared with documented rules
* Unified socio-economic data wallet
* Profile completeness and readiness guidance
* Scheme comparison
* Eligibility simulation
* Recommendation history
* PDF eligibility reports
* Document checklist and application tracking
* AI document scanning with user-confirmed field extraction
* Source-backed scheme knowledge retrieval
* Generative AI Scheme Assistant
* Citizen and administrator portals
* ML performance and system evaluation
* English and Tamil language support
* JWT-based authentication and user-owned data access

---

# 🎯 Problem Statement

Government welfare schemes often have different eligibility requirements related to:

* Age
* Income
* Caste/category
* Occupation
* Education
* Land ownership
* Employment status
* Family characteristics
* Location
* Other socio-economic conditions

Citizens may find it difficult to determine which schemes are relevant to them and understand the documents or preparation steps involved.

This project provides a centralized platform where citizens can maintain socio-economic information, explore schemes, receive research-based eligibility predictions, understand the results, and track application preparation.

---

# 🚀 Core Features

## 👤 Citizen Profile / Socio-Economic Wallet

Users can maintain their socio-economic information through a centralized profile.

The wallet can contain eligibility-related information such as:

* Personal details
* Age
* Income
* Occupation
* Education
* Category
* Family information
* Location
* Other eligibility-related attributes supported by the application

The profile completeness system helps users identify missing information.

The wallet is used by existing eligibility and recommendation APIs. User-owned records are accessed through authenticated endpoints.

## 🤖 Hybrid Eligibility Prediction

The core of the system combines documented eligibility rules with a Machine Learning prediction.

### 1. 📋 Rule Engine

The documented scheme conditions are evaluated against the user's profile.

For example:

```text
Citizen Profile
      ↓
Check documented age condition
      ↓
Check documented income condition
      ↓
Check other supported conditions
      ↓
Rule Engine Result
```

The rule engine provides transparent reasons for its result.

### 2. 🌳 Machine Learning

A **Decision Tree classifier** is used to learn eligibility patterns from the prepared citizen–scheme dataset.

The model predicts whether a citizen is likely to satisfy the eligibility pattern for a scheme.

### 3. 🔀 Hybrid Decision

The system compares the documented rule result with the ML prediction.

```text
Citizen Profile
       ↓
Documented Rule Engine
       ↓
ML Decision Tree
       ↓
Compare Rule and ML Results
       ↓
Explain Agreement or Disagreement
       ↓
Recommendation
```

When the rule engine and ML model disagree, the documented rule remains the reference for eligibility explanation and recommendation inclusion.

The ML prediction does not replace documented eligibility rules.

## 🔍 Explainable Recommendations

Every recommendation provides a **“Why this result?”** explanation.

It can explain:

* Which documented conditions were checked
* Why the rule engine considered the profile eligible or not eligible
* What the Decision Tree predicted
* Whether the Rule Engine and ML model agree
* What the ML probability represents
* Which profile fields are incomplete

The results are research outputs and do not represent official government approval.

## 📊 Scheme Recommendation & Discovery

The system evaluates supported schemes and provides personalized recommendations.

Users can:

* View recommended schemes
* Search schemes
* Filter by category
* Filter by department
* View result counts
* Clear filters
* Compare schemes
* Open scheme details
* Access official scheme sources

The scheme catalog and knowledge retrieval features provide scheme information. Eligibility remains the responsibility of the existing Hybrid Rule + ML workflow.

## ⚖️ Scheme Comparison

Users can select schemes and compare them side-by-side.

Comparison can help users understand:

* Scheme name
* Department
* Category
* Eligibility requirements
* Benefits
* Important conditions
* Official source information

## 🕒 Recommendation History

Previous eligibility checks are stored for the authenticated user.

Users can:

* View previous checks
* Review previous recommendations
* Open previous results
* Track recommendation activity

Each user's history is isolated using their authenticated account.

## 📄 PDF Report Generation

Users can generate a PDF report containing eligibility results.

The report can be used to:

* Review recommendations
* Save results
* Share results
* Maintain a personal record

The generated report is informational and does not constitute official government approval.

## 📁 Document Checklist

The system provides document-related guidance associated with schemes.

Users can identify documents that may be required and track their preparation status.

This helps users understand what they may need before applying through the appropriate official channel.

## 📈 Profile Readiness & Insights

The system provides guidance based on existing profile information.

### Profile Readiness

Shows whether the user's profile contains the information required for meaningful eligibility evaluation.

### Insights

Provides summarized information about:

* Profile completeness
* Eligibility results
* Recommendation patterns
* Areas requiring attention

The system does not instruct users to manipulate their personal information to obtain eligibility.

## 📝 Applications & Notifications

The citizen portal supports application preparation and tracking.

Users can:

* Track application preparation stages
* View application status
* Review document readiness
* Receive in-portal reminders
* View and manage notifications

Application tracking does not submit applications to government portals.

No email, SMS, WhatsApp, push notification, or external messaging system is used.

---

# 🧠 AI Document Scanner

The AI Document Scanner helps citizens extract selected information from supported documents and review it before updating their wallet.

## Current functionality

* Upload a new education certificate or select an existing uploaded document
* Process supported document files using local OCR
* Display extracted fields for review
* Mark fields as extracted, unclear, or missing
* Allow users to edit extracted values
* Let users choose which fields to apply
* Update the wallet only after user confirmation
* Cancel without changing the wallet

The first supported document type is **education certificate**.

The current field mapping is limited to wallet fields supported by the implementation, including:

* Age
* Student status
* First higher education course
* School background

## OCR processing

The current OCR implementation uses local processing:

* PDF text extraction through `pypdf`
* Image and scanned-PDF processing through Tesseract-related libraries

Tesseract may need to be installed locally for photos or scanned PDFs.

Documents are not sent to an external OCR provider by this implementation.

## Important limitations

* OCR is not document verification.
* OCR does not approve or reject a document.
* OCR does not independently determine eligibility.
* Extracted values are not applied automatically.
* Users must review and confirm selected values.
* Only supported document types and mapped fields can be processed.
* Income, community, address, and identity extraction are not included in this phase.

---

# 📚 Source-Backed Scheme Knowledge Base

The scheme knowledge feature provides structured scheme information for the citizen portal and future assistant workflows.

## Data source

The existing `dataset/raw/schemes.csv` remains the scheme catalog.

The knowledge API uses catalog information such as:

* Scheme name
* Department
* Description
* Eligibility conditions
* Required documents
* Benefit details
* Application procedure
* Official source URL

The knowledge feature also exposes source and verification metadata, including:

* Source URL
* Verification status
* Last verified date, when recorded by an administrator
* Catalog access date
* Content state

The catalog access date is not treated as proof that the information has been verified.

## Verification controls

Administrators can review knowledge-source metadata and record verification information.

The knowledge feature does not automatically mark catalog records as verified.

Content marked as missing, unverified, or containing `NEEDS VERIFICATION` must remain clearly identified as not confirmed.

Administrators do not edit the underlying eligibility rules through the knowledge metadata interface.

---

# 💬 Generative AI Scheme Assistant

The citizen-facing Scheme Assistant answers questions using the existing scheme knowledge API.

## Features

* English and Tamil answer language selection
* Scheme selection
* Suggested questions
* Session-based conversation history
* Loading and error states
* Source URL display
* Verification status display
* Template fallback when a live model is unavailable

The assistant retrieves scheme information before optionally using a configured language model to phrase the answer.

## Eligibility boundary

The Scheme Assistant does **not** calculate eligibility.

When users ask whether they are eligible, it directs them to the existing eligibility checker and wallet.

It does not independently call the ML prediction or recommendation APIs to produce an eligibility result.

## LLM configuration

The backend supports an OpenAI-compatible Chat Completions provider.

A live model requires backend configuration for the provider URL and API key. The model name and timeout can also be configured.

If the LLM is not configured or the provider fails, the API returns a template response and indicates that a live model was not used.

API keys remain on the backend and should not be placed in frontend code or committed to the repository.

## Knowledge and source limitations

* Answers are limited to retrieved knowledge and supported wallet-completeness information.
* Unverified scheme information is labeled as not confirmed.
* The assistant should not invent scheme documents, portals, deadlines, or benefits.
* Chat history is session-only in the browser.
* The assistant does not submit applications.

---

# 🤖 AI Scheme Agent — Planned

The AI Scheme Agent is a planned workflow that will coordinate existing APIs to help citizens complete scheme discovery and application-readiness tasks.

The intended workflow is:

```text
Citizen Request
      ↓
Read Confirmed Wallet Profile
      ↓
Retrieve Scheme Knowledge
      ↓
Search Scheme Catalog
      ↓
Call Existing Recommendation API
      ↓
Check Application Readiness
      ↓
Explain Results and Next Steps
```

The agent is not an independent eligibility authority.

When implemented, it must use the existing Hybrid Rule + ML checker for eligibility results and must not invent missing profile information or scheme requirements.

**The AI Scheme Agent workflow has not yet been implemented.**

---

# 🛡️ Administrator Portal

The project includes a separate administrator portal protected by JWT authentication and role checks.

The admin portal supports administration and monitoring of existing application data.

## Admin modules

The existing administrator portal includes modules for:

* Overview
* Users
* Document Verification
* Applications
* Scheme Management
* Eligibility Monitoring
* Scheme Evaluation
* System Evaluation
* Research Dashboard
* Notifications
* Voice Assistant
* My Documents
* Settings

The exact available actions depend on the existing admin API and authorization rules.

## Administrator responsibilities

Administrators can review and monitor supported records, including documents and application information.

Document review is separate from eligibility evaluation.

Changing a document review status does not change the Hybrid Rule + ML result.

Scheme knowledge administration is limited to source and verification metadata. It does not provide an interface for editing the eligibility rules.

Citizens cannot access administrator-only routes or APIs.

---

# 📊 System Evaluation

The project includes a research evaluation dashboard.

It provides supported evaluation information such as:

### ML Performance

* Model metrics
* Dataset information
* Evaluation results

### Hybrid Agreement

* Rule Engine versus ML agreement

### Dataset Summary

* Dataset size
* Eligible samples
* Non-eligible samples

### API Performance

* Request count
* Error count
* Minimum response time
* Average response time
* Maximum response time

### System Health

Provides an overview of the running API/system status.

API performance counters are maintained in memory and reset when the application restarts.

The System Evaluation and Research Dashboard are administrator-facing research modules, not citizen eligibility tools.

---

# 🌐 Multilingual Support

The portal supports:

* English
* Tamil

The interface uses the existing internationalization system so that supported UI text can be displayed in both languages.

---

# 🔐 Authentication & Security

The application provides authenticated access using:

* Email/password authentication
* Google Sign-In
* JWT-based authorization
* Protected routes
* Role-based admin access
* User-owned data access

User-specific APIs use the authenticated user's identity to ensure that one user cannot access another user's wallet, history, documents, or notifications.

Sensitive information such as passwords and tokens is not displayed in the application.

The project is an academic prototype. Production deployment would require additional security and infrastructure review.

---

# 🏗️ System Architecture

The project follows a layered web application architecture.

```text
┌────────────────────────────────────────────┐
│                  Web Portal                │
│              React + TypeScript            │
│                                            │
│       Citizen Portal  |  Admin Portal      │
└───────────────────────┬────────────────────┘
                        │
                        │ REST API
                        ↓
┌────────────────────────────────────────────┐
│                 FastAPI Backend            │
│                                            │
│ Authentication and Authorization           │
│ Wallet and Profile                         │
│ Scheme Catalog and Knowledge               │
│ Eligibility and Recommendation             │
│ Document Scanner                           │
│ Scheme Assistant                           │
│ History and Applications                   │
│ Readiness and Insights                     │
│ Notifications and Evaluation               │
│ Administrator APIs                        │
└───────────────────────┬────────────────────┘
                        │
                        ↓
┌────────────────────────────────────────────┐
│                 Intelligence Layer         │
│                                            │
│ Documented Rule Engine                     │
│ Decision Tree ML Model                     │
│ Hybrid Result and Explanation              │
│ Local OCR                                  │
│ Retrieval-backed Scheme Assistant         │
└───────────────────────┬────────────────────┘
                        │
                        ↓
┌────────────────────────────────────────────┐
│                 PostgreSQL                 │
│                                            │
│ Users and Wallets                          │
│ Eligibility History                        │
│ Documents and Applications                 │
│ Notifications                              │
│ Scanner Records                            │
│ Scheme Knowledge Metadata                  │
└────────────────────────────────────────────┘
```

The CSV scheme catalog and saved ML model are also used by the application.

---

# 🖥️ Presentation Layer

The frontend is responsible for:

* User interaction
* Authentication screens
* Citizen dashboard
* Administrator dashboard
* Profile management
* Scheme search
* Eligibility checking
* Results visualization
* Scheme comparison
* PDF report interface
* History
* Notifications
* Document scanning and review
* Scheme Assistant interface
* Application tracking
* Administrator monitoring and review

### Technologies

* React
* TypeScript
* Vite
* Tailwind CSS

---

# ⚙️ Application Layer

The FastAPI backend handles:

* Authentication
* Authorization
* API requests
* Wallet management
* Eligibility evaluation
* Rule Engine execution
* ML prediction
* Recommendation ranking
* History management
* Document upload and scanning
* Scheme knowledge retrieval
* Scheme Assistant requests
* Application tracking
* Notifications
* System evaluation
* Administrator APIs

The backend acts as the bridge between the web portal, eligibility logic, ML model, OCR processing, knowledge services, and database.

---

# 🧠 Intelligence Layer

The eligibility workflow is:

```text
                  Citizen Profile
                        │
              ┌─────────┴─────────┐
              ↓                   ↓
       Documented Rules      Decision Tree
              │                   │
              ↓                   ↓
        Rule Result          ML Prediction
              │                   │
              └─────────┬─────────┘
                        ↓
                  Hybrid Result
                        ↓
                    Explanation
                        ↓
                 Recommendation
```

The Decision Tree provides an interpretable ML prediction while the documented rule engine provides explicit eligibility reasoning.

The document scanner and Scheme Assistant support the citizen workflow but do not replace the eligibility engine.

---

# 🗄️ Data Layer

PostgreSQL is used for persistent application data.

The database supports information required for:

* Users
* Authentication-related application records
* Citizen wallets
* Eligibility history
* Documents
* Document scan records
* Applications
* Notifications
* Scheme knowledge metadata
* Other application entities

The scheme catalog remains in the existing CSV source. The saved Decision Tree model is stored separately.

Relationships between entities are maintained using relational database constraints.

---

# 🔄 Complete System Flow

The Login Page is the first and only public entry page. The main website, including the dashboard, navbar, and sidebar, is not shown until authentication succeeds.

```text
┌──────────────────────┐
│      LOGIN PAGE      │
│ Email / Password     │
│ Google Sign-In       │
└──────────┬───────────┘
           │
           │ Successful Login
           ▼
┌──────────────────────────────────┐
│        ROLE-BASED PORTAL         │
│                                  │
│ Citizen → Citizen Dashboard      │
│ Admin   → Admin Dashboard        │
└──────────────────────────────────┘
```

Unauthenticated visitors are redirected to the Login Page. After successful authentication, the existing session is used to open the matching role-based portal.

## Citizen eligibility flow

```text
Citizen Dashboard
       ↓
Complete Socio-Economic Wallet
       ↓
Check Eligibility
       ↓
FastAPI
       ↓
Documented Rule Engine + Decision Tree
       ↓
Hybrid Evaluation
       ↓
Recommendation and Explanation
       ↓
Results
       │
       ├──→ Why This Result?
       ├──→ Compare Schemes
       ├──→ PDF Report
       ├──→ History
       ├──→ Documents
       ├──→ Readiness
       ├──→ Insights
       └──→ Notifications
```

## Document scanner flow

```text
Open AI Document Scanner
       ↓
Upload or Select Education Certificate
       ↓
Local OCR Processing
       ↓
Review Extracted Fields
       ↓
Edit and Select Fields
       ↓
Confirm Selected Values
       ↓
Existing Wallet Validation
       ↓
Wallet Updated
```

The wallet is updated only after the citizen confirms selected values. OCR does not verify documents or change eligibility.

## Scheme Assistant flow

```text
Citizen Question
       ↓
Retrieve Scheme Knowledge
       ↓
Check Source and Verification Metadata
       ↓
Optional LLM Response Generation
       ↓
Display Answer and Source Information
```

The Scheme Assistant provides information and directs eligibility questions to the existing eligibility checker.

---

# 📚 Main Portal Modules

| Module                | Purpose                                                     |
| --------------------- | ----------------------------------------------------------- |
| Dashboard             | Central citizen overview                                    |
| Wallet                | Store socio-economic profile                                |
| Check Eligibility     | Run eligibility evaluation                                  |
| Results               | Display recommendations and explanations                    |
| Schemes               | Browse and search scheme information                        |
| Compare               | Compare schemes                                             |
| Eligibility Simulator | Try a temporary profile                                     |
| Applications          | Track application preparation                               |
| Documents             | Manage uploaded documents                                   |
| AI Document Scanner   | Extract and review supported document fields                |
| Readiness             | Check profile and document readiness                        |
| Insights              | Display profile and recommendation insights                 |
| History               | View previous checks                                        |
| Notifications         | Display in-portal reminders                                 |
| Scheme Assistant      | Ask source-backed scheme questions                          |
| Evaluation            | View supported citizen-facing scheme evaluation information |
| Admin Portal          | Review and monitor application data                         |
| System Evaluation     | Administrator research and system metrics                   |
| Research Dashboard    | Administrator research information                          |
| Settings              | Manage account preferences                                  |

---

# 🧪 Testing & Validation

The project includes backend and frontend testing.

Testing covers areas such as:

* API functionality
* Authentication
* Authorization
* Wallet ownership
* Eligibility prediction
* Rule Engine
* ML prediction
* Hybrid recommendations
* History
* Notifications
* Document scanning and field parsing
* Scheme knowledge retrieval
* Scheme Assistant behavior
* Frontend components
* Protected routes
* Admin access and behavior

Tests should be run against the relevant project environment and database configuration.

---

# 📊 Machine Learning Dataset

The project uses a prepared citizen–scheme dataset for model development and evaluation.

The dataset contains:

* Citizen profiles
* Scheme information
* Eligibility-related attributes
* Eligibility labels

The ML pipeline includes:

```text
Raw Data
   ↓
Data Preparation
   ↓
Feature Processing
   ↓
Train/Test Split
   ↓
Decision Tree Training
   ↓
Model Evaluation
   ↓
Prediction
```

The dataset also supports evaluation of agreement between the documented rule engine and the ML model.

## Dataset and model files

* `dataset/raw/schemes.csv` contains 13 Tamil Nadu scheme rows.
* Six schemes are CORE for ML.
* Synthetic CORE citizen data and rule-derived labels are stored in the dataset files.
* The selected prototype model is the Decision Tree at `ml/models/baseline/decision_tree.joblib`.

---

# 🛠️ Technology Stack

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS

### Backend

* Python
* FastAPI
* Pydantic
* REST APIs

### Machine Learning

* Python
* Pandas
* NumPy
* Scikit-learn
* Decision Tree

### Database

* PostgreSQL

### Authentication

* JWT
* Google Sign-In

### Document Scanning

* Local OCR processing
* `pypdf`
* Tesseract
* Pillow
* `pypdfium2`

### Scheme Assistant

* Existing scheme knowledge API
* OpenAI-compatible Chat Completions provider
* Optional LLM configuration

### Development and Testing

* Git
* GitHub
* Pytest
* Frontend testing framework

---

# ⚙️ Local Setup

## Prerequisites

Install the required tools for the project:

* Python
* Node.js and npm
* PostgreSQL or the project's existing PostgreSQL container
* Git

For local OCR of photos or scanned PDFs, install Tesseract and configure it if it is not available on `PATH`.

## Environment configuration

1. Copy `backend/.env.example` to `backend/.env`.
2. Configure `DATABASE_URL` and `JWT_SECRET_KEY` with local development values.
3. Configure the optional Scheme Assistant LLM settings only if using a live model.
4. Do not commit `.env` files or API keys.

Use a separate test database through `TEST_DATABASE_URL` for database-backed automated tests.

## Backend

From the backend directory, activate the project's virtual environment, install the requirements, initialize the database, and start FastAPI using the repository's documented commands.

Example:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m app.db.init_db
python -m uvicorn app.main:app --reload --app-dir .
```

## Frontend

```powershell
cd frontend
npm install
npm run dev
```

The frontend development server and backend API URLs should match the project's current environment configuration.

## Optional Scheme Assistant configuration

The Scheme Assistant can use template responses when no live LLM provider is configured.

For live generation, configure the provider URL, API key, and optional model settings in the backend environment. Never expose the API key in frontend code.

---

# 📁 Project Structure

```text
scheme-eligibility-predictor/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── context/
│   │   ├── routes/
│   │   └── App.tsx
│   │
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   │
│   ├── tests/
│   └── requirements.txt
│
├── dataset/
│   ├── raw/
│   └── processed/
│
├── ml/
│   ├── models/
│   ├── preprocessing/
│   ├── training/
│   └── evaluation/
│
├── docs/
│   ├── final_system_flow.md
│   ├── phase43_results.md
│   └── ...
│
└── README.md
```

The exact folder structure may vary as the implementation evolves.

---

# 📌 Implementation Boundaries

The project is an academic research prototype.

* The Hybrid Rule + ML engine remains the only eligibility authority.
* The Decision Tree is not an official government decision-maker.
* The AI Document Scanner does not verify documents or approve eligibility.
* The Scheme Assistant provides information from the existing knowledge service.
* The AI Scheme Agent workflow is planned but not implemented.
* The application does not submit forms to government portals.
* The administrator portal does not override eligibility results.
* Scheme information should be checked against official sources before applying.

---

# 🔮 Future Enhancements

Potential future improvements include:

* AI Scheme Agent workflow using existing APIs
* Expanded document types and extraction fields
* Improved OCR and document understanding
* More comprehensive verified scheme information
* Additional official scheme data sources
* Mobile application
* Cloud deployment
* Additional accessibility improvements
* More sophisticated recommendation and evaluation methods

---

# ⚠️ Disclaimer

This project is an **academic research prototype**.

The eligibility results generated by the system are for informational and research purposes only.

The system does not:

* Represent the Government
* Guarantee scheme eligibility
* Guarantee benefit approval
* Guarantee receipt of benefits
* Replace official government verification
* Verify identity documents
* Submit applications on behalf of citizens

Users should always verify the final eligibility requirements through the respective official government scheme sources before applying.

---

# 👨‍💻 Developer

**PRAVEENKUMAR R**

---

# 📜 License

Academic Project — Developed for educational and research purposes.

---

## 🏛️ Project Summary

**State Government Sponsored Scheme Eligibility Predictor Engine Utilizing Unified Socio-Economic Data Wallets** provides a centralized platform for identifying potentially relevant government schemes using documented eligibility rules, Machine Learning, hybrid evaluation, and explainable recommendations.

The platform also supports document scanning with user confirmation, source-backed scheme information, a generative Scheme Assistant, and separate citizen and administrator portals.

**Goal:** Make government scheme discovery simpler, more transparent, explainable, and accessible to citizens.
