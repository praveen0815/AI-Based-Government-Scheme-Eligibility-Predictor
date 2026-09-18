# 🏛️ State Government Sponsored Scheme Eligibility Predictor Engine

A web-based **Government Scheme Eligibility Prediction System** that helps citizens identify government-sponsored welfare schemes they may be eligible for based on their socio-economic profile.

The system combines a **documented rule engine** with a **Machine Learning Decision Tree model** to provide transparent, explainable, and ranked scheme recommendations.

> **Academic Research Prototype** — This system is intended for academic and research purposes. Eligibility results are indicative and do not represent official government approval or guaranteed benefits.

---

# 🌟 What Makes This Project Unique

- 🤖 Hybrid **Rule Engine + Machine Learning** eligibility prediction
- 📋 Uses documented scheme conditions for transparent decisions
- 🎯 Personalized scheme recommendations
- 📊 ML performance and system evaluation
- 🔍 Explainable "Why this result?" recommendations
- 🧾 PDF eligibility reports
- 📚 Recommendation history
- ⚖️ Scheme comparison
- 📄 Document checklist
- 📈 Profile readiness and insights
- 🔔 Personalized notifications and reminders
- 🌐 English and Tamil language support
- 🎙️ Voice Assistant
- 🔐 Secure authentication and user-owned data
- 🛡️ Separate Admin Console for platform monitoring and management

---

# 🎯 Problem Statement

Government welfare schemes often have different eligibility requirements related to:

- Age
- Income
- Caste/category
- Occupation
- Education
- Land ownership
- Employment status
- Family characteristics
- Location
- Other socio-economic conditions

Citizens may find it difficult to determine which schemes are relevant to them.

This project provides a centralized platform where a citizen can enter their socio-economic information and receive a ranked list of potentially eligible government schemes.

---

# 🚀 Core Features

## 👤 Citizen Profile / Socio-Economic Wallet

Users can maintain their socio-economic information through a centralized profile.

The wallet can contain information such as:

- Personal details
- Age
- Income
- Occupation
- Education
- Category
- Family information
- Location
- Other eligibility-related attributes

The profile completeness system helps users identify missing information.

---

# 🤖 Hybrid Eligibility Prediction

The core of the system combines two approaches:

### 1. 📋 Rule Engine

The documented scheme conditions are evaluated against the user's profile.

For example:

```text
User Income ≤ Scheme Income Limit
        ↓
Age satisfies requirement
        ↓
Required category satisfied
        ↓
Required occupation satisfied
        ↓
Rule Engine Result
````

The rule engine provides transparent reasons for eligibility.

---

### 2. 🌳 Machine Learning

A **Decision Tree classifier** is used to learn eligibility patterns from the prepared citizen–scheme dataset.

The model predicts whether a citizen is likely to satisfy the eligibility pattern for a scheme.

---

### 3. 🔀 Hybrid Decision

The system combines:

```text
Citizen Profile
       ↓
Documented Rule Engine
       ↓
Machine Learning Model
       ↓
Rule + ML Agreement
       ↓
Ranking
       ↓
