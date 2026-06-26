        function normalizeHeroSlide(slide = {}) {
            const duration = Number(slide.slide_duration ?? slide.slideDuration ?? defaultSeaBreezeHero.slide_duration);
            const slideType = String(slide.slide_type ?? slide.slideType ?? 'custom').toLowerCase() === 'project' ? 'project' : 'custom';
            const project = slide.project ? dbProjectToUi(slide.project) : getOfficialProjects().find(item => String(item.id) === String(slide.project_id ?? slide.projectId ?? ''));
            const projectMedia = project?.img || project?.images?.[0] || '';
            const projectLinkValue = project ? projectPath(project) : '';
            const mediaUrl = slideType === 'project' ? (projectMedia || slide.media_url || slide.mediaUrl) : (slide.media_url ?? slide.mediaUrl ?? slide.hero_image_url ?? slide.heroImageUrl);
            const mediaType = String(slide.media_type ?? slide.mediaType ?? (/\.(mp4|webm|mov)(\?|#|$)/i.test(mediaUrl || '') ? 'video' : defaultSeaBreezeHero.media_type)).toLowerCase() === 'video' ? 'video' : 'image';
            return {
                id: slide.id,
                title: slideType === 'project' && project?.title ? project.title : (slide.title ?? defaultSeaBreezeHero.title),
                description: slideType === 'project' ? '' : (slide.description ?? defaultSeaBreezeHero.description),
                slide_type: slideType,
                project_id: slide.project_id ?? slide.projectId ?? '',
                project,
                media_type: mediaType,
                media_url: mediaUrl || DEFAULT_SEA_BREEZE_HERO_IMAGE,
                button_text: slide.button_text ?? slide.buttonText ?? (slideType === 'project' ? 'Layihəyə Bax →' : defaultSeaBreezeHero.button_text),
                button_link: slideType === 'project' ? (projectLinkValue || slide.button_link || slide.buttonLink) : (slide.button_link ?? slide.buttonLink ?? defaultSeaBreezeHero.button_link),
                badge_text: slide.badge_text ?? slide.badgeText ?? '',
                badge_color: slide.badge_color ?? slide.badgeColor ?? defaultSeaBreezeHero.badge_color,
                badge_background: slide.badge_background ?? slide.badgeBackground ?? defaultSeaBreezeHero.badge_background,
                title_color: slide.title_color ?? slide.titleColor ?? defaultSeaBreezeHero.title_color,
                title_font_size: Number(slide.title_font_size ?? slide.titleFontSize ?? defaultSeaBreezeHero.title_font_size),
                description_color: slide.description_color ?? slide.descriptionColor ?? defaultSeaBreezeHero.description_color,
                description_font_size: Number(slide.description_font_size ?? slide.descriptionFontSize ?? defaultSeaBreezeHero.description_font_size),
                button_color: slide.button_color ?? slide.buttonColor ?? defaultSeaBreezeHero.button_color,
                button_text_color: slide.button_text_color ?? slide.buttonTextColor ?? defaultSeaBreezeHero.button_text_color,
                panel_background: slide.panel_background ?? slide.panelBackground ?? defaultSeaBreezeHero.panel_background,
                panel_blur: 0,
                panel_opacity: 0,
                panel_position: 'bottom-left',
                hero_height_desktop: 520,
                hero_height_tablet: 420,
                hero_height_mobile: 280,
                display_order: Number(slide.display_order ?? slide.displayOrder ?? 0),
                slide_duration: Number.isFinite(duration) && duration > 0 ? duration : 10,
                is_active: slide.is_active ?? slide.isActive ?? true
            };
        }

        function applyHeroVisualStyles(container, panel, title, description, button, badge, hero) {
            const isProject = hero.slide_type === 'project';
            const isListingHero = hero.slide_type === 'custom';
            if (container) {
                container.style.setProperty('--hero-height-desktop', isListingHero ? '500px' : '520px');
                container.style.setProperty('--hero-height-tablet', isListingHero ? '430px' : '420px');
                container.style.setProperty('--hero-height-mobile', 'clamp(300px, 62vw, 380px)');
                container.style.alignItems = 'flex-end';
                container.style.justifyContent = 'flex-start';
                container.style.textAlign = 'left';
            }
            if (panel) {
                panel.style.background = 'transparent';
                panel.style.backdropFilter = 'none';
                panel.style.webkitBackdropFilter = 'none';
                panel.style.boxShadow = 'none';
                panel.style.borderColor = 'transparent';
                if (isListingHero) {
                    panel.style.maxWidth = window.innerWidth <= 768 ? 'none' : 'min(58%, 760px)';
                    panel.style.width = window.innerWidth <= 768 ? 'calc(100% - 48px)' : 'min(58%, 760px)';
                    panel.style.padding = '0';
                    if (window.innerWidth <= 768) {
                        panel.style.position = 'absolute';
                        panel.style.left = '24px';
                        panel.style.right = '24px';
                        panel.style.bottom = '54px';
                        panel.style.margin = '0';
                    } else {
                        panel.style.position = '';
                        panel.style.left = '';
                        panel.style.right = '';
                        panel.style.bottom = '';
                        panel.style.margin = '0 0 0 clamp(2.5rem, 6vw, 6rem)';
                    }
                } else {
                    if (window.innerWidth <= 640) {
                        panel.style.position = 'absolute';
                        panel.style.left = '24px';
                        panel.style.right = '24px';
                        panel.style.bottom = '54px';
                        panel.style.maxWidth = 'none';
                        panel.style.width = 'auto';
                        panel.style.padding = '0';
                        panel.style.margin = '0';
                    } else {
                        panel.style.position = '';
                        panel.style.left = '';
                        panel.style.right = '';
                        panel.style.bottom = '';
                        panel.style.maxWidth = '420px';
                        panel.style.width = 'auto';
                        panel.style.padding = '22px 24px';
                        panel.style.margin = '0 0 32px 32px';
                    }
                }
                panel.style.textAlign = 'left';
            }
            if (title) {
                title.style.color = '#FFFFFF';
                title.style.fontSize = '';
                title.style.fontWeight = isListingHero ? '800' : '600';
                title.style.textShadow = isListingHero ? '0 2px 14px rgba(0, 0, 0, 0.42)' : '0 3px 22px rgba(0, 0, 0, 0.62)';
                title.style.letterSpacing = isListingHero ? '-0.03em' : '0.08em';
                title.style.textTransform = isListingHero ? 'none' : 'uppercase';
            }
            if (description) {
                description.textContent = isProject ? '' : (hero.description || '');
                description.style.color = '#F8FAFC';
                description.classList.toggle('hidden', isProject || !hero.description);
            }
            if (button) {
                button.style.background = 'transparent';
                button.style.color = '#FFFFFF';
                button.style.textShadow = isListingHero ? '0 2px 10px rgba(0, 0, 0, 0.34)' : '0 2px 16px rgba(0, 0, 0, 0.55)';
                button.classList.toggle('hidden', !hero.button_text);
            }
            if (badge) {
                badge.textContent = isProject ? '' : (hero.badge_text || '');
                badge.style.background = isListingHero ? 'rgba(255,255,255,.16)' : 'transparent';
                badge.style.color = '#FFFFFF';
                badge.classList.toggle('hidden', isProject || !hero.badge_text);
            }
        }

        function projectToHeroSlide(project, index = 0) {
            return normalizeHeroSlide({
                id: `project-${project.id}`,
                slide_type: 'project',
                project_id: project.id,
                project,
                title: project.title,
                media_type: 'image',
                media_url: project.img || project.images?.[0] || '',
                button_text: 'Layihəyə Bax →',
                button_link: projectPath(project),
                display_order: project.displayOrder ?? index + 1,
                slide_duration: 10,
                is_active: true,
                generatedFromProject: true
            });
        }

        function getFeaturedProjectHeroSlides() {
            return getOfficialProjects()
                .filter(project => project.featuredInHero && (project.img || project.images?.[0]))
                .map(projectToHeroSlide);
        }

        function getRenderableHeroSlides() {
            const activeSlides = normalizeHeroSlides(appData.heroSlides, false).filter(slide => slide.is_active);
            return activeSlides.length ? activeSlides : getFeaturedProjectHeroSlides();
        }

        function normalizeHeroSlides(slides = [], useFallback = true) {
            const list = Array.isArray(slides) ? slides : [slides];
            const normalized = list.filter(Boolean).map(normalizeHeroSlide).sort((a, b) => (a.display_order - b.display_order) || String(a.id || '').localeCompare(String(b.id || '')));
            return normalized.length || !useFallback ? normalized : [defaultSeaBreezeHero];
        }

        function normalizeHeroSection(hero = {}) {
            return normalizeHeroSlide(hero);
        }

        function formatHeroTitle(title = '') {
            const lines = String(title || defaultSeaBreezeHero.title).split(/\r?\n/).map(line => line.trim()).filter(Boolean);
            if (lines.length <= 1) return escapeHtml(lines[0] || defaultSeaBreezeHero.title);
            const firstLines = lines.slice(0, -1).map(escapeHtml).join('<br>');
            const lastLine = escapeHtml(lines[lines.length - 1]);
            return `${firstLines}<br><span class="font-black">${lastLine}</span>`;
        }

        const loadedHeroImages = new Set();
        const loadedAdImages = new Set();

        function preloadCachedImage(url, cache = loadedHeroImages) {
            const normalizedUrl = String(url || '').trim();
            if (!normalizedUrl || cache.has(normalizedUrl)) return;
            const img = new Image();
            img.src = normalizedUrl;
            cache.add(normalizedUrl);
        }

        function preloadHeroImage(url) {
            if (!loadedHeroImages.has(url)) {
                const img = new Image();
                img.src = url;
                loadedHeroImages.add(url);
            }
        }

        function preloadNextHeroImage(slides = [], activeIndex = 0) {
            if (slides.length <= 1) return;
            const nextSlide = slides[(activeIndex + 1) % slides.length];
            if (!nextSlide || nextSlide.media_type === 'video') return;
            preloadHeroImage(getHeroMediaUrl(nextSlide));
        }

        function getHeroMediaUrl(hero = appData.heroSection) {
            const url = String(hero?.media_url || hero?.mediaUrl || hero?.hero_image_url || hero?.heroImageUrl || '').trim();
            return url || DEFAULT_SEA_BREEZE_HERO_IMAGE;
        }

        function createHeroMediaElement(slide, options = {}) {
            const url = getHeroMediaUrl(slide);
            if (slide.media_type === 'video') {
                const video = document.createElement('video');
                video.className = 'hero-slide-media absolute inset-0 w-full h-full object-cover';
                video.src = url;
                video.autoplay = true;
                video.muted = true;
                video.loop = true;
                video.playsInline = true;
                video.preload = options.eager ? 'auto' : 'metadata';
                video.setAttribute('playsinline', '');
                video.style.objectPosition = 'center center';
                video.setAttribute('aria-hidden', 'true');
                return video;
            }
            const image = document.createElement('img');
            image.className = 'hero-slide-media absolute inset-0 w-full h-full object-cover';
            image.alt = '';
            image.loading = options.eager ? 'eager' : 'lazy';
            image.decoding = 'async';
            image.width = 1280;
            image.height = 520;
            if (options.eager) image.fetchPriority = 'high';
            image.style.objectPosition = 'center center';
            image.src = url;
            loadedHeroImages.add(url);
            image.setAttribute('aria-hidden', 'true');
            return image;
        }

        function renderSeaBreezeHero(activeIndex = heroSliderIndex) {
            const heroSlides = getRenderableHeroSlides();
            const slides = heroSlides;
            const slider = document.getElementById('sea-breeze-hero-slider');
            if (!isHeroSlidesLoaded || !slides.length) {
                clearTimeout(heroSliderTimer);
                if (slider) {
                    slider.classList.add('hidden');
                    slider.style.display = 'none';
                    slider.onclick = null;
                    slider.style.cursor = 'default';
                }
                appData.heroSection = null;
                return;
            }
            if (slider) {
                slider.classList.remove('hidden');
                slider.style.display = '';
            }
            heroSliderIndex = ((activeIndex % slides.length) + slides.length) % slides.length;
            const hero = slides[heroSliderIndex];
            appData.heroSection = hero;
            const panel = document.getElementById('sea-breeze-hero-panel');
            const mediaWrap = document.getElementById('sea-breeze-hero-media');
            const title = document.getElementById('sea-breeze-hero-title');
            const description = document.getElementById('sea-breeze-hero-description');
            const button = document.getElementById('sea-breeze-hero-button');
            const badge = document.getElementById('sea-breeze-hero-badge');
            if (mediaWrap) {
                mediaWrap.innerHTML = '';
                const el = createHeroMediaElement(hero, { eager: true });
                el.classList.add('is-active');
                mediaWrap.appendChild(el);
                if (hero.media_type === 'video') el.play?.().catch(() => {});
                preloadNextHeroImage(slides, heroSliderIndex);
            }
            if (title) {
                const heroTitleText = String(hero.title || defaultSeaBreezeHero.title).replace(/\s+/g, ' ').trim();
                if (window.innerWidth <= 640) title.textContent = heroTitleText;
                else title.innerHTML = formatHeroTitle(hero.title || '');
            }
            if (description) description.textContent = hero.description || '';
            applyHeroVisualStyles(slider, panel, title, description, button, badge, hero);
            if (slider) {
                slider.style.cursor = hero.button_link ? 'pointer' : 'default';
                slider.onclick = (event) => {
                    if (!hero.button_link || event.target.closest('a,button')) return;
                    navigateHeroLink(hero.button_link);
                };
            }
            if (button) {
                button.textContent = hero.slide_type === 'project' ? 'Layihəyə Bax →' : (hero.buttonText || hero.button_text || defaultSeaBreezeHero.button_text);
                button.href = hero.button_link || '#sea-breeze-projects-list';
                button.onclick = (event) => {
                    const href = button.getAttribute('href') || '';
                    if (navigateHeroLink(href)) event.preventDefault();
                };
            }
            startHeroSliderTimer(slides);
        }

        function startHeroSliderTimer(slides = getRenderableHeroSlides()) {
            clearTimeout(heroSliderTimer);
            if (!slides.length) return;
            if (slides.length <= 1) return;
            const duration = Math.max(1, Number(slides[heroSliderIndex]?.slide_duration || 10)) * 1000;
            heroSliderTimer = setTimeout(() => renderSeaBreezeHero(heroSliderIndex + 1), duration);
        }



        function getActiveListingHeroItems() {
            return normalizeListingHeroItems(appData.listingHeroItems || []).filter(item => item.is_active && item.media_url && item.listing_id).slice(0, 10);
        }

        function listingHeroListing(item) {
            return item.listing || (appData.listings || []).find(listing => String(listing.id) === String(item.listing_id)) || {};
        }

        function renderHeroIndicators(containerId, slides, activeIndex, handlerName) {
            const wrap = document.getElementById(containerId);
            if (!wrap) return;
            wrap.innerHTML = slides.length > 1 ? slides.map((_, index) => `<button type="button" onclick="${handlerName}(${index})" class="hero-indicator ${index === activeIndex ? 'is-active' : ''}" aria-label="Slayd ${index + 1}"></button>`).join('') : '';
        }

        function isListingHeroRoute() {
            return (window.location.pathname.replace(/\/+$/, '') || '/') === '/elanlar';
        }

        function hideListingHero() {
            clearTimeout(listingHeroTimer);
            const slider = document.getElementById('listing-hero-slider');
            if (!slider) return;
            slider.classList.add('hidden');
            slider.style.display = 'none';
            slider.onclick = null;
        }

        function renderListingHero(activeIndex = listingHeroIndex) {
            const slider = document.getElementById('listing-hero-slider');
            if (!isListingHeroRoute()) {
                hideListingHero();
                return;
            }
            const slides = getActiveListingHeroItems();
            if (!slides.length) {
                hideListingHero();
                return;
            }
            listingHeroIndex = ((activeIndex % slides.length) + slides.length) % slides.length;
            const hero = slides[listingHeroIndex];
            const listing = listingHeroListing(hero);
            if (slider) {
                slider.classList.remove('hidden');
                slider.style.display = '';
                slider.style.cursor = 'pointer';
                slider.onclick = (event) => { if (!event.target.closest('button,a')) openListingModal(hero.listing_id); };
            }
            const mediaWrap = document.getElementById('listing-hero-media');
            if (mediaWrap) {
                mediaWrap.querySelectorAll('.hero-slide-media').forEach(el => {
                    el.classList.remove('is-active', 'is-entering', 'is-leaving');
                    if (el.tagName === 'VIDEO') el.pause?.();
                });
                const el = createHeroMediaElement(hero, { eager: true });
                el.classList.add('is-active');
                mediaWrap.replaceChildren(el);
                if (hero.media_type === 'video') el.play?.().catch(() => {});
                preloadNextHeroImage(slides, listingHeroIndex);
            }
            const title = document.getElementById('listing-hero-title');
            const badge = document.getElementById('listing-hero-badge');
            const price = document.getElementById('listing-hero-price');
            const stats = document.getElementById('listing-hero-stats');
            const panel = document.getElementById('listing-hero-panel');
            const btn = document.getElementById('listing-hero-button');
            if (title) title.textContent = String(hero.title || listing.title || 'Premium elan').replace(/\s+/g, ' ').trim();
            if (badge) { badge.textContent = hero.badge_text || ''; badge.classList.toggle('hidden', !hero.badge_text); }
            if (price) price.textContent = formatPrice(listing.price, listing.currency || 'AZN');
            if (stats) {
                const factParts = [
                    hero.region || listing.district || listing.city ? `📍 ${escapeHtml(hero.region || listing.district || listing.city)}` : '',
                    listing.rooms ? `🛏 ${escapeHtml(listing.rooms)} otaq` : '',
                    listing.area ? `📐 ${escapeHtml(listing.area)} m²` : ''
                ].filter(Boolean);
                const viewsText = `👁 ${Number(listing.viewCount || 0).toLocaleString('az-AZ')} baxış`;
                stats.innerHTML = [
                    factParts.length ? `<span class="listing-hero-stats__facts">${factParts.join(' • ')}</span>` : '',
                    `<span class="listing-hero-stats__views">${viewsText}</span>`
                ].filter(Boolean).join('');
            }
            applyHeroVisualStyles(slider, panel, title, null, btn, null, { ...hero, slide_type: 'custom', button_text: 'Elana Bax →' });
            if (panel) {
                panel.style.maxWidth = window.innerWidth <= 768 ? 'none' : 'min(58%, 760px)';
                panel.style.width = window.innerWidth <= 768 ? 'calc(100% - 48px)' : 'min(58%, 760px)';
                panel.style.padding = '0';
                if (window.innerWidth <= 768) {
                    panel.style.position = 'absolute';
                    panel.style.left = '24px';
                    panel.style.right = '24px';
                    panel.style.bottom = '54px';
                    panel.style.margin = '0';
                } else {
                    panel.style.position = '';
                    panel.style.left = '';
                    panel.style.right = '';
                    panel.style.bottom = '';
                    panel.style.margin = '0 0 0 clamp(2.5rem, 6vw, 6rem)';
                }
            }
            if (btn) btn.onclick = (event) => { event.stopPropagation(); openListingModal(hero.listing_id); };
            const prev = document.getElementById('listing-hero-prev');
            const next = document.getElementById('listing-hero-next');
            [prev, next].forEach(button => button?.classList.toggle('hidden', slides.length <= 1));
            if (prev) prev.onclick = (event) => { event.stopPropagation(); moveListingHero(-1); };
            if (next) next.onclick = (event) => { event.stopPropagation(); moveListingHero(1); };
            renderHeroIndicators('listing-hero-indicators', slides, listingHeroIndex, 'goToListingHero');
            setupListingHeroInteractions();
            startListingHeroTimer(slides);
        }

        function startListingHeroTimer(slides = getActiveListingHeroItems()) {
            clearTimeout(listingHeroTimer);
            if (!isListingHeroRoute() || listingHeroPaused || slides.length <= 1) return;
            const duration = Math.max(1, Number(slides[listingHeroIndex]?.slide_duration || 10)) * 1000;
            listingHeroTimer = setTimeout(() => renderListingHero(listingHeroIndex + 1), duration);
        }

        function goToListingHero(index) { listingHeroPaused = false; renderListingHero(index); }
        function moveListingHero(delta) { listingHeroPaused = false; renderListingHero(listingHeroIndex + delta); }

        function setupListingHeroInteractions() {
            const slider = document.getElementById('listing-hero-slider');
            if (!slider || slider.dataset.heroReady) return;
            slider.dataset.heroReady = '1';
            slider.addEventListener('mouseenter', () => { listingHeroPaused = true; clearTimeout(listingHeroTimer); });
            slider.addEventListener('mouseleave', () => { listingHeroPaused = false; startListingHeroTimer(); });
            slider.addEventListener('touchstart', (event) => { listingHeroPaused = true; clearTimeout(listingHeroTimer); listingHeroTouchStartX = event.changedTouches?.[0]?.clientX || 0; }, { passive: true });
            slider.addEventListener('touchend', (event) => {
                const delta = (event.changedTouches?.[0]?.clientX || 0) - listingHeroTouchStartX;
                listingHeroPaused = false;
                if (Math.abs(delta) > 45) moveListingHero(delta > 0 ? -1 : 1); else startListingHeroTimer();
            }, { passive: true });
        }

