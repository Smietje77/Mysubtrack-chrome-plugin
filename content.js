// MySubTrack Content Script - Enhanced Version with Generic Detection
(function() {
  'use strict';

  // Performance optimization: Debounce function
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Loading spinner component
  class LoadingSpinner {
    static create(size = 20) {
      const spinner = document.createElement('div');
      spinner.className = 'mysubtrack-spinner';
      spinner.style.width = `${size}px`;
      spinner.style.height = `${size}px`;
      spinner.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="31.416" stroke-dashoffset="31.416">
            <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
            <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
          </circle>
        </svg>
      `;
      return spinner;
    }

    static show(element, text = 'Loading...') {
      if (!element) return;
      
      const originalContent = element.innerHTML;
      const originalText = element.textContent;
      
      element.disabled = true;
      element.dataset.originalContent = originalContent;
      element.dataset.originalText = originalText;
      
      const spinner = this.create(16);
      element.innerHTML = '';
      element.appendChild(spinner);
      
      if (text) {
        const textSpan = document.createElement('span');
        textSpan.textContent = text;
        textSpan.style.marginLeft = '8px';
        element.appendChild(textSpan);
      }
    }

    static hide(element) {
      if (!element) return;
      
      element.disabled = false;
      element.innerHTML = element.dataset.originalContent || element.dataset.originalText || '';
      delete element.dataset.originalContent;
      delete element.dataset.originalText;
    }
  }

  // Enhanced error handling with retry logic
  class ErrorHandler {
    static async withRetry(operation, maxRetries = 3, delay = 1000) {
      let lastError;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await operation();
        } catch (error) {
          lastError = error;
          
          if (attempt === maxRetries) {
            throw error;
          }
          
          // Exponential backoff
          const waitTime = delay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
      
      throw lastError;
    }

    static isNetworkError(error) {
      const networkErrors = [
        'Network Error',
        'Failed to fetch',
        'net::ERR_',
        'timeout',
        'connection refused',
        'network connection failed'
      ];
      
      return networkErrors.some(pattern => 
        error.message?.toLowerCase().includes(pattern.toLowerCase())
      );
    }

    static getErrorMessage(error) {
      if (this.isNetworkError(error)) {
        return 'Network connection failed. Please check your internet connection and try again.';
      }
      
      if (error.message?.includes('rate limit')) {
        return 'Too many requests. Please wait a moment and try again.';
      }
      
      if (error.message?.includes('timeout')) {
        return 'Request timed out. Please try again.';
      }
      
      return error.message || 'An unexpected error occurred. Please try again.';
    }
  }

  // Duplicate detection system
  class DuplicateDetector {
    static async checkDuplicate(subscriptionData) {
      try {
        const existingSubscriptions = await mockAPI.getStoredSubscriptions();
        
        // Check for exact matches
        const exactMatch = existingSubscriptions.find(sub => 
          sub.service?.toLowerCase() === subscriptionData.service?.toLowerCase() &&
          sub.plan?.toLowerCase() === subscriptionData.plan?.toLowerCase()
        );
        
        if (exactMatch) {
          return {
            isDuplicate: true,
            existing: exactMatch,
            type: 'exact'
          };
        }
        
        // Check for similar services (fuzzy matching)
        const similarMatch = existingSubscriptions.find(sub => 
          this.calculateSimilarity(sub.service, subscriptionData.service) > 0.8
        );
        
        if (similarMatch) {
          return {
            isDuplicate: true,
            existing: similarMatch,
            type: 'similar'
          };
        }
        
        return { isDuplicate: false };
      } catch (error) {
        return { isDuplicate: false };
      }
    }

    static calculateSimilarity(str1, str2) {
      if (!str1 || !str2) return 0;
      
      const s1 = str1.toLowerCase();
      const s2 = str2.toLowerCase();
      
      if (s1 === s2) return 1;
      
      // Simple Levenshtein distance-based similarity
      const longer = s1.length > s2.length ? s1 : s2;
      const shorter = s1.length > s2.length ? s2 : s1;
      
      if (longer.length === 0) return 1;
      
      const distance = this.levenshteinDistance(longer, shorter);
      return (longer.length - distance) / longer.length;
    }

    static levenshteinDistance(str1, str2) {
      const matrix = [];
      
      for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
      }
      
      for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
      }
      
      for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
          if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
          }
        }
      }
      
      return matrix[str2.length][str1.length];
    }
  }

  // Mock API Class for MySubTrack
  class MockMySubTrackAPI {
    constructor() {
      this.baseDelay = 300; // Base delay in ms
      this.userData = {
        name: 'Alex Johnson',
        email: 'alex@example.com',
        plan: 'pro'
      };
      this.storageKey = 'mysubtrack_subscriptions';
      this.authKey = 'mysubtrack_auth';
    }

    // Simulate network delay with timeout
    async delay(minMs = 300, maxMs = 500) {
      const delayTime = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
      
      // Simulate occasional timeouts
      if (Math.random() < 0.05) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        throw new Error('Request timeout');
      }
      
      return new Promise(resolve => setTimeout(resolve, delayTime));
    }

    // Check authentication status (persistent)
    async checkAuth() {
      await this.delay();
      try {
        const auth = await this.getAuth();
        const now = Date.now();
        if (auth && auth.authenticated && (!auth.expiresAt || auth.expiresAt > now)) {
          return {
            success: true,
            authenticated: true,
            user: auth.user || this.userData,
            message: 'User is authenticated'
          };
        }
        // If expired, clear
        if (auth && auth.expiresAt && auth.expiresAt <= now) {
          await this.clearAuth();
        }
        return {
          success: true,
          authenticated: false,
          user: null,
          message: 'User is not authenticated'
        };
      } catch (e) {
        return { success: false, authenticated: false, user: null, message: 'Auth check failed' };
      }
    }

    // Perform sign-in (mock with 85% success) and remember session (7 days)
    async signIn() {
      await this.delay(400, 800);
      const success = Math.random() < 0.85;
      if (!success) {
        const errors = [
          'Invalid credentials',
          'Service temporarily unavailable',
          'Too many attempts, please try again later'
        ];
        const randomError = errors[Math.floor(Math.random() * errors.length)];
        throw new Error(randomError);
      }
      const auth = {
        authenticated: true,
        user: this.userData,
        token: 'demo-token-' + Math.random().toString(36).slice(2),
        // 7 day session
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
      };
      await this.setAuth(auth);
      return { success: true, authenticated: true, user: auth.user };
    }

    async signOut() {
      await this.clearAuth();
      return { success: true };
    }

    // Add subscription to MySubTrack (90% success rate)
    async addSubscription(subscriptionData) {
      await this.delay();
      
      const isSuccess = Math.random() < 0.9;
      
      if (isSuccess) {
        // Store in browser storage
        await this.storeSubscription(subscriptionData);
        
        return {
          success: true,
          message: `${subscriptionData.service} added to MySubTrack!`,
          subscription: subscriptionData,
          timestamp: new Date().toISOString()
        };
      } else {
        // Simulate various error types
        const errors = [
          'Network connection failed',
          'Service temporarily unavailable',
          'Invalid subscription data',
          'Rate limit exceeded'
        ];
        const randomError = errors[Math.floor(Math.random() * errors.length)];
        
        throw new Error(randomError);
      }
    }

    // Store subscription in browser storage
    async storeSubscription(subscriptionData) {
      try {
        const existingData = await this.getStoredSubscriptions();
        const newSubscription = {
          ...subscriptionData,
          id: this.generateId(),
          addedAt: new Date().toISOString(),
          status: 'active'
        };
        
        existingData.push(newSubscription);
        
        // Store in chrome.storage if available, otherwise localStorage
        if (typeof chrome !== 'undefined' && chrome.storage) {
          await chrome.storage.local.set({ [this.storageKey]: existingData });
        } else {
          localStorage.setItem(this.storageKey, JSON.stringify(existingData));
        }
        
        return newSubscription;
             } catch (error) {
         throw error;
       }
    }

    // Get stored subscriptions
    async getStoredSubscriptions() {
      try {
        let data = [];
        
        if (typeof chrome !== 'undefined' && chrome.storage) {
          const result = await chrome.storage.local.get([this.storageKey]);
          data = result[this.storageKey] || [];
        } else {
          const stored = localStorage.getItem(this.storageKey);
          data = stored ? JSON.parse(stored) : [];
        }
        
        return data;
             } catch (error) {
         return [];
       }
    }

    // ----- Auth persistence helpers -----
    async getAuth() {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          const result = await chrome.storage.local.get([this.authKey]);
          return result[this.authKey] || null;
        }
        const stored = localStorage.getItem(this.authKey);
        return stored ? JSON.parse(stored) : null;
      } catch (_) {
        return null;
      }
    }

    async setAuth(auth) {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          await chrome.storage.local.set({ [this.authKey]: auth });
        } else {
          localStorage.setItem(this.authKey, JSON.stringify(auth));
        }
      } catch (_) {}
    }

    async clearAuth() {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          await chrome.storage.local.remove([this.authKey]);
        } else {
          localStorage.removeItem(this.authKey);
        }
      } catch (_) {}
    }

    // Generate unique ID
    generateId() {
      return 'sub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Get subscription count
    async getSubscriptionCount() {
      const subscriptions = await this.getStoredSubscriptions();
      return subscriptions.length;
    }

    // Get today's detections count (mock from stored confirmations)
    async getTodayDetectionsCount() {
      const subscriptions = await this.getStoredSubscriptions();
      const today = new Date().toISOString().slice(0, 10);
      return subscriptions.filter(s => (s.addedAt || '').slice(0, 10) === today).length;
    }

    // Get total saved estimate based on price field
    async getTotalSavedEstimate() {
      const subscriptions = await this.getStoredSubscriptions();
      let total = 0;
      for (const s of subscriptions) {
        if (s && typeof s.price === 'number') {
          total += s.price;
        }
      }
      return total;
    }
  }

  // Enhanced Toast notification system with better animations
  class ToastNotification {
    static show(message, type = 'success', duration = 5000) {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(['mysubtrack_show_notifications'], (res) => {
            const enabled = res && (res.mysubtrack_show_notifications ?? true);
            if (!enabled) return;
            ToastNotification._render(message, type, duration);
          });
          return;
        }
      } catch (_) {}
      ToastNotification._render(message, type, duration);
    }

    static _getContainer() {
      let container = document.getElementById('mysubtrack-toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'mysubtrack-toast-container';
        container.className = 'mysubtrack-toasts';
        document.body.appendChild(container);
      }
      return container;
    }

    static _render(message, type = 'success', duration = 5000) {
      const container = ToastNotification._getContainer();
      const toast = document.createElement('div');
      toast.className = `mysubtrack-toast mysubtrack-toast-${type}`;
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      
      const icon = type === 'success' ? '✓' : type === 'error' ? '⚠' : 'ℹ';
      const iconClass = type === 'success' ? 'success-icon' : type === 'error' ? 'error-icon' : 'info-icon';
      
      toast.innerHTML = `
        <div class="mysubtrack-toast-content">
          <div class="mysubtrack-toast-icon ${iconClass}">
            ${icon}
          </div>
          <div class="mysubtrack-toast-message">${sanitizeHTML(message)}</div>
          <button class="mysubtrack-toast-close" aria-label="Close notification">×</button>
        </div>
      `;

      // Insert newest toasts at the top
      if (container.firstChild) {
        container.insertBefore(toast, container.firstChild);
      } else {
        container.appendChild(toast);
      }

      const close = () => {
        toast.classList.add('mysubtrack-toast-exiting');
        setTimeout(() => {
          if (toast.parentElement) toast.remove();
        }, 300);
      };

      const closeBtn = toast.querySelector('.mysubtrack-toast-close');
      if (closeBtn) closeBtn.addEventListener('click', close);

      // Trigger entrance animation
      requestAnimationFrame(() => {
        toast.classList.add('mysubtrack-toast-visible');
      });

      // Auto remove
      const timeoutId = setTimeout(close, duration);

      // If user hovers, pause auto-dismiss; resume on leave
      toast.addEventListener('mouseenter', () => clearTimeout(timeoutId));
      toast.addEventListener('mouseleave', () => {
        const newTimeoutId = setTimeout(close, 2000);
        toast.dataset.timeoutId = newTimeoutId;
      });
    }
  }

  // Enhanced Login prompt modal with loading states
  class LoginPrompt {
    static show() {
      const modalHTML = `
        <div id="mysubtrack-login-backdrop" class="mysubtrack-modal-backdrop">
          <div id="mysubtrack-login-modal" class="mysubtrack-modal mysubtrack-login-modal">
            <div class="mysubtrack-modal-header">
              <div class="mysubtrack-modal-title">
                <h2>Sign in to MySubTrack</h2>
              </div>
              <button class="mysubtrack-modal-close" onclick="LoginPrompt.close()">×</button>
            </div>
            
            <div class="mysubtrack-modal-content">
              <div class="mysubtrack-login-content">
                <div class="mysubtrack-login-icon">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor"/>
                  </svg>
                </div>
                <h3>Sign in to continue</h3>
                <p>You need to be logged in to add subscriptions to MySubTrack.</p>
                <div id="mysubtrack-login-error" style="display:none;color:#d32f2f;margin-bottom:12px;font-weight:600"></div>
                
                <div class="mysubtrack-login-actions">
                  <button id="mysubtrack-login-btn" class="mysubtrack-btn-primary" onclick="LoginPrompt.signIn()">Sign In</button>
                  <button class="mysubtrack-btn-secondary" onclick="LoginPrompt.close()">Cancel</button>
                </div>

                <div class="mysubtrack-login-footer">
                  <small>Demo sign-in keeps you signed in for 7 days. No real account is created. <a href="#" onclick="LoginPrompt.openSignup();return false;">Create an account</a></small>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      
      // Add global functions
      window.LoginPrompt = LoginPrompt;
      
      // Show modal with animation
      requestAnimationFrame(() => {
        document.getElementById('mysubtrack-login-backdrop').classList.add('mysubtrack-modal-visible');
      });
    }
    
    static close() {
      const backdrop = document.getElementById('mysubtrack-login-backdrop');
      if (backdrop) {
        backdrop.classList.remove('mysubtrack-modal-visible');
        setTimeout(() => {
          backdrop.remove();
        }, 300);
      }
    }
    
    static async signIn() {
      const btn = document.getElementById('mysubtrack-login-btn');
      const err = document.getElementById('mysubtrack-login-error');
      
      try {
        if (btn) {
          LoadingSpinner.show(btn, 'Signing in...');
        }
        if (err) {
          err.style.display = 'none';
          err.textContent = '';
        }
        
        const res = await ErrorHandler.withRetry(() => mockAPI.signIn(), 2, 1000);
        
        if (!res || !res.success) throw new Error('Sign-in failed');
        
        this.close();
        ToastNotification.show('Signed in successfully. Welcome back!', 'success');
        
        if (window.currentSubscriptionData) {
          setTimeout(() => {
            handleSubscriptionWithAuth(window.currentSubscriptionData);
          }, 400);
        }
      } catch (e) {
        const errorMessage = ErrorHandler.getErrorMessage(e);
        
        if (err) {
          err.textContent = errorMessage;
          err.style.display = 'block';
        } else {
          ToastNotification.show(errorMessage, 'error');
        }
      } finally {
        if (btn) {
          LoadingSpinner.hide(btn);
        }
      }
    }

    static openSignup() {
      try { window.open('https://mysubtrack.com/signup', '_blank'); } catch (_) {}
    }
  }

  // Global API instance
  const mockAPI = new MockMySubTrackAPI();
  // Expose minimal API for popup via window (optional fallback)
  try { window.__mysubtrack = { mockAPI }; } catch (_) {}

  // Enhanced subscription handling with duplicate detection
  async function handleSubscriptionWithAuth(subscriptionData) {
    try {
      // Check authentication first
      const authResult = await ErrorHandler.withRetry(() => mockAPI.checkAuth(), 2, 500);
      
      if (!authResult.authenticated) {
        // Show login prompt
        window.currentSubscriptionData = subscriptionData;
        LoginPrompt.show();
        return;
      }
      
      // Check for duplicates
      const duplicateCheck = await DuplicateDetector.checkDuplicate(subscriptionData);
      
      if (duplicateCheck.isDuplicate) {
        showDuplicateWarning(subscriptionData, duplicateCheck);
        return;
      }
      
      // User is authenticated and no duplicates, proceed with adding subscription
      await addSubscriptionWithRetry(subscriptionData);
      
         } catch (error) {
       ToastNotification.show('Failed to check authentication status', 'error');
     }
  }

  // Show duplicate warning modal
  function showDuplicateWarning(subscriptionData, duplicateCheck) {
    const existing = duplicateCheck.existing;
    const modalHTML = `
      <div id="mysubtrack-duplicate-backdrop" class="mysubtrack-modal-backdrop">
        <div id="mysubtrack-duplicate-modal" class="mysubtrack-modal">
          <div class="mysubtrack-modal-header">
            <div class="mysubtrack-modal-title">
              <h2>Duplicate Subscription Detected</h2>
            </div>
            <button class="mysubtrack-modal-close" onclick="closeDuplicateModal()">×</button>
          </div>
          
          <div class="mysubtrack-modal-content">
            <div class="mysubtrack-duplicate-content">
              <div class="mysubtrack-duplicate-icon">⚠️</div>
              <h3>Similar subscription already exists</h3>
              <p>We found a similar subscription in your account:</p>
              
              <div class="mysubtrack-duplicate-comparison">
                <div class="mysubtrack-duplicate-existing">
                  <strong>Existing:</strong> ${existing.service} - ${existing.plan}
                  ${existing.price ? ` ($${existing.price}/${existing.billingCycle})` : ''}
                </div>
                <div class="mysubtrack-duplicate-new">
                  <strong>New:</strong> ${subscriptionData.service} - ${subscriptionData.plan}
                  ${subscriptionData.price ? ` ($${subscriptionData.price}/${subscriptionData.billingCycle})` : ''}
                </div>
              </div>
              
              <div class="mysubtrack-duplicate-actions">
                <button class="mysubtrack-btn-primary" onclick="addSubscriptionAnyway()">
                  Add Anyway
                </button>
                <button class="mysubtrack-btn-secondary" onclick="closeDuplicateModal()">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add global functions
    window.closeDuplicateModal = () => {
      const backdrop = document.getElementById('mysubtrack-duplicate-backdrop');
      if (backdrop) {
        backdrop.classList.remove('mysubtrack-modal-visible');
        setTimeout(() => {
          backdrop.remove();
        }, 300);
      }
    };
    
    window.addSubscriptionAnyway = () => {
      closeDuplicateModal();
      addSubscriptionWithRetry(subscriptionData);
    };
    
    // Show modal
    requestAnimationFrame(() => {
      document.getElementById('mysubtrack-duplicate-backdrop').classList.add('mysubtrack-modal-visible');
    });
  }

  // Enhanced subscription addition with retry functionality
  async function addSubscriptionWithRetry(subscriptionData, retryCount = 0) {
    const maxRetries = 2;
    
    try {
      const result = await ErrorHandler.withRetry(
        () => mockAPI.addSubscription(subscriptionData),
        maxRetries,
        1000
      );
      
      // Show success message
      ToastNotification.show(result.message, 'success');
      
      // Close modal and remove button
      closeModal();
      removeFloatingButton();
      
         } catch (error) {
       if (retryCount < maxRetries) {
        // Show retry option
        showRetryPrompt(subscriptionData, retryCount + 1, error.message);
      } else {
        // Max retries reached
        const errorMessage = ErrorHandler.getErrorMessage(error);
        ToastNotification.show(`Failed to add subscription: ${errorMessage}`, 'error');
      }
    }
  }

  // Enhanced retry prompt with better UX
  function showRetryPrompt(subscriptionData, retryCount, errorMessage) {
    const retryModalHTML = `
      <div id="mysubtrack-retry-backdrop" class="mysubtrack-modal-backdrop">
        <div id="mysubtrack-retry-modal" class="mysubtrack-modal">
          <div class="mysubtrack-modal-header">
            <div class="mysubtrack-modal-title">
              <h2>Add Subscription Failed</h2>
            </div>
            <button class="mysubtrack-modal-close" onclick="closeRetryModal()">×</button>
          </div>
          
          <div class="mysubtrack-modal-content">
            <div class="mysubtrack-retry-content">
              <div class="mysubtrack-error-icon">⚠️</div>
              <h3>Unable to add subscription</h3>
              <p>Error: ${ErrorHandler.getErrorMessage({ message: errorMessage })}</p>
              <p>Attempt ${retryCount} of 3</p>
              
              <div class="mysubtrack-retry-actions">
                <button class="mysubtrack-btn-primary" onclick="retryAddSubscription()">
                  Try Again
                </button>
                <button class="mysubtrack-btn-secondary" onclick="closeRetryModal()">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', retryModalHTML);
    
    // Add global functions
    window.closeRetryModal = () => {
      const backdrop = document.getElementById('mysubtrack-retry-backdrop');
      if (backdrop) {
        backdrop.classList.remove('mysubtrack-modal-visible');
        setTimeout(() => {
          backdrop.remove();
        }, 300);
      }
    };
    
    window.retryAddSubscription = () => {
      closeRetryModal();
      addSubscriptionWithRetry(subscriptionData, retryCount);
    };
    
    // Show modal
    requestAnimationFrame(() => {
      document.getElementById('mysubtrack-retry-backdrop').classList.add('mysubtrack-modal-visible');
    });
  }

  // Remove floating button with animation
  function removeFloatingButton() {
    const container = document.getElementById(CONFIG.containerId);
    if (container) {
      container.classList.remove('mysubtrack-visible');
      setTimeout(() => {
        container.remove();
      }, 300);
    }
  }

  // MySubTrack Content Script - Enhanced Version with Generic Detection
  (function() {
    'use strict';

    // Enhanced initialization with performance optimizations
    function initialize() {
      // Respect setting: autoDetect (default true)
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(['mysubtrack_auto_detect'], (res) => {
            const autoDetect = res && (res.mysubtrack_auto_detect ?? true);
            if (!autoDetect) return;
            initializeDetection();
          });
          return;
        }
      } catch (_) {}
      initializeDetection();
    }

    // Debounced detection initialization
    const debouncedInitializeDetection = debounce(initializeDetection, 500);

    function initializeDetection() {
      if (!isSupportedPage()) {
        return;
      }

      // Wait for page to load
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          setTimeout(() => {
            const subscriptionData = getSubscriptionData();
            if (subscriptionData) {
              createFloatingButton(subscriptionData);
            }
          }, 1000);
        });
      } else {
        // Add a small delay to ensure all elements are rendered
        setTimeout(() => {
          const subscriptionData = getSubscriptionData();
          if (subscriptionData) {
            createFloatingButton(subscriptionData);
          }
        }, 1000);
      }

      // Optimized mutation observer for dynamic content
      const observer = new MutationObserver(debounce((mutations) => {
        // Only process if we don't already have a button
        if (document.getElementById(CONFIG.buttonId)) return;
        
        // Check if any added nodes contain subscription-related content
        const hasRelevantContent = mutations.some(mutation => 
          mutation.type === 'childList' && 
          mutation.addedNodes.length > 0 &&
          Array.from(mutation.addedNodes).some(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const text = node.textContent?.toLowerCase() || '';
              return text.includes('price') || text.includes('subscription') || text.includes('plan');
            }
            return false;
          })
        );
        
        if (hasRelevantContent) {
          setTimeout(() => {
            const subscriptionData = getSubscriptionData();
            if (subscriptionData) {
              createFloatingButton(subscriptionData);
            }
          }, 500);
        }
      }, 300));

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

  // Service detection database (expanded)
  const SERVICES = {
      netflix: {
        name: 'Netflix',
        category: 'Entertainment',
        brandColors: ['#e50914', '#b20710'],
        domains: ['netflix.com'],
        paths: ['/signup/payment', '/signup/planform', '/signup', '/planform'],
        selectors: {
          price: [
            '.price-value',
            '.plan-price',
            '.price',
            '[data-testid="price"]',
            '.billing-price',
            '.plan-billing-price',
            '.price-amount',
            '.subscription-price'
          ],
          planName: [
            '.plan-name',
            '.plan-title',
            '[data-testid="plan-name"]',
            '.billing-plan-name',
            '.plan-type',
            '.subscription-plan'
          ],
          billingCycle: [
            '.billing-cycle',
            '.plan-billing-cycle',
            '.price-period',
            '.subscription-period'
          ]
        }
      },
      spotify: {
        name: 'Spotify',
        category: 'Music',
        brandColors: ['#1DB954', '#159d46'],
        domains: ['spotify.com'],
        paths: ['/premium', '/checkout', '/purchase'],
        selectors: {
          price: [
            '.price-value',
            '.plan-price',
            '.price',
            '[data-testid="price"]',
            '.billing-price',
            '.plan-billing-price',
            '.price-amount',
            '.subscription-price',
            '.premium-price',
            '.checkout-price'
          ],
          planName: [
            '.plan-name',
            '.plan-title',
            '[data-testid="plan-name"]',
            '.billing-plan-name',
            '.plan-type',
            '.subscription-plan',
            '.premium-plan',
            '.checkout-plan'
          ],
          billingCycle: [
            '.billing-cycle',
            '.plan-billing-cycle',
            '.price-period',
            '.subscription-period',
            '.premium-period'
          ]
        }
      },
      adobe: {
        name: 'Adobe Creative Cloud',
        category: 'Software',
        brandColors: ['#fa0f00', '#c20c00'],
        domains: ['adobe.com'],
        paths: ['/creativecloud', '/plans', '/buy', '/checkout', '/choose-plan'],
        selectors: {
          price: [
            '.offer__price',
            '.spectrum-Text.pricing',
            '.plan-price',
            '.pricing__price',
            '[data-test*="price"]',
            '.price'
          ],
          planName: [
            '.offer__title',
            '.plan-title',
            '.spectrum-Heading',
            '[data-test*="plan-name"]',
            'h1', 'h2', 'h3'
          ],
          billingCycle: [
            '.offer__billing',
            '.billing-cycle',
            '.price-period'
          ]
        }
      },
      m365: {
        name: 'Microsoft 365',
        category: 'Software',
        brandColors: ['#0078d4', '#106ebe'],
        domains: ['microsoft.com', 'office.com', 'microsoft365.com'],
        paths: ['/microsoft-365', '/buy', '/pricing', '/compare', '/checkout', '/services'],
        selectors: {
          price: [
            '.price',
            '.buybox__price',
            '.c-price',
            '[aria-label*="price"]',
            '.f-lean',
            '.x-price',
            // Account services page specific selectors
            '[data-testid*="price"]',
            '.subscription-price',
            '.billing-amount',
            '.price-amount',
            // Look for text containing price patterns
            'div:contains("€")',
            'span:contains("€")',
            'p:contains("€")'
          ],
          planName: [
            '.c-heading',
            '.buybox__title',
            '.plan-title',
            '[data-plan-name]',
            'h1', 'h2', 'h3',
            // Account services page specific selectors
            '[data-testid*="plan"]',
            '.subscription-name',
            '.service-name',
            '.product-name'
          ],
          billingCycle: [
            '.billing-cycle',
            '.c-subheading',
            '.price-frequency',
            '.term',
            // Account services page specific selectors
            '.billing-period',
            '.subscription-period',
            '.renewal-cycle'
          ]
        }
      },
      github: {
        name: 'GitHub Pro',
        category: 'Developer',
        brandColors: ['#24292e', '#0d1117'],
        domains: ['github.com'],
        paths: ['/pricing', '/account/billing', '/organizations/enterprise'],
        selectors: {
          price: [
            '.PlanPrice',
            '.h2-mktg',
            '.js-plan-price',
            '[data-plan-price]',
            '.price'
          ],
          planName: [
            '.h3-mktg',
            '.PlanName',
            '.plan-name',
            '[data-plan-name]',
            'h1', 'h2', 'h3'
          ],
          billingCycle: [
            '.PlanBillingCycle',
            '.billing',
            '.price-period'
          ]
        }
      },
      zoom: {
        name: 'Zoom',
        category: 'Communication',
        brandColors: ['#2d8cff', '#0e71eb'],
        domains: ['zoom.us'],
        paths: ['/billing', '/pricing', '/plan', '/signup', '/buy'],
        selectors: {
          price: [
            '.pricing-amount',
            '.price',
            '.plan-price',
            '[data-qa*="price"]',
            '.billing-price'
          ],
          planName: [
            '.plan-title',
            '.pricing-name',
            '.plan-name',
            'h1', 'h2', 'h3'
          ],
          billingCycle: [
            '.pricing-term',
            '.billing-cycle',
            '.price-period'
          ]
        }
      },
      hulu: {
        name: 'Hulu',
        category: 'Entertainment',
        brandColors: ['#1ce783', '#12b36a'],
        domains: ['hulu.com'],
        paths: ['/start', '/plans', '/sign-up', '/signup', '/welcome'],
        selectors: {
          price: [
            '.plan-price',
            '.price',
            '.price-amount',
            '[data-testid*="price"]'
          ],
          planName: [
            '.plan-name',
            '.plan-title',
            '.subscription-plan',
            'h1', 'h2', 'h3'
          ],
          billingCycle: [
            '.billing-cycle',
            '.price-period',
            '.subscription-period'
          ]
        }
      },
      disney: {
        name: 'Disney+',
        category: 'Entertainment',
        brandColors: ['#113ccf', '#081b4b'],
        domains: ['disneyplus.com'],
        paths: ['/start', '/sign-up', '/subscribe', '/welcome', '/pricing'],
        selectors: {
          price: [
            '[data-testid*="price"]',
            '.price',
            '.plan-price'
          ],
          planName: [
            '.plan-name',
            '.plan-title',
            'h1', 'h2', 'h3'
          ],
          billingCycle: [
            '.billing-cycle',
            '.price-period',
            '.subscription-period'
          ]
        }
      },
      prime: {
        name: 'Amazon Prime',
        category: 'Entertainment',
        brandColors: ['#00a8e1', '#00a8e1'],
        domains: ['amazon.com', 'primevideo.com', 'amazon.co.uk', 'amazon.de'],
        paths: ['/prime', '/amazonprime', '/primevideo', '/gp/prime', '/pay', '/sign-up'],
        selectors: {
          price: [
            '#prime-CTA .a-color-price',
            '.a-color-price',
            '.priceToPay',
            '.price',
            '[data-testid*="price"]'
          ],
          planName: [
            '#prime-hero-heading',
            '.plan-title',
            'h1', 'h2'
          ],
          billingCycle: [
            '.price-frequency',
            '.billing-cycle',
            '.term'
          ]
        }
      },
      yt_premium: {
        name: 'YouTube Premium',
        category: 'Entertainment',
        brandColors: ['#ff0000', '#cc0000'],
        domains: ['youtube.com', 'youtu.be'],
        paths: ['/premium', '/red', '/paid_memberships', '/purchase'],
        selectors: {
          price: [
            '#price',
            '.ytd-offer-price',
            '.price',
            '[data-testid*="price"]'
          ],
          planName: [
            '#plan-name',
            '.ytd-offer-title',
            'h1', 'h2', 'h3'
          ],
          billingCycle: [
            '.ytd-offer-term',
            '.billing-cycle',
            '.price-period'
          ]
        }
      }
    };

    // Enhanced detection patterns with purchase intent indicators
    const PURCHASE_INTENT_PATTERNS = {
      // High-confidence purchase intent URL patterns
      purchaseUrlPatterns: [
        '/checkout',
        '/payment',
        '/billing',
        '/confirm',
        '/complete',
        '/success',
        '/order',
        '/cart',
        '/buy/',
        '/purchase',
        '/subscribe/confirm',
        '/signup/confirm',
        '/upgrade/confirm',
        '/checkout/',
        '/payment/',
        '/billing/',
        '/order/',
        '/cart/',
        '/buy',
        '/purchase/',
        '/subscribe/',
        '/signup/',
        '/upgrade/'
      ],
      
      // Medium-confidence purchase intent URL patterns
      mediumPurchaseUrlPatterns: [
        '/subscribe',
        '/signup',
        '/upgrade',
        '/premium',
        '/pro',
        '/enterprise',
        '/business',
        '/team',
        '/family'
      ],
      
      // Exclude patterns (pages that should NOT trigger)
      excludeUrlPatterns: [
        '/pricing',
        '/plans',
        '/compare',
        '/features',
        '/about',
        '/help',
        '/support',
        '/contact',
        '/blog',
        '/news',
        '/home',
        '/',
        '/main',
        '/landing',
        '/overview',
        '/tour',
        '/demo',
        '/trial'
      ],
      
      // High-confidence purchase form indicators
      purchaseFormSelectors: [
        'form[action*="checkout"]',
        'form[action*="payment"]',
        'form[action*="billing"]',
        'form[action*="order"]',
        'form[action*="purchase"]',
        'form[action*="subscribe"]',
        'form[action*="signup"]',
        'form[action*="upgrade"]',
        '.checkout-form',
        '.payment-form',
        '.billing-form',
        '.order-form',
        '.purchase-form',
        '.subscription-form',
        '.signup-form',
        '.upgrade-form',
        '[data-testid*="checkout"]',
        '[data-testid*="payment"]',
        '[data-testid*="billing"]',
        '[data-testid*="order"]',
        '[data-testid*="purchase"]',
        '[data-testid*="subscribe"]',
        '[data-testid*="signup"]',
        '[data-testid*="upgrade"]'
      ],
      
      // Purchase action buttons
      purchaseButtonSelectors: [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:contains("Subscribe")',
        'button:contains("Sign Up")',
        'button:contains("Upgrade")',
        'button:contains("Buy")',
        'button:contains("Purchase")',
        'button:contains("Checkout")',
        'button:contains("Pay")',
        'button:contains("Confirm")',
        'button:contains("Complete")',
        'button:contains("Order")',
        'a:contains("Subscribe")',
        'a:contains("Sign Up")',
        'a:contains("Upgrade")',
        'a:contains("Buy")',
        'a:contains("Purchase")',
        'a:contains("Checkout")',
        'a:contains("Pay")',
        'a:contains("Confirm")',
        'a:contains("Complete")',
        'a:contains("Order")',
        '[data-testid*="subscribe"]',
        '[data-testid*="signup"]',
        '[data-testid*="upgrade"]',
        '[data-testid*="buy"]',
        '[data-testid*="purchase"]',
        '[data-testid*="checkout"]',
        '[data-testid*="pay"]',
        '[data-testid*="confirm"]',
        '[data-testid*="complete"]',
        '[data-testid*="order"]'
      ],
      
      // Purchase intent text patterns
      purchaseIntentTextPatterns: [
        /subscribe\s+now/i,
        /sign\s+up\s+now/i,
        /upgrade\s+now/i,
        /buy\s+now/i,
        /purchase\s+now/i,
        /checkout/i,
        /complete\s+purchase/i,
        /confirm\s+order/i,
        /place\s+order/i,
        /proceed\s+to\s+payment/i,
        /enter\s+payment\s+details/i,
        /billing\s+information/i,
        /payment\s+method/i,
        /credit\s+card/i,
        /debit\s+card/i,
        /pay\s+now/i,
        /confirm\s+subscription/i,
        /start\s+subscription/i,
        /activate\s+subscription/i
      ],
      
      // Exclude text patterns (content that indicates browsing, not purchasing)
      excludeTextPatterns: [
        /view\s+pricing/i,
        /see\s+plans/i,
        /compare\s+plans/i,
        /learn\s+more/i,
        /get\s+started/i,
        /start\s+free\s+trial/i,
        /try\s+free/i,
        /free\s+trial/i,
        /demo/i,
        /tour/i,
        /overview/i,
        /features/i,
        /benefits/i,
        /how\s+it\s+works/i,
        /pricing\s+page/i,
        /plans\s+page/i
      ]
    };

    // Generic detection patterns (simplified for purchase intent filtering)
    const GENERIC_PATTERNS = {
      // Price patterns to look for
      pricePatterns: [
        /\$[\d,]+\.?\d*\s*\/\s*(month|mo|year|yr|week|wk)/i,
        /€[\d,]+\.?\d*\s*\/\s*(month|mo|year|yr|week|wk)/i,
        /£[\d,]+\.?\d*\s*\/\s*(month|mo|year|yr|week|wk)/i,
        /¥[\d,]+\.?\d*\s*\/\s*(month|mo|year|yr|week|wk)/i,
        /₹[\d,]+\.?\d*\s*\/\s*(month|mo|year|yr|week|wk)/i,
        /[\d,]+\.?\d*\s*\/\s*(month|mo|year|yr|week|wk)/i,
        /\$[\d,]+\.?\d*\s*(per|a)\s*(month|year|week)/i,
        /€[\d,]+\.?\d*\s*(per|a)\s*(month|year|week)/i,
        /£[\d,]+\.?\d*\s*(per|a)\s*(month|year|week)/i
      ],
      
      // Subscription-related text patterns
      subscriptionTextPatterns: [
        /subscribe/i,
        /subscription/i,
        /billing/i,
        /premium/i,
        /upgrade/i,
        /plan/i,
        /monthly/i,
        /yearly/i,
        /annual/i,
        /weekly/i
      ]
    };

    // Configuration
    const CONFIG = {
      buttonId: 'mysubtrack-button',
      containerId: 'mysubtrack-container',
      modalId: 'mysubtrack-modal',
      modalBackdropId: 'mysubtrack-modal-backdrop'
    };

    // Utility functions
    function getElementText(selectors) {
      for (const selector of selectors) {
        // Handle :contains() pseudo-selector
        if (selector.includes(':contains(')) {
          const containsText = selector.match(/:contains\("([^"]+)"\)/)?.[1];
          if (containsText) {
            const baseSelector = selector.replace(/:contains\("[^"]+"\)/, '');
            const elements = document.querySelectorAll(baseSelector);
            for (const element of elements) {
              if (element.textContent.includes(containsText)) {
                return element.textContent.trim();
              }
            }
          }
        } else {
          const element = document.querySelector(selector);
          if (element) {
            return element.textContent.trim();
          }
        }
      }
      return null;
    }

    // Enhanced purchase intent detection
    function detectPurchaseIntent() {
      const url = window.location.href.toLowerCase();
      const pageText = document.body.textContent.toLowerCase();
      const title = document.title.toLowerCase();
      
      let purchaseScore = 0;
      let excludeScore = 0;
      let maxScore = 0;
      
      // Check for exclusion patterns first
      const excludeUrlMatch = PURCHASE_INTENT_PATTERNS.excludeUrlPatterns.some(pattern => 
        url.includes(pattern)
      );
      if (excludeUrlMatch) {
        excludeScore += 5;
      }
      
      const excludeTextMatch = PURCHASE_INTENT_PATTERNS.excludeTextPatterns.some(pattern => 
        pattern.test(pageText) || pattern.test(title)
      );
      if (excludeTextMatch) {
        excludeScore += 3;
      }
      
      // If exclusion score is high, don't proceed
      if (excludeScore >= 3) {
        return { hasPurchaseIntent: false, confidence: 'Low', reason: 'Excluded page type' };
      }
      
      // Check for high-confidence purchase patterns
      const highPurchaseUrlMatch = PURCHASE_INTENT_PATTERNS.purchaseUrlPatterns.some(pattern => 
        url.includes(pattern)
      );
      if (highPurchaseUrlMatch) {
        purchaseScore += 8;
        maxScore += 8;
      }
      
      // Check for purchase forms
      const purchaseFormExists = PURCHASE_INTENT_PATTERNS.purchaseFormSelectors.some(selector => 
        document.querySelector(selector)
      );
      if (purchaseFormExists) {
        purchaseScore += 6;
        maxScore += 6;
      }
      
      // Check for purchase buttons
      const purchaseButtonExists = PURCHASE_INTENT_PATTERNS.purchaseButtonSelectors.some(selector => {
        try {
          if (selector.includes(':contains(')) {
            const containsText = selector.match(/:contains\("([^"]+)"\)/)?.[1];
            if (containsText) {
              const baseSelector = selector.replace(/:contains\("[^"]+"\)/, '');
              const elements = document.querySelectorAll(baseSelector);
              return Array.from(elements).some(element => 
                element.textContent.toLowerCase().includes(containsText.toLowerCase())
              );
            }
          }
          return document.querySelector(selector);
        } catch (e) {
          return false;
        }
      });
      if (purchaseButtonExists) {
        purchaseScore += 4;
        maxScore += 4;
      }
      
      // Check for purchase intent text
      const purchaseIntentTextMatch = PURCHASE_INTENT_PATTERNS.purchaseIntentTextPatterns.some(pattern => 
        pattern.test(pageText) || pattern.test(title)
      );
      if (purchaseIntentTextMatch) {
        purchaseScore += 3;
        maxScore += 3;
      }
      
      // Check for medium-confidence purchase patterns
      const mediumPurchaseUrlMatch = PURCHASE_INTENT_PATTERNS.mediumPurchaseUrlPatterns.some(pattern => 
        url.includes(pattern)
      );
      if (mediumPurchaseUrlMatch) {
        purchaseScore += 2;
        maxScore += 2;
      }
      
      // Calculate confidence based on score
      let confidence = 'Low';
      let hasPurchaseIntent = false;
      
      if (maxScore > 0) {
        const ratio = purchaseScore / maxScore;
        if (ratio >= 0.7) {
          confidence = 'High';
          hasPurchaseIntent = true;
        } else if (ratio >= 0.4) {
          confidence = 'Medium';
          hasPurchaseIntent = true;
        }
      }
      
      return {
        hasPurchaseIntent,
        confidence,
        score: purchaseScore,
        maxScore,
        ratio: maxScore > 0 ? purchaseScore / maxScore : 0
      };
    }

    function detectService() {
      const url = window.location.href;
      const hostname = window.location.hostname;
      
      for (const [serviceKey, service] of Object.entries(SERVICES)) {
        // Check domain
        const domainMatch = service.domains.some(domain => 
          hostname.includes(domain)
        );
        
        if (domainMatch) {
          // Check if any path matches
          const pathMatch = service.paths.some(path => 
            url.includes(path)
          );
          
          if (pathMatch) {
            // Additional purchase intent check for known services
            const purchaseIntent = detectPurchaseIntent();
            
            // For known services, we can be more lenient but still check purchase intent
            if (purchaseIntent.hasPurchaseIntent || purchaseIntent.confidence === 'Medium') {
              return service;
            }
          }
        }
      }
      
      return null;
    }

    // Enhanced generic detection function with purchase intent
    function detectGenericSubscription() {
      // First check if this page has purchase intent
      const purchaseIntent = detectPurchaseIntent();
      
      if (!purchaseIntent.hasPurchaseIntent) {
        return null;
      }
      
      const url = window.location.href.toLowerCase();
      const pageText = document.body.textContent.toLowerCase();
      const title = document.title.toLowerCase();
      
      let confidence = purchaseIntent.confidence;
      let score = 0;
      let detectedData = {
        service: null,
        price: null,
        priceText: null,
        billingCycle: 'monthly',
        plan: null,
        confidence: confidence,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        purchaseIntent: purchaseIntent
      };

      // Check for price patterns (High confidence indicator)
      const priceElements = document.querySelectorAll('*');
      let foundPrice = null;
      let foundPriceText = null;
      
      for (const element of priceElements) {
        const text = element.textContent;
        for (const pattern of GENERIC_PATTERNS.pricePatterns) {
          if (pattern.test(text)) {
            foundPriceText = text.trim();
            foundPrice = parsePrice(text);
            if (foundPrice) {
              score += 4;
              detectedData.price = foundPrice;
              detectedData.priceText = foundPriceText;
              detectedData.billingCycle = parseBillingCycle(text);
              break;
            }
          }
        }
        if (foundPrice) break;
      }

      // Check for subscription-related text (Medium confidence indicator)
      const subscriptionTextMatch = GENERIC_PATTERNS.subscriptionTextPatterns.some(pattern => 
        pattern.test(pageText) || pattern.test(title)
      );
      if (subscriptionTextMatch) {
        score += 2;
      }

      // Extract service name
      detectedData.service = extractServiceName();
      detectedData.plan = extractPlanName();
      detectedData.confidence = confidence;

      // Only return if we have sufficient confidence and purchase intent
      if (score >= 2 && purchaseIntent.hasPurchaseIntent) {
        return detectedData;
      }

      return null;
    }

    function extractServiceName() {
      // Try to get service name from various sources
      const title = document.title;
      const hostname = window.location.hostname;
      
      // Extract from title (remove common suffixes)
      let serviceName = title
        .replace(/\s*[-|]\s*(Subscribe|Subscription|Billing|Checkout|Payment|Pricing|Plans).*$/i, '')
        .replace(/\s*[-|]\s*.*$/i, '')
        .trim();
      
      // If title extraction didn't work well, use domain
      if (!serviceName || serviceName.length < 2 || serviceName.length > 50) {
        serviceName = hostname
          .replace(/^www\./, '')
          .replace(/\.(com|org|net|co|io|app|dev)$/, '')
          .split('.')
          .pop();
      }
      
      // Capitalize first letter
      return serviceName.charAt(0).toUpperCase() + serviceName.slice(1);
    }

    function extractPlanName() {
      // Look for plan-related elements
      const planSelectors = [
        '.plan-name',
        '.plan-title',
        '.subscription-plan',
        '.billing-plan',
        '.package-name',
        '.tier-name',
        '[data-testid*="plan"]',
        'h1',
        'h2',
        'h3'
      ];
      
      for (const selector of planSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent.trim();
          // Filter out very long or very short text
          if (text.length > 3 && text.length < 100) {
            return text;
          }
        }
      }
      
      return 'Standard Plan';
    }

         function parsePrice(priceText) {
       if (!priceText) return null;
       const text = String(priceText);
       
       // Handle European format with comma as decimal separator (€ 99,00)
       const europeanFormat = text.match(/([€$£¥₹])\s*([\d.,]+)(?:\s*(?:per|\/)?\s*(?:month|mo|year|yr|week|wk))?/i);
       if (europeanFormat) {
         let num = europeanFormat[2];
         // Handle European decimal format (comma as decimal separator)
         if (num.includes(',') && !num.includes('.')) {
           num = num.replace(',', '.');
         } else {
           num = num.replace(/,/g, '');
         }
         const price = parseFloat(num);
         if (!isNaN(price) && price > 0 && price < 10000) return price;
       }
       
       // Handle specific Microsoft account format: "€ 99,00 Jaarlijks inclusief btw"
       const microsoftFormat = text.match(/([€$£¥₹])\s*([\d.,]+)(?:\s*[A-Za-z\s]+)?/i);
       if (microsoftFormat) {
         let num = microsoftFormat[2];
         if (num.includes(',') && !num.includes('.')) {
           num = num.replace(',', '.');
         } else {
           num = num.replace(/,/g, '');
         }
         const price = parseFloat(num);
         if (!isNaN(price) && price > 0 && price < 10000) return price;
       }
       
       // Handle simple price format: "€ 99" or "€99"
       const simpleFormat = text.match(/([€$£¥₹])\s*([\d,]+)/i);
       if (simpleFormat) {
         let num = simpleFormat[2];
         if (num.includes(',') && !num.includes('.')) {
           num = num.replace(',', '.');
         } else {
           num = num.replace(/,/g, '');
         }
         const price = parseFloat(num);
         if (!isNaN(price) && price > 0 && price < 10000) return price;
       }
       
       // Fallback: any number pattern
       const cleanText = text.replace(/[^\d.,]/g, '');
       const priceMatch = cleanText.match(/[\d,]+\.?\d*/);
       if (!priceMatch) return null;
       let num = priceMatch[0];
       if (num.includes(',') && !num.includes('.')) {
         num = num.replace(',', '.');
       } else {
         num = num.replace(/,/g, '');
       }
       const price = parseFloat(num);
       return (!isNaN(price) && price > 0 && price < 10000) ? price : null;
     }

         function parseBillingCycle(priceText, additionalText) {
       const combined = `${(priceText || '')} ${(additionalText || '')}`.toLowerCase();
       if (!combined.trim()) return 'monthly';
       
       // Yearly (including Dutch "Jaarlijks")
       if (combined.includes('/year') || combined.includes('/yr') || combined.includes('per year') ||
           combined.includes('yearly') || combined.includes('annual') || combined.includes('/annual') || 
           combined.includes('/annum') || combined.includes('jaarlijks') || combined.includes('jaar')) {
         return 'yearly';
       }
       
       // Monthly (including Dutch "Maandelijks")
       if (combined.includes('/month') || combined.includes('/mo') || combined.includes('per month') ||
           combined.includes('monthly') || combined.includes('/monthly') || combined.includes('/m') ||
           combined.includes('maandelijks') || combined.includes('maand')) {
         return 'monthly';
       }
       
       // Weekly (including Dutch "Wekelijks")
       if (combined.includes('/week') || combined.includes('/wk') || combined.includes('per week') || 
           combined.includes('weekly') || combined.includes('wekelijks') || combined.includes('week')) {
         return 'weekly';
       }
       
       // Default to monthly if no clear indication
       return 'monthly';
     }

         function extractSubscriptionData(service) {
       let priceText = getElementText(service.selectors.price);
       const planNameText = getElementText(service.selectors.planName);
       const billingCycleText = getElementText(service.selectors.billingCycle);
       
       // If no price found with selectors, try scanning all text for price patterns
       if (!priceText) {
         priceText = scanForPricePatterns();
       }
       
       const price = parsePrice(priceText);
       // Try to get billing cycle from price text first, then from billing cycle text, then scan page
       let billingCycle = parseBillingCycle(priceText, billingCycleText);
       if (billingCycle === 'monthly' && priceText) {
         // If we still have monthly as default, try scanning the entire page for billing indicators
         billingCycle = scanForBillingCycle();
       }
       const planName = planNameText || `${service.name} Plan`;
       
       return {
         service: service.name,
         plan: planName,
         price: price,
         priceText: priceText,
         billingCycle: billingCycle,
         url: window.location.href,
         timestamp: new Date().toISOString(),
         confidence: 'High', // Known services have high confidence
         category: service.category || 'Other',
         brandColors: service.brandColors || null
       };
     }
    
         function scanForPricePatterns() {
       const pageText = document.body.textContent;
       const pricePatterns = [
         // Microsoft account specific patterns
         /€\s*[\d,]+\s*Jaarlijks/i,
         /€\s*[\d,]+\s*Maandelijks/i,
         /€\s*[\d,]+\s*Wekelijks/i,
         // General European patterns
         /€\s*[\d,]+\.?\d*\s*(?:per|a)\s*(?:month|year|week)/i,
         /€\s*[\d,]+\.?\d*\s*\/\s*(?:month|mo|year|yr|week|wk)/i,
         // Simple price patterns
         /€\s*[\d,]+\s*[A-Za-z\s]+/i,
         /€\s*[\d,]+\.?\d*/i
       ];
       
       for (const pattern of pricePatterns) {
         const match = pageText.match(pattern);
         if (match) {
           return match[0].trim();
         }
       }
       
       // Fallback: look for any € followed by numbers
       const fallbackMatch = pageText.match(/€\s*[\d,]+/);
       if (fallbackMatch) {
         return fallbackMatch[0].trim();
       }
       
       return null;
     }
     
     function scanForBillingCycle() {
       const pageText = document.body.textContent.toLowerCase();
       
       // Check for yearly indicators
       if (pageText.includes('jaarlijks') || pageText.includes('jaar') || 
           pageText.includes('yearly') || pageText.includes('annual') || 
           pageText.includes('per year') || pageText.includes('/year')) {
         return 'yearly';
       }
       
       // Check for monthly indicators
       if (pageText.includes('maandelijks') || pageText.includes('maand') || 
           pageText.includes('monthly') || pageText.includes('per month') || 
           pageText.includes('/month')) {
         return 'monthly';
       }
       
       // Check for weekly indicators
       if (pageText.includes('wekelijks') || pageText.includes('week') || 
           pageText.includes('weekly') || pageText.includes('per week') || 
           pageText.includes('/week')) {
         return 'weekly';
       }
       
       // Default to monthly
       return 'monthly';
     }

    // HTML sanitization function to prevent XSS
    function sanitizeHTML(str) {
      if (!str) return '';
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    function formatButtonText(subscriptionData) {
      const confidenceBadge = subscriptionData.confidence === 'High' ? ' ✓' : ' ?';
      const serviceName = sanitizeHTML(subscriptionData.service);
      
      if (subscriptionData.price && subscriptionData.price > 0) {
        const currency = subscriptionData.priceText?.match(/[€$£¥₹]/)?.[0] || '$';
        const cycle = subscriptionData.billingCycle === 'yearly' ? '/year' : 
                     subscriptionData.billingCycle === 'weekly' ? '/week' : '/month';
        const price = parseFloat(subscriptionData.price).toFixed(2);
        return `Add ${serviceName} (${sanitizeHTML(currency)}${price}${sanitizeHTML(cycle)}) to MySubTrack${confidenceBadge}`;
      } else {
        return `Add ${serviceName} to MySubTrack${confidenceBadge}`;
      }
    }

    function calculateNextBillingDate(billingCycle) {
      const today = new Date();
      let nextBilling = new Date(today);
      
      switch (billingCycle) {
        case 'weekly':
          nextBilling.setDate(today.getDate() + 7);
          break;
        case 'yearly':
          nextBilling.setFullYear(today.getFullYear() + 1);
          break;
        case 'monthly':
        default:
          nextBilling.setMonth(today.getMonth() + 1);
          break;
      }
      
      return nextBilling.toISOString().split('T')[0]; // YYYY-MM-DD format
    }

    function getServiceLogoUrl(serviceName) {
      // For known services, use their domain
      const domainMap = {
        'Netflix': 'netflix.com',
        'Spotify': 'spotify.com',
        'Adobe Creative Cloud': 'adobe.com',
        'Microsoft 365': 'microsoft.com',
        'GitHub Pro': 'github.com',
        'Zoom': 'zoom.us',
        'Hulu': 'hulu.com',
        'Disney+': 'disneyplus.com',
        'Amazon Prime': 'amazon.com',
        'YouTube Premium': 'youtube.com'
      };
      const domain = domainMap[serviceName];
      if (domain) {
        return `https://logo.clearbit.com/${domain}?size=48`;
      }
      // For unknown services, try to construct from service name
      const serviceDomain = serviceName.toLowerCase().replace(/\s+/g, '') + '.com';
      return `https://logo.clearbit.com/${serviceDomain}?size=48`;
    }

    function createModal(subscriptionData) {
      // Remove existing modal if present
      const existingModal = document.getElementById(CONFIG.modalId);
      if (existingModal) {
        existingModal.remove();
      }

      const nextBillingDate = calculateNextBillingDate(subscriptionData.billingCycle);
      const logoUrl = getServiceLogoUrl(subscriptionData.service);
      const currency = subscriptionData.priceText?.match(/[€$£¥₹]/)?.[0] || '$';
      const cycle = subscriptionData.billingCycle === 'yearly' ? '/year' : 
                   subscriptionData.billingCycle === 'weekly' ? '/week' : '/month';

      const confidenceBadge = subscriptionData.confidence === 'High' ? 
        '<span class="mysubtrack-confidence-high">High Confidence ✓</span>' : 
        '<span class="mysubtrack-confidence-medium">Medium Confidence ?</span>';

      const sanitizedService = sanitizeHTML(subscriptionData.service);
      const sanitizedPlan = sanitizeHTML(subscriptionData.plan || '');
      const sanitizedCurrency = sanitizeHTML(currency);
      const sanitizedCycle = sanitizeHTML(cycle);
      const sanitizedBillingCycle = sanitizeHTML(subscriptionData.billingCycle.charAt(0).toUpperCase() + subscriptionData.billingCycle.slice(1));
      const sanitizedLogoUrl = sanitizeHTML(logoUrl || '');
      const priceDisplay = subscriptionData.price && subscriptionData.price > 0 ? 
        `${sanitizedCurrency}${parseFloat(subscriptionData.price).toFixed(2)}${sanitizedCycle}` : 'Not detected';

      const modalHTML = `
        <div id="${CONFIG.modalBackdropId}" class="mysubtrack-modal-backdrop">
          <div id="${CONFIG.modalId}" class="mysubtrack-modal">
            <div class="mysubtrack-modal-header">
              <div class="mysubtrack-modal-title">
                ${logoUrl ? `<img src="${sanitizedLogoUrl}" alt="${sanitizedService}" class="mysubtrack-service-logo">` : ''}
                <h2>Add Subscription</h2>
                <div class="mysubtrack-confidence-badge">
                  ${confidenceBadge}
                </div>
              </div>
              <button class="mysubtrack-modal-close" onclick="closeModal()">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
            
            <div class="mysubtrack-modal-content">
              <form id="mysubtrack-subscription-form">
                <div class="mysubtrack-form-group">
                  <label for="service-name">Service</label>
                  <input type="text" id="service-name" value="${sanitizedService}" readonly>
                </div>
                
                <div class="mysubtrack-form-group">
                  <label for="plan-name">Plan</label>
                  <input type="text" id="plan-name" value="${sanitizedPlan}" readonly>
                </div>
                
                <div class="mysubtrack-form-group">
                  <label for="price">Price</label>
                  <input type="text" id="price" value="${priceDisplay}" readonly>
                </div>
                
                <div class="mysubtrack-form-group">
                  <label for="billing-cycle">Billing Cycle</label>
                  <input type="text" id="billing-cycle" value="${sanitizedBillingCycle}" readonly>
                </div>
                
                <div class="mysubtrack-form-group">
                  <label for="next-billing">Next Billing Date</label>
                  <input type="date" id="next-billing" value="${nextBillingDate}" required>
                </div>
                
                <div class="mysubtrack-form-group">
                  <label for="notes">Notes (Optional)</label>
                  <textarea id="notes" placeholder="Add any notes about this subscription..." rows="3"></textarea>
                </div>
                
                <div class="mysubtrack-modal-actions">
                  <button type="button" class="mysubtrack-btn-secondary" onclick="closeModal()">Cancel</button>
                  <button type="submit" class="mysubtrack-btn-primary">Add Subscription</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', modalHTML);

             // Add event listeners
       const backdrop = document.getElementById(CONFIG.modalBackdropId);
       const modal = document.getElementById(CONFIG.modalId);
       const form = document.getElementById('mysubtrack-subscription-form');

       // Close on backdrop click
       backdrop.addEventListener('click', (e) => {
         if (e.target === backdrop) {
           closeModal();
         }
       });

       // Handle form submission
       form.addEventListener('submit', (e) => {
         e.preventDefault();
         handleFormSubmission(subscriptionData);
       });

       // Prevent modal close when clicking inside modal
       modal.addEventListener('click', (e) => {
         e.stopPropagation();
       });

       // Add global close function
       window.closeModal = closeModal;
       
       // Ensure cancel button works properly
       const cancelBtn = modal.querySelector('.mysubtrack-btn-secondary');
       if (cancelBtn) {
         cancelBtn.addEventListener('click', (e) => {
           e.preventDefault();
           e.stopPropagation();
           closeModal();
         });
       }

      // Trigger modal animation
      setTimeout(() => {
        backdrop.classList.add('mysubtrack-modal-visible');
      }, 10);
    }

    function closeModal() {
      const backdrop = document.getElementById(CONFIG.modalBackdropId);
      if (backdrop) {
        backdrop.classList.remove('mysubtrack-modal-visible');
        setTimeout(() => {
          backdrop.remove();
        }, 300);
      }
    }

    function handleFormSubmission(subscriptionData) {
      const nextBilling = document.getElementById('next-billing').value;
      const notes = document.getElementById('notes').value;

      const finalSubscriptionData = {
        ...subscriptionData,
        nextBillingDate: nextBilling,
        notes: notes,
        confirmedAt: new Date().toISOString(),
        category: subscriptionData.category || 'Other'
      };

             // Use mock API to handle the subscription
      handleSubscriptionWithAuth(finalSubscriptionData);
    }

    function createFloatingButton(subscriptionData) {
      // Remove existing button if present
      const existingButton = document.getElementById(CONFIG.buttonId);
      if (existingButton) {
        existingButton.remove();
      }

      // Create button container
      const container = document.createElement('div');
      container.id = CONFIG.containerId;
      container.className = 'mysubtrack-container';

      // Create button
      const button = document.createElement('button');
      button.id = CONFIG.buttonId;
      button.className = 'mysubtrack-button';
      const logoUrlBtn = getServiceLogoUrl(subscriptionData.service);
      const sanitizedServiceName = sanitizeHTML(subscriptionData.service);
      button.innerHTML = `
        ${logoUrlBtn ? `<img class="mysubtrack-button-logo" src="${sanitizeHTML(logoUrlBtn)}" alt="${sanitizedServiceName}" />` : `
        <svg class="mysubtrack-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor"/>
        </svg>`}
        <span>${formatButtonText(subscriptionData)}</span>
      `;

      // Brand the button if we have service colors
      if (subscriptionData.brandColors && Array.isArray(subscriptionData.brandColors) && subscriptionData.brandColors.length) {
        // Validate colors to prevent CSS injection
        const isValidColor = (color) => {
          if (!color || typeof color !== 'string') return false;
          // Allow hex colors, rgb/rgba, hsl/hsla, and named colors
          const colorRegex = /^(#[0-9A-Fa-f]{3,8}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)|hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)|hsla\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*,\s*[\d.]+\s*\)|[a-zA-Z]+)$/;
          return colorRegex.test(color.trim());
        };
        
        const c1 = subscriptionData.brandColors[0];
        const c2 = subscriptionData.brandColors[1] || subscriptionData.brandColors[0];
        
        if (isValidColor(c1) && isValidColor(c2)) {
          button.style.background = `linear-gradient(135deg, ${c1.trim()} 0%, ${c2.trim()} 100%)`;
        }
      }

      // Add click event - now opens modal instead of direct submission
      button.addEventListener('click', () => createModal(subscriptionData));

      container.appendChild(button);
      document.body.appendChild(container);

      // Trigger slide-in animation
      setTimeout(() => {
        container.classList.add('mysubtrack-visible');
      }, 100);
    }

         function showSuccessMessage(subscriptionData) {
       const message = document.createElement('div');
       message.className = 'mysubtrack-success';
       
       if (subscriptionData.price && subscriptionData.price > 0) {
         const currency = subscriptionData.priceText?.match(/[€$£¥₹]/)?.[0] || '$';
         const cycle = subscriptionData.billingCycle === 'yearly' ? '/year' : 
                      subscriptionData.billingCycle === 'weekly' ? '/week' : '/month';
         message.textContent = `Added ${subscriptionData.service} (${currency}${subscriptionData.price}${cycle}) to MySubTrack!`;
       } else {
         message.textContent = `Added ${subscriptionData.service} to MySubTrack!`;
       }
      
      document.body.appendChild(message);

      // Trigger animation
      setTimeout(() => {
        message.classList.add('mysubtrack-success-visible');
      }, 100);

      // Remove message after animation
      setTimeout(() => {
        message.classList.remove('mysubtrack-success-visible');
        setTimeout(() => {
          message.remove();
        }, 300);
      }, 2000);
    }

    function isSupportedPage() {
      // Check for known services first
      const knownService = detectService();
      if (knownService) {
        return true;
      }
      
      // Check for generic subscription detection with purchase intent
      const genericDetection = detectGenericSubscription();
      return genericDetection !== null;
    }

    function initialize() {
      // Respect setting: autoDetect (default true)
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(['mysubtrack_auto_detect'], (res) => {
            const autoDetect = res && (res.mysubtrack_auto_detect ?? true);
            if (!autoDetect) return;
            initializeDetection();
          });
          return;
        }
      } catch (_) {}
      initializeDetection();
    }



    function getSubscriptionData() {
      // First try known services
      const knownService = detectService();
      if (knownService) {
        return extractSubscriptionData(knownService);
      }
      
      // Fall back to generic detection
      return detectGenericSubscription();
    }

    // Listen for Test Detection from popup and stats request
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
          if (request && request.type === 'mysubtrack_test_detection') {
            const data = getSubscriptionData();
            sendResponse({ detected: !!data, data });
            return true;
          } else if (request && request.type === 'mysubtrack_get_stats') {
            // Handle async operation properly
            (async () => {
              try {
                const today = await mockAPI.getTodayDetectionsCount();
                const totalSaved = await mockAPI.getTotalSavedEstimate();
                sendResponse({ today, totalSaved });
              } catch (e) {
                sendResponse({ today: 0, totalSaved: 0 });
              }
            })();
            return true; // Keep message port open for async response
          }
        });
      }
    } catch (_) {}

    // Initialize the extension
    initialize();
  })();
})();
