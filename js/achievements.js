/* ============================================
   GradeIQ — Achievements & Badges Module
   ============================================ */

const Achievements = (() => {
  const BADGES = [
    { id: 'first_sem', name: "First Semester!", icon: "🥇", desc: "Saved your first semester ever" },
    { id: 'on_rise', name: "On the Rise", icon: "⬆️", desc: "GPA improved 3 semesters in a row" },
    { id: 'sharp_shooter', name: "Sharp Shooter", icon: "🎯", desc: "All subjects in a semester above 80%" },
    { id: 'deans_list', name: "Dean's List", icon: "💎", desc: "Semester GPA ≥ 3.7" },
    { id: 'perfect_streak', name: "Perfect Streak", icon: "🔥", desc: "No subject below 70% for 2 semesters" },
    { id: 'comeback', name: "Comeback Kid", icon: "📈", desc: "GPA improved by +0.5 after a drop" },
    { id: 'excellence', name: "Excellence", icon: "🏆", desc: "Cumulative GPA ≥ 3.5" }
  ];

  function getUnlocked() {
     return JSON.parse(localStorage.getItem('gradeiq_achievements') || '[]');
  }

  function unlock(id) {
    const unlocked = getUnlocked();
    if (unlocked.includes(id)) return;

    unlocked.push(id);
    localStorage.setItem('gradeiq_achievements', JSON.stringify(unlocked));
    
    const badge = BADGES.find(b => b.id === id);
    if (badge) {
      UI.showAchievementToast(badge);
    }
    renderShelf();
  }

  function checkAndUnlock(newSem, allData) {
    const sems = allData.semesters;

    // 1. First Semester
    if (sems.length === 1) unlock('first_sem');

    // 2. Dean's List
    if (newSem.semester_gpa >= 3.7) unlock('deans_list');

    // 3. Sharp Shooter (All subjects > 80%)
    if (newSem.subjects.every(s => s.percentage >= 80)) unlock('sharp_shooter');

    // 4. Excellence
    if (allData.cumulative_gpa >= 3.5) unlock('excellence');

    // 5. On the Rise (3 semesters improvement)
    if (sems.length >= 3) {
      const last3 = sems.slice(-3);
      if (last3[2].semester_gpa > last3[1].semester_gpa && last3[1].semester_gpa > last3[0].semester_gpa) {
        unlock('on_rise');
      }
    }

    // 6. Comeback Kid
    if (sems.length >= 2) {
      const last = sems[sems.length - 1];
      const prev = sems[sems.length - 2];
      if (last.semester_gpa - prev.semester_gpa >= 0.5) unlock('comeback');
    }

    // 7. Perfect Streak
    if (sems.length >= 2) {
       const last2 = sems.slice(-2);
       if (last2.every(sem => sem.subjects.every(sub => sub.percentage >= 70))) {
         unlock('perfect_streak');
       }
    }
  }

  function renderShelf() {
    const container = document.getElementById('achievement-shelf');
    if (!container) return;

    const unlocked = getUnlocked();
    container.innerHTML = '';
    
    BADGES.forEach(b => {
      const isUnlocked = unlocked.includes(b.id);
      const item = document.createElement('div');
      item.className = `achievement-item ${isUnlocked ? 'unlocked' : ''}`;
      item.title = isUnlocked ? `${b.name}: ${b.desc}` : 'Locked Achievement';
      item.innerHTML = `
        <div class="achievement-icon">${isUnlocked ? b.icon : '?'}</div>
        <span class="text-[10px] text-muted text-center">${isUnlocked ? b.name : '???'}</span>
      `;
      container.appendChild(item);
    });
  }

  return { checkAndUnlock, renderShelf, getUnlocked };
})();
