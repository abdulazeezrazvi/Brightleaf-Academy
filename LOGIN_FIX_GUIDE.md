# Login Fix Guide - Brightleaf Academy

## समस्या (Problem): लॉगिन नहीं कर रहा (Login Not Working)

### कारण (Reason): सर्वर चल नहीं रहा (Server Not Running)

---

## Solution - समाधान (तीन तरीके):

### ✅ Option 1: Quick Fix (Windows) - सबसे आसान

1. **Command Prompt खोलें** (Win + R, टाइप करें `cmd`)

2. **Website folder में जाएं:**
   ```cmd
   cd E:\work\website
   ```

3. **MySQL password update करें server.js में:**
   - Notepad से खोलें `E:\work\website\server.js`
   - Line ~39 पर जाएं
   - Password डालें:
     ```javascript
     password: 'root',  // अगर आपका MySQL password 'root' है
     ```
     या
     ```javascript
     password: '',  // अगर आपने कोई password नहीं रखा
     ```
   - Save करें

4. **Server शुरू करें:**
   ```cmd
   node server.js
   ```

5. **अब ब्राउज़र में खोलें:**
   ```
   http://localhost:3000/admin-management.html
   ```

6. **Login करें:**
   - Username: `admin`
   - Password: `admin123`

---

### ✅ Option 2: Using setup.bat - Setup Script का उपयोग करें

```cmd
cd E:\work\website
setup.bat
```

Script आपको guide करेगी।

---

### ✅ Option 3: Manual Setup - पूरा सेटअप

#### Step 1: MySQL Database Setup

**अगर MySQL नहीं है तो पहले install करें:**
- डाउनलोड करें: https://dev.mysql.com/downloads/mysql/
- या MySQL Workbench का उपयोग करें

**Database बनाएं:**

**Method A - MySQL Command Line के साथ:**
```cmd
mysql -u root -p

SOURCE E:\work\website\database.sql;
```

**Method B - MySQL Workbench के साथ:**
1. MySQL Workbench खोलें
2. Connect करें
3. File → Open SQL Script
4. Select: `E:\work\website\database.sql`
5. Lightning bolt icon पर click करें (execute)

**Verify डेटाबेस:**
```sql
SHOW DATABASES;
USE brightleaf_academy;
SHOW TABLES;
```

#### Step 2: Install Node.js Dependencies

```cmd
cd E:\work\website
npm install
```

#### Step 3: Update MySQL Password in server.js

Open `E:\work\website\server.js` in Notepad

Find line ~39:
```javascript
password: '', // Update with your MySQL password
```

Change to your MySQL password:
```javascript
password: 'your_password',
```

Examples:
```javascript
password: 'root',           // अगर password 'root' है
password: '',              // अगर कोई password नहीं है
password: 'mySQLPass123',  // आपका actual password
```

#### Step 4: Start Server

```cmd
cd E:\work\website
npm start
```

Wait for message:
```
✅ Connected to MySQL database
🚀 Server running on http://localhost:3000
```

#### Step 5: Open in Browser

Go to:
```
http://localhost:3000/admin-management.html
```

#### Step 6: Login

```
Username: admin
Password: admin123
```

---

## 🔍 Troubleshooting - Debugging

### Problem 1: "Port 3000 already in use"

**Solution:**
```cmd
# पुराना process kill करें
netstat -ano | findstr :3000
taskkill /PID <process_id> /F
```

### Problem 2: "Access denied for user 'root'@'localhost'"

**Solution:**
```sql
# MySQL में
CREATE USER 'brightleaf'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON brightleaf_academy.* TO 'brightleaf'@'localhost';
FLUSH PRIVILEGES;
```

Then in `server.js`:
```javascript
user: 'brightleaf',
password: 'password',
```

### Problem 3: "Unknown database 'brightleaf_academy'"

**Solution:**
Run the database.sql file again:
```sql
SOURCE E:\work\website\database.sql;
```

### Problem 4: Login button not working

**Check:**
1. Server running है? (Command prompt में check करें)
2. Browser console में error? (F12 दबाएं)
3. Network tab में API failed?

**Browser Console (F12) में इन errors को देखें:**
- `fetch failed` → Server running नहीं है
- `401 unauthorized` → Wrong password
- `500 internal error` → Database connection issue

---

## ✅ Quick Test - तुरंत check करें

### Server Running है?

Run this in CMD:
```cmd
curl http://localhost:3000/api/dashboard/stats
```

अगर error आए तो server running नहीं है।

### Database Connected है?

Open browser:
```
http://localhost:3000
```

अगर "Cannot GET /" आए तो server चल रहा है लेकिन database check करें।

---

## 🎯 Most Common Solutions - सबसे आम समाधान

### 90% Cases में ये 3 काम करेगा:

**1. MySQL Password Update:**
```javascript
// server.js line ~39
password: '',  // या अपना password डालें
```

**2. Start Server:**
```cmd
cd E:\work\website
node server.js
```

**3. Open Correct URL:**
```
http://localhost:3000/admin-management.html
```

---

## 📝 Checklist - इन सब को check करें

- [ ] MySQL installed है?
- [ ] Database imported है? (`brightleaf_academy` database है?)
- [ ] Admin user exists? (`SELECT * FROM admins`)
- [ ] Node.js installed है?
- [ ] Dependencies installed हैं? (`npm install`)
- [ ] MySQL password correct है server.js में?
- [ ] Server running है? (`npm start`)
- [ ] ब्राउज़र में correct URL खोला?
- [ ] Username और password correct है? (`admin` / `admin123`)

---

## 🆘 Still Not Working? अभी भी काम नहीं कर रहा?

### Final Debug Steps:

1. **Check MySQL:**
   ```cmd
   mysql -u root -p -e "SHOW DATABASES;"
   ```
   देखें कि `brightleaf_academy` database है?

2. **Check Server:**
   ```cmd
   cd E:\work\website
   node server.js
   ```
   Error message देखें

3. **Check Browser:**
   - Right-click → Inspect
   - Console tab देखें
   - Errors note करें

4. **Send me error message:**
   - Server error message
   - Browser console error
   - Screenshot भी भेज सकते हैं

---

## 📞 Quick Help

### तुरंत fix के लिए:

```cmd
# 1. Folder में जाएं
cd E:\work\website

# 2. server.js खोलकर password update करें (line ~39)
#    password: '', // या अपना password

# 3. Server शुरू करें
node server.js

# 4. ब्राउज़र खोलें
# http://localhost:3000/admin-management.html
```

---

**Login Credentials:**
```
Username: admin
Password: admin123
```

**Good luck! अगर फिर भी problem हो तो बताएं और error message भेजें!** 🚀