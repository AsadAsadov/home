(function (window) {
  'use strict';

  function setSubmitButtonLoading(buttonId, isLoading, loadingText, defaultText) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    btn.disabled = Boolean(isLoading);
    btn.classList.toggle('is-loading', Boolean(isLoading));
    btn.setAttribute('aria-busy', isLoading ? 'true' : 'false');
    btn.innerHTML = isLoading
      ? `<span class="button-spinner" aria-hidden="true"></span><span>${loadingText}</span>`
      : (btn.dataset.defaultText || defaultText);
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
