/* ============================================
   GradeIQ — AI Academic Advisor Module
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
    if (!els.sendBtn) return; // Prevent errors if not found

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
        els.input.value = chip.textContent;
        handleSend();
      });
    });
  }

  function renderWelcomeMessage() {
    if (!els.chatHistory) return;
    const isAr = currentLang === 'ar';
    const msg = isAr 
      ? "أهلاً بك في مستشار الذكاء الاصطناعي! كيف يمكنني مساعدتك في تخطيط مسارك الأكاديمي اليوم؟" 
      : "Welcome to your AI Advisor! How can I help you plan your academic journey today?";
    
    addBubble(msg, 'ai');
  }

  function addBubble(text, sender, isLoading = false) {
    if (!els.chatHistory) return;

    const div = document.createElement('div');
    div.className = `chat-bubble ${sender} ${isLoading ? 'loading' : ''}`;
    
    if (isLoading) {
      div.innerHTML = `<span class="typing-ind"><span>.</span><span>.</span><span>.</span></span>`;
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
    return last > prev ? 'Improving' : (last < prev ? 'Declining' : 'Stable');
  }

  function buildSystemPrompt() {
    const data = Storage.getData() || { cumulative_gpa: 0, total_credit_hours: 0, semesters: [], settings: { university_system: 'standard' } };
    const isAr = currentLang === 'ar';
    
    const lastGpa = data.semesters.length > 0 ? data.semesters[data.semesters.length - 1].semester_gpa : 0;
    
    return `
You are GradeIQ AI, an intelligent academic advisor for Egyptian university students. 
You speak ${isAr ? 'Arabic (Egyptian dialect, friendly and warm)' : 'English (friendly and encouraging)'}.

Student's context:
- Cumulative GPA: ${data.cumulative_gpa} / 4.0
- Credits: ${data.total_credit_hours}
- Semesters: ${data.semesters.length}
- Last Semester GPA: ${lastGpa}
- GPA Trend: ${getTrend(data.semesters)}
- Scale: ${data.settings.university_system}

Your role:
1. Analyze their GPA explicitly.
2. Give actionable advice to improve.
3. Be concise (3-5 sentences max).
4. Never invent data.
`;
  }

  async function handleSend() {
    const text = els.input.value.trim();
    if (!text) return;

    // UI Updates
    els.input.value = '';
    if (els.quickChips) els.quickChips.style.display = 'none';
    
    addBubble(text, 'user');
    const loadingBubble = addBubble('', 'ai', true);

    const systemPrompt = buildSystemPrompt();

    const messages = [
      ...conversationHistory,
      { role: "user", content: text }
    ];

    try {
      const apiKey = localStorage.getItem('gradeiq_gemini_key') || '';
      
      if (!apiKey) {
        throw new Error("No API Key");
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemPrompt}\n\nUser Question: ${text}`
            }]
          }]
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      const aiText = data.candidates[0].content.parts[0].text;
      
      const resMsg = aiText.trim();

      // Save to history
      conversationHistory.push(
        { role: "user", content: text },
        { role: "assistant", content: resMsg }
      );

      // Enforce limits
      if (conversationHistory.length > 20) {
        conversationHistory = conversationHistory.slice(-20);
      }
      localStorage.setItem('gradeiq_chat', JSON.stringify(conversationHistory));

      // Update UI
      loadingBubble.remove();
      addBubble(resMsg, 'ai');

    } catch (error) {
      loadingBubble.remove();
      const isAr = currentLang === 'ar';
      
      let errorMsg = error.message === "No API Key" 
        ? (isAr ? "برجاء إضافة API Key الخاص بك من الإعدادات لاستخدام الذكاء الاصطناعي. 🔑" : "Please add your Gemini API Key in Settings to use the AI Advisor. 🔑")
        : (isAr ? "عذراً، حدث خطأ في الاتصال. تأكد من صحة الـ API Key. 🔄" : "Connection error. Please check your API Key. 🔄");
        
      addBubble(errorMsg, 'ai');
    }
  }

  // Auto-insights for Dashboard
  function displayAutoInsight(semesterGpa) {
    const isAr = currentLang === 'ar';
    const msg = isAr 
        ? `✨ أداء ممتاز! لقد حفظت للتو فصلاً بمعدل ${semesterGpa}. حافظ على هذا الزخم!`
        : `✨ Great job! You just secured a ${semesterGpa} semester GPA. Keep up the momentum!`;
    
    Toast.show(msg, "info");
  }

  // Public API
  return {
    init,
    displayAutoInsight
  };

})();
