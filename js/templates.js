/* ============================================
   GradeIQ — Semester Templates Module
   ============================================ */

const Templates = (() => {
  const PRESETS = [
    {
      name: "Software Engineering Y1 S1",
      subjects: [
        { name: "Mathematics I", score: "", out_of: 100, credits: 3, category: "math" },
        { name: "Physics I", score: "", out_of: 100, credits: 3, category: "math" },
        { name: "Introduction to CS", score: "", out_of: 100, credits: 3, category: "cs" },
        { name: "English Language", score: "", out_of: 100, credits: 2, category: "lang" },
        { name: "Human Rights", score: "", out_of: 50, credits: 2, category: "human" }
      ]
    },
    {
      name: "Software Engineering Y2 S1",
      subjects: [
        { name: "Mathematics III", score: "", out_of: 100, credits: 3, category: "math" },
        { name: "Data Structures", score: "", out_of: 100, credits: 3, category: "cs" },
        { name: "Database Systems", score: "", out_of: 100, credits: 3, category: "cs" },
        { name: "Logic Circuits", score: "", out_of: 100, credits: 3, category: "eng" },
        { name: "Operating Systems", score: "", out_of: 100, credits: 3, category: "cs" }
      ]
    },
    {
        name: "Engineering General",
        subjects: [
          { name: "Calculus", score: "", out_of: 150, credits: 3, category: "math" },
          { name: "Chemistry", score: "", out_of: 100, credits: 3, category: "eng" },
          { name: "Drawing", score: "", out_of: 100, credits: 2, category: "eng" },
          { name: "Mechanics", score: "", out_of: 150, credits: 3, category: "eng" }
        ]
      }
  ];

  function getPresets() {
    const saved = JSON.parse(localStorage.getItem('gradeiq_user_templates') || '[]');
    return [...PRESETS, ...saved];
  }

  function saveCustom(name, subjects) {
    const saved = JSON.parse(localStorage.getItem('gradeiq_user_templates') || '[]');
    // Clean subjects for template (remove scores)
    const templateSubjects = subjects.map(s => ({
      name: s.name,
      score: "",
      out_of: s.out_of,
      credits: s.credits,
      category: s.category
    }));

    saved.push({ name, subjects: templateSubjects });
    localStorage.setItem('gradeiq_user_templates', JSON.stringify(saved));
    UI.showToast(`💾 Template "${name}" saved!`, "success");
  }

  function apply(templateName, targetSubjectsArray) {
    const template = getPresets().find(p => p.name === templateName);
    if (!template) return;

    // Replace target array contents
    targetSubjectsArray.length = 0;
    template.subjects.forEach(s => {
      targetSubjectsArray.push({
        ...s,
        id: Storage.generateUUID(),
        percentage: '—',
        letter: '—',
        color: 'var(--bg-card)'
      });
    });

    UI.showToast(`✅ Template "${templateName}" applied!`, "success");
    if (typeof App !== 'undefined') {
       App.renderSubjectRows();
       App.updateLivePreview();
    }
  }

  return { getPresets, saveCustom, apply };
})();
