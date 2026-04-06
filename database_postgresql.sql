-- Brightleaf Academy Database Schema for PostgreSQL
-- PostgreSQL Database Setup

-- Create Database (Note: In PSQL, CREATE DATABASE cannot be run inside a transaction)
-- CREATE DATABASE brightleaf_academy;

-- Connect to the database (if running from a script)
-- \c brightleaf_academy;

-- Drop existing tables if needed (optional)
-- DROP TABLE IF EXISTS activities, attendance, results, fee_payments, certificates, students, batches, courses, settings, admins CASCADE;

-- Function for auto-updating timestamps
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Admins Table
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Courses Table
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    course_code VARCHAR(100) UNIQUE NOT NULL,
    course_name VARCHAR(100) NOT NULL,
    fee DECIMAL(10,2) NOT NULL,
    duration VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_courses_modtime BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Batches Table
CREATE TABLE IF NOT EXISTS batches (
    id SERIAL PRIMARY KEY,
    batch_name VARCHAR(50) NOT NULL,
    course_code VARCHAR(100) NOT NULL,
    timing VARCHAR(50) NOT NULL,
    days VARCHAR(50) NOT NULL,
    max_students INT DEFAULT 30,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_code) REFERENCES courses(course_code) ON DELETE CASCADE
);

CREATE TRIGGER update_batches_modtime BEFORE UPDATE ON batches FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Students Table
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    student_code VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(15),
    dob DATE,
    guardian_name VARCHAR(100),
    guardian_phone VARCHAR(15),
    address TEXT,
    course_code VARCHAR(100) NOT NULL,
    batch_id INT,
    admission_date DATE NOT NULL,
    total_fee DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed', 'dropped')),
    attendance_percentage DECIMAL(5,2) DEFAULT 0,
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_code) REFERENCES courses(course_code) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL
);

CREATE TRIGGER update_students_modtime BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Fee Payments Table
CREATE TABLE IF NOT EXISTS fee_payments (
    id SERIAL PRIMARY KEY,
    student_code VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_mode VARCHAR(20) NOT NULL CHECK (payment_mode IN ('cash', 'upi', 'bank_transfer', 'cheque')),
    reference_number VARCHAR(100),
    payment_date DATE NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_code) REFERENCES students(student_code) ON DELETE CASCADE
);

-- Results Table
CREATE TABLE IF NOT EXISTS results (
    id SERIAL PRIMARY KEY,
    student_code VARCHAR(50) NOT NULL,
    course_code VARCHAR(100) NOT NULL,
    exam_date DATE NOT NULL,
    subject_marks JSONB NOT NULL,
    total_marks DECIMAL(10,2) NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    grade VARCHAR(10) NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_code) REFERENCES students(student_code) ON DELETE CASCADE,
    FOREIGN KEY (course_code) REFERENCES courses(course_code) ON DELETE CASCADE
);

-- Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    student_code VARCHAR(50) NOT NULL,
    batch_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    is_present BOOLEAN NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_code) REFERENCES students(student_code) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
    UNIQUE (student_code, batch_id, attendance_date)
);

