const getApiBaseUrl = () => {
    // 1. Check for manual override in localStorage (useful for debugging)
    const manualUrl = localStorage.getItem('API_BASE_URL_OVERRIDE');
    if (manualUrl) return manualUrl;

    // 2. Logic for Local Development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return '/api';
    }

    // 3. Logic for GitHub Pages or Production
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    
    // IMPORTANT: Update this URL for your production backend deployment
    // Example: return 'https://brightleaf-academy-api.render.com/api';
    return `${protocol}//localhost:3000/api`;
};

const API_BASE_URL = getApiBaseUrl();

// Warn if accessing via file://
if (window.location.protocol === 'file:') {
    console.error('⚠️ Warning: Application is running via file protocol. API requests may fail due to browser security policies. Please use http://localhost:3000 instead.');
}

// Global State
let currentAdmin = null;
let courses = [];
let batches = [];
let students = [];
let settings = {};
let attendanceData = [];
let activeLabel = 'student_name'; // For certificate layout editor

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
    updateGlobalBranding();
});

// ========== AUTHENTICATION ==========

function checkAuth() {
    const authType = localStorage.getItem('authType');
    const adminUser = localStorage.getItem('adminUser');
    
    if (authType === 'admin' && adminUser) {
        try {
            currentAdmin = JSON.parse(adminUser);
            if (currentAdmin) {
                showAdminPanel();
            } else {
                showLoginPage();
            }
        } catch (e) {
            console.error('Error parsing admin session:', e);
            showLoginPage();
        }
    } else {
        showLoginPage();
    }
}

function showLoginPage() {
    document.getElementById('loginPage').classList.add('active');
    document.getElementById('adminPanel').classList.remove('active');
}

function showAdminPanel() {
    if (!currentAdmin) {
        showLoginPage();
        return;
    }
    document.getElementById('loginPage').classList.remove('active');
    document.getElementById('adminPanel').classList.add('active');
    const displayElement = document.getElementById('adminNameDisplay');
    if (displayElement) {
        displayElement.textContent = currentAdmin.name || currentAdmin.username || 'Admin';
    }
    navigateToSection('dashboard');
    updateGlobalBranding();
}

function logout() {
    localStorage.removeItem('authType');
    localStorage.removeItem('adminUser');
    currentAdmin = null;
    window.location.href = 'index.html'; // Redirect to main login
}

function navigateToSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active');
    });

    // Remove active class from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Set active class on corresponding nav link
    const targetLink = document.querySelector(`.nav-link[data-section="${sectionId}"]`);
    if (targetLink) {
        targetLink.classList.add('active');
    }

    // Trigger section-specific loading
    if (sectionId === 'students') loadStudentsTable();
    if (sectionId === 'admissions') {
        loadCoursesForAdmission();
        loadBatchesForAdmission();
    }
}

// ========== EVENT LISTENERS ==========

function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('adminLoginForm');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    // Navigation
    document.querySelectorAll('.nav-link[data-section]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.getAttribute('data-section');
            if (section) navigateToSection(section);
        });
    });

    // Course form
    const courseForm = document.getElementById('courseForm');
    if (courseForm) courseForm.addEventListener('submit', handleCourseSubmit);

    // Batch form
    const batchForm = document.getElementById('batchForm');
    if (batchForm) batchForm.addEventListener('submit', handleBatchSubmit);

    // Admissions
    const admissionForm = document.getElementById('admissionForm');
    if (admissionForm) admissionForm.addEventListener('submit', handleAdmissionSubmit);

    // Fee payment
    const feeForm = document.getElementById('feePaymentForm');
    if (feeForm) feeForm.addEventListener('submit', handleFeePaymentSubmit);

    // Result entry
    const resultForm = document.getElementById('resultForm');
    if (resultForm) resultForm.addEventListener('submit', handleResultSubmit);

    // Student search
    const studSearch = document.getElementById('studentSearch');
    if (studSearch) studSearch.addEventListener('input', loadStudentsTable);

    // Course selection in admission - update fee
    const admCourseSel = document.getElementById('admissionCourseSelect');
    if (admCourseSel) {
        admCourseSel.addEventListener('change', () => {
            const opt = admCourseSel.options[admCourseSel.selectedIndex];
            const fee = opt.getAttribute('data-fee') || 0;
            document.getElementById('admissionTotalFeeInput').value = fee;
            document.getElementById('admOriginalFeeDisplay').value = fee;
        });
    }

    // Special fee reduction toggle
    const redToggle = document.getElementById('admIsReducedFee');
    if (redToggle) {
        redToggle.addEventListener('change', () => {
            document.getElementById('admReductionDetails').style.display = redToggle.checked ? 'block' : 'none';
        });
    }

    // Institute settings
    const instForm = document.getElementById('instituteSettingsForm');
    if (instForm) instForm.addEventListener('submit', handleInstituteSettings);

    // Logo upload
    const logoUpload = document.getElementById('logoUpload');
    if (logoUpload) logoUpload.addEventListener('change', handleLogoUpload);

    // Certificate layout editor
    const certTemplateUpload = document.getElementById('certTemplateUpload');
    if (certTemplateUpload) certTemplateUpload.addEventListener('change', handleCertTemplateUpload);
    
    const layoutCanvas = document.getElementById('layoutCanvas');
    if (layoutCanvas) layoutCanvas.addEventListener('mousedown', handleCanvasClick);
}

