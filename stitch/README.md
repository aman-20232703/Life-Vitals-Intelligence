# LifeVitals Intelligence 🏥

**A Smart Health Analytics Web Application for Life Expectancy Prediction**

LifeVitals is a full-stack web application that helps users understand and predict life expectancy using real dataset values, interactive visualizations, and data-driven insights. It combines machine learning, health data analysis, and an intuitive user interface.

---

## Table of Contents

1. [Quick Overview](#quick-overview)
2. [Who Can Use This](#who-can-use-this)
3. [Main Features](#main-features)
4. [Technology Stack](#technology-stack)
5. [Project Structure](#project-structure)
6. [Backend Explained](#backend-explained)
7. [Frontend Explained](#frontend-explained)
8. [Database & Data](#database--data)
9. [API Endpoints Reference](#api-endpoints-reference)
10. [Setup & Installation Guide](#setup--installation-guide)
11. [How to Use the App](#how-to-use-the-app)
12. [Common Issues & Solutions](#common-issues--solutions)
13. [Security & Privacy](#security--privacy)
14. [Future Improvements](#future-improvements)

---

## Quick Overview

**What does LifeVitals do?**

Think of LifeVitals as a smart health dashboard that:

1. **Lets you sign up securely** - Create an account and store your health profile
2. **Predicts life expectancy** - Uses machine learning to estimate your expected life span
3. **Breaks down insights into 3 categories:**
   - **Economy**: Economic health indicators
   - **Health**: Medical and mortality indicators
   - **Social**: Education and social indicators
4. **Shows visual trends** - Interactive charts and world maps for data comparison
5. **Stores your history** - Track all your predictions over time

**In one sentence:** LifeVitals transforms raw health and economic data into personalized, understandable health insights.

---

## Who Can Use This

- 👨‍🎓 **Students & Researchers** - Learning about public health data analysis
- 🏥 **Healthcare Professionals** - Understanding population health trends
- 📊 **Data Analysts** - Exploring health metrics and patterns
- 👨‍💻 **Developers** - A complete reference project for FastAPI + Modern Frontend
- 🌍 **Policy Makers** - Data-driven decision making for health initiatives

---

## Main Features

✅ **User Management**

- Multi-step registration flow
- Secure login with JWT tokens
- Profile viewing and editing
- Password hashing and encryption

✅ **Prediction Engine**

- Life expectancy prediction with confidence scores
- Separate predictions for Economy, Health, and Social factors
- AI-powered insights and explanations
- Real-time predictions based on user input

✅ **Analytics & Insights**

- Interactive charts showing trends over time
- Overall health analytics dashboard
- Projection forecasts
- Customizable data filtering

✅ **Data Visualization**

- Interactive world map with country-by-country metrics
- Color-coded risk levels (low/medium/high)
- Year and metric filtering
- GeoJSON-based visualization

✅ **History Tracking**

- View all past predictions
- Track changes over time
- Compare results across different dates
- Download/export history

✅ **Feedback System**

- User feedback collection
- Rating and comment system
- Help the team improve the app

---

## Technology Stack

### Backend Technologies

| Component             | Technology        | Purpose                                                        |
| --------------------- | ----------------- | -------------------------------------------------------------- |
| **Framework**         | FastAPI 0.116.1   | Modern, fast Python web framework with auto-generated API docs |
| **Server**            | Uvicorn 0.35.0    | ASGI server to run FastAPI                                     |
| **Database ORM**      | SQLAlchemy 2.0.43 | Database abstraction for clean data models                     |
| **Database**          | SQLite            | Lightweight, file-based database (lifevitals.db)               |
| **Authentication**    | JWT + Python-Jose | Token-based secure authentication                              |
| **Password Security** | bcrypt + passlib  | Cryptographic password hashing                                 |
| **Data Processing**   | pandas            | Data loading, cleaning, and manipulation                       |
| **Machine Learning**  | scikit-learn      | RandomForestRegressor for predictions                          |
| **Serialization**     | joblib            | Model and data persistence                                     |
| **Data Validation**   | Pydantic 2.11.7   | Request/response validation                                    |

### Frontend Technologies

| Component        | Technology                      | Purpose                                   |
| ---------------- | ------------------------------- | ----------------------------------------- |
| **Markup**       | HTML5                           | Page structure and layout                 |
| **Styling**      | CSS3                            | Visual design and responsiveness          |
| **Scripting**    | Vanilla JavaScript              | Page interactivity without dependencies   |
| **Charts**       | Chart.js                        | Interactive data visualization and graphs |
| **Maps**         | Leaflet.js + GeoJSON            | Interactive world map with country data   |
| **Data Storage** | Local Storage / Session Storage | Browser-based data persistence            |

### Key Datasets & Models

- **Dataset**: Life Expectancy Data (Excel file - `backend/data/`)
- **ML Model**: Random Forest Regressor trained on health indicators
- **Model File**: Stored as `backend/model/model.pkl`

---

## Project Structure

```text
stitch/
├── backend/                          # Python backend (FastAPI)
│   ├── __init__.py
│   ├── main.py                       # FastAPI app initialization
│   ├── database.py                   # SQLAlchemy setup
│   ├── requirements.txt              # Python dependencies
│   │
│   ├── auth/                         # Authentication logic
│   │   ├── __init__.py
│   │   └── security.py               # JWT and password utilities
│   │
│   ├── data/                         # Data files
│   │   └── Life Expectancy Data.xlsx # Source dataset
│   │
│   ├── model/                        # ML models
│   │   ├── __init__.py
│   │   ├── train_model.py            # Model training script
│   │   └── model.pkl                 # Trained model (binary)
│   │
│   ├── models/                       # Database models (ORM)
│   │   ├── __init__.py
│   │   ├── user.py                   # User table schema
│   │   ├── prediction.py             # Prediction records table
│   │   └── feedback.py               # User feedback table
│   │
│   ├── routes/                       # API endpoints
│   │   ├── __init__.py
│   │   ├── auth.py                   # /signup, /login endpoints
│   │   ├── profile.py                # /profile endpoints
│   │   ├── predict.py                # /predict endpoints
│   │   ├── history.py                # /history endpoints
│   │   ├── analytics.py              # /analytics endpoints
│   │   ├── dashboard.py              # /dashboard endpoints
│   │   ├── map.py                    # /map-data endpoints
│   │   └── feedback.py               # /feedback endpoints
│   │
│   ├── schemas/                      # Request/Response validation
│   │   ├── __init__.py
│   │   ├── user.py                   # User schemas (signup, login)
│   │   ├── token.py                  # JWT token schemas
│   │   ├── prediction.py             # Prediction request/response
│   │   └── feedback.py               # Feedback schemas
│   │
│   └── services/                     # Business logic layer
│       ├── __init__.py
│       ├── data_service.py           # Dataset loading & filtering
│       ├── model_service.py          # Model prediction logic
│       ├── analysis.py               # Scoring calculations
│       ├── analytics_service.py      # Chart data generation
│       └── dashboard_service.py      # Dashboard metrics
│
├── frontend/                         # Web UI (HTML/CSS/JavaScript)
│   ├── index.html                    # Landing/home page
│   ├── signup.html                   # Registration page
│   ├── login.html                    # Login page
│   ├── dashboard.html                # Main dashboard (summary)
│   ├── predict.html                  # Prediction input/output
│   ├── analytics.html                # Charts & trends
│   ├── map.html                      # Interactive world map
│   ├── history.html                  # Past predictions
│   ├── profile.html                  # User profile settings
│   │
│   ├── style.css                     # Global styling
│   ├── map.css                       # Map-specific styles
│   │
│   ├── script.js                     # Main page interactions
│   ├── dashboard.js                  # Dashboard logic
│   ├── analytics.js                  # Analytics charts logic
│   ├── map.js                        # Map interactions
│   │
│   └── world.geojson                 # Country boundaries (map data)
│
├── lifevitals.db                     # SQLite database file (auto-created)
└── README.md                         # This file

```

---

## Backend Explained

### What is the Backend?

The backend is the "server" - the brain of the application that:

- Stores data securely in a database
- Validates user information
- Runs the prediction algorithm
- Processes analytics and data filtering
- Handles user authentication

### Backend Entry Point: `main.py`

The `main.py` file is where everything starts:

```python
- Creates the FastAPI application
- Sets up CORS (allows frontend to communicate)
- Loads all route handlers
- Initializes the database
- Loads the ML model
```

**Key Endpoints Included:**

- Auth routes (signup/login)
- Prediction routes
- Profile routes
- Analytics routes
- Dashboard routes
- Map routes
- History routes
- Feedback routes

### Backend Core Folders

#### 1. `auth/` Folder - Security

**File: `security.py`**

- Creates and validates JWT tokens (secure session keys)
- Hashes passwords using bcrypt (one-way encryption)
- Provides functions to check if a user is logged in
- Secures API endpoints that need authentication

**How it works:**

```
User enters password → bcrypt hashes it → stored in database
User logs in → password is hashed again and compared → JWT token created
Token is used for all future requests → verified before allowing access
```

#### 2. `models/` Folder - Database Tables

These files define the structure of data stored in the database:

**File: `user.py` - User Information**

- Stores: username, email, password (hashed), first name, last name, age, country, health indicators
- Each user gets a unique ID
- Password is never stored in plain text

**File: `prediction.py` - Prediction History**

- Stores: user ID, predicted life expectancy, confidence score, inputs used, timestamp
- Links to the user who made the prediction
- Tracks all predictions over time

**File: `feedback.py` - User Feedback**

- Stores: user ID, rating, comments, timestamp
- Helps developers understand user experience

#### 3. `schemas/` Folder - Data Validation

These files define what data should look like when sent to the API:

**File: `user.py`**

```
Signup expects: email, password, first_name, last_name
Login expects: email, password
```

**File: `prediction.py`**

```
Prediction input expects: health indicators, economy factors, social factors
Prediction output provides: predicted_value, confidence_score, explanation
```

**File: `token.py`**

- Defines JWT token structure

#### 4. `routes/` Folder - API Endpoints

Each file handles specific features:

**`auth.py` - User Authentication**

- `POST /signup` - Create new user account
- `POST /login` - Login and get JWT token

**`profile.py` - User Profile**

- `GET /profile` - Retrieve user information
- `PUT /profile` - Update user information

**`predict.py` - Predictions**

- `POST /predict` - Main life expectancy prediction
- `POST /predict-life` - Detailed life prediction
- `POST /predict-economy` - Economy score
- `POST /predict-health` - Health score
- `POST /predict-social` - Social score
- `POST /save_prediction` - Save prediction to history

**`history.py` - Prediction History**

- `GET /history` - Get all user's past predictions

**`analytics.py` - Data Analysis**

- `GET /analytics/overall` - Overall statistics
- `GET /analytics/projection` - Future projections

**`dashboard.py` - Dashboard Summary**

- `GET /dashboard/summary` - Quick statistics
- `GET /dashboard/insights` - Key insights

**`map.py` - World Map Data**

- `GET /map-data` - Country metrics for map
- `GET /map-years` - Available years in dataset

**`feedback.py` - User Feedback**

- `POST /feedback` - Submit feedback and ratings

#### 5. `services/` Folder - Business Logic

The "workers" that do the actual processing:

**`data_service.py` - Data Management**

- Loads the Excel dataset
- Cleans and standardizes column names
- Handles missing values
- Filters data by country and year
- Caches data for performance

**`model_service.py` - Machine Learning**

- Loads the trained ML model
- Makes predictions using the model
- If model doesn't exist, trains it from dataset
- Returns confidence scores

**`analysis.py` - Scoring Logic**

- Calculates Economy Score (based on GDP, economic indicators)
- Calculates Health Score (based on disease rates, mortality)
- Calculates Social Score (based on education, literacy)
- Each score is normalized 0-100

**`analytics_service.py` - Chart Data**

- Prepares data for charts
- Calculates trends over time
- Groups data by categories

**`dashboard_service.py` - Dashboard Metrics**

- Prepares summary statistics
- Calculates key insights
- Formats data for quick display

#### 6. `data/` Folder - Datasets

**`Life Expectancy Data.xlsx`**

- Real-world health dataset
- Contains countries, years, and health indicators
- Used to train the ML model
- Used to provide context in predictions

#### 7. `model/` Folder - Machine Learning

**`train_model.py`**

- Script that trains the Random Forest model
- Reads from the dataset
- Creates model.pkl file
- Can be run periodically to retrain

**`model.pkl`**

- Binary file containing trained machine learning model
- Loaded when backend starts
- Used to make all predictions

### How Backend Processes a Prediction Request

```
1. Frontend sends prediction request (e.g., age, health indicators)
2. Routes/predict.py receives the request
3. Models/schemas validate the input data
4. Services/model_service.py loads the ML model
5. Model makes prediction with confidence score
6. Services/analysis.py calculates economy/health/social scores
7. Routes/predict.py formats response
8. Response sent back to frontend with all scores
9. Routes/predict.py optionally saves to database
10. Frontend displays results to user
```

---

## Frontend Explained

### What is the Frontend?

The frontend is what users see and interact with:

- Web pages (HTML)
- Visual design (CSS)
- Interactive buttons and forms (JavaScript)
- Charts and maps
- All runs in the web browser

### Frontend File Structure

#### Pages (HTML Files)

**`index.html` - Home/Landing Page**

- First page users see
- Overview of what LifeVitals does
- Links to signup/login
- Navigation menu

**`signup.html` - Registration Page**

- Form for new user registration
- Fields: email, password, first name, last name, age, country
- Validation before submission
- Creates new user account via `/signup` API

**`login.html` - Login Page**

- Form for existing users
- Fields: email, password
- Validates credentials via `/login` API
- Stores JWT token in browser
- Redirects to dashboard on success

**`dashboard.html` - Main Dashboard**

- Shows summary of user's health profile
- Quick statistics cards (scores, avg life expectancy)
- Recent predictions
- Links to other pages
- Personalized greeting

**`predict.html` - Prediction Page**

- Large form for prediction inputs
- Fields: health indicators, economic factors, age, gender, etc.
- Submit button triggers `/predict` API call
- Displays results: predicted life expectancy, confidence, scores
- Shows explanation of results
- Option to save prediction to history

**`analytics.html` - Charts & Analysis**

- Interactive charts showing trends
- Charts for different time periods
- Comparison analytics
- Insights and statistics
- Uses Chart.js library for visualization

**`map.html` - Interactive World Map**

- Shows world map with countries colored by health metrics
- Dropdown to select metric (life expectancy, education, etc.)
- Dropdown to select year (filtered by dataset availability)
- Color legend (green=good, yellow=medium, red=low)
- Click countries for detailed info
- Uses Leaflet.js + world.geojson

**`history.html` - Prediction History**

- Table showing all user's past predictions
- Columns: date, predicted value, confidence, scores
- Sort by date or score
- Delete option for individual predictions
- Download/export option (optional)

**`profile.html` - User Profile Settings**

- View current user information
- Edit form for updating profile
- Change: name, age, country, health preferences
- Save changes via `/profile` PUT endpoint
- Option to change password

#### Styling Files

**`style.css` - Main Styles**

- Colors and fonts for entire app
- Button styles
- Form styling
- Responsive design for mobile/tablet/desktop
- Navigation bar styling
- Card components

**`map.css` - Map-Specific Styles**

- Leaflet map styling
- Color legend styles
- Map controls styling
- Responsive map container

#### JavaScript Files (Interactive Logic)

**`script.js` - Main Application Logic**

- Handles signup/login form submissions
- Manages JWT token storage (browser's localStorage)
- API base URL configuration (connects to backend)
- User session management
- Navigation between pages
- Toast notifications for user feedback
- Form validation before sending to backend

**`dashboard.js` - Dashboard Page Logic**

- Fetches `/dashboard/summary` API data
- Displays user's statistics
- Updates cards with real data
- Handles refresh/reload
- Shows loading states

**`analytics.js` - Charts & Graphs**

- Uses Chart.js library to create interactive charts
- Fetches data from `/analytics/overall` and `/analytics/projection` endpoints
- Creates line charts, bar charts, pie charts
- Handles filtering by date range
- Responsive chart sizing

**`map.js` - Map Interactions**

- Loads Leaflet.js library
- Loads world.geojson (country boundaries)
- Fetches `/map-years` to get available years
- Fetches `/map-data` to get metric values by country
- Colors countries based on values (gradient: red → yellow → green)
- Handles year/metric dropdown changes
- Click handler to show country details popup
- Zoom and pan controls

#### Data Files

**`world.geojson` - Country Boundaries**

- GeoJSON format file
- Contains coordinates for all country boundaries
- Used by Leaflet.js to draw countries on map
- Each country has properties (name, ISO code, etc.)

### How Frontend Works Step-by-Step

```
1. User opens http://127.0.0.1:5500/index.html in browser
2. index.html loads style.css and script.js
3. script.js checks if JWT token exists in localStorage
4. If no token → show login page
5. If token exists → show dashboard
6. User fills form and clicks submit
7. script.js validates form data
8. JavaScript sends request to backend API (e.g., POST /predict)
9. Backend processes and returns response
10. JavaScript handles response and updates HTML
11. Page shows results to user
12. Process repeats for other interactions
```

### Frontend-Backend Communication

**Example: Making a Prediction**

```
Frontend (JavaScript)                Backend (Python)
     ↓                                    ↑
     → POST /predict                     │
     → { age: 30, health_score: 80 }    ← Receives request
     →                                   → Validates input
                                         → Loads ML model
                                         → Makes prediction
                                         → Returns response
     ← Receives response                 ↑
     ← { prediction: 75, confidence: 0.92 }
     → Updates HTML with results
     → Shows results to user
```

---

## Database & Data

### SQLite Database: `lifevitals.db`

**What is it?**

- A single file that stores all data
- Created automatically when backend starts
- Simple, no server needed
- Good for development and testing

**Tables in the Database:**

| Table Name   | Purpose                | Contains                                        |
| ------------ | ---------------------- | ----------------------------------------------- |
| `user`       | Stores user accounts   | Email, password hash, name, age, country, etc.  |
| `prediction` | Stores all predictions | User ID, inputs, results, timestamp, confidence |
| `feedback`   | Stores user feedback   | User ID, rating, comments, date                 |

**How Data Flows:**

```
User fills signup form
         ↓
script.js sends to /signup API
         ↓
backend/routes/auth.py receives
         ↓
Validates using schemas/user.py
         ↓
Creates user model (models/user.py)
         ↓
Saves to SQLite database (lifevitals.db)
         ↓
Returns success to frontend
         ↓
User now exists in database
```

### Dataset: Life Expectancy Data

**Location:** `backend/data/Life Expectancy Data.xlsx`

**What it contains:**

- Countries and years (e.g., India 2010, USA 2015)
- Health indicators (life expectancy, mortality rates, disease prevalence)
- Economic indicators (GDP, poverty rate)
- Social indicators (education, literacy, urbanization)

**How it's used:**

1. Loaded by `data_service.py` on backend startup
2. Cleaned and standardized (column names, missing values)
3. Used to train ML model (`train_model.py`)
4. Provides context for predictions (filters by country)
5. Used to generate map data
6. Used for analytics and comparisons

**Data Processing:**

```
Load Excel file
     ↓
Clean column names (remove spaces, special chars)
     ↓
Handle missing values (fill with median/mean)
     ↓
Create pandas DataFrame
     ↓
Filter by country/year as needed
     ↓
Use for predictions or analytics
```

---

## API Endpoints Reference

### Authentication Endpoints

**`POST /signup` - Register New User**

```
Request:
{
  "email": "user@example.com",
  "password": "secure123",
  "first_name": "John",
  "last_name": "Doe",
  "age": 30,
  "country": "USA"
}

Response:
{
  "id": 1,
  "email": "user@example.com",
  "first_name": "John",
  "message": "User created successfully"
}
```

**`POST /login` - Login User**

```
Request:
{
  "email": "user@example.com",
  "password": "secure123"
}

Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John"
  }
}
```

### Profile Endpoints (Protected - Requires JWT Token)

**`GET /profile` - Get Current User Profile**

```
Headers: Authorization: Bearer <JWT_TOKEN>

Response:
{
  "id": 1,
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "age": 30,
  "country": "USA"
}
```

**`PUT /profile` - Update User Profile**

```
Headers: Authorization: Bearer <JWT_TOKEN>

Request:
{
  "first_name": "Jane",
  "age": 31,
  "country": "Canada"
}

Response:
{
  "message": "Profile updated successfully",
  "user": {...}
}
```

### Prediction Endpoints (Protected)

**`POST /predict` or `/predict-life` - Predict Life Expectancy**

```
Headers: Authorization: Bearer <JWT_TOKEN>

Request:
{
  "age": 30,
  "health_score": 75,
  "economic_score": 80,
  "social_score": 70,
  "country": "USA"
}

Response:
{
  "prediction": 78.5,
  "confidence": 0.92,
  "explanation": "Based on your profile...",
  "economy_score": 80,
  "health_score": 75,
  "social_score": 70
}
```

**`POST /predict-economy` - Get Economy Score**

```
Request: {economic factors}
Response: { economy_score: 85, details: "..." }
```

**`POST /predict-health` - Get Health Score**

```
Request: {health factors}
Response: { health_score: 75, details: "..." }
```

**`POST /predict-social` - Get Social Score**

```
Request: {social factors}
Response: { social_score: 70, details: "..." }
```

**`POST /save_prediction` - Save Prediction to History**

```
Headers: Authorization: Bearer <JWT_TOKEN>

Request:
{
  "prediction_value": 78.5,
  "confidence": 0.92,
  "inputs": {...}
}

Response:
{
  "id": 1,
  "saved": true,
  "timestamp": "2025-05-03T10:30:00"
}
```

### History Endpoints (Protected)

**`GET /history` - Get All User's Predictions**

```
Headers: Authorization: Bearer <JWT_TOKEN>

Response:
[
  {
    "id": 1,
    "prediction": 78.5,
    "confidence": 0.92,
    "timestamp": "2025-05-03T10:30:00",
    "inputs": {...}
  },
  {
    "id": 2,
    "prediction": 76.3,
    "confidence": 0.88,
    "timestamp": "2025-05-02T14:20:00",
    "inputs": {...}
  }
]
```

### Analytics Endpoints

**`GET /analytics/overall` - Get Overall Statistics**

```
Headers: Authorization: Bearer <JWT_TOKEN>

Response:
{
  "average_prediction": 77.2,
  "prediction_count": 5,
  "average_confidence": 0.89,
  "trends": [...]
}
```

**`GET /analytics/projection` - Get Future Projections**

```
Headers: Authorization: Bearer <JWT_TOKEN>

Response:
{
  "projected_values": [76, 77, 78, 79, 80],
  "years": [2025, 2026, 2027, 2028, 2029],
  "trend": "increasing"
}
```

### Dashboard Endpoints

**`GET /dashboard/summary` - Get Dashboard Summary**

```
Headers: Authorization: Bearer <JWT_TOKEN>

Response:
{
  "user_name": "John",
  "latest_prediction": 78.5,
  "total_predictions": 5,
  "average_score": 75,
  "quick_metrics": {...}
}
```

**`GET /dashboard/insights` - Get Key Insights**

```
Headers: Authorization: Bearer <JWT_TOKEN>

Response:
{
  "insights": [
    "Your health score is above average",
    "Consider improving your economic indicators"
  ]
}
```

### Map Endpoints

**`GET /map-years` - Get Available Years in Dataset**

```
Response:
{
  "years": [2010, 2011, 2012, ..., 2023],
  "default_year": 2023
}
```

**`GET /map-data` - Get Country Metrics for Map**

```
Query Parameters: ?metric=life_expectancy&year=2023

Response:
{
  "data": {
    "USA": 78.5,
    "Canada": 81.2,
    "Mexico": 75.3,
    ...
  },
  "metric": "life_expectancy",
  "year": 2023,
  "min": 45.2,
  "max": 84.3
}
```

### Feedback Endpoint

**`POST /feedback` - Submit Feedback**

```
Headers: Authorization: Bearer <JWT_TOKEN>

Request:
{
  "rating": 5,
  "comments": "Great app, very helpful!"
}

Response:
{
  "id": 1,
  "message": "Feedback saved successfully"
}
```

---

## Setup & Installation Guide

### Prerequisites

Before you start, make sure you have:

- **Python 3.10+** (Download from python.org)
- **pip** (comes with Python)
- A **modern web browser** (Chrome, Firefox, Safari, Edge)
- **Git** (optional, for version control)

### Step-by-Step Backend Setup

#### 1. Open Terminal/Command Prompt

On Windows: Press `Win + R`, type `cmd`, press Enter

#### 2. Navigate to Project Directory

```bash
cd "C:\Users\lenovo\Desktop\SEM - VI\Minor Projects\LifeVitals\stitch"
```

#### 3. Install Python Dependencies

```bash
pip install -r backend/requirements.txt
```

This will install all required packages:

- FastAPI
- SQLAlchemy
- pandas
- scikit-learn
- JWT libraries
- And more...

**What this does:**

```
- Reads requirements.txt file
- Downloads each package from PyPI (Python Package Index)
- Installs them in your Python environment
- Takes 1-3 minutes depending on internet speed
```

#### 4. Start the Backend Server

```bash
uvicorn backend.main:app --reload
```

**What this does:**

```
- Starts the FastAPI server
- Loads database and ML model
- Server runs on http://127.0.0.1:8000
- `--reload` automatically restarts when code changes
- Keep this terminal open while developing
```

**Expected output:**

```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [12345]
INFO:     Started server process [12346]
```

✅ **Backend is now running!**

### Step-by-Step Frontend Setup

#### 1. Open a New Terminal (Keep Backend Terminal Open!)

#### 2. Navigate to Frontend Directory

```bash
cd "C:\Users\lenovo\Desktop\SEM - VI\Minor Projects\LifeVitals\stitch\frontend"
```

#### 3. Start a Local Web Server

```bash
python -m http.server 5500
```

**What this does:**

```
- Starts a simple Python web server
- Serves HTML/CSS/JS files on port 5500
- Can be accessed at http://127.0.0.1:5500
- Keeps this terminal open while using the app
```

**Expected output:**

```
Serving HTTP on 127.0.0.1 port 5500 (http://127.0.0.1:5500/) ...
```

✅ **Frontend is now running!**

### 4. Open the App in Your Browser

1. Open your web browser (Chrome, Firefox, etc.)
2. Go to: `http://127.0.0.1:5500/index.html`
3. Click "Sign Up" or "Log In"

### Troubleshooting Setup

**Problem: "pip is not recognized"**

- Solution: Python might not be installed or not in PATH
- Reinstall Python and make sure to check "Add Python to PATH"

**Problem: "Port 8000 already in use"**

- Solution: Another app is using port 8000
- Use: `uvicorn backend.main:app --port 8001 --reload`

**Problem: "Module not found" error**

- Solution: Dependencies not installed
- Re-run: `pip install -r backend/requirements.txt`

**Problem: "Can't connect to backend"**

- Solution: Backend server not running
- Check backend terminal is still running and showing "Uvicorn running on..."

---

## How to Use the App

### For First-Time Users

**Step 1: Create an Account**

1. Open http://127.0.0.1:5500/index.html
2. Click "Sign Up"
3. Enter email, password, name, age, country
4. Click "Create Account"

**Step 2: Log In**

1. Click "Log In"
2. Enter your email and password
3. Click "Sign In"
4. You're now logged in! 🎉

**Step 3: Make a Prediction**

1. Go to "Predict" page
2. Fill in health indicators (age, health score, economic status, etc.)
3. Click "Predict Life Expectancy"
4. View results: predicted years, confidence, and three module scores

**Step 4: Explore Your Data**

1. **Dashboard**: Quick overview of your profile and latest predictions
2. **Analytics**: Charts showing your trends over time
3. **Map**: Interactive world map comparing countries
4. **History**: All your past predictions
5. **Profile**: View and edit your information

### Using the Map

1. Go to "Map" page
2. Select a metric from dropdown (Life Expectancy, Health Score, etc.)
3. Select a year (based on dataset availability)
4. See countries colored:
   - 🟩 Green = Good (high values)
   - 🟨 Yellow = Medium
   - 🟥 Red = Low (needs improvement)
5. Click on a country to see detailed value

### Using Analytics

1. Go to "Analytics" page
2. View three main charts:
   - **Trend Chart**: Your predictions over time
   - **Distribution**: How your scores compare
   - **Projection**: Predicted future trends
3. Hover over chart points to see exact values
4. Click legend items to hide/show data

---

## Common Issues & Solutions

### Issue: "Prediction shows error"

**Solution:**

- Make sure backend is running
- Check all input fields are filled
- Refresh page and try again

### Issue: "Map won't load"

**Solution:**

- Backend must be running
- Check browser console (F12) for errors
- Clear browser cache (Ctrl+Shift+Delete)
- Re-login if session expired

### Issue: "Can't log in even with correct credentials"

**Solution:**

- Clear browser local storage: Right-click → Inspect → Application → Local Storage → Clear
- Try signup again with same email
- Database might need reset

### Issue: "Slow first prediction"

**Solution:**

- First time: ML model loads and may train (takes 10-30 seconds)
- Subsequent predictions are faster
- Be patient and don't refresh

### Issue: "Charts not showing data"

**Solution:**

- Make sure you made at least one prediction
- Backend needs to be running
- Try refreshing page

---

## Security & Privacy

### Password Security ✅

- Passwords are **NEVER** stored in plain text
- Passwords are hashed using bcrypt (one-way encryption)
- Even developers can't see your password
- Each password has unique salt (random data)

### Authentication Security ✅

- JWT tokens are signed and verified
- Tokens expire after set time (default: configurable)
- Sensitive routes require valid token
- All communication can use HTTPS (in production)

### Data Privacy ✅

- Each user can only see their own data
- Predictions and history are private
- No data sharing without permission
- Database is local (not on internet)

### Production Deployment Notes

Before deploying to production:

1. **Set JWT_SECRET_KEY environment variable**

   ```bash
   set JWT_SECRET_KEY="your-very-secret-key-here"
   ```

2. **Use environment variables for sensitive data**
   - Database URL
   - API keys
   - Secret keys

3. **Use HTTPS instead of HTTP**

4. **Enable CORS only for trusted domains**

   ```python
   allow_origins=["https://yourdomain.com"]
   ```

5. **Use a production database (PostgreSQL, MySQL)**
   - SQLite is for development only

6. **Set up proper logging and monitoring**

---

## Future Improvements

### Planned Features 🚀

- [ ] **Docker Support**: Deploy with single command
- [ ] **User Roles**: Admin, Doctor, Regular User roles
- [ ] **Advanced Analytics**: More detailed data breakdowns
- [ ] **Export Reports**: Download predictions as PDF
- [ ] **Mobile App**: Native mobile versions
- [ ] **Real-time Alerts**: Notify users of health changes
- [ ] **Social Features**: Share achievements with friends
- [ ] **More Datasets**: Regional and specialized data
- [ ] **API Rate Limiting**: Prevent abuse
- [ ] **Audit Logs**: Track all user actions
- [ ] **Machine Learning Improvements**: Better prediction models
- [ ] **Multi-language Support**: Support for different languages

### How to Contribute

Want to help improve LifeVitals? Here's how:

1. **Find a bug**: Report it with details
2. **Suggest features**: Open an issue with your idea
3. **Fix bugs**: Submit pull requests
4. **Improve docs**: Help make guides clearer
5. **Add tests**: Increase code coverage

---

## Frequently Asked Questions (FAQ)

**Q: Is my data safe?**  
A: Yes! Your data is encrypted, passwords are hashed, and only you can access your predictions.

**Q: Can I use this offline?**  
A: Backend needs internet during startup to load. Once loaded, can work with local data.

**Q: What if I forget my password?**  
A: Currently, you need to reset database and create new account. Password reset feature coming soon.

**Q: How accurate are predictions?**  
A: Accuracy depends on input data quality. Confidence score shows prediction reliability (0-100%).

**Q: Can I export my data?**  
A: Currently as JSON through API. CSV export feature coming soon.

**Q: Is it mobile-friendly?**  
A: Partially - works on tablets, mobile version coming soon.

**Q: Where is my data stored?**  
A: Locally in `lifevitals.db` SQLite database file.

**Q: How do I clear my data?**  
A: Delete `lifevitals.db` file and restart backend.

---

## Support & Contact

- **Documentation**: See sections above
- **Issues**: Check "Common Issues & Solutions" section
- **Feedback**: Use the Feedback page in the app
- **Questions**: Review this README (most answers are here!)

---

## Project Information

- **Version**: 1.0.0
- **Created**: 2025
- **Last Updated**: May 3, 2026
- **Status**: Active Development

---

**Happy Analyzing! 📊📈**

For questions about specific files or features, review the relevant section above. This README is designed to be complete but accessible to beginners.

### Prerequisites

- Python 3.10+ recommended
- pip
- Any browser (Chrome/Edge/Firefox)

### Backend Run

1. Open terminal in project root.
2. Install dependencies:

```bash
pip install -r backend/requirements.txt
```

3. Start backend:

```bash
uvicorn backend.main:app --reload
```

4. Keep it running at `http://127.0.0.1:8000`

### Frontend Run

1. Open second terminal.
2. Start static server from frontend folder:

```bash
cd frontend
python -m http.server 5500
```

3. Open `http://127.0.0.1:5500/index.html`

## 12) How to Use the App (Non-Technical Flow)

1. Create account on Signup page.
2. Login.
3. Fill prediction inputs on Predict page.
4. Read result and confidence.
5. Check analytics charts and map visualizations.
6. Review saved history.
7. Update your profile when needed.

## 13) Common Issues and Quick Fixes

- Map year not visible:
  - Ensure backend is running.
  - Re-login if token expired.
  - Refresh map page.
- Login/session errors:
  - Clear browser local storage and login again.
- Slow first prediction:
  - First run may train/load model and dataset.

## 14) Security and Privacy Notes

- Passwords are stored as hashes, not plain text.
- JWT secures protected APIs.
- For production, set a strong `JWT_SECRET_KEY` environment variable.
- Do not commit sensitive production secrets.

## 15) Future Improvements (Optional)

- Docker setup for one-command run.
- Role-based access control.
- Better audit logs and monitoring.
- More datasets and regional drill-down.

---

If you are from a non-coding background, you can treat this project as:
"A health intelligence dashboard that takes profile + dataset inputs and explains expected life outcomes with visual, understandable outputs."
