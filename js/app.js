/* ============================================
   GradeIQ — Main App Orchestrator
   ============================================ */

const App = (() => {

  // State for dynamic dashboard subjects
  let dashboardSubjects = [];

  /**
   * INITIALIZE (Fix 10)
   */
  function init() {
    console.log("GradeIQ: Initializing in Guest Mode...");
    
    // Hide Auth Screen immediately
    const authScreen = document.getElementById('auth-screen');
    if (authScreen) {
      authScreen.classList.remove('active');
      authScreen.style.display = 'none';
    }
    // Proceed as Guest
    Storage.setUser(null);
    const data = Storage.get();
    document.documentElement.lang = data.settings.lang || 'en';
    document.documentElement.dir = (data.settings.lang === 'ar') ? 'rtl' : 'ltr';

    UI.setTheme(data.settings.theme || 'dark');
    UI.navigateTo(data.settings.active_section || 'dashboard');

    // Initialize all components
    initAppComponents();

    // Listen for connectivity (still useful for future-proofing)
    window.addEventListener('online', () => updateSyncStatus(true));
    window.addEventListener('offline', () => updateSyncStatus(false));
    updateSyncStatus(navigator.onLine);
    
    // Attempt background Firebase init if possible, but don't block
    if (window.FirebaseModule) {
      window.FirebaseModule.onAuthChange(async (user) => {
        if (user) {
          Storage.setUser(user);
          updateUserProfileUI(user);
          Storage.syncWithCloud(window.FirebaseModule);
        }
      });
    }
  }

  function setupAuthFlow() {
    // Logic moved into init/bypassed
  }

  function requestAIGradePrediction() {
    const target = parseFloat(document.getElementById('planner-target-gpa')?.value) || 0;
    const credits = parseInt(document.getElementById('planner-next-hours')?.value) || 0;
    
    UI.navigateTo('ai');
    
    const isAr = document.documentElement.lang === 'ar';
    const msg = isAr 
        ? `بناءً على هدفي للوصول لمعدل ${target} في الفصل القادم بـ ${credits} ساعة، ما هي الدرجات المقترحة لكل مادة؟`
        : `Based on my target GPA of ${target} next semester with ${credits} credits, what specific grades should I aim for in each subject?`;
        
    if (typeof AIAdvisor !== 'undefined') {
        setTimeout(() => {
            const input = document.getElementById('ai-input');
            if (input) {
                input.value = msg;
                document.getElementById('ai-send-btn')?.click();
            }
        }, 500);
    }
  }

  function initAppComponents() {
    if (typeof Charts !== 'undefined') Charts.applyDefaults();
    setupNavigation();
    initDashboard();
    initHistory();
    initPlanner();
    initSimulator();
    initAI();
    initSettings();
    initPremium(); // Feature set initialization

    if (typeof lucide !== 'undefined') lucide.createIcons();
    if (typeof updateAllTranslations === 'function') updateAllTranslations();
  }

  function initPremium() {
    // Achievements
    if (typeof Achievements !== 'undefined') {
      Achievements.renderShelf();
    }
    
    // Ticker
    UI.updateTicker(Storage.get());

    // Dashboard Charts
    const data = Storage.get();
    if (typeof Charts !== 'undefined') {
      Charts.renderDistribution('grade-distribution-chart', data.semesters);
    }

    // Templates Button
    document.getElementById('btn-templates-modal')?.addEventListener('click', () => {
      renderTemplatesList();
      UI.openModal('templates-modal');
    });

    // Save as Template Button
    document.getElementById('btn-save-as-template')?.addEventListener('click', () => {
      const name = prompt("Enter template name:");
      if (name) Templates.saveCustom(name, dashboardSubjects);
    });

    // Compare Mode
    document.getElementById('btn-compare-mode')?.addEventListener('click', initCompareMode);
  }

  function renderTemplatesList() {
    const container = document.getElementById('templates-list-container');
    if (!container) return;

    const presets = Templates.getPresets();
    container.innerHTML = '';
    
    presets.forEach(p => {
      const item = document.createElement('div');
      item.className = 'card p-3 cursor-pointer hover:border-brand-primary transition-all';
      item.innerHTML = `
        <div class="flex justify-between items-center">
          <div>
            <div class="font-bold text-sm">${p.name}</div>
            <div class="text-[10px] text-muted">${p.subjects.length} Subjects</div>
          </div>
          <i data-lucide="chevron-right" class="w-4 h-4"></i>
        </div>
      `;
      item.onclick = () => {
        Templates.apply(p.name, dashboardSubjects);
        UI.closeModal('templates-modal');
      };
      container.appendChild(item);
    });
    if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: container });
  }

  function initCompareMode() {
    const data = Storage.get();
    if (data.semesters.length < 2) {
      UI.showToast("Need at least 2 semesters to compare!", "warning");
      return;
    }
    
    // In a real app, this would open a selector. Here we'll compare the last two.
    const semB = data.semesters[data.semesters.length - 1];
    const semA = data.semesters[data.semesters.length - 2];
    
    renderComparison(semA, semB);
  }

  function renderComparison(semA, semB) {
    const container = document.getElementById('history-grid');
    if (!container) return;

    container.innerHTML = `
      <div class="card col-span-full animate-fade-in">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl">Semester Comparison</h3>
          <button class="btn btn-ghost btn-sm" onclick="App.renderHistory()">Exit Compare</button>
        </div>
        
        <div class="grid grid-cols-2 gap-8">
          <!-- Left: semA -->
          <div class="p-4 bg-black-10 rounded-xl">
            <div class="text-xs text-muted mb-1">${semA.name}</div>
            <div class="text-3xl font-bold mb-2">${semA.semester_gpa.toFixed(2)}</div>
            <div class="text-sm text-muted">Credits: ${semA.total_credits}</div>
          </div>
          
          <!-- Right: semB -->
          <div class="p-4 bg-black-10 rounded-xl">
             <div class="text-xs text-muted mb-1">${semB.name}</div>
             <div class="text-3xl font-bold mb-2">${semB.semester_gpa.toFixed(2)}</div>
             <div class="text-sm text-muted">Credits: ${semB.total_credits}</div>
          </div>
        </div>

        <div class="mt-8">
          <h4 class="text-sm font-bold mb-4">Subject Analytics</h4>
          <div class="space-y-3" id="comparison-subject-list"></div>
        </div>
      </div>
    `;

    const subList = document.getElementById('comparison-subject-list');
    // Find common subjects or just list both
    const allNames = [...new Set([...semA.subjects.map(s => s.name), ...semB.subjects.map(s => s.name)])];
    
    allNames.forEach(name => {
      const subA = semA.subjects.find(s => s.name === name);
      const subB = semB.subjects.find(s => s.name === name);
      
      const row = document.createElement('div');
      row.className = 'flex justify-between items-center p-3 border-b border-subtle';
      
      let diffHtml = '';
      if (subA && subB) {
        const diff = subB.percentage - subA.percentage;
        diffHtml = `<span class="${diff >= 0 ? 'text-accent-green' : 'text-accent-red'} font-bold">
          ${diff >= 0 ? '▲' : '▼'} ${Math.abs(diff).toFixed(1)}%
        </span>`;
      }

      row.innerHTML = `
        <div class="flex-1 font-medium">${name}</div>
        <div class="flex items-center gap-8">
          <div class="text-sm ${subA ? '' : 'opacity-20'}">${subA ? subA.percentage + '%' : '—'}</div>
          <div class="text-sm font-bold ${subB ? '' : 'opacity-20'}">${subB ? subB.percentage + '%' : '—'}</div>
          <div class="w-20 text-right">${diffHtml}</div>
        </div>
      `;
      subList.appendChild(row);
    });
  }

  function updateUserProfileUI(user) {
    const profileSection = document.getElementById('user-profile-sidebar');
    const userImg = document.getElementById('user-photo');
    const userName = document.getElementById('user-display-name');
    const userBadge = document.getElementById('user-system-badge');

    if (profileSection) {
      profileSection.classList.remove('hidden');
      if (userImg) userImg.src = user.photoURL || '';
      if (userName) userName.textContent = user.displayName || 'Scholar';
      // Sync badge with graduation credits if any, or just fixed uni system
      if (userBadge) userBadge.textContent = Storage.get().settings.university.toUpperCase();
    }
  }

  function showOnboarding() {
    const modal = document.getElementById('onboarding-modal');
    if (!modal) return;
    
    modal.classList.add('active');
    
    document.getElementById('btn-onboard-finish')?.addEventListener('click', () => {
      const uni = document.getElementById('onboard-uni')?.value || 'delta';
      Storage.updateSettings({ university: uni });
      modal.classList.remove('active');
      UI.showToast("Profile set up! You're ready to go.", "success");
    });
  }

  function updateSyncStatus(isOnline) {
    const syncStatus = document.getElementById('sync-status');
    const dot = syncStatus?.querySelector('span');
    const text = syncStatus?.querySelector('.sync-text');

    if (syncStatus && dot && text) {
      if (isOnline) {
        dot.className = 'online-dot';
        text.setAttribute('data-i18n', 'sync_online');
        text.textContent = t('sync_online');
        // Auto-sync when coming back online
        if (Storage.getCurrentUser()) {
          Storage.syncWithCloud(window.FirebaseModule);
        }
      } else {
        dot.className = 'offline-dot';
        text.setAttribute('data-i18n', 'sync_offline');
        text.textContent = t('sync_offline');
      }
    }
  }

  /**
   * REFRESH ALL
   * Called by Storage.save to keep UI in sync
   */
  function refreshAll() {
    const data = Storage.get();
    renderDashboardStats();
    if (document.getElementById('history').classList.contains('active')) renderHistory();
    
    // Refresh Premium components
    UI.updateTicker(data);
    if (typeof Achievements !== 'undefined') Achievements.renderShelf();
    if (typeof Charts !== 'undefined') Charts.renderDistribution('grade-distribution-chart', data.semesters);
  }

  /* ==================== FIX 1: Navigation ==================== */
  function setupNavigation() {
    document.querySelectorAll('[data-route]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const route = link.getAttribute('data-route');
        UI.navigateTo(route);
        
        // Contextual Refresh
        if (route === 'history') renderHistory();
      });
    });

    document.getElementById('mobile-burger')?.addEventListener('click', UI.toggleSidebar);
    document.getElementById('sidebar-overlay')?.addEventListener('click', UI.toggleSidebar);

    // Theme Toggle (Sidebar)
    document.getElementById('theme-toggle-sidebar')?.addEventListener('click', UI.toggleTheme);
  }

  /* ==================== FIX 2 & 3: Dashboard & Live Preview ==================== */
  function initDashboard() {
    renderDashboardStats();

    // Initialize with 1 subject or current temp state
    dashboardSubjects = [createEmptySubject()];
    renderSubjectRows();

    // Add Subject Button
    document.getElementById('btn-add-subject')?.addEventListener('click', () => {
      dashboardSubjects.push(createEmptySubject());
      renderSubjectRows();
    });

    // Save Semester Button (Fix 4)
    document.getElementById('btn-save-semester')?.addEventListener('click', handleSaveSemester);
  }

  function createEmptySubject() {
    return { id: Storage.generateUUID(), name: '', score: '', out_of: 100, credits: 3, category: 'general' };
  }

  function renderDashboardStats() {
    const data = Storage.get();
    const elGPA = document.getElementById('hero-gpa');
    const elCredits = document.getElementById('hero-hours');
    const elSems = document.getElementById('hero-semesters');
    const elStanding = document.getElementById('hero-standing');

    if (elGPA) UI.animateNumber(elGPA, data.cumulative_gpa, 2);
    if (elCredits) UI.animateNumber(elCredits, data.total_credits, 0);
    if (elSems) elSems.textContent = data.semesters.length;

    UI.updateGPARing('hero-ring', data.cumulative_gpa);
    
    // Standing update
    if (elStanding) {
      let label = 'Scholar';
      let color = '#2dd4bf';
      
      if (data.cumulative_gpa >= 3.7) { label = 'Elite'; color = '#34d399'; }
      else if (data.cumulative_gpa >= 3.4) { label = 'Distinction'; color = '#2dd4bf'; }
      else if (data.cumulative_gpa >= 3.0) { label = 'Good Standing'; color = '#6ee7d4'; }
      else if (data.cumulative_gpa >= 2.0) { label = 'Warning'; color = '#fbbf24'; }
      else if (data.cumulative_gpa > 0) { label = 'Probation'; color = '#f87171'; }
      
      elStanding.textContent = label;
      elStanding.style.background = `${color}20`;
      elStanding.style.color = color;
      elStanding.style.borderColor = `${color}40`;
    }
  }

  function renderSubjectRows() {
    const container = document.getElementById('calc-subjects-list');
    if (!container) return;

    container.innerHTML = '';
    dashboardSubjects.forEach((sub, index) => {
      const row = document.createElement('div');
      row.className = 'subject-row animate-fade-in';
      row.innerHTML = `
        <div class="subject-main-info">
          <input type="text" class="form-input sub-name" placeholder="اسم المادة" value="${sub.name}">
          <div class="sub-category-dot" title="Category" style="background: ${getCategoryColor(sub.category)}"></div>
        </div>
        
        <div class="score-group">
          <input type="number" class="form-input sub-score" placeholder="درجتك" value="${sub.score}" min="0">
          <span class="text-muted mx-1">/</span>
          <div class="relative">
            <input type="number" class="form-input sub-out-of" placeholder="من كام؟" value="${sub.out_of}" min="1">
            <div class="tooltip">الدرجة الكاملة للمادة</div>
          </div>
        </div>

        <div class="sub-calc-meta">
           <span class="percentage-badge">${sub.percentage ? sub.percentage + '%' : '—'}</span>
           <select class="form-input sub-credits">
            <option value="1" ${sub.credits == 1 ? 'selected' : ''}>1</option>
            <option value="2" ${sub.credits == 2 ? 'selected' : ''}>2</option>
            <option value="3" ${sub.credits == 3 ? 'selected' : ''}>3</option>
            <option value="4" ${sub.credits == 4 ? 'selected' : ''}>4</option>
          </select>
        </div>

        <span class="grade-badge" style="background: ${sub.color || 'var(--bg-input)'}!important; color: #fff">${sub.letter || '—'}</span>
        
        <button class="btn-icon text-accent-red sub-remove" ${dashboardSubjects.length === 1 ? 'disabled' : ''}>
          <i data-lucide="x"></i>
        </button>
      `;

      // Event Listeners for Live Update
      const nameInp = row.querySelector('.sub-name');
      const scoreInp = row.querySelector('.sub-score');
      const outOfInp = row.querySelector('.sub-out-of');
      const creditInp = row.querySelector('.sub-credits');
      const removeBtn = row.querySelector('.sub-remove');

      nameInp.addEventListener('input', (e) => { sub.name = e.target.value; });
      
      scoreInp.addEventListener('input', (e) => {
        sub.score = e.target.value;
        validateScore(scoreInp, outOfInp);
        updateLivePreview();
      });

      outOfInp.addEventListener('input', (e) => {
        sub.out_of = e.target.value;
        validateScore(scoreInp, outOfInp);
        updateLivePreview();
      });

      creditInp.addEventListener('change', (e) => {
        sub.credits = parseInt(e.target.value);
        updateLivePreview();
      });
      removeBtn.addEventListener('click', () => {
        dashboardSubjects.splice(index, 1);
        renderSubjectRows();
        updateLivePreview();
      });

      container.appendChild(row);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: container.querySelectorAll('.sub-remove') });
  }

  function updateLivePreview() {
    let totalPoints = 0;
    let totalCredits = 0;
    const letterCounts = { A: 0, B: 0, C: 0, D: 0, F: 0 };

    dashboardSubjects.forEach(sub => {
      const score = parseFloat(sub.score);
      const outOf = parseFloat(sub.out_of);

      if (!isNaN(score) && !isNaN(outOf) && outOf > 0) {
        const percentage = (score / outOf) * 100;
        sub.percentage = percentage.toFixed(1);
        const info = Calculator.getLetterGrade(percentage);
        sub.letter = info.letter;
        sub.points = info.points;
        sub.color = info.color;
        
        totalPoints += (info.points * sub.credits);
        totalCredits += sub.credits;
        
        const firstLetter = info.letter.charAt(0);
        if (letterCounts[firstLetter] !== undefined) letterCounts[firstLetter]++;
      } else {
        sub.letter = '—';
        sub.percentage = '—';
        sub.color = 'var(--bg-card)';
      }
    });

    // Update Badges in DOM
    document.querySelectorAll('.subject-row').forEach((row, idx) => {
      const sub = dashboardSubjects[idx];
      const badge = row.querySelector('.grade-badge');
      const pctBadge = row.querySelector('.percentage-badge');
      
      badge.textContent = sub.letter;
      badge.style.background = sub.color;
      pctBadge.textContent = sub.percentage !== '—' ? sub.percentage + '%' : '—';
      
      // Smart Warnings (Feature 4)
      updateSmartWarning(row, sub);
    });

    const semGPA = totalCredits > 0 ? (totalPoints / totalCredits) : 0;
    const data = Storage.get();
    const newCumGPA = Calculator.calcCumulativeGPA(data.cumulative_gpa, data.total_credits, semGPA, totalCredits);

    // Update UI (Fix 3)
    const elSem = document.getElementById('preview-sem-gpa');
    const elCum = document.getElementById('preview-cum-gpa');
    const elBar = document.getElementById('preview-minibar');

    if (elSem) elSem.textContent = semGPA.toFixed(2);
    if (elCum) elCum.textContent = newCumGPA.toFixed(2);
    
    // Mini Bar Breakdown
    if (elBar && totalCredits > 0) {
      elBar.innerHTML = '';
      const colors = { A: '#34d399', B: '#2dd4bf', C: '#fbbf24', D: '#fb923c', F: '#f87171' };
      Object.entries(letterCounts).forEach(([letter, count]) => {
        if (count > 0) {
          const seg = document.createElement('div');
          seg.style.width = `${(count / dashboardSubjects.filter(s => !isNaN(parseFloat(s.grade))).length) * 100}%`;
          seg.style.background = colors[letter];
          seg.style.height = '100%';
          elBar.appendChild(seg);
        }
      });
    }
  }

  /* ==================== FIX 4: Save Semester ==================== */
  function handleSaveSemester() {
    const nameInp = document.getElementById('calc-semester-name');
    const name = nameInp?.value || "Semester " + (Storage.get().semesters.length + 1);
    
    // Validate
    const validSubs = dashboardSubjects.filter(s => s.name && !isNaN(parseFloat(s.score)) && !isNaN(parseFloat(s.out_of)));
    if (validSubs.length === 0) {
      UI.showToast("يرجى إضافة مادة واحدة على الأقل مع الدرجة", "error");
      return;
    }

    let totalWeightedPoints = 0;
    let totalCredits = 0;

    const subjectsToSave = validSubs.map(s => {
      const score = parseFloat(s.score);
      const outOf = parseFloat(s.out_of);
      const percentage = (score / outOf) * 100;
      const info = Calculator.getLetterGrade(percentage);
      
      totalWeightedPoints += (info.points * s.credits);
      totalCredits += s.credits;

      return {
        ...s,
        score: score,
        out_of: outOf,
        percentage: parseFloat(percentage.toFixed(1)),
        letter: info.letter,
        gpa_points: info.points
      };
    });

    const semGPA = totalCredits > 0 ? (totalWeightedPoints / totalCredits) : 0;

    const semester = {
      id: Storage.generateUUID(),
      name: name,
      date_saved: new Date().toISOString(),
      subjects: subjectsToSave,
      semester_gpa: semGPA,
      total_credits: totalCredits
    };

    Storage.addSemester(semester);
    
    // Feature 3: Achievements
    if (typeof Achievements !== 'undefined') {
      Achievements.checkAndUnlock(semester, Storage.get());
    }

    // Show template save button
    document.getElementById('btn-save-as-template')?.classList.remove('hidden');

    // Effects
    UI.showToast(`✅ تم حفظ الفصل! معدلك الآن ${Storage.get().cumulative_gpa.toFixed(2)}`, "success");
    if (semGPA >= 3.5) UI.fireConfetti();

    // Reset Form
    nameInp.value = "Semester " + (Storage.get().semesters.length + 1);
    dashboardSubjects = [createEmptySubject()];
    renderSubjectRows();
    updateLivePreview();
  }

  /* ==================== helpers ==================== */
  function validateScore(scoreInp, outOfInp) {
    const score = parseFloat(scoreInp.value);
    const outOf = parseFloat(outOfInp.value);
    
    if (score > outOf) {
      scoreInp.style.borderColor = '#EF4444';
      UI.showToast('❌ الدرجة أكبر من الدرجة الكاملة!', 'error');
    } else {
      scoreInp.style.borderColor = '';
    }
  }

  function getCategoryColor(cat) {
    const colors = {
      'math': '#60A5FA', // Blue
      'cs': '#8B5CF6',   // Purple
      'lang': '#34D399', // Green
      'human': '#FBBF24',// Yellow
      'eng': '#FB923C',  // Orange
      'lab': '#EC4899',  // Pink
      'general': '#94A3B8' // Slate
    };
    return colors[cat] || colors.general;
  }

  function updateSmartWarning(row, sub) {
    let warningEl = row.querySelector('.smart-warning');
    if (!warningEl) {
      warningEl = document.createElement('div');
      warningEl.className = 'smart-warning text-[10px] mt-1 hidden';
      row.appendChild(warningEl);
    }

    const percentage = parseFloat(sub.percentage);
    if (isNaN(percentage)) {
      warningEl.classList.add('hidden');
      return;
    }

    if (percentage < 50) {
      warningEl.textContent = "⚠️ هذه المادة ستؤثر سلباً على معدلك — راجع الـ Planner";
      warningEl.style.color = '#F87171';
      warningEl.classList.remove('hidden');
    } else if (sub.credits >= 3 && percentage < 65) {
      warningEl.textContent = "⚡ تحذير: هذه المادة ذات ساعات عالية وستخفض معدلك بشكل كبير";
      warningEl.style.color = '#FB923C';
      warningEl.classList.remove('hidden');
    } else if (percentage >= 90) {
      warningEl.textContent = "🌟 ممتاز! هذه المادة ترفع معدلك";
      warningEl.style.color = '#34D399';
      warningEl.classList.remove('hidden');
    } else {
      warningEl.classList.add('hidden');
    }
  }

  /* ==================== FIX 5: History Section ==================== */
  function initHistory() {
    // Lazy render on selection is handled in Navigation logic
  }

  function renderHistory() {
    const data = Storage.get();
    const container = document.getElementById('history-grid');
    const statsContainer = document.getElementById('history-stats-content');
    if (!container) return;

    if (data.semesters.length === 0) {
      container.innerHTML = `
        <div class="empty-state col-span-full py-12 text-center opacity-50">
          <i data-lucide="folder-open" style="width:48px;height:48px;margin:auto" class="mb-4 d-block"></i>
          <p>لا يوجد فصول محفوظة بعد</p>
        </div>
      `;
      if (statsContainer) statsContainer.innerHTML = '';
      if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: container });
      return;
    }

    // A) Chart
    if (typeof Charts !== 'undefined') Charts.renderGPAJourney('gpa-journey-chart', data.semesters);

    // B) Cards
    container.innerHTML = '';
    data.semesters.slice().reverse().forEach(sem => {
      const card = document.createElement('div');
      card.className = 'card semester-card animate-fade-in-up';
      card.innerHTML = `
        <div class="flex justify-between items-start mb-3">
          <div>
            <h4 class="font-bold">${sem.name}</h4>
            <div class="text-xs text-muted">${new Date(sem.date_saved).toLocaleDateString()}</div>
          </div>
          <div class="badge" style="background: ${Calculator.getLetterGrade(sem.semester_gpa * 25).color}20; color: ${Calculator.getLetterGrade(sem.semester_gpa * 25).color}">
            ${sem.semester_gpa.toFixed(2)}
          </div>
        </div>
        <div class="text-sm text-muted mb-2">${sem.total_credits} Credits • ${sem.subjects.length} Subjects</div>
        <button class="btn btn-ghost text-accent-red btn-sm btn-delete-sem" data-id="${sem.id}">
          <i data-lucide="trash-2" style="width:14px"></i> Delete
        </button>
      `;
      
      card.querySelector('.btn-delete-sem').addEventListener('click', () => {
        if (confirm(data.settings.lang === 'ar' ? "هل أنت متأكد من حذف هذا الفصل؟" : "Are you sure you want to delete this semester?")) {
          Storage.deleteSemester(sem.id);
          renderHistory();
        }
      });

      container.appendChild(card);
    });
    if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: container });

    // C) Insights
    if (statsContainer) {
      const best = data.semesters.reduce((a, b) => a.semester_gpa > b.semester_gpa ? a : b);
      const worst = data.semesters.reduce((a, b) => a.semester_gpa < b.semester_gpa ? a : b);
      
      statsContainer.innerHTML = `
        <div class="space-y-3">
          <div class="flex justify-between items-center text-sm p-2 bg-black-10 rounded">
            <span>أفضل فصل</span>
            <b class="text-accent-green">${best.semester_gpa.toFixed(2)} (${best.name})</b>
          </div>
          <div class="flex justify-between items-center text-sm p-2 bg-black-10 rounded">
            <span>أقل فصل</span>
            <b class="text-accent-red">${worst.semester_gpa.toFixed(2)} (${worst.name})</b>
          </div>
        </div>
      `;
    }

    // D) Heatmap
    if (typeof Charts !== 'undefined') Charts.renderHeatmap('history-heatmap', data.semesters);
  }

  // Remove the redundant renderHistoryChart local function as it's now handled by Charts module
  /* 
  let historyChart = null;
  function renderHistoryChart(semesters) { ... }
  */

  /* ==================== FIX 6: GPA Planner ==================== */
  function initPlanner() {
    const slider = document.getElementById('planner-target-gpa');
    const valDisp = document.getElementById('planner-target-value');
    if (!slider || !valDisp) return;

    slider.addEventListener('input', (e) => {
      valDisp.textContent = parseFloat(e.target.value).toFixed(2);
      updatePlannerCalc();
    });

    document.getElementById('planner-next-hours')?.addEventListener('input', updatePlannerCalc);
    
    // Roadmap Button (Fix 6)
    document.getElementById('btn-generate-roadmap')?.addEventListener('click', generateRoadmapUI);

    // Initial Calc
    updatePlannerCalc();
  }

  function generateRoadmapUI() {
    const data = Storage.get();
    const finalTarget = parseFloat(document.getElementById('roadmap-target-gpa')?.value) || 3.0;
    const remainingSemesters = parseInt(document.getElementById('roadmap-semesters')?.value) || 4;
    const avgCredits = parseInt(document.getElementById('roadmap-credits-per-sem')?.value) || 15;
    const container = document.getElementById('roadmap-container');

    if (!container) return;
    container.innerHTML = '';

    let currentGPA = data.cumulative_gpa;
    let currentCredits = data.total_credits;

    for (let i = 1; i <= remainingSemesters; i++) {
      const required = Calculator.calcRequiredGPA(currentGPA, currentCredits, finalTarget, avgCredits * (remainingSemesters - i + 1));
      const diff = Calculator.getDifficulty(required);
      
      const step = document.createElement('div');
      step.className = 'stagger-children p-3 mb-2 bg-black-10 rounded border-l-4';
      step.style.borderLeftColor = diff.color;
      step.innerHTML = `
        <div class="flex justify-between items-center">
          <span class="font-bold">Semester ${i}</span>
          <span class="badge" style="background: ${diff.color}20; color: ${diff.color}">Req: ${required.toFixed(2)}</span>
        </div>
        <div class="text-xs text-muted">Difficulty: ${diff.label}</div>
      `;
      container.appendChild(step);

      // Assume target met for next step
      currentGPA = Calculator.calcCumulativeGPA(currentGPA, currentCredits, Math.min(4.0, Math.max(0, required)), avgCredits);
      currentCredits += avgCredits;
    }
  }

  function updatePlannerCalc() {
    const data = Storage.get();
    const target = parseFloat(document.getElementById('planner-target-gpa').value);
    const nextHrs = parseInt(document.getElementById('planner-next-hours').value) || 15;
    
    const required = Calculator.calcRequiredGPA(data.cumulative_gpa, data.total_credits, target, nextHrs);
    const diff = Calculator.getDifficulty(required);

    const elReq = document.getElementById('planner-req-gpa');
    const elMsg = document.getElementById('planner-message');
    const elMeter = document.getElementById('planner-difficulty-meter');

    if (elReq) {
      elReq.textContent = isFinite(required) ? Math.max(0, required).toFixed(2) : "0.00";
      elReq.style.color = diff.color;
    }

    if (elMsg) {
       if (required > 4.0) {
          const max = Calculator.calcCumulativeGPA(data.cumulative_gpa, data.total_credits, 4.0, nextHrs);
          elMsg.innerHTML = `<span class="text-accent-red">الهدف مستحيل في فصل واحد.</span><br>أقصى معدل ممكن هو <b>${max.toFixed(2)}</b>`;
       } else if (required <= 0) {
          elMsg.innerHTML = `<span class="text-accent-green">أنت بالفعل في المسار الصحيح!</span>`;
       } else {
          elMsg.innerHTML = `مستوى الصعوبة: <b style="color:${diff.color}">${diff.label}</b>`;
       }
    }

    // Difficulty meter bars
    if (elMeter) {
      const level = (required > 3.5) ? 4 : (required > 3.0 ? 3 : (required > 2.5 ? 2 : 1));
      elMeter.querySelectorAll('.difficulty-bar').forEach((bar, i) => {
        bar.style.opacity = (i < level) ? '1' : '0.2';
        bar.style.background = diff.color;
      });
    }
  }

  /* ==================== FIX 7: Simulator ==================== */
  let simSubjects = [];

  function initSimulator() {
    const data = Storage.get();
    if (document.getElementById('sim-current-gpa')) document.getElementById('sim-current-gpa').textContent = data.cumulative_gpa.toFixed(2);
    if (document.getElementById('sim-current-hours')) document.getElementById('sim-current-hours').textContent = data.total_credits;
    if (document.getElementById('sim-future-gpa')) document.getElementById('sim-future-gpa').textContent = data.cumulative_gpa.toFixed(2);
    if (document.getElementById('sim-future-hours')) document.getElementById('sim-future-hours').textContent = data.total_credits;

    simSubjects = [createEmptySubject()];
    renderSimRows();

    document.getElementById('btn-add-sim-subject')?.addEventListener('click', () => {
      simSubjects.push(createEmptySubject());
      renderSimRows();
    });
  }

  function renderSimRows() {
    const container = document.getElementById('sim-subjects-list');
    if (!container) return;

    container.innerHTML = '';
    simSubjects.forEach((sub, index) => {
      const row = document.createElement('div');
      row.className = 'subject-row';
      row.innerHTML = `
        <input type="text" class="form-input sim-name" placeholder="اسم المادة" value="${sub.name}">
        <input type="number" class="form-input sim-grade" placeholder="الدرجة %" value="${sub.grade}">
        <select class="form-input sim-credits">
           <option value="1" ${sub.credits == 1 ? 'selected' : ''}>1 hr</option>
           <option value="2" ${sub.credits == 2 ? 'selected' : ''}>2 hrs</option>
           <option value="3" ${sub.credits == 3 ? 'selected' : ''}>3 hrs</option>
           <option value="4" ${sub.credits == 4 ? 'selected' : ''}>4 hrs</option>
        </select>
        <span class="grade-badge" style="background: ${sub.color || 'var(--bg-card)'}">${sub.letter || '-'}</span>
        <button class="btn-icon text-accent-red sim-remove" ${simSubjects.length === 1 ? 'disabled' : ''}>
           <i data-lucide="x"></i>
        </button>
      `;

      row.querySelector('.sim-name').addEventListener('input', (e) => { sub.name = e.target.value; });
      row.querySelector('.sim-grade').addEventListener('input', (e) => {
        sub.grade = e.target.value;
        updateSimulation();
      });
      row.querySelector('.sim-credits').addEventListener('change', (e) => {
        sub.credits = parseInt(e.target.value);
        updateSimulation();
      });
      row.querySelector('.sim-remove').addEventListener('click', () => {
        simSubjects.splice(index, 1);
        renderSimRows();
        updateSimulation();
      });

      container.appendChild(row);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: container });
  }

  function updateSimulation() {
    let totalPoints = 0, totalCredits = 0;
    simSubjects.forEach(sub => {
       const grade = parseFloat(sub.grade);
       if (!isNaN(grade)) {
         const info = Calculator.getLetterGrade(grade);
         sub.letter = info.letter;
         sub.points = info.points;
         sub.color = info.color;
         totalPoints += (info.points * sub.credits);
         totalCredits += sub.credits;
       } else {
         sub.letter = '-'; sub.color = 'var(--bg-card)';
       }
    });

    document.querySelectorAll('#sim-subjects-list .grade-badge').forEach((badge, idx) => {
       badge.textContent = simSubjects[idx].letter;
       badge.style.background = simSubjects[idx].color;
    });

    const semGPA = totalCredits > 0 ? (totalPoints / totalCredits) : 0;
    const data = Storage.get();
    const newCum = Calculator.calcCumulativeGPA(data.cumulative_gpa, data.total_credits, semGPA, totalCredits);

    const elGPA = document.getElementById('sim-future-gpa');
    const elDiff = document.getElementById('sim-diff-badge');
    const elPrio = document.getElementById('sim-sensitivity');

    if (elGPA) UI.animateNumber(elGPA, newCum, 2);
    
    if (elDiff) {
       const diff = newCum - data.cumulative_gpa;
       elDiff.textContent = (diff >= 0 ? "+" : "") + diff.toFixed(2);
       elDiff.className = `badge ${diff >= 0 ? 'badge-green' : 'badge-red'}`;
    }

    // Sensitivity Analysis (Fix 7)
    if (elPrio && totalCredits > 0) {
       // Find subject whose upgrade to 100% gives biggest boost
       let bestPrio = null, maxBoost = 0;
       simSubjects.forEach(sub => {
          const g = parseFloat(sub.grade);
          if (isNaN(g) || g >= 100) return;
          const currentPoints = Calculator.getLetterGrade(g).points;
          const potentialPoints = 4.0;
          const boost = (potentialPoints - currentPoints) * sub.credits;
          if (boost > maxBoost) {
             maxBoost = boost;
             bestPrio = sub;
          }
       });
       
       if (bestPrio) {
          elPrio.innerHTML = `🌟 المادة ذات الأولوية: <b class="text-white">${bestPrio.name || "Subject"}</b>`;
       } else {
          elPrio.innerHTML = '';
       }
    }
  }

  /* ==================== AI Advisor (Extra) ==================== */
  function initAI() {
    const input = document.getElementById('ai-input');
    const sendBtn = document.getElementById('ai-send-btn');
    const history = document.getElementById('ai-chat-history');

    if (!input || !sendBtn || !history) return;

    sendBtn.addEventListener('click', () => {
      const msg = input.value.trim();
      if (!msg) return;

      appendMsg('user', msg);
      input.value = '';

      // Mock AI Analysis
      setTimeout(() => {
        const data = Storage.get();
        let response = "تحليل ذكي: بمعدل " + data.cumulative_gpa.toFixed(2) + "، أنت في وضع مستقر. ";
        if (data.cumulative_gpa < 3.0) response += "أنصحك بتقليل ساعات الفصل القادم للتركيز أكثر.";
        else response += "استمر في هذا الأداء الرائع!";
        appendMsg('ai', response);
      }, 800);
    });

    function appendMsg(role, text) {
      const div = document.createElement('div');
      div.className = `chat-msg ${role} animate-fade-in-up`;
      div.innerHTML = `<div class="msg-bubble p-3 rounded-lg ${role === 'user' ? 'bg-brand-primary text-white ml-auto' : 'bg-black-20 text-text-secondary mr-auto'} max-w-[80%] mb-3">${text}</div>`;
      history.appendChild(div);
      history.scrollTop = history.scrollHeight;
    }
  }

  function handleNukeData() {
    const confirmText = prompt(Storage.get().settings.lang === 'ar' ? "اكتب كلمة DELETE للتأكيد على مسح جميع البيانات:" : "Type DELETE to confirm wiping all data:");
    if (confirmText === "DELETE") {
      Storage.clear();
      window.location.reload();
    }
  }

  function initSettings() {
    renderSettingsUI();

    // Theme Toggle (Settings)
    document.getElementById('settings-theme-toggle')?.addEventListener('click', UI.toggleTheme);

    // Logout Button
    const logoutBtn = document.createElement('div');
    logoutBtn.className = 'settings-item cursor-pointer mt-4 border-red-20';
    logoutBtn.innerHTML = `
      <div class="settings-item-info">
        <i data-lucide="log-out" class="text-accent-red"></i>
        <div class="settings-item-label text-accent-red" data-i18n="logout">Sign Out</div>
      </div>
    `;
    logoutBtn.addEventListener('click', () => {
      if (confirm("Are you sure you want to sign out?")) {
        window.FirebaseModule.logout();
      }
    });
    document.querySelector('#settings .settings-group')?.appendChild(logoutBtn);
    if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [logoutBtn] });

    // Export
    document.getElementById('btn-export')?.addEventListener('click', Storage.exportData);
    
    // Import
    const importBtn = document.getElementById('btn-import');
    const importFile = document.getElementById('import-file');
    importBtn?.addEventListener('click', () => importFile?.click());
    importFile?.addEventListener('change', (e) => {
       const file = e.target.files[0];
       if (file) Storage.importData(file).then(() => window.location.reload());
    });

    // Wipe
    document.getElementById('btn-nuke-data')?.addEventListener('click', handleNukeData);

    // AI Advisor Key Sync
    const elApiKey = document.getElementById('settings-gemini-key');
    if (elApiKey) {
      elApiKey.value = localStorage.getItem('gradeiq_gemini_key') || '';
      elApiKey.addEventListener('input', (e) => {
        localStorage.setItem('gradeiq_gemini_key', e.target.value);
      });
    }

    // Export Listeners
    document.getElementById('history-export-csv')?.addEventListener('click', () => {
      if (typeof ExportUtil !== 'undefined') ExportUtil.exportFullHistory();
    });
    document.getElementById('dashboard-export-csv')?.addEventListener('click', () => {
       if (typeof ExportUtil !== 'undefined') ExportUtil.exportFullHistory();
    });
    document.getElementById('dashboard-export-pdf')?.addEventListener('click', () => {
       UI.showToast("PDF Export coming soon!", "info");
    });
    document.getElementById('btn-ai-predict-grades')?.addEventListener('click', () => {
       App.requestAIGradePrediction();
    });

    // University System Cards
    document.querySelectorAll('.system-card').forEach(card => {
       card.addEventListener('click', () => {
          const sys = card.getAttribute('data-system');
          Storage.updateSettings({ university: sys });
          if (typeof Calculator.setSystem === 'function') Calculator.setSystem(sys);
          renderSettingsUI();
          App.refreshAll();
          UI.showToast(`Grading system: ${sys}`, 'info');
       });
    });

    // Language Toggle
    const btnLang = document.querySelector('.lang-toggle');
    if (btnLang) {
      btnLang.addEventListener('click', () => {
         const data = Storage.get();
         const newLang = (data.settings.lang === 'en') ? 'ar' : 'en';
         Storage.updateSettings({ lang: newLang });
         window.location.reload(); 
      });
    }
  }

  function renderSettingsUI() {
    const data = Storage.get();
    document.querySelectorAll('.system-card').forEach(card => {
       if (card.getAttribute('data-system') === data.settings.university) {
          card.classList.add('active');
       } else {
          card.classList.remove('active');
       }
    });
  }

  return { init, refreshAll };

})();

// Bootstrap
document.addEventListener('DOMContentLoaded', App.init);
