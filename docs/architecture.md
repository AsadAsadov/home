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
- Ownership: public Gallery runtime behavior now lives behind `window.BestHomeGallery`. This includes public gallery filter state, render state, pagination state, card/grid rendering, public gallery loading, skeleton/empty-state rendering, featured-video rendering, thumbnail fallback handling, and Gallery-only lazy loading observer lifecycle.
- Dependencies injected by `app.js` through `window.BestHomeGallery.configure(...)`:
  - `orderedGalleryItems` for reading the shared `appData.gallery` list without moving shared cache ownership.
  - `escapeHtml`, `renderCardSkeletons`, and `emptyDataState` for existing markup compatibility.
  - `apiRequest` and `extractResponseItems` for the existing `/api/gallery` read endpoint.
  - `isTabAktiv` and `renderAdminGallery` so public reloads can preserve the existing admin refresh behavior without moving admin CRUD.
  - `setGalleryLoading`, `setGalleryLoaded`, `isGalleryLoading`, and `setGalleryItems` for controlled writes back into `dataLoadState.gallery` and `appData.gallery`.
- Globals required: `window.BestHomeGallery` must load before `public/js/app.js`, and `app.js` must configure the namespace before Gallery route/render calls.
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
  - `window.BestHomeGallery.configure`
  - `window.BestHomeGallery.setPagination` / `getPagination`
  - `window.BestHomeGallery.setCurrentFilter` / `getCurrentFilter`
  - `window.BestHomeGallery.setFeaturedVideoIndex` / `getFeaturedVideoIndex`
  - `window.BestHomeGallery.galleryItems` / `featuredVideos`
  - `window.BestHomeGallery.renderGalleryHero`
  - `window.BestHomeGallery.observeGalleryMedia`
  - `window.BestHomeGallery.renderPortfolioPagination`
  - `window.BestHomeGallery.renderFeaturedVideoSection`
  - `window.BestHomeGallery.changeFeaturedVideo`
  - `window.BestHomeGallery.filterPortfolio`
  - `window.BestHomeGallery.loadGalleryPage` / `loadGallery`
  - `window.BestHomeGallery.renderPortfolio`
- Compatibility exports retained:
  - `window.handleGalleryThumbnailError`
  - `window.markMediaLoaded`
  - `window.filterPortfolio`
  - `window.loadGalleryPage` / `window.loadGallery`
  - `window.renderPortfolio`
  - `window.renderGalleryHero`
  - `window.changeFeaturedVideo`
  - `app.js` also keeps same-named top-level wrappers so legacy inline handlers and route code continue to resolve unchanged.
- Remaining in `app.js` and why:
  - Admin Gallery CRUD, drag/drop, form state, thumbnail form preview, and hero toggle stay in `app.js` because they touch admin dashboard state, admin rendering, upload form state, and protected mutations.
  - Gallery detail modal/lightbox state and media navigation stay in `app.js` because the modal shell and keyboard/lightbox lifecycle are shared with listing/project media behavior.
  - Gallery route bootstrap stays in `app.js` because SPA routing and SEO updates are shared application concerns.
  - Homepage background hydration stays in `app.js` because it coordinates multiple shared homepage data loaders and cache timing. It delegates pagination state back into `BestHomeGallery`.
- Remaining technical debt: split the shared media modal shell before moving Gallery detail modal state; isolate admin Gallery CRUD into an admin component; decide whether homepage hydration should become a core data-loader service; keep Sea Breeze Gallery and Project Gallery separate from public Gallery ownership.

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

## Core architecture (Phase 2.7)

`public/js/core/` now owns generic browser-global infrastructure. These files are loaded before components and before `public/js/app.js` in `index.html`, preserving the no-build script-tag architecture.

### Load order

1. `public/js/core/utils.js`
2. `public/js/core/dom.js`
3. `public/js/core/api.js`
4. `public/js/core/cache.js`
5. `public/js/core/state.js`
6. Extracted components/admin helpers
7. `public/js/app.js`
8. Late-loaded components that still depend on app bootstrap globals

### Core ownership

#### `public/js/core/api.js`

- Owns generic API transport only.
- Exports:
  - `window.apiRequest`
  - `window.resolveApiUrl`
  - `window.parseErrorBody`
  - namespace: `window.BestHomeAPI`
- Dependencies:
  - `window.API_BASE` or `window.location.origin`
  - optional auth callbacks exposed by `app.js`: `getAuthToken`, `refreshAuthLastActiveAt`, `redirectToLoginOnAuthFailure`
- Does not own feature-specific requests such as projects, gallery, ads, listings, hero, chat, or admin loaders.

#### `public/js/core/cache.js`

