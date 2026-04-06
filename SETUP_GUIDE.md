# Brightleaf Academy - Complete Setup Guide

## 📋 System Overview

This is a full-stack Student Management System with:
- **Frontend**: HTML, CSS, JavaScript (Single Page Application)
- **Backend**: Node.js + Express
- **Database**: MySQL
- **Features**: Student management, courses, batches, attendance, fees, results, certificates

## 🚀 Setup Instructions

### Prerequisites

1. **Node.js** (v14 or higher) - Download from [nodejs.org](https://nodejs.org)
2. **MySQL Server** (v5.7 or v8.0) - Download from [mysql.com](https://dev.mysql.com/downloads/mysql/)
3. **Web Browser** (Chrome, Firefox, or Edge)

### Step 1: Install MySQL Database

#### Option A: MySQL Community Server (Local Installation)

1. Download and install MySQL Community Server from [here](https://dev.mysql.com/downloads/mysql/)
2. During installation, set a root password (note it for later use)
3. Start MySQL server

#### Option B: MySQL Workbench (Easier for Windows)

1. Download and install MySQL Workbench from [here](https://dev.mysql.com/downloads/workbench/)
2. It includes MySQL Server installation
3. Set your root password during setup

### Step 2: Setup Database

1. **Open MySQL Command Line** or **MySQL Workbench**:
   - Command Line: Open cmd/powershell and run `mysql -u root -p`
   - Workbench: Open the app and connect to localhost

2. **Create database using the SQL file**:

   ```bash
   # In MySQL command prompt:
   SOURCE E:\work\website\database.sql;
   ```

   Or in MySQL Workbench:
   - File → Open SQL Script → Select `database.sql`
   - Click the lightning bolt icon to execute

3. **Verify database created**:
   ```sql
   SHOW DATABASES;
   USE brightleaf_academy;
   SHOW TABLES;
   ```

4. **Update admin password** (if needed):
   ```sql
   UPDATE admins SET password = 'admin123' WHERE username = 'admin';
   ```

### Step 3: Install Backend Dependencies

1. **Open Terminal/Command Prompt** and navigate to the website folder:
   ```bash
   cd E:\work\website
   ```

2. **Install Node.js packages**:
   ```bash
   npm install
   ```

3. **Update database password in server.js** (if different):
   - Open `server.js` in a text editor
   - Find line:
     ```javascript
     password: '', // Update with your MySQL password
     ```
   - Change to:
     ```javascript
     password: 'your_mysql_password', // Your actual password
     ```

### Step 4: Start the Server

1. **Start the Backend Server**:
   ```bash
   npm start
   ```

   You should see:
   ```
   ✅ Connected to MySQL database
   🚀 Server running on http://localhost:3000
   👉 Open http://localhost:3000/index.html in your browser
   ```

2. **Open the Application** in your browser:
   - Go to: `http://localhost:3000/index.html`

### Step 5: Login

#### Admin Login
- Username: `admin`
- Password: `admin123`

#### Student Login
- Use student code (generated when admitting students)
- Default password: same as student code

## 📱 New Features Implemented

### 1. **Course Management**
- Add new courses with custom fees and duration
- Update existing course details
- Delete/deactivate courses
- Settings → Course Management

### 2. **Batch Management**
- Create new batches for each course
- Set batch timing, days, and capacity
- Track enrolled students per batch
- Update batch details anytime
- Settings → Batch Management

### 3. **Institute Settings**
- Update institute name, address, phone, email
- Upload institute logo
- Change certificate seal and signature
- All students use updated settings automatically
- Settings → Institute Settings

### 4. **Attendance Tracking**
- Mark attendance for entire batch at once
- Automatic percentage calculation
- Students can view their attendance history
- Dashboard → Attendance

### 5. **Enhanced Admin Panel**
- Real-time dashboard statistics
- Recent activities log
- Filter students by course, status, or search
- Edit/delete students with confirmation
- View comprehensive student profiles
- Admin Dashboard (Default page)

### 6. **Certificate System**
- Auto-generate certificates for completed students
- Unique verification code for each certificate
- Download and print certificates
- Verify certificates online
- Certificates → Generate Certificate

## 🎯 Administrator Workflows

### Adding a New Course
1. Login as Admin
2. Go to **Settings** → **Courses**
3. Click **"Add New Course"**
4. Fill in:
   - Course Code (e.g., `python`)
   - Course Name (e.g., "Python Programming")
   - Fee (e.g., 15000)
   - Duration (e.g., "3 months")
   - Description (optional)
5. Click **"Save Course"**
6. Course appears in admission form automatically

### Creating a New Batch
1. Go to **Settings** → **Batches**
2. Click **"Add New Batch"**
3. Fill in:
   - Batch Name (e.g., "Morning Batch")
   - Select Course
   - Timing (e.g., "09:00 AM - 11:00 AM")
   - Days (e.g., "Mon, Wed, Fri")
   - Max Students (e.g., 30)
4. Click **"Save Batch"**
5. Batch appears in admission form

### Updating Institute Details
1. Go to **Settings** → **Institute Settings**
2. Update any field:
   - Institute Name
   - Address
   - Phone
   - Email
3. Click **"Upload Logo"** to add institute emblem
4. Click **"Save Changes"**
5. All certificates and pages use new details

### Marking Attendance
1. Go to **Dashboard** → **Attendance**
2. Select Batch and Date
3. Mark attendance for each student (Present/Absent)
4. Add remarks if needed
5. Click **"Save Attendance"**
6. Percentages update automatically

### Managing Students
1. Go to **Students** tab
2. Use search or filters to find student
3. Click icons to:
   - 👁️ **View** - Full profile
   - ✏️ **Edit** - Update details
   - 🗑️ **Delete** - Remove student
4. Changes apply immediately

### Generating Certificates
1. Go to **Certificates** tab
2. Enter student code
3. Click **"Generate Certificate"**
4. Certificate creates automatically
5. Click **"Download/Print Certificate"**
6. Certificate includes unique verification code

## 🔄 Updating Frontend to Use APIs

The current `index.html` and `script.js` use LocalStorage. To connect to the MySQL backend, update the JavaScript to use API calls.

### Key API Endpoints

```javascript
// Authentication
POST /api/admin/login
POST /api/student/login

// Students
GET  /api/students
GET  /api/students/:studentCode
POST /api/students
PUT  /api/students/:studentCode
DELETE /api/students/:studentCode

// Courses
GET  /api/courses
POST /api/courses
PUT  /api/courses/:courseCode
DELETE /api/courses/:courseCode

// Batches
GET  /api/batches
GET  /api/batches/:id
POST /api/batches
PUT  /api/batches/:id
DELETE /api/batches/:id

// Attendance
GET  /api/attendance/:batchId
GET  /api/students/:studentCode/attendance
POST /api/attendance

// Fee Payments
GET  /api/students/:studentCode/payments
POST /api/fee-payments

// Results
GET  /api/students/:studentCode/results
POST /api/results

// Certificates
POST /api/certificates/generate
GET  /api/certificates/:verificationCode

// Settings
GET  /api/settings
PUT  /api/settings/:key
POST /api/settings/upload/logo

// Dashboard
GET  /api/dashboard/stats
GET  /api/activities
```

### Example API Call

```javascript
// Fetch all students
async function fetchStudents() {
    try {
        const response = await fetch('http://localhost:3000/api/students');
        const students = await response.json();
        return students;
    } catch (error) {
        console.error('Error fetching students:', error);
    }
}

// Add new student
async function addStudent(studentData) {
    try {
        const response = await fetch('http://localhost:3000/api/students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentData })
        });
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error adding student:', error);
    }
}
```

## 🗄️ Database Schema

### Main Tables:
- `admins` - Admin users
- `students` - Student records
- `courses` - Available courses
- `batches` - Course batches with timing
- `fee_payments` - Payment records
- `results` - Exam results
- `attendance` - Daily attendance
- `certificates` - Generated certificates
- `settings` - Institute configuration
- `activities` - Activity log

## 🛠️ Troubleshooting

### MySQL Connection Issues
**Error**: "Access denied for user 'root'@'localhost'"

**Solution**:
1. Update password in `server.js` line ~39
2. Reset MySQL password if forgotten:
   ```cmd
   mysql -u root -p
   Enter password when promoted
   ```
3. Or create a new user:
   ```sql
   CREATE USER 'admin'@'localhost' IDENTIFIED BY 'password';
   GRANT ALL PRIVILEGES ON brightleaf_academy.* TO 'admin'@'localhost';
   FLUSH PRIVILEGES;
   ```

### Port Already in Use
**Error**: "Port 3000 already in use"

**Solution**:
```cmd
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process
taskkill /PID <process_id> /F

# Or change port in server.js
const PORT = 3001;  // Use any available port
```

### Database Not Found
**Error**: "Unknown database 'brightleaf_academy'"

**Solution**:
1. Import the database:
   ```sql
   SOURCE E:\work\website\database.sql;
   ```
2. Verify it exists:
   ```sql
   SHOW DATABASES;
   ```

### Dependencies Not Installing
**Error**: "npm install fails"

**Solution**:
1. Clear npm cache:
   ```cmd
   npm cache clean --force
   ```
2. Delete node_modules and package-lock.json
3. Install again:
   ```cmd
   npm install
   ```

## 📊 Data Migration (Optional)

If you have data in LocalStorage and want to migrate to MySQL:

1. Open browser DevTools → Application → LocalStorage
2. Export the data
3. Create a migration script to insert into MySQL
4. Or manually re-enter data through the admin panel

## 🚀 Production Deployment (Optional)

### For Cloud Deployment:

**Options**:
1. **Vercel/Netlify** - Free tier available
2. **Render/Railway** - Good for Node.js + MySQL
3. **AWS/Azure/GCP** - Enterprise level

### Steps:
1. Deploy MySQL database first
2. Update database credentials in server.js
3. Deploy Node.js backend
4. Deploy frontend files
5. Update frontend API URLs to production URLs

## 📞 Support

For issues:
1. Check console for error messages
2. Verify MySQL is running
3. Check network/firewall settings
4. Review this guide for common issues

## 🎉 You're Ready!

After setup:
1. Login as admin: `admin` / `admin123`
2. Update institute settings
3. Add courses
4. Create batches
5. Start admitting students

---

*Built for Brightleaf Academy*  💚