Recommended Schemes
```

When the rule engine and ML model disagree, the **documented rule remains the reference for explanation**.

---

# 🔍 Explainable Recommendations

Every recommendation provides a **"Why this result?"** section.

It explains:

* Which documented conditions were checked
* Why the rule engine considered the profile eligible/not eligible
* What the Decision Tree predicted
* Whether Rule and ML agree
* What the ML probability represents
* Which profile fields are incomplete

This improves transparency and makes the ML-based recommendation easier to understand.

---

# 📊 Scheme Recommendation & Ranking

The system evaluates available schemes and produces personalized recommendations.

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

---

# ⚖️ Scheme Comparison

Users can select schemes and compare them side-by-side.

Comparison can help users understand:

* Scheme name
* Department
* Category
* Eligibility requirements
* Benefits
* Important conditions
* Official source information

---

# 📜 Recommendation History

Previous eligibility checks are stored for the authenticated user.

Users can:

* View previous checks
* Review previous recommendations
* Open previous results
* Track their recommendation activity

Each user's history is isolated using their authenticated account.

---

# 📄 PDF Report Generation

Users can generate a PDF report containing their eligibility results.

The report can be used to:

* Review recommendations
* Save results
* Share results
* Maintain a personal record

> The generated report is informational and does not constitute official government approval.

---

# 📁 Document Checklist

The system provides document-related guidance associated with schemes.

Users can identify documents that may be required for a scheme and track their preparation status.

This helps users understand what they may need before applying through the appropriate official channel.

---

# 📈 Profile Readiness & Insights

The system provides additional guidance based on existing profile information.

### Profile Readiness

Shows whether the user's profile contains the information required for meaningful eligibility evaluation.

### Insights

Provides summarized information about:

* Profile completeness
* Eligibility results
* Recommendation patterns
* Areas requiring attention

The system does **not** instruct users to manipulate their personal information to obtain eligibility.

---

# 🔔 Notifications & Reminders

Authenticated users receive lightweight in-portal reminders derived from existing system information.

Notifications can relate to:

* Profile completeness
* Missing documents
* Eligibility checks
* Readiness-related information

Users can:

* View notifications
* Mark notifications as read
* Delete notifications

No email, SMS, WhatsApp, push notification, or external messaging system is used.

---

# 🎙️ Voice Assistant

The portal includes a voice assistant designed to help users interact with the platform.

Supported capabilities include:

* Voice-based navigation
* Eligibility-related queries
* Scheme-related questions
* Profile completeness queries
* Supported profile information extraction
* Typed-input fallback
* English and Tamil interaction

The voice assistant works as an interaction layer and does not independently calculate eligibility.

Eligibility decisions continue to use the existing **Hybrid Rule + ML engine**.

---

# 🛡️ Admin Portal

The project includes a separate **Admin Console** for authorized administrators to monitor and manage the platform.

The Admin Console is visually and functionally separated from the citizen portal.

## 📊 Admin Overview

Provides platform-level information such as:

* Total users
* Total applications
* Pending documents
* Total schemes
* Eligibility distribution
* Recent activity

---

## 👥 User Management

Administrators can:

* Search users
* View user information
* View wallet completeness
* View associated documents
* View associated applications

User information remains access-controlled through server-side authorization.

---

## 📄 Document Verification

Administrators can:

* View pending documents
* Verify documents
* Reject documents
* Track document review status

Document review only updates the document review status and does not directly determine scheme eligibility.

---

## 📋 Application Management

Administrators can:

* View applications across users
* Review application statuses
* Monitor application progress

---

## 🏛️ Scheme Management

Administrators can:

* View the scheme catalog
* Review available scheme information

Eligibility logic remains controlled by the existing eligibility engine.

---

## 📈 Eligibility Monitoring

Administrators can monitor eligibility results using the existing recommendation system.

The admin monitoring layer:

* Uses existing recommendation logic
* Does not modify eligibility predictions
* Does not create separate eligibility rules
* Does not alter citizen recommendation history

---

## 📊 Scheme Evaluation

Provides analytical information about scheme-level results.

This analytical evaluation is kept separate from the official/documented eligibility determination.

---

## 🧪 System Evaluation

Provides system-level research metrics such as:

* Request count
* Error count
* Minimum response time
* Average response time
* Maximum response time
* System health

---

## 🔬 Research Dashboard

Provides research-oriented evaluation information including:

* ML metrics
* Dataset information
* Rule vs ML agreement
* Dataset summary
* System evaluation information

---

## 🔔 Admin Notifications

Provides admin-specific platform notifications and relevant administrative information.

---

## 🎙️ Admin Voice Assistant

The Admin Console includes a dedicated voice-assistant area for supported administrative commands and navigation.

Administrative actions remain protected by the existing server-side authorization system.

---

## 📁 My Documents

Administrators can access their own documents separately from citizen documents.

---

## ⚙️ Settings

Provides available administrator account and application settings.

---

## 🔐 Admin Security

Admin access uses the existing authentication system with server-side role authorization.

Security controls include:

* JWT-based authentication
* Server-side admin role verification
* Protected admin routes
* Unauthenticated requests → `401`
* Authenticated non-admin requests → `403`
* User and admin access separation
* Owner-scoped user data
* Sensitive information is not displayed in the Admin Console

The project is an academic prototype and does not currently implement full production infrastructure such as a dedicated WAF/firewall or field-level encryption for every database field.

---

## Admin Navigation

```text
Admin Console
│
├── Overview
│   └── Admin Overview
│
├── Management
│   ├── Users
│   ├── Document Verification
│   ├── Applications
│   └── Scheme Management
│
├── Analytics
│   ├── Eligibility Monitoring
│   ├── Scheme Evaluation
│   ├── System Evaluation
│   └── Research Dashboard
│
├── Tools
│   ├── Notifications
│   └── Voice Assistant
│
└── Account
    ├── My Documents
    └── Settings