- Owns generic memory/localStorage cache helpers and pending request dedupe storage.
- Exports:
  - `window.readCache`
  - `window.cacheData`
  - `window.getCachedData`
  - `window.invalidateCache`
  - `window.CACHE_TTL_MS`
  - `window.memoryCache`
  - `window.pendingPromises`
  - namespace: `window.BestHomeCache`
- Dependencies:
  - `window.appData`, exposed by `app.js` after the shared state object is created
  - `window.CACHE_KEYS`, exposed by `app.js` after cache-key ownership is declared
- Does not own feature-specific cache invalidation flows. Sea Breeze public invalidation stays in `app.js` because it also triggers page reload/render behavior.

#### `public/js/core/state.js`

- Owns generic state access and state-change dispatch helpers.
- Exports:
  - `window.getAppState`
  - `window.setAppState`
  - `window.dispatchAppStateChange`
  - `window.subscribeAppState`
  - namespace: `window.BestHomeState`
- Dependencies:
  - `window.appData` from `app.js`
- Does not own feature-specific state for Projects, Gallery, Chat, Ads, Listing Modal, Hero, or Sea Breeze.

#### `public/js/core/utils.js`

- Owns reusable formatters and pure utility helpers.
- Exports:
  - `window.escapeHtml`
  - `window.formatPrice`
  - `window.formatAzDate`
  - `window.formatAzDateTime`
  - `window.formatCurrency`
  - `window.debounce`
  - `window.throttle`
  - `window.deepClone`
  - `window.groupBy`
  - namespace: `window.BestHomeUtils`
- Dependencies: none beyond standard browser APIs.
- Feature-specific formatters, normalizers, matching/scoring functions, and UI rendering helpers remain with their owning feature.

#### `public/js/core/dom.js`

- Owns generic DOM helpers.
- Exports:
  - `window.qs`
  - `window.qsa`
  - `window.createElement`
  - `window.toggleClass`
  - `window.show`
  - `window.hide`
  - `window.enable`
  - `window.disable`
  - `window.scrollToElement`
  - `window.safeFocus`
  - `window.replaceChildren`
  - namespace: `window.BestHomeDOM`
- Dependencies: `document` and standard browser DOM APIs.
- Does not own rendering for cards, modals, admin tables, ads, chat, projects, gallery, or listings.

### Shared globals after Phase 2.7

- Core globals: `BestHomeAPI`, `BestHomeCache`, `BestHomeState`, `BestHomeUtils`, `BestHomeDOM`.
- Compatibility globals retained: `apiRequest`, `readCache`, `cacheData`, `getCachedData`, `invalidateCache`, `formatPrice`, `formatAzDate`, `formatAzDateTime`, `formatCurrency`, `escapeHtml`.
- App integration globals exposed by `app.js`: `appData`, `CACHE_KEYS`, `API_BASE`, `SITE_NAME`, routing functions, auth functions, component initialization functions, and existing inline-handler APIs.

### Dependency graph

```text
index.html
  ├─ core/utils.js       (no app dependency)
  ├─ core/dom.js         (DOM only)
  ├─ core/api.js         ──► optional app auth callbacks at request time
  ├─ core/cache.js       ──► appData + CACHE_KEYS after app.js exposes them
  ├─ core/state.js       ──► appData after app.js exposes it
  ├─ components/*        ──► core globals + legacy app globals where needed
  ├─ admin/*             ──► core globals + legacy app globals where needed
  └─ app.js              ──► core globals, component globals, routing/bootstrap
```

### `app.js` ownership after Phase 2.7

`app.js` remains the integration layer for bootstrap, routing, authentication/session orchestration, SPA navigation, component initialization, shared `appData` declaration, `CACHE_KEYS` declaration, cross-component communication, and feature-specific flows that are still too coupled to safely extract.

Remaining non-core functions in `app.js` are intentionally left because they are feature-owned or risky to extract now:

- Auth/session lifecycle: token handling, heartbeat, login/logout, redirects.
- Routing/SEO/bootstrap: `routeToCurrentPath`, `switchTab`, history handling, initial hydration.
- Feature loaders/renderers: projects, listings, gallery, ads, hero, music, notifications, admin, Sea Breeze page/admin.
- Feature-specific cache wrappers: `cachedApiGet` because it normalizes Sea Breeze/listing payloads before writing shared cache.
- Feature-specific invalidation: `invalidateSeaBreezePublicCaches` because it also triggers Sea Breeze page reloads.
- DOM renderers and modal/lightbox flows because they depend on specific HTML ids/classes and shared modal state.

### Risk notes

- Extraction stayed conservative: only helpers with stable, generic ownership moved to Core.
- Feature-specific requests, component state, renderers, observers, Socket.IO, and route behavior were not moved.
- Window compatibility was preserved by exporting the same helper names globally.
- `app.js` still contains substantial feature code; this is expected until Gallery, Notifications, Admin, and HTML componentization are separately extracted.

