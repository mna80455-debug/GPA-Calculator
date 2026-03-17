/* ============================================
   GradeIQ — Storage & Data Persistence
   ============================================ */

const Storage = (() => {
  const KEY = 'gradeiq_data';
  let currentUser = null;

  const DEFAULT = {
    settings: { 
      university: 'delta', 
      lang: 'en', 
      theme: 'dark', 
      active_section: 'dashboard' 
    },
    cumulative_gpa: 0,
    total_credits: 0,
    semesters: []
  };

  /**
   * Get Storage Key for Current User
   */
  function getFullKey() {
    return currentUser ? `${KEY}_${currentUser.uid}` : KEY;
  }

  /**
   * Load data from localStorage
   */
  function load() {
    try {
      const raw = localStorage.getItem(getFullKey());
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT));
      const parsed = JSON.parse(raw);
      
      // Data Migration (Grade System Fix)
      if (parsed.semesters) {
        parsed.semesters.forEach(sem => {
          if (sem.subjects) {
            sem.subjects.forEach(sub => {
              // If old format (has grade but no out_of)
              if (sub.grade !== undefined && sub.out_of === undefined) {
                sub.score = sub.grade;
                sub.out_of = 100;
                sub.percentage = sub.grade;
              }
            });
          }
        });
      }

      return {
        ...DEFAULT,
        ...parsed,
        settings: { ...DEFAULT.settings, ...(parsed.settings || {}) }
      };
    } catch (e) {
      console.error("[Storage] Failed to load:", e);
      return JSON.parse(JSON.stringify(DEFAULT));
    }
  }

  /**
   * Save data to localStorage
   */
  function save(data) {
    try {
      localStorage.setItem(getFullKey(), JSON.stringify(data));
      
      // Background Sync to Firestore
      if (currentUser && typeof window.FirebaseModule !== 'undefined') {
        window.FirebaseModule.updateSettings(currentUser.uid, data.settings);
        // We sync semesters individually in add/delete usually, 
        // but here we ensure settings are synced.
      }

      if (typeof App !== 'undefined' && App.refreshAll) App.refreshAll();
    } catch (e) {
      console.error("[Storage] Failed to save:", e);
    }
  }

  function recalcCumulative(semesters) {
    let totalPoints = 0, totalCredits = 0;
    semesters.forEach(sem => {
      totalPoints += (sem.semester_gpa || 0) * (sem.total_credits || 0);
      totalCredits += (sem.total_credits || 0);
    });
    return totalCredits > 0 ? (totalPoints / totalCredits) : 0;
  }

  return {
    setUser: (user) => { currentUser = user; },
    getCurrentUser: () => currentUser,
    get: load,
    save: save,
    
    syncWithCloud: async (firebaseProvider) => {
      if (!currentUser) return;
      
      const syncStatus = document.getElementById('sync-status');
      if (syncStatus) {
        syncStatus.querySelector('span').className = 'online-dot';
        syncStatus.querySelector('.sync-text').setAttribute('data-i18n', 'sync_online');
        syncStatus.querySelector('.sync-text').textContent = translations[currentLang]?.sync_online || 'Synced';
      }

      // Check for Legacy Data Migration
      const legacyRaw = localStorage.getItem(KEY);
      if (legacyRaw) {
        try {
          const legacyData = JSON.parse(legacyRaw);
          const userData = load(); // loads from KEY_{uid}
          
          // Only migrate if user-specific store is empty
          if (userData.semesters.length === 0 && legacyData.semesters.length > 0) {
            console.log("[Storage] Migrating legacy data to user store...");
            userData.semesters = legacyData.semesters;
            userData.settings = { ...userData.settings, ...legacyData.settings };
            userData.cumulative_gpa = recalcCumulative(userData.semesters);
            userData.total_credits = userData.semesters.reduce((acc, s) => acc + s.total_credits, 0);
            save(userData);
            
            // Upload to Cloud
            for (const sem of userData.semesters) {
              await firebaseProvider.saveSemester(currentUser.uid, sem);
            }
            UI.showToast("Local data successfully synced to your account!", "success");
          }
          // Remove legacy key after migration or if empty
          localStorage.removeItem(KEY);
        } catch (e) {
          console.error("Migration error:", e);
        }
      }

      const cloudSemesters = await firebaseProvider.fetchSemesters(currentUser.uid);
      const localData = load();

      if (cloudSemesters.length > 0) {
        localData.semesters = cloudSemesters;
        localData.cumulative_gpa = recalcCumulative(localData.semesters);
        localData.total_credits = localData.semesters.reduce((acc, s) => acc + s.total_credits, 0);
        save(localData);
      } else if (localData.semesters.length > 0) {
        for (const sem of localData.semesters) {
           await firebaseProvider.saveSemester(currentUser.uid, sem);
        }
      }
    },

    updateSettings: (partial) => {
      const data = load();
      data.settings = { ...data.settings, ...partial };
      save(data);
    },

    addSemester: async (sem) => {
      const data = load();
      data.semesters.push(sem);
      data.cumulative_gpa = recalcCumulative(data.semesters);
      data.total_credits = data.semesters.reduce((acc, s) => acc + s.total_credits, 0);
      save(data);

      if (currentUser && typeof window.FirebaseModule !== 'undefined') {
        try {
          await window.FirebaseModule.saveSemester(currentUser.uid, sem);
        } catch (e) {
          UI.showToast("Saved offline — will sync when connected 📴", "warning");
        }
      }
    },

    deleteSemester: async (id) => {
      const data = load();
      data.semesters = data.semesters.filter(s => s.id !== id);
      data.cumulative_gpa = recalcCumulative(data.semesters);
      data.total_credits = data.semesters.reduce((acc, s) => acc + s.total_credits, 0);
      save(data);

      if (currentUser && typeof window.FirebaseModule !== 'undefined') {
        try {
          await window.FirebaseModule.deleteSemester(currentUser.uid, id);
        } catch (e) {
          UI.showToast("Deleted offline — will sync later 📴", "warning");
        }
      }
    },

    clear: () => {
      localStorage.removeItem(getFullKey());
      window.location.reload();
    },

    generateUUID: () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
  };
})();