function navigateToSection(sectionId) {
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-section') === sectionId) {
            link.classList.add('active');
        }
    });

    // Show section
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active');
        if (section.id === sectionId) {
            section.classList.add('active');
        }
    });

    // Load section data
    switch(sectionId) {
        case 'dashboard':
            loadDashboardStats();
            break;
        case 'courses':
            loadCourses();
            break;
        case 'batches':
            loadBatches();
            loadCoursesForSelect('batchCourse');
            loadCoursesForSelect('filterCourseForBatches');
            break;
        case 'institute':
            loadInstituteSettings();
            break;
        case 'certificates':
            loadInstituteSettings(); 
            break;
    }
}

// ========== LOGIN ==========

async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;

    try {
        const response = await fetch(`${API_BASE_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('authType', 'admin');
            localStorage.setItem('adminUser', JSON.stringify(data.admin));
            currentAdmin = data.admin;
            showToast('Login successful!', 'success');
            showAdminPanel();
        } else {
            showToast(data.error || 'Invalid credentials', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Connection error. Make sure server is running.', 'error');
    }
}

// ========== DASHBOARD ==========

async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/dashboard/stats`);
        const stats = await response.json();

        document.getElementById('totalStudents').textContent = stats.totalStudents;
        document.getElementById('activeStudents').textContent = stats.activeStudents;
        document.getElementById('totalCourses').textContent = stats.studentsByCourse.length;

        // Course stats
        const courseStatsDiv = document.getElementById('courseStats');
        courseStatsDiv.innerHTML = stats.studentsByCourse.map(course => `
            <div class="course-stat-item">
                <span class="course-name">${course.course_name}</span>
                <span class="course-count">${course.count} students</span>
            </div>
        `).join('');

        // Recent activities
        const activitiesDiv = document.getElementById('recentActivities');
        activitiesDiv.innerHTML = stats.recentActivities.slice(0, 5).map(activity => `
            <div class="activity-item">
                <span class="activity-action">${activity.action}</span>
                <span class="activity-time">${formatDateTime(activity.created_at)}</span>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// ========== COURSES ==========

async function loadCourses() {
    try {
        const response = await fetch(`${API_BASE_URL}/courses`);
        courses = await response.json();
        renderCourses(courses);
    } catch (error) {
        console.error('Error loading courses:', error);
    }
}

function renderCourses(courseList) {
    const coursesDiv = document.getElementById('coursesList');
    coursesDiv.innerHTML = courseList.map(course => `
        <div class="card course-card">
            <div class="card-header">
                <h3>${course.course_name}</h3>
                <div class="card-actions">
                    <button class="btn-icon" onclick="showEditCourseModal('${course.course_code}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon danger" onclick="deleteCourse('${course.course_code}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="card-body">
                <p><strong>Code:</strong> ${course.course_code}</p>
                <p><strong>Fee:</strong> ₹${formatNumber(course.fee)}</p>
                <p><strong>Duration:</strong> ${course.duration}</p>
                ${course.description ? `<p class="description">${course.description}</p>` : ''}
            </div>
        </div>
    `).join('');
}

function showAddCourseModal() {
    document.getElementById('courseModalTitle').textContent = 'Add New Course';
    document.getElementById('courseCodeInput').disabled = false;
    document.getElementById('courseForm').reset();
    document.getElementById('courseModal').classList.add('active');
}

function showEditCourseModal(courseCode) {
    const course = courses.find(c => c.course_code === courseCode);
    if (!course) return;

    document.getElementById('courseModalTitle').textContent = 'Edit Course';
    document.getElementById('courseCodeInput').disabled = true;
    document.getElementById('courseCode').value = course.course_code;
    document.getElementById('courseCodeInput').value = course.course_code;
    document.getElementById('courseName').value = course.course_name;
    document.getElementById('courseFee').value = course.fee;
    document.getElementById('courseDuration').value = course.duration;
    document.getElementById('courseDescription').value = course.description || '';

    document.getElementById('courseModal').classList.add('active');
}

async function handleCourseSubmit(e) {
    e.preventDefault();

    const courseData = {
        course_code: document.getElementById('courseCodeInput').value,
        course_name: document.getElementById('courseName').value,
        fee: parseFloat(document.getElementById('courseFee').value),
        duration: document.getElementById('courseDuration').value,
        description: document.getElementById('courseDescription').value
    };

    const courseCode = document.getElementById('courseCode').value;
    const isEdit = !!courseCode;

    try {
        const url = isEdit ? `${API_BASE_URL}/courses/${courseCode}` : `${API_BASE_URL}/courses`;
        const method = isEdit ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(courseData)
        });

        const data = await response.json();

        if (data.success) {
            showToast(isEdit ? 'Course updated!' : 'Course added!', 'success');
            closeModal('courseModal');
            loadCourses();
        } else {
            showToast(data.error || 'Failed to save course', 'error');
        }
    } catch (error) {
        console.error('Error saving course:', error);
        showToast('Connection error', 'error');
    }
}

async function deleteCourse(courseCode) {
    if (!confirm('Are you sure you want to delete this course?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/courses/${courseCode}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showToast('Course deleted!', 'success');
            loadCourses();
        } else {
            showToast(data.error || 'Failed to delete course', 'error');
        }
    } catch (error) {
        console.error('Error deleting course:', error);
        showToast('Connection error', 'error');
    }
}

function filterCourses() {
    const search = document.getElementById('courseSearch').value.toLowerCase();
    const filtered = courses.filter(course =>
        course.course_name.toLowerCase().includes(search) ||
        course.course_code.toLowerCase().includes(search)
    );
    renderCourses(filtered);
}

// ========== BATCHES ==========

async function loadBatches() {
    try {
        const response = await fetch(`${API_BASE_URL}/batches`);
        batches = await response.json();
        renderBatches(batches);
    } catch (error) {
        console.error('Error loading batches:', error);
    }
}

function renderBatches(batchList) {
    const batchesDiv = document.getElementById('batchesList');
    batchesDiv.innerHTML = batchList.map(batch => `
        <div class="card batch-card">
            <div class="card-header">
                <h3>${batch.batch_name}</h3>
                <div class="card-actions">
                    <button class="btn-icon" onclick="showEditBatchModal(${batch.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon danger" onclick="deleteBatch(${batch.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="card-body">
                <p><strong>Course:</strong> ${batch.course_name}</p>
                <p><strong>Timing:</strong> ${batch.timing}</p>
                <p><strong>Days:</strong> ${batch.days}</p>
                <p><strong>Enrolled:</strong> ${batch.enrolled_count} / ${batch.max_students}</p>
            </div>
        </div>
    `).join('');
}

async function loadCoursesForSelect(selectId) {
    try {
        const response = await fetch(`${API_BASE_URL}/courses`);
        const courses = await response.json();

        const select = document.getElementById(selectId);
        const currentValue = select.value;

        const defaultOption = select.querySelector('option[value=""]');
        select.innerHTML = '';
        if (defaultOption) select.appendChild(defaultOption);

        courses.forEach(course => {
            const option = document.createElement('option');
            option.value = course.course_code;
            option.textContent = `${course.course_name} (${course.course_code})`;
            select.appendChild(option);
        });

        select.value = currentValue;
    } catch (error) {
        console.error('Error loading courses for select:', error);
    }
}

function showAddBatchModal() {
    document.getElementById('batchModalTitle').textContent = 'Add New Batch';
    document.getElementById('batchForm').reset();
    document.getElementById('batchId').value = '';
    document.getElementById('batchModal').classList.add('active');
}

function showEditBatchModal(batchId) {
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return;

    document.getElementById('batchModalTitle').textContent = 'Edit Batch';
    document.getElementById('batchId').value = batch.id;
    document.getElementById('batchName').value = batch.batch_name;
    document.getElementById('batchCourse').value = batch.course_code;
    document.getElementById('batchTiming').value = batch.timing;
    document.getElementById('batchDays').value = batch.days;
    document.getElementById('batchMaxStudents').value = batch.max_students;

    document.getElementById('batchModal').classList.add('active');
}

async function handleBatchSubmit(e) {
    e.preventDefault();

    const batchData = {
        batch_name: document.getElementById('batchName').value,
        course_code: document.getElementById('batchCourse').value,
        timing: document.getElementById('batchTiming').value,
        days: document.getElementById('batchDays').value,
        max_students: parseInt(document.getElementById('batchMaxStudents').value)
    };

    const batchId = document.getElementById('batchId').value;
    const isEdit = !!batchId;

    try {
        const url = isEdit ? `${API_BASE_URL}/batches/${batchId}` : `${API_BASE_URL}/batches`;
        const method = isEdit ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(batchData)
        });

        const data = await response.json();

        if (data.success) {
            showToast(isEdit ? 'Batch updated!' : 'Batch added!', 'success');
            closeModal('batchModal');
            loadBatches();
        } else {
            showToast(data.error || 'Failed to save batch', 'error');
        }
    } catch (error) {
        console.error('Error saving batch:', error);
        showToast('Connection error', 'error');
    }
}

async function deleteBatch(batchId) {
    if (!confirm('Are you sure you want to delete this batch?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/batches/${batchId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showToast('Batch deleted!', 'success');
            loadBatches();
        } else {
            showToast(data.error || 'Failed to delete batch', 'error');
        }
    } catch (error) {
        console.error('Error deleting batch:', error);
        showToast('Connection error', 'error');
    }
}

function filterBatches() {
    const course = document.getElementById('filterCourseForBatches').value;
    const filtered = course ? batches.filter(b => b.course_code === course) : batches;
    renderBatches(filtered);
}

// ========== INSTITUTE SETTINGS ==========

async function loadInstituteSettings() {
    try {
        const response = await fetch(`${API_BASE_URL}/settings`);
        const data = await response.json();
        
        data.forEach(setting => {
            settings[setting.setting_key] = setting.setting_value;
        });

        // Fill form
        document.getElementById('instituteName').value = settings.institute_name || '';
        document.getElementById('institutePhone').value = settings.institute_phone || '';
        document.getElementById('instituteEmail').value = settings.institute_email || '';
        document.getElementById('instituteWebsite').value = settings.institute_website || '';
        document.getElementById('instituteAddress').value = settings.institute_address || '';

        // Update logo preview
        const previewImg = document.getElementById('logoPreviewImg');
        const placeholder = document.getElementById('logoPlaceholder');
        if (settings.institute_logo) {
            previewImg.src = settings.institute_logo;
            previewImg.style.display = 'block';
            placeholder.style.display = 'none';
        } else {
            previewImg.style.display = 'none';
            placeholder.style.display = 'flex';
        }

        updateGlobalBranding();

        if (settings.certificate_template) {
            showLayoutEditor(settings.certificate_template);
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function handleInstituteSettings(e) {
    e.preventDefault();

    const updates = {
        institute_name: document.getElementById('instituteName').value,
        institute_phone: document.getElementById('institutePhone').value,
        institute_email: document.getElementById('instituteEmail').value,
        institute_website: document.getElementById('instituteWebsite').value,
        institute_address: document.getElementById('instituteAddress').value
    };

    try {
        let successCount = 0;
        for (const [key, value] of Object.entries(updates)) {
            const res = await fetch(`${API_BASE_URL}/settings/${key}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value })
            });
            if (res.ok) successCount++;
        }

        if (successCount === Object.keys(updates).length) {
            showToast('All institute settings updated!', 'success');
        } else {
            showToast(`Updated ${successCount} of ${Object.keys(updates).length} settings`, 'warning');
        }
    } catch (error) {
        console.error('Error updating settings:', error);
        showToast('Failed to update settings', 'error');
    }
}

