// API Base URL - Automatically determine based on how the page is accessed
const getApiBaseUrl = () => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return '/api';
    }
    return 'http://localhost:3000/api';
};

const API_BASE_URL = getApiBaseUrl();

// Generate unique student code
function generateStudentCode() {
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `BL${year}${random}`;
}

// Global settings
let settings = {};

// Login Handler
async function handleLogin(type, e) {
    e.preventDefault();

    if (type === 'admin') {
        const username = document.getElementById('adminUsername').value;
        const user = document.getElementById('adminUsername').value;
        const pass = document.getElementById('adminPassword').value;

        try {
            const res = await fetch(`${API_BASE_URL}/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user, password: pass })
            });
            const data = await res.json();
            
            if (data.success) {
                localStorage.setItem('authType', 'admin');
                localStorage.setItem('adminUser', JSON.stringify(data.admin));
                showToast('Welcome, Administrator!', 'success');
                checkAuth();
            } else {
                showToast(data.error || 'Invalid credentials', 'error');
            }
        } catch (err) {
            showToast('Login failed', 'error');
        }
    } else if (type === 'student') {
        const code = document.getElementById('studentCode').value;
        const pass = document.getElementById('studentPassword').value;
        
        try {
            const res = await fetch(`${API_BASE_URL}/student/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentCode: code, password: pass })
            });
            const data = await res.json();
            
            if (data.success) {
                localStorage.setItem('authType', 'student');
                localStorage.setItem('studentUser', JSON.stringify(data.student));
                showToast('Welcome back!', 'success');
                checkAuth();
            } else {
                showToast(data.error || 'Invalid credentials', 'error');
            }
        } catch (err) {
            showToast('Login failed', 'error');
        }
    }
}

// Logout
function logout() {
    localStorage.clear();
    showPage('loginPage');
    document.getElementById('adminLoginForm').reset();
    document.getElementById('studentLoginForm').reset();
    showToast('Logged out successfully', 'success');
}

// Check authentication
function checkAuth() {
    const authType = localStorage.getItem('authType');
    
    updateGlobalBranding();

    if (!authType) {
        showPage('loginPage');
        return null;
    }

    if (authType === 'admin') {
        showPage('adminDashboard');
        loadAdminDashboard();
        return 'admin';
    } else if (authType === 'student') {
        const student = JSON.parse(localStorage.getItem('studentUser'));
        showPage('studentDashboard');
        loadStudentDashboard(student.studentCode || student.student_code);
        return 'student';
    }

    showPage('loginPage');
    return null;
}

// ==================== PAGE NAVIGATION ====================

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

// ==================== ADMIN DASHBOARD ====================

// ==================== UTILITY FUNCTIONS ====================

