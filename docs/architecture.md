# BestHome.az Frontend Architecture

This document is the reference for the current no-build, browser-global frontend architecture. The application uses plain script tags, shared globals, and `public/js/app.js` as the integration layer.

## Folder structure

- `index.html` — server-rendered shell, inline legacy markup, and remaining legacy style blocks.
- `public/js/app.js` — application bootstrap, routing glue, shared state, shared API wrappers, and non-extracted legacy/admin flows.
- `public/js/components/` — public UI component scripts loaded before `app.js`.
- `public/js/admin/` — reusable admin-side helper scripts.
- `public/css/components/` — extracted component stylesheets.
- `docs/architecture.md` — this architecture reference.

## Extracted components

### Ads

- JS: `public/js/components/ads.js`
- CSS: `public/css/components/ads.css`
- Depends on: app-provided ad data, DOM containers, existing global rendering hooks.
- Globals required: shared app state exposed by `app.js`.
- Window exports: existing ad functions exposed by the ads component for inline handlers.

### Listing Modal

- JS: `public/js/components/listing-modal.js`
- CSS: `public/css/components/listings.css`, `public/css/components/modals.css`
- Depends on: listing data, favorites state, modal helpers, map helpers, formatting helpers.
- Globals required: shared listing/app state from `app.js`.
- Window exports: existing listing modal/lightbox functions required by inline handlers.

### Chat

- JS: `public/js/components/chat.js`
- CSS: `public/css/components/chat.css`
- Depends on: authenticated user state, Socket.IO connection, messaging state, API wrapper.
- Globals required: chat/messaging globals initialized by `app.js`.
- Window exports: chat panel, conversation, and message handlers used by inline handlers.
- Notes: chat notification logic remains here and was not moved to the public notifications component.

### Hero

- JS: `public/js/components/hero.js`
- CSS: remaining hero-related CSS is still in legacy styles because some selectors are shared with Sea Breeze and listing hero layouts.
- Depends on: project/listing hero data, timers, DOM containers, escape/format helpers.
- Globals required: hero state and app data from `app.js`.
- Window exports: hero navigation and admin preview handlers where required.

### Projects

- JS: `public/js/components/projects.js`
- CSS: `public/css/components/projects.css`
- Depends on: projects cache, modal helpers, media helpers, API wrapper.
- Globals required: shared project data from `app.js`.
- Window exports: project modal/lightbox/admin handlers used by inline handlers.

### Gallery

- JS: `public/js/components/gallery.js`
- CSS: `public/css/components/gallery.css`
- Depends on: none for extracted pure helpers; `app.js` still passes data through existing calls.
- Globals required: `window.BestHomeGallery` must load before `public/js/app.js`.
- Window exports exposed by component:
  - `window.BestHomeGallery.normalizeJsonArray`
  - `window.BestHomeGallery.normalizeGalleryItem`
  - `window.BestHomeGallery.dbGalleryToUi`
  - `window.BestHomeGallery.getYouTubeVideoId`
  - `window.BestHomeGallery.getYouTubeThumbnail`
  - `window.BestHomeGallery.getYouTubeThumbnailFallback`
  - `window.BestHomeGallery.getVimeoThumbnail`
  - `window.BestHomeGallery.getGalleryVideoThumbnail`
  - `window.BestHomeGallery.getGalleryVideoThumbnailFallback`
  - `window.BestHomeGallery.galleryVideoPlaceholderMarkup`
  - `window.BestHomeGallery.normalizeGalleryVideoUrl`
  - `window.BestHomeGallery.handleGalleryThumbnailError`
  - `window.BestHomeGallery.markMediaLoaded`
- Compatibility exports retained by `app.js`:
  - `window.handleGalleryThumbnailError`
  - `window.markMediaLoaded`
  - existing gallery form/modal functions remain globally callable through legacy declarations.
- Remaining in `app.js`: gallery CRUD, gallery pagination state, lazy observer lifecycle, modal navigation state, route handling, shared cache writes, and admin gallery management. These remain because they depend on shared app state, routing, API wrappers, admin dashboard rendering, or modal state.

### Notifications

- JS: `public/js/components/notifications.js`
- CSS: notification styles are still mixed with chat/mobile header CSS and remain in their current files to avoid cascade changes.
- Depends on: DOM badge nodes only.
- Globals required: `window.BestHomeNotifications` must load before `public/js/app.js` if future app code delegates badge rendering.
- Window exports exposed by component:
  - `window.BestHomeNotifications.formatUnreadCount`
  - `window.BestHomeNotifications.badgeSlotHtml`
  - `window.BestHomeNotifications.updateBadge`
- Remaining in `app.js`: public header/dropdown integration and admin broadcast notification management. Chat-specific notification behavior remains in `chat.js`.

### Admin public helpers

- JS: `public/js/admin/admin.js`
- CSS: no CSS extracted.
- Depends on: DOM only.
- Globals required: `window.BestHomeAdmin` must load before `public/js/app.js` for future delegation.
- Window exports exposed by component:
  - `window.BestHomeAdmin.setSubmitButtonLoading`
  - `window.BestHomeAdmin.setElementHidden`
  - `window.BestHomeAdmin.clearFormFields`
- Remaining in `app.js`: admin gallery CRUD, project CRUD, users, settings, messages, notifications, APIs, and data-specific admin rendering.

## Remaining mixed CSS/code

- Sea Breeze `.sb-gallery` CSS stays in `index.html` because it is part of the Sea Breeze page rather than the main gallery component.
- `.media-card__thumb, .gallery-media, .admin-media-card img, .admin-media-card video` remains mixed because it combines gallery and admin media selectors.
- `#media-modal`, `.media-detail-panel`, `.detail-close-btn`, `.media-skeleton`, and `@keyframes mediaShimmer` remain in legacy CSS because they are shared by gallery, listing/project modals, and generic media shells.
- Notification panel responsive rules remain in `chat.css` because they are currently coupled with the messages shell media query.

## Stability rules

- No ES modules, bundlers, frameworks, route changes, Socket.IO changes, backend changes, endpoint changes, CSS selector renames, HTML id renames, or data attribute renames.
- Inline handlers must continue to resolve the same global names.
- Shared fetch/API wrappers, caches, observers, timers, and Socket.IO listeners remain single-owner in `app.js` or their previously extracted component.