async function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${API_BASE_URL}/settings/upload/institute_logo`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showToast('Logo uploaded!', 'success');
            settings.institute_logo = data.url;
            loadInstituteSettings();
            updateGlobalBranding();
        } else {
            showToast(data.error || 'Failed to upload logo', 'error');
        }
    } catch (error) {
        console.error('Error uploading logo:', error);
        showToast('Connection error', 'error');
    }
}

// ========== STUDENTS ==========

// REMOVED: Redundant student management functions
// Students, Admissions, Fees, Results, and Attendance are now in index.html main portal.

// ========== CERTIFICATES ==========

async function generateCertificate() {
    const studentCode = document.getElementById('certStudentCode').value;

    if (!studentCode) {
        showToast('Please enter student code', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/certificates/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_code: studentCode })
        });

        const data = await response.json();

        if (data.success) {
            displayCertificate(data.certificate);
            showToast('Certificate generated!', 'success');
        } else {
            showToast(data.error || 'Failed to generate certificate', 'error');
        }
    } catch (error) {
        console.error('Error generating certificate:', error);
        showToast('Connection error', 'error');
    }
}

// Certificate Layout Editor Functions
async function handleCertTemplateUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${API_BASE_URL}/settings/upload/certificate_template`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (response.ok && data.success) {
            settings.certificate_template = data.url;
            showLayoutEditor(data.url);
            showToast('Template uploaded successfully!', 'success');
        } else {
            showToast(data.error || 'Failed to upload template', 'error');
        }
    } catch (error) {
        console.error('Error uploading template:', error);
        showToast('Failed to upload template. Check server connection.', 'error');
    }
}