function generatePaymentId() {
    return 'PAY' + Date.now();
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatBatch(batch) {
    const batchMap = {
        'morning': 'Morning (9:00 AM - 12:00 PM)',
        'afternoon': 'Afternoon (2:00 PM - 5:00 PM)',
        'evening': 'Evening (5:30 PM - 8:30 PM)'
    };
    return batchMap[batch] || batch;
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ==================== ADMIN DASHBOARD LOGIC ====================

async function loadAdminDashboard() {
    try {
        const res = await fetch('http://localhost:3000/api/dashboard/stats');
        const stats = await res.json();
        
        document.getElementById('totalStudents').textContent = stats.totalStudents || 0;
        document.getElementById('activeStudents').textContent = stats.activeStudents || 0;
        document.getElementById('totalCollected').textContent = `₹${(stats.totalCollected || 0).toLocaleString()}`;
        document.getElementById('pendingFees').textContent = `₹${(stats.pendingFees || 0).toLocaleString()}`;
        
        // Load recent activities
        const activityList = document.getElementById('recentActivitiesList');
        if (stats.recentActivities && stats.recentActivities.length > 0) {
            activityList.innerHTML = stats.recentActivities.map(a => `
                <div class="activity-item">
                    <div class="activity-content">
                        <strong>${a.action}</strong>
                        <p>${a.details}</p>
                        <span>${new Date(a.created_at).toLocaleString()}</span>
                    </div>
                </div>
            `).join('');
        } else {
            activityList.innerHTML = '<p class="no-data">No recent activities</p>';
        }
        
        loadStudentsTable();
        loadCoursesForAdmission();
    } catch (err) {
        console.error('Error loading dashboard stats:', err);
    }
}

async function loadStudentsTable(search = '') {
    const tableContainer = document.getElementById('studentsTable');
    if (!tableContainer) return;
    tableContainer.innerHTML = '<div class="loading">Loading students...</div>';
    
    try {
        const res = await fetch(`${API_BASE_URL}/students?search=${search}`);
        const students = await res.json();
        
        if (students.length === 0) {
            tableContainer.innerHTML = '<p class="no-data">No students found</p>';
            return;
        }
        
        tableContainer.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Name</th>
                        <th>Course</th>
                        <th>Attendance</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${students.map(s => `
                        <tr>
                            <td>${s.student_code}</td>
                            <td>${s.name}</td>
                            <td>${s.course_name || s.course_code}</td>
                            <td><strong>${s.attendance_percentage || 0}%</strong></td>
                            <td><span class="status-badge status-${s.status}">${s.status.toUpperCase()}</span></td>
                            <td>
                                <button onclick="editStudent('${s.student_code}')" class="btn-icon" title="Edit"><i class="fas fa-edit"></i></button>
                                <button onclick="deleteStudent('${s.student_code}')" class="btn-icon delete" title="Delete"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        tableContainer.innerHTML = '<p class="error">Error loading students</p>';
    }
}

async function loadCoursesForAdmission() {
    try {
        const res = await fetch('http://localhost:3000/api/courses');
        const courses = await res.json();
        const courseSelect = document.getElementById('courseSelect');
        if (!courseSelect) return;
        
        courseSelect.innerHTML = '<option value="">Select Course</option>' + 
            courses.map(c => `<option value="${c.course_code}" data-fee="${c.fee}">${c.course_name} - ₹${c.fee}</option>`).join('');
            
        courseSelect.addEventListener('change', function() {
            const selected = this.options[this.selectedIndex];
            const fee = selected.getAttribute('data-fee');
            const totalFeeInput = document.getElementById('totalFeeInput');
            const originalFeeDisplay = document.getElementById('originalFeeDisplay');
            
            if (totalFeeInput) totalFeeInput.value = fee || '';
            if (originalFeeDisplay) originalFeeDisplay.value = fee || '';
            
            loadBatchesForAdmission(this.value);
        });

        // Toggle reduction details
        const isReducedCheck = document.getElementById('isReducedFee');
        if (isReducedCheck) {
            isReducedCheck.addEventListener('change', function() {
                const details = document.getElementById('reductionDetails');
                const totalFeeInput = document.getElementById('totalFeeInput');
                if (details) details.style.display = this.checked ? 'block' : 'none';
                if (totalFeeInput) {
                    if (this.checked) {
                        totalFeeInput.removeAttribute('readonly');
                        totalFeeInput.focus();
                    } else {
                        // Reset to course fee
                        const selected = courseSelect.options[courseSelect.selectedIndex];
                        totalFeeInput.value = selected ? selected.getAttribute('data-fee') : '';
                        totalFeeInput.setAttribute('readonly', true);
                    }
                }
            });
        }
    } catch (err) {
        console.error('Error loading courses:', err);
    }
}

async function loadBatchesForAdmission(courseCode) {
    const batchSelect = document.getElementById('batchSelect');
    if (!batchSelect || !courseCode) {
        if (batchSelect) batchSelect.innerHTML = '<option value="">Select Course First</option>';
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE_URL}/batches?course=${courseCode}`);
        const batches = await res.json();
        
        if (batches.length === 0) {
            batchSelect.innerHTML = '<option value="">No batches available</option>';
        } else {
            batchSelect.innerHTML = batches.map(b => `<option value="${b.id}">${b.batch_name} (${b.timing})</option>`).join('');
        }
    } catch (err) {
        batchSelect.innerHTML = '<option value="">Error loading batches</option>';
    }
}

async function handleAdmissionSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const studentCode = generateStudentCode();
    
    // Add additional fields to FormData
    formData.append('student_code', studentCode);
    formData.append('admission_date', new Date().toISOString().split('T')[0]);
    if (!formData.get('password')) {
        formData.append('password', 'password123');
    }

    try {
        const res = await fetch(`${API_BASE_URL}/students`, {
            method: 'POST',
            body: formData // Send as FormData (multipart/form-data)
        });
        const result = await res.json();
        
        if (res.ok && result.success) {
            const admissionFee = parseFloat(formData.get('admission_fee'));
            if (admissionFee > 0) {
                await fetch(`${API_BASE_URL}/fee-payments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        student_code: studentCode,
                        amount: admissionFee,
                        payment_mode: 'cash',
                        payment_date: new Date().toISOString().split('T')[0],
                        remarks: 'Initial Admission Fee'
                    })
                });
            }
            
            showToast(`Admission complete! Code: ${studentCode}`, 'success');
            e.target.reset();
            loadAdminDashboard();
            // Scroll to students list
            setTimeout(() => {
                document.querySelector('[data-section="students"]').click();
            }, 1000);
        } else {
            showToast(result.error || 'Admission failed', 'error');
        }
    } catch (err) {
        showToast('Connection error', 'error');
    }
}

async function searchStudentForFee() {
    const studentCode = document.getElementById('feeStudentCode').value.trim().toUpperCase();
    if (!studentCode) return;
    
    try {
        const res = await fetch(`${API_BASE_URL}/students/${studentCode}`);
        const student = await res.json();
        
        if (student.error) {
            showToast('Student not found', 'error');
            return;
        }
        
        const totalFee = parseFloat(student.total_fee) || 0;
        const paidFee = parseFloat(student.paid_fee) || 0;
        const balanceFee = totalFee - paidFee;
        
        document.getElementById('feePaymentSection').style.display = 'block';
        document.getElementById('feeStudentDetails').innerHTML = `
            <div class="info-card">
                <h4>${student.name} (${student.student_code})</h4>
                <p>Course: ${student.course_name}</p>
                <p>Status: <span class="status-badge status-${student.status}">${student.status.toUpperCase()}</span></p>
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee;">
                    <p><strong>Total Fee:</strong> ₹${totalFee.toLocaleString()}</p>
                    <p><strong>Paid Fee:</strong> <span class="text-green">₹${paidFee.toLocaleString()}</span></p>
                    <p><strong>Balance:</strong> <span class="text-red">₹${balanceFee.toLocaleString()}</span></p>
                </div>
            </div>
        `;
        window.currentFeeStudent = student.student_code;
        loadFeeHistory(student.student_code);
    } catch (err) {
        showToast('Error searching student', 'error');
    }
}

async function loadFeeHistory(studentCode) {
    const container = document.getElementById('feeHistoryContainer');
    const table = document.getElementById('feeHistoryTable');
    if (!container || !table) return;
    
    try {
        const res = await fetch(`${API_BASE_URL}/students/${studentCode}/payments`);
        const payments = await res.json();
        
        container.style.display = 'block';
        
        if (payments.length === 0) {
            table.innerHTML = '<p class="no-data">No payment history found</p>';
            return;
        }
        
        table.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Mode</th>
                        <th>Reference</th>
                    </tr>
                </thead>
                <tbody>
                    ${payments.map(p => `
                        <tr>
                            <td>${new Date(p.payment_date).toLocaleDateString()}</td>
                            <td>₹${parseFloat(p.amount).toLocaleString()}</td>
                            <td>${(p.payment_mode || 'cash').toUpperCase()}</td>
                            <td>${p.reference_number || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        console.error('Error loading fee history:', err);
    }
}

// New function to exempt full balance
async function exemptFullBalance() {
    if (!window.currentFeeStudent) {
        showToast('Please search for a student first', 'error');
        return;
    }
    
    if (!confirm('Are you sure you want to exempt the ENTIRE remaining balance for this student? This will be recorded as a zero-payment exemption.')) return;
    
    try {
        const res = await fetch(`${API_BASE_URL}/fee-payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_code: window.currentFeeStudent,
                amount: 0, // Server will calculate remaining balance
                payment_mode: 'exemption',
                payment_date: new Date().toISOString().split('T')[0],
                remarks: 'Full balance exempted by Administrator'
            })
        });
        
        const result = await res.json();
        if (result.success) {
            showToast('Student balance exempted successfully!', 'success');
            searchStudentForFee(); // Refresh view
            loadAdminDashboard(); // Refresh stats
        } else {
            showToast(result.error || 'Exemption failed', 'error');
        }
    } catch (err) {
        showToast('Error processing exemption', 'error');
    }
}

async function handleFeePaymentSubmit(e) {
    e.preventDefault();
    if (!window.currentFeeStudent) {
        showToast('Please search for a student first', 'error');
        return;
    }
    
    const amount = parseFloat(document.getElementById('paymentAmount').value);
    const mode = document.getElementById('paymentMode').value;
    const reference = document.getElementById('paymentRef').value;
    const remarks = document.getElementById('paymentRemarks').value;
    
    try {
        const res = await fetch(`${API_BASE_URL}/fee-payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_code: window.currentFeeStudent,
                amount: amount,
                payment_mode: mode,
                reference_number: reference,
                payment_date: new Date().toISOString().split('T')[0],
                remarks: remarks
            })
        });
        
        const result = await res.json();
        if (result.success) {
            showToast('Payment/Exemption recorded successfully', 'success');
            e.target.reset();
            searchStudentForFee(); // Refresh details
            loadAdminDashboard(); // Refresh stats
        } else {
            showToast(result.error || 'Payment failed', 'error');
        }
    } catch (err) {
        showToast('Error recording payment', 'error');
    }
}

async function searchStudentForResult() {
    const studentCode = document.getElementById('resultStudentCode').value.trim().toUpperCase();
    if (!studentCode) return;
    
    try {
        const res = await fetch(`${API_BASE_URL}/students/${studentCode}`);
        if (!res.ok) throw new Error('Student not found');
        const s = await res.json();
        
        document.getElementById('resultEntrySection').style.display = 'block';
        document.getElementById('resultStudentCard').innerHTML = `<h4>Entering Result for: ${s.name}</h4>`;
        window.currentResultStudent = s;
        
        const subjectList = ['Theory', 'Practical', 'Viva', 'Assignment'];
        document.getElementById('subjectMarksContainer').innerHTML = subjectList.map(subj => `
            <div class="form-group">
                <label>${subj} Mark (Out of 100)</label>
                <input type="number" class="subject-mark" data-subject="${subj}" min="0" max="100" required>
            </div>
        `).join('');
    } catch (err) {
        showToast(err.message, 'error');
        document.getElementById('resultEntrySection').style.display = 'none';
    }
}

async function searchStudentForCertificate() {
    const studentCode = document.getElementById('certificateStudentCode').value.trim().toUpperCase();
    if (!studentCode) return;
    
    try {
        const res = await fetch('http://localhost:3000/api/certificates/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_code: studentCode })
        });
        const data = await res.json();
        
        if (data.success) {
            document.getElementById('certificatePreview').style.display = 'block';
            document.getElementById('certificateContent').innerHTML = `
                <div class="cert-success-card">
                    <i class="fas fa-check-circle"></i>
                    <p>Certificate Generated for <strong>${data.certificate.student_name}</strong></p>
                    <p>Course: ${data.certificate.course_name}</p>
                </div>
            `;
            window.currentCertificate = data.certificate;
        } else {
            showToast(data.error || 'Student not eligible', 'error');
        }
    } catch (err) {
        showToast('Error', 'error');
    }
}

async function handleResultSubmit(e) {
    e.preventDefault();
    if (!window.currentResultStudent) return;
    
    const marks = {};
    document.querySelectorAll('.subject-mark').forEach(input => {
        marks[input.getAttribute('data-subject')] = parseFloat(input.value);
    });
    
    const percentage = parseFloat(document.getElementById('percentage').value);
    const grade = document.getElementById('overallGrade').value;
    const remarks = document.getElementById('resultRemarks').value;
    
    const resultData = {
        student_code: window.currentResultStudent.student_code,
        course_code: window.currentResultStudent.course_code,
        exam_date: new Date().toISOString().split('T')[0],
        subject_marks: marks,
        total_marks: Object.keys(marks).length * 100,
        percentage: percentage,
        grade: grade,
        remarks: remarks
    };
    
    try {
        const res = await fetch('http://localhost:3000/api/results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resultData)
        });
        
        if (res.ok) {
            showToast('Result saved successfully', 'success');
            document.getElementById('resultEntrySection').style.display = 'none';
            document.getElementById('resultForm').reset();
        } else {
            showToast('Failed to save result', 'error');
        }
    } catch (err) {
        showToast('Error saving result', 'error');
    }
}

// ==================== STUDENT DASHBOARD ====================

async function loadStudentDashboard(studentCode) {
    try {
        const res = await fetch(`${API_BASE_URL}/students/${studentCode}`);
        if (!res.ok) throw new Error('Student not found');
        const student = await res.json();
        
        document.getElementById('studentNameDisplay').textContent = student.name;
        document.getElementById('studentGreeting').textContent = student.name;
        
        document.getElementById('studentCourseDisplay').textContent = `Enrolled in ${student.course_name || student.course_code}`;
        
        // Update stats
        document.getElementById('studentAttendance').textContent = `${student.attendance_percentage || 0}%`;
        document.getElementById('studentProgress').textContent = `${student.progress_percentage || 0}%`;
        
        // Load Details
        loadStudentProfile(student);
        loadStudentResults(studentCode);
        loadStudentFees(studentCode, student);
        
        // Certificates
        loadStudentCertificate(studentCode);
    } catch(err) {
        showToast('Error loading dashboard: ' + err.message, 'error');
        console.error(err);
        logout();
    }
}

function loadStudentProfile(student) {
    document.getElementById('studentProfileCard').innerHTML = `
        <div class="profile-header-info">
            <div class="profile-photo-large">
                ${student.photo_path ? `<img src="${student.photo_path}" alt="Student Photo" style="width: 120px; height: 120px; border-radius: 10px; object-fit: cover; border: 3px solid var(--primary);">` : `<i class="fas fa-user-circle fa-7x" style="color: #ddd;"></i>`}
            </div>
            <div class="profile-basic">
                <h3>${student.name}</h3>
                <p>${student.student_code}</p>
            </div>
        </div>
        <div class="profile-grid">
            <div class="profile-item">
                <label>Student Code</label>
                <span>${student.student_code}</span>
            </div>
            <div class="profile-item">
                <label>Aadhar Number</label>
                <span>${student.aadhar_number || 'N/A'}</span>
            </div>
            <div class="profile-item">
                <label>Email</label>
                <span>${student.email || 'N/A'}</span>
            </div>
            <div class="profile-item">
                <label>Phone</label>
                <span>${student.phone || 'N/A'}</span>
            </div>
            <div class="profile-item">
                <label>Course</label>
                <span>${student.course_name || student.course_code || 'N/A'}</span>
            </div>
            <div class="profile-item">
                <label>Batch Name</label>
                <span>${student.batch_name || 'N/A'}</span>
            </div>
            <div class="profile-item">
                <label>Guardian Name</label>
                <span>${student.guardian_name || 'N/A'}</span>
            </div>
            <div class="profile-item">
                <label>Admission Date</label>
                <span>${student.admission_date ? new Date(student.admission_date).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div class="profile-item">
                <label>City</label>
                <span>${student.city || 'N/A'}, ${student.state || 'N/A'}</span>
            </div>
            <div class="profile-item">
                <label>Status</label>
                <span class="status-badge status-${(student.status || 'active').toLowerCase()}">${(student.status || 'Active').toUpperCase()}</span>
            </div>
        </div>
    `;
}

async function loadStudentResults(studentCode) {
    const resultsCard = document.getElementById('studentResultsCard');
    
    try {
        const res = await fetch(`${API_BASE_URL}/students/${studentCode}/results`);
        if (!res.ok) throw new Error('No results');
        const results = await res.json();
        
        if (!results || results.length === 0) {
            resultsCard.innerHTML = `
                <div class="no-result">
                    <i class="fas fa-clipboard-list"></i>
                    <p>Results not available yet</p>
                </div>
            `;
            return;
        }
        
        const result = results[0]; // Display latest result
        
        let subjectsHTML = '';
        if (result.subject_marks) {
            let marksObj = typeof result.subject_marks === 'string' ? JSON.parse(result.subject_marks) : result.subject_marks;
            subjectsHTML = Object.entries(marksObj).map(([subject, mark]) => `
                <div style="display: flex; justify-content: space-between; padding: 10px; background: #f8f9fa; margin-bottom: 5px; border-radius: 5px;">
                    <span>${subject}</span>
                    <span><strong>${mark}</strong></span>
                </div>
            `).join('');
        }
        
        resultsCard.innerHTML = `
            <div class="results-grid">
                <div class="result-item">
                    <h4>${result.percentage}%</h4>
                    <p>Percentage</p>
                </div>
                <div class="result-item">
                    <h4>${result.grade}</h4>
                    <p>Grade</p>
                </div>
                <div class="result-item">
                    <h4>${result.marks_obtained || 0}/${result.total_marks || 0}</h4>
                    <p>Total Marks</p>
                </div>
            </div>
            ${subjectsHTML ? `
            <div style="margin-top: 20px;">
                <h4 style="margin-bottom: 15px;">Subject-wise Marks:</h4>
                ${subjectsHTML}
            </div>` : ''}
            ${result.remarks ? `<div style="margin-top: 15px; padding: 15px; background: #f8f9fa; border-radius: 5px;"><strong>Remarks:</strong> ${result.remarks}</div>` : ''}
        `;
    } catch(err) {
        resultsCard.innerHTML = `
            <div class="no-result">
                <i class="fas fa-clipboard-list"></i>
                <p>Results not available yet</p>
            </div>
        `;
    }
}

async function loadStudentFees(studentCode, studentData) {
    const feeCard = document.getElementById('studentFeeCard');
    
    try {
        const coursesRes = await fetch('http://localhost:3000/api/courses');
        const courses = await coursesRes.json();
        const course = courses.find(c => c.course_code === studentData.course_code);
        const totalFee = course ? parseFloat(course.fee) : 0;
        
        const res = await fetch(`${API_BASE_URL}/students/${studentCode}/payments`);
        let payments = [];
        if (res.ok) payments = await res.json();
        
        const paid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const balance = totalFee - paid;
        
        let paymentHistoryHTML = '';
        if (payments.length > 0) {
            paymentHistoryHTML = `
                <h4 style="margin-top: 20px; margin-bottom: 15px;">Payment History:</h4>
                <table class="fee-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Mode</th>
                            <th>Reference</th>
                            <th>Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payments.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date)).map(payment => `
                            <tr>
                                <td>${new Date(payment.payment_date).toLocaleDateString()}</td>
                                <td>₹${parseFloat(payment.amount).toLocaleString()}</td>
                                <td>${payment.payment_mode || '-'}</td>
                                <td>${payment.reference_number || '-'}</td>
                                <td>${payment.remarks || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
        
        feeCard.innerHTML = `
            <div class="fee-summary">
                <div class="fee-summary-item paid">
                    <h3>₹${paid.toLocaleString()}</h3>
                    <p>Total Paid</p>
                </div>
                <div class="fee-summary-item ${balance <= 0 ? 'paid' : 'balance'}">
                    <h3>₹${Math.max(0, balance).toLocaleString()}</h3>
                    <p>${balance <= 0 ? 'Fully Paid' : 'Balance Due'}</p>
                </div>
            </div>
            ${paymentHistoryHTML}
        `;
        
        // Update dashboard status
        const feeStatus = document.getElementById('studentFeeStatus');
        if (feeStatus) {
            feeStatus.textContent = `₹${Math.max(0, balance).toLocaleString()}`;
            feeStatus.className = balance > 0 ? 'text-red' : 'text-green';
        }
    } catch(err) {
        feeCard.innerHTML = `<p>Error loading fee data</p>`;
    }
}

async function loadStudentCertificate(studentCode) {
    const certificateCard = document.getElementById('studentCertificateCard');
    
    // Show loading state
    certificateCard.innerHTML = `<div style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin fa-3x" style="color: var(--primary);"></i><p style="margin-top: 15px;">Loading certificate...</p></div>`;
    
    try {
        // Fetch certificate from API
        const certRes = await fetch(`${API_BASE_URL}/certificates/student/${studentCode}`);
        if (!certRes.ok) throw new Error('Certificate not available');
        const certificate = await certRes.json();
        
        // Fetch settings from API
        const settingsRes = await fetch(`${API_BASE_URL}/settings`);
        const settingsArray = await settingsRes.json();
        const settings = {};
        settingsArray.forEach(s => settings[s.setting_key] = s.setting_value);
        
        // Store globally for download functionality
        window.currentCertificateData = certificate;
        window.currentSettingsData = settings;
        
        const hasCustomTemplate = settings.certificate_template && settings.certificate_layout;
        let previewHTML = '';
        
        if (hasCustomTemplate) {
            let layout = settings.certificate_layout;
            try {
                if (typeof layout === 'string') layout = JSON.parse(layout);
            } catch (e) { layout = {}; }

            previewHTML = `
                <div class="certificate-preview" style="box-shadow: none; padding: 0;">
                    <div class="certificate-preview-custom" style="position: relative; max-width: 1000px; margin: 0 auto;">
                        <img src="${settings.certificate_template}" alt="Certificate" style="max-width: 100%; display: block;" />
                        <div class="cert-data" style="top: ${layout.student_name?.top || 45}%; left: ${layout.student_name?.left || 50}%; font-size: 24px; position: absolute; transform: translate(-50%, -50%); color: #333; font-weight: bold; white-space: nowrap;">${certificate.student_name || ''}</div>
                        <div class="cert-data" style="top: ${layout.course_name?.top || 60}%; left: ${layout.course_name?.left || 50}%; font-size: 20px; position: absolute; transform: translate(-50%, -50%); color: #333; font-weight: bold; white-space: nowrap;">${certificate.course_name || ''}</div>
                        <div class="cert-data" style="top: ${layout.issue_date?.top || 75}%; left: ${layout.issue_date?.left || 50}%; font-size: 16px; position: absolute; transform: translate(-50%, -50%); color: #333; font-weight: bold; white-space: nowrap;">${new Date(certificate.issue_date).toLocaleDateString()}</div>
                        <div class="cert-data" style="top: ${layout.verification_code?.top || 85}%; left: ${layout.verification_code?.left || 50}%; font-size: 14px; position: absolute; transform: translate(-50%, -50%); color: #333; font-weight: bold; white-space: nowrap;">${certificate.verification_code || ''}</div>
                    </div>
                </div>
                <div class="certificate-actions" style="margin-top: 20px;">
                    <button class="btn-primary" onclick="downloadStudentCertificate()">
                        <i class="fas fa-download"></i> Download Certificate
                    </button>
                </div>
            `;
        } else {
            const instituteName = settings.institute_name || 'Brightleaf Academy';
            const instituteAddress = settings.institute_address || '';
            const institutePhone = settings.institute_phone || '';
            
            previewHTML = `
                <div class="certificate-preview" style="box-shadow: none; padding: 0;">
                    <div class="certificate-content">
                        <div class="certificate-header">
                            <i class="fas fa-graduation-cap" style="font-size: 48px; color: var(--primary); margin-bottom: 15px;"></i>
                            <h1>Certificate of Completion</h1>
                            <p>This certificate is proudly presented to</p>
                        </div>
                        <div class="certificate-body">
                            <h3>${certificate.student_name || ''}</h3>
                            <h2>Student Code: ${certificate.student_code || studentCode}</h2>
                            <p style="font-size: 18px; margin: 15px 0;">has successfully completed the course</p>
                            <div class="certificate-details">
                                <div class="certificate-detail-item">
                                    <label>Course Name</label>
                                    <span>${certificate.course_name || 'N/A'}</span>
                                </div>
                                <div class="certificate-detail-item">
                                    <label>Duration</label>
                                    <span>${certificate.course_duration || 'N/A'}</span>
                                </div>
                                <div class="certificate-detail-item">
                                    <label>Percentage</label>
                                    <span>${certificate.percentage || 0}%</span>
                                </div>
                                <div class="certificate-detail-item">
                                    <label>Grade</label>
                                    <span>${certificate.grade || 'N/A'}</span>
                                </div>
                                <div class="certificate-detail-item">
                                    <label>Issue Date</label>
                                    <span>${new Date(certificate.issue_date).toLocaleDateString()}</span>
                                </div>
                                <div class="certificate-detail-item">
                                    <label>Verification Code</label>
                                    <span>${certificate.verification_code || ''}</span>
                                </div>
                            </div>
                            <div class="certificate-footer">
                                <h3>${instituteName}</h3>
                                <p>${instituteAddress}</p>
                                <p>${institutePhone}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="certificate-actions" style="margin-top: 20px;">
                    <button class="btn-primary" onclick="downloadStudentCertificate()">
                        <i class="fas fa-download"></i> Download Certificate
                    </button>
                </div>
            `;
        }
        
        certificateCard.innerHTML = previewHTML;
        
    } catch(err) {
        console.error('Error loading certificate:', err);
        certificateCard.innerHTML = `
            <div class="certificate-not-available">
                <i class="fas fa-lock"></i>
                <p>Certificate will be available after course completion</p>
            </div>
        `;
    }
}

function downloadStudentCertificate() {
    if (!window.currentCertificateData || !window.currentSettingsData) {
        showToast('Certificate data not loaded yet', 'error');
        return;
    }
    
    const cert = window.currentCertificateData;
    const settings = window.currentSettingsData;
    const instituteName = settings.institute_name || 'Brightleaf Academy';
    const instituteAddress = settings.institute_address || '';
    const institutePhone = settings.institute_phone || '';
    const hasCustomTemplate = settings.certificate_template && settings.certificate_layout;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showToast('Pop-up blocked! Please allow pop-ups for this site.', 'error');
        return;
    }

    let bodyContent = '';

    if (hasCustomTemplate) {
        let layout = settings.certificate_layout;
        try {
            if (typeof layout === 'string') layout = JSON.parse(layout);
        } catch (e) { layout = {}; }

        const templateUrl = new URL(settings.certificate_template, window.location.origin).href;

        bodyContent = `
            <div class="certificate-custom">
                <img src="${templateUrl}" alt="Certificate" />
                <div class="cert-data" style="top: ${layout.student_name?.top || 45}%; left: ${layout.student_name?.left || 50}%; font-size: 28px;">${cert.student_name || ''}</div>
                <div class="cert-data" style="top: ${layout.course_name?.top || 60}%; left: ${layout.course_name?.left || 50}%; font-size: 22px;">${cert.course_name || ''}</div>
                <div class="cert-data" style="top: ${layout.issue_date?.top || 75}%; left: ${layout.issue_date?.left || 50}%; font-size: 18px;">${new Date(cert.issue_date).toLocaleDateString()}</div>
                <div class="cert-data" style="top: ${layout.verification_code?.top || 85}%; left: ${layout.verification_code?.left || 50}%; font-size: 14px;">${cert.verification_code || ''}</div>
            </div>
        `;
    } else {
        bodyContent = `
            <div class="certificate">
                <div class="header">
                    <div style="font-size: 48px; color: #667eea; margin-bottom: 15px;">🎓</div>
                    <h1>Certificate of Completion</h1>
                    <p>This certificate is proudly presented to</p>
                </div>
                <div class="body">
                    <h2>${cert.student_name || ''}</h2>
                    <p>Student Code: ${cert.student_code || ''}</p>
                    <h3>has successfully completed the course</h3>
                    <div class="details">
                        <div class="detail-item">
                            <label>Course Name</label>
                            <span>${cert.course_name || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Duration</label>
                            <span>${cert.course_duration || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Percentage</label>
                            <span>${cert.percentage || 0}%</span>
                        </div>
                        <div class="detail-item">
                            <label>Grade</label>
                            <span>${cert.grade || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Issue Date</label>
                            <span>${new Date(cert.issue_date).toLocaleDateString()}</span>
                        </div>
                        <div class="detail-item">
                            <label>Verification Code</label>
                            <span>${cert.verification_code || ''}</span>
                        </div>
                    </div>
                    <div class="footer">
                        <h3>${instituteName}</h3>
                        <p>${instituteAddress}</p>
                        <p>${institutePhone}</p>
                    </div>
                </div>
            </div>
        `;
    }

    printWindow.document.write(`
        <html>
        <head>
            <title>Certificate - ${cert.student_name || 'Student'}</title>
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Poppins', 'Georgia', serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    background: #f0f0f0;
                }
                .certificate {
                    width: 900px;
                    padding: 60px;
                    background: linear-gradient(to bottom right, #fffaf0, #fff);
                    border: 10px solid #667eea;
                    position: relative;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                }
                .certificate::before {
                    content: '';
                    position: absolute;
                    top: 15px; left: 15px; right: 15px; bottom: 15px;
                    border: 3px solid #ffd700;
                }
                .header { text-align: center; margin-bottom: 30px; }
                .header h1 {
                    font-size: 36px; color: #667eea; font-weight: 900;
                    text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px;
                }
                .header p { font-size: 14px; color: #666; }
                .body { text-align: center; }
                .body h2 { font-size: 28px; color: #1a1a2e; font-weight: 700; margin: 20px 0; }
                .body p { color: #666; font-size: 16px; }
                .body h3 { font-size: 20px; color: #764ba2; margin: 25px 0; }
                .details {
                    display: grid; grid-template-columns: repeat(2, 1fr);
                    gap: 20px; margin: 30px 0; text-align: left;
                }
                .detail-item { padding: 10px; border-bottom: 1px solid #e0e0e0; }
                .detail-item label { display: block; font-size: 12px; color: #666; text-transform: uppercase; }
                .detail-item span { font-size: 16px; font-weight: 600; color: #1a1a2e; }
                .footer { margin-top: 40px; text-align: center; }
                .footer h3 { font-size: 24px; color: #764ba2; font-weight: 900; margin-bottom: 10px; }
                .footer p { font-size: 12px; color: #666; }

                /* Custom template styles */
                .certificate-custom {
                    position: relative;
                    max-width: 1000px;
                    margin: 0 auto;
                }
                .certificate-custom img {
                    width: 100%;
                    display: block;
                }
                .cert-data {
                    position: absolute;
                    transform: translate(-50%, -50%);
                    white-space: nowrap;
                    font-family: 'Poppins', sans-serif;
                    font-weight: bold;
                    color: #333;
                }

                @media print {
                    body { background: white; }
                    .certificate { box-shadow: none; }
                }
            </style>
        </head>
        <body>
            ${bodyContent}
        </body>
        </html>
    `);

    printWindow.document.close();

    printWindow.onload = function() {
        setTimeout(() => {
            printWindow.print();
        }, 300);
    };

    setTimeout(() => {
        try { printWindow.print(); } catch(e) {}
    }, 2000);

    showToast('Certificate opened for download!', 'success');
}

// ==================== UTILITY FUNCTIONS ====================

function generatePaymentId() {
    return 'PAY' + Date.now();
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatBatch(batch) {
    const batchMap = {
        'morning': 'Morning (9:00 AM - 12:00 PM)',
        'afternoon': 'Afternoon (2:00 PM - 5:00 PM)',
        'evening': 'Evening (5:30 PM - 8:30 PM)'
    };
    return batchMap[batch] || batch;
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ==================== NAVIGATION ====================

// Dashboard navigation
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
        const sectionId = this.getAttribute('data-section');
        
        // If it's a direct link (like Settings -> admin-management.html), allow it
        if (!sectionId && this.getAttribute('href') && this.getAttribute('href') !== '#') {
            return;
        }
        
        if (!sectionId) return;
        
        e.preventDefault();
        
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        this.classList.add('active');
        
        document.querySelectorAll('.dashboard-section').forEach(section => {
            section.classList.remove('active');
        });
        
        const targetSection = document.getElementById(`admin-${sectionId}`);
        if (targetSection) {
            targetSection.classList.add('active');
        }
    });
});

