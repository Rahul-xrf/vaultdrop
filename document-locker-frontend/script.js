// ✅ Define base API URL
const apiBaseUrl = "http://52.90.60.18:5000"; // <-- new EC2 IP

// Application state
let currentForm = 'login';
let isLoading = false;

// DOM elements
const elements = {
    loginForm: document.getElementById('loginForm'),
    registerForm: document.getElementById('registerForm'),
    loginFormElement: document.getElementById('loginFormElement'),
    registerFormElement: document.getElementById('registerFormElement'),
    switchToRegister: document.getElementById('switchToRegister'),
    switchToLogin: document.getElementById('switchToLogin'),
    passwordToggles: document.querySelectorAll('.password-toggle')
};

// Initialize the application
function init() {
    setupEventListeners();
    showForm('login');
}

// Event listeners setup
function setupEventListeners() {
    // Form switching
    elements.switchToRegister.addEventListener('click', () => showForm('register'));
    elements.switchToLogin.addEventListener('click', () => showForm('login'));
    
    // Form submissions
    elements.loginFormElement.addEventListener('submit', handleLogin);
    elements.registerFormElement.addEventListener('submit', handleRegister);
    
    // Password visibility toggles
    elements.passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', handlePasswordToggle);
    });
    
    // Input validation on change
    setupInputValidation();
    
    // Social buttons
    setupSocialButtons();
}

// Form switching
function showForm(formType) {
    const isLogin = formType === 'login';
    
    // Update current form
    currentForm = formType;
    
    // Toggle form visibility with animation
    if (isLogin) {
        elements.registerForm.classList.add('hidden');
        setTimeout(() => {
            elements.loginForm.classList.remove('hidden');
        }, 150);
    } else {
        elements.loginForm.classList.add('hidden');
        setTimeout(() => {
            elements.registerForm.classList.remove('hidden');
        }, 150);
    }
    
    // Clear all form errors
    clearAllErrors();
    
    // Reset forms
    elements.loginFormElement.reset();
    elements.registerFormElement.reset();
}

// Password toggle functionality
function handlePasswordToggle(e) {
    const button = e.currentTarget;
    const input = button.closest('.input-wrapper').querySelector('.form-input');
    const eyeOpen = button.querySelector('.eye-open');
    const eyeClosed = button.querySelector('.eye-closed');
    
    if (input.type === 'password') {
        input.type = 'text';
        eyeOpen.classList.add('hidden');
        eyeClosed.classList.remove('hidden');
    } else {
        input.type = 'password';
        eyeOpen.classList.remove('hidden');
        eyeClosed.classList.add('hidden');
    }
}

// Input validation setup
function setupInputValidation() {
    const inputs = document.querySelectorAll('.form-input');
    
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            clearFieldError(this);
            validateField(this);
        });
        
        input.addEventListener('blur', function() {
            validateField(this);
        });
    });
}

// Field validation
function validateField(field) {
    const value = field.value.trim();
    const fieldName = field.name;
    let isValid = true;
    
    // Clear previous error
    clearFieldError(field);
    
    // Validation rules
    switch (fieldName) {
        case 'name':
            if (value.length < 2) {
                showFieldError(field, 'Name must be at least 2 characters long');
                isValid = false;
            }
            break;
            
        case 'email':
            if (!isValidEmail(value)) {
                showFieldError(field, 'Please enter a valid email address');
                isValid = false;
            }
            break;
            
        case 'password':
            if (value.length < 6) {
                showFieldError(field, 'Password must be at least 6 characters long');
                isValid = false;
            }
            // Removed strong password requirement for easier testing
            break;
            
        case 'confirmPassword':
            const password = document.getElementById('registerPassword').value;
            if (value !== password) {
                showFieldError(field, 'Passwords do not match');
                isValid = false;
            }
            break;
    }
    
    // Add success state for valid fields
    if (isValid && value) {
        field.classList.add('success');
        field.classList.remove('error');
    }
    
    return isValid;
}

// Email validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Strong password validation
function isStrongPassword(password) {
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    return hasLetter && hasNumber;
}

// Show field error
function showFieldError(field, message) {
    const errorElement = field.closest('.form-group').querySelector('.error-message');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
        field.classList.add('error');
        field.classList.remove('success');
    }
}

// Clear field error
function clearFieldError(field) {
    const errorElement = field.closest('.form-group').querySelector('.error-message');
    if (errorElement) {
        errorElement.classList.add('hidden');
        field.classList.remove('error');
    }
}

// Clear all errors
function clearAllErrors() {
    const errorElements = document.querySelectorAll('.error-message');
    const inputElements = document.querySelectorAll('.form-input');
    
    errorElements.forEach(el => el.classList.add('hidden'));
    inputElements.forEach(el => {
        el.classList.remove('error', 'success');
    });
}

// Form validation
function validateForm(formType) {
    const form = formType === 'login' ? elements.loginFormElement : elements.registerFormElement;
    const inputs = form.querySelectorAll('.form-input');
    let isValid = true;
    
    console.log('Validating form:', formType);
    inputs.forEach(input => {
        console.log('Validating field:', input.name, 'value:', input.value);
        if (!validateField(input)) {
            console.log('Field validation failed:', input.name);
            isValid = false;
        }
    });
    
    // Check terms agreement for registration
    if (formType === 'register') {
        const termsCheckbox = document.getElementById('agreeTerms');
        if (!termsCheckbox.checked) {
            showNotification('Please agree to the Terms of Service and Privacy Policy', 'error');
            isValid = false;
        }
    }
    
    console.log('Form validation result:', isValid);
    return isValid;
}

// Handle login
// In script.js, update the handleLogin function:

async function handleLogin(e) {
    e.preventDefault();

    if (isLoading) return;

    // Validate form
    if (!validateForm('login')) {
        console.log('Form validation failed');
        return;
    }

    // Get form data
    const formData = new FormData(elements.loginFormElement);
    const loginData = {
        email: formData.get('email'),
        password: formData.get('password'),
        rememberMe: document.getElementById('rememberMe').checked
    };

    console.log('Login data:', loginData);

    try {
        setLoading(true);

        // Real API call to your backend
        console.log('Making API request to:', `${apiBaseUrl}/login`);
        const response = await fetch(`${apiBaseUrl}/login`, {
        
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });
        console.log('Response received:', response);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Login failed');
        }

        const data = await response.json();
        
        // Store the token if your backend uses JWT
        if (data.token) {
            localStorage.setItem('authToken', data.token);
        }

        // Success
        showNotification('Login successful! Redirecting...', 'success');

        // Redirect to dashboard
        setTimeout(() => {
            console.log('Redirecting to dashboard...');
            window.location.href = 'dashboard.html';
        }, 1500);

    } catch (error) {
        console.error('Login error:', error);
        showNotification(error.message || 'Login failed. Please try again.', 'error');
    } finally {
        setLoading(false);
    }
}


// Handle registration
async function handleRegister(e) {
    e.preventDefault();
    
    if (isLoading) return;
    
    // Validate form
    if (!validateForm('register')) {
        return;
    }
    
    // Get form data
    const formData = new FormData(elements.registerFormElement);
    const registerData = {
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
        confirmPassword: formData.get('confirmPassword')
    };
    
    try {
        setLoading(true);
        
        // Simulate API call
        await simulateApiCall(registerData, 'register');
        
        // Success
        showNotification('Account created successfully! Please check your email for verification.', 'success');
        
        // Switch to login form
        setTimeout(() => {
            showForm('login');
        }, 2000);
        
    } catch (error) {
        showNotification(error.message || 'Registration failed. Please try again.', 'error');
    } finally {
        setLoading(false);
    }
}

// Set loading state
function setLoading(loading) {
    isLoading = loading;
    const currentButton = currentForm === 'login' 
        ? elements.loginFormElement.querySelector('.auth-button')
        : elements.registerFormElement.querySelector('.auth-button');
    
    const buttonText = currentButton.querySelector('.button-text');
    const buttonLoader = currentButton.querySelector('.button-loader');
    
    if (loading) {
        currentButton.classList.add('loading');
        currentButton.disabled = true;
        buttonText.style.opacity = '0';
        buttonLoader.classList.remove('hidden');
    } else {
        currentButton.classList.remove('loading');
        currentButton.disabled = false;
        buttonText.style.opacity = '1';
        buttonLoader.classList.add('hidden');
    }
}

// Simulate API call
function simulateApiCall(data, type) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // Simulate random success/failure for demo
            if (Math.random() > 0.1) { // 90% success rate
                resolve({
                    success: true,
                    message: `${type} successful`,
                    data: data
                });
            } else {
                reject(new Error(`${type} failed. Please try again.`));
            }
        }, 2000);
    });
}

// Social button handlers
function setupSocialButtons() {
    const socialButtons = document.querySelectorAll('.social-button');
    
    socialButtons.forEach(button => {
        button.addEventListener('click', function() {
            const provider = this.classList.contains('google') ? 'Google' : 'GitHub';
            showNotification(`${provider} authentication would be handled here`, 'info');
        });
    });
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">
                ${getNotificationIcon(type)}
            </div>
            <div class="notification-message">${message}</div>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        min-width: 320px;
        max-width: 500px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        border-left: 4px solid ${getNotificationColor(type)};
        animation: slideInRight 0.3s ease;
    `;
    
    // Add notification to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Get notification icon
function getNotificationIcon(type) {
    const icons = {
        success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.7088 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4905 2.02168 11.3363C2.16356 9.18203 2.99721 7.13214 4.39828 5.49883C5.79935 3.86553 7.69279 2.72636 9.79619 2.24223C11.8996 1.75809 14.1003 1.95185 16.07 2.79999" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="22,4 12,14.01 9,11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/><line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/></svg>',
        info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" stroke-width="2"/><line x1="12" y1="8" x2="12.01" y2="8" stroke="currentColor" stroke-width="2"/></svg>'
    };
    return icons[type] || icons.info;
}

// Get notification color
function getNotificationColor(type) {
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        info: '#3b82f6'
    };
    return colors[type] || colors.info;
}

// Add notification styles
const notificationStyles = `
    .notification-content {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 16px;
    }
    
    .notification-icon {
        color: ${getNotificationColor('info')};
        flex-shrink: 0;
        margin-top: 2px;
    }
    
    .notification.success .notification-icon {
        color: ${getNotificationColor('success')};
    }
    
    .notification.error .notification-icon {
        color: ${getNotificationColor('error')};
    }
    
    .notification-message {
        flex: 1;
        font-size: 14px;
        line-height: 1.5;
        color: #374151;
    }
    
    .notification-close {
        background: none;
        border: none;
        color: #9ca3af;
        cursor: pointer;
        padding: 0;
        flex-shrink: 0;
        margin-top: 2px;
        transition: color 0.2s ease;
    }
    
    .notification-close:hover {
        color: #6b7280;
    }
    
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;

// Add notification styles to page
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Handle forgot password
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('forgot-password')) {
        showNotification('Password reset functionality would be handled here', 'info');
    }
});

// Keyboard navigation
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && e.target.classList.contains('switch-link')) {
        e.target.click();
    }
    
    if (e.key === 'Escape') {
        const notifications = document.querySelectorAll('.notification');
        notifications.forEach(notification => notification.remove());
    }
});