```

---

# 📊 System Evaluation

The project includes a dedicated research evaluation dashboard.

### ML Performance

* Model metrics
* Dataset information
* Evaluation results

### Hybrid Agreement

* Rule Engine vs ML agreement

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

> API performance counters are maintained in memory and reset when the application restarts.

---

# 🌐 Multilingual Support

The portal supports:

* 🇬🇧 English
* 🇮🇳 Tamil

The interface uses the existing internationalization system so that UI text can be displayed in both languages.

---

# 🔐 Authentication & Security

The application provides authenticated access using:

* Email/password authentication
* Google Sign-In
* JWT-based authorization
* Protected routes
* Role-based authorization
* User-owned data access
* Owner-scoped APIs

User-specific APIs use the authenticated user's identity to ensure that one user cannot access another user's wallet, history, or notifications.

Sensitive information such as:

* Passwords
* JWT tokens
* Google access tokens

is not displayed in the application.

Passwords are handled using secure password hashing rather than storing plain-text passwords.

> Database field-level encryption and dedicated firewall/WAF infrastructure are not currently implemented as part of this academic prototype.

---

# 🏗️ System Architecture

The project follows a layered web application architecture.

```text
┌──────────────────────────────────────────┐
│              Web Portal                  │
│        React + TypeScript + UI           │
└────────────────────┬─────────────────────┘
                     │
                     │ REST API
                     ↓
┌──────────────────────────────────────────┐
│              FastAPI Backend             │
│                                          │
│  Authentication                          │
│  Authorization                           │
│  Wallet                                  │
│  Scheme Catalog                           │
│  Eligibility                              │
│  Rule Engine                              │
│  ML Prediction                            │
│  Recommendation                           │
│  History                                  │
│  Comparison                               │
│  Documents                                │
│  Readiness                                │
│  Insights                                 │
│  Notifications                            │
│  Applications                             │
│  Admin Console                            │
│  System Evaluation                        │
└────────────────────┬─────────────────────┘
                     │
                     ↓
┌──────────────────────────────────────────┐
│             PostgreSQL                   │
│                                          │
│  User Data                               │
│  Wallet Data                              │
│  Eligibility History                      │
│  Notifications                            │
│  Scheme Information                       │
│  Application Data                         │
│  Document Data                            │
│  Other Application Data                   │
└──────────────────────────────────────────┘
```

---

# 🖥️ Presentation Layer

The frontend is responsible for:

* User interaction
* Authentication screens
* Profile management
* Scheme search
* Eligibility checking
* Results visualization
* Scheme comparison
* PDF generation interface
* History
* Applications
* Notifications
* Voice Assistant
* Admin Console
* System evaluation

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
* Eligibility evaluation
* Rule Engine execution
* ML prediction
* Recommendation ranking
* History management
* Application management
* Document management
* Notifications
* Admin operations
* System evaluation

The backend acts as the bridge between the web portal, eligibility logic, ML model, and database.

---

# 🧠 Intelligence Layer

The intelligence layer consists of:

```text
                  Citizen Profile
                        │
              ┌─────────┴─────────┐
              ↓                   ↓
       Rule Engine          ML Model
              │                   │
              ↓                   ↓
       Rule Result          ML Prediction
              │                   │
              └─────────┬─────────┘
                        ↓
                  Hybrid Result
                        ↓
                    Ranking
                        ↓
                Recommendation
