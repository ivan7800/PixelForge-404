(() => {
  let shown = false;
  const showFailure = (detail = '') => {
    if (shown || document.documentElement.dataset.appReady === 'true') return;
    shown = true;
    const reveal = () => {
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = `PixelForge no pudo iniciar${detail ? ' · ' + detail : ''}`;
        toast.classList.add('show', 'boot-failure');
      }
      document.documentElement.dataset.appReady = 'false';
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', reveal, { once: true });
    else reveal();
  };
  window.addEventListener('error', event => {
    // Resource errors (manifest/icon/image) must not mark the editor as broken.
    if (!(event instanceof ErrorEvent) || (!event.error && !event.message)) return;
    const msg = event?.error?.message || event?.message || 'error JavaScript';
    showFailure(String(msg).slice(0, 160));
  });
  window.addEventListener('unhandledrejection', event => {
    const msg = event?.reason?.message || event?.reason || 'promesa rechazada';
    showFailure(String(msg).slice(0, 160));
  });
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      if (document.documentElement.dataset.appReady !== 'true') showFailure('arranque incompleto');
    }, 5000);
  }, { once: true });
})();
