/* ============================================
   GradeIQ — UI Helper & Notification Module
   ============================================ */

const UI = (() => {

  /**
   * Toast Notification System (Fix 9)
   */
  function showToast(message, type = 'success') {
    const colors = {
      success: 'var(--success)',
      error: 'var(--danger)', 
      warning: 'var(--warning)',
      info: 'var(--brand-secondary)'
    };
    
    const toast = document.createElement('div');
    toast.className = 'gradeiq-toast';
    toast.style.cssText = `
      position: fixed; top: 24px; right: 24px;
      background: var(--bg-sidebar);
      border: 1px solid ${colors[type]};
      color: var(--text-primary); padding: 16px 24px;
      border-radius: 16px; z-index: 9999;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      animation: slideIn 0.3s ease;
      max-width: 320px; font-family: var(--font-body);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  /**
   * Navigation Logic (Fix 1)
   */
  function navigateTo(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(s => {
      s.style.display = 'none';
      s.classList.remove('active');
    });

    // Show clicked section
    const target = document.getElementById(sectionId);
    if (target) {
      target.style.display = 'block';
      target.classList.add('active');
      
      // Save state
      Storage.updateSettings({ active_section: sectionId });
    }

    // Update nav item classes
    document.querySelectorAll('[data-route]').forEach(item => {
      if (item.getAttribute('data-route') === sectionId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Close mobile sidebars if open
    document.getElementById('sidebar')?.classList.remove('active');
    document.getElementById('sidebar-overlay')?.classList.remove('active');
  }

  /**
   * Animated Numbers (Fix 4)
   */
  function animateNumber(el, target, decimals = 2, duration = 800) {
    const start = parseFloat(el.textContent) || 0;
    const diff = target - start;
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const val = (start + diff * eased).toFixed(decimals);
      el.textContent = val;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /**
   * GPA Progress Ring Update
   */
  function updateGPARing(svgId, gpa, maxGPA = 4.0) {
    const ring = document.querySelector(`#${svgId} .ring-progress`);
    if (!ring) return;
    
    const max = 427;
    const pct = Math.min(100, (gpa / maxGPA) * 100);
    const offset = max * (1 - pct / 100);
    
    ring.style.strokeDasharray = max;
    ring.style.strokeDashoffset = isFinite(offset) ? offset : max;
    
    // Color based on GPA
    const color = Calculator.getLetterGrade(gpa * 25).color;
    ring.style.stroke = color;
  }

  /**
   * Confetti Trigger (Fix 4)
   */
  function fireConfetti() {
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#F97316', '#E11D48', '#FDBA74']
      });
    } else {
       // Fallback if confetti lib not loaded
       console.log("Confetti time! (lib not loaded)");
    }
  }

  /**
   * Theme Management (Light/Dark Mode)
   */
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    
    // Update Settings UI if active
    const themeName = document.getElementById('settings-theme-name');
    if (themeName) themeName.textContent = theme === 'dark' ? 'Light' : 'Dark';
    
    const themeBadge = document.getElementById('theme-badge');
    if (themeBadge) themeBadge.textContent = theme.charAt(0).toUpperCase() + theme.slice(1);
    
    // Refresh Icons
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
    
    // Save to storage
    Storage.updateSettings({ theme: next });
    
    // Notify
    showToast(`${next.charAt(0).toUpperCase() + next.slice(1)} Mode Enabled`, 'info');
    
    // Refresh charts if visible
    if (typeof Charts !== 'undefined' && typeof App !== 'undefined') {
       App.refreshAll();
    }
  }

  /**
   * Achievement Toast (Feature 3)
   */
  function showAchievementToast(badge) {
    const toast = document.createElement('div');
    toast.className = 'gradeiq-toast achievement-toast';
    toast.style.cssText = `
      position: fixed; top: 24px; left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-sidebar) 100%);
      border: 1px solid var(--brand-primary);
      color: var(--text-primary); padding: 20px 32px;
      border-radius: 20px; z-index: 9999;
      box-shadow: 0 10px 40px var(--brand-glow);
      animation: bounceInUp 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      text-align: center; font-family: var(--font-display);
      backdrop-filter: blur(10px);
    `;
    toast.innerHTML = `
      <div style="font-size: 40px; margin-bottom: 8px;">${badge.icon}</div>
      <div style="color: var(--brand-accent); font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Achievement Unlocked</div>
      <div style="font-size: 20px; font-weight: 800; margin: 4px 0;">${badge.name}</div>
      <div style="font-size: 13px; color: var(--text-secondary);">${badge.desc}</div>
    `;
    document.body.appendChild(toast);
    
    // Play firework effect
    fireConfetti();
    
    setTimeout(() => {
      toast.style.animation = 'slideOutDown 0.5s ease forwards';
      setTimeout(() => toast.remove(), 500);
    }, 5000);
  }

  /**
   * Quick Stats Ticker (Feature 7)
   */
  function updateTicker(data) {
    const tickerContainer = document.getElementById('ticker-container');
    const tickerContent = document.getElementById('ticker-content');
    if (!tickerContainer || !tickerContent) return;

    if (data.semesters.length === 0) {
      tickerContainer.classList.add('hidden');
      return;
    }

    tickerContainer.classList.remove('hidden');
    
    // Generate facts
    const facts = [];
    const gpa = data.cumulative_gpa;
    const hours = data.total_credits;
    
    facts.push(`📊 معدلك التراكمي: ${gpa.toFixed(2)}`);
    if (gpa >= 3.0) facts.push(`🎯 أنت في وضع ممتاز! استمر`);
    else facts.push(`🎯 تحتاج 3.8 في الفصل القادم للوصول لـ 3.5`);
    
    const bestSem = data.semesters.reduce((a, b) => a.semester_gpa > b.semester_gpa ? a : b);
    facts.push(`🏆 أفضل فصل: ${bestSem.name}`);
    facts.push(`⏳ أتممت ${hours} ساعة دراسية`);
    facts.push(`💎 الأوسمة المفتوحة: ${Achievements.getUnlocked().length} / 7`);

    tickerContent.innerHTML = facts.map(f => `<span class="ticker-item">${f}</span>`).join('') + facts.map(f => `<span class="ticker-item">${f}</span>`).join(''); // Duplicate for infinite scroll
  }

  return {
    showToast,
    showAchievementToast,
    updateTicker,
    navigateTo,
    animateNumber,
    updateGPARing,
    fireConfetti,
    setTheme,
    toggleTheme,
    openModal: (id) => document.getElementById(id)?.classList.add('active'),
    closeModal: (id) => document.getElementById(id)?.classList.remove('active'),
    toggleSidebar: () => {
      document.getElementById('sidebar')?.classList.toggle('active');
      document.getElementById('sidebar-overlay')?.classList.toggle('active');
    }
  };
})();
