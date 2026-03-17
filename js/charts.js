/* ============================================
   GradeIQ — Charts & Visualization Engine
   ============================================ */

const Charts = (() => {
  let gpaJourneyChart = null;

  /**
   * Helper to get CSS variables
   */
  function getStyle(prop) {
    return getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
  }

  function getThemeColors() {
    return {
      primary: getStyle('--brand-primary') || '#0d9488',
      secondary: getStyle('--brand-secondary') || '#2dd4bf',
      accent: getStyle('--brand-accent') || '#6ee7d4',
      textMuted: getStyle('--text-muted') || '#7abfb8',
      grid: getStyle('--border-subtle') || 'rgba(13,148,136,0.1)',
      card: getStyle('--bg-card') || 'rgba(13,148,136,0.02)'
    };
  }

  /**
   * Apply Global Defaults
   */
  function applyDefaults() {
    if (!window.Chart) return;
    const colors = getThemeColors();
    Chart.defaults.color = '#7abfb8';
    Chart.defaults.borderColor = 'rgba(13,148,136,0.1)';
    Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";
    
    if (Chart.defaults.plugins.tooltip) {
      Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(10, 26, 26, 0.9)';
      Chart.defaults.plugins.tooltip.borderColor = 'rgba(13,148,136,0.2)';
      Chart.defaults.plugins.tooltip.borderWidth = 1;
      Chart.defaults.plugins.tooltip.padding = 12;
      Chart.defaults.plugins.tooltip.titleColor = '#e0faf6';
      Chart.defaults.plugins.tooltip.bodyColor = '#7abfb8';
    }
  }

  /**
   * Render GPA Journey Line Chart
   */
  function renderGPAJourney(canvasId, semesters) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !window.Chart) return;

    if (gpaJourneyChart) gpaJourneyChart.destroy();

    const colors = getThemeColors();
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, colors.primary + '33'); // 20% opacity
    gradient.addColorStop(1, colors.primary + '00'); // 0% opacity

    gpaJourneyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: semesters.map(s => s.name),
        datasets: [{
          label: 'Semester GPA',
          data: semesters.map(s => s.semester_gpa),
          borderColor: '#2dd4bf',
          backgroundColor: 'rgba(13, 148, 136, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#6ee7d4',
          pointBorderColor: '#0d9488',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
          legend: { display: false },
          tooltip: {
             callbacks: {
                label: (ctx) => `GPA: ${ctx.parsed.y.toFixed(2)}`
             }
          }
        },
        scales: {
          y: { 
            min: 0, 
            max: 4.0, 
            ticks: { 
               stepSize: 1.0,
               color: colors.textMuted 
            },
            grid: { color: colors.grid }
          },
          x: { 
            ticks: { color: colors.textMuted },
            grid: { display: false } 
          }
        }
      }
    });
  }

  /**
   * Render Heatmap
   */
  function renderHeatmap(containerId, semesters) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const colors = getThemeColors();
    const allSubjectNames = [...new Set(semesters.flatMap(sem => sem.subjects.map(sub => sub.name)))];
    
    if (allSubjectNames.length === 0) {
      el.innerHTML = '<div class="text-muted text-xs p-4 text-center">No data available</div>';
      return;
    }

    const cols = semesters.length;
    el.style.gridTemplateColumns = `120px repeat(${cols}, 1fr)`;

    let html = '<div></div>'; // Header spacer
    semesters.forEach(s => {
      html += `<div class="text-center text-[10px] text-muted overflow-hidden truncate px-1" title="${s.name}">${s.name}</div>`;
    });

    allSubjectNames.forEach(name => {
      html += `<div class="text-xs text-muted truncate pr-2 py-1" title="${name}">${name}</div>`;
      semesters.forEach(s => {
        const sub = s.subjects.find(sub => sub.name === name);
        let bg = colors.card;
        let tooltip = 'N/A';
        
        if (sub) {
          const ratio = (sub.points || 0) / 4.0;
          bg = colors.primary + Math.round((0.1 + ratio * 0.7) * 255).toString(16).padStart(2, '0');
          tooltip = `${sub.name}: ${sub.letter} (${sub.grade}%)`;
        }
        
        html += `<div class="w-full h-4 rounded-sm" style="background:${bg}" title="${tooltip}"></div>`;
      });
    });

    el.innerHTML = html;
  };

  /**
   * Render Grade Distribution Donut Chart (Feature 5)
   */
  function renderDistribution(canvasId, semesters) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !window.Chart) return;

    const ctx = canvas.getContext('2d');
    const colors = getThemeColors();
    
    // Calculate counts
    const distribution = { 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 };
    semesters.forEach(sem => {
      sem.subjects.forEach(sub => {
        const letter = sub.letter?.charAt(0);
        if (distribution[letter] !== undefined) distribution[letter]++;
      });
    });

    const data = Object.values(distribution);
    const total = data.reduce((a, b) => a + b, 0);

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['A grades', 'B grades', 'C grades', 'D grades', 'F grades'],
        datasets: [{
          data: data,
          backgroundColor: [
            '#34d399', // A
            '#2dd4bf', // B
            '#fbbf24', // C
            '#fb923c', // D
            '#f87171'  // F
          ],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        cutout: '70%',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const val = ctx.raw;
                const pct = total > 0 ? ((val / total) * 100).toFixed(0) : 0;
                return `${ctx.label}: ${val} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  return {
    renderGPAJourney,
    renderHeatmap,
    renderDistribution,
    applyDefaults
  };
})();