function showLayoutEditor(imgUrl) {
    const container = document.getElementById('layoutEditorContainer');
    const img = document.getElementById('layoutTemplateImg');
    
    img.src = imgUrl;
    container.classList.remove('hidden');

    // Default positions for labels (centered)
    const defaultPositions = {
        student_name: { top: 40, left: 50 },
        parents_name: { top: 48, left: 50 },
        course_name: { top: 56, left: 50 },
        course_duration: { top: 64, left: 50 },
        issue_date: { top: 72, left: 50 },
        student_photo: { top: 20, left: 80 }
    };
    
    // Load existing layout or use defaults
    let layout = defaultPositions;
    if (settings.certificate_layout) {
        try {
            const parsed = typeof settings.certificate_layout === 'string' 
                ? JSON.parse(settings.certificate_layout) 
                : settings.certificate_layout;
            // Merge with defaults to ensure all keys exist
            layout = { ...defaultPositions, ...parsed };
        } catch (e) { 
            console.error('Error parsing layout, using defaults', e); 
        }
    }

    // Apply positions and sizes to all labels
    Object.keys(layout).forEach(key => {
        const label = document.getElementById(`label_${key}`);
        if (label && layout[key]) {
            const top = layout[key].top;
            const left = layout[key].left;
            label.style.top = `${(top !== null && top !== undefined && !isNaN(top)) ? top : defaultPositions[key].top}%`;
            label.style.left = `${(left !== null && left !== undefined && !isNaN(left)) ? left : defaultPositions[key].left}%`;
            
            // Apply size if it's the student photo
            if (key === 'student_photo') {
                const width = layout[key].width || 100;
                const height = layout[key].height || 120;
                label.style.width = width + 'px';
                label.style.height = height + 'px';
                label.style.lineHeight = height + 'px';
                
                // Update inputs
                const wInput = document.getElementById('photoWidthInput');
                const hInput = document.getElementById('photoHeightInput');
                if (wInput) wInput.value = width;
                if (hInput) hInput.value = height;
            }
        }
    });
}

