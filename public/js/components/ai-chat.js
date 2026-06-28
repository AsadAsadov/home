(function () {
  const LS_VISITOR = 'besthome_ai_visitor_id';
  const LS_CONVERSATION = 'besthome_ai_conversation_id';
  const chips = ['Sea Breeze-də 1 otaqlı', 'Satış elanları', 'Kirayə', 'Layihələr', 'WhatsApp ilə əlaqə'];
  const state = { open: false, busy: false };
  const visitorId = () => {
    let id = localStorage.getItem(LS_VISITOR);
    if (!id) { id = `bhv_${Date.now()}_${Math.random().toString(16).slice(2)}`; localStorage.setItem(LS_VISITOR, id); }
    return id;
  };
  const conversationId = () => localStorage.getItem(LS_CONVERSATION) || '';
  const setConversationId = id => { if (id) localStorage.setItem(LS_CONVERSATION, id); };
  const esc = value => String(value || '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
  const userId = () => window.activeUser?.id || JSON.parse(localStorage.getItem('besthome_user_data') || '{}')?.id || null;
  async function post(url, body) {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error('AI chat request failed');
    return response.json();
  }
  function addMessage(role, text) {
    const list = document.querySelector('.bh-ai-chat__messages');
    if (!list) return;
    list.insertAdjacentHTML('beforeend', `<div class="bh-ai-chat__bubble bh-ai-chat__bubble--${role}">${esc(text)}</div>`);
    list.scrollTop = list.scrollHeight;
  }
  function cards(items, type) {
    if (!items?.length) return;
    const list = document.querySelector('.bh-ai-chat__messages');
    const html = items.slice(0, 3).map(item => `<article class="bh-ai-chat-card">${item.imageUrl ? `<img src="${esc(item.imageUrl)}" alt="">` : ''}<div><b>${esc(item.title)}</b><span>${esc(item.price || item.location || item.projectName || '')}</span><a href="${esc(item.url)}">Bax</a></div></article>`).join('');
    list.insertAdjacentHTML('beforeend', `<div class="bh-ai-chat__cards" aria-label="Uyğun ${type}">${html}</div>`);
    list.scrollTop = list.scrollHeight;
  }
  function typing(on) { document.querySelector('.bh-ai-chat__typing')?.classList.toggle('is-visible', Boolean(on)); }
  async function send(text) {
    const message = String(text || document.querySelector('.bh-ai-chat__input')?.value || '').trim();
    if (!message || state.busy) return;
    document.querySelector('.bh-ai-chat__input').value = '';
    addMessage('user', message);
    state.busy = true; typing(true);
    try {
      const data = await post('/api/ai-chat/message', { conversationId: conversationId() || undefined, visitorId: visitorId(), userId: userId() || undefined, message });
      setConversationId(data.conversationId);
      addMessage('assistant', data.reply || 'Bağışlayın, cavab hazırlaya bilmədim.');
      cards(data.matchedListings, 'elanlar'); cards(data.matchedProjects, 'layihələr');
    } catch (_error) { addMessage('assistant', 'Hazırda AI cavabı hazırlaya bilmirəm. İstəsəniz sizi əməkdaşımıza yönləndirə bilərəm.'); }
    finally { state.busy = false; typing(false); }
  }
  function render() {
    if (document.getElementById('besthome-ai-chat')) return;
    document.body.insertAdjacentHTML('beforeend', `<section id="besthome-ai-chat" class="bh-ai-chat" aria-live="polite"><button class="bh-ai-chat__fab" type="button" aria-label="BestHome AI chat"><i class="fa-solid fa-wand-magic-sparkles"></i><span>AI</span></button><div class="bh-ai-chat__panel" role="dialog" aria-label="BestHome AI köməkçi"><header><div><b>BestHome AI</b><span>Əmlak köməkçisi</span></div><button type="button" class="bh-ai-chat__close" aria-label="Minimize">×</button></header><div class="bh-ai-chat__messages"><div class="bh-ai-chat__bubble bh-ai-chat__bubble--assistant">Salam! Mən BestHome AI köməkçisiyəm. Sea Breeze, layihələr və elanlar üzrə sizə kömək edə bilərəm.</div><div class="bh-ai-chat__chips">${chips.map(chip => `<button type="button">${esc(chip)}</button>`).join('')}</div></div><div class="bh-ai-chat__typing"><span></span><span></span><span></span></div><form class="bh-ai-chat__form"><input class="bh-ai-chat__input" maxlength="1200" placeholder="Sualınızı yazın..." autocomplete="off"><button type="submit" aria-label="Göndər"><i class="fa-solid fa-paper-plane"></i></button></form></div></section>`);
    document.querySelector('.bh-ai-chat__fab').addEventListener('click', () => document.getElementById('besthome-ai-chat').classList.toggle('is-open'));
    document.querySelector('.bh-ai-chat__close').addEventListener('click', () => document.getElementById('besthome-ai-chat').classList.remove('is-open'));
    document.querySelector('.bh-ai-chat__form').addEventListener('submit', ev => { ev.preventDefault(); send(); });
    document.querySelectorAll('.bh-ai-chat__chips button').forEach(btn => btn.addEventListener('click', () => send(btn.textContent)));
  }
  window.BestHomeAIChat = { init: render, send };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render); else render();
}());
