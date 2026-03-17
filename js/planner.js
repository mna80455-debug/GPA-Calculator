/* ============================================
   Smart GPA Calculator — Planner Module
   ============================================ */

const Planner = (() => {
  let boundUpdateFn = null;

  function init() {
    // DOM Elements
    const curGPAInput = document.getElementById('planner-current-gpa');
    const curHrsInput = document.getElementById('planner-current-hours');
    const targetSlider = document.getElementById('planner-target-gpa');
    const targetValue = document.getElementById('planner-target-value');
    const nextHrsInput = document.getElementById('planner-next-hours');

    // Load current data
    const data = Storage.getAcademicData();
    if (data.total_credit_hours > 0) {
      curGPAInput.value = data.cumulative_gpa.toFixed(2);
      curHrsInput.value = data.total_credit_hours;
    }

    boundUpdateFn = updateResults;

    // Event Listeners
    [curGPAInput, curHrsInput, nextHrsInput].forEach(el => {
      if (el) el.addEventListener('input', boundUpdateFn);
    });

    if (targetSlider && targetValue) {
      targetSlider.addEventListener('input', (e) => {
        targetValue.textContent = parseFloat(e.target.value).toFixed(2);
        boundUpdateFn();
      });
    }

    // Roadmap Elements
    const rmTargetInput = document.getElementById('roadmap-target-gpa');
    const rmSemestersInput = document.getElementById('roadmap-semesters');
    const rmCreditsInput = document.getElementById('roadmap-credits-per-sem');
    const rmBtn = document.getElementById('btn-generate-roadmap');

    if (rmBtn) {
      rmBtn.addEventListener('click', () => {
        generateRoadmapUI(
          parseFloat(curGPAInput.value) || 0,
          parseFloat(curHrsInput.value) || 0,
          parseFloat(rmTargetInput.value) || 3.0,
          parseInt(rmSemestersInput.value, 10) || 4,
          parseInt(rmCreditsInput.value, 10) || 15
        );
      });
    }

    // Initial calc
    updateResults();
  }

  function updateResults() {
    const curGpa = parseFloat(document.getElementById('planner-current-gpa')?.value) || 0;
    const curHrs = parseFloat(document.getElementById('planner-current-hours')?.value) || 0;
    const targetGpa = parseFloat(document.getElementById('planner-target-gpa')?.value) || 0;
    const nextHrs = parseFloat(document.getElementById('planner-next-hours')?.value) || 0;

    const resultBox = document.getElementById('planner-result');
    const reqGpaEl = document.getElementById('planner-req-gpa');
    const meter = document.getElementById('planner-difficulty-meter');
    const msgEl = document.getElementById('planner-message');

    if (!resultBox || !reqGpaEl) return;

    if (nextHrs <= 0) {
      reqGpaEl.textContent = '—';
      if (meter) meter.setAttribute('data-level', 'none');
      if (msgEl) msgEl.innerHTML = 'Please enter next semester credit hours.';
      return;
    }

    const required = Calculator.calcRequiredGPA(curGpa, curHrs, targetGpa, nextHrs);
    const difficulty = Calculator.getDifficultyLevel(required, curGpa);

    if (meter) meter.setAttribute('data-level', difficulty);

    UI.animateNumber(reqGpaEl, required, 2, 600);
    reqGpaEl.className = 'font-mono block ' + (difficulty === 'impossible' ? 'gpa-poor' : 'gpa-good');

    if (msgEl) {
      if (difficulty === 'impossible') {
        // Calculate max possible
        const maxPossible = Calculator.calcCumulativeGPA(curGpa, curHrs, 4.0, nextHrs);
        msgEl.innerHTML = `<span class="text-accent-red">Mathematically impossible.</span><br>The maximum you can reach is <b class="text-white">${maxPossible.toFixed(2)}</b> if you score 4.0 flat.`;
      } else if (difficulty === 'easy') {
        msgEl.innerHTML = `<span class="text-accent-green">You have a safety buffer!</span><br>You can score as low as <b>${Math.max(0, required).toFixed(2)}</b> to hit your target.`;
      } else if (difficulty === 'moderate') {
        msgEl.innerHTML = `This is totally doable. Focus and maintain consistency.`;
      } else if (difficulty === 'hard') {
        msgEl.innerHTML = `<span class="text-accent-yellow">This will be challenging.</span><br>You'll need near-perfect marks in all your upcoming subjects.`;
      }
    }
  }

  function generateRoadmapUI(curGpa, curHrs, target, sems, credits) {
    const container = document.getElementById('roadmap-container');
    if (!container) return;

    const roadmapData = Calculator.generateRoadmap(curGpa, curHrs, target, sems, credits);

    // Check if target is impossible even with perfect scores
    const absoluteMax = Calculator.calcCumulativeGPA(curGpa, curHrs, 4.0, sems * credits);
    if (absoluteMax < target) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon text-accent-red"><i data-lucide="alert-circle" style="width:48px;height:48px"></i></div>
          <h3>Target Impossible</h3>
          <p>Even with perfect 4.0 semesters, the highest you can reach is ${absoluteMax.toFixed(2)}.</p>
        </div>
      `;
      lucide.createIcons({ nodes: [container] });
      return;
    }

    let html = '<div class="roadmap">';
    roadmapData.forEach(step => {
      const isImp = step.difficulty === 'impossible';
      const colorCls = isImp ? 'text-accent-red' : (step.difficulty === 'hard' ? 'text-accent-yellow' : 'text-accent-green');
      
      html += `
        <div class="roadmap-item stagger-children">
          <div class="flex justify-between items-center mb-1">
            <span class="font-medium">Semester ${step.semester}</span>
            <span class="badge ${isImp ? 'badge-red' : (step.difficulty === 'hard' ? 'badge-yellow' : 'badge-green')}">
              Required: ${step.requiredGPA.toFixed(2)}
            </span>
          </div>
          <div class="text-sm text-muted">
            Difficulty: <span class="${colorCls} capitalize">${step.difficulty}</span>
          </div>
        </div>
      `;
    });
    html += '</div>';

    container.innerHTML = html;
  }

  return { init, updateResults };
})();