function setActiveLabel(key) {
    activeLabel = key;
    
    // Show/Hide photo controls
    const photoControls = document.getElementById('photoControls');
    if (photoControls) {
        photoControls.style.display = key === 'student_photo' ? 'flex' : 'none';
    }

    document.querySelectorAll('.btn-pill').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.toLowerCase().includes(key.replace('_', ' '))) {
            btn.classList.add('active');
        }
    });
}

function updatePhotoPreview() {
    const label = document.getElementById('label_student_photo');
    const w = document.getElementById('photoWidthInput').value;
    const h = document.getElementById('photoHeightInput').value;
    
    if (label) {
        label.style.width = w + 'px';
        label.style.height = h + 'px';
        label.style.lineHeight = h + 'px';
    }
}

function handleCanvasClick(e) {
    const canvas = document.getElementById('layoutCanvas');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const topPercent = (y / rect.height) * 100;
    const leftPercent = (x / rect.width) * 100;
    
    const label = document.getElementById(`label_${activeLabel}`);
    if (label) {
        label.style.top = `${topPercent}%`;
        label.style.left = `${leftPercent}%`;
    }
}

async function saveCertificateLayout() {
    const layout = {};
    document.querySelectorAll('.draggable-label').forEach(label => {
        const key = label.getAttribute('data-key');
        const top = parseFloat(label.style.top);
        const left = parseFloat(label.style.left);
        
        let item = {
            top: isNaN(top) ? 50 : top,
            left: isNaN(left) ? 50 : left
        };

        // Add size for student photo
        if (key === 'student_photo') {
            item.width = parseInt(document.getElementById('photoWidthInput').value) || 100;
            item.height = parseInt(document.getElementById('photoHeightInput').value) || 120;
        }

        layout[key] = item;
    });

    try {
        // Save the layout positions
        const layoutRes = await fetch(`${API_BASE_URL}/settings/certificate_layout`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: JSON.stringify(layout) })
        });
        const layoutData = await layoutRes.json();

        if (!layoutRes.ok || !layoutData.success) {
            showToast(layoutData.error || 'Failed to save layout', 'error');
            return;
        }

        // Also make sure the template URL is saved
        if (settings.certificate_template) {
            const tmplRes = await fetch(`${API_BASE_URL}/settings/certificate_template`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value: settings.certificate_template })
            });
            const tmplData = await tmplRes.json();
            if (!tmplRes.ok || !tmplData.success) {
                console.warn('Warning: Could not persist template URL', tmplData);
            }
        }

        settings.certificate_layout = layout;
        showToast('Certificate layout saved successfully!', 'success');
    } catch (error) {
        console.error('Error saving layout:', error);
        showToast('Failed to save layout. Check server connection.', 'error');
    }
}

// Store current certificate data for download
let currentCertificateData = null;