-- Settings Table (for Institute Details, Logo, etc.)
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(50) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(10) DEFAULT 'text' CHECK (setting_type IN ('text', 'image', 'number', 'json')),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_settings_modtime BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Activities Log Table
CREATE TABLE IF NOT EXISTS activities (
    id SERIAL PRIMARY KEY,
    user_type VARCHAR(10) NOT NULL CHECK (user_type IN ('admin', 'student')),
    user_id VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Certificates Table
CREATE TABLE IF NOT EXISTS certificates (
    id SERIAL PRIMARY KEY,
    student_code VARCHAR(50) NOT NULL,
    certificate_number VARCHAR(50) UNIQUE NOT NULL,
    issue_date DATE NOT NULL,
    completion_date DATE NOT NULL,
    grade VARCHAR(10),
    percentage DECIMAL(5,2),
    verification_code VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_code) REFERENCES students(student_code) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX idx_students_code ON students(student_code);
CREATE INDEX idx_students_course ON students(course_code);
CREATE INDEX idx_students_batch ON students(batch_id);
CREATE INDEX idx_payments_student ON fee_payments(student_code);
CREATE INDEX idx_results_student ON results(student_code);
CREATE INDEX idx_attendance_student ON attendance(student_code);
CREATE INDEX idx_attendance_batch ON attendance(batch_id);
CREATE INDEX idx_activities_user ON activities(user_type, user_id);
CREATE INDEX idx_activities_date ON activities(created_at);

-- Insert Default Admin
INSERT INTO admins (username, password, name, email) VALUES 
('admin', '$2b$10$rK/8J3qJqJqJqJqJqJqJqO', 'Administrator', 'admin@brightleaf.com')
ON CONFLICT (username) DO NOTHING;

-- Note: The password above is a bcrypt hash. For testing, you can update with: 
-- UPDATE admins SET password = 'admin123' WHERE username = 'admin';

-- Insert Default Institute Settings
INSERT INTO settings (setting_key, setting_value, setting_type, description) VALUES
('institute_name', 'Brightleaf Academy', 'text', 'Institute Name'),
('institute_address', '123 Education Street, City - 12345', 'text', 'Institute Address'),
('institute_phone', '+91 99644 64463', 'text', 'Institute Phone'),
('institute_email', 'info@brightleafacademy.com', 'text', 'Institute Email'),
('institute_website', '', 'text', 'Institute Website URL'),
('institute_logo', '/uploads/logo.png', 'image', 'Institute Logo URL'),
('certificate_template', '', 'image', 'Certificate Template URL'),
('certificate_layout', '{\"student_name\":{\"top\":45,\"left\":50},\"course_name\":{\"top\":60,\"left\":50},\"issue_date\":{\"top\":75,\"left\":50},\"verification_code\":{\"top\":85,\"left\":50}}', 'json', 'Certificate Layout Coordinates'),
('certificate_seal', '', 'image', 'Certificate Seal URL'),
('certificate_signature', '', 'image', 'Certificate Signature URL'),
('default_password_policy', 'student_code', 'text', 'Default Password Policy')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert Default Courses
INSERT INTO courses (course_code, course_name, fee, duration, description) VALUES
('basic', 'Basic Computer', 5000.00, '2 months', 'Fundamental computer skills and operations'),
('programming', 'Programming', 15000.00, '6 months', 'Learn programming languages and concepts'),
('design', 'Design & Multimedia', 12000.00, '4 months', 'Graphic design and multimedia tools'),
('tally', 'Tally & Accounting', 8000.00, '3 months', 'Accounting with Tally software'),
('digital', 'Digital Marketing', 10000.00, '3 months', 'Digital marketing strategies and tools'),
('advanced', 'Advanced Diploma', 25000.00, '12 months', 'Comprehensive diploma program')
ON CONFLICT (course_code) DO NOTHING;

-- Insert Default Batches
INSERT INTO batches (batch_name, course_code, timing, days, max_students) VALUES
('Morning Batch - Basic', 'basic', '09:00 AM - 11:00 AM', 'Mon, Wed, Fri', 30),
('Evening Batch - Basic', 'basic', '05:00 PM - 07:00 PM', 'Tue, Thu, Sat', 30),
('Morning Batch - Programming', 'programming', '10:00 AM - 01:00 PM', 'Mon, Wed, Fri', 25),
('Evening Batch - Programming', 'programming', '04:00 PM - 07:00 PM', 'Tue, Thu, Sat', 25),
('Weekend Batch - Design', 'design', '10:00 AM - 02:00 PM', 'Sat, Sun', 20),
('Morning Batch - Tally', 'tally', '09:00 AM - 11:00 AM', 'Mon, Tue, Wed, Thu, Fri', 30),
('Evening Batch - Digital', 'digital', '05:00 PM - 07:00 PM', 'Mon, Wed, Fri', 25),
('Full Day Batch - Advanced', 'advanced', '10:00 AM - 04:00 PM', 'Mon, Wed, Fri', 15)
ON CONFLICT DO NOTHING;