// Login tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.login-form').forEach(f => f.classList.remove('active'));
        
        this.classList.add('active');
        const tab = this.getAttribute('data-tab');
        document.getElementById(`${tab}LoginForm`).classList.add('active');
    });
});

// Search functionality
document.getElementById('studentSearch')?.addEventListener('input', function(e) {
    loadStudentsTable(e.target.value);
});

// Form submissions
document.getElementById('adminLoginForm')?.addEventListener('submit', (e) => handleLogin('admin', e));
document.getElementById('studentLoginForm')?.addEventListener('submit', (e) => handleLogin('student', e));
document.getElementById('admissionForm')?.addEventListener('submit', handleAdmissionSubmit);
document.getElementById('feePaymentForm')?.addEventListener('submit', handleFeePaymentSubmit);
document.getElementById('resultForm')?.addEventListener('submit', handleResultSubmit);

async function editStudent(studentCode) {
    try {
        const res = await fetch(`${API_BASE_URL}/students/${studentCode}`);
        const s = await res.json();
        
        const modal = document.getElementById('editStudentModal');
        const content = document.getElementById('editFormContent');
        
        content.innerHTML = `
            <input type="hidden" name="student_code" value="${s.student_code}">
            <div class="form-row">
                <div class="form-group"><label>Name</label><input type="text" name="name" value="${s.name}" required></div>
                <div class="form-group"><label>Email</label><input type="email" name="email" value="${s.email}" required></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Phone</label><input type="tel" name="phone" value="${s.phone}" required></div>
                <div class="form-group">
                    <label>Status</label>
                    <select name="status">
                        <option value="active" ${s.status === 'active' ? 'selected' : ''}>Active</option>
                        <option value="inactive" ${s.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                        <option value="completed" ${s.status === 'completed' ? 'selected' : ''}>Completed</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Attendance (%)</label><input type="number" name="attendance_percentage" value="${s.attendance_percentage || 0}" min="0" max="100" required></div>
                <div class="form-group"><label>Course Progress (%)</label><input type="number" name="progress_percentage" value="${s.progress_percentage || 0}" min="0" max="100" required></div>
            </div>
        `;
        
        modal.style.display = 'block';

        document.getElementById('editStudentForm').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const updateData = {
                name: formData.get('name'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                status: formData.get('status'),
                attendance_percentage: parseFloat(formData.get('attendance_percentage')),
                progress_percentage: parseFloat(formData.get('progress_percentage')),
                dob: s.dob,
                guardian_name: s.guardian_name,
                address: s.address,
                course: s.course_code,
                batch_id: s.batch_id
            };
            
            try {
                const upRes = await fetch(`${API_BASE_URL}/students/${studentCode}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ studentData: updateData })
                });
                if (upRes.ok) {
                    showToast('Student updated successfully', 'success');
                    modal.style.display = 'none';
                    loadStudentsTable();
                    loadAdminDashboard();
                }
            } catch (err) { showToast('Update failed', 'error'); }
        };
    } catch (err) { showToast('Error loading student', 'error'); }
}

// Global Modal/UI Utilities
window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
};

window.openStudentModal = function() {
    const admissionLink = document.querySelector('[data-section="admissions"]');
    if (admissionLink) admissionLink.click();
    const element = document.getElementById('admin-admissions');
    if (element) element.scrollIntoView({ behavior: 'smooth' });
};

window.generateCertificate = async function() {
    if (!window.currentCertificate) return;
    searchStudentForCertificate();
};

window.downloadCertificate = function() {
    if (!window.currentCertificate) {
        showToast('No certificate generated', 'error');
        return;
    }
    
    // We need settings for the full logic
    fetch('http://localhost:3000/api/settings')
        .then(res => res.json())
        .then(settingsArray => {
            const settings = {};
            settingsArray.forEach(s => settings[s.setting_key] = s.setting_value);
            window.currentSettingsData = settings;
            window.currentCertificateData = window.currentCertificate;
            
            // Call the existing download logic from script.js template
            if (typeof downloadStudentCertificate === 'function') {
                downloadStudentCertificate();
            } else {
                showToast('Download function not found', 'error');
            }
        })
        .catch(err => showToast('Error fetching settings', 'error'));
};

async function deleteStudent(studentCode) {
    if (!confirm(`Are you sure you want to delete student ${studentCode}?`)) return;
    
    try {
        const res = await fetch(`${API_BASE_URL}/students/${studentCode}`, {
            method: 'DELETE'
        });
        if (res.ok) {
            showToast('Student deleted successfully', 'success');
            loadStudentsTable();
            loadAdminDashboard();
        }
    } catch (err) { showToast('Delete failed', 'error'); }
}

// ==================== INITIALIZATION ====================

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    updateGlobalBranding();

    // Login page tab switching logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.login-form').forEach(f => f.classList.remove('active'));
            
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(`${tabId}LoginForm`).classList.add('active');
        });
    });

    // Form Submissions
    const adminForm = document.getElementById('adminLoginForm');
    if (adminForm) adminForm.addEventListener('submit', (e) => handleLogin('admin', e));

    const studentForm = document.getElementById('studentLoginForm');
    if (studentForm) studentForm.addEventListener('submit', (e) => handleLogin('student', e));

    // Dashboard Navigation
    document.querySelectorAll('.nav-link[data-section]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('data-section');
            
            // Show page/section logic
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            document.querySelectorAll('.dashboard-section').forEach(s => s.classList.remove('active'));
            const section = document.getElementById(`admin-${sectionId}`) || document.getElementById(`student-${sectionId}`);
            if (section) section.classList.add('active');
        });
    });

    // Student Admission Form Submit
    const admissionForm = document.getElementById('admissionForm');
    if (admissionForm) admissionForm.addEventListener('submit', handleAdmissionSubmit);

    // Fee payment form
    const feeForm = document.getElementById('feePaymentForm');
    if (feeForm) feeForm.addEventListener('submit', handleFeePaymentSubmit);

    // Result form
    const resultForm = document.getElementById('resultForm');
    if (resultForm) resultForm.addEventListener('submit', handleResultSubmit);
});

async function updateGlobalBranding() {
    try {
        const response = await fetch('http://localhost:3000/api/settings');
        const data = await response.json();
        
        const settings = {};
        data.forEach(setting => {
            settings[setting.setting_key] = setting.setting_value;
        });

        const logoUrl = settings.institute_logo || '';
        const instituteName = settings.institute_name || 'Brightleaf Academy';

        // Update Brand Names
        document.querySelectorAll('.nav-brand-name').forEach(el => {
            el.textContent = instituteName;
        });
        
        // Update Brand Names in headers
        document.querySelectorAll('.login-header h1').forEach(el => {
            el.textContent = instituteName;
        });

        // Update Logos
        const logoHtml = logoUrl ? `<img src="${logoUrl}" alt="Logo" style="height: 35px; border-radius: 4px;">` : `<i class="fas fa-graduation-cap"></i>`;
        
        const adminNavLogo = document.getElementById('adminNavLogo');
        if (adminNavLogo) adminNavLogo.innerHTML = logoHtml;

        const studentNavLogo = document.getElementById('studentNavLogo');
        if (studentNavLogo) studentNavLogo.innerHTML = logoHtml;

        const loginLogo = document.getElementById('loginLogo');
        if (loginLogo) {
            loginLogo.innerHTML = logoUrl ? `<img src="${logoUrl}" alt="Logo" style="height: 80px; margin-bottom: 15px; border-radius: 8px;">` : `<i class="fas fa-graduation-cap" style="font-size: 50px; color: var(--primary-color); margin-bottom: 20px;"></i>`;
        }

    } catch (error) {
        console.error('Error updating branding:', error);
    }
}


// Initialize and check auth on page load
// DELETED: Redundant event listeners removed. All logic moved to document.readyState check above.