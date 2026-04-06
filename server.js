const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// File upload configuration for certificates/assets
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Database connection
let pool;

async function connectToDatabase() {
    try {
        pool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'brightleaf_academy',
            port: process.env.DB_PORT || 5432,
        });
        
        await pool.query('SELECT NOW()');
        console.log('✅ Connected to PostgreSQL database');
        return pool;
    } catch (error) {
        console.error('❌ Database connection error:', error);
        process.exit(1);
    }
}

// Middleware to check database connection
function checkDB(req, res, next) {
    if (!pool) {
        return res.status(500).json({ error: 'Database not connected' });
    }
    next();
}

// ========== AUTH API ===========

app.post('/api/admin/login', checkDB, async (req, res) => {
    try {
        const { username, password } = req.body;

        const { rows } = await pool.query(
            'SELECT * FROM admins WHERE username = $1',
            [username]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const admin = rows[0];

        // For development, allow plain text comparison (remove in production)
        const isValidPassword = await bcrypt.compare(password, admin.password) || 
                                password === admin.password;

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Log activity
        await logActivity('admin', admin.username, 'login', 'Admin login successful');

        res.json({
            success: true,
            admin: {
                id: admin.id,
                username: admin.username,
                name: admin.name,
                email: admin.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/student/login', checkDB, async (req, res) => {
    try {
        const { studentCode, password } = req.body;

        const { rows } = await pool.query(
            'SELECT * FROM students WHERE student_code = $1',
            [studentCode]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid student code' });
        }

        const student = rows[0];

        // For development, allow plain text comparison (remove in production)
        const isValidPassword = await bcrypt.compare(password, student.password) ||
                                password === student.password;

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Log activity
        await logActivity('student', student.student_code, 'login', 'Student login successful');

        res.json({
            success: true,
            student: {
                id: student.id,
                studentCode: student.student_code,
                name: student.name,
                email: student.email,
                phone: student.phone,
                course: student.course_code,
                batch: student.batch_id,
                status: student.status,
                attendance_percentage: student.attendance_percentage,
                progress_percentage: student.progress_percentage,
                aadhar_number: student.aadhar_number,
                photo_path: student.photo_path
            }
        });
    } catch (error) {
        console.error('Student login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========== STU`DENT API ===========

app.get('/api/students', checkDB, async (req, res) => {
    try {
        const { search, course, status } = req.query;
        let query = `
            SELECT s.*, c.course_name, b.batch_name 
            FROM students s 
            LEFT JOIN courses c ON s.course_code = c.course_code
            LEFT JOIN batches b ON s.batch_id = b.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (search) {
            query += ` AND (s.name ILIKE $${paramIndex} OR s.student_code ILIKE $${paramIndex} OR s.email ILIKE $${paramIndex} OR s.phone ILIKE $${paramIndex})`;
            const searchPattern = `%${search}%`;
            params.push(searchPattern);
            paramIndex++;
        }

        if (course) {
            query += ` AND s.course_code = $${paramIndex}`;
            params.push(course);
            paramIndex++;
        }

        if (status) {
            query += ` AND s.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        query += ' ORDER BY s.admission_date DESC';

        const { rows: students } = await pool.query(query, params);
        res.json(students);
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/students/:studentCode', checkDB, async (req, res) => {
    try {
        const { studentCode } = req.params;

        const { rows } = await pool.query(
            `SELECT s.*, c.course_name, c.duration, b.batch_name, b.timing, b.days,
             COALESCE((SELECT SUM(amount) FROM fee_payments WHERE student_code = s.student_code), 0) as paid_fee
             FROM students s 
             LEFT JOIN courses c ON s.course_code = c.course_code
             LEFT JOIN batches b ON s.batch_id = b.id 
             WHERE s.student_code = $1`,
            [studentCode]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching student:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/students', checkDB, upload.single('photo'), async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // FormData fields are in req.body. File is in req.file.
        const studentData = req.body;
        const photoPath = req.file ? `/uploads/${req.file.filename}` : null;

        // Check if student code already exists
        const { rows: existing } = await client.query(
            'SELECT id FROM students WHERE student_code = $1',
            [studentData.student_code]
        );

        if (existing.length > 0) {
            throw new Error('Student code already exists');
        }

        // Insert student
        const result = await client.query(
            `INSERT INTO students 
             (student_code, password, name, email, phone, dob, guardian_name, 
              address, city, state, pincode, course_code, batch_id, admission_date, total_fee, status, aadhar_number, photo_path, is_reduced_fee, original_fee) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
             RETURNING id`,
            [
                studentData.student_code,
                studentData.password,
                studentData.name,
                studentData.email,
                studentData.phone,
                studentData.dob,
                studentData.guardian_name,
                studentData.address,
                studentData.city,
                studentData.state,
                studentData.pincode,
                studentData.course,
                studentData.batch_id,
                studentData.admission_date,
                studentData.total_fee,
                'active',
                studentData.aadhar_number,
                photoPath,
                studentData.is_reduced_fee === 'true' || studentData.is_reduced_fee === true,
                studentData.original_fee || studentData.total_fee
            ]
        );

        await client.query('COMMIT');

        // Log activity
        await logActivity('admin', 'admin', 'add_student', `Added new student: ${studentData.student_code}`);

        res.json({ success: true, studentId: result.rows[0].id });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error adding student:', error);
        res.status(500).json({ error: error.message || 'Failed to add student' });
    } finally {
        client.release();
    }
});

app.put('/api/students/:studentCode', checkDB, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { studentCode } = req.params;
        const { studentData } = req.body;

        const result = await client.query(
            `UPDATE students SET 
             name = $1, email = $2, phone = $3, dob = $4, 
             guardian_name = $5, address = $6, 
             city = $7, state = $8, pincode = $9,
             course_code = $10, batch_id = $11, status = $12,
             attendance_percentage = $13, progress_percentage = $14,
             aadhar_number = $15
             WHERE student_code = $16`,
            [
                studentData.name,
                studentData.email,
                studentData.phone,
                studentData.dob,
                studentData.guardian_name,
                studentData.address,
                studentData.city,
                studentData.state,
                studentData.pincode,
                studentData.course,
                studentData.batch_id,
                studentData.status,
                studentData.attendance_percentage || 0,
                studentData.progress_percentage || 0,
                studentData.aadhar_number,
                studentCode
            ]
        );

        await client.query('COMMIT');

        // Log activity
        await logActivity('admin', 'admin', 'update_student', `Updated student: ${studentCode}`);

        res.json({ success: true, affectedRows: result.rowCount });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating student:', error);
        res.status(500).json({ error: 'Failed to update student' });
    } finally {
        client.release();
    }
});

app.delete('/api/students/:studentCode', checkDB, async (req, res) => {
    try {
        const { studentCode } = req.params;

        const result = await pool.query(
            'DELETE FROM students WHERE student_code = $1',
            [studentCode]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Log activity
        await logActivity('admin', 'admin', 'delete_student', `Deleted student: ${studentCode}`);

        res.json({ success: true, affectedRows: result.rowCount });
    } catch (error) {
        console.error('Error deleting student:', error);
        res.status(500).json({ error: 'Failed to delete student' });
    }
});

// ========== COURSE MANAGEMENT API ===========

app.get('/api/courses', checkDB, async (req, res) => {
    try {
        const { rows: courses } = await pool.query(
            'SELECT * FROM courses WHERE is_active = TRUE ORDER BY course_code'
        );
        res.json(courses);
    } catch (error) {
        console.error('Error fetching courses:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/courses', checkDB, async (req, res) => {
    try {
        const { course_code, course_name, fee, duration, description } = req.body;

        const result = await pool.query(
            'INSERT INTO courses (course_code, course_name, fee, duration, description) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [course_code, course_name, fee, duration, description]
        );

        await logActivity('admin', 'admin', 'add_course', `Added new course: ${course_code}`);

        res.json({ success: true, courseId: result.rows[0].id });
    } catch (error) {
        console.error('Error adding course:', error);
        res.status(500).json({ error: error.message || 'Failed to add course' });
    }
});

app.put('/api/courses/:courseCode', checkDB, async (req, res) => {
    try {
        const { courseCode } = req.params;
        const { course_name, fee, duration, description, is_active } = req.body;

        const result = await pool.query(
            'UPDATE courses SET course_name = $1, fee = $2, duration = $3, description = $4, is_active = $5 WHERE course_code = $6',
            [course_name, fee, duration, description, is_active !== undefined ? is_active : true, courseCode]
        );

        await logActivity('admin', 'admin', 'update_course', `Updated course: ${courseCode}`);

        res.json({ success: true, affectedRows: result.rowCount });
    } catch (error) {
        console.error('Error updating course:', error);
        res.status(500).json({ error: 'Failed to update course' });
    }
});

app.delete('/api/courses/:courseCode', checkDB, async (req, res) => {
    try {
        const { courseCode } = req.params;

        const result = await pool.query(
            'UPDATE courses SET is_active = FALSE WHERE course_code = $1',
            [courseCode]
        );

        await logActivity('admin', 'admin', 'delete_course', `Deactivated course: ${courseCode}`);

        res.json({ success: true, affectedRows: result.rowCount });
    } catch (error) {
        console.error('Error deleting course:', error);
        res.status(500).json({ error: 'Failed to delete course' });
    }
});

// ========== BATCH MANAGEMENT API ===========

app.get('/api/batches', checkDB, async (req, res) => {
    try {
        const { course } = req.query;
        let query = `
            SELECT b.*, c.course_name, 
                   (SELECT COUNT(*) FROM students WHERE batch_id = b.id) as enrolled_count
            FROM batches b
            LEFT JOIN courses c ON b.course_code = c.course_code
            WHERE b.status = 'active'
        `;
        const params = [];

        if (course) {
            query += ' AND b.course_code = $1';
            params.push(course);
        }

        query += ' ORDER BY b.timing';

        const { rows: batches } = await pool.query(query, params);
        res.json(batches);
    } catch (error) {
        console.error('Error fetching batches:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/batches/:id', checkDB, async (req, res) => {
    try {
        const { id } = req.params;

        const { rows } = await pool.query(
            'SELECT * FROM batches WHERE id = $1',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Batch not found' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching batch:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/batches', checkDB, async (req, res) => {
    try {
        const { batch_name, course_code, timing, days, max_students } = req.body;

        const result = await pool.query(
            'INSERT INTO batches (batch_name, course_code, timing, days, max_students) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [batch_name, course_code, timing, days, max_students]
        );

        await logActivity('admin', 'admin', 'add_batch', `Added new batch: ${batch_name}`);

        res.json({ success: true, batchId: result.rows[0].id });
    } catch (error) {
        console.error('Error adding batch:', error);
        res.status(500).json({ error: error.message || 'Failed to add batch' });
    }
});

app.put('/api/batches/:id', checkDB, async (req, res) => {
    try {
        const { id } = req.params;
        const { batch_name, course_code, timing, days, max_students, status } = req.body;

        const result = await pool.query(
            'UPDATE batches SET batch_name = $1, course_code = $2, timing = $3, days = $4, max_students = $5, status = $6 WHERE id = $7',
            [batch_name, course_code, timing, days, max_students, status, id]
        );

        await logActivity('admin', 'admin', 'update_batch', `Updated batch: ${id}`);

        res.json({ success: true, affectedRows: result.rowCount });
    } catch (error) {
        console.error('Error updating batch:', error);
        res.status(500).json({ error: 'Failed to update batch' });
    }
});

app.delete('/api/batches/:id', checkDB, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'UPDATE batches SET status = \'inactive\' WHERE id = $1',
            [id]
        );

        await logActivity('admin', 'admin', 'delete_batch', `Deactivated batch: ${id}`);

        res.json({ success: true, affectedRows: result.rowCount });
    } catch (error) {
        console.error('Error deleting batch:', error);
        res.status(500).json({ error: 'Failed to delete batch' });
    }
});

// ========== FEE MANAGEMENT API ===========

app.get('/api/students/:studentCode/payments', checkDB, async (req, res) => {
    try {
        const { studentCode } = req.params;

        const { rows: payments } = await pool.query(
            'SELECT * FROM fee_payments WHERE student_code = $1 ORDER BY payment_date DESC',
            [studentCode]
        );

        res.json(payments);
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/fee-payments', checkDB, async (req, res) => {
    try {
        const { student_code, amount, payment_mode, reference_number, payment_date, remarks } = req.body;

        // If it's an exemption, clarify if the whole balance should be exempted
        let finalAmount = amount;
        if (payment_mode === 'exemption' && !amount) {
            // Fetch student to get balance
            const { rows: stats } = await pool.query(
                `SELECT s.total_fee, COALESCE(SUM(f.amount), 0) as paid_fee
                 FROM students s
                 LEFT JOIN fee_payments f ON s.student_code = f.student_code
                 WHERE s.student_code = $1
                 GROUP BY s.id, s.total_fee`,
                [student_code]
            );
            if (stats.length > 0) {
                finalAmount = parseFloat(stats[0].total_fee) - parseFloat(stats[0].paid_fee);
            }
        }

        const result = await pool.query(
            `INSERT INTO fee_payments (student_code, amount, payment_mode, reference_number, payment_date, remarks) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [student_code, finalAmount, payment_mode, reference_number, payment_date, remarks]
        );

        await logActivity('admin', 'admin', 'fee_payment', `Recorded ${payment_mode} of ₹${finalAmount} for student: ${student_code}`);

        res.json({ success: true, paymentId: result.rows[0].id });
    } catch (error) {
        console.error('Error recording fee payment:', error);
        res.status(500).json({ error: error.message || 'Failed to record payment' });
    }
});

app.post('/api/fee-exemptions/:studentCode', checkDB, async (req, res) => {
    const client = await pool.connect();
    try {
        const { studentCode } = req.params;
        await client.query('BEGIN');

        // 1. Calculate remaining balance
        const { rows: stats } = await client.query(
            `SELECT s.total_fee, COALESCE(SUM(f.amount), 0) as paid_fee
             FROM students s
             LEFT JOIN fee_payments f ON s.student_code = f.student_code
             WHERE s.student_code = $1
             GROUP BY s.id, s.total_fee`,
            [studentCode]
        );

        if (stats.length === 0) {
            throw new Error('Student not found');
        }

        const balance = parseFloat(stats[0].total_fee) - parseFloat(stats[0].paid_fee);

        if (balance <= 0) {
            return res.json({ success: true, message: 'No balance to exempt' });
        }

        // 2. Record exemption payment
        await client.query(
            `INSERT INTO fee_payments (student_code, amount, payment_mode, payment_date, remarks)
             VALUES ($1, $2, $3, CURRENT_DATE, $4)`,
            [studentCode, balance, 'exemption', 'Full balance exemption']
        );

        await client.query('COMMIT');
        await logActivity('admin', 'admin', 'fee_exemption', `Exempted full balance of ₹${balance} for student: ${studentCode}`);

        res.json({ success: true, exemptedAmount: balance });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Exemption error:', error);
        res.status(500).json({ error: error.message || 'Failed to exempt balance' });
    } finally {
        client.release();
    }
});

// ========== ATTENDANCE API ===========

app.get('/api/attendance/:batchId', checkDB, async (req, res) => {
    try {
        const { batchId } = req.params;
        const { date } = req.query;

        let query = `
            SELECT a.*, s.name, s.student_code
            FROM attendance a
            JOIN students s ON a.student_code = s.student_code
            WHERE a.batch_id = $1
        `;
        const params = [batchId];
        let paramIndex = 2;

        if (date) {
            query += ` AND a.attendance_date = $${paramIndex}`;
            params.push(date);
            paramIndex++;
        }

        query += ' ORDER BY a.attendance_date DESC';

        const { rows: attendance } = await pool.query(query, params);
        res.json(attendance);
    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/students/:studentCode/attendance', checkDB, async (req, res) => {
    try {
        const { studentCode } = req.params;

        const { rows: attendance } = await pool.query(
            `SELECT a.*, b.batch_name 
             FROM attendance a
             JOIN batches b ON a.batch_id = b.id
             WHERE a.student_code = $1
             ORDER BY a.attendance_date DESC`,
            [studentCode]
        );

        res.json(attendance);
    } catch (error) {
        console.error('Error fetching student attendance:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/attendance', checkDB, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { batch_id, attendance_date, attendance_records } = req.body;

        for (const record of attendance_records) {
            await client.query(
                `INSERT INTO attendance (student_code, batch_id, attendance_date, is_present, remarks)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (student_code, batch_id, attendance_date) 
                 DO UPDATE SET is_present = EXCLUDED.is_present, remarks = EXCLUDED.remarks`,
                [record.student_code, batch_id, attendance_date, record.is_present, record.remarks]
            );
        }

        await client.query('COMMIT');

        // Update attendance percentage for all students in this batch
        await updateAttendancePercentage(batch_id);

        await logActivity('admin', 'admin', 'mark_attendance', `Attendance marked for batch: ${batch_id}, date: ${attendance_date}`);

        res.json({ success: true });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error marking attendance:', error);
        res.status(500).json({ error: 'Failed to mark attendance' });
    } finally {
        client.release();
    }
});

// Helper function to update attendance percentage
async function updateAttendancePercentage(batch_id) {
    try {
        await pool.query(`
            UPDATE students s
            SET attendance_percentage = att.percentage
            FROM (
                SELECT student_code,
                       SUM(CASE WHEN is_present = TRUE THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as percentage
                FROM attendance
                WHERE batch_id = $1
                GROUP BY student_code
            ) att
            WHERE s.student_code = att.student_code
            AND s.batch_id = $2
        `, [batch_id, batch_id]);
    } catch (error) {
        console.error('Error updating attendance percentage:', error);
    }
}

// ========== RESULTS API ===========

app.get('/api/students/:studentCode/results', checkDB, async (req, res) => {
    try {
        const { studentCode } = req.params;

        const { rows: results } = await pool.query(
            'SELECT * FROM results WHERE student_code = $1 ORDER BY exam_date DESC',
            [studentCode]
        );

        res.json(results);
    } catch (error) {
        console.error('Error fetching results:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/results', checkDB, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { student_code, course_code, exam_date, subject_marks, total_marks, percentage, grade, remarks } = req.body;

        const result = await client.query(
            `INSERT INTO results (student_code, course_code, exam_date, subject_marks, total_marks, percentage, grade, remarks)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
            [student_code, course_code, exam_date, JSON.stringify(subject_marks), total_marks, percentage, grade, remarks]
        );

        // Update student status and progress
        if (percentage >= 50) {
            await client.query(
                `UPDATE students SET 
                 progress_percentage = GREATEST(progress_percentage, $1),
                 status = CASE WHEN progress_percentage >= 100 THEN 'completed' ELSE status END
                 WHERE student_code = $2`,
                [percentage, student_code]
            );
        }

        await client.query('COMMIT');

        await logActivity('admin', 'admin', 'add_result', `Result added: ${student_code}, Percentage: ${percentage}`);

        res.json({ success: true, resultId: result.rows[0].id });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error adding result:', error);
        res.status(500).json({ error: 'Failed to add result' });
    } finally {
        client.release();
    }
});

// ========== CERTIFICATE API ===========

app.post('/api/certificates/generate', checkDB, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { student_code } = req.body;

        // Check if student is eligible for certificate
        const { rows: students } = await client.query(
            'SELECT * FROM students WHERE student_code = $1 AND status = \'completed\'',
            [student_code]
        );

        if (students.length === 0) {
            throw new Error('Student not eligible for certificate');
        }

        const student = students[0];

        // Check if certificate already exists
        const { rows: existing } = await client.query(
            `SELECT c.*, s.name as student_name, s.guardian_name, s.photo_path, s.course_code, co.course_name, co.duration as course_duration
             FROM certificates c
             JOIN students s ON c.student_code = s.student_code
             JOIN courses co ON s.course_code = co.course_code
             WHERE c.student_code = $1`,
            [student_code]
        );

        if (existing.length > 0) {
            await client.query('ROLLBACK');
            return res.json({ success: true, certificate: existing[0] });
        }

        // Get latest result
        const { rows: results } = await client.query(
            'SELECT * FROM results WHERE student_code = $1 ORDER BY exam_date DESC LIMIT 1',
            [student_code]
        );

        const latestResult = results[0] || { percentage: 0, grade: 'N/A' };

        const certificate_number = 'CERT' + Date.now();
        const verification_code = 'VER' + Date.now().toString().split('').reverse().join('');

        const result = await client.query(
            `INSERT INTO certificates (student_code, certificate_number, issue_date, completion_date, grade, percentage, verification_code)
             VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6) RETURNING id`,
            [student_code, certificate_number, student.admission_date, latestResult.grade, latestResult.percentage, verification_code]
        );

        // Get the created certificate with student and course info
        const { rows: certificates } = await client.query(
            `SELECT c.*, s.name as student_name, s.guardian_name, s.photo_path, s.course_code, co.course_name, co.duration as course_duration
             FROM certificates c
             JOIN students s ON c.student_code = s.student_code
             JOIN courses co ON s.course_code = co.course_code
             WHERE c.id = $1`,
            [result.rows[0].id]
        );

        await client.query('COMMIT');

        await logActivity('admin', 'admin', 'generate_certificate', `Certificate generated: ${student_code}`);

        res.json({ success: true, certificate: certificates[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error generating certificate:', error);
        res.status(500).json({ error: error.message || 'Failed to generate certificate' });
    } finally {
        client.release();
    }
});

app.get('/api/certificates/:verificationCode', checkDB, async (req, res) => {
    try {
        const { verificationCode } = req.params;

        const { rows } = await pool.query(
            `SELECT c.*, s.name as student_name, s.student_code, s.course_code, co.course_name, co.duration as course_duration
             FROM certificates c
             JOIN students s ON c.student_code = s.student_code
             JOIN courses co ON s.course_code = co.course_code
             WHERE c.verification_code = $1`,
            [verificationCode]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Certificate not found' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching certificate:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get certificate by student code (for student portal)
app.get('/api/certificates/student/:studentCode', checkDB, async (req, res) => {
    try {
        const { studentCode } = req.params;

        const { rows } = await pool.query(
            `SELECT c.*, s.name as student_name, s.student_code, s.course_code, co.course_name, co.duration as course_duration
             FROM certificates c
             JOIN students s ON c.student_code = s.student_code
             JOIN courses co ON s.course_code = co.course_code
             WHERE c.student_code = $1
             ORDER BY c.issue_date DESC
             LIMIT 1`,
            [studentCode]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Certificate not found' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching student certificate:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========== SETTINGS API ===========

app.get('/api/settings', checkDB, async (req, res) => {
    try {
        const { rows: settings } = await pool.query('SELECT * FROM settings ORDER BY setting_key');
        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/settings/:key', checkDB, async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;

        let result = await pool.query(
            'UPDATE settings SET setting_value = $1 WHERE setting_key = $2',
            [value, key]
        );

        if (result.rowCount === 0) {
            result = await pool.query(
                'INSERT INTO settings (setting_key, setting_value) VALUES ($1, $2)',
                [key, value]
            );
        }

        await logActivity('admin', 'admin', 'update_setting', `Setting updated: ${key}`);

        res.json({ success: true, affectedRows: result.rowCount || 1 });
    } catch (error) {
        console.error('Error updating setting:', error);
        res.status(500).json({ error: 'Failed to update setting' });
    }
});

app.post('/api/settings/upload/:key', checkDB, upload.single('file'), async (req, res) => {
    try {
        const { key } = req.params;
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileUrl = `/uploads/${req.file.filename}`;

        let result = await pool.query(
            'UPDATE settings SET setting_value = $1 WHERE setting_key = $2',
            [fileUrl, key]
        );

        if (result.rowCount === 0) {
            await pool.query(
                'INSERT INTO settings (setting_key, setting_value) VALUES ($1, $2)',
                [key, fileUrl]
            );
        }

        await logActivity('admin', 'admin', 'upload_file', `File uploaded for setting: ${key}`);

        res.json({ success: true, url: fileUrl });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// Deprecated, use /api/settings/upload/institute_logo
app.post('/api/settings/upload/logo', checkDB, upload.single('logo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const logoUrl = `/uploads/${req.file.filename}`;

        await pool.query(
            'UPDATE settings SET setting_value = $1 WHERE setting_key = $2',
            [logoUrl, 'institute_logo']
        );

        await logActivity('admin', 'admin', 'upload_logo', `Logo uploaded: ${req.file.filename}`);

        res.json({ success: true, url: logoUrl });
    } catch (error) {
        console.error('Error uploading logo:', error);
        res.status(500).json({ error: 'Failed to upload logo' });
    }
});

// ========== DASHBOARD STATS API ===========

app.get('/api/dashboard/stats', checkDB, async (req, res) => {
    try {
        // Get total students
        const { rows: totalStudents } = await pool.query('SELECT COUNT(*) as count FROM students');
        const { rows: activeStudents } = await pool.query("SELECT COUNT(*) as count FROM students WHERE status = 'active'");
        const { rows: completedStudents } = await pool.query("SELECT COUNT(*) as count FROM students WHERE status = 'completed'");

        // Get fee stats
        const { rows: totalFees } = await pool.query('SELECT SUM(total_fee) as sum FROM students');
        const { rows: collectedFees } = await pool.query('SELECT SUM(amount) as sum FROM fee_payments');
        const { rows: pendingFees } = await pool.query(`
            SELECT SUM(s.total_fee - COALESCE((SELECT SUM(amount) FROM fee_payments WHERE student_code = s.student_code), 0)) as sum
            FROM students s
        `);

        // Get recent activities
        const { rows: recentActivities } = await pool.query(`
            SELECT * FROM activities
            ORDER BY created_at DESC
            LIMIT 10
        `);

        // Get students by course
        const { rows: studentsByCourse } = await pool.query(`
            SELECT c.course_name, COUNT(*) as count
            FROM students s
            JOIN courses c ON s.course_code = c.course_code
            GROUP BY c.course_code, c.course_name
        `);

        res.json({
            totalStudents: totalStudents[0].count,
            activeStudents: activeStudents[0].count,
            completedStudents: completedStudents[0].count,
            totalFees: parseFloat(totalFees[0].sum) || 0,
            totalCollected: parseFloat(collectedFees[0].sum) || 0,
            pendingFees: parseFloat(pendingFees[0].sum) || 0,
            recentActivities,
            studentsByCourse
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========== ACTIVITIES LOG API ===========

async function logActivity(userType, userId, action, details) {
    try {
        await pool.query(
            `INSERT INTO activities (user_type, user_id, action, details) VALUES ($1, $2, $3, $4)`,
            [userType, userId, action, details]
        );
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

app.get('/api/activities', checkDB, async (req, res) => {
    try {
        const { limit = 20 } = req.query;

        const { rows: activities } = await pool.query(
            'SELECT * FROM activities ORDER BY created_at DESC LIMIT $1',
            [parseInt(limit)]
        );

        res.json(activities);
    } catch (error) {
        console.error('Error fetching activities:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Start server
async function startServer() {
    await connectToDatabase();

    app.listen(PORT, () => {
        console.log(`\n🚀 Server running on http://localhost:${PORT}`);
        console.log(`👉 Open http://localhost:${PORT}/index.html in your browser`);
        console.log(`\n📚 API Documentation:`);
        console.log(`   - POST /api/admin/login - Admin login`);
        console.log(`   - POST /api/student/login - Student login`);
        console.log(`   - GET/POST /api/students - Student CRUD`);
        console.log(`   - GET/POST /api/courses - Course management`);
        console.log(`   - GET/POST /api/batches - Batch management`);
        console.log(`   - GET/POST /api/attendance - Attendance tracking`);
        console.log(`   - POST /api/fee-payments - Fee payments`);
        console.log(`   - POST /api/results - Exam results`);
        console.log(`   - POST /api/certificates/generate - Generate certificate`);
        console.log(`   - GET/PUT /api/settings - Institute settings`);
        console.log(`   - GET /api/dashboard/stats - Dashboard statistics\n`);
    });
}

startServer();