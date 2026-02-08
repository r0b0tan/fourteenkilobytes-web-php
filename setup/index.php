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
  <link rel="stylesheet" href="/admin/style.css">
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
      text-align: center;
      margin-bottom: 24px;
    }

    .wizard-logo {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      color: var(--accent);
      margin-bottom: 16px;
    }

    .wizard-logo svg {
      width: 32px;
      height: 32px;
    }

    .wizard-logo-text {
      font-size: 13px;
      line-height: 1.1;
      font-family: ui-monospace, monospace;
      font-weight: 600;
      letter-spacing: 0.05em;
    }

    .wizard-title {
      font-size: 22px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 6px;
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
      background: var(--gray-100);
      border: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .check-item.ok {
      background: #f0fdf4;
      border-color: #86efac;
    }

    .check-item.warning {
      background: #fef9c3;
      border-color: #fde047;
    }

    .check-item.error {
      background: #fef2f2;
      border-color: #fca5a5;
    }

    .check-label {
      font-weight: 500;
      color: var(--text-primary);
      font-size: 13px;
    }

    .check-message {
      font-size: 12px;
      color: var(--text-secondary);
      margin-top: 2px;
    }

    .check-item code {
      display: block;
      font-size: 11px;
      font-family: ui-monospace, monospace;
      margin-top: 4px;
      padding: 4px 8px;
      background: var(--gray-800);
      color: #10b981;
      border-radius: 4px;
    }

    .check-status {
      display: inline-flex;
      align-items: center;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      flex-shrink: 0;
    }

    .check-status.ok {
      background: #10b981;
      color: white;
    }

    .check-status.warning {
      background: #f59e0b;
      color: white;
    }

    .check-status.error {
      background: #ef4444;
      color: white;
    }

    .password-strength {
      margin-top: 6px;
      height: 2px;
      background: var(--gray-200);
      border-radius: 2px;
      overflow: hidden;
    }

    .password-strength-fill {
      height: 100%;
      transition: width 0.15s, background 0.15s;
      width: 0%;
    }

    .password-strength-fill.weak { width: 33%; background: #ef4444; }
    .password-strength-fill.medium { width: 66%; background: #f59e0b; }
    .password-strength-fill.strong { width: 100%; background: #10b981; }

    .password-hint {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 4px;
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
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid var(--border);
      gap: 8px;
    }

    .alert ul {
      margin-top: 8px;
      margin-left: 24px;
      font-size: 13px;
    }

    .alert-error {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fca5a5;
    }

    .alert-success {
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #86efac;
    }

    .alert-info {
      background: #eff6ff;
      color: #1e40af;
      border: 1px solid #93c5fd;
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
        <svg viewBox="0 0 2560 2560" xmlns="http://www.w3.org/2000/svg"><path d="M406 1889 c-175 -35 -325 -178 -371 -356 -21 -81 -22 -1071 -1 -1149 42 -158 162 -284 316 -331 l65 -20 3 -254 c3 -236 4 -256 23 -285 26 -39 82 -59 142 -50 49 7 99 47 122 96 16 34 18 76 21 505 l3 470 78 3 77 3 0 -476 c0 -451 1 -478 20 -520 25 -56 64 -86 128 -100 102 -23 199 40 224 145 7 28 10 173 8 413 l-3 371 73 6 c178 15 318 99 408 246 l47 76 3 557 c3 531 2 560 -17 620 -26 84 -98 192 -164 245 -100 82 -176 113 -304 124 -60 7 -399 10 -902 9 -720 -2 -816 -4 -878 -19z m1686 -230 c76 -37 143 -106 173 -177 25 -61 25 -1074 0 -1135 -30 -71 -97 -140 -173 -177 l-67 -33 -750 0 -750 0 -67 33 c-76 37 -143 106 -173 177 -25 61 -25 1074 0 1135 30 71 97 140 173 177 l67 33 750 0 750 0 67 -33z"/><path d="M782 1579 c-29 -11 -69 -56 -77 -87 -8 -34 16 -89 49 -110 34 -21 61 -21 87 2 42 37 46 109 8 145 -29 27 -36 28 -67 50z"/><path d="M1228 1578 c-32 -11 -58 -50 -58 -89 0 -55 29 -89 80 -94 90 -10 140 92 78 159 -28 31 -57 38 -100 24z"/><path d="M1658 1578 c-32 -11 -58 -50 -58 -89 0 -55 29 -89 80 -94 90 -10 140 92 78 159 -28 31 -57 38 -100 24z"/><path d="M787 1129 c-53 -31 -65 -106 -24 -154 34 -41 99 -45 140 -9 24 21 32 37 32 64 0 42 -27 79 -70 95 -39 15 -46 16 -78 4z"/><path d="M1220 1130 c-44 -24 -60 -52 -60 -105 0 -78 82 -125 155 -90 53 26 75 95 47 149 -25 48 -94 71 -142 46z"/><path d="M1657 1129 c-53 -31 -65 -106 -24 -154 34 -41 99 -45 140 -9 24 21 32 37 32 64 0 42 -27 79 -70 95 -39 15 -46 16 -78 4z"/><path d="M787 679 c-53 -31 -65 -106 -24 -154 34 -41 99 -45 140 -9 24 21 32 37 32 64 0 42 -27 79 -70 95 -39 15 -46 16 -78 4z"/><path d="M1220 680 c-44 -24 -60 -52 -60 -105 0 -78 82 -125 155 -90 53 26 75 95 47 149 -25 48 -94 71 -142 46z"/><path d="M1657 679 c-53 -31 -65 -106 -24 -154 34 -41 99 -45 140 -9 24 21 32 37 32 64 0 42 -27 79 -70 95 -39 15 -46 16 -78 4z"/></svg>
        <span class="wizard-logo-text">14<br>KB</span>
      </div>
      <h1 class="wizard-title">Setup Wizard</h1>
      <p class="wizard-subtitle">Get your CMS up and running in minutes</p>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" id="progressFill"></div>
    </div>
    <div class="wizard-body">
      <div id="alertContainer"></div>

      <!-- Step 1: Welcome -->
      <div class="step active" data-step="1">
        <h2 class="step-title">Welcome to fourteenkilobytes</h2>
        <p class="step-description">
          This wizard will guide you through the initial setup process. It will take just a few minutes.
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
            <input type="password" id="password" placeholder="Enter a strong password" required>
            <div class="password-strength">
              <div class="password-strength-fill" id="passwordStrength"></div>
            </div>
            <div class="password-hint" id="passwordHint">Minimum 8 characters</div>
          </div>
          <div class="form-group">
            <label for="passwordConfirm">Confirm Password</label>
            <input type="password" id="passwordConfirm" placeholder="Re-enter password" required>
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
          <button class="btn btn-primary" id="initButton" onclick="initializeSetup()">
            <span id="initButtonText">Create Site</span>
            <span id="initButtonSpinner" class="spinner" style="display: none; margin-left: 6px;"></span>
          </button>
        </div>
      </div>

      <!-- Step 5: Webserver Config -->
      <div class="step" data-step="5">
        <h2 class="step-title">Webserver Configuration</h2>
        <p class="step-description">
          Your CMS files are ready! For best results, configure URL rewriting:
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
          <strong>Optional:</strong> URL rewriting is recommended but not required. You can skip this step and configure it later.
        </div>

        <div class="wizard-actions">
          <button class="btn btn-secondary" onclick="prevStep()">Back</button>
          <button class="btn btn-primary" onclick="completeSetup()">Finish Setup</button>
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
            <li>Create your first page</li>
            <li>Customize your site settings</li>
            <li>Start writing within the 14KB limit!</li>
          </ul>
        </div>
        <div class="wizard-actions">
          <div></div>
          <a href="/admin/" class="btn btn-primary" style="text-decoration: none;">Go to Admin Panel</a>
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

    document.getElementById('password')?.addEventListener('input', (e) => {
      const password = e.target.value;
      const strengthFill = document.getElementById('passwordStrength');
      const hint = document.getElementById('passwordHint');
      const continueBtn = document.getElementById('adminContinueBtn');
      
      let strength = 0;
      if (password.length >= 8) strength++;
      if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
      if (password.match(/[0-9]/)) strength++;
      if (password.match(/[^a-zA-Z0-9]/)) strength++;
      
      strengthFill.className = 'password-strength-fill';
      if (strength === 0) {
        hint.textContent = 'Too short';
      } else if (strength <= 2) {
        strengthFill.classList.add('weak');
        hint.textContent = 'Weak password';
      } else if (strength === 3) {
        strengthFill.classList.add('medium');
        hint.textContent = 'Medium strength';
      } else {
        strengthFill.classList.add('strong');
        hint.textContent = 'Strong password';
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
              <div class="check-label">${check.label}</div>
              <div class="check-message">${check.message}</div>
              ${check.fix ? `<code>${check.fix}</code>` : ''}
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

    async function initializeSetup() {
      const button = document.getElementById('initButton');
      const buttonText = document.getElementById('initButtonText');
      const buttonSpinner = document.getElementById('initButtonSpinner');
      
      button.disabled = true;
      buttonText.textContent = 'Creating...';
      buttonSpinner.style.display = 'inline-block';
      
      try {
        const password = document.getElementById('password').value;
        const siteTitle = document.getElementById('siteTitle').value;
        const language = document.getElementById('language').value;
        
        const response = await fetch('/setup/api.php/initialize', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Setup-Token': SETUP_TOKEN
          },
          body: JSON.stringify({ password, siteTitle, language }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Setup failed');
        }
        
        nextStep();
      } catch (error) {
        showAlert('Setup failed: ' + error.message, 'error');
        button.disabled = false;
        buttonText.textContent = 'Create Site';
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

    async function completeSetup() {
      try {
        const response = await fetch('/setup/api.php/complete', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Setup-Token': SETUP_TOKEN
          },
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to complete setup');
        }
        
        // Show success message briefly, then redirect
        nextStep();
        setTimeout(() => {
          window.location.href = '/admin/';
        }, 1500);
      } catch (error) {
        showAlert('Failed to complete setup: ' + error.message, 'error');
      }
    }

    updateProgress();
  </script>
</body>
</html>