```

The **Decision Tree** provides an interpretable ML prediction while the documented rule engine provides explicit eligibility reasoning.

---

# 🗄️ Data Layer

PostgreSQL is used for persistent application data.

The database supports information required for:

* Users
* Authentication-related application records
* Citizen wallets
* Scheme information
* Eligibility history
* Notifications
* Applications
* Documents
* Other application entities

Relationships between entities are maintained using relational database constraints.

---

# 🔄 Complete System Flow

```text
User
 │
 ↓
Login / Google Sign-In
 │
 ↓
Authentication & Role Check
 │
 ├──────────────→ Admin Console
 │                     │
 │                     ├── Users
 │                     ├── Documents
 │                     ├── Applications
 │                     ├── Schemes
 │                     ├── Eligibility Monitoring
 │                     └── Evaluation
 │
 ↓
User Dashboard
 │
 ↓
Complete Socio-Economic Wallet
 │
 ↓
Check Eligibility
 │
 ↓
FastAPI
 │
 ├──────────────→ Documented Rule Engine
 │                         │
 │                         ↓
 │                    Rule Result
 │
 └──────────────→ Decision Tree ML
                           │
                           ↓
                      ML Prediction
 │
 ↓
Hybrid Evaluation
 │
 ↓
Recommendation Ranking
 │
 ↓
Results
 │
 ├──→ Why This Result?
 ├──→ Compare
 ├──→ PDF Report
 ├──→ History
 ├──→ Documents
 ├──→ Applications
 ├──→ Readiness
 ├──→ Insights
 └──→ Notifications
```

---

# 📚 Main Portal Modules

| Module               | Purpose                         |
| -------------------- | ------------------------------- |
| 🏠 Dashboard         | Central user overview           |
| 👤 Wallet            | Store socio-economic profile    |
| 🔍 Check             | Run eligibility evaluation      |
| 🎯 Results           | Display recommended schemes     |
| 📚 Schemes           | Browse and search schemes       |
| 🕒 History           | View previous checks            |
| ⚖️ Compare           | Compare schemes                 |
| 📄 Documents         | Track required documents        |
| 📋 Applications      | Track application records       |
| 📈 Readiness         | Check profile readiness         |
| 💡 Insights          | Display useful profile insights |
| 🔔 Notifications     | Display reminders               |
| 🎙️ Voice Assistant  | Voice-based interaction         |
| 📊 System Evaluation | Research/system metrics         |
| ⚙️ Settings          | Manage account                  |

---

# 🧪 Testing & Validation

The project includes backend and frontend testing.

Testing covers:

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
* Applications
* Admin authorization
* Frontend components
* Protected routes
* UI behavior

Automated tests are used to verify functionality after major implementation phases.

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

> The dataset is intended for academic/research use and does not represent a real government citizen database.

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

### Development

* Git
* GitHub
* Pytest
* Frontend testing framework

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
├── ml/
│   ├── dataset/
│   ├── models/
│   ├── preprocessing/
│   ├── training/
│   └── evaluation/
│
├── docs/
│   ├── phase26_results.md
│   ├── phase29_results.md
│   ├── phase30_results.md
│   └── ...
│
└── README.md
```

> Adjust the folder names above to match the final repository structure before committing the README.

---

# 🔮 Future Enhancements

Potential future improvements include:

* 🤖 Advanced ML models
* 📱 Mobile application
* ☁️ Cloud deployment
* 🔔 External notification services
* 🗣️ Advanced voice-based interaction
* 🌐 Integration with official government APIs
* 📊 Advanced analytics
* 🧠 More sophisticated recommendation algorithms
* 🔄 Automatic government scheme data updates
* 🛡️ Production-grade WAF/firewall infrastructure
* 🔐 Database encryption at rest and field-level encryption for sensitive data
* 🔑 Centralized production key management

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
* Submit applications on behalf of citizens

Users should always verify the final eligibility requirements through the respective **official government scheme sources** before applying.

---

# 👨‍💻 Developer

**PRAVEENKUMAR R**

Mechanical Engineering

