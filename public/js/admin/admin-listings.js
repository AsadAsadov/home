(function (window) {
  'use strict';

  function deps() { return window.BestHomeAdminRuntime || {}; }

  async function updateListingStatus(id, button, action, actionKey, successMessage, errorPrefix) {
    const d = deps();
    const restore = d.beginAdminAction?.(button, `listing-${actionKey}:${id}`, 'Yenilənir...');
    if (!restore) return;
    try {
      const saved = await d.apiRequest(`/api/listings/${id}/${action}`, { method: 'PATCH' });
      const list = [...(d.appData?.listings || [])];
      const idx = list.findIndex((x) => String(x.id) === String(id));
      if (idx > -1) list[idx] = d.dbListingToUi(saved);
      d.cacheData('listings', list);
      d.appData.dashboardStats = null;
      if (d.isAdminRole?.(d.activeUser?.role)) await d.loadAdminListings({ render: false }).catch(() => {});
      d.renderAdminDashboard?.();
      d.renderSeaBreeze?.();
      d.showToast?.(successMessage);
    } catch (error) {
      alert(`${errorPrefix}: ${error.message}`);
    } finally {
      d.finishAdminAction?.(restore);
    }
  }

  function approveListing(id, button = null) {
    return updateListingStatus(id, button, 'approve', 'approveListing', '✅ Elan təsdiqləndi.', 'Approve alınmadı');
  }

  function rejectListing(id, button = null) {
    return updateListingStatus(id, button, 'reject', 'rejectListing', '✅ Elan rədd edildi.', 'Reject alınmadı');
  }

  function deactivateListing(id, button = null) {
    return updateListingStatus(id, button, 'deactivate', 'deactivateListing', '✅ Elan deaktiv edildi.', 'Deactivate alınmadı');
  }

  window.BestHomeAdminListings = { approveListing, rejectListing, deactivateListing };
  Object.assign(window, { approveListing, rejectListing, deactivateListing });
})(window);