## Phase 2.8 dependency cleanup

### Dependency analysis summary

The remaining `app.js` functions were grouped by ownership before moving code:

- Gallery-only helpers read gallery item fields and Gallery DOM (`portfolio-grid`, `featured-video-section`, gallery modal media nodes), write Gallery render state (`currentFilter`, `featuredVideoIndex`, `galleryLazyObserver`, `galleryPagination`, `galleryHeroToggleSubmittingId`) and use Core API/cache helpers through `apiRequest` and `cacheData`.
- Notification dropdown/panel state is currently owned by `components/chat.js`, because it shares `messagingState`, Socket.IO realtime updates, chat unread counts, header badge refresh, and message navigation. It was not moved to avoid duplicating Socket.IO, notification cache, or unread state.
- Generic admin loading helpers read/write button DOM state only and are owned by `admin/admin.js`; feature CRUD, admin routes, page state, API mutations, and feature renderers remain in `app.js` or feature admin files.
- Shared modal helpers remain in `app.js` because modal state is still cross-cutting (`Gallery`, `Projects`, `Listing`, fullscreen map, Sea Breeze media) and is tied to global backdrop/body scroll compatibility.
- Shared media helpers were moved only where ownership was already clear: Gallery video thumbnail/placeholder/error helpers live in `components/gallery.js`; listing/project/hero media logic remains feature-specific.

### Dependency graph

```text
app.js
  ├─ core/api.js               (apiRequest for feature loaders and mutations)
  ├─ core/cache.js             (cacheData/readCache/getCachedData/invalidateCache)
  ├─ core/state.js             (appData compatibility)
  ├─ components/gallery.js     (Gallery normalization + media thumbnail helpers)
  ├─ components/chat.js        (messagingState, notifications, Socket.IO, badges)
  ├─ components/notifications.js (small badge formatting helpers only)
  ├─ admin/admin.js            (generic admin button/form helpers)
  └─ feature components        (projects, listing modal, ads, hero)
```

### Ownership graph

```text
Gallery
  ├─ Owns: gallery media normalization, gallery thumbnail fallback, gallery media placeholder, lazy media marker
  ├─ Still in app.js: Gallery API loading, pagination rendering, admin gallery CRUD, drag ordering, gallery modal/lightbox
  └─ Reason left: remaining functions touch routing, admin dashboard rendering, shared modal state, or API mutations

Notifications
  ├─ Owns in chat.js: dropdown/panel rendering, unread state, realtime updates, read/read-all operations
  ├─ Owns in notifications.js: badge formatting only
  └─ Reason left: notification state is shared with chat and Socket.IO bootstrap

Admin
  ├─ Owns in admin/admin.js: generic submit-button loading, hidden toggles, clear form fields
  ├─ Still in app.js: feature CRUD, admin subtab routes, dashboard rendering, feature-specific validation
  └─ Reason left: feature admin logic mutates feature APIs and page state

Shared modal/media
  ├─ Modal remains in app.js pending clearer ownership boundaries
  └─ Media remains feature-owned except Gallery thumbnail helpers
```

### Component communication

- `app.js` calls component namespaces through `window.BestHomeGallery`, `window.BestHomeAdmin`, and existing compatibility globals.
- Inline HTML handlers are preserved; extracted helpers are re-bound in `app.js` with the same local names where existing code expects them.
- Notification badge/header communication remains via `messagingState` and chat component functions to avoid duplicate unread state.

### Core usage

- API access remains centralized through `apiRequest`.
- Cache writes remain centralized through `cacheData`/Core cache compatibility helpers.
- No new fetch wrappers, intervals, observers, or Socket.IO connections were introduced.

### Shared modal layer

No new shared modal file was created in Phase 2.8. Current reusable modal behavior is not isolated enough: Gallery, Listing, Projects, fullscreen maps, and Sea Breeze media still share global backdrop/body state and inline handler compatibility. Extracting now would risk route and modal regressions.

### Shared media layer

No broad shared media layer was created. Only Gallery-owned media helpers are in `components/gallery.js`. Project image inputs, listing uploads/compression, hero media preview, and Sea Breeze media remain with their feature flows because they use different form state, validation, and API payloads.

### Remaining `app.js` responsibilities

`app.js` remains responsible for bootstrap, initialization, SPA routing, auth/session lifecycle, component initialization, cross-component calls, dependency injection through `window.*` compatibility, global modal lifecycle, and feature-specific code not yet safe to extract.

### Refactor progress

Phase 2.8 reduced duplication by delegating Gallery thumbnail/media fallback helpers to `components/gallery.js` and generic admin submit-button loading to `admin/admin.js`. Notification extraction was intentionally deferred because the implementation is coupled to Chat realtime state.
