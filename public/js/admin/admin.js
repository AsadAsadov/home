(function (window) {
  'use strict';

  function setSubmitButtonLoading(buttonId, isLoading, loadingText, defaultText) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    btn.disabled = Boolean(isLoading);
    if (isLoading) {
      btn.dataset.defaultText = btn.dataset.defaultText || btn.innerHTML;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i>${loadingText}`;
    } else {
      btn.innerHTML = btn.dataset.defaultText || defaultText;
    }
  }

  function setElementHidden(id, hidden) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('hidden', Boolean(hidden));
    el.hidden = Boolean(hidden);
  }

  function clearFormFields(ids) {
    ids.forEach((id) => {
      const input = document.getElementById(id);
      if (input) input.value = '';
    });
  }

  window.BestHomeAdmin = { setSubmitButtonLoading, setElementHidden, clearFormFields };
})(window);
