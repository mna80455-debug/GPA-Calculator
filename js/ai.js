/* ============================================
   GradeIQ — AI Academic Advisor Module
   Powered by Groq (Free API - llama-3.3-70b)
   ============================================ */

const AIAdvisor = (function() {
  let conversationHistory = [];

  // DOM Elements
  const els = {
    chatHistory: document.getElementById('ai-chat-history'),
    input: document.getElementById('ai-input'),
    sendBtn: document.getElementById('ai-send-btn'),
    quickChips: document.getElementById('ai-quick-chips')
  };

  function init() {
    if (!els.sendBtn) return;

    // Load history
    const saved = localStorage.getItem('gradeiq_chat');
    if (saved) {
      conversationHistory = JSON.parse(saved);
      renderHistory();
      if (conversationHistory.length > 0 && els.quickChips) {
        els.quickChips.style.display = 'none';
      }
    } else {
      renderWelcomeMessage();
    }

    // Attach listeners
    els.sendBtn.addEventListener('click', handleSend);
    els.input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });

    // Quick chips
    document.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        els.input.value = chip.dataset.msg || chip.textContent;
        handleSend();
      });
    });
  }

  function renderWelcomeMessage() {
    if (!els.chatHistory) return;
    const isAr = currentLang === 'ar';
    const msg = isAr
      ? "أهلاً بك! 👋 أنا مستشارك الأكاديمي الذكي. يمكنني تحليل معدلك، اقتراح استراتيجيات للتحسين، والمساعدة في التخطيط للفصول القادمة. كيف يمكنني مساعدتك اليوم؟"
      : "Welcome! 👋 I'm your AI Academic Advisor. I can analyze your GPA, suggest improvement strategies, and help you plan future semesters. How can I help you today?";
    addBubble(msg, 'ai');
  }

  function renderHistory() {
    if (!els.chatHistory) return;
    els.chatHistory.innerHTML = '';
    conversationHistory.forEach(msg => {
      if (msg.role === 'user') addBubble(msg.content, 'user');
      else if (msg.role === 'assistant') addBubble(msg.content, 'ai');
    });
  }

  // Simple Markdown → HTML renderer
  function renderMarkdown(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>')
      .replace(/• /g, '&#8226; ')
      .replace(/^\d+\. /gm, (m) => `<span class="list-num">${m}</span>`);
  }

  function addBubble(text, sender, isLoading = false) {
    if (!els.chatHistory) return;

    const div = document.createElement('div');
    div.className = `chat-bubble ${sender}${isLoading ? ' loading' : ''}`;

    if (isLoading) {
      div.innerHTML = `
        <div class="typing-indicator">
          <span></span><span></span><span></span>
        </div>`;
    } else if (sender === 'ai') {
      div.innerHTML = renderMarkdown(text);
    } else {
      div.textContent = text;
    }

    els.chatHistory.appendChild(div);
    els.chatHistory.scrollTop = els.chatHistory.scrollHeight;
    return div;
  }

  function getTrend(semesters) {
    if (semesters.length < 2) return 'Stable';
    const last = semesters[semesters.length - 1].semester_gpa;
    const prev = semesters[semesters.length - 2].semester_gpa;
    return last > prev ? 'Improving 📈' : (last < prev ? 'Declining 📉' : 'Stable ➡️');
  }

  function buildSystemPrompt() {
    const data = Storage.getData ? Storage.getData() : (Storage.get ? Storage.get() : { cumulative_gpa: 0, total_credits: 0, semesters: [], settings: { university_system: 'delta' } });
    const isAr = currentLang === 'ar';
    const lastGpa = data.semesters && data.semesters.length > 0
      ? data.semesters[data.semesters.length - 1].semester_gpa
      : 0;
    const totalCredits = data.total_credits || 0;
    const semCount = data.semesters ? data.semesters.length : 0;

    return `You are GradeIQ AI, an empathetic and expert academic advisor specializing in Egyptian university students.
Respond in ${isAr ? 'Arabic (Egyptian dialect, warm and encouraging)' : 'English (friendly, clear, and motivating)'}.

Student Academic Profile:
- Cumulative GPA: ${(data.cumulative_gpa || 0).toFixed(2)} / 4.0
- Total Credits Earned: ${totalCredits}
- Number of Semesters: ${semCount}
- Last Semester GPA: ${lastGpa.toFixed ? lastGpa.toFixed(2) : lastGpa}
- GPA Trend: ${getTrend(data.semesters || [])}
- Grading System: ${data.settings?.university_system || 'delta'}

Your response style:
- Be concise but thorough (3-5 sentences typically)
- Use bullet points for lists
- Use **bold** for key numbers and important terms
- Be encouraging and actionable
- Never invent data not provided above
- If GPA is below 2.0, be gentle but honest about urgency`;
  }

  async function handleSend() {
    const text = els.input.value.trim();
    if (!text) return;

    els.input.value = '';
    els.input.disabled = true;
    els.sendBtn.disabled = true;
    els.sendBtn.classList.add('sending');

    if (els.quickChips) els.quickChips.style.display = 'none';

    addBubble(text, 'user');
    const loadingBubble = addBubble('', 'ai', true);

    const systemPrompt = buildSystemPrompt();

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.filter(m => m.role !== 'system'),
      { role: "user", content: text }
    ];

    try {
      const apiKey = typeof CONFIG !== 'undefined' ? CONFIG.GROQ_API_KEY : '';

      if (!apiKey || apiKey === 'YOUR_GROQ_API_KEY_HERE') {
        throw new Error("NO_KEY");
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: messages,
          temperature: 0.7,
          max_tokens: 512
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const resMsg = data.choices?.[0]?.message?.content?.trim() || '';

      if (!resMsg) throw new Error("Empty response");

      // Save to history
      conversationHistory.push(
        { role: "user", content: text },
        { role: "assistant", content: resMsg }
      );

      if (conversationHistory.length > 24) {
        conversationHistory = conversationHistory.slice(-24);
      }
      localStorage.setItem('gradeiq_chat', JSON.stringify(conversationHistory));

      loadingBubble.remove();
      addBubble(resMsg, 'ai');

    } catch (error) {
      loadingBubble.remove();
      const isAr = currentLang === 'ar';

      let errorMsg;
      if (error.message === "NO_KEY") {
        errorMsg = isAr
          ? `🔑 برجاء إضافة الـ API Key الخاص بك في ملف \`js/config.js\` لتفعيل الـ AI.`
          : `🔑 Please add your API Key in the \`js/config.js\` file to enable the AI Advisor.`;
      } else {
        errorMsg = isAr
          ? `❌ حدث خطأ: ${error.message}\n\nتأكد من صحة الـ API Key في الإعدادات.`
          : `❌ Error: ${error.message}\n\nPlease verify your API Key in Settings.`;
      }

      addBubble(errorMsg, 'ai');
    } finally {
      els.input.disabled = false;
      els.sendBtn.disabled = false;
      els.sendBtn.classList.remove('sending');
      els.input.focus();
    }
  }

  // Auto-insights for Dashboard
  function displayAutoInsight(semesterGpa) {
    const isAr = currentLang === 'ar';
    const msg = isAr
      ? `✨ أداء ممتاز! لقد حفظت فصلاً بمعدل ${semesterGpa}. حافظ على هذا الزخم!`
      : `✨ Great job! You secured a **${semesterGpa}** semester GPA. Keep the momentum!`;
    if (typeof Toast !== 'undefined') Toast.show(msg, "info");
  }

  // Public API
  return { init, displayAutoInsight };
})();
