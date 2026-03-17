/* ============================================
   Smart GPA Calculator — Simulator Module
   ============================================ */

const Simulator = (() => {
  let simSubjects = [];
  let baseGPA = 0;
  let baseHours = 0;

  function init() {
    refreshBaseData();
    renderSimulationUI();
    
    // Listeners
    document.getElementById('btn-add-sim-subject')?.addEventListener('click', () => {
      addSimSubject();
    });
    
    document.getElementById('sim-toggle')?.addEventListener('change', (e) => {
      // e.target.checked ? "New Semester" : "Include in Existing"
      calculateSimulation();
    });
  }

  function refreshBaseData() {
    const data = Storage.getAcademicData();
    baseGPA = data.cumulative_gpa;
    baseHours = data.total_credit_hours;
    
    // Update "Current Reality" panel
    const curGPAEl = document.getElementById('sim-current-gpa');
    const curHrsEl = document.getElementById('sim-current-hours');
    
    if (curGPAEl) curGPAEl.textContent = baseGPA.toFixed(2);
    if (curHrsEl) curHrsEl.textContent = baseHours;
  }

  function addSimSubject() {
    simSubjects.push({
      id: Storage.generateUUID(),
      name: `Simulated Subject ${simSubjects.length + 1}`,
      grade_percentage: 85,
      credit_hours: 3
    });
    renderSimulationUI();
    calculateSimulation();
  }

  function removeSimSubject(id) {
    simSubjects = simSubjects.filter(s => s.id !== id);
    renderSimulationUI();
    calculateSimulation();
  }

  function updateSimSubject(id, field, value) {
    const sub = simSubjects.find(s => s.id === id);
    if (!sub) return;
    
    if (field === 'grade_percentage') {
      sub.grade_percentage = parseFloat(value) || 0;
      const gradeInfo = Calculator.percentageToGrade(sub.grade_percentage);
      sub.grade_letter = gradeInfo.letter;
      sub.gpa_points = gradeInfo.points;
    } else if (field === 'credit_hours') {
      sub.credit_hours = parseInt(value, 10) || 0;
    } else if (field === 'name') {
      sub.name = value;
    }
    
    if (field === 'grade_percentage') {
      const row = document.querySelector(`[data-sim-id="${id}"]`);
      if (row) {
        const badge = row.querySelector('.grade-badge');
        if (badge) {
          badge.textContent = sub.grade_letter;
          badge.className = `grade-badge ${UI.gradeBadgeClass(sub.grade_letter)}`;
        }
      }
    }
    
    calculateSimulation();
  }

  function renderSimulationUI() {
    const list = document.getElementById('sim-subjects-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    if (simSubjects.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <p>Add subjects to see how they impact your GPA.</p>
        </div>
      `;
      return;
    }
    
    simSubjects.forEach(sub => {
      // Ensure grade info exists
      if (!sub.grade_letter) {
        const gradeInfo = Calculator.percentageToGrade(sub.grade_percentage);
        sub.grade_letter = gradeInfo.letter;
        sub.gpa_points = gradeInfo.points;
      }
      
      const row = document.createElement('div');
      row.className = 'subject-row';
      row.setAttribute('data-sim-id', sub.id);
      
      row.innerHTML = `
        <input type="text" class="form-input sim-name" value="${sub.name}" placeholder="Subject Name">
        <div class="flex items-center gap-1">
          <input type="number" class="form-input sim-grade text-center" value="${sub.grade_percentage}" min="0" max="100" placeholder="%">
          <span class="text-muted">%</span>
        </div>
        <select class="form-input sim-credits">
          ${[1,2,3,4,5,6].map(h => `<option value="${h}" ${sub.credit_hours === h ? 'selected' : ''}>${h} cr</option>`).join('')}
        </select>
        <div class="grade-badge ${UI.gradeBadgeClass(sub.grade_letter)}">${sub.grade_letter}</div>
        <button class="btn-icon btn-ghost text-accent-red sim-delete" title="Remove">
          <i data-lucide="trash-2"></i>
        </button>
      `;
      
      // Listeners
      row.querySelector('.sim-name').addEventListener('input', e => updateSimSubject(sub.id, 'name', e.target.value));
      row.querySelector('.sim-grade').addEventListener('input', e => updateSimSubject(sub.id, 'grade_percentage', e.target.value));
      row.querySelector('.sim-credits').addEventListener('change', e => updateSimSubject(sub.id, 'credit_hours', e.target.value));
      row.querySelector('.sim-delete').addEventListener('click', () => removeSimSubject(sub.id));
      
      list.appendChild(row);
    });
    
    lucide.createIcons({ nodes: [...list.querySelectorAll('.sim-delete')] });
  }

  function calculateSimulation() {
    refreshBaseData();
    
    const isNewSemester = document.getElementById('sim-toggle')?.checked || false;
    
    let simSemGPA = 0;
    let simSemHours = 0;
    
    simSubjects.forEach(s => {
      simSemGPA += (s.gpa_points || 0) * (s.credit_hours || 0);
      simSemHours += (s.credit_hours || 0);
    });
    
    simSemGPA = simSemHours > 0 ? simSemGPA / simSemHours : 0;
    
    // New Cumulative
    let newCumGPA = baseGPA;
    let newCumHours = baseHours;
    
    if (simSemHours > 0) {
      if (isNewSemester) {
        newCumGPA = Calculator.calcCumulativeGPA(baseGPA, baseHours, simSemGPA, simSemHours);
        newCumHours = baseHours + simSemHours;
      } else {
        // Assume replacing the most recent semester or blending into it
        // For simplicity, just adding to cumulative
        newCumGPA = Calculator.calcCumulativeGPA(baseGPA, baseHours, simSemGPA, simSemHours);
        newCumHours = baseHours + simSemHours;
      }
    }
    
    updateSimulationResults(newCumGPA, newCumHours, simSemGPA);
  }

  function updateSimulationResults(newCum, newHrs, semGpa) {
    const elGPA = document.getElementById('sim-future-gpa');
    const elHrs = document.getElementById('sim-future-hours');
    const elDiff = document.getElementById('sim-diff-badge');
    
    if (!elGPA || !elHrs || !elDiff) return;
    
    UI.animateNumber(elGPA, newCum, 2, 800);
    elHrs.textContent = newHrs;
    
    const diff = newCum - baseGPA;
    let diffHtml = '';
    
    if (diff > 0.001) {
      elGPA.className = 'font-mono text-accent-green';
      diffHtml = `<span class="badge badge-green"><i data-lucide="trending-up" style="width:14px;height:14px"></i> +${diff.toFixed(2)}</span>`;
    } else if (diff < -0.001) {
      elGPA.className = 'font-mono text-accent-red';
      diffHtml = `<span class="badge badge-red"><i data-lucide="trending-down" style="width:14px;height:14px"></i> ${diff.toFixed(2)}</span>`;
    } else {
      elGPA.className = 'font-mono text-text-primary';
      diffHtml = `<span class="badge badge-yellow"><i data-lucide="minus" style="width:14px;height:14px"></i> 0.00</span>`;
    }
    
    elDiff.innerHTML = diffHtml;
    lucide.createIcons({ nodes: [elDiff] });
    
    // Sensitivity Analysis
    renderSensitivity();
  }

  function renderSensitivity() {
    const container = document.getElementById('sim-sensitivity');
    if (!container) return;
    
    const analysis = Calculator.sensitivityAnalysis(simSubjects);
    
    if (analysis.length === 0) {
      container.innerHTML = '<p class="text-sm text-muted">Add subjects to see impact.</p>';
      return;
    }
    
    const priority = analysis[0];
    if (priority.impactPotential > 0) {
      container.innerHTML = `
        <div class="stagger-children">
          <div class="flex items-center gap-2 mb-2">
            <i data-lucide="star" class="text-accent-yellow"></i>
            <span class="font-medium text-sm">Priority Subject</span>
          </div>
          <p class="text-sm text-muted mb-2">
            Improving <b class="text-white">${priority.name}</b> yields the highest return because it has 
            <b>${priority.credit_hours} credit hours</b> and a current grade of <b>${priority.grade_letter}</b>.
          </p>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${(priority.impactPotential / (4.0 * priority.credit_hours)) * 100}%"></div>
          </div>
        </div>
      `;
      lucide.createIcons({ nodes: [container] });
    } else {
      container.innerHTML = '<p class="text-sm text-accent-green">You have perfect scores in simulated subjects!</p>';
    }
  }

  return { init, refreshBaseData, addSimSubject };
})();
