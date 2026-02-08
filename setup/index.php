<?php
// Check if setup is already complete (both lock file AND instance.json must exist)
$setupLockFile = dirname(__DIR__) . '/data/.setup-complete';
$instanceFile = dirname(__DIR__) . '/data/instance.json';
if (file_exists($setupLockFile) && file_exists($instanceFile)) {
    header('Location: /admin/');
    exit;
}

// Generate setup token to prevent unauthorized setup requests
$secure = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
session_start([
    'cookie_httponly' => true,
    'cookie_samesite' => 'Strict',
    'cookie_secure' => $secure,
    'use_strict_mode' => true,
]);
if (!isset($_SESSION['setup_token'])) {
    $_SESSION['setup_token'] = bin2hex(random_bytes(32));
}
$setupToken = $_SESSION['setup_token'];
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Setup Wizard - fourteenkilobytes</title>
  <style>
    <?php include dirname(__DIR__) . '/public/admin/style.css'; ?>
  </style>
  <style>
    body {
      background: var(--gray-100);
      padding: 32px;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .wizard-container {
      max-width: 700px;
      width: 100%;
    }

    .wizard-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 24px;
      margin-bottom: 32px;
      text-align: left;
    }

    .wizard-logo {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      
      /* Dashboard Logo Styling */
      background-color: rgba(16, 168, 155, 0.12);
      border-radius: 16px;
      padding: 8px 20px 8px 12px;
      flex-shrink: 0;
      color: #14b8a6;
      margin-bottom: 0; /* Override previous margin */
    }

    .wizard-logo svg {
      width: 48px;
      height: 48px;
    }

    .wizard-logo-text {
      font-size: 18px;
      line-height: 1.1;
      font-family: ui-monospace, monospace;
      font-weight: 600;
      letter-spacing: 0.05em;
      color: inherit;
      opacity: 0.8;
    }

    .wizard-title-group {
      display: flex;
      flex-direction: column;
    }

    .wizard-title {
      font-size: 20px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 2px;
      line-height: 1.2;
    }

    .wizard-subtitle {
      font-size: 13px;
      color: var(--text-secondary);
    }

    .progress-bar {
      height: 2px;
      background: var(--gray-200);
      margin-bottom: 24px;
      border-radius: 2px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: var(--accent);
      transition: width 0.15s ease;
      width: 0%;
    }

    .wizard-body {
      background: var(--white);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 32px;
    }

    .step {
      display: none;
    }

    .step.active {
      display: block;
    }

    .step-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 6px;
      color: var(--text-primary);
    }

    .step-description {
      color: var(--text-secondary);
      margin-bottom: 24px;
      line-height: 1.6;
      font-size: 14px;
    }

    .check-list {
      list-style: none;
      margin-bottom: 16px;
    }

    .check-item {
      padding: 12px 16px;
      margin-bottom: 8px;
      border-radius: 4px;
      background: var(--white);
      border: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .check-item.ok {
      background: var(--white);
      border-color: var(--border);
    }

    .check-item.warning {
      background: #fffbeb;
      border-color: #fcd34d;
    }

    .check-item.error {
      background: #fef2f2;
      border-color: #fca5a5;
    }

    .check-label {
      font-weight: 600;
      color: var(--text-primary);
      font-size: 13px;
    }

    .check-message {
      font-size: 13px;
      color: var(--text-secondary);
    }

    .check-item code {
      display: block;
      font-size: 11px;
      font-family: ui-monospace, monospace;
      margin-top: 4px;
      padding: 4px 8px;
      background: var(--white);
      border: 1px solid var(--border);
      color: var(--text-primary);
      border-radius: 4px;
    }

    .check-status {
      display: inline-flex;
      align-items: center;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      flex-shrink: 0;
    }

    .check-status.ok {
      background: var(--accent-alpha-15);
      color: var(--accent-hover);
    }

    .check-status.warning {
      background: #fef3c7;
      color: #92400e;
    }

    .check-status.error {
      background: #fee2e2;
      color: #b91c1c;
    }

    .password-wrapper {
      position: relative;
    }

    .password-toggle {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      cursor: pointer;
      color: var(--text-muted);
      background: none;
      border: none;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .password-toggle:hover {
      color: var(--text-primary);
    }

    /* Custom Strength Indicator as Bottom Border */
    .strength-indicator {
      position: absolute;
      bottom: 1px;
      left: 1px;
      right: 1px;
      width: auto;
      height: 3px;
      background: transparent;
      transition: background-color 0.2s;
      border-bottom-left-radius: 3px;
      border-bottom-right-radius: 3px;
      pointer-events: none;
    }

    .strength-indicator.weak { background-color: #ef4444; }
    .strength-indicator.medium { background-color: #f59e0b; }
    .strength-indicator.strong { background-color: #10b981; }

    .password-hint {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 4px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .config-box {
      background: var(--gray-100);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 12px;
      margin: 12px 0;
    }

    .config-filename {
      font-weight: 600;
      color: var(--accent);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 13px;
    }

    .config-content {
      background: var(--gray-800);
      color: #f8f8f2;
      padding: 12px;
      border-radius: 4px;
      font-family: ui-monospace, monospace;
      font-size: 11px;
      overflow-x: auto;
      white-space: pre-wrap;
      word-wrap: break-word;
      max-height: 280px;
      overflow-y: auto;
      line-height: 1.5;
    }

    .wizard-actions {
      display: flex;
      justify-content: space-between;
      margin-top: 32px;
      padding-top: 0;
      border-top: none;
      gap: 8px;
    }

    .alert {
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 24px;
      font-size: 13px;
      line-height: 1.5;
    }

    .alert ul {
      margin-top: 8px;
      margin-left: 18px;
    }

    .alert-error {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fca5a5;
    }

    .alert-success {
      background: var(--accent-alpha-15);
      color: var(--accent-hover);
      border: 1px solid var(--accent-alpha-15);
    }

    .alert-info {
      background: var(--accent-alpha-15);
      color: var(--accent-hover);
      border: 1px solid transparent;
    }

    .spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(13, 148, 136, 0.2);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .success-icon {
      width: 56px;
      height: 56px;
      margin: 0 auto 16px;
      background: var(--accent);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 28px;
    }

    .webserver-tabs {
      display: flex;
      gap: 0;
      position: relative;
      bottom: -1px;
      margin-bottom: 0;
    }

    .webserver-tab {
      padding: 8px 16px;
      background: var(--gray-100);
      border: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      color: var(--text-muted);
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      border-radius: 4px 4px 0 0;
      margin-right: -1px;
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }

    .webserver-tab:hover {
      background: var(--gray-200);
      color: var(--text-primary);
    }

    .webserver-tab.active {
      background: var(--white);
      color: var(--text-primary);
      border-bottom-color: var(--white);
      z-index: 1;
    }

    @media (max-width: 600px) {
      body {
        padding: 16px;
      }
      
      .wizard-body {
        padding: 16px;
      }
    }
  </style>
</head>
<body>
  <div class="wizard-container">
    <div class="wizard-header">
      <div class="wizard-logo">
        <svg version="1.0" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 191.000000 191.000000" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><g transform="translate(0.000000,191.000000) scale(0.100000,-0.100000)" fill="currentColor" stroke="none"><path d="M406 1889 c-175 -35 -325 -178 -371 -356 -21 -81 -22 -1071 -1 -1149 47 -176 194 -315 374 -353 61 -13 1058 -16 1066 -3 2 4 -22 29 -55 55 -67 54 -152 157 -220 265 -24 39 -46 71 -49 72 -3 0 -18 -21 -34 -46 -41 -65 -64 -78 -116 -64 -63 17 -74 3 -65 -82 5 -57 4 -69 -10 -74 -24 -10 -45 15 -45 54 0 34 -1 34 -19 18 -10 -9 -21 -31 -25 -47 -5 -26 -10 -30 -33 -27 -23 2 -29 8 -31 35 -3 27 1 35 22 44 26 12 40 35 30 50 -9 16 -22 10 -58 -27 -40 -41 -72 -40 -82 2 -8 31 5 46 54 59 49 14 52 37 7 54 -19 7 -40 9 -45 6 -29 -18 -54 47 -28 73 17 17 35 15 66 -8 15 -12 41 -22 57 -23 28 -2 30 0 27 28 -8 85 -7 89 12 93 24 5 46 -23 46 -58 0 -37 29 -60 75 -60 51 0 69 18 101 106 l27 74 -19 42 c-26 59 -98 111 -196 143 -68 23 -91 36 -129 75 -58 59 -82 121 -109 278 -33 194 -24 242 44 242 36 0 242 -68 310 -102 87 -43 125 -102 140 -218 9 -60 39 -108 79 -125 20 -8 76 -15 138 -16 57 -1 142 -8 188 -15 46 -8 87 -12 90 -9 9 10 1 84 -14 119 -8 20 -25 41 -37 47 -20 11 -25 8 -55 -27 -27 -33 -35 -37 -50 -28 -10 6 -19 22 -21 36 -2 20 5 30 33 47 45 26 37 45 -16 38 -44 -6 -75 18 -65 51 9 29 30 33 70 17 57 -24 63 -18 22 24 -40 41 -44 66 -13 85 24 15 49 -2 59 -41 4 -17 15 -36 23 -43 21 -18 31 12 17 56 -8 27 -7 37 5 49 36 37 68 5 59 -58 -5 -32 -3 -47 8 -56 11 -9 18 -6 35 16 40 54 41 54 62 42 28 -15 22 -60 -11 -76 -57 -28 -65 -87 -25 -201 28 -82 31 -131 10 -171 -16 -31 -33 -41 -71 -41 -14 0 -34 -5 -45 -11 -26 -13 -15 -27 61 -79 30 -21 91 -70 135 -109 44 -39 85 -71 92 -71 20 0 18 909 -2 1003 -15 73 -58 162 -106 221 -40 48 -135 112 -207 139 -55 21 -71 22 -587 23 -305 1 -551 -2 -579 -7z" /></g></svg>
        <span class="wizard-logo-text">14<br>KB</span>
      </div>
      <div class="wizard-title-group">
        <h1 class="wizard-title">First-Time Setup</h1>
        <p class="wizard-subtitle">Configure the basics and finish installation</p>
      </div>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" id="progressFill"></div>
    </div>
    <div class="wizard-body">
      <div id="alertContainer"></div>

      <!-- Step 1: Welcome -->
      <div class="step active" data-step="1">
        <h2 class="step-title">First-Time Setup</h2>
        <p class="step-description">
          This process will guide you through the initial setup. It takes only a few minutes.
        </p>

        <div class="alert alert-info">
          <strong>What we'll do:</strong>
          <ul>
            <li>Check system requirements</li>
            <li>Create your admin account</li>
            <li>Configure basic site settings</li>
            <li>Set up webserver configuration</li>
          </ul>
        </div>
        <div class="wizard-actions">
          <div></div>
          <button class="btn btn-primary" onclick="nextStep()">Get Started</button>
        </div>
      </div>

      <!-- Step 2: System Check -->
      <div class="step" data-step="2">
        <h2 class="step-title">System Requirements</h2>
        <p class="step-description">
          Checking if your server meets all requirements...
        </p>
        <ul class="check-list" id="checkList">
          <li class="check-item">
            <div>
              <div class="check-label">Running checks...</div>
            </div>
            <span class="spinner"></span>
          </li>
        </ul>
        <div class="wizard-actions">
          <button class="btn btn-secondary" onclick="prevStep()">Back</button>
          <button class="btn btn-primary" id="checkContinueBtn" onclick="nextStep()" disabled>Continue</button>
        </div>
      </div>

      <!-- Step 3: Admin Account -->
      <div class="step" data-step="3">
        <h2 class="step-title">Create Admin Account</h2>
        <p class="step-description">
          Set up your admin password. This is the only account and cannot be changed via the UI later.
        </p>
        <form id="adminForm" onsubmit="return false;">
          <div class="form-group">
            <label for="password">Password</label>
            <div class="password-wrapper">
              <input type="password" id="password" placeholder="Enter a strong password" required style="padding-right: 40px;">
              <button type="button" class="password-toggle" onclick="togglePasswordVisibility('password')" title="Show/Hide Password">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
              <div id="password-strength-border" class="strength-indicator"></div>
            </div>
            <div class="password-hint">
                <span id="passwordHint">Minimum 8 characters</span>
                <span id="charCount" style="font-family: ui-monospace, monospace;">0 chars</span>
            </div>
          </div>
          <div class="form-group">
            <label for="passwordConfirm">Confirm Password</label>
             <div class="password-wrapper">
                <input type="password" id="passwordConfirm" placeholder="Re-enter password" required style="padding-right: 40px;">
                 <button type="button" class="password-toggle" onclick="togglePasswordVisibility('passwordConfirm')" title="Show/Hide Password">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  </button>
             </div>
          </div>
        </form>
        <div class="wizard-actions">
          <button class="btn btn-secondary" onclick="prevStep()">Back</button>
          <button class="btn btn-primary" id="adminContinueBtn" onclick="nextStep()" disabled>Continue</button>
        </div>
      </div>

      <!-- Step 4: Site Basics -->
      <div class="step" data-step="4">
        <h2 class="step-title">Site Configuration</h2>
        <p class="step-description">
          Configure your site's basic settings. You can change these later in the admin panel.
        </p>
        <form id="siteForm" onsubmit="return false;">
          <div class="form-group">
            <label for="siteTitle">Site Title</label>
            <input type="text" id="siteTitle" value="My 14KB Site" required>
          </div>
          <div class="form-group">
            <label for="language">Admin Interface Language</label>
            <select id="language">
              <option value="en">English</option>
              <option value="de">Deutsch</option>
            </select>
          </div>
        </form>
        <div class="wizard-actions">
          <button class="btn btn-secondary" onclick="prevStep()">Back</button>
          <button class="btn btn-primary" id="initButton" onclick="storeSiteData()">
             Next
          </button>
        </div>
      </div>

      <!-- Step 5: Webserver Config -->
      <div class="step" data-step="5">
        <h2 class="step-title">Webserver Configuration</h2>
        <p class="step-description">
          Prepare your webserver. This step is optional but recommended.
        </p>
        
        <div class="webserver-tabs">
          <button class="webserver-tab active" onclick="showWebserverConfig('apache')">Apache</button>
          <button class="webserver-tab" onclick="showWebserverConfig('nginx')">Nginx</button>
        </div>

        <div id="webserverConfigContainer" style="border: 1px solid var(--border); border-radius: 0 4px 4px 4px; background: var(--white); padding: 16px; margin-top: -1px;">
          <div class="check-item">
            <div class="check-label">Loading configuration...</div>
            <span class="spinner"></span>
          </div>
        </div>

        <div class="alert alert-info" style="margin-top: 16px;">
          <strong>Ready to Install:</strong> Click below to create your admin account, save settings, and finalize the installation.
        </div>

        <div class="wizard-actions">
          <button class="btn btn-secondary" onclick="prevStep()">Back</button>
          <button class="btn btn-primary" id="installButton" onclick="installAndFinish()">
            <span id="installButtonText">Install & Finish</span>
            <span id="installButtonSpinner" class="spinner" style="display: none; margin-left: 6px;"></span>
          </button>
        </div>
      </div>

      <!-- Step 6: Complete -->
      <div class="step" data-step="6">
        <div class="success-icon">✓</div>
        <h2 class="step-title" style="text-align: center;">Setup Complete!</h2>
        <p class="step-description" style="text-align: center;">
          Your CMS is ready to use. You can now log in to the admin panel and start creating content.
        </p>
        <div class="alert alert-success">
          <strong>What's next?</strong>
          <ul>
            <li>Log in with your password</li>
            <li>Change, customise and recompile your startpage</li>
            <li>Create your first blog entry</li>
            <li>Customize your site settings</li>
            <li>Start writing within the 14KB limit!</li>
          </ul>
        </div>
        <div class="wizard-actions">
          <div></div>
          <a href="/admin/login.html" class="btn btn-primary" style="text-decoration: none;">Log in</a>
        </div>
      </div>
    </div>
  </div>

  <script>
    // Setup token for CSRF protection
    const SETUP_TOKEN = '<?php echo $setupToken; ?>';
    
    let currentStep = 1;
    const totalSteps = 6;
    let systemChecks = {};
    let canProceed = false;
    let detectedWebserver = 'apache';
    
    // Temporary storage for postponed installation
    let installPayload = {
        password: '',
        siteTitle: '',
        language: ''
    };

    function updateProgress() {
      const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
      document.getElementById('progressFill').style.width = progress + '%';
    }

    function showAlert(message, type = 'error') {
      const container = document.getElementById('alertContainer');
      container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
      setTimeout(() => container.innerHTML = '', 5000);
    }

    function nextStep() {
      if (currentStep === 2 && !canProceed) {
        showAlert('Please fix all required issues before continuing.');
        return;
      }

      if (currentStep === 3) {
        const password = document.getElementById('password').value;
        const passwordConfirm = document.getElementById('passwordConfirm').value;
        
        if (password.length < 8) {
          showAlert('Password must be at least 8 characters.');
          return;
        }
        
        if (password !== passwordConfirm) {
          showAlert('Passwords do not match.');
          return;
        }
      }

      document.querySelector(`.step[data-step="${currentStep}"]`).classList.remove('active');
      currentStep++;
      document.querySelector(`.step[data-step="${currentStep}"]`).classList.add('active');
      updateProgress();

      if (currentStep === 2) runSystemCheck();
      if (currentStep === 5) loadWebserverConfig(detectedWebserver);
    }

    function prevStep() {
      document.querySelector(`.step[data-step="${currentStep}"]`).classList.remove('active');
      currentStep--;
      document.querySelector(`.step[data-step="${currentStep}"]`).classList.add('active');
      updateProgress();
    }

    function togglePasswordVisibility(id) {
        const input = document.getElementById(id);
        const icon = input.nextElementSibling.querySelector('svg');
        
        if (input.type === 'password') {
            input.type = 'text';
            // Eye off icon
            icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
        } else {
            input.type = 'password';
            // Eye icon
            icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
        }
    }

    document.getElementById('password')?.addEventListener('input', (e) => {
      const password = e.target.value;
      const strengthBorder = document.getElementById('password-strength-border');
      const hint = document.getElementById('passwordHint');
      const charCount = document.getElementById('charCount');
      const continueBtn = document.getElementById('adminContinueBtn');
      
      let strength = 0;
      
      // Update char count
      if(charCount) charCount.textContent = `${password.length} chars`;
      
      if (password.length >= 8) strength++;
      if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
      if (password.match(/[0-9]/)) strength++;
      if (password.match(/[^a-zA-Z0-9]/)) strength++;
      
      if(strengthBorder) strengthBorder.className = 'strength-indicator';
      
      if (password.length === 0) {
        if(hint) {
            hint.textContent = 'Minimum 8 characters';
            hint.style.color = 'var(--text-muted)';
        }
      } else if (password.length < 8) {
        if(strengthBorder) strengthBorder.classList.add('weak');
        if(hint) {
            hint.textContent = 'Too short (min 8)';
            hint.style.color = '#ef4444';
        }
      } else if (strength <= 2) {
        if(strengthBorder) strengthBorder.classList.add('weak');
        if(hint) {
            hint.textContent = 'Weak password';
            hint.style.color = '#ef4444';
        }
      } else if (strength === 3) {
        if(strengthBorder) strengthBorder.classList.add('medium');
        if(hint) {
            hint.textContent = 'Medium strength';
            hint.style.color = '#f59e0b';
        }
      } else {
        if(strengthBorder) strengthBorder.classList.add('strong');
        if(hint) {
            hint.textContent = 'Strong password';
            hint.style.color = '#10b981';
        }
      }
      
      const passwordConfirm = document.getElementById('passwordConfirm').value;
      continueBtn.disabled = password.length < 8 || password !== passwordConfirm;
    });

    document.getElementById('passwordConfirm')?.addEventListener('input', (e) => {
      const password = document.getElementById('password').value;
      const passwordConfirm = e.target.value;
      const continueBtn = document.getElementById('adminContinueBtn');
      continueBtn.disabled = password.length < 8 || password !== passwordConfirm;
    });

    async function runSystemCheck() {
      try {
        const response = await fetch('/setup/api.php/check');
        const data = await response.json();
        
        systemChecks = data.checks;
        canProceed = data.canProceed;
        detectedWebserver = data.webserver;
        
        const checkList = document.getElementById('checkList');
        checkList.innerHTML = '';
        
        for (const [key, check] of Object.entries(data.checks)) {
          const li = document.createElement('li');
          li.className = `check-item ${check.status}`;
          li.innerHTML = `
            <div>
              <div>
                <span class="check-label">${check.label}:</span>
                <span class="check-message">${check.message}</span>
              </div>
              ${check.fix ? `<div style="margin-top:4px; font-size:12px; color:#ef4444; background:#fef2f2; padding:8px; border-radius:4px;">${check.fix}</div>` : ''}
            </div>
            <span class="check-status ${check.status}">${check.status.toUpperCase()}</span>
          `;
          checkList.appendChild(li);
        }
        
        document.getElementById('checkContinueBtn').disabled = !canProceed;
        if (!canProceed) showAlert('Please fix all required issues before continuing.', 'error');
      } catch (error) {
        showAlert('Failed to run system check: ' + error.message, 'error');
      }
    }

    function storeSiteData() {
        installPayload.siteTitle = document.getElementById('siteTitle').value;
        installPayload.language = document.getElementById('language').value;
        nextStep();
    }

    async function installAndFinish() {
      const button = document.getElementById('installButton');
      const buttonText = document.getElementById('installButtonText');
      const buttonSpinner = document.getElementById('installButtonSpinner');
      
      button.disabled = true;
      buttonText.textContent = 'Installing...';
      buttonSpinner.style.display = 'inline-block';
      
      // Get password from step 3 (it is still in the DOM)
      installPayload.password = document.getElementById('password').value;
      
      try {
        const response = await fetch('/setup/api.php/install', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Setup-Token': SETUP_TOKEN
          },
          body: JSON.stringify(installPayload),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Installation failed');
        }
        
        // Show success message, no auto-redirect
        nextStep();
      } catch (error) {
        showAlert('Installation failed: ' + error.message, 'error');
        button.disabled = false;
        buttonText.textContent = 'Install & Finish';
        buttonSpinner.style.display = 'none';
      }
    }

    async function loadWebserverConfig(type) {
      try {
        const response = await fetch(`/setup/api.php/webserver-config?type=${type}`);
        const data = await response.json();
        
        const container = document.getElementById('webserverConfigContainer');
        container.innerHTML = `
          <div class="config-box">
            <div class="config-filename">
              <span>${data.file}</span>
              <button class="btn btn-secondary btn-small" onclick="copyConfig(this)">Copy</button>
            </div>
            <div class="config-content" id="configContent">${escapeHtml(data.content)}</div>
          </div>
        `;
      } catch (error) {
        showAlert('Failed to load configuration: ' + error.message, 'error');
      }
    }

    function showWebserverConfig(type) {
      document.querySelectorAll('.webserver-tab').forEach(tab => tab.classList.remove('active'));
      event.target.classList.add('active');
      loadWebserverConfig(type);
    }

    function copyConfig(button) {
      const content = document.getElementById('configContent').textContent;
      navigator.clipboard.writeText(content).then(() => {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => button.textContent = originalText, 2000);
      });
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }



    updateProgress();
  </script>
</body>
</html>
