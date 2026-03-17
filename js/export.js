/* ============================================
   GradeIQ — Data Export Utility
   ============================================ */

const ExportUtil = (() => {

  /**
   * Export Dashboard/Sim Results to CSV
   */
  function exportToCSV(filename, data) {
    if (!data || !data.length) return;
    
    const headers = Object.keys(data[0]);
    const csvRows = [];
    
    // Add headers
    csvRows.push(headers.join(','));
    
    // Add rows
    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header];
        return `"${val}"`;
      });
      csvRows.push(values.join(','));
    }
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  /**
   * Export All History to Excel-compatible CSV
   */
  function exportFullHistory() {
    const data = Storage.getData();
    if (!data || !data.semesters.length) {
      Toast.show("No history to export", "warning");
      return;
    }

    const exportData = [];
    data.semesters.forEach(sem => {
      sem.subjects.forEach(sub => {
        exportData.push({
          'Semester': sem.name,
          'Subject': sub.name,
          'Score': sub.grade,
          'Out Of': sub.out_of,
          'Percentage': sub.percentage,
          'Credits': sub.credits,
          'Grade': sub.letter,
          'Points': sub.points
        });
      });
    });

    exportToCSV(`gradeiq_history_${new Date().toISOString().split('T')[0]}.csv`, exportData);
  }

  return {
    exportToCSV,
    exportFullHistory
  };

})();
