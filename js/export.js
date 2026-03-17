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

  /**
   * Export Dashboard/Sim results to PDF (via Print)
   */
  function exportToPDF(title, data) {
    const printWindow = window.open('', '_blank');
    const isAr = document.documentElement.lang === 'ar';
    
    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; direction: ${isAr ? 'rtl' : 'ltr'}; }
            h1 { color: #2dd4bf; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #eee; padding: 12px; text-align: ${isAr ? 'right' : 'left'}; }
            th { background: #f9f9f9; font-weight: bold; }
            .footer { margin-top: 40px; font-size: 12px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }
            .gpa-summary { margin-top: 20px; padding: 20px; background: #f0fdfa; border-radius: 8px; display: inline-block; }
          </style>
        </head>
        <body>
          <h1>GradeIQ - ${title}</h1>
          <p>${isAr ? 'تاريخ التصدير' : 'Export Date'}: ${new Date().toLocaleDateString()}</p>
          
          <table>
            <thead>
              <tr>
                <th>${isAr ? 'المادة' : 'Subject'}</th>
                <th>${isAr ? 'الدرجة' : 'Score'}</th>
                <th>${isAr ? 'من' : 'Out Of'}</th>
                <th>${isAr ? 'النسبة' : 'Percentage'}</th>
                <th>${isAr ? 'الساعات' : 'Credits'}</th>
                <th>${isAr ? 'التقدير' : 'Grade'}</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(sub => `
                <tr>
                  <td>${sub.name || 'Untitled'}</td>
                  <td>${sub.score}</td>
                  <td>${sub.out_of}</td>
                  <td>${sub.percentage}%</td>
                  <td>${sub.credits}</td>
                  <td>${sub.letter}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            Generated via GradeIQ — Your Academic Intelligence
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  /**
   * Export Dashboard Results (Current calculation)
   */
  function exportDashboardResults(format, subjects) {
    const validSubs = subjects.filter(s => s.score !== '');
    if (!validSubs.length) {
      UI.showToast(document.documentElement.lang === 'ar' ? 'أضف درجات أولاً للتصدير' : "Add scores first to export", "warning");
      return;
    }

    if (format === 'csv') {
      const exportData = validSubs.map(s => ({
        'Subject': s.name || 'Untitled',
        'Score': s.score,
        'Out Of': s.out_of,
        'Percentage': s.percentage + '%',
        'Credits': s.credits,
        'Grade': s.letter
      }));
      exportToCSV(`gradeiq_report_${new Date().getTime()}.csv`, exportData);
    } else {
      exportToPDF("Semester Report", validSubs);
    }
  }

  return {
    exportToCSV,
    exportFullHistory,
    exportDashboardResults
  };

})();
