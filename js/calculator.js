/* ============================================
   GradeIQ — Calculator & Math Engine
   ============================================ */

const Calculator = (() => {

  /**
   * Precise grade-to-letter mapping requested by the user
   */
  function getLetterGrade(percentage) {
    percentage = Math.round(percentage);
    if (percentage >= 90) return { letter: 'A+', points: 4.0, color: '#34d399' };
    if (percentage >= 85) return { letter: 'A',  points: 3.7, color: '#34d399' };
    if (percentage >= 80) return { letter: 'B+', points: 3.3, color: '#2dd4bf' };
    if (percentage >= 75) return { letter: 'B',  points: 3.0, color: '#2dd4bf' };
    if (percentage >= 70) return { letter: 'C+', points: 2.7, color: '#fbbf24' };
    if (percentage >= 65) return { letter: 'C',  points: 2.3, color: '#fbbf24' };
    if (percentage >= 60) return { letter: 'D+', points: 2.0, color: '#fb923c' };
    if (percentage >= 50) return { letter: 'D',  points: 1.7, color: '#fb923c' };
    return { letter: 'F', points: 0.0, color: '#f87171' };
  }

  /**
   * Calculate semester GPA
   * Formula: Σ(points * credits) / Σ(credits)
   */
  function calcSemesterGPA(subjects) {
    let totalPoints = 0;
    let totalHours = 0;
    subjects.forEach(s => {
      totalPoints += (s.gpa_points || 0) * (s.credit_hours || 0);
      totalHours += (s.credit_hours || 0);
    });
    return totalHours > 0 ? (totalPoints / totalHours) : 0;
  }

  /**
   * Calculate new cumulative GPA
   * Formula: ((existingGPA * existingHours) + (semGPA * nextHours)) / (existingHours + nextHours)
   */
  function calcCumulativeGPA(existingGPA, existingHours, newSemGPA, newSemHours) {
    const totalPoints = (existingGPA * existingHours) + (newSemGPA * newSemHours);
    const totalHours = existingHours + newSemHours;
    return totalHours > 0 ? (totalPoints / totalHours) : 0;
  }

  /**
   * Calculate required GPA for a target
   */
  function calcRequiredGPA(currentGPA, currentHours, targetGPA, nextHours) {
    if (nextHours <= 0) return 0;
    const required = ((targetGPA * (currentHours + nextHours)) - (currentGPA * currentHours)) / nextHours;
    return required;
  }

  /**
   * Difficulty categories as requested
   */
  function getDifficulty(requiredGPA) {
    if (requiredGPA > 4.0) return { label: 'Impossible', class: 'impossible', color: '#F87171' };
    if (requiredGPA <= 0) return { label: 'Already Achieved', class: 'easy', color: '#34D399' };
    if (requiredGPA < 2.5) return { label: 'Easy', class: 'easy', color: '#34D399' };
    if (requiredGPA < 3.0) return { label: 'Moderate', class: 'moderate', color: '#60A5FA' };
    if (requiredGPA < 3.5) return { label: 'Hard', class: 'hard', color: '#FBBF24' };
    return { label: 'Very Hard', class: 'hard-extreme', color: '#FB923C' };
  }

  return {
    getLetterGrade,
    calcSemesterGPA,
    calcCumulativeGPA,
    calcRequiredGPA,
    getDifficulty
  };
})();
