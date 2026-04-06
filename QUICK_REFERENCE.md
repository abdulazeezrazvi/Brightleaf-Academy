# Quick Reference Guide

## 🚀 Start Everything

### Option 1: Use setup.bat (Windows)
```cmd
cd E:\work\website
setup.bat
```

### Option 2: Manual Setup
```cmd
# 1. Install dependencies
cd E:\work\website
npm install

# 2. Setup MySQL (MySQL Workbench)
SOURCE E:\work\website\database.sql;

# 3. Start server
npm start
```

## 🔑 Default Credentials

```
Admin Login:
Username: admin
Password: admin123
```

## 🌐 URLs

```
Enhanced Admin Panel:
http://localhost:3000/admin-management.html

Original System (LocalStorage):
http://localhost:3000/index.html
```

## 📋 Quick Commands

### Server
```cmd
# Start server
npm start

# Start with auto-reload (if nodemon installed)
npm run dev
```

### MySQL
```sql
-- Check database
SHOW DATABASES;
USE brightleaf_academy;
SHOW TABLES;

-- View students
SELECT * FROM students;

-- View courses
SELECT * FROM courses;

-- Reset admin password
UPDATE admins SET password = 'admin123' WHERE username = 'admin';
```

## 📊 File Locations

```
E:\work\website\
├── admin-management.html   # Enhanced admin panel
├── index.html              # Original system
├── server.js               # Backend server
├── database.sql            # Database schema
├── package.json            # Dependencies
└── README.md               # Full documentation
```

## 🎯 Common Tasks

### Add New Course
1. Open admin-management.html
2. Go to "Courses"
3. Click "Add New Course"
4. Fill details and save

### Create Batch
1. Go to "Batches"
2. Click "Add New Batch"
3. Select course, set timing
4. Save

### Update Institute Info
1. Go to "Institute"
2. Update name, address, phone
3. Upload logo
4. Save

### Mark Attendance
1. Go to "Attendance"
2. Select batch and date
3. Load students
4. Mark present/absent
5. Save

### Generate Certificate
1. Go to "Certificates"
2. Enter student code
3. Click "Generate"

## ⚠️ Troubleshooting

### Server won't start
```cmd
# Check if port 3000 is in use
netstat -ano | findstr :3000

# Kill process using port 3000
taskkill /PID <process_id> /F

# Or change port in server.js (line 5)
const PORT = 3001;
```

### MySQL connection error
```javascript
// In server.js line ~39, update:
password: 'your_actual_mysql_password',
```

### Import database
```cmd
# In MySQL command line:
mysql -u root -p

# Then run:
SOURCE E:\work\website\database.sql;
```

## 🔧 Server Configuration

Edit `server.js`:
```javascript
const PORT = 3000;              // Change server port
password: 'your_password';     // Update MySQL password
```

## 📞 Support

For detailed help:
- **SETUP_GUIDE.md** - Complete setup instructions
- **README.md** - Full documentation
- **server.js** - Code comments explain each section

## 📈 Quick Stats Check

After logging in:
1. **Dashboard** - View statistics
2. **Students** - See all enrolled students
3. **Courses** - Check available courses
4. **Batches** - View batch schedule

## 🎓 Workflow Example

1. **Setup Institute** → Go to Institute Settings
2. **Add Course** → Define courses with fees
3. **Create Batches** → Set batch timings
4. **Admit Students** → Use index.html admissions tab
5. **Mark Attendance** → Track daily via Attendance tab
6. **Generate Certificates** → When students complete

---

**Tips:**
- Server must be running (npm start) for admin panel to work
- MySQL must be running for database operations
- Refresh browser if changes don't appear
- Check browser console (F12) for errors