function displayCertificate(certificate) {
    currentCertificateData = certificate;
    const preview = document.getElementById('certificatePreview');
    const hasCustomTemplate = settings.certificate_template && settings.certificate_layout;

    if (hasCustomTemplate) {
        let layout = settings.certificate_layout;
        try {
            if (typeof layout === 'string') layout = JSON.parse(layout);
        } catch (e) { layout = {}; }

        preview.innerHTML = `
            <div class="certificate-preview-custom" id="certPreviewExport" style="position: relative; width: 100%; max-width: 800px; margin: 0 auto; background: white;">
                <img src="${settings.certificate_template}" alt="Certificate" style="width: 100%; display: block;" />
                <div class="cert-data" style="top: ${layout.student_name?.top || 40}%; left: ${layout.student_name?.left || 50}%; font-size: 24px; position: absolute; transform: translate(-50%, -50%); color: #333; font-weight: bold; white-space: nowrap;">${certificate.student_name || ''}</div>
                <div class="cert-data" style="top: ${layout.parents_name?.top || 48}%; left: ${layout.parents_name?.left || 50}%; font-size: 18px; position: absolute; transform: translate(-50%, -50%); color: #333; white-space: nowrap;">${certificate.guardian_name || ''}</div>
                <div class="cert-data" style="top: ${layout.course_name?.top || 56}%; left: ${layout.course_name?.left || 50}%; font-size: 20px; position: absolute; transform: translate(-50%, -50%); color: #333; font-weight: bold; white-space: nowrap;">${certificate.course_name || ''}</div>
                <div class="cert-data" style="top: ${layout.course_duration?.top || 64}%; left: ${layout.course_duration?.left || 50}%; font-size: 16px; position: absolute; transform: translate(-50%, -50%); color: #333; white-space: nowrap;">${certificate.course_duration || ''}</div>
                <div class="cert-data" style="top: ${layout.issue_date?.top || 72}%; left: ${layout.issue_date?.left || 50}%; font-size: 16px; position: absolute; transform: translate(-50%, -50%); color: #333; white-space: nowrap;">${formatDate(certificate.issue_date)}</div>
                
                ${certificate.photo_path || (certificate.student_data && certificate.student_data.photo_path) ? `
                <div class="cert-photo" style="top: ${layout.student_photo?.top || 20}%; left: ${layout.student_photo?.left || 80}%; position: absolute; transform: translate(-50%, -50%); width: 120px; height: 140px; border: 2px solid #ccc; overflow: hidden; background: #eee;">
                    <img src="${certificate.photo_path || (certificate.student_data && certificate.student_data.photo_path)}" alt="Student Photo" style="width: 100%; height: 100%; object-fit: cover;" />
                </div>` : ''}
            </div>
            <div class="certificate-actions" style="margin-top: 20px; display: flex; gap: 15px; justify-content: center;">
                <button class="btn-primary" onclick="downloadCertificateAdmin()">
                    <i class="fas fa-download"></i> Download PDF
                </button>
                <button class="btn-secondary" onclick="window.print()">
                    <i class="fas fa-print"></i> Print Certificate
                </button>
            </div>
        `;
    } else {
        // Fallback to default styled certificate
        const instituteName = settings.institute_name || 'Brightleaf Academy';
        const instituteAddress = settings.institute_address || '';
        const institutePhone = settings.institute_phone || '';
        const logoUrl = settings.institute_logo || '';

        preview.innerHTML = `
            <div class="certificate-content">
                <div class="certificate-header">
                    <div class="cert-logo-container" style="margin-bottom: 20px;">
                        ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="height: 60px;">` : `<i class="fas fa-graduation-cap" style="font-size: 48px; color: var(--primary);"></i>`}
                    </div>
                    <h1>Certificate of Completion</h1>
                    <p>This certificate is proudly presented to</p>
                </div>
                <div class="certificate-body">
                    <h3>${certificate.student_name || 'Student Name'}</h3>
                    <h2>Student Code: ${certificate.student_code || ''}</h2>
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
                            <span>${formatDate(certificate.issue_date)}</span>
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
            <div class="certificate-actions" style="margin-top: 20px; display: flex; gap: 15px; justify-content: center;">
                <button class="btn-primary" onclick="downloadCertificateAdmin()">
                    <i class="fas fa-download"></i> Download PDF
                </button>
                <button class="btn-secondary" onclick="window.print()">
                    <i class="fas fa-print"></i> Print Certificate
                </button>
            </div>
        `;
    }
    preview.classList.remove('hidden');
}

function downloadCertificateAdmin() {
    if (!currentCertificateData) {
        showToast('No certificate data available', 'error');
        return;
    }

    const cert = currentCertificateData;
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
        const photoUrl = cert.photo_path ? new URL(cert.photo_path, window.location.origin).href : '';

        bodyContent = `
            <div class="certificate-custom">
                <img src="${templateUrl}" alt="Certificate" />
                <div class="cert-data" style="top: ${layout.student_name?.top || 45}%; left: ${layout.student_name?.left || 50}%; font-size: 28px;">${cert.student_name || ''}</div>
                <div class="cert-data" style="top: ${layout.parents_name?.top || 50}%; left: ${layout.parents_name?.left || 50}%; font-size: 20px;">${cert.guardian_name || ''}</div>
                <div class="cert-data" style="top: ${layout.course_name?.top || 60}%; left: ${layout.course_name?.left || 50}%; font-size: 22px;">${cert.course_name || ''}</div>
                <div class="cert-data" style="top: ${layout.course_duration?.top || 65}%; left: ${layout.course_duration?.left || 50}%; font-size: 18px;">${cert.course_duration || ''}</div>
                <div class="cert-data" style="top: ${layout.issue_date?.top || 75}%; left: ${layout.issue_date?.left || 50}%; font-size: 18px;">${formatDate(cert.issue_date)}</div>
                
                ${photoUrl ? `
                <div class="cert-data" style="top: ${layout.student_photo?.top || 20}%; left: ${layout.student_photo?.left || 80}%; transform: translate(-50%, -50%);">
                    <img src="${photoUrl}" style="width: ${layout.student_photo?.width || 100}px; height: ${layout.student_photo?.height || 120}px; object-fit: cover; border: 2px solid #667eea; border-radius: 5px;" />
                </div>
                ` : ''}
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
                            <span>${formatDate(cert.issue_date)}</span>
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

    // Wait for fonts and images to load before printing
    printWindow.onload = function() {
        setTimeout(() => {
            printWindow.print();
        }, 300);
    };

    // Fallback if onload doesn't fire
    setTimeout(() => {
        try { printWindow.print(); } catch(e) {}
    }, 2000);

    showToast('Certificate opened for download!', 'success');
}

// ========== ADMINISTRATIVE FUNCTIONS ==========

async function loadStudentsTable() {
    const tableDiv = document.getElementById('studentsTable');
    if (!tableDiv) return;
    
    tableDiv.innerHTML = '<div class="loading">Loading students...</div>';
    
    try {
        const res = await fetch(`${API_BASE_URL}/students`);
        const data = await res.json();
        
        if (data.success) {
            students = data.students;
            const searchTerm = document.getElementById('studentSearch')?.value.toLowerCase() || '';
            const filtered = students.filter(s => 
                s.name.toLowerCase().includes(searchTerm) || 
                s.student_code.toLowerCase().includes(searchTerm)
            );
            
            if (filtered.length === 0) {
                tableDiv.innerHTML = '<div class="no-data">No students found</div>';
                return;
            }
            
            let html = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Photo</th>
                            <th>Code</th>
                            <th>Name</th>
                            <th>Course</th>
                            <th>Batch</th>
                            <th>Phone</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            filtered.forEach(s => {
                html += `
                    <tr>
                        <td><img src="${s.photo_url || 'https://via.placeholder.com/40'}" class="table-img" style="width:40px; height:40px; border-radius:50%; object-fit:cover;"></td>
                        <td><strong>${s.student_code}</strong></td>
                        <td>${s.name}</td>
                        <td>${s.course_name || s.course_id}</td>
                        <td>${s.batch_name || s.batch_id}</td>
                        <td>${s.phone}</td>
                        <td><span class="status-btn ${s.status === 'active' ? 'status-active' : 'status-inactive'}">${s.status}</span></td>
                    </tr>
                `;
            });
            
            html += '</tbody></table>';
            tableDiv.innerHTML = html;
        }
    } catch (err) { tableDiv.innerHTML = '<div class="error">Failed to load students</div>'; }
}

async function loadCoursesForAdmission() {
    const select = document.getElementById('admissionCourseSelect');
    if (!select) return;
    try {
        const res = await fetch(`${API_BASE_URL}/courses`);
        const data = await res.json();
        if (data.success) {
            select.innerHTML = '<option value="">Select Course</option>' + 
                data.courses.map(c => `<option value="${c.code}" data-fee="${c.fee}">${c.name} - ₹${formatNumber(c.fee)}</option>`).join('');
        }
    } catch (e) {}
}

async function loadBatchesForAdmission() {
    const select = document.getElementById('admissionBatchSelect');
    if (!select) return;
    try {
        const res = await fetch(`${API_BASE_URL}/batches`);
        const data = await res.json();
        if (data.success) {
            select.innerHTML = '<option value="">Select Batch</option>' + 
                data.batches.map(b => `<option value="${b.id}">${b.name} (${b.timing})</option>`).join('');
        }
    } catch (e) {}
}

async function handleAdmissionSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    
    try {
        const res = await fetch(`${API_BASE_URL}/students`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (data.success) {
            showToast('Admission completed successfully!', 'success');
            e.target.reset();
            navigateToSection('students');
        } else {
            showToast(data.error || 'Admission failed', 'error');
        }
    } catch (err) { showToast('Server error', 'error'); }
    finally { btn.disabled = false; }
}

async function searchStudentForFee() {
    const code = document.getElementById('feeStudentCode').value;
    if (!code) return;
    try {
        const res = await fetch(`${API_BASE_URL}/students/${code}`);
        const data = await res.json();
        if (data.success) {
            document.getElementById('feePaymentSection').style.display = 'block';
            const s = data.student;
            document.getElementById('feeStudentDetails').innerHTML = `
                <div class="student-mini-profile" style="display:flex; gap:15px; align-items:center; background:#f9f9f9; padding:15px; border-radius:10px; margin-bottom:20px;">
                    <img src="${s.photo_url}" style="width: 80px; height: 80px; border-radius: 10px; object-fit:cover;">
                    <div>
                        <h4 style="margin:0;">${s.name} (${s.student_code})</h4>
                        <p style="margin:5px 0;">${s.course_name || s.course_id.toUpperCase()} | Total: ₹${formatNumber(s.total_fee)}</p>
                        <p style="margin:0; color: var(--red); font-weight: bold;">Remaining Balance: ₹${formatNumber(s.total_fee - s.paid_fee)}</p>
                    </div>
                </div>
            `;
            loadFeeHistory(code);
        } else { showToast('Student not found', 'error'); }
    } catch (e) {}
}

async function loadFeeHistory(code) {
    const container = document.getElementById('feeHistoryContainer');
    const tableDiv = document.getElementById('feeHistoryTable');
    try {
        const res = await fetch(`${API_BASE_URL}/fee-payments/${code}`);
        const data = await res.json();
        if (data.success && data.payments.length > 0) {
            container.style.display = 'block';
            let html = '<table class="data-table"><thead><tr><th>Date</th><th>Amount</th><th>Mode</th><th>Reference</th></tr></thead><tbody>';
            data.payments.forEach(p => {
                html += `<tr><td>${formatDate(p.payment_date)}</td><td>₹${formatNumber(p.amount)}</td><td>${p.payment_mode} ${p.payment_mode === 'exemption' ? '🏷️' : ''}</td><td>${p.reference_no || '-'}</td></tr>`;
            });
            tableDiv.innerHTML = html + '</tbody></table>';
        } else { container.style.display = 'none'; }
    } catch (e) {}
}

async function exemptFullBalance() {
    const code = document.getElementById('feeStudentCode').value;
    if (!code || !confirm('Are you sure you want to exempt the entire remaining balance for this student?')) return;
    
    try {
        const res = await fetch(`${API_BASE_URL}/fee-exemptions/${code}`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            showToast('Full balance exempted!', 'success');
            searchStudentForFee();
        }
    } catch (e) {}
}

async function handleFeePaymentSubmit(e) {
    e.preventDefault();
    const code = document.getElementById('feeStudentCode').value;
    const amount = document.getElementById('paymentAmount').value;
    const mode = document.getElementById('paymentMode').value;
    const ref = document.getElementById('paymentRef').value;
    const remarks = document.getElementById('paymentRemarks').value;
    
    if (!amount || amount <= 0) return showToast('Enter valid amount', 'error');
    
    try {
        const res = await fetch(`${API_BASE_URL}/fee-payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentCode: code, amount, payment_mode: mode, reference_no: ref, remarks })
        });
        const data = await res.json();
        if (data.success) {
            showToast('Payment recorded!', 'success');
            e.target.reset();
            searchStudentForFee();
        }
    } catch (e) {}
}

async function searchStudentForResult() {
    const code = document.getElementById('resultStudentCode').value;
    if (!code) return;
    try {
        const res = await fetch(`${API_BASE_URL}/students/${code}`);
        const data = await res.json();
        if (data.success) {
            document.getElementById('resultEntrySection').style.display = 'block';
            const s = data.student;
            document.getElementById('resStudentCard').innerHTML = `<div style="background:#f0f4ff; padding:15px; border-radius:10px; margin-bottom:20px;"><h4>Entering results for: ${s.name} (${s.student_code})</h4><p>Course: ${s.course_name || s.course_id.toUpperCase()}</p></div>`;
            
            // Try to find course details to get subjects
            const cRes = await fetch(`${API_BASE_URL}/courses`);
            const cData = await cRes.json();
            if (cData.success) {
                const course = cData.courses.find(c => c.code === s.course_id || c.name === s.course_id);
                if (course && course.description) {
                    // Extract subjects from description if possible, or use defaults
                    const subjects = ["Computer Fundamentals", "Operating Systems", "Office Automation", "Internet & Web"];
                    document.getElementById('subjectMarksContainer').innerHTML = subjects.map(sub => `
                        <div class="form-group">
                            <label>${sub}</label>
                            <input type="number" class="subject-mark" data-subject="${sub}" placeholder="Out of 100" required style="width:100%; padding:8px; border-radius:5px; border:1px solid #ddd;">
                        </div>
                    `).join('');
                }
            }
        } else { showToast('Student not found', 'error'); }
    } catch (e) {}
}

async function handleResultSubmit(e) {
    e.preventDefault();
    const code = document.getElementById('resultStudentCode').value;
    const marks = {};
    document.querySelectorAll('.subject-mark').forEach(inp => {
        marks[inp.getAttribute('data-subject')] = inp.value;
    });
    
    const payload = {
        studentCode: code,
        marks: JSON.stringify(marks),
        percentage: document.getElementById('percentage').value,
        grade: document.getElementById('overallGrade').value,
        remarks: document.getElementById('resultRemarks').value
    };
    
    try {
        const res = await fetch(`${API_BASE_URL}/results`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            showToast('Result saved successfully!', 'success');
            e.target.reset();
            document.getElementById('resultEntrySection').style.display = 'none';
        } else {
            showToast(data.error || 'Failed to save result', 'error');
        }
    } catch (e) {}
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    // Clear any existing timeout
    if (toast._hideTimeout) clearTimeout(toast._hideTimeout);

    toast.className = `toast ${type}`;
    toastMessage.textContent = message;

    // Force reflow then add show class for CSS animation
    toast.offsetHeight;
    toast.classList.add('show');

    toast._hideTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function formatNumber(num) {
    return parseFloat(num).toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function formatDateTime(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}