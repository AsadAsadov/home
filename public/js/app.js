        function showToast(message) {
            const text = String(message || '');
            let toast = document.getElementById('besthome-toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'besthome-toast';
                toast.className = 'fixed left-1/2 top-24 z-[1200] -translate-x-1/2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-2xl transition';
                document.body.appendChild(toast);
            }
            toast.textContent = text;
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';
            clearTimeout(window.__besthomeToastTimer);
            window.__besthomeToastTimer = setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(-50%) translateY(-8px)';
            }, 1800);
        }
        window.showToast = window.showToast || showToast;

        var currentAdminAnalyticsTab = window.currentAdminAnalyticsTab || 'listings';
        window.currentAdminAnalyticsTab = currentAdminAnalyticsTab;
        function extractResponseItems(response, keys = []) {
            if (typeof window.extractResponseItems === 'function' && window.extractResponseItems !== extractResponseItems) return window.extractResponseItems(response, keys);
            if (Array.isArray(response)) return response;
            if (!response || typeof response !== 'object') return [];
            for (const key of keys) {
                const value = response?.[key];
                if (Array.isArray(value)) return value;
            }
            if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
                for (const key of keys) {
                    const value = response.data?.[key];
                    if (Array.isArray(value)) return value;
                }
                if (Array.isArray(response.data.items)) return response.data.items;
                if (Array.isArray(response.data.gallery)) return response.data.gallery;
            }
            if (Array.isArray(response?.data?.items)) return response.data.items;
            if (Array.isArray(response?.data?.gallery)) return response.data.gallery;
            if (Array.isArray(response?.data)) return response.data;
            return [];
        }
        window.extractResponseItems = window.extractResponseItems || extractResponseItems;

        const SEA_BREEZE_PAGE_KEY = 'sea-breeze';
        const DEFAULT_SEA_BREEZE_HERO_IMAGE = 'https://scontent.fgyd21-1.fna.fbcdn.net/v/t39.30808-6/557956945_1410435877753430_6514473924415472229_n.jpg';
        const defaultSeaBreezeHero = {
            id: 'default',
            title: 'Sea Breeze Premium',
            description: '',
            media_type: 'image',
            media_url: DEFAULT_SEA_BREEZE_HERO_IMAGE,
            button_text: 'Layihəyə Bax →',
            button_link: '#sea-breeze-projects-list',
            slide_type: 'custom',
            project_id: '',
            badge_text: 'PREMIUM',
            badge_color: '#C8A96A',
            badge_background: '#111827',
            title_color: '#FFFFFF',
            title_font_size: 48,
            description_color: '#F8FAFC',
            description_font_size: 18,
            button_color: '#FFFFFF',
            button_text_color: '#111827',
            panel_background: '#111827',
            panel_blur: 18,
            panel_opacity: 72,
            panel_position: 'bottom-center',
            hero_height_desktop: 520,
            hero_height_tablet: 420,
            hero_height_mobile: 280,
            display_order: 0,
            slide_duration: 10,
            is_active: true
        };
        let heroSliderTimer = null;
        let heroSliderIndex = 0;
        let listingHeroTimer = null;
        let listingHeroIndex = 0;
        let listingHeroPaused = false;
        let listingHeroTouchStartX = 0;
        let isHeroSlidesLoaded = false;
        let heroPreviewObjectUrl = '';




        const REGION_LABELS = { seabreeze: 'Sea Breeze', general: 'Digər ərazilər', baki: 'Bakı', absheron: 'Abşeron', sumqayit: 'Sumqayıt', unknown: 'Unknown' };
        const SEA_BREEZE_CATEGORIES = [{ value: 'Apartment', label: 'Mənzil' }, { value: 'Villa', label: 'Villa' }, { value: 'Townhouse', label: 'Townhouse' }, { value: 'Penthouse', label: 'Penthouse' }];
        const GENERAL_CATEGORIES = [{ value: 'NewBuilding', label: 'Yeni tikili' }, { value: 'OldBuilding', label: 'Köhnə tikili' }, { value: 'House', label: 'Həyət evi' }, { value: 'GardenHouse', label: 'Bağ evi' }, { value: 'Villa', label: 'Villa' }, { value: 'Commercial', label: 'Obyekt' }, { value: 'Office', label: 'Ofis' }, { value: 'LandSale', label: 'Torpaq' }];
        window.SEA_BREEZE_CATEGORIES = SEA_BREEZE_CATEGORIES;
        window.GENERAL_CATEGORIES = GENERAL_CATEGORIES;
        const BAKI_DISTRICTS = ['Yasamal', 'Nəsimi', 'Binəqədi', 'Nərimanov', 'Xətai', 'Sabunçu', 'Suraxanı', 'Qaradağ', 'Pirallahı', 'Səbail', 'Xəzər'];
        const ABSHERON_DISTRICTS = ['Xırdalan', 'Masazır', 'Mehdiabad', 'Saray', 'Novxanı', 'Fatmayı', 'Görədil', 'Digah'];
        const SUMQAYIT_DISTRICTS = ['1-ci mikrorayon', '2-ci mikrorayon', '3-cü mikrorayon', '4-cü mikrorayon', '5-ci mikrorayon', 'Corat', 'Hacı Zeynalabdin'];
        const GENERAL_CITIES = ['Bakı', 'Abşeron', 'Sumqayıt'];
        const BAKU_METRO_STATIONS = ['28 May', 'Nizami', 'Gənclik', 'Nərimanov', 'Nəsimi', 'Dərnəgül', 'Həzi Aslanov', 'Ulduz', 'Avtovağzal', 'Xocasən', 'Xətai', 'İnşaatçılar', 'Elmlər Akademiyası', 'Memar Əcəmi', 'Azadlıq Prospekti', 'Neftçilər', 'Qara Qarayev', 'Xalqlar Dostluğu', 'Əhmədli', 'Koroğlu', 'İçərişəhər', 'Sahil', 'Cəfər Cabbarlı', '20 Yanvar', '8 Noyabr', 'Bakmil', 'Memar Əcəmi-2'];
        const SETTLEMENT_OPTIONS = ['Bilgəh', 'Mərdəkan', 'Buzovna', 'Hövsan', 'Masazır', 'Mehdiabad', 'Novxanı', 'Ramana', 'Zabrat', 'Kürdəxanı', 'Türkan', 'Şüvəlan'];
        const AD_DEFAULT_DISPLAY_DURATION_SECONDS = 30;
        const AD_MIN_DISPLAY_DURATION_SECONDS = 1;
        const AD_MAX_DISPLAY_DURATION_SECONDS = 86400;
        const AD_DEFAULT_REPEAT_COUNT = 3;
        const AD_MIN_REPEAT_COUNT = 1;
        const AD_MAX_REPEAT_COUNT = 100;
        const AD_DESKTOP_MIN_WIDTH = 1280;
        window.addEventListener('resize', () => { renderDesktopAds({ force: true }); });
        const adRotationState = { index: 0, repeat: 0, timer: null, safetyTimer: null, stallTimer: null, durationTimer: null, recoveryTimer: null, stuckTimer: null, videoCleanups: [], activeAdId: null, renderedAdId: null, activeAdsSignature: '', transitionToken: 0 };

        function normalizeRegionType(value, projectName = '') {
            const normalized = String(value || '').trim().toLowerCase();
            if (['seabreeze', 'sea breeze', 'sea-breeze'].includes(normalized.replace(/\s+/g, ' ')) || normalized.replace(/[\s_-]+/g, '') === 'seabreeze') return 'seabreeze';
            if (['general', 'umumi', 'ümumi'].includes(normalized)) return 'general';
            if (['baki', 'bakı'].includes(normalized)) return 'baki';
            if (['absheron', 'abşeron', 'abseron'].includes(normalized)) return 'absheron';
            if (['sumqayit', 'sumqayıt'].includes(normalized)) return 'sumqayit';
            return projectName ? 'seabreeze' : '';
        }

        function getRegionLabel(regionType) { return REGION_LABELS[regionType] || 'Unknown'; }
        function getListingRegionType(listing = {}) { const normalized = normalizeRegionType(listing.regionType, listing.project); if (normalized === 'general') return cityToLegacyRegion(listing.city) || 'general'; return normalized || cityToLegacyRegion(listing.city) || ''; }
        function getListingDistrict(listing = {}) { const region = getListingRegionType(listing); return region === 'seabreeze' ? (listing.district || listing.project || '') : (listing.district || listing.neighborhood || ''); }
        function normalizeProjectRegionValue(value = '') { return String(value || '').trim().toLocaleLowerCase('az-AZ').replace(/[\s_-]+/g, ''); }
        function isSeaBreezeRegionValue(value = '') { return normalizeProjectRegionValue(value) === 'seabreeze'; }
        function isSeaBreezeProject(project = {}) {
            const explicitRegionValues = [project.region, project.regionType, project.region_type, project.projectArea, project.project_area, project.location]
                .map(value => String(value || '').trim())
                .filter(Boolean);
            if (!explicitRegionValues.length) return true;
            return explicitRegionValues.some(isSeaBreezeRegionValue);
        }
        function getSeaBreezeProjects() { return getOfficialProjects().filter(isSeaBreezeProject); }
        function projectTitleCase(value = '') {
            return String(value || '')
                .trim()
                .replace(/\s+/g, ' ')
                .toLowerCase()
                .replace(/(^|\s)([\p{L}])/gu, (_, prefix, letter) => `${prefix}${letter.toUpperCase()}`);
        }
        function normalizeProjectOptionKey(value = '') { return projectTitleCase(value).toLocaleLowerCase('az-AZ').replace(/[^\p{L}\p{N}]+/gu, ''); }
        function getUniqueSeaBreezeProjectNames({ sort = true } = {}) {
            const seenIds = new Set();
            const seenNames = new Set();
            const names = [];
            getSeaBreezeProjects().forEach(project => {
                const rawTitle = project?.title || project?.name || project?.projectName || '';
                const title = projectTitleCase(rawTitle);
                const nameKey = normalizeProjectOptionKey(title);
                const idKey = project?.id === undefined || project?.id === null ? '' : String(project.id).trim();
                if (!title || !nameKey || (idKey && seenIds.has(idKey)) || seenNames.has(nameKey)) return;
                if (idKey) seenIds.add(idKey);
                seenNames.add(nameKey);
                names.push(title);
            });
            return sort ? names.sort((a, b) => a.localeCompare(b, 'az-AZ')) : names;
        }
        function getDistrictOptionsForRegion(region) { return region === 'seabreeze' ? getUniqueSeaBreezeProjectNames() : (region === 'baki' ? BAKI_DISTRICTS : (region === 'absheron' ? ABSHERON_DISTRICTS : (region === 'sumqayit' ? SUMQAYIT_DISTRICTS : []))); }
        function cityToLegacyRegion(city) { const n = String(city || '').trim().toLowerCase(); if (['baki', 'bakı'].includes(n)) return 'baki'; if (['absheron', 'abşeron', 'abseron'].includes(n)) return 'absheron'; if (['sumqayit', 'sumqayıt'].includes(n)) return 'sumqayit'; return ''; }
        function legacyRegionToCity(region) { return region === 'baki' ? 'Bakı' : (region === 'absheron' ? 'Abşeron' : (region === 'sumqayit' ? 'Sumqayıt' : '')); }


        const DEFAULT_SITE_SETTINGS = {
            showBaki: true,
            showSumqayit: true,
            showAbsheron: true,
            showMetroFilter: true,
            showRayonFilter: true,
            showQesebeFilter: true
        };
        const REGION_SETTING_KEYS = { baki: 'showBaki', sumqayit: 'showSumqayit', absheron: 'showAbsheron' };
        const GENERAL_CITY_META = [
            { value: 'Bakı', region: 'baki', label: 'Bakı' },
            { value: 'Abşeron', region: 'absheron', label: 'Abşeron' },
            { value: 'Sumqayıt', region: 'sumqayit', label: 'Sumqayıt' }
        ];

        function normalizeSiteSettings(settings = {}) {
            return {
                showBaki: Boolean(settings.showBaki ?? settings.show_baki ?? DEFAULT_SITE_SETTINGS.showBaki),
                showSumqayit: Boolean(settings.showSumqayit ?? settings.show_sumqayit ?? DEFAULT_SITE_SETTINGS.showSumqayit),
                showAbsheron: Boolean(settings.showAbsheron ?? settings.show_absheron ?? DEFAULT_SITE_SETTINGS.showAbsheron),
                showMetroFilter: Boolean(settings.showMetroFilter ?? settings.show_metro_filter ?? DEFAULT_SITE_SETTINGS.showMetroFilter),
                showRayonFilter: Boolean(settings.showRayonFilter ?? settings.show_rayon_filter ?? DEFAULT_SITE_SETTINGS.showRayonFilter),
                showQesebeFilter: Boolean(settings.showQesebeFilter ?? settings.show_qesebe_filter ?? DEFAULT_SITE_SETTINGS.showQesebeFilter)
            };
        }

        function currentSiteSettings() { return normalizeSiteSettings(appData.siteSettings || DEFAULT_SITE_SETTINGS); }
        function isRegionVisible(region) {
            if (region === 'seabreeze' || region === 'general' || region === 'all') return true;
            const key = REGION_SETTING_KEYS[region];
            return key ? currentSiteSettings()[key] !== false : true;
        }
        function getVisibleGeneralCities() { return GENERAL_CITY_META.filter(item => isRegionVisible(item.region)); }
        function isListingLocationVisible(listing = {}) { return isRegionVisible(getListingRegionType(listing)); }
        function settingPayloadFromForm() {
            return {
                showBaki: document.getElementById('setting-show-baki')?.checked ?? true,
                showSumqayit: document.getElementById('setting-show-sumqayit')?.checked ?? true,
                showAbsheron: document.getElementById('setting-show-absheron')?.checked ?? true,
                showMetroFilter: document.getElementById('setting-show-metro')?.checked ?? true,
                showRayonFilter: document.getElementById('setting-show-rayon')?.checked ?? true,
                showQesebeFilter: document.getElementById('setting-show-qesebe')?.checked ?? true
            };
        }

        function fillSiteSettingsForm() {
            const settings = currentSiteSettings();
            const pairs = [
                ['setting-show-baki', settings.showBaki], ['setting-show-sumqayit', settings.showSumqayit], ['setting-show-absheron', settings.showAbsheron],
                ['setting-show-metro', settings.showMetroFilter], ['setting-show-rayon', settings.showRayonFilter], ['setting-show-qesebe', settings.showQesebeFilter]
            ];
            pairs.forEach(([id, value]) => { const el = document.getElementById(id); if (el) el.checked = value; });
        }

        function renderRegionOptionsForSelect(select) {
            if (!select) return;
            const selected = select.value || 'all';
            const rows = [{ value: 'all', label: 'Bütün regionlar' }, { value: 'seabreeze', label: 'Sea Breeze' }]
                .concat(GENERAL_CITY_META.filter(item => isRegionVisible(item.region)).map(item => ({ value: item.region, label: item.label })));
            select.innerHTML = rows.map(item => `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`).join('');
            select.value = rows.some(item => item.value === selected) ? selected : 'all';
        }

        function renderRegionFilterOptions() {
            renderRegionOptionsForSelect(document.getElementById('filter-sb-region'));
            renderRegionOptionsForSelect(document.getElementById('admin-listing-region-filter'));
        }

        function applySiteSettingsToUi() {
            renderRegionFilterOptions();
            const settings = currentSiteSettings();
            document.getElementById('filter-sb-project')?.classList.toggle('hidden', settings.showRayonFilter === false);
            document.getElementById('admin-listing-district-filter')?.classList.toggle('hidden', settings.showRayonFilter === false);
            if (settings.showRayonFilter === false && document.getElementById('filter-sb-project')) document.getElementById('filter-sb-project').value = 'all';
            if (settings.showRayonFilter === false && document.getElementById('admin-listing-district-filter')) document.getElementById('admin-listing-district-filter').value = 'all';
            renderOfficialProjectOptions();
            if (isTabAktiv('listings')) renderSeaBreeze();
            if (isTabAktiv('create-listing')) handlePublicListingRegionChange();
            if (isTabAktiv('admin-dashboard')) renderAdminDashboard();
        }

        async function loadSiteSettingsPriority() {
            try {
                const settings = await apiRequest('/api/site-settings').catch(() => DEFAULT_SITE_SETTINGS);
                cacheData('siteSettings', normalizeSiteSettings(settings));
            } catch (error) {
                console.warn('Sayt ayarları oxunmadı, cache istifadə olunur:', error.message);
            } finally {
                appData.siteSettings = normalizeSiteSettings(appData.siteSettings || DEFAULT_SITE_SETTINGS);
                applySiteSettingsToUi();
            }
        }

        async function saveSiteSettings(event) {
            event.preventDefault();
            const btn = document.getElementById('site-settings-save-btn');
            const status = document.getElementById('site-settings-status');
            const payload = settingPayloadFromForm();
            btn?.classList.add('is-loading');
            if (status) status.textContent = 'Yadda saxlanılır…';
            try {
                const response = await apiRequest('/api/site-settings', { method: 'PUT', body: JSON.stringify(payload) });
                const saved = response?.settings || response;
                cacheData('siteSettings', normalizeSiteSettings(saved));
                fillSiteSettingsForm();
                applySiteSettingsToUi();
                if (status) status.textContent = 'Ayarlar tətbiq olundu.';
            } catch (error) {
                console.error('Sayt ayarları yadda saxlanılmadı:', error);
                if (status) status.textContent = 'Xəta: Ayarlar yadda saxlanılmadı. Zəhmət olmasa yenidən cəhd edin.';
            } finally {
                btn?.classList.remove('is-loading');
            }
        }

        const ENABLE_DEMO_DATA = false;

        // Development-only demo datasets. Production rendering starts empty and waits for API data.
        const officialSeaBreezeProjects = (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production' && ENABLE_DEMO_DATA) ? [
            {
                id: "op1",
                category: "Apartment",
                title: "Caspian Dream Liner",
                year: "2027",
                img: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80",
                picture: {
                    desktop: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80",
                    tablet: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80",
                    mobile: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80"
                },
                desc: "Xəzər dənizinin mavi dalğalarında üzən bəyaz layner formasında fantastik 11 mərtəbəli apart-hotel. Xüsusi olaraq Caspian Dream Liner üçün süni yarımada salınıb. Müasir memarlıq və mühəndisliyin bu şah əsəri Adel Zehni tərəfindən dizayn edilib.",
                floors: "11 mərtəbə",
                area: "50-838 m²",
                apartments: "226 mənzil",
                repairStatus: "Tam təmirli (mebel və texnika daxil)",
                features: "Şəxsi hovuz / Yeraltı və yerüstü parkinq / Restoranlar və butiklər"
            },
            {
                id: "op2",
                category: "Apartment",
                title: "Blue Waters",
                year: "2028",
                img: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
                picture: {
                    desktop: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
                    tablet: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
                    mobile: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80"
                },
                desc: "Dəniz dalğalarından ilhamlanan və şüşə divarları sanki ağuşuna alan fasad dekoru ilə premium yaşayış kompleksi. Layihənin valehedici memarlıq dizaynı aparıcı Benoy və Squire & Partners beynəlxalq bürosu tərəfindən hazırlanmışdır.",
                floors: "11-12-14 mərtəbə",
                area: "44-587 m²",
                apartments: "849 mənzil",
                repairStatus: "Təmirsiz",
                features: "Özəl hovuz / Yeraltı parkinq / Özəl yaşıllıq sahəsi / Restoranlar və barlar"
            },
            {
                id: "op3",
                category: "Apartment",
                title: "Sky Park",
                year: "2028",
                img: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
                picture: {
                    desktop: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
                    tablet: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
                    mobile: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80"
                },
                desc: "Ultramüasir premium mənzil kompleksi: high tech üslubda dörd bina. Qlobal meqapolislərə ithafən layihələndirilmiş memarlıq incisi dəniz kurortunun təbii gözəlliyi ilə harmoniyada yaradılmışdır. Panoramik pəncərələrdən möhtəşəm dəniz mənzərələri açılır. Dekorativ fəvvarə və dizayner işıqlandırması hər gəzintini parlaq təcrübəyə çevirir.",
                floors: "24 mərtəbə",
                area: "52-89 m²",
                apartments: "1008 mənzil",
                repairStatus: "Təmirsiz",
                features: "Özəl hovuz / Yeraltı parkinq"
            },
            {
                id: "op4",
                category: "Apartment",
                title: "Marina Village",
                year: "2026",
                img: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
                picture: {
                    desktop: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
                    tablet: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
                    mobile: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80"
                },
                desc: "İtalyansayağı dəbdəbə üslubunda mini-şəhər. Hündür tağları və kirəmitli damları olan eleqant evlər, mənzərəli yaxta limanı və Venesiya tərzində kanallar. Bu, Azərbaycanda özəl marina və yaxta klubu olan yeganə layihədir. 'Kiçik Venesiya' birinci sahil xəttində, dənizdən cəmi 40 metr məsafədə yerləşir.",
                floors: "4-6 mərtəbə",
                area: "38-479 m²",
                apartments: "1010 mənzil",
                repairStatus: "Təmirli",
                features: "İcarə xidməti / Özəl hovuz / Yaxtalar və qayıqlar üçün pirs / Yeraltı və yerüstü parkinq"
            },
            {
                id: "op5",
                category: "Apartment",
                title: "Park Residences 3",
                year: "2026",
                img: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
                picture: {
                    desktop: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
                    tablet: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
                    mobile: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80"
                },
                desc: "Eleqant Park Residences 3 yaşayış kompleksi Xəzər dənizinin sahillərində ənənəvi Avropa üslubu və müasir dizayn həllərinin harmoniyasını təmsil edir. Panoramik pəncərələr və terraslar, palma ağaclarının kölgəsində geniş həyət və rahat lounge məkanları – həyatın gözəlliyindən zövq almaq üçün lazım olan hər şey burada var.",
                floors: "9 mərtəbə",
                area: "57-158 m²",
                apartments: "1620 mənzil",
                repairStatus: "Təmirsiz",
                features: "Yeraltı və yerüstü parkinq / Özəl hovuz / Yay terrası"
            },
            {
                id: "op6",
                category: "Apartment",
                title: "Park Lane",
                year: "2028",
                img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
                picture: {
                    desktop: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
                    tablet: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
                    mobile: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80"
                },
                desc: "Minimalist üslubda müasir yaşayış kompleksi. Pilləli memarlıq, lakonik xətlər və mənzərəli şəffaf lociyalar. Dörd bina palma ağacları ilə əhatə olunmuş və landşaft dizaynı ile layihələndirilmiş yaşıl bulvarlarla birləşdirilib.",
                floors: "14-16 mərtəbə",
                area: "30-293 m²",
                apartments: "1756 mənzil",
                repairStatus: "İlkin təmir",
                features: "Yeraltı parkinq / Özəl hovuzlar / Barlar və restoranlar"
            },
            {
                id: "op7",
                category: "Apartment",
                title: "Skyline",
                year: "2026",
                img: "https://images.unsplash.com/photo-1464890100898-a385f744067f?auto=format&fit=crop&w=800&q=80",
                picture: {
                    desktop: "https://images.unsplash.com/photo-1464890100898-a385f744067f?auto=format&fit=crop&w=800&q=80",
                    tablet: "https://images.unsplash.com/photo-1464890100898-a385f744067f?auto=format&fit=crop&w=800&q=80",
                    mobile: "https://images.unsplash.com/photo-1464890100898-a385f744067f?auto=format&fit=crop&w=800&q=80"
                },
                desc: "Xəzərin sahilini qucaqlayan dalğalar kaskadını xatırladan futuristik apart-hotel. Unikal memarlıq sakit təbii mühitlə uzlaşır: açıq terraslarda tropik ağaclardan yaşıl parklar yaradılıb.",
                floors: "7 mərtəbə",
                area: "45-466 m²",
                apartments: "293 mənzil",
                repairStatus: "Təmirli",
                features: "İcarə xidməti / Yeraltı parkinq / Qapalı hovuz / Fitnes / Restoranlar"
            },
            {
                id: "op8",
                category: "Apartment",
                title: "Palazzo del Mare",
                year: "2027",
                img: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80",
                picture: {
                    desktop: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80",
                    tablet: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80",
                    mobile: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80"
                },
                desc: "Xəzər dənizi sahilində təntənəli tağları, bəzəkli terrakota damları və geniş qalereyaları olan italyan sarayları üslubunda dəbdəbəli kompleks. Açıq rəngli fasadları olan zərif binalar abadlaşdırılmış bağlarla, şəffaf sulu firuzəyi hovuz isə palma ağacları ilə əhatə olunub.",
                floors: "8 mərtəbə",
                area: "49-196 m²",
                apartments: "939 mənzil",
                repairStatus: "Təmirsiz",
                features: "İcarə xidməti / Yeraltı və yerüstü parkinq / Özəl hovuz / Restoran"
            },
            {
                id: "op9",
                category: "Apartment",
                title: "Harbour Residence",
                year: "2028",
                img: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=800&q=80",
                picture: {
                    desktop: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=800&q=80",
                    tablet: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=800&q=80",
                    mobile: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=800&q=80"
                },
                desc: "Avropa sahil şəhərləri üslubunda premium apart-hotel kompleksi. Zərif həndəsi fasadlar, isti terrakota tonları və şəffaf lociyalar gözəllik və rahat yaşam hissi bəxş edir. Harbour Residence-in yaxınlığında Azərbaycanın ən hündür binası olan futuristik Cipriani Tower tikiləcək.",
                floors: "9 mərtəbə",
                area: "48-215 m²",
                apartments: "624 mənzil",
                repairStatus: "İlkin təmir",
                features: "Yeraltı və yerüstü parkinq / 3 üzgüçülük hovuzu / Kafe və restoranlar"
            },
            {
                id: "op10",
                category: "Apartment",
                title: "Park Residences 4",
                year: "2029",
                img: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80",
                picture: {
                    desktop: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80",
                    tablet: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80",
                    mobile: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80"
                },
                desc: "Park Residences 4 sevimli Park Residences layihəsinin davamıdır. Geniş eyvanları olan parlaq ağ binalardan ibarət bu yaşayış kompleksi müasir Avropa minimalizmini rahat dənizkənarı tətil atmosferi ilə birləşdirir.",
                floors: "9 mərtəbə",
                area: "37-102 m²",
                apartments: "1872 mənzil",
                repairStatus: "Təmirsiz",
                features: "Yeraltı və yerüstü parkinq / Özəl hovuz / Kafe və restoranlar"
            },
            {
                id: "op11",
                category: "Villa",
                title: "Sea Breeze Golden Villas",
                year: "2026",
                img: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80",
                picture: {
                    desktop: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80",
                    tablet: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80",
                    mobile: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80"
                },
                desc: "Tamamilə dəniz mənzərəli, rəsmi elit villalar xətti. Landşaft dizaynlı geniş özəl bağçası, fərdi üzmə hovuzu və müasir smart home infrastrukturu.",
                floors: "2-3 mərtəbə",
                area: "350-1200 m²",
                apartments: "24 eksklüziv villa",
                repairStatus: "Yüksək səviyyəli təmirli",
                features: "Həyətyanı sahə / Açıq və qapalı hovuzlar / 24/7 mühafizə"
            },
            {
                id: "op12",
                category: "Townhouse",
                title: "Sea Breeze Townhouses",
                year: "2027",
                img: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
                picture: {
                    desktop: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
                    tablet: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
                    mobile: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80"
                },
                desc: "Müasir ailələr üçün optimal tərəfdaşlıq layihəsi: dördmərtəbəli modern tərzdə taunhauslar. Həm şəxsi bağ sahəsi, həm də mənzil kompaktlığı bir arada.",
                floors: "3 mərtəbə",
                area: "180-340 m²",
                apartments: "42 blok",
                repairStatus: "Təmirli / Döşəmə isitmə sistemi daxil",
                features: "Şəxsi qaraj / Üst eyvan / Terras"
            }
        ] : [];
        const developmentOfficialSeaBreezeProjects = officialSeaBreezeProjects;

        // Development-only gallery/listings fixtures.
        const defaultGallery = (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production' && ENABLE_DEMO_DATA) ? [
            {
                id: 1,
                title: "Sea Breeze İcma Görüşü 2026",
                type: "event",
                images: [
                    "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80"
                ],
                desc: "Müştərilər və komanda üçün keçirilən təqdimat görüşü."
            }
        ] : [];
        const developmentDefaultGallery = defaultGallery;

        // Listings data (with floor and land sot specs)
        const defaultSeaBreezeListings = (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production' && ENABLE_DEMO_DATA) ? [
            {
                id: 1,
                title: "Caspian Dream Liner lüks 2 otaqlı",
                project: "Caspian Dream Liner",
                listingType: "Satis",
                category: "Apartment",
                rooms: 2,
                area: 74,
                floor: 5,
                land: null,
                price: 245000,
                img: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
                desc: "Caspian Dream Liner layihəsində, Adel Zehni dizaynı ilə dənizə mənzərəli premium apart.",
                authorId: "admin",
                status: "Approved"
            },
            {
                id: 2,
                title: "Sea Breeze Golden Villa - Möhtəşəm Həyət evi",
                project: "Digər",
                listingType: "Satis",
                category: "Villa",
                rooms: 6,
                area: 450,
                floor: 3,
                land: 8.5,
                price: 1350000,
                img: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80",
                desc: "Sea Breeze daxilində şəxsi hovuzlu, geniş həyəti və 8.5 sot torpaq sahəsi olan modern villa.",
                authorId: "admin",
                status: "Approved"
            },
            {
                id: 3,
                title: "Sea Breeze investisiya üçün torpaq sahəsi",
                project: "Digər",
                listingType: "Satis",
                category: "LandSale",
                rooms: 1,
                area: 600,
                floor: 1,
                land: 6,
                price: 390000,
                img: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80",
                desc: "Sea Breeze ərazisinə yaxın investisiya və fərdi tikinti üçün uyğun torpaq satışı.",
                authorId: "admin",
                status: "Approved"
            }
        ] : [];
        const developmentDefaultSeaBreezeListings = defaultSeaBreezeListings;

        const defaultVacancies = [
            {
                id: 1,
                title: "Daşınmaz Əmlak Agenti",
                type: "Tam ştat",
                salary: "Yüksək Faiz + Sabit",
                location: "Bakı (Nardaran)",
                desc: "Ünsiyyətcil, lüks əmlak bazarında təcrübəli və premium müştərilərlə işləmə bacarığı olan yoldaşlar axtarırıq.",
                status: "Aktiv"
            }
        ];

        const defaultAgents = [
            {
                id: "agent1",
                name: "Elnur",
                surname: "Qasımov",
                phone: "",
                email: "elnur@besthome.az",
                pass: "agent123"
            }
        ];

        // OPTIONAL CACHE ONLY: data is loaded from and saved to the backend APIs.


        // DATABASE API SYNC (Express + Prisma + Supabase PostgreSQL)
        const API_BASE = window.location.origin;
        window.API_BASE = API_BASE;
        const SITE_NAME = 'BestHome.az';
        window.SITE_NAME = SITE_NAME;
        const HOME_SEO_TITLE = 'BestHome.az - Satılıq və Kirayə Daşınmaz Əmlak Elanları';
        const DEFAULT_SEO_DESCRIPTION = 'Bakıda satılıq və kirayə mənzillər, villalar, həyət evləri və yeni layihələr. BestHome.az-da daşınmaz əmlak elanlarını rahat axtarın.';
        const STATIC_SEO = {
            '/': { title: HOME_SEO_TITLE, description: DEFAULT_SEO_DESCRIPTION },
            '/elanlar': { title: 'Elanlar - Satılıq və Kirayə Əmlak | BestHome.az', description: 'Satılıq və kirayə mənzil, villa, həyət evi və kommersiya obyektlərini BestHome.az-da axtarın.' },
            '/projects': { title: 'Sea Breeze Layihələri | BestHome.az', description: 'Sea Breeze layihələri, premium yaşayış kompleksləri, mənzil sahələri və təhvil tarixləri haqqında məlumat.' },
            '/sea-breeze-haqqinda': { title: 'Sea Breeze Haqqında | BestHome.az', description: 'Sea Breeze premium yaşayış, investisiya, çimərlik və infrastruktur məlumatları.' },
            '/gallery': { title: 'Qalereya - BestHome.az', description: 'BestHome.az qalereyasında layihə görüntüləri, videolar və media materiallarına baxın.' },
            '/ipoteka-kalkulyatoru': { title: 'İpoteka Kalkulyatoru | BestHome.az', description: 'İpoteka ödənişlərini hesablayın. İlkin ödəniş, kredit müddəti və aylıq ödənişləri rahat şəkildə öyrənin.' },
        };
        let isLoginSubmitting = false;

        function absoluteUrl(path = window.location.pathname) {
            return `${window.location.origin}${path.startsWith('/') ? path : '/' + path}`;
        }

        function setMeta(nameOrProperty, value, isProperty = false) {
            const attr = isProperty ? 'property' : 'name';
            let el = document.head.querySelector(`meta[${attr}="${nameOrProperty}"]`);
            if (!el) {
                el = document.createElement('meta');
                el.setAttribute(attr, nameOrProperty);
                document.head.appendChild(el);
            }
            el.setAttribute('content', value || '');
        }

        function updateSeo({ title = SITE_NAME, description = DEFAULT_SEO_DESCRIPTION, path = window.location.pathname, image = '', type = 'website' } = {}) {
            const isHomepage = (path || '/').split('?')[0] === '/';
            const normalizedTitle = isHomepage && (!title || title === SITE_NAME) ? HOME_SEO_TITLE : title;
            const fullTitle = normalizedTitle === HOME_SEO_TITLE ? HOME_SEO_TITLE : (normalizedTitle.includes(SITE_NAME) ? normalizedTitle : `${normalizedTitle} | ${SITE_NAME}`);
            const canonical = absoluteUrl(path);
            document.title = fullTitle;
            let link = document.head.querySelector('link[rel="canonical"]');
            if (!link) {
                link = document.createElement('link');
                link.rel = 'canonical';
                document.head.appendChild(link);
            }
            link.href = canonical;
            setMeta('description', description);
            setMeta('og:title', fullTitle, true);
            setMeta('og:description', description, true);
            setMeta('og:site_name', SITE_NAME, true);
            setMeta('og:type', type, true);
            setMeta('og:url', canonical, true);
            if (image) setMeta('og:image', image, true);
            setMeta('twitter:title', fullTitle);
            setMeta('twitter:description', description);
            if (image) setMeta('twitter:image', image);
        }

        function localSlug(value) {
            return String(value || '')
                .replace(/[əƏ]/g, 'e').replace(/[ıİI]/g, 'i').replace(/[öÖ]/g, 'o').replace(/[üÜ]/g, 'u')
                .replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c').replace(/[şŞ]/g, 's')
                .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
                .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
        }

        function projectPath(project) { return `/project/${project.slug || localSlug(project.title) || project.id}`; }
        function listingPath(listing) { return `/listing/${listing.listingCode || listing.listing_code || listing.code || listing.id}`; }

        function listingSeoAction(type) {
            return canonicalListingType(type) === 'Kiraye' || canonicalListingType(type) === 'GunlukKiraye' ? 'kirayə verilir' : 'satılır';
        }

        function listingSeoTitle(listing = {}) {
            const rooms = listing.rooms ? `${listing.rooms} otaqlı ` : '';
            const category = listing.category || 'Əmlak';
            const location = listing.district || listing.project || listing.city || 'Azərbaycan';
            return `${rooms}${category} ${listingSeoAction(listing.listingType)} - ${location} | ${SITE_NAME}`;
        }

        function listingSeoDescription(listing = {}) {
            const location = listing.district || listing.project || listing.city || 'Azərbaycan';
            const area = listing.area ? `${listing.area} m²` : '';
            const details = [listing.rooms ? `${listing.rooms} otaqlı` : '', area, listing.category || 'əmlak'].filter(Boolean).join(', ');
            const price = listing.price ? `Qiymət: ${formatPrice(listing.price, listing.currency).replace(/\s+/g, ' ')}. ` : '';
            return `${location} rayonunda ${details} ${listingSeoAction(listing.listingType)}. ${price}Ətraflı məlumat və əlaqə üçün ${SITE_NAME}.`;
        }

        function projectSeoTitle(project = {}) {
            return `${project.title || 'Sea Breeze layihəsi'} - Sea Breeze layihəsi | ${SITE_NAME}`;
        }

        function projectSeoDescription(project = {}) {
            const title = project.title || 'Sea Breeze';
            return `${title} layihəsi haqqında məlumat, təhvil ili, mərtəbə sayı, mənzil sahələri və üstünlüklər. Sea Breeze layihələrini ${SITE_NAME}-da kəşf edin.`;
        }

        function formatListingCode(code) {
            const parsed = Number.parseInt(code, 10);
            return Number.isFinite(parsed) && parsed > 0 ? `BH${String(parsed).padStart(6, '0')}` : '—';
        }
        function vacancyPath(vacancy) { return `/vacancy/${vacancy.slug || localSlug(vacancy.title) || vacancy.id}`; }
        function galleryPath(item) { return item?.type === 'video' ? `/video/${item.id}` : `/gallery/${item.id}`; }
        function currentRouteValue() { return decodeURIComponent(window.location.pathname.split('/').filter(Boolean).pop() || ''); }

        function navigateHeroLink(href = '') {
            if (!href) return false;
            if (href.startsWith('#')) {
                const target = document.querySelector(href);
                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return true;
            }

            const url = new URL(href, window.location.origin);
            if (url.origin !== window.location.origin) return false;

            const path = `${url.pathname}${url.search}${url.hash}`;
            history.pushState({ path }, '', path);
            routeToCurrentPath();
            return true;
        }

        function matchesSlugOrId(item, value) {
            const routeValue = String(value || '');
            return String(item?.id || '') === routeValue || String(item?.slug || '') === routeValue || localSlug(item?.title) === routeValue;
        }
        function upsertCachedItem(name, item) {
            if (!item) return;
            cacheData(name, [item, ...(appData[name] || []).filter(existing => String(existing.id) !== String(item.id))]);
        }

        let isHydratingFromApi = false;
        let syncTimer = null;

        function getAuthToken() {
            return localStorage.getItem('besthome_auth_token')
                || localStorage.getItem('token')
                || sessionStorage.getItem('besthome_auth_token')
                || sessionStorage.getItem('token')
                || '';
        }

        function isAdminRole(role) {
            const normalized = String(role || '').trim().toLowerCase();
            return normalized === 'admin' || normalized === 'super_admin';
        }

        function isAdminHost(hostname = window.location.hostname) {
            const host = String(hostname || '').trim().toLowerCase();
            return host === 'admin.besthome.az' || host.startsWith('admin.');
        }
        window.isAdminHost = isAdminHost;

        function applyAdminHostClass() {
            const adminHost = isAdminHost();
            document.documentElement.classList.toggle('is-admin-host', adminHost);
            document.body?.classList.toggle('is-admin-host', adminHost);
            return adminHost;
        }

        function normalizeAuthRole(role, fallback = 'user') {
            if (isAdminRole(role)) return 'admin';
            return String(role || '').trim().toLowerCase() === 'user' ? 'user' : fallback;
        }

        const DASHBOARD_SUBTAB_BUTTONS = [
            { id: 'subtab-btn-dashboard', subtab: 'seabreeze-manager', label: 'Dashboard', icon: 'fa-chart-pie', adminOnly: false },
            { id: 'subtab-btn-sb', subtab: 'seabreeze-manager', label: 'Elanlar', icon: 'fa-building', adminOnly: false },
            { id: 'subtab-btn-projects', subtab: 'projects-manager', label: 'Layihələr', icon: 'fa-diagram-project', adminOnly: true },
            { id: 'subtab-btn-project-inquiries', subtab: 'project-inquiries', label: 'Müraciətlər', icon: 'fa-inbox', adminOnly: true },
            { id: 'subtab-btn-agents', subtab: 'agents-manager', label: 'İstifadəçilər', icon: 'fa-users', adminOnly: true },
            { id: 'subtab-btn-user-profile', subtab: 'user-profile', label: 'Mesajlar', icon: 'fa-message', adminOnly: false },
            { id: 'subtab-btn-ads', subtab: 'ads-manager', label: 'Reklamlar', icon: 'fa-rectangle-ad', adminOnly: true },
            { id: 'subtab-btn-gallery', subtab: 'gallery-manager', label: 'Media Qalereya', icon: 'fa-images', adminOnly: true },
            { id: 'subtab-btn-vacs', subtab: 'vacancy-manager', label: 'Vakansiyalar', icon: 'fa-briefcase', adminOnly: true },
            { id: 'subtab-btn-site-settings', subtab: 'site-settings', label: 'Sistem Ayarları', icon: 'fa-sliders', adminOnly: true },
            { id: 'subtab-btn-site-music', subtab: 'site-music', label: 'Sayt Musiqisi', icon: 'fa-music', adminOnly: true },
            { id: 'subtab-btn-broadcast-notifications', subtab: 'broadcast-notifications', label: 'Bildirişlər', icon: 'fa-bell', adminOnly: true },
            { id: 'subtab-btn-google-email', subtab: 'google-email', label: 'Sayt Statistikaları', icon: 'fa-chart-line', adminOnly: true },
            { id: 'subtab-btn-projects-archive', subtab: 'projects-archive', label: 'Yedəkləmə', icon: 'fa-database', adminOnly: true },
            { id: 'subtab-btn-hero', subtab: 'hero-sections', label: 'Sistem Logları', icon: 'fa-clipboard-list', adminOnly: true },
            { id: 'subtab-btn-seabreeze-hero', subtab: 'seabreeze-hero', label: 'Sea Breeze Hero', icon: 'fa-star', adminOnly: true },
            { id: 'subtab-btn-seabreeze-info', subtab: 'seabreeze-info-admin', label: 'Sea Breeze Məlumat', icon: 'fa-circle-info', adminOnly: true },
            { id: 'subtab-btn-listing-hero', subtab: 'listing-hero', label: 'Elan Hero', icon: 'fa-star-half-stroke', adminOnly: true }
        ];

        let currentAdminSubtab = 'seabreeze-manager';

        function toggleAdminSidebar(force) {
            const shouldOpen = typeof force === 'boolean' ? force : !document.documentElement.classList.contains('admin-sidebar-open');
            document.documentElement.classList.toggle('admin-sidebar-open', shouldOpen);
            document.body?.classList.toggle('admin-sidebar-open', shouldOpen);
        }
        window.toggleAdminSidebar = toggleAdminSidebar;

        function syncAdminShellChrome(activeSubtab = currentAdminSubtab) {
            const activeConfig = DASHBOARD_SUBTAB_BUTTONS.find(item => item.subtab === activeSubtab) || DASHBOARD_SUBTAB_BUTTONS[0];
            const title = document.getElementById('admin-topbar-title');
            if (title) title.textContent = activeConfig?.label || 'Dashboard';
            const date = document.getElementById('admin-current-date');
            if (date) date.textContent = new Date().toLocaleDateString('az-AZ', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
            const userCard = document.getElementById('admin-sidebar-user-card');
            if (userCard && activeUser) {
                const fullname = activeUser.fullname || activeUser.name || activeUser.email || 'Admin';
                const initials = fullname.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'AD';
                userCard.innerHTML = `<span class="admin-sidebar-avatar">${escapeHtml(initials)}</span><div><strong>${escapeHtml(fullname)}</strong><small>${isAdminRole(activeUser.role) ? 'Administrator' : 'İstifadəçi'} • Online</small></div><i></i>`;
            }
        }

        function renderDashboardSubtabButtons(activeSubtab = currentAdminSubtab || 'seabreeze-manager') {
            activeSubtab = normalizeAdminSubtab(activeSubtab) || 'seabreeze-manager';
            currentAdminSubtab = normalizeAdminSubtab(currentAdminSubtab) || activeSubtab;
            const container = document.getElementById('admin-subtabs-container');
            if (!container) return;
            syncAdminShellChrome(activeSubtab);
            const isAdmin = isAdminRole(activeUser?.role);
            container.innerHTML = DASHBOARD_SUBTAB_BUTTONS
                .filter(item => isAdmin || !item.adminOnly)
                .map(item => {
                    const classes = ['admin-subtab-button'];
                    if (item.adminOnly) classes.push('admin-only-element');
                    if (item.subtab === activeSubtab) classes.push('is-active');
                    return `<button type="button" data-admin-tab="${item.subtab}" onclick="switchAdminSubtab('${item.subtab}')" id="${item.id}" class="${classes.join(' ')}" aria-controls="admin-subtab-${item.subtab}" aria-selected="${item.subtab === activeSubtab ? 'true' : 'false'}"><i class="fa-solid ${item.icon || 'fa-circle'}"></i><span>${item.label}</span></button>`;
                })
                .join('');
        }

        function setAuthSession(token, user) {
            refreshAuthLastActiveAt();
            if (token) {
                localStorage.setItem('token', token);
                localStorage.setItem('besthome_auth_token', token);
                sessionStorage.setItem('token', token);
                sessionStorage.setItem('besthome_auth_token', token);
            }
            if (user) {
                const role = normalizeAuthRole(user.role);
                const userData = JSON.stringify({ ...user, role });
                localStorage.setItem('besthome_logged_in_role', role);
                localStorage.setItem('besthome_user_data', userData);
                sessionStorage.setItem('besthome_logged_in_role', role);
                sessionStorage.setItem('besthome_user_data', userData);
                const agentData = JSON.stringify({ id: user.id, name: user.fullname || user.name || '', email: user.email, phone: user.phone || '', role });
                if (role === 'user') {
                    localStorage.setItem('besthome_agent_data', agentData);
                    sessionStorage.setItem('besthome_agent_data', agentData);
                }
            }
            startAuthHeartbeat();
        }

        function clearAuthSession() {
            ['token', 'besthome_auth_token', 'besthome_logged_in_role', 'besthome_agent_data', 'besthome_user_data', 'authLastActiveAt'].forEach(key => {
                sessionStorage.removeItem(key);
                localStorage.removeItem(key);
            });
        }


        let authHeartbeatTimer = null;
        let adminUsersRefreshTimer = null;
        const SESSION_TIMEOUT_MS = 6 * 60 * 60 * 1000;

        function refreshAuthLastActiveAt() {
            if (!getAuthToken()) return;
            localStorage.setItem('authLastActiveAt', String(Date.now()));
        }

        function isAuthSessionExpired() {
            const lastActiveAt = Number(localStorage.getItem('authLastActiveAt') || 0);
            return Boolean(getAuthToken() && lastActiveAt && Date.now() - lastActiveAt > SESSION_TIMEOUT_MS);
        }

        function enforceAuthSessionTimeout() {
            if (isAuthSessionExpired()) {
                redirectToLoginOnAuthFailure();
                return true;
            }
            return false;
        }

        function sendAuthOfflineBeacon() {
            const token = getAuthToken();
            if (token && isAuthSessionExpired()) {
                clearAuthSession();
                activeUser = null;
                updateHeaderUI();
                return;
            }
            if (!token) return;
            const url = `${API_BASE}/api/auth/offline`;
            const payload = JSON.stringify({ token });
            if (navigator.sendBeacon) {
                try {
                    const blob = new Blob([payload], { type: 'application/json' });
                    if (navigator.sendBeacon(url, blob)) return;
                } catch (_error) {}
            }
            fetch(url, { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: payload }).catch(() => {});
        }

        function sendAuthHeartbeat() {
            if (!getAuthToken()) return;
            if (enforceAuthSessionTimeout()) return;
            apiRequest('/api/auth/heartbeat', { method: 'POST', authRedirect: false }).then(refreshAuthLastActiveAt).catch(() => {});
        }

        function startAuthHeartbeat() {
            if (authHeartbeatTimer || !getAuthToken()) return;
            sendAuthHeartbeat();
            authHeartbeatTimer = setInterval(sendAuthHeartbeat, 45000);
        }

        function stopAuthHeartbeat({ markOffline = false } = {}) {
            if (authHeartbeatTimer) clearInterval(authHeartbeatTimer);
            authHeartbeatTimer = null;
            if (markOffline) sendAuthOfflineBeacon();
        }

        window.addEventListener('pagehide', () => sendAuthOfflineBeacon());
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') sendAuthOfflineBeacon();
            if (document.visibilityState === 'visible' && getAuthToken()) startAuthHeartbeat();
        });

        function setPendingAuthRoute(path = window.location.pathname + window.location.search + window.location.hash) {
            if (path && path !== '/' && path !== '/login') { sessionStorage.setItem('besthome_pending_auth_route', path); sessionStorage.setItem('pendingAuthRoute', path); }
        }

        function consumePendingAuthRoute() {
            const route = sessionStorage.getItem('besthome_pending_auth_route') || sessionStorage.getItem('pendingAuthRoute');
            if (route) { sessionStorage.removeItem('besthome_pending_auth_route'); sessionStorage.removeItem('pendingAuthRoute'); }
            return route;
        }

        function redirectToLoginOnAuthFailure() {
            setPendingAuthRoute();
            stopAuthHeartbeat({ markOffline: true });
            stopAdminUsersAutoRefresh();
            clearAuthSession();
            activeUser = null;
            updateHeaderUI();
            switchTab('admin-login');
        }




        const SITE_THEME_KEY = 'siteTheme';
        const SITE_MUSIC_ENABLED_KEY = 'siteMusicEnabled';
        const SITE_MUSIC_VOLUME_KEY = 'siteMusicVolume';
        const SITE_MUSIC_TRACK_INDEX_KEY = 'currentTrackIndex';
        const LIGHT_LOGO_SRC = window.BestHomeLogo?.paths?.light || '';
        const DARK_LOGO_SRC = window.BestHomeLogo?.paths?.dark || LIGHT_LOGO_SRC;
        const siteMusicState = { tracks: [], audio: null, currentIndex: 0, enabled: false, volume: 0.35, autoplayAttempted: false, loading: false, collapsed: true, inactivityTimer: null, scrollTimer: null };

        function preferredTheme() {
            const saved = localStorage.getItem(SITE_THEME_KEY) || 'light';
            return ['light', 'dark', 'system'].includes(saved) ? saved : 'light';
        }

        function getResolvedSiteTheme() {
            const savedTheme = localStorage.getItem(SITE_THEME_KEY) || 'light';
            if (savedTheme === 'dark') return 'dark';
            if (savedTheme === 'light') return 'light';
            if (savedTheme === 'system') {
                return window.matchMedia &&
                    window.matchMedia('(prefers-color-scheme: dark)').matches
                    ? 'dark'
                    : 'light';
            }
            return 'light';
        }

        function resolvedTheme(choice = preferredTheme()) {
            if (choice === 'system') return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            return choice === 'dark' ? 'dark' : 'light';
        }

        function getCurrentThemeLogo(theme) {
            if (typeof window.getCurrentThemeLogo === 'function' && window.getCurrentThemeLogo !== getCurrentThemeLogo) return window.getCurrentThemeLogo(theme);
            const resolvedTheme = theme || getResolvedSiteTheme();
            return resolvedTheme === 'dark' ? DARK_LOGO_SRC : LIGHT_LOGO_SRC;
        }

        function updateThemeLogos(theme) {
            if (typeof window.updateThemeLogos === 'function' && window.updateThemeLogos !== updateThemeLogos) {
                window.updateThemeLogos(theme);
                return;
            }
            const logoSrc = getCurrentThemeLogo(theme);
            document.querySelectorAll('img[data-theme-logo], img[data-site-logo], .header-logo-wrap img, .site-footer-logo, .mobile-bottom-nav-logo').forEach((img) => {
                if (img && logoSrc && img.getAttribute('src') !== logoSrc) {
                    img.setAttribute('src', logoSrc);
                }
            });
        }

        window.getCurrentThemeLogo = getCurrentThemeLogo;
        window.updateThemeLogos = updateThemeLogos;

        function applySiteTheme(choice = preferredTheme()) {
            localStorage.setItem(SITE_THEME_KEY, choice);
            const resolvedTheme = getResolvedSiteTheme();
            document.documentElement.dataset.theme = resolvedTheme;
            document.documentElement.dataset.themePreference = choice;
            document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
            document.documentElement.classList.toggle('light', resolvedTheme !== 'dark');
            document.body.classList.toggle('dark-mode', resolvedTheme === 'dark');
            document.body.style.backgroundColor = resolvedTheme === 'dark' ? '#000000' : '#ffffff';
            document.querySelectorAll('.site-header, header, footer').forEach(el => { el.style.transition = 'none'; el.style.backgroundColor = resolvedTheme === 'dark' ? '#000000' : '#ffffff'; });
            updateThemeLogos(resolvedTheme);
            document.querySelectorAll('[data-theme-toggle-icon]').forEach(el => { el.className = resolvedTheme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun'; });
        }

        function cycleSiteTheme() {
            applySiteTheme(getResolvedSiteTheme() === 'dark' ? 'light' : 'dark');
            updateHeaderUI();
        }

        function themeToggleHtml(extraClass = '') {
            return `<button type="button" onclick="cycleSiteTheme()" class="theme-toggle-btn is-icon-only ${extraClass}" aria-label="Light/Dark rejimini dəyiş" title="Light/Dark rejimini dəyiş"><i data-theme-toggle-icon class="fa-solid fa-sun" aria-hidden="true"></i></button>`;
        }

        function normalizeMusicTrack(track = {}) {
            return {
                id: track.id,
                title: track.title || 'Musiqi',
                audioUrl: track.audioUrl || track.audio_url || track.fileUrl || track.file_url || '',
                isActive: Boolean(track.isActive ?? track.is_active),
                sortOrder: Number(track.sortOrder ?? track.sort_order ?? 0),
                createdAt: track.createdAt || track.created_at || ''
            };
        }

        function orderedMusicTracks(tracks = appData.musicTracks || []) {
            return (Array.isArray(tracks) ? tracks : []).map(normalizeMusicTrack).filter(t => t.audioUrl).sort((a, b) => (a.sortOrder - b.sortOrder) || String(a.createdAt || '').localeCompare(String(b.createdAt || '')) || Number(a.id || 0) - Number(b.id || 0));
        }

        function ensureSiteMusicAudio() {
            if (siteMusicState.audio) return siteMusicState.audio;
            const audio = new Audio();
            audio.preload = 'metadata';
            audio.volume = siteMusicState.volume;
            audio.addEventListener('ended', () => playSiteMusicAt(siteMusicState.currentIndex + 1, { userInitiated: false }));
            audio.addEventListener('error', () => playSiteMusicAt(siteMusicState.currentIndex + 1, { userInitiated: false, skipFailed: true }));
            siteMusicState.audio = audio;
            return audio;
        }

        function shouldConstrainSiteMusicPlayer(controls) {
            if (!controls || window.innerWidth < 1024) return false;
            return false;
        }

        function updateSiteMusicButton() {
            syncSiteMusicPlacement();
            const controls = document.getElementById('site-music-controls');
            const btn = document.getElementById('site-music-toggle');
            if (!controls || !btn) return;
            const tracks = orderedMusicTracks(siteMusicState.tracks);
            const hasTracks = tracks.length > 0;
            const isPlaying = Boolean(siteMusicState.enabled && siteMusicState.audio && !siteMusicState.audio.paused);
            const currentTrack = tracks[siteMusicState.currentIndex] || tracks[0];
            const spaceConstrained = !siteMusicState.collapsed && shouldConstrainSiteMusicPlayer(controls);
            controls.classList.toggle('is-hidden', !hasTracks);
            controls.classList.toggle('is-playing', isPlaying);
            controls.classList.toggle('is-collapsed', Boolean(siteMusicState.collapsed));
            controls.classList.toggle('is-space-constrained', Boolean(spaceConstrained));
            const expandBtn = document.getElementById('site-music-expand');
            if (expandBtn) expandBtn.textContent = isPlaying ? '🔊' : '🎵';
            btn.textContent = isPlaying ? '⏸' : '▶️';
            btn.setAttribute('aria-label', isPlaying ? 'Musiqini dayandır' : 'Musiqini başlat');
            const title = document.getElementById('site-music-title');
            if (title) {
                title.textContent = currentTrack?.title || 'Musiqi';
                title.title = currentTrack?.title || 'Musiqi';
            }
        }

        function collapseSiteMusicPlayer() {
            siteMusicState.collapsed = true;
            clearTimeout(siteMusicState.inactivityTimer);
            updateSiteMusicButton();
        }

        function scheduleSiteMusicCollapse(delay = 4000) {
            clearTimeout(siteMusicState.inactivityTimer);
            siteMusicState.inactivityTimer = setTimeout(collapseSiteMusicPlayer, delay);
        }

        function expandSiteMusicPlayer() {
            siteMusicState.collapsed = false;
            updateSiteMusicButton();
            scheduleSiteMusicCollapse();
        }

        function syncSiteMusicPlacement() {
            const controls = document.getElementById('site-music-controls');
            const mobileAnchor = document.getElementById('site-music-mobile-anchor');
            const desktopAnchor = document.getElementById('site-music-desktop-anchor');
            if (!controls || !mobileAnchor || !desktopAnchor) return;
            const target = desktopAnchor.parentElement;
            if (target && controls.parentElement !== target) {
                target.insertBefore(controls, desktopAnchor.nextSibling);
            }
        }

        window.addEventListener('scroll', () => {
            if (!orderedMusicTracks(siteMusicState.tracks).length) return;
            clearTimeout(siteMusicState.scrollTimer);
            siteMusicState.scrollTimer = setTimeout(collapseSiteMusicPlayer, 80);
        }, { passive: true });
        window.addEventListener('resize', () => { syncSiteMusicPlacement(); updateSiteMusicButton(); }, { passive: true });

        async function playSiteMusicAt(index = siteMusicState.currentIndex, options = {}) {
            const tracks = orderedMusicTracks(siteMusicState.tracks);
            if (!tracks.length) return updateSiteMusicButton();
            const audio = ensureSiteMusicAudio();
            const nextIndex = ((Number(index) || 0) % tracks.length + tracks.length) % tracks.length;
            const previousIndex = siteMusicState.currentIndex;
            siteMusicState.currentIndex = nextIndex;
            localStorage.setItem(SITE_MUSIC_TRACK_INDEX_KEY, String(nextIndex));
            audio.volume = siteMusicState.volume;
            const nextSrc = new URL(tracks[nextIndex].audioUrl, window.location.origin).href;
            const shouldRestart = tracks.length === 1 && options.restartCurrent;
            if (audio.src !== nextSrc) audio.src = tracks[nextIndex].audioUrl;
            if (shouldRestart || options.restartCurrent || previousIndex !== nextIndex) audio.currentTime = 0;
            try {
                await audio.play();
                siteMusicState.enabled = true;
                localStorage.setItem(SITE_MUSIC_ENABLED_KEY, 'true');
            } catch (error) {
                if (options.skipFailed && tracks.length > 1) return playSiteMusicAt(nextIndex + 1, options);
                if (options.userInitiated) console.warn('Musiqi başladılmadı:', error.message);
                siteMusicState.enabled = false;
            } finally {
                if (options.userInitiated && options.announce && typeof showToast === 'function') showToast(`🎵 ${tracks[nextIndex].title || 'Musiqi'}`);
                updateSiteMusicButton();
            }
        }

        function stopSiteMusic() {
            siteMusicState.enabled = false;
            localStorage.setItem(SITE_MUSIC_ENABLED_KEY, 'false');
            if (siteMusicState.audio) siteMusicState.audio.pause();
            updateSiteMusicButton();
        }

        function toggleSiteMusic() {
            expandSiteMusicPlayer();
            const audio = ensureSiteMusicAudio();
            if (siteMusicState.enabled && !audio.paused) return stopSiteMusic();
            siteMusicState.enabled = true;
            playSiteMusicAt(siteMusicState.currentIndex, { userInitiated: true });
        }

        function playPreviousSiteMusicTrack() {
            const tracks = orderedMusicTracks(siteMusicState.tracks);
            if (!tracks.length) return updateSiteMusicButton();
            const targetIndex = tracks.length === 1 ? siteMusicState.currentIndex : siteMusicState.currentIndex - 1;
            expandSiteMusicPlayer();
            playSiteMusicAt(targetIndex, { userInitiated: true, announce: true, restartCurrent: true });
        }

        function playNextSiteMusicTrack() {
            const tracks = orderedMusicTracks(siteMusicState.tracks);
            if (!tracks.length) return updateSiteMusicButton();
            const targetIndex = tracks.length === 1 ? siteMusicState.currentIndex : siteMusicState.currentIndex + 1;
            expandSiteMusicPlayer();
            playSiteMusicAt(targetIndex, { userInitiated: true, announce: true, restartCurrent: true });
        }

        async function loadSiteMusicBackground({ render = true, admin = false } = {}) {
            if (!admin && homepageHydration.musicTracks && (appData.musicTracks || []).length) return appData.musicTracks;
            siteMusicState.loading = true;
            try {
                const endpoint = admin ? '/api/admin/site-music' : '/api/site-music';
                const result = await withHomepageTimeout(apiRequest(endpoint, { authRedirect: false }), admin ? 'Admin musiqisi' : 'Sayt musiqisi', 3500, { warn: false });
                const tracks = result?.timedOut || result?.error ? (appData.musicTracks || []) : (result.value || []);
                const normalized = orderedMusicTracks(tracks);
                cacheData('musicTracks', normalized);
                siteMusicState.tracks = normalized;
                siteMusicState.volume = Math.min(1, Math.max(0, Number(localStorage.getItem(SITE_MUSIC_VOLUME_KEY) || 0.35)));
                localStorage.setItem(SITE_MUSIC_VOLUME_KEY, String(siteMusicState.volume));
                siteMusicState.currentIndex = Math.min(normalized.length - 1, Math.max(0, Number(localStorage.getItem(SITE_MUSIC_TRACK_INDEX_KEY) || 0))) || 0;
                siteMusicState.enabled = localStorage.getItem(SITE_MUSIC_ENABLED_KEY) === 'true';
                homepageHydration.musicTracks = !admin;
                if (siteMusicState.enabled && !siteMusicState.autoplayAttempted) {
                    siteMusicState.autoplayAttempted = true;
                    playSiteMusicAt(siteMusicState.currentIndex, { userInitiated: false });
                }
                return normalized;
            } finally {
                siteMusicState.loading = false;
                if (render) updateSiteMusicButton();
            }
        }

        const PROJECT_IMAGE_PLACEHOLDER = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e2e8f0"/><stop offset="1" stop-color="#cbd5e1"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><g fill="none" stroke="#64748b" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" opacity=".72"><rect x="455" y="225" width="290" height="220" rx="24"/><circle cx="540" cy="310" r="32"/><path d="m475 420 95-90 70 65 45-42 40 38"/></g><text x="600" y="545" text-anchor="middle" fill="#475569" font-family="Arial, sans-serif" font-size="42" font-weight="700">Şəkil əlavə olunmayıb</text></svg>`)}`;

        function normalizeProjectImages(images, fallback = '') {
            const arr = Array.isArray(images) ? images : [];
            return [...arr, fallback].map(x => String(x || '').trim()).filter((x, idx, all) => x && all.indexOf(x) === idx);
        }

        function normalizeFeatures(features) {
            if (!features) return [];

            if (Array.isArray(features)) {
                return features;
            }

            if (typeof features === 'string') {
                return features
                    .split(',')
                    .map(item => item.trim())
                    .filter(Boolean);
            }

            if (typeof features === 'object') {
                return Object.values(features)
                    .filter(Boolean)
                    .map(String);
            }

            return [];
        }

        function dbProjectToUi(p) {
            const primaryImage = String(p.imageUrl || p.image_url || '').trim();
            const images = normalizeProjectImages(p.images, primaryImage);
            const img = primaryImage || images[0] || PROJECT_IMAGE_PLACEHOLDER;
            const deliveryDate = p.deliveryDate || p.delivery_date || '';
            const floorCount = p.floorCount || p.floor_count || '';
            const areaRange = p.areaRange || p.area_range || p.area || '';
            const apartmentCount = p.apartmentCount || p.apartment_count || '';
            return {
                id: String(p.id), title: p.title || '', category: p.category || 'Apartment', year: deliveryDate, deliveryDate,
                region: p.region || p.regionType || p.region_type || '', projectArea: p.projectArea || p.project_area || '', location: p.location || '',
                zone: p.zone || '', coastline: p.coastline || '', seaDistance: p.seaDistance || p.sea_distance || '',
                buildings: p.buildingCount || p.building_count || '', floors: floorCount, floorCount, area: areaRange, areaRange, apartments: apartmentCount, apartmentCount, parking: p.parkingSpaces || p.parking_spaces || '',
                repair: p.repairStatus || p.repair_status || '', repairStatus: p.repairStatus || p.repair_status || '', apartmentFormats: p.apartmentFormats || p.apartment_formats || '', apartmentAreas: p.apartmentAreas || p.apartment_areas || '',
                pricePerM2: p.pricePerM2 || p.price_per_m2 || '', totalPrice: p.totalPrice || p.total_price || '', bankMortgage: p.bankMortgage || p.bank_mortgage || '', internalCredit: p.internalCredit || p.internal_credit || '', downPayment: p.downPayment || p.down_payment || '', infrastructure: p.infrastructure || '', features: normalizeFeatures(p.features),
                desc: p.description || '', img, imageUrl: primaryImage || images[0] || PROJECT_IMAGE_PLACEHOLDER, images, picture: buildProjectPictureFromLink(img),
                displayOrder: p.displayOrder ?? p.display_order ?? null,
                createdAt: p.createdAt || p.created_at || '',
                slug: p.slug || localSlug(p.title),
                featuredInHero: Boolean(p.featuredInHero ?? p.featured_in_hero),
                isArchived: Boolean(p.isArchived ?? p.is_archived),
                pdfUrl: p.pdfUrl || p.pdf_url || '',
                pdfFilename: p.pdfFilename || p.pdf_filename || '',
                brochureUrl: p.brochureUrl || p.brochure_url || '',
                brochureFilename: p.brochureFilename || p.brochure_filename || '',
                aliases: p.aliases || '',
                latitude: safeNumber(p.latitude),
                longitude: safeNumber(p.longitude),
                mapLocationVerified: Boolean(p.mapLocationVerified ?? p.map_location_verified),
                mapLocationLabel: p.mapLocationLabel || p.map_location_label || '',
                viewCount: Number(p.viewCount ?? p.view_count ?? 0),
                clickCount: Number(p.clickCount ?? p.click_count ?? 0),
                inquiryCount: Number(p.inquiryCount ?? p.inquiry_count ?? 0)
            };
        }

        function formatListingFloor(floorNumber, floorCount) {
            const placed = Number.parseInt(floorNumber, 10);
            const total = Number.parseInt(floorCount, 10);
            if (Number.isFinite(placed) && placed > 0 && Number.isFinite(total) && total > 0) return `${placed} / ${total}`;
            if (Number.isFinite(placed) && placed > 0) return String(placed);
            if (Number.isFinite(total) && total > 0) return String(total);
            return '—';
        }

        function canonicalListingType(type) {
            const value = String(type || '').trim();
            if (['Satış', 'Satis', 'sale'].includes(value)) return 'Satis';
            if (['Kirayə', 'Kiraye', 'rent'].includes(value)) return 'Kiraye';
            if (['Günlük Kirayə', 'GunlukKiraye', 'daily_rent'].includes(value)) return 'GunlukKiraye';
            return value || 'Satis';
        }

        function listingTypeLabel(type) {
            const canonical = canonicalListingType(type);
            if (canonical === 'Kiraye') return 'Kirayə';
            if (canonical === 'GunlukKiraye') return 'Günlük Kirayə';
            return 'Satış';
        }

        function isSaleListing(type) {
            return canonicalListingType(type) === 'Satis';
        }

        function normalizeListingStatus(status) {
            const value = String(status || '').trim().toLowerCase();
            if (['approved', 'təsdiqlənib', 'tesdiqlenib'].includes(value)) return 'approved';
            if (['rejected', 'rədd edilib', 'redd edilib'].includes(value)) return 'rejected';
            if (['archived', 'arxiv', 'arxivdə', 'arxivde'].includes(value)) return 'archived';
            return 'pending';
        }

        function listingStatusLabel(status) {
            return { pending: '⏳ Təsdiq gözləyir', approved: '✅ Aktiv', rejected: '❌ Rədd edildi', archived: '📁 Arxivdə' }[normalizeListingStatus(status)] || '⏳ Təsdiq gözləyir';
        }

        function listingStatusBadgeClass(status) {
            return {
                pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
                rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
                archived: 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
            }[normalizeListingStatus(status)];
        }

        function listingTypeBadgeClass(type) {
            const canonical = canonicalListingType(type);
            if (canonical === 'Kiraye') return 'bg-amber-500/90';
            if (canonical === 'GunlukKiraye') return 'bg-sky-600/90';
            return 'bg-emerald-600/90';
        }

        function normalizeAzerbaijanPhone(phone) {
            const compact = String(phone || '').trim().replace(/[\s()-]/g, '');
            if (!compact) return '';
            if (!/^\+?\d+$/.test(compact)) return '';
            if (/^0\d{9}$/.test(compact)) return `+994${compact.slice(1)}`;
            if (/^994\d{9}$/.test(compact)) return `+${compact}`;
            if (/^\+994\d{9}$/.test(compact)) return compact;
            return '';
        }

        function normalizePhoneForLink(phone) {
            return normalizeAzerbaijanPhone(phone).replace(/[^0-9]/g, '');
        }

        function userHasContactPhone(user = activeUser) {
            return Boolean(normalizeAzerbaijanPhone(user?.phone));
        }

        function syncActiveUserFromApiUser(user) {
            if (!user) return activeUser;
            const role = normalizeAuthRole(user.role, activeUser?.role || 'user');
            activeUser = {
                ...activeUser,
                role,
                name: user.fullname || user.name || activeUser?.name || '',
                fullname: user.fullname || user.name || activeUser?.fullname || '',
                id: user.id || activeUser?.id,
                email: user.email || activeUser?.email || '',
                phone: user.phone || '',
                avatarUrl: user.avatarUrl || user.avatar_url || activeUser?.avatarUrl || '',
                bio: user.bio || activeUser?.bio || '',
                provider: user.provider || activeUser?.provider || 'local',
                createdAt: user.createdAt || user.created_at || activeUser?.createdAt,
                lastLogin: user.lastLogin || user.last_login || activeUser?.lastLogin,
            };
            return activeUser;
        }

        async function refreshCurrentUser() {
            const result = await apiRequest('/api/auth/me');
            if (result?.user) {
                setAuthSession(getAuthToken(), result.user);
                syncActiveUserFromApiUser(result.user);
                updateHeaderUI();
                populateProfileForm(result.user);
            }
            return result?.user || null;
        }

        async function savePhoneAndContinue(normalizedPhone) {
            const authToken = getAuthToken();
            if (!authToken) throw new Error('Sessiya tapılmadı. Zəhmət olmasa yenidən daxil olun.');

            const response = await apiRequest('/api/auth/me', {
                method: 'PUT',
                body: JSON.stringify({ phone: normalizedPhone })
            });
            if (response?.token) setAuthSession(response.token, response.user);
            else if (response?.user) setAuthSession(authToken, response.user);
            syncActiveUserFromApiUser(response?.user);
            await refreshCurrentUser();
            return normalizedPhone;
        }

        function setContactPhoneModalLoading(loading) {
            const btn = document.getElementById('contact-phone-save-btn');
            if (btn) {
                btn.disabled = loading;
                btn.textContent = loading ? 'Yadda saxlanılır…' : 'Qeyd et və davam et';
            }
        }

        function closeContactPhoneModal() {
            document.getElementById('contact-phone-modal')?.remove();
            syncModalOpenState();
        }

        function closeListingResultModal() {
            document.getElementById('listing-result-modal')?.remove();
            syncModalOpenState();
        }

        function cleanupTransientListingModals() {
            closeContactPhoneModal();
            hideListingSubmissionOverlay();
            closeListingResultModal();
        }

        function promptForContactPhone() {
            closeContactPhoneModal();
            return new Promise((resolve) => {
                document.body.insertAdjacentHTML('beforeend', `<div id="contact-phone-modal" role="dialog" aria-modal="true" aria-labelledby="contact-phone-title">
                    <div class="listing-modal-backdrop" aria-hidden="true"></div>
                    <div class="listing-modal-shell">
                    <div class="listing-modal-card space-y-5 text-left">
                        <div><h3 id="contact-phone-title" class="text-2xl font-black text-slate-950">📞 Əlaqə nömrəsini qeyd edin</h3><p class="mt-2 text-sm font-semibold text-slate-600">Elan yerləşdirmək üçün əlaqə nömrəsi tələb olunur.</p></div>
                        <label class="block space-y-2"><span class="text-xs font-black uppercase text-slate-600">Telefon nömrəsi</span><input id="contact-phone-input" type="tel" placeholder="050 123 45 67" class="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-950 font-bold focus:outline-none focus:ring-4 focus:ring-brand-100 focus:border-brand-500"></label>
                        <div id="contact-phone-error" class="hidden rounded-xl bg-red-50 border border-red-100 text-red-700 px-3 py-2 text-xs font-bold"></div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3"><button id="contact-phone-cancel-btn" type="button" class="rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 font-black transition">Ləğv et</button><button id="contact-phone-save-btn" type="button" class="rounded-2xl bg-brand-600 hover:bg-brand-700 text-white px-4 py-3 font-black transition">Qeyd et və davam et</button></div>
                    </div>
                    </div>
                </div>`);
                setModalOpenState(true);
                const input = document.getElementById('contact-phone-input');
                const error = document.getElementById('contact-phone-error');
                const finish = (value) => { closeContactPhoneModal(); resolve(value); };
                document.getElementById('contact-phone-cancel-btn').onclick = () => finish(null);
                document.getElementById('contact-phone-save-btn').onclick = async () => {
                    const normalizedPhone = normalizeAzerbaijanPhone(input.value);
                    if (!normalizedPhone) {
                        error.textContent = 'Telefon nömrəsi düzgün deyil. Məsələn: 050 123 45 67';
                        error.classList.remove('hidden');
                        input.focus();
                        return;
                    }
                    try {
                        setContactPhoneModalLoading(true);
                        const savedPhone = await savePhoneAndContinue(normalizedPhone);
                        finish(savedPhone);
                    } catch (apiError) {
                        error.textContent = apiError.message || 'Telefon nömrəsi yadda saxlanılmadı.';
                        error.classList.remove('hidden');
                    } finally {
                        setContactPhoneModalLoading(false);
                    }
                };
                input.addEventListener('keydown', (event) => { if (event.key === 'Enter') document.getElementById('contact-phone-save-btn')?.click(); });
                setTimeout(() => input.focus(), 50);
            });
        }

        async function ensureListingContactPhone() {
            if (userHasContactPhone(activeUser)) return true;
            const savedPhone = await promptForContactPhone();
            return Boolean(savedPhone && userHasContactPhone(activeUser));
        }

        function firstDefined(...values) {
            return values.find(value => value !== undefined && value !== null && value !== '');
        }

        function numericValue(...values) {
            const value = firstDefined(...values);
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : null;
        }

        function integerValue(...values) {
            const value = firstDefined(...values);
            const parsed = Number.parseInt(value, 10);
            return Number.isFinite(parsed) ? parsed : null;
        }

        function formatOptionalNumber(value, suffix = '') {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? `${parsed.toLocaleString('az-AZ')}${suffix}` : '—';
        }

        function normalizeListingImages(l = {}) {
            const rows = Array.isArray(l.images) ? l.images : [];
            const fromRows = rows.map(item => typeof item === 'string' ? item : item.imageUrl || item.image_url).filter(Boolean);
            return [...fromRows, l.imageUrl || l.image_url || l.img].map(x => String(x || '').trim()).filter((x, idx, all) => x && all.indexOf(x) === idx);
        }

        function dbListingToUi(l) {
            l = extractListingFromResponse(l);
            const area = numericValue(l.area);
            const price = numericValue(l.price);
            const floorNumber = integerValue(l.floorNumber, l.floor_number, l.floor);
            const floorCount = integerValue(l.floorCount, l.floor_count);
            const images = normalizeListingImages(l);
            return {
                id: l.id,
                title: firstDefined(l.title, ''),
                project: firstDefined(l.projectName, l.project_name, l.project, ''),
                projectName: firstDefined(l.projectName, l.project_name, l.project, ''),
                regionType: normalizeRegionType(firstDefined(l.regionType, l.region_type, ''), firstDefined(l.projectName, l.project_name, l.project, '')),
                city: firstDefined(l.city, ''),
                district: firstDefined(l.district, ''),
                neighborhood: firstDefined(l.neighborhood, ''),
                listingType: canonicalListingType(firstDefined(l.listingType, l.listing_type, 'Satis')),
                category: firstDefined(l.propertyCategory, l.property_category, l.category, ''),
                rooms: integerValue(l.roomCount, l.room_count, l.rooms),
                area,
                floorNumber,
                floorCount,
                floor: floorNumber || floorCount,
                price,
                currency: firstDefined(l.currency, 'AZN'),
                isCredit: Boolean(l.isCredit ?? l.is_credit),
                ownerType: firstDefined(l.ownerType, l.owner_type, 'owner'),
                hasDocument: Boolean(l.hasDocument ?? l.has_document),
                locationLabel: firstDefined(l.locationLabel, l.location_label, ''),
                locationSummary: l.locationSummary || l.location_summary || null,
                settlement: firstDefined(l.settlement, ''),
                metroStation: firstDefined(l.metroStation, l.metro_station, ''),
                streetAddress: firstDefined(l.streetAddress, l.street_address, ''),
                latitude: numericValue(l.latitude),
                longitude: numericValue(l.longitude),
                apiBadges: Array.isArray(l.badges) ? l.badges : [],
                creditDownPayment: numericValue(l.creditDownPayment, l.credit_down_payment),
                creditMonthlyPayment: numericValue(l.creditMonthlyPayment, l.credit_monthly_payment),
                creditYears: integerValue(l.creditYears, l.credit_years),
                pricePerM2: numericValue(l.pricePerM2, l.price_per_m2) || (area && price ? price / area : null),
                user: l.user || null,
                img: images[0] || '',
                images,
                desc: firstDefined(l.description, l.desc, ''),
                authorId: firstDefined(l.userId, l.user_id, l.user?.id, 'admin'),
                status: normalizeListingStatus(firstDefined(l.status, 'approved')),
                displayOrder: Number(l.displayOrder ?? l.display_order ?? l.id),
                createdAt: firstDefined(l.createdAt, l.created_at, new Date().toISOString()),
                approvedAt: firstDefined(l.approvedAt, l.approved_at, ''),
                viewCount: numericValue(l.viewCount, l.view_count) || 0,
                favoritesCount: numericValue(l.favoritesCount, l.favorites_count) || 0,
                featured: Boolean(l.featured),
                vip: Boolean(l.vip),
                listingCode: firstDefined(l.listingCode, l.listing_code, l.code, ''),
                ownerName: firstDefined(l.user?.fullname, l.ownerName, l.agentName, ''),
                ownerAvatar: firstDefined(l.user?.avatarUrl, l.user?.avatar_url, ''),
                ownerPhone: firstDefined(l.user?.phone, l.ownerPhone, l.agentPhone, ''),
                ownerId: firstDefined(l.user?.id, l.userId, l.user_id, '')
            };
        }

        function dbVacancyToUi(v) {
            const isActive = v.isActive ?? v.is_active ?? true;
            return { id: v.id, title: v.title || '', type: v.employmentType || v.employment_type || '', salary: v.salary || '', location: v.city || '', desc: v.description || '', isActive, status: isActive ? 'Aktiv' : 'Bloklanıb', slug: v.slug || localSlug(v.title) };
        }

        function normalizeJsonArray(value) {
            if (Array.isArray(value)) return value.filter(Boolean);
            if (typeof value === 'string') {
                try {
                    const parsed = JSON.parse(value);
                    if (Array.isArray(parsed)) return parsed.filter(Boolean);
                } catch (_error) {
                    return value.split(',').map(item => item.trim()).filter(Boolean);
                }
            }
            return [];
        }

        function normalizeGalleryItem(item = {}) {
            const requestedMediaType = item.mediaType || item.media_type || item.type;
            const mediaType = String(requestedMediaType || '').toLowerCase() === 'video' ? 'video' : 'image';
            const isFeatured = Boolean(item.isFeatured ?? item.is_featured);
            const videoUrl = item.videoUrl || item.video_url || item.url || '';
            const thumbnailUrl = item.thumbnailUrl || item.thumbnail_url || item.thumbnail || '';
            const imageUrl = item.imageUrl || item.image_url || '';
            const images = normalizeJsonArray(item.images || item.mediaUrls || item.media_urls);
            return {
                ...item,
                type: mediaType === 'video' ? 'video' : 'event',
                mediaType,
                media_type: mediaType,
                isFeatured,
                is_featured: isFeatured,
                videoUrl,
                video_url: videoUrl,
                thumbnailUrl,
                thumbnail_url: thumbnailUrl,
                image: imageUrl,
                imageUrl,
                image_url: imageUrl,
                images
            };
        }

        function dbGalleryToUi(g) {
            const normalizedItem = normalizeGalleryItem(g || {});
            const mediaType = String(normalizedItem.mediaType || '').toLowerCase() === 'video' ? 'video' : 'image';
            const imageRows = normalizeJsonArray(g.images);
            const mediaRows = normalizeJsonArray(g.mediaUrls || g.media_urls);
            const createdAt = g.createdAt || g.created_at || new Date().toISOString();
            const thumbnailUrl = g.thumbnailUrl || g.thumbnail_url || g.thumbnail || '';
            const autoThumbnailUrl = g.autoThumbnailUrl || g.auto_thumbnail_url || '';
            const thumbnailFallbackUrl = g.thumbnailFallbackUrl || g.thumbnail_fallback_url || '';
            const imageUrl = g.imageUrl || g.image_url || g.image || '';
            const videoUrl = g.videoUrl || g.video_url || g.url || mediaRows[0] || '';
            const images = [...imageRows, ...(mediaType === 'image' ? [...mediaRows, imageUrl, thumbnailUrl] : [])]
                .map(x => String(x || '').trim())
                .filter((x, idx, all) => x && all.indexOf(x) === idx);
            const isFeatured = Boolean(normalizedItem.isFeatured ?? normalizedItem.is_featured);
            return mediaType === 'video'
                ? { ...g, id: g.id, title: g.title || '', type: 'video', mediaType: 'video', media_type: 'video', url: videoUrl, videoUrl, video_url: videoUrl, thumbnail: thumbnailUrl || autoThumbnailUrl || thumbnailFallbackUrl || imageUrl || '', thumbnailUrl, thumbnail_url: thumbnailUrl, thumbnailFallbackUrl, thumbnail_fallback_url: thumbnailFallbackUrl, autoThumbnailUrl, auto_thumbnail_url: autoThumbnailUrl, imageUrl, image_url: imageUrl, mediaUrls: mediaRows, media_urls: mediaRows, images: imageRows, desc: g.description || g.desc || '', createdAt, duration: g.duration || '', sortOrder: g.sortOrder ?? g.sort_order ?? 0, isFeatured, is_featured: isFeatured }
                : { ...g, id: g.id, title: g.title || '', type: 'event', mediaType: 'image', media_type: 'image', images, mediaUrls: mediaRows, media_urls: mediaRows, image: imageUrl, imageUrl, image_url: imageUrl, thumbnail: thumbnailUrl, thumbnailUrl, thumbnail_url: thumbnailUrl, desc: g.description || g.desc || '', createdAt, sortOrder: g.sortOrder ?? g.sort_order ?? 0, isFeatured: false, is_featured: false };
        }

        const AD_DIMENSION_DEFAULTS = { width: 160, height: 560, objectFit: 'cover' };
        const AD_DIMENSION_LIMITS = { minWidth: 80, maxWidth: 1000, minHeight: 80, maxHeight: 1200 };
        const AD_OBJECT_FITS = new Set(['cover', 'contain', 'fill']);

        function adDimension(value, fallback, min, max) {
            const parsed = Number.parseInt(value, 10);
            if (!Number.isFinite(parsed)) return fallback;
            return Math.min(max, Math.max(min, parsed));
        }

        function normalizeObjectFit(value) {
            const fit = String(value || AD_DIMENSION_DEFAULTS.objectFit).toLowerCase();
            return AD_OBJECT_FITS.has(fit) ? fit : AD_DIMENSION_DEFAULTS.objectFit;
        }

        function getAdDimensions(ad = {}) {
            return {
                width: adDimension(ad.widthPx ?? ad.width_px, AD_DIMENSION_DEFAULTS.width, AD_DIMENSION_LIMITS.minWidth, AD_DIMENSION_LIMITS.maxWidth),
                height: adDimension(ad.heightPx ?? ad.height_px, AD_DIMENSION_DEFAULTS.height, AD_DIMENSION_LIMITS.minHeight, AD_DIMENSION_LIMITS.maxHeight),
                objectFit: normalizeObjectFit(ad.objectFit ?? ad.object_fit)
            };
        }

        function dbAdToUi(ad = {}) {
            const dimensions = getAdDimensions(ad);
            return {
                id: ad.id,
                title: ad.title || '',
                mediaType: ad.mediaType || ad.media_type || 'image',
                mediaUrl: ad.mediaUrl || ad.media_url || ad.imageUrl || ad.image_url || '',
                clickUrl: ad.clickUrl || ad.click_url || ad.targetUrl || ad.target_url || '',
                position: ['left', 'right', 'both'].includes(String(ad.position || '').toLowerCase()) ? String(ad.position).toLowerCase() : 'left',
                displayOrder: Number(ad.displayOrder ?? ad.display_order ?? 0),
                rotationOrder: Number(ad.rotationOrder ?? ad.rotation_order ?? 0),
                repeatCount: adDimension(ad.repeatCount ?? ad.repeat_count, AD_DEFAULT_REPEAT_COUNT, AD_MIN_REPEAT_COUNT, AD_MAX_REPEAT_COUNT),
                displayDuration: adDimension(ad.displayDuration ?? ad.display_duration, AD_DEFAULT_DISPLAY_DURATION_SECONDS, AD_MIN_DISPLAY_DURATION_SECONDS, AD_MAX_DISPLAY_DURATION_SECONDS),
                widthPx: dimensions.width,
                width_px: dimensions.width,
                heightPx: dimensions.height,
                height_px: dimensions.height,
                objectFit: dimensions.objectFit,
                object_fit: dimensions.objectFit,
                isActive: Boolean(ad.isActive ?? ad.is_active),
                startDate: (ad.startDate || ad.start_date || '').slice(0, 10),
                endDate: (ad.endDate || ad.end_date || '').slice(0, 10),
                clickCount: Number(ad.clickCount ?? ad.click_count ?? 0),
                viewCount: Number(ad.viewCount ?? ad.view_count ?? 0),
                createdAt: ad.createdAt || ad.created_at || ''
            };
        }

        function adMediaStyle(ad, responsive = false) {
            const dimensions = getAdDimensions(ad);
            return responsive ? `--ad-width:${dimensions.width}px;--ad-height:${dimensions.height}px;width:var(--ad-width);height:var(--ad-height);object-fit:${dimensions.objectFit};` : `width:${dimensions.width}px;height:${dimensions.height}px;object-fit:${dimensions.objectFit};`;
        }

        function renderAdMedia(ad, classes = '', options = {}) {
            const url = escapeHtml(ad.mediaUrl || '');
            const title = escapeHtml(ad.title || 'Advertisement');
            const dimensions = getAdDimensions(ad);
            const style = adMediaStyle(ad, options.responsive);
            if (!url) return `<div class="p-4 text-xs text-gray-400" style="${options.responsive ? `--ad-width:${dimensions.width}px;--ad-height:${dimensions.height}px;width:var(--ad-width);height:var(--ad-height);` : `width:${dimensions.width}px;height:${dimensions.height}px;`}">Media yoxdur</div>`;
            if (ad.mediaType === 'video') {
                const loopAttr = options.loop === false ? '' : ' loop';
                const dataRole = options.rotation ? ` data-ad-rotation-video="true" data-ad-id="${escapeHtml(ad.id || '')}"` : '';
                const preload = options.eager ? 'auto' : 'metadata';
                return `<video class="${classes}" style="${style}" width="${dimensions.width}" height="${dimensions.height}" src="${url}" muted autoplay${loopAttr} playsinline preload="${preload}" title="${title}"${dataRole}></video>`;
            }
            const loading = options.eager ? 'eager' : 'lazy';
            const fetchPriority = options.eager ? ' fetchpriority="high"' : '';
            return `<img class="${classes}" style="${style}" width="${dimensions.width}" height="${dimensions.height}" src="${url}" alt="${title}" loading="${loading}" decoding="async"${fetchPriority}>`;
        }

        function createAdMediaNode(ad, classes = 'desktop-ad-media', options = {}) {
            const url = String(ad.mediaUrl || '').trim();
            const dimensions = getAdDimensions(ad);
            if (!url) {
                const empty = document.createElement('div');
                empty.className = 'p-4 text-xs text-gray-400';
                empty.textContent = 'Media yoxdur';
                empty.style.cssText = options.responsive ? `--ad-width:${dimensions.width}px;--ad-height:${dimensions.height}px;width:var(--ad-width);height:var(--ad-height);` : `width:${dimensions.width}px;height:${dimensions.height}px;`;
                return empty;
            }
            const media = document.createElement(ad.mediaType === 'video' ? 'video' : 'img');
            media.className = classes;
            media.style.cssText = adMediaStyle(ad, options.responsive);
            media.width = dimensions.width;
            media.height = dimensions.height;
            if (ad.mediaType === 'video') {
                media.src = url;
                media.muted = true;
                media.autoplay = true;
                media.loop = options.loop !== false;
                media.playsInline = true;
                media.preload = options.eager ? 'auto' : 'metadata';
                media.title = ad.title || 'Advertisement';
                if (options.rotation) {
                    media.dataset.adRotationVideo = 'true';
                    media.dataset.adId = ad.id || '';
                }
            } else {
                media.src = url;
                media.alt = ad.title || 'Advertisement';
                media.loading = options.eager ? 'eager' : 'lazy';
                media.decoding = 'async';
                if (options.eager) media.fetchPriority = 'high';
            }
            return media;
        }

        function preloadAdMedia(ad) {
            const url = String(ad?.mediaUrl || '').trim();
            if (!url) return Promise.reject(new Error('Ad media URL is empty'));
            if (ad.mediaType === 'video') {
                return new Promise((resolve, reject) => {
                    const video = document.createElement('video');
                    let settled = false;
                    const done = () => { if (!settled) { settled = true; resolve(url); } };
                    const fail = () => { if (!settled) { settled = true; reject(new Error('Ad video failed to load')); } };
                    video.preload = 'auto';
                    video.muted = true;
                    video.playsInline = true;
                    video.onloadeddata = done;
                    video.oncanplay = done;
                    video.onerror = fail;
                    video.src = url;
                    video.load();
                });
            }
            return new Promise((resolve, reject) => {
                if (loadedAdImages.has(url)) return resolve(url);
                const img = new Image();
                img.onload = () => { loadedAdImages.add(url); resolve(url); };
                img.onerror = () => reject(new Error('Ad image failed to load'));
                img.src = url;
            });
        }

        function setMusicSaveButtonLoading(isLoading) {
            setSubmitButtonLoading('music-save-submit-btn', Boolean(isLoading), 'Saxlanılır…', 'Yadda Saxla');
        }

        function musicFormValue(id) { return document.getElementById(id)?.value?.trim?.() || ''; }

        function buildMusicFormData() {
            const formData = new FormData();
            formData.append('title', musicFormValue('music-title'));
            formData.append('audioUrl', musicFormValue('music-audio-url'));
            formData.append('sortOrder', musicFormValue('music-sort-order') || '0');
            formData.append('isActive', document.getElementById('music-is-active')?.checked ? 'true' : 'false');
            const file = document.getElementById('music-audio-file')?.files?.[0];
            if (file) formData.append('audio', file);
            return formData;
        }

        function updateMusicAdminPreview() {
            const preview = document.getElementById('music-admin-form-preview');
            if (!preview) return;
            const file = document.getElementById('music-audio-file')?.files?.[0];
            const url = file ? URL.createObjectURL(file) : musicFormValue('music-audio-url');
            preview.classList.toggle('hidden', !url);
            if (url) preview.src = url;
        }

        function resetMusicForm() {
            ['edit-music-id', 'music-title', 'music-audio-url'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
            const sort = document.getElementById('music-sort-order');
            if (sort) sort.value = '0';
            const active = document.getElementById('music-is-active');
            if (active) active.checked = true;
            const file = document.getElementById('music-audio-file');
            if (file) file.value = '';
            const title = document.getElementById('music-form-title');
            if (title) title.textContent = 'Yeni musiqi';
            const preview = document.getElementById('music-admin-form-preview');
            if (preview) { preview.pause(); preview.removeAttribute('src'); preview.classList.add('hidden'); }
        }

        function renderAdminMusicTracks() {
            const list = document.getElementById('admin-music-list');
            if (!list) return;
            const tracks = orderedMusicTracks(appData.musicTracks || []);
            if (dataLoadState.musicTracks.loading && !tracks.length) {
                list.innerHTML = '<div class="glass-card p-6 rounded-2xl text-center text-sm text-gray-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Musiqi siyahısı yüklənir…</div>';
                return;
            }
            if (!tracks.length) {
                list.innerHTML = '<div class="glass-card p-6 rounded-2xl text-center text-sm font-bold text-gray-400">Musiqi əlavə edilməyib</div>';
                return;
            }
            list.innerHTML = tracks.map((track, index) => `
                <article class="admin-music-card glass-card p-4 rounded-2xl space-y-3" data-music-id="${escapeHtml(track.id)}">
                    <div class="flex flex-col md:flex-row md:items-center gap-3">
                        <div class="min-w-0 flex-1">
                            <div class="flex flex-wrap items-center gap-2">
                                <strong class="text-white">${escapeHtml(track.title)}</strong>
                                <span class="rounded-full ${track.isActive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-slate-300'} px-2 py-0.5 text-[10px] font-bold">${track.isActive ? 'Aktiv' : 'Passiv'}</span>
                                <span class="rounded-full bg-brand-500/15 text-brand-200 px-2 py-0.5 text-[10px] font-bold">#${index + 1}</span>
                            </div>
                            <div class="mt-1 truncate text-[11px] text-gray-400">${escapeHtml(track.audioUrl)}</div>
                        </div>
                        <div class="flex flex-wrap gap-2 shrink-0">
                            <button type="button" onclick="moveMusicTrack(${track.id}, -1)" ${index === 0 ? 'disabled' : ''} class="text-gray-300 px-3 py-2 bg-white/5 hover:bg-white/15 rounded-xl transition disabled:opacity-40"><i class="fa-solid fa-arrow-up"></i></button>
                            <button type="button" onclick="moveMusicTrack(${track.id}, 1)" ${index === tracks.length - 1 ? 'disabled' : ''} class="text-gray-300 px-3 py-2 bg-white/5 hover:bg-white/15 rounded-xl transition disabled:opacity-40"><i class="fa-solid fa-arrow-down"></i></button>
                            <button type="button" onclick="editMusicTrack(${track.id})" class="text-blue-400 px-3 py-2 bg-blue-500/10 hover:bg-blue-500 hover:text-white rounded-xl transition">Redaktə</button>
                            <button type="button" onclick="toggleMusicTrackStatus(${track.id}, ${!track.isActive})" class="${track.isActive ? 'text-yellow-300 bg-yellow-500/10 hover:bg-yellow-500' : 'text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500'} hover:text-white px-3 py-2 rounded-xl transition">${track.isActive ? 'Deaktiv et' : 'Aktiv et'}</button>
                            <button type="button" onclick="deleteMusicTrack(${track.id})" class="text-red-400 px-3 py-2 bg-red-500/10 hover:bg-red-500 hover:text-white rounded-xl transition"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                    <audio controls preload="metadata" class="w-full" src="${escapeHtml(track.audioUrl)}"></audio>
                </article>
            `).join('');
        }

        async function loadAdminMusicTracks({ force = true } = {}) {
            if (!isAdminRole(activeUser?.role) || !getAuthToken()) return [];
            if (dataLoadState.musicTracks.loading && !force) return appData.musicTracks || [];
            dataLoadState.musicTracks.loading = true;
            dataLoadState.musicTracks.error = '';
            renderAdminMusicTracks();
            try {
                const tracks = await apiRequest('/api/admin/site-music', { authRedirect: false });
                cacheData('musicTracks', orderedMusicTracks(tracks));
                siteMusicState.tracks = appData.musicTracks;
                dataLoadState.musicTracks.loaded = true;
                return appData.musicTracks;
            } catch (error) {
                dataLoadState.musicTracks.error = error.message;
                return appData.musicTracks || [];
            } finally {
                dataLoadState.musicTracks.loading = false;
                renderAdminMusicTracks();
                updateSiteMusicButton();
            }
        }

        async function handleSaveMusicTrack(event) {
            event.preventDefault();
            setMusicSaveButtonLoading(true);
            const editId = musicFormValue('edit-music-id');
            try {
                const saved = await apiRequest(editId ? `/api/admin/site-music/${editId}` : '/api/admin/site-music', editId ? 'PUT' : 'POST', buildMusicFormData());
                if (saved) upsertCachedItem('musicTracks', normalizeMusicTrack(saved));
                resetMusicForm();
                await loadAdminMusicTracks({ force: true });
                await loadSiteMusicBackground({ render: true, admin: false });
                showToast('✅ Musiqi yadda saxlanıldı.');
            } catch (error) {
                showToast('Musiqi yadda saxlanılmadı: ' + (error.message || 'Xəta'));
            } finally {
                setMusicSaveButtonLoading(false);
            }
        }

        function editMusicTrack(id) {
            const track = (appData.musicTracks || []).find(item => String(item.id) === String(id));
            if (!track) return;
            document.getElementById('edit-music-id').value = track.id;
            document.getElementById('music-title').value = track.title || '';
            document.getElementById('music-audio-url').value = track.audioUrl || '';
            document.getElementById('music-sort-order').value = track.sortOrder ?? 0;
            document.getElementById('music-is-active').checked = Boolean(track.isActive);
            const file = document.getElementById('music-audio-file');
            if (file) file.value = '';
            document.getElementById('music-form-title').textContent = 'Musiqini redaktə et';
            updateMusicAdminPreview();
        }

        async function toggleMusicTrackStatus(id, isActive) {
            const track = (appData.musicTracks || []).find(item => String(item.id) === String(id));
            if (!track) return;
            try {
                await apiRequest(`/api/admin/site-music/${id}`, { method: 'PUT', body: JSON.stringify({ ...track, isActive: Boolean(isActive) }) });
                await loadAdminMusicTracks({ force: true });
                await loadSiteMusicBackground({ render: true, admin: false });
                showToast('✅ Musiqi statusu yeniləndi.');
            } catch (error) {
                showToast('Musiqi statusu yenilənmədi: ' + (error.message || 'Xəta'));
            }
        }

        async function deleteMusicTrack(id) {
            if (!confirm('Musiqi silinsin?')) return;
            try {
                await apiRequest(`/api/admin/site-music/${id}`, { method: 'DELETE' });
                cacheData('musicTracks', (appData.musicTracks || []).filter(track => String(track.id) !== String(id)));
                await loadAdminMusicTracks({ force: true });
                await loadSiteMusicBackground({ render: true, admin: false });
                showToast('✅ Musiqi silindi.');
            } catch (error) {
                showToast('Musiqi silinmədi: ' + (error.message || 'Xəta'));
            }
        }

        async function moveMusicTrack(id, direction) {
            const tracks = orderedMusicTracks(appData.musicTracks || []);
            const index = tracks.findIndex(track => String(track.id) === String(id));
            const nextIndex = index + Number(direction || 0);
            if (index < 0 || nextIndex < 0 || nextIndex >= tracks.length) return;
            const reordered = tracks.slice();
            const [item] = reordered.splice(index, 1);
            reordered.splice(nextIndex, 0, item);
            cacheData('musicTracks', reordered.map((track, orderIndex) => ({ ...track, sortOrder: orderIndex + 1 })));
            renderAdminMusicTracks();
            try {
                const response = await apiRequest('/api/admin/site-music/reorder', { method: 'POST', body: JSON.stringify({ order: appData.musicTracks.map((track, orderIndex) => ({ id: track.id, sortOrder: orderIndex + 1 })) }) });
                if (Array.isArray(response?.items)) cacheData('musicTracks', response.items.map(normalizeMusicTrack));
                renderAdminMusicTracks();
                await loadSiteMusicBackground({ render: true, admin: false });
                showToast('✅ Musiqi sırası saxlanıldı.');
            } catch (error) {
                showToast('Musiqi sırası saxlanılmadı: ' + (error.message || 'Xəta'));
                await loadAdminMusicTracks({ force: true }).catch(() => {});
            }
        }

        function clearAdDropTargets() {
            document.querySelectorAll('#admin-ads-list .is-drop-target').forEach(card => card.classList.remove('is-drop-target'));
        }

        function startAdDrag(event, adId) {
            if (!activeUser || !isAdminRole(activeUser.role)) return;
            const card = event.target.closest('.admin-ad-card');
            const list = document.getElementById('admin-ads-list');
            if (!card || !list) return;
            event.preventDefault();
            card.classList.add('is-dragging');
            card.setPointerCapture?.(event.pointerId);
            const onPointerMove = (moveEvent) => {
                const target = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)?.closest?.('.admin-ad-card');
                if (!target || target === card || !list.contains(target)) return;
                clearAdDropTargets();
                target.classList.add('is-drop-target');
                const rect = target.getBoundingClientRect();
                list.insertBefore(card, moveEvent.clientY > rect.top + rect.height / 2 ? target.nextSibling : target);
            };
            const onPointerUp = () => {
                card.classList.remove('is-dragging');
                clearAdDropTargets();
                window.removeEventListener('pointermove', onPointerMove);
                persistAdOrderFromDom();
            };
            window.addEventListener('pointermove', onPointerMove, { passive: true });
            window.addEventListener('pointerup', onPointerUp, { once: true });
            window.addEventListener('pointercancel', onPointerUp, { once: true });
        }

        function dbAppToUi(a) {
            const [name, ...surnameParts] = String(a.fullname || '').split(' ');
            return { id: a.id, name: name || '', surname: surnameParts.join(' '), phone: a.phone || '', email: '', vacancy: a.vacancy?.title || '', fileName: a.cvFile || a.cv_file || '', cvFile: a.cvFile || a.cv_file || '', date: formatAzDate(a.createdAt || a.created_at || Date.now()), status: 'Gözləmədə' };
        }

        function userToUi(u) {
            const fullname = u.fullname || [u.firstName || u.first_name, u.lastName || u.last_name].filter(Boolean).join(' ');
            const [name, ...surnameParts] = String(fullname || '').trim().split(' ');
            return { id: u.id, fullname: fullname || u.email || '', name: name || fullname || '', surname: surnameParts.join(' '), phone: u.phone || '', email: u.email || '', role: u.role || 'user', pass: '********', createdAt: u.createdAt || u.created_at, updatedAt: u.updatedAt || u.updated_at, lastLogin: u.lastLogin || u.last_login || null, lastActiveAt: u.lastActiveAt || u.last_active_at || null, isOnline: Boolean(u.isOnline ?? u.is_online), onlineSessionsCount: Number(u.onlineSessionsCount ?? u.online_sessions_count ?? 0), statusText: u.statusText || u.status_text || ((u.isOnline ?? u.is_online) ? 'Online' : 'Offline'), bio: u.bio || '', isActive: u.isActive ?? u.is_active ?? true, avatarUrl: u.avatarUrl || u.avatar_url || '', listingsCount: u.listingsCount || 0, activeListingsCount: u.activeListingsCount || 0, approvedListingsCount: u.approvedListingsCount || 0, pendingListingsCount: u.pendingListingsCount || 0, rejectedListingsCount: u.rejectedListingsCount || 0, totalListingViews: u.totalListingViews || 0, totalFavorites: u.totalFavorites || 0, favoritesCount: u.favoritesCount || 0, profileCompletion: u.profileCompletion || 0, provider: u.provider || 'local', emailVerified: u.emailVerified ?? u.email_verified ?? false };
        }



        function agentNameById(id) {
            const user = (appData.agents || []).find(a => String(a.id) === String(id));
            return user ? (user.fullname || `${user.name || ''} ${user.surname || ''}`.trim()) : '';
        }

        function profileCompletionFor(user = {}) {
            let score = 0;
            if (user.avatarUrl || user.avatar_url) score += 25;
            if (user.phone) score += 25;
            if (user.bio) score += 25;
            if ((user.fullname || user.name) && user.email) score += 25;
            return score;
        }

        function avatarFallback(name = 'BestHome') {
            return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'BestHome')}&background=7F7FFF&color=fff`;
        }

        let adminListingStatusFilter = 'all';

        const appData = {
            dashboardStats: null,
            dashboardStatsLoading: false,
            dashboardStatsError: '',
            projectInquiries: [],
            favoriteListingIds: new Set(),
            projects: [],
            archivedProjects: [],
            listings: [],
            vacancies: defaultVacancies,
            gallery: [],
            applications: [],
            agents: defaultAgents,
            heroSlides: [],
            heroSection: null,
            listingHeroItems: [],
            ads: [],
            musicTracks: [],
            adStats: null,
            siteSettings: null,
            careerText: "BestHome komandası olaraq karyera qurmaq istəyən gənclərə geniş imkanlar yaradırıq."
        };

        const CACHE_KEYS = {
            projects: 'besthome_official_projects',
            listings: 'besthome_seabreeze',
            vacancies: 'besthome_vacancies',
            gallery: 'besthome_gallery',
            applications: 'besthome_applications',
            agents: 'besthome_agents',
            heroSlides: 'besthome_hero_slides',
            heroSection: 'besthome_hero_sea_breeze',
            listingHeroItems: 'besthome_listing_hero_items',
            careerText: 'besthome_career_text',
            ads: 'besthome_site_ads',
            musicTracks: 'besthome_site_music_tracks',
            siteSettings: 'besthome_site_settings',
            favoriteListingIds: 'besthome_favorite_listing_ids',
            seaBreezeHero: 'besthome_seabreeze_hero',
            seaBreezeSections: 'besthome_seabreeze_sections',
            seaBreezeGallery: 'besthome_seabreeze_gallery',
            adminStats: 'besthome_admin_stats'
        };
        window.appData = appData;
        window.CACHE_KEYS = CACHE_KEYS;



        async function cachedApiGet(name, endpoint, { force = false, ttl = CACHE_TTL_MS, authRedirect = true } = {}) {
            const cached = getCachedData(name);
            if (!force && cached && (!Array.isArray(cached) || cached.length)) return cached;
            const pendingKey = `${name}:${endpoint}`;
            if (pendingPromises.has(pendingKey)) return pendingPromises.get(pendingKey);
            const promise = apiRequest(endpoint, { authRedirect }).then(data => {
                const normalized = normalizeSeaBreezeList(data);
                const value = Array.isArray(data) || Array.isArray(data?.data) || Array.isArray(data?.items) ? normalized : data;
                cacheData(name, value, ttl);
                return value;
            }).finally(() => pendingPromises.delete(pendingKey));
            pendingPromises.set(pendingKey, promise);
            return promise;
        }

        function invalidateSeaBreezePublicCaches(...names) {
            names.forEach(name => invalidateCache(name));
            if (document.getElementById('tab-seabreeze-info') && !document.getElementById('tab-seabreeze-info').classList.contains('hidden')) {
                loadSeaBreezePage({ force: true }).catch(() => {});
            }
        }

        function extractFavoriteListingId(favorite = {}) {
            return firstDefined(favorite.listingId, favorite.listing_id, favorite.listing?.id, favorite.id);
        }

        function favoriteIdsFromRecords(records = []) {
            return new Set((Array.isArray(records) ? records : [])
                .map(extractFavoriteListingId)
                .map(id => String(id || '').trim())
                .filter(Boolean));
        }

        function cacheFavoriteListingIds(ids = appData.favoriteListingIds) {
            try {
                localStorage.setItem(CACHE_KEYS.favoriteListingIds, JSON.stringify(Array.from(ids || [])));
            } catch (_error) {
                // Favorite IDs are also stored on the server; localStorage is a best-effort UI cache.
            }
        }

        function readCachedFavoriteListingIds() {
            const cached = readCache(CACHE_KEYS.favoriteListingIds, []);
            return new Set((Array.isArray(cached) ? cached : []).map(id => String(id || '').trim()).filter(Boolean));
        }

        function logFavoritesDebug() {}

        function bootstrapCachedData() {
            appData.projects = readCache(CACHE_KEYS.projects, []);
            appData.listings = readCache(CACHE_KEYS.listings, []);
            appData.vacancies = readCache(CACHE_KEYS.vacancies, defaultVacancies);
            appData.gallery = readCache(CACHE_KEYS.gallery, []);
            appData.applications = readCache(CACHE_KEYS.applications, []);
            appData.agents = readCache(CACHE_KEYS.agents, defaultAgents);
            appData.heroSlides = normalizeHeroSlides(readCache(CACHE_KEYS.heroSlides, []), false);
            appData.heroSection = appData.heroSlides[0] || null;
            appData.listingHeroItems = normalizeListingHeroItems(readCache(CACHE_KEYS.listingHeroItems, []));
            appData.careerText = localStorage.getItem(CACHE_KEYS.careerText) || appData.careerText;
            appData.ads = readCache(CACHE_KEYS.ads, []);
            appData.musicTracks = readCache(CACHE_KEYS.musicTracks, []);
            appData.siteSettings = normalizeSiteSettings(readCache(CACHE_KEYS.siteSettings, DEFAULT_SITE_SETTINGS));
            appData.seaBreezeHero = readCache(CACHE_KEYS.seaBreezeHero, []);
            appData.seaBreezeSections = readCache(CACHE_KEYS.seaBreezeSections, []);
            appData.seaBreezeGallery = readCache(CACHE_KEYS.seaBreezeGallery, []);
            appData.dashboardStats = readCache(CACHE_KEYS.adminStats, appData.dashboardStats);
            appData.favoriteListingIds = readCachedFavoriteListingIds();
        }

        function fillHeroAdminForm(slide = null) {
            const fallbackType = slide ? 'custom' : 'project';
            const hero = normalizeHeroSlide(slide || { ...defaultSeaBreezeHero, slide_type: fallbackType, display_order: (appData.heroSlides || []).length + 1 });
            const fields = {
                'hero-slide-id': slide?.id || '',
                'hero-title-input': hero.slide_type === 'project' ? '' : (hero.title || ''),
                'hero-description-input': hero.description || '',
                'hero-slide-type-input': hero.slide_type || fallbackType,
                'hero-project-id-input': hero.project_id || '',
                'hero-media-type-input': hero.media_type || 'image',
                'hero-media-url-input': hero.slide_type === 'project' ? '' : (hero.media_url || ''),
                'hero-button-text-input': hero.button_text || 'Layihəyə Bax →',
                'hero-button-link-input': hero.slide_type === 'project' ? '' : (hero.button_link || ''),
                'hero-badge-text-input': hero.badge_text || '',
                'hero-badge-color-input': hero.badge_color || '#C8A96A',
                'hero-badge-background-input': hero.badge_background || '#111827',
                'hero-title-color-input': hero.title_color || '#FFFFFF',
                'hero-button-color-input': hero.button_color || '#FFFFFF',
                'hero-button-text-color-input': hero.button_text_color || '#111827',
                'hero-display-order-input': hero.display_order ?? 0,
                'hero-duration-input': hero.slide_duration || 10,
            };
            Object.entries(fields).forEach(([id, value]) => { const input = document.getElementById(id); if (input) input.value = value; });
            const active = document.getElementById('hero-is-active-input');
            if (active) active.checked = hero.is_active !== false;
            const file = document.getElementById('hero-media-file-input');
            if (file) file.value = '';
            const label = document.getElementById('hero-existing-media-label');
            if (label) label.textContent = slide?.media_url ? `Mövcud media_url saxlanılacaq: ${slide.media_url}` : 'Layihə mode layihənin image_url dəyərindən istifadə edir. Custom mode media_url və ya upload istifadə edir.';
            handleHeroSlideTypeChange(false);
            document.getElementById('hero-form-submit').textContent = slide?.id ? 'Slaydı Yenilə' : 'Slayd Yarat';
            updateHeroAdminPreview(slide);
        }

        function resetHeroSlideForm() {
            fillHeroAdminForm(null);
        }

        function getSelectedHeroProject() {
            const id = document.getElementById('hero-project-id-input')?.value;
            return getOfficialProjects().find(item => String(item.id) === String(id)) || null;
        }

        function handleHeroSlideTypeChange(refresh = true) {
            const isProject = (document.getElementById('hero-slide-type-input')?.value || 'project') === 'project';
            document.getElementById('hero-project-field')?.classList.toggle('hidden', !isProject);
            document.getElementById('hero-custom-fields')?.classList.toggle('hidden', isProject);
            document.getElementById('hero-custom-extra-fields')?.classList.toggle('hidden', isProject);
            if (isProject) {
                const project = getSelectedHeroProject();
                const buttonLink = document.getElementById('hero-button-link-input');
                if (buttonLink) buttonLink.value = project ? projectPath(project) : '';
                const buttonText = document.getElementById('hero-button-text-input');
                if (buttonText) buttonText.value = 'Layihəyə Bax →';
            }
            if (refresh) handleHeroProjectChange();
        }

        function handleHeroProjectChange() {
            const isProject = (document.getElementById('hero-slide-type-input')?.value || 'project') === 'project';
            const project = isProject ? getSelectedHeroProject() : null;
            if (project) {
                const buttonLink = document.getElementById('hero-button-link-input');
                if (buttonLink) buttonLink.value = projectPath(project);
                const buttonText = document.getElementById('hero-button-text-input');
                if (buttonText && !buttonText.value.trim()) buttonText.value = 'Layihəyə Bax →';
            }
            updateHeroAdminPreview();
        }

        function getHeroPreviewUrl(existing = null) {
            const file = document.getElementById('hero-media-file-input')?.files?.[0];
            if (heroPreviewObjectUrl) URL.revokeObjectURL(heroPreviewObjectUrl);
            heroPreviewObjectUrl = file ? URL.createObjectURL(file) : '';
            const project = (document.getElementById('hero-slide-type-input')?.value || 'project') === 'project' ? getSelectedHeroProject() : null;
            const urlValue = document.getElementById('hero-media-url-input')?.value?.trim();
            return heroPreviewObjectUrl || project?.img || urlValue || existing?.media_url || DEFAULT_SEA_BREEZE_HERO_IMAGE;
        }

        function readHeroFormPreview(existing = null) {
            const project = getSelectedHeroProject();
            const slideType = document.getElementById('hero-slide-type-input')?.value || 'project';
            const mediaUrl = getHeroPreviewUrl(existing);
            const mediaType = /\.(mp4|webm|mov)(\?|#|$)/i.test(mediaUrl) ? 'video' : (document.getElementById('hero-media-type-input')?.value || 'image');
            return normalizeHeroSlide({
                ...(existing || {}),
                slide_type: slideType,
                project_id: document.getElementById('hero-project-id-input')?.value || '',
                project: slideType === 'project' ? project : existing?.project,
                title: slideType === 'project' ? (project?.title || '') : (document.getElementById('hero-title-input')?.value || defaultSeaBreezeHero.title),
                description: slideType === 'project' ? '' : (document.getElementById('hero-description-input')?.value || ''),
                media_type: mediaType,
                media_url: mediaUrl,
                button_text: slideType === 'project' ? 'Layihəyə Bax →' : (document.getElementById('hero-button-text-input')?.value || 'Layihəyə Bax →'),
                button_link: slideType === 'project' && project ? projectPath(project) : (document.getElementById('hero-button-link-input')?.value || defaultSeaBreezeHero.button_link),
                badge_text: document.getElementById('hero-badge-text-input')?.value || '',
                badge_color: document.getElementById('hero-badge-color-input')?.value || '#C8A96A',
                badge_background: document.getElementById('hero-badge-background-input')?.value || '#111827',
                title_color: document.getElementById('hero-title-color-input')?.value || '#FFFFFF',
                button_color: document.getElementById('hero-button-color-input')?.value || '#FFFFFF',
                button_text_color: document.getElementById('hero-button-text-color-input')?.value || '#111827',
                slide_duration: Number(document.getElementById('hero-duration-input')?.value || 10)
            });
        }

        function updateHeroAdminPreview(existing = null) {
            const currentId = document.getElementById('hero-slide-id')?.value;
            const currentSlide = existing || (appData.heroSlides || []).find(item => String(item.id) === String(currentId)) || null;
            const hero = readHeroFormPreview(currentSlide);
            const media = document.getElementById('hero-preview-media');
            if (media) {
                media.innerHTML = '';
                media.style.backgroundImage = '';
                if (hero.media_type === 'video') {
                    media.innerHTML = `<video src="${escapeHtml(hero.media_url)}" class="w-full h-full object-cover" autoplay muted loop playsinline></video>`;
                } else {
                    media.style.backgroundImage = `url('${hero.media_url}')`;
                }
            }
            const preview = document.getElementById('hero-admin-preview');
            const panel = document.getElementById('hero-preview-panel');
            const titleEl = document.getElementById('hero-preview-title');
            const descEl = document.getElementById('hero-preview-description');
            const buttonEl = document.getElementById('hero-preview-button');
            const badgeEl = document.getElementById('hero-preview-badge');
            const durationEl = document.getElementById('hero-preview-duration');
            if (titleEl) titleEl.innerHTML = formatHeroTitle(hero.title);
            if (buttonEl) buttonEl.textContent = hero.button_text;
            applyHeroVisualStyles(preview, panel, titleEl, descEl, buttonEl, badgeEl, hero);
            if (durationEl) durationEl.textContent = `${Number.isFinite(hero.slide_duration) && hero.slide_duration > 0 ? hero.slide_duration : 10} saniyə`;
        }

        async function handleSaveHeroSlide(e) {
            e.preventDefault();
            if (!activeUser || !isAdminRole(activeUser.role) || isHeroSaveSubmitting) return;
            const id = document.getElementById('hero-slide-id').value;
            const file = document.getElementById('hero-media-file-input')?.files?.[0];
            const slideType = document.getElementById('hero-slide-type-input').value;
            const mediaUrl = document.getElementById('hero-media-url-input')?.value.trim();
            const projectId = document.getElementById('hero-project-id-input').value;
            if (slideType === 'project' && !projectId) return alert('Layihə mode üçün layihə seçin.');
            if (slideType === 'custom' && !id && !file && !mediaUrl) return alert('Custom hero üçün media URL və ya upload tələb olunur.');
            if (slideType === 'custom' && !document.getElementById('hero-title-input')?.value.trim()) return alert('Custom hero üçün başlıq daxil edin.');
            isHeroSaveSubmitting = true;
            setHeroSaveButtonLoading(true);
            const formData = new FormData();
            const fieldIds = {
                title: 'hero-title-input', description: 'hero-description-input', slide_type: 'hero-slide-type-input', project_id: 'hero-project-id-input',
                media_type: 'hero-media-type-input', media_url: 'hero-media-url-input', button_text: 'hero-button-text-input', button_link: 'hero-button-link-input',
                badge_text: 'hero-badge-text-input', badge_color: 'hero-badge-color-input', badge_background: 'hero-badge-background-input', title_color: 'hero-title-color-input',
                button_color: 'hero-button-color-input', button_text_color: 'hero-button-text-color-input', display_order: 'hero-display-order-input', slide_duration: 'hero-duration-input'
            };
            Object.entries(fieldIds).forEach(([key, inputId]) => formData.append(key, document.getElementById(inputId)?.value?.trim?.() ?? document.getElementById(inputId)?.value ?? ''));
            formData.append('is_active', document.getElementById('hero-is-active-input').checked ? 'true' : 'false');
            if (file) formData.append('media', file);
            try {
                await apiRequest(id ? `/api/hero-slides/${id}` : '/api/hero-slides', id ? 'PUT' : 'POST', formData);
                await loadAdminHeroSlides();
                resetHeroSlideForm();
                const success = document.getElementById('hero-save-success');
                if (success) {
                    success.classList.remove('hidden');
                    setTimeout(() => success.classList.add('hidden'), 4000);
                }
            } catch (error) {
                alert('Hero slayd saxlanılmadı: ' + error.message);
            } finally {
                isHeroSaveSubmitting = false;
                setHeroSaveButtonLoading(false);
            }
        }

        async function loadAdminHeroSlides() {
            const slides = await apiRequest('/api/hero-slides?admin=1').catch(() => appData.heroSlides || []);
            cacheData('heroSlides', normalizeHeroSlides(slides, false));
            isHeroSlidesLoaded = true;
            renderAdminHeroSlides();
            renderSeaBreezeHero(0);
        }

        function renderAdminHeroSlides() {
            const list = document.getElementById('admin-hero-slides-list');
            if (!list) return;
            const slides = normalizeHeroSlides(appData.heroSlides, false);
            list.innerHTML = slides.length ? slides.map((slide, index) => `
                <div class="glass-card p-4 rounded-xl flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between text-xs ${slide.is_active ? '' : 'opacity-55 grayscale'}">
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="w-[88px] h-[64px] rounded-xl overflow-hidden bg-white/5 shrink-0">${slide.media_type === 'video' ? `<video src="${escapeHtml(slide.media_url)}" class="w-full h-full object-cover" muted playsinline></video>` : `<img src="${escapeHtml(slide.media_url)}" class="w-full h-full object-cover" alt="">`}</div>
                        <div class="min-w-0">
                            <h3 class="font-bold text-white truncate">${escapeHtml(slide.title)}</h3>
                            <div class="text-gray-400">${slide.media_type} • order ${slide.display_order} • ${slide.slide_duration}s • ${slide.button_text || 'buttonsuz'}</div>
                        </div>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <button data-hero-reorder-id="${slide.id}" data-hero-reorder-direction="-1" onclick="moveHeroSlide('${slide.id}', -1, this)" ${index === 0 ? 'disabled' : ''} class="text-gray-300 px-2 py-1 bg-white/5 rounded disabled:opacity-40" aria-label="Hero slaydı yuxarı çək">↑</button>
                        <button data-hero-reorder-id="${slide.id}" data-hero-reorder-direction="1" onclick="moveHeroSlide('${slide.id}', 1, this)" ${index === slides.length - 1 ? 'disabled' : ''} class="text-gray-300 px-2 py-1 bg-white/5 rounded disabled:opacity-40" aria-label="Hero slaydı aşağı çək">↓</button>
                        <button onclick="editHeroSlide('${slide.id}')" class="text-blue-400 px-2 py-1 bg-blue-500/10 rounded">Redaktə</button>
                        <button onclick="toggleHeroSlide('${slide.id}', ${!slide.is_active})" class="${slide.is_active ? 'text-emerald-500 bg-emerald-500/10' : 'text-yellow-500 bg-yellow-500/10'} px-2 py-1 rounded">${slide.is_active ? 'Aktiv' : 'Deaktiv'}</button>
                        <button onclick="deleteHeroSlide('${slide.id}')" class="text-red-400 px-2 py-1 bg-red-500/10 rounded"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>`).join('') : '<div class="glass-card p-6 rounded-xl text-center text-gray-400 text-sm">Hero slayd yoxdur.</div>';
        }

        function editHeroSlide(id) {
            const slide = (appData.heroSlides || []).find(item => String(item.id) === String(id));
            if (slide) fillHeroAdminForm(slide);
        }

        async function toggleHeroSlide(id, isActive) {
            try {
                await apiRequest(`/api/hero-slides/${id}/toggle`, { method: 'PATCH', body: JSON.stringify({ is_active: isActive }) });
                await loadAdminHeroSlides();
            } catch (error) {
                alert('Hero slayd statusu dəyişmədi: ' + error.message);
            }
        }

        async function deleteHeroSlide(id) {
            if (!confirm('Bu hero slaydı silmək istədiyinizə əminsiniz?')) return;
            try {
                await apiRequest(`/api/hero-slides/${id}`, { method: 'DELETE' });
                await loadAdminHeroSlides();
            } catch (error) {
                alert('Hero slayd silinmədi: ' + error.message);
            }
        }

        async function moveHeroSlide(id, direction, button = null) {
            const previousSlides = normalizeHeroSlides(appData.heroSlides, false);
            const slides = previousSlides.map(slide => ({ ...slide }));
            const index = slides.findIndex(slide => String(slide.id) === String(id));
            const nextIndex = index + direction;
            if (index < 0 || nextIndex < 0 || nextIndex >= slides.length) return;

            [slides[index], slides[nextIndex]] = [slides[nextIndex], slides[index]];
            const optimisticSlides = slides.map((slide, idx) => ({ ...slide, display_order: idx + 1 }));
            const items = optimisticSlides.map(slide => ({ id: slide.id, display_order: slide.display_order }));
            const originalButtonHtml = button ? button.innerHTML : '';

            cacheData('heroSlides', optimisticSlides);
            renderAdminHeroSlides();
            renderSeaBreezeHero(0);

            const activeButton = document.querySelector(`#admin-hero-slides-list button[data-hero-reorder-id="${CSS.escape(String(id))}"][data-hero-reorder-direction="${direction}"]`);
            if (activeButton) {
                activeButton.disabled = true;
                activeButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                activeButton.setAttribute('aria-busy', 'true');
            } else if (button) {
                button.disabled = true;
                button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                button.setAttribute('aria-busy', 'true');
            }

            try {
                const saved = await apiRequest('/api/hero-slides/reorder', { method: 'PATCH', body: JSON.stringify({ items }) });
                cacheData('heroSlides', normalizeHeroSlides(saved, false));
                renderAdminHeroSlides();
                renderSeaBreezeHero(0);
                showToast('✅ Hero sırası yeniləndi.');
            } catch (error) {
                cacheData('heroSlides', previousSlides);
                renderAdminHeroSlides();
                renderSeaBreezeHero(0);
                alert('Hero slayd sırası dəyişmədi: ' + error.message);
            } finally {
                if (button) {
                    button.disabled = false;
                    button.innerHTML = originalButtonHtml;
                    button.removeAttribute('aria-busy');
                }
            }
        }



        async function loadAdminListingHeroItems() {
            try {
                const items = await apiRequest('/api/listing-hero-items?admin=1').catch(() => appData.listingHeroItems || []);
                cacheData('listingHeroItems', normalizeListingHeroItems(items));
                renderAdminListingHeroItems();
                renderAdminDashboard();
                renderListingHero(0);
            } catch (error) {
                alert('Elan hero siyahısı oxunmadı: ' + error.message);
            }
        }

        function listingHeroItemForListing(listingId) {
            return (appData.listingHeroItems || []).find(item => String(item.listing_id) === String(listingId));
        }

        function fillListingHeroForm(item = null) {
            const fields = {
                'listing-hero-item-id': item?.id || '',
                'listing-hero-badge-input': item?.badge_text || '',
                'listing-hero-duration-input': item?.slide_duration || 10,
                'listing-hero-title-input': item?.custom_title || '',
                'listing-hero-media-input': item?.hero_media_url || '',
            };
            Object.entries(fields).forEach(([id, value]) => { const el = document.getElementById(id); if (el) el.value = value; });
            const active = document.getElementById('listing-hero-active-input');
            if (active) active.checked = item?.is_active ?? true;
        }

        function resetListingHeroForm() { fillListingHeroForm(null); }

        function editListingHeroItem(id) {
            const item = (appData.listingHeroItems || []).find(row => String(row.id) === String(id));
            if (item) fillListingHeroForm(item);
        }

        async function handleSaveListingHeroItem(event) {
            event.preventDefault();
            const id = document.getElementById('listing-hero-item-id')?.value;
            if (!id) return alert('Əvvəlcə siyahıdan hero elanı redaktə edin və ya elan idarəsində “Hero əlavə et” seçin.');
            const payload = {
                badge_text: document.getElementById('listing-hero-badge-input')?.value || '',
                slide_duration: Number(document.getElementById('listing-hero-duration-input')?.value || 10),
                custom_title: document.getElementById('listing-hero-title-input')?.value || '',
                hero_media_url: document.getElementById('listing-hero-media-input')?.value || '',
                is_active: document.getElementById('listing-hero-active-input')?.checked ?? true,
            };
            try {
                await apiRequest(`/api/listing-hero-items/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
                await loadAdminListingHeroItems();
                resetListingHeroForm();
            } catch (error) {
                alert('Elan hero saxlanılmadı: ' + error.message);
            }
        }

        async function addListingToHero(listingId, button = null) {
            const restore = beginAdminAction(button, `listing-hero-add:${listingId}`, 'Əlavə edilir...');
            if (!restore) return;
            try {
                const created = await apiRequest('/api/listing-hero-items', { method: 'POST', body: JSON.stringify({ listing_id: listingId, badge_text: '🔥 Premium Elan', slide_duration: 10, is_active: true }) });
                cacheData('listingHeroItems', normalizeListingHeroItems([...(appData.listingHeroItems || []), created]));
                await loadAdminListingHeroItems();
                if (isAdminRole(activeUser?.role)) await loadAdminListings({ render: false }).catch(() => {});
                fillListingHeroForm(normalizeListingHeroItem(created));
                renderAdminDashboard();
                showToast('✅ Elan hero-ya əlavə edildi.');
            } catch (error) {
                alert('Elan hero-ya əlavə olunmadı: ' + error.message);
            } finally {
                finishAdminAction(restore);
            }
        }

        async function removeListingFromHero(listingIdOrItemId, byItem = false, button = null) {
            if (!confirm('Bu elanı hero-dan çıxarmaq istəyirsiniz?')) return;
            const restore = beginAdminAction(button, `listing-hero-remove:${byItem}:${listingIdOrItemId}`, 'Silinir...');
            if (!restore) return;
            try {
                const url = byItem ? `/api/listing-hero-items/${listingIdOrItemId}` : `/api/listing-hero-items/listing/${listingIdOrItemId}`;
                await apiRequest(url, { method: 'DELETE' });
                const currentItems = appData.listingHeroItems || [];
                cacheData('listingHeroItems', normalizeListingHeroItems(currentItems.filter(item => byItem ? String(item.id) !== String(listingIdOrItemId) : String(item.listing_id) !== String(listingIdOrItemId))));
                await loadAdminListingHeroItems();
                if (isAdminRole(activeUser?.role)) await loadAdminListings({ render: false }).catch(() => {});
                resetListingHeroForm();
                renderAdminDashboard();
                showToast('✅ Elan hero-dan çıxarıldı.');
            } catch (error) {
                alert('Elan hero-dan çıxarılmadı: ' + error.message);
            } finally {
                finishAdminAction(restore);
            }
        }

        async function toggleListingHeroItem(id, isActive, button = null) {
            const restore = beginAdminAction(button, `listing-hero-toggle:${id}`, 'Yenilənir...');
            if (!restore) return;
            try {
                await apiRequest(`/api/listing-hero-items/${id}/toggle`, { method: 'PATCH', body: JSON.stringify({ is_active: isActive }) });
                cacheData('listingHeroItems', normalizeListingHeroItems((appData.listingHeroItems || []).map(item => String(item.id) === String(id) ? { ...item, is_active: isActive } : item)));
                await loadAdminListingHeroItems();
                showToast('✅ Hero statusu yeniləndi.');
            } catch (error) {
                alert('Elan hero statusu dəyişmədi: ' + error.message);
            } finally {
                finishAdminAction(restore);
            }
        }

        async function moveListingHeroItem(id, direction, button = null) {
            const items = normalizeListingHeroItems(appData.listingHeroItems || []);
            const index = items.findIndex(item => String(item.id) === String(id));
            const nextIndex = index + direction;
            if (index < 0 || nextIndex < 0 || nextIndex >= items.length) return;
            [items[index], items[nextIndex]] = [items[nextIndex], items[index]];
            await saveListingHeroOrder(items, button);
        }

        async function saveListingHeroOrder(items, button = null) {
            const restore = beginAdminAction(button, 'listing-hero-order', 'Yenilənir...');
            if (!restore) return;
            try {
                const saved = await apiRequest('/api/listing-hero-items/reorder', { method: 'PATCH', body: JSON.stringify({ items: items.map((item, index) => ({ id: item.id, sort_order: index + 1 })) }) });
                cacheData('listingHeroItems', normalizeListingHeroItems(saved));
                renderAdminListingHeroItems();
                renderListingHero(0);
                showToast('✅ Hero sırası yeniləndi.');
            } catch (error) {
                alert('Elan hero sırası dəyişmədi: ' + error.message);
            } finally {
                finishAdminAction(restore);
            }
        }

        function renderAdminListingHeroItems() {
            const list = document.getElementById('admin-listing-hero-list');
            if (!list) return;
            const items = normalizeListingHeroItems(appData.listingHeroItems || []);
            list.innerHTML = items.length ? items.map((item, index) => {
                const listing = listingHeroListing(item);
                const image = item.media_url || listing.img || listing.images?.[0] || '';
                return `<div draggable="true" ondragstart="this.dataset.dragging='1'; window.__listingHeroDrag='${item.id}'" ondragover="event.preventDefault()" ondrop="handleListingHeroDrop(event, '${item.id}')" class="glass-card p-4 rounded-xl flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between text-xs ${item.is_active ? '' : 'opacity-55 grayscale'}">
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="w-[96px] h-[68px] rounded-xl overflow-hidden bg-white/5 shrink-0">${item.media_type === 'video' ? `<video src="${escapeHtml(image)}" class="w-full h-full object-cover" muted playsinline></video>` : `<img src="${escapeHtml(image)}" class="w-full h-full object-cover" loading="lazy" alt="">`}</div>
                        <div class="min-w-0 space-y-1">
                            <h3 class="font-bold text-white truncate">${escapeHtml(item.title || listing.title || '—')}</h3>
                            <div class="text-gray-400">Kod: ${formatListingCode(listing.listingCode)} • ${formatPrice(listing.price, listing.currency || 'AZN')} • ${item.region || '—'} • ${item.slide_duration}s</div>
                            <div class="text-gray-500">${escapeHtml(item.badge_text || 'Badge yoxdur')} • ${item.is_active ? 'Aktiv' : 'Deaktiv'}</div>
                        </div>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <button onclick="moveListingHeroItem('${item.id}', -1, this)" ${index === 0 ? 'disabled' : ''} class="text-gray-300 px-2 py-1 bg-white/5 rounded disabled:opacity-40">⬆️</button>
                        <button onclick="moveListingHeroItem('${item.id}', 1, this)" ${index === items.length - 1 ? 'disabled' : ''} class="text-gray-300 px-2 py-1 bg-white/5 rounded disabled:opacity-40">⬇️</button>
                        <button onclick="runInstantAdminAction(this, 'Yenilənir...', () => editListingHeroItem('${item.id}'))" class="text-blue-400 px-2 py-1 bg-blue-500/10 rounded">✏️ Redaktə et</button>
                        <button onclick="toggleListingHeroItem('${item.id}', ${!item.is_active}, this)" class="${item.is_active ? 'text-emerald-500 bg-emerald-500/10' : 'text-yellow-500 bg-yellow-500/10'} px-2 py-1 rounded">${item.is_active ? 'Aktiv' : 'Deaktiv'}</button>
                        <button onclick="removeListingFromHero('${item.id}', true, this)" class="text-red-400 px-2 py-1 bg-red-500/10 rounded">❌ Hero-dan çıxar</button>
                    </div>
                </div>`;
            }).join('') : '<div class="glass-card p-6 rounded-xl text-center text-gray-400 text-sm">Elan hero boşdur. Elan idarəsində “⭐ Hero əlavə et” düyməsindən istifadə edin.</div>';
        }

        function handleListingHeroDrop(event, targetId) {
            event.preventDefault();
            const sourceId = window.__listingHeroDrag;
            if (!sourceId || sourceId === targetId) return;
            const items = normalizeListingHeroItems(appData.listingHeroItems || []);
            const from = items.findIndex(item => String(item.id) === String(sourceId));
            const to = items.findIndex(item => String(item.id) === String(targetId));
            if (from < 0 || to < 0) return;
            const [moved] = items.splice(from, 1);
            items.splice(to, 0, moved);
            saveListingHeroOrder(items);
        }

        function uiProjectToApi(p) {
            return {
                title: p.title,
                category: p.category,
                zone: p.zone,
                delivery_date: p.year,
                coastline: p.coastline,
                sea_distance: p.seaDistance,
                building_count: p.buildings,
                floor_count: p.floors,
                area: p.area,
                area_range: p.area,
                apartment_count: p.apartments,
                parking_spaces: p.parking,
                repair_status: p.repairStatus || p.repair,
                apartment_formats: p.apartmentFormats,
                apartment_areas: p.apartmentAreas,
                price_per_m2: p.pricePerM2,
                total_price: p.totalPrice,
                bank_mortgage: p.bankMortgage,
                internal_credit: p.internalCredit,
                down_payment: p.downPayment,
                infrastructure: p.infrastructure,
                features: Array.isArray(p.features) ? p.features.join(' / ') : p.features,
                description: p.desc,
                image_url: p.img,
                images: normalizeProjectImages(p.images, p.img),
                display_order: p.displayOrder ?? p.display_order,
                slug: p.slug,
                featured_in_hero: Boolean(p.featuredInHero ?? p.featured_in_hero),
                is_archived: Boolean(p.isArchived ?? p.is_archived),
                pdf_url: p.pdfUrl || p.pdf_url || undefined,
                pdf_filename: p.pdfFilename || p.pdf_filename || undefined,
                aliases: p.aliases || undefined,
                latitude: safeNumber(p.latitude),
                longitude: safeNumber(p.longitude),
                map_location_verified: Boolean(p.mapLocationVerified ?? p.map_location_verified),
                map_location_label: p.mapLocationLabel || p.map_location_label || undefined
            };
        }

        function safeNumber(value) {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : undefined;
        }

        function uiListingToApi(l) {
            const area = safeNumber(l.area);
            const price = safeNumber(l.price);
            const roomCount = Number.parseInt(l.rooms, 10);
            const floorNumber = Number.parseInt(l.floorNumber ?? l.floor, 10);
            const floorCount = Number.parseInt(l.floorCount ?? l.floor, 10);
            return {
                title: l.title || '',
                listing_type: listingTypeLabel(l.listingType || 'Satis'),
                property_category: l.category || 'Apartment',
                project_name: l.regionType === 'seabreeze' ? (l.project || 'Digər') : '',
                region_type: l.regionType || 'seabreeze',
                city: l.city || (l.regionType === 'general' ? legacyRegionToCity(l.generalCityRegion) : ''),
                district: l.district || (l.regionType === 'seabreeze' ? (l.project || 'Digər') : ''),
                settlement: l.settlement || '',
                neighborhood: l.neighborhood || '',
                metro_station: l.metroStation || '',
                street_address: l.streetAddress || '',
                latitude: safeNumber(l.latitude),
                longitude: safeNumber(l.longitude),
                room_count: Number.isFinite(roomCount) ? roomCount : undefined,
                area,
                floor_number: Number.isFinite(floorNumber) && floorNumber > 0 ? floorNumber : 1,
                floor_count: String(Number.isFinite(floorCount) && floorCount > 0 ? floorCount : 1),
                price,
                price_per_m2: isSaleListing(l.listingType) && area && price ? price / area : undefined,
                image_url: l.img || '',
                currency: l.currency || 'AZN',
                is_credit: Boolean(l.isCredit),
                owner_type: l.ownerType || 'owner',
                has_document: Boolean(l.hasDocument),
                credit_down_payment: l.creditDownPayment,
                credit_monthly_payment: l.creditMonthlyPayment,
                credit_years: l.creditYears,
                images: Array.isArray(l.images) ? l.images : (l.img ? [l.img] : []),
                description: l.desc || '',
                user_id: activeUser?.role === 'user' ? activeUser.id : undefined
            };
        }

        function uiVacancyToApi(v) {
            return {
                title: v.title,
                employment_type: v.type,
                salary: v.salary,
                city: v.location,
                description: v.desc,
                is_active: v.isActive ?? v.status !== 'Bloklanıb',
                slug: v.slug
            };
        }

        const getYouTubeVideoId = window.BestHomeGallery.getYouTubeVideoId;
        const getYouTubeThumbnail = window.BestHomeGallery.getYouTubeThumbnail;
        const getYouTubeThumbnailFallback = window.BestHomeGallery.getYouTubeThumbnailFallback;

        const getGalleryVideoThumbnail = window.BestHomeGallery.getGalleryVideoThumbnail;
        const getGalleryVideoThumbnailFallback = window.BestHomeGallery.getGalleryVideoThumbnailFallback;
        const handleGalleryThumbnailError = window.BestHomeGallery.handleGalleryThumbnailError;
        const galleryVideoPlaceholderMarkup = window.BestHomeGallery.galleryVideoPlaceholderMarkup;
        const getVimeoThumbnail = window.BestHomeGallery.getVimeoThumbnail;
        const normalizeGalleryVideoUrl = window.BestHomeGallery.normalizeGalleryVideoUrl;

        function uiGalleryToApi(g) {
            const isVideo = String(g.media_type || g.mediaType || g.type).toLowerCase() === 'video';
            const images = normalizeJsonArray(g.images);
            const mediaUrls = normalizeJsonArray(g.mediaUrls || g.media_urls);
            const videoUrl = g.video_url || g.videoUrl || g.url || mediaUrls[0] || '';
            const imageUrl = g.image_url || g.imageUrl || g.image || images[0] || '';
            const thumbnailUrl = g.thumbnail_url || g.thumbnailUrl || g.thumbnail || getYouTubeThumbnail(videoUrl) || getVimeoThumbnail(videoUrl) || '';
            return {
                title: g.title,
                description: g.desc ?? g.description,
                media_type: isVideo ? 'video' : 'image',
                image_url: isVideo ? (imageUrl || undefined) : imageUrl,
                video_url: isVideo ? videoUrl : undefined,
                thumbnail_url: isVideo ? (thumbnailUrl || undefined) : (thumbnailUrl || imageUrl),
                media_urls: mediaUrls.length ? mediaUrls : (isVideo && videoUrl ? [videoUrl] : images),
                images: images.length ? images : undefined
            };
        }

        const dataLoadState = {
            projects: { loading: true, loaded: false },
            listings: { loading: true, loaded: false },
            gallery: { loading: true, loaded: false, error: '' },
            ads: { loading: false, loaded: false, error: '' },
            musicTracks: { loading: false, loaded: false, error: '' },
            adminListings: { loading: false, loaded: false, error: '' }
        };

        window.appData = appData;
        window.dataLoadState = dataLoadState;

        const homepageHydration = {
            critical: false,
            observersReady: false,
            projects: false,
            heroSlides: false,
            listingHero: false,
            listings: false,
            favorites: false,
            gallery: false,
            vacancies: false,
            ads: false,
            musicTracks: false,
            admin: false,
            initialHomepageLoaded: false,
            initialHomepageLoading: true,
            rawHeroSlides: null,
            rawListingHeroItems: null
        };
        window.homepageHydration = homepageHydration;

        function scheduleIdleTask(callback, timeout = 1200) {
            if (typeof window.requestIdleCallback === 'function') {
                return window.requestIdleCallback(callback, { timeout });
            }
            return window.setTimeout(() => callback({ didTimeout: true, timeRemaining: () => 0 }), Math.min(timeout, 300));
        }

        function runWhenSectionVisible(target, callback, options = {}) {
            const element = typeof target === 'string' ? document.querySelector(target) : target;
            if (!element) {
                scheduleIdleTask(callback);
                return;
            }
            if (typeof IntersectionObserver !== 'function') {
                scheduleIdleTask(callback);
                return;
            }
            let hasRun = false;
            const observer = new IntersectionObserver((entries) => {
                if (hasRun || !entries.some(entry => entry.isIntersecting)) return;
                hasRun = true;
                observer.disconnect();
                callback();
            }, { rootMargin: options.rootMargin || '350px 0px', threshold: options.threshold ?? 0.01 });
            observer.observe(element);
        }


        function withHomepageTimeout(promise, label, timeoutMs = 12000, options = {}) {
            let timerId;
            let didTimeout = false;
            const sourcePromise = Promise.resolve(promise)
                .then(value => ({ value, label }))
                .catch(error => ({ error, label }));
            const timeout = new Promise(resolve => {
                timerId = window.setTimeout(() => {
                    didTimeout = true;
                    if (options.warn !== false) console.warn(`${label} ${timeoutMs}ms ərzində cavab vermədi; səhifə mövcud məlumatlarla göstərilir və cavab gələndə yenilənəcək.`);
                    resolve({ timedOut: true, label });
                }, timeoutMs);
            });
            sourcePromise.finally(() => window.clearTimeout(timerId));
            return Promise.race([sourcePromise, timeout]).then(result => ({ ...result, late: didTimeout && !result.timedOut }));
        }

        async function homepageApiRequestWithRetry(url, options = {}, retries = 1) {
            try {
                return await apiRequest(url, options);
            } catch (error) {
                if (retries <= 0) throw error;
                console.warn(`${url} oxunmadı, bir dəfə yenidən cəhd edilir:`, error.message);
                await new Promise(resolve => window.setTimeout(resolve, 700));
                return homepageApiRequestWithRetry(url, options, retries - 1);
            }
        }

        let activeTabId = null;

        function isTabAktiv(tabId) {
            if (tabId === activeTabId) return true;
            const element = document.getElementById(`tab-${tabId}`);
            return Boolean(element && !element.classList.contains('hidden'));
        }

        function setHomepageInitialLoading(isLoading) {
            homepageHydration.initialHomepageLoading = Boolean(isLoading);
            document.getElementById('tab-seabreeze')?.classList.toggle('homepage-loading', Boolean(isLoading));
            document.getElementById('seabreeze-homepage-skeleton')?.setAttribute('aria-busy', String(Boolean(isLoading)));
            const shouldShowRailSkeleton = Boolean(isLoading) && isTabAktiv('seabreeze');
            ['desktop-left-ads', 'desktop-right-ads'].forEach(id => {
                const rail = document.getElementById(id);
                if (rail) rail.classList.toggle('is-loading', shouldShowRailSkeleton);
            });
        }

        function safeHomepageRender(label, callback) {
            try {
                return callback?.();
            } catch (error) {
                console.error(`Homepage render failed in ${label}:`, error);
                setHomepageInitialLoading(false);
                return null;
            }
        }

        function normalizeListingHeroItem(item = {}) {
            const listing = item.listing ? dbListingToUi(item.listing) : (appData.listings || []).find(x => String(x.id) === String(item.listing_id ?? item.listingId ?? ''));
            const mediaUrl = String(item.media_url ?? item.mediaUrl ?? item.hero_media_url ?? item.heroMediaUrl ?? listing?.img ?? listing?.images?.[0] ?? '').trim();
            return {
                id: item.id,
                listing_id: item.listing_id ?? item.listingId ?? listing?.id ?? '',
                listing,
                title: item.title || item.custom_title || item.customTitle || listing?.title || '',
                description: '',
                media_type: String(item.media_type ?? item.mediaType ?? (/\.(mp4|webm|mov)(\?|#|$)/i.test(mediaUrl) ? 'video' : 'image')).toLowerCase() === 'video' ? 'video' : 'image',
                media_url: mediaUrl,
                badge_text: item.badge_text ?? item.badgeText ?? '',
                slide_duration: Number(item.slide_duration ?? item.slideDuration ?? 10) || 10,
                custom_title: item.custom_title ?? item.customTitle ?? '',
                custom_description: '',
                hero_media_url: item.hero_media_url ?? item.heroMediaUrl ?? '',
                sort_order: Number(item.sort_order ?? item.sortOrder ?? 0),
                is_active: item.is_active ?? item.isActive ?? true,
                region: item.region || listing?.district || listing?.city || listing?.project || '',
            };
        }

        function normalizeListingHeroItems(items = []) {
            const list = Array.isArray(items) ? items : [items];
            return list.filter(Boolean).map(normalizeListingHeroItem).sort((a, b) => (a.sort_order - b.sort_order) || String(a.id || '').localeCompare(String(b.id || '')));
        }

        async function loadListingHeroPriority() {
            if (homepageHydration.listingHero) return;
            try {
                const items = await homepageApiRequestWithRetry('/api/listing-hero-items').catch(() => []);
                homepageHydration.rawListingHeroItems = items;
                cacheData('listingHeroItems', normalizeListingHeroItems(items));
            } catch (error) {
                console.warn('Elan hero oxunmadı, cache istifadə olunur:', error.message);
            } finally {
                homepageHydration.listingHero = true;
                if (homepageHydration.initialHomepageLoaded || isTabAktiv('seabreeze')) {
                    safeHomepageRender('listing hero', renderListingHero);
                }
            }
        }

        async function loadHeroSlidesPriority() {
            if (homepageHydration.heroSlides) return;
            try {
                const heroSlides = await homepageApiRequestWithRetry('/api/hero-slides').catch(() => []);
                homepageHydration.rawHeroSlides = heroSlides;
                cacheData('heroSlides', normalizeHeroSlides(heroSlides, false));
                isHeroSlidesLoaded = true;
                appData.heroSection = getRenderableHeroSlides()[0] || null;
            } catch (error) {
                console.warn('Hero slaydları oxunmadı, cache istifadə olunur:', error.message);
                isHeroSlidesLoaded = true;
                appData.heroSection = getRenderableHeroSlides()[0] || null;
            } finally {
                homepageHydration.heroSlides = true;
                if (homepageHydration.initialHomepageLoaded || isTabAktiv('seabreeze')) {
                    safeHomepageRender('hero', renderSeaBreezeHero);
                }
            }
        }

        async function loadProjectsPriority(options = {}) {
            if (homepageHydration.projects) return;
            const shouldRender = options.render !== false;
            dataLoadState.projects.loading = true;
            if (shouldRender) renderOfficialProjects();
            try {
                const projects = await cachedApiGet('projects', '/api/projects?all=true');
                const projectRows = Array.isArray(projects) ? projects : (projects.data || []);
                cacheData('projects', projectRows.map(dbProjectToUi));
            } catch (error) {
                console.warn('Layihələr oxunmadı:', error.message);
            } finally {
                homepageHydration.projects = true;
                dataLoadState.projects.loading = false;
                dataLoadState.projects.loaded = true;
                if (shouldRender || (homepageHydration.initialHomepageLoaded && isTabAktiv('seabreeze'))) {
                    renderOfficialProjectOptions();
                    renderOfficialProjects();
                }
            }
        }


        async function loadAdminProjects({ render = true } = {}) {
            if (!isAdminRole(activeUser?.role) || !getAuthToken()) return getOfficialProjects();
            const projects = await cachedApiGet('projects', '/api/projects?all=true', { force: false, authRedirect: false });
            const projectRows = Array.isArray(projects) ? projects : (projects.data || []);
            const projectList = projectRows.map(dbProjectToUi);
            cacheData('projects', projectList);
            homepageHydration.projects = true;
            dataLoadState.projects.loaded = true;
            if (render) {
                renderOfficialProjectOptions();
                renderOfficialProjects();
                renderAdminProjects();
                renderSeaBreezeHero(0);
            }
            return projectList;
        }

        async function loadProjects(options = {}) {
            return loadAdminProjects(options);
        }

        async function loadListingsLazy() {
            if (homepageHydration.listings) return;
            homepageHydration.listings = true;
            dataLoadState.listings.loading = true;
            if (isTabAktiv('listings')) renderSeaBreeze();
            try {
                const listings = await cachedApiGet('listings', '/api/listings?page=1&limit=100&status=approved');
                const listingRows = Array.isArray(listings) ? listings : (listings.data || []);
                cacheData('listings', listingRows.map(dbListingToUi));
                renderListingHero(listingHeroIndex);
                if (isTabAktiv('listings')) renderSeaBreeze();
            } catch (error) {
                console.warn('Digər ərazilər oxunmadı:', error.message);
            } finally {
                dataLoadState.listings.loading = false;
                dataLoadState.listings.loaded = true;
                if (isTabAktiv('listings')) renderSeaBreeze();
            }
            scheduleIdleTask(loadFavoritesLazy, 800);
        }


        function adminListingStatsFromListings(listings = appData.listings || {}) {
            const rows = Array.isArray(listings) ? listings : [];
            return {
                totalListings: rows.length,
                pendingListings: rows.filter(item => normalizeListingStatus(item.status) === 'pending').length,
                approvedListings: rows.filter(item => normalizeListingStatus(item.status) === 'approved').length,
                rejectedListings: rows.filter(item => normalizeListingStatus(item.status) === 'rejected').length,
                archivedListings: rows.filter(item => normalizeListingStatus(item.status) === 'archived').length,
                totalListingViews: rows.reduce((sum, item) => sum + Number(item.viewCount || 0), 0),
                totalViews: rows.reduce((sum, item) => sum + Number(item.viewCount || 0), 0),
                totalFavorites: rows.reduce((sum, item) => sum + Number(item.favoritesCount || 0), 0),
            };
        }

        function mergeAdminListingStats(listings = appData.listings || []) {
            appData.dashboardStats = { ...(appData.dashboardStats || {}), ...adminListingStatsFromListings(listings) };
        }

        async function fetchAdminListings() {
            const response = await apiRequest('/api/listings/admin', { authRedirect: false });
            return Array.isArray(response) ? response : (response.data || []);
        }

        async function loadAdminListings({ render = true, force = true } = {}) {
            if (!isAdminRole(activeUser?.role) || !getAuthToken()) return [];
            if (dataLoadState.adminListings.loading && !force) return appData.listings || [];
            dataLoadState.adminListings.loading = true;
            dataLoadState.adminListings.error = '';
            if (render) renderAdminDashboard();
            try {
                const rows = await cachedApiGet('listings', '/api/listings/admin', { force, authRedirect: false });
                const listings = rows.map(dbListingToUi);
                cacheData('listings', listings);
                mergeAdminListingStats(listings);
                dataLoadState.adminListings.loaded = true;
                return listings;
            } catch (error) {
                dataLoadState.adminListings.error = 'Elanlar yüklənmədi, yenidən cəhd edin.';
                console.warn('Admin elanları oxunmadı:', error.message);
                throw error;
            } finally {
                dataLoadState.adminListings.loading = false;
                if (render && isTabAktiv('admin-dashboard')) renderAdminDashboard();
            }
        }

        async function loadFavoritesLazy() {
            if (homepageHydration.favorites || !getAuthToken()) return;
            homepageHydration.favorites = true;
            try {
                const favorites = await apiRequest('/api/favorites').catch(() => []);
                const favoriteIds = favoriteIdsFromRecords(favorites);
                logFavoritesDebug('loadFavoritesLazy returned records', { records: favorites, favoriteIds: Array.from(favoriteIds) });
                appData.favoriteListingIds = favoriteIds;
                cacheFavoriteListingIds(favoriteIds);
                renderListingHero(listingHeroIndex);
                if (isTabAktiv('listings')) renderSeaBreeze();
                if (isTabAktiv('favorites')) renderFavoritesPage();
            } catch (error) {
                console.warn('Favoritlər oxunmadı:', error.message);
            }
        }

        async function loadGalleryBackground() {
            if (homepageHydration.gallery) return;
            homepageHydration.gallery = true;
            dataLoadState.gallery.loading = true;
            if (isTabAktiv('portfolio')) renderPortfolio();
            try {
                const gallery = await cachedApiGet('gallery', '/api/gallery?page=1&limit=5000');
                const galleryRows = extractResponseItems(gallery, ['items', 'gallery']);
                window.BestHomeGallery.setPagination(Array.isArray(gallery)
                    ? { page: 1, limit: galleryRows.length || 5000, total: galleryRows.length, totalPages: 1 }
                    : { page: gallery?.page || gallery?.data?.page || 1, limit: gallery?.limit || gallery?.data?.limit || 5000, total: gallery?.total || gallery?.data?.total || galleryRows.length, totalPages: gallery?.totalPages || gallery?.data?.totalPages || 1 });
                cacheData('gallery', galleryRows.map(dbGalleryToUi).sort((a, b) => (Number(a.sortOrder || 0) - Number(b.sortOrder || 0)) || new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
                if (isTabAktiv('portfolio')) renderPortfolio();
            } catch (error) {
                console.warn('Qalereya oxunmadı:', error.message);
            } finally {
                dataLoadState.gallery.loading = false;
                dataLoadState.gallery.loaded = true;
                if (isTabAktiv('portfolio')) renderPortfolio();
            }
        }

        async function loadVacanciesBackground() {
            if (homepageHydration.vacancies) return;
            homepageHydration.vacancies = true;
            try {
                const vacancies = await apiRequest('/api/vacancies');
                cacheData('vacancies', vacancies.map(dbVacancyToUi));
                if (isTabAktiv('career')) renderCareerSection();
            } catch (error) {
                console.warn('Vakansiyalar oxunmadı, cache istifadə olunur:', error.message);
            }
        }

        function canLoadAdminBackground() {
            return Boolean(getAuthToken() && isAdminRole(activeUser?.role) && isTabAktiv('admin-dashboard'));
        }

        async function loadAdminBackground() {
            if (homepageHydration.admin || !canLoadAdminBackground()) return;
            homepageHydration.admin = true;
            try {
                const [applications, users, dashboardStats] = await Promise.all([
                    apiRequest('/api/applications', { authRedirect: false }).catch(error => { console.warn('Admin müraciətləri yüklənmədi:', error.message); return []; }),
                    apiRequest('/api/users', { authRedirect: false }).catch(error => { console.warn('Admin istifadəçiləri yüklənmədi:', error.message); return []; }),
                    apiRequest('/api/admin/stats/overview', { authRedirect: false }).catch(error => { console.warn('Admin statistikası yüklənmədi:', error.message); return null; })
                ]);
                const heroItems = await apiRequest('/api/listing-hero-items?admin=1', { authRedirect: false }).catch(error => { console.warn('Admin elan hero məlumatları yüklənmədi:', error.message); return appData.listingHeroItems || []; });
                cacheData('listingHeroItems', normalizeListingHeroItems(heroItems));
                cacheData('applications', applications.map(dbAppToUi));
                if (users.length) cacheData('agents', users.map(userToUi));
                appData.dashboardStats = dashboardStats;
                appData.dashboardStatsError = dashboardStats ? '' : 'Statistika yüklənmədi';
                await loadAdminListings({ render: false }).catch(error => console.warn('Admin elanları yüklənmədi:', error.message));
                if (isTabAktiv('admin-dashboard')) renderAdminDashboard();
            } catch (error) {
                console.warn('Kabinet məlumatları oxunmadı:', error.message);
            }
        }

        async function refreshAdminUsers({ render = true } = {}) {
            if (!isAdminRole(activeUser?.role) || !getAuthToken()) return [];
            const users = await apiRequest('/api/users', { authRedirect: false }).catch(() => []);
            cacheData('agents', users.map(userToUi));
            if (render && isTabAktiv('admin-dashboard') && currentAdminSubtab === 'agents-manager') renderAdminDashboard();
            return appData.agents;
        }

        function stopAdminUsersAutoRefresh() {
            if (adminUsersRefreshTimer) clearInterval(adminUsersRefreshTimer);
            adminUsersRefreshTimer = null;
        }

        function startAdminUsersAutoRefresh() {
            if (!isAdminRole(activeUser?.role) || currentAdminSubtab !== 'agents-manager') return;
            if (!adminUsersRefreshTimer) {
                adminUsersRefreshTimer = setInterval(() => {
                    if (isTabAktiv('admin-dashboard') && currentAdminSubtab === 'agents-manager') refreshAdminUsers({ render: true }).catch(() => {});
                }, 30000);
            }
            refreshAdminUsers({ render: true }).catch(() => {});
        }

        function setupHomepageLazyLoaders() {
            if (homepageHydration.observersReady) return;
            homepageHydration.observersReady = true;
            scheduleIdleTask(loadVacanciesBackground, 1200);
            if (canLoadAdminBackground()) scheduleIdleTask(() => loadAdminBackground().catch(error => console.warn('Admin fon yüklənməsi alınmadı:', error.message)), 1600);
            runWhenSectionVisible('#agent-listings-area', loadListingsLazy, { rootMargin: '500px 0px' });
            runWhenSectionVisible('#tab-portfolio', loadGalleryBackground, { rootMargin: '500px 0px' });
            runWhenSectionVisible('#tab-career', loadVacanciesBackground, { rootMargin: '500px 0px' });
        }

        function currentRouteKey() {
            const path = window.location.pathname.toLowerCase();
            if (path.includes('/gallery') || path.includes('/portfolio')) return 'portfolio';
            if (path.includes('/elanlar') || path.includes('/listings')) return 'listings';
            return 'projects';
        }

        let homepageHydrationPromise = null;

        async function hydrateFromDatabase({ backgroundOnly = false } = {}) {
            if (homepageHydrationPromise) return homepageHydrationPromise;
            homepageHydrationPromise = (async () => {
            try {
                bootstrapCachedData();
                isHeroSlidesLoaded = true;
                appData.heroSection = getRenderableHeroSlides()[0] || null;
                const hasCachedHomepageData = Boolean((appData.heroSlides || []).length || (appData.projects || []).length || (appData.ads || []).length);
                dataLoadState.projects.loading = !hasCachedHomepageData;
                dataLoadState.projects.loaded = hasCachedHomepageData;
                safeHomepageRender('project filters', renderOfficialProjectOptions);
                safeHomepageRender('projects', renderOfficialProjects);
                safeHomepageRender('hero', renderSeaBreezeHero);
                safeHomepageRender('ads', () => renderDesktopAds({ force: true }));
                if (hasCachedHomepageData) setHomepageInitialLoading(false);

                const route = currentRouteKey();
                const criticalTasks = [withHomepageTimeout(loadSiteSettingsPriority(), 'Sayt ayarları', 12000, { warn: false })];
                if (route === 'portfolio') criticalTasks.push(withHomepageTimeout(loadGalleryBackground(), 'Qalereya', 12000));
                else if (route === 'listings') criticalTasks.push(withHomepageTimeout(loadListingsLazy(), 'Elanlar', 12000), withHomepageTimeout(loadListingHeroPriority(), 'Elan hero', 12000));
                else criticalTasks.push(withHomepageTimeout(loadHeroSlidesPriority(), 'Hero slaydları', 12000), withHomepageTimeout(loadProjectsPriority({ render: false }), 'Layihələr', 12000));
                await Promise.allSettled(criticalTasks);
                setHomepageInitialLoading(false);
                homepageHydration.initialHomepageLoaded = true;
                scheduleIdleTask(() => loadAdsBackground({ render: true }).catch(() => {}), 250);
                scheduleIdleTask(() => loadSiteMusicBackground({ render: true }).catch(() => {}), 600);
                scheduleIdleTask(() => loadSeaBreezePage().catch(() => {}), 700);
                if (route !== 'listings') scheduleIdleTask(() => loadListingHeroPriority().catch(() => {}), 900);
                if (route !== 'listings') scheduleIdleTask(() => loadListingsLazy().catch(() => {}), 1100);
                if (route !== 'portfolio') scheduleIdleTask(() => loadGalleryBackground().catch(() => {}), 1300);
                if (route !== 'projects') scheduleIdleTask(() => loadProjectsPriority({ render: false }).catch(() => {}), 1500);
                if (canLoadAdminBackground()) scheduleIdleTask(() => loadAdminBackground().catch(() => {}), 1700);

                if (homepageHydration.rawHeroSlides) {
                    cacheData('heroSlides', normalizeHeroSlides(homepageHydration.rawHeroSlides, false));
                    isHeroSlidesLoaded = true;
                    appData.heroSection = getRenderableHeroSlides()[0] || null;
                }
                if (homepageHydration.rawListingHeroItems) cacheData('listingHeroItems', normalizeListingHeroItems(homepageHydration.rawListingHeroItems));
                homepageHydration.critical = true;
                homepageHydration.initialHomepageLoaded = true;
                dataLoadState.projects.loading = false;
                dataLoadState.projects.loaded = true;
                safeHomepageRender('project filters', renderOfficialProjectOptions);
                safeHomepageRender('projects', renderOfficialProjects);
                safeHomepageRender('hero', renderSeaBreezeHero);
                safeHomepageRender('listing hero', renderListingHero);
                safeHomepageRender('ads', () => renderDesktopAds({ force: true }));
            } catch (error) {
                console.error('Homepage hydration failed; showing fallback content:', error);
            } finally {
                dataLoadState.projects.loading = false;
                dataLoadState.projects.loaded = true;
                setHomepageInitialLoading(false);
                setupHomepageLazyLoaders();
                homepageHydrationPromise = null;
            }
            })();
            return homepageHydrationPromise;
        }

        function getOfficialProjects() {
            const projects = Array.isArray(appData.projects) ? appData.projects : [];
            return [...projects].sort((a, b) => {
                const aOrder = Number(a.displayOrder ?? a.display_order);
                const bOrder = Number(b.displayOrder ?? b.display_order);
                const aHasOrder = Number.isFinite(aOrder);
                const bHasOrder = Number.isFinite(bOrder);
                if (aHasOrder !== bHasOrder) return aHasOrder ? -1 : 1;
                if (aHasOrder && aOrder !== bOrder) return aOrder - bOrder;
                const createdDifference = (Date.parse(b.createdAt || b.created_at || '') || 0) - (Date.parse(a.createdAt || a.created_at || '') || 0);
                return createdDifference || Number(b.id || 0) - Number(a.id || 0);
            });
        }

        function saveOfficialProjects(projects) {
            cacheData('projects', projects);
        }

        function buildProjectPictureFromLink(imageUrl, existingPicture = {}) {
            const safeUrl = imageUrl || existingPicture.mobile || existingPicture.tablet || existingPicture.desktop || '';
            return {
                desktop: safeUrl,
                tablet: safeUrl,
                mobile: safeUrl
            };
        }


        // Project search handlers moved to /js/components/projects.js

        function getProjectImages(project) {
            return normalizeProjectImages(project?.images, project?.imageUrl)
                .filter(image => image && image !== PROJECT_IMAGE_PLACEHOLDER);
        }

        let projectImageInputRows = [{ id: Date.now(), url: '' }];

        function renderProjectImageInputs(images = ['']) {
            const normalized = (Array.isArray(images) ? images : [images]).map(value => String(value || '').trim()).filter((value, idx) => value || idx === 0);
            if (!normalized.length) normalized.push('');
            const primaryInput = document.getElementById('project-img');
            if (primaryInput) primaryInput.value = normalized[0] || '';
            projectImageInputRows = normalized.slice(1).map((url, idx) => ({ id: Date.now() + idx + Math.random(), url }));
            renderProjectImageRows();
        }

        function renderProjectImageRows() {
            const container = document.getElementById('project-images-list');
            if (!container) return;
            container.innerHTML = projectImageInputRows.map((row) => `
                <div class="flex gap-2 items-center" data-image-id="${row.id}">
                    <input type="url" value="${row.url || ''}" oninput="handleProjectImageInput('${row.id}', this.value)" placeholder="Əlavə şəkil URL" class="project-image-url flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none">
                    <button type="button" onclick="removeProjectImageInput('${row.id}')" class="text-red-400 bg-red-500/10 hover:bg-red-500 hover:text-white w-9 h-9 rounded-xl transition" aria-label="Şəkli sil"><i class="fa-solid fa-xmark"></i></button>
                </div>
            `).join('');
            updateProjectImagePreview();
        }

        function rawProjectImageInputValues() {
            const primary = document.getElementById('project-img')?.value.trim() || '';
            const extras = projectImageInputRows.map(input => String(input.url || '').trim());
            return [primary, ...extras];
        }

        function collectProjectImageInputs() {
            return normalizeProjectImages(rawProjectImageInputValues());
        }

        function syncPrimaryProjectImage(_value) {
            updateProjectImagePreview();
        }

        function handleProjectImageInput(id, value) {
            projectImageInputRows = projectImageInputRows.map(item => String(item.id) === String(id) ? { ...item, url: value } : item);
            updateProjectImagePreview();
        }

        function addProjectImageInput(value = '') {
            projectImageInputRows.push({ id: Date.now() + Math.random(), url: value });
            renderProjectImageRows();
        }

        function removeProjectImageInput(id) {
            projectImageInputRows = projectImageInputRows.filter(item => String(item.id) !== String(id));
            renderProjectImageRows();
        }

        function buildDistrictOptionHtml(region, includeAll = false) {
            const options = region === 'city' ? getVisibleGeneralCities().map(item => item.value) : getDistrictOptionsForRegion(region);
            const first = includeAll ? `<option value="all">${region === 'seabreeze' ? 'Bütün layihələr' : 'Bütün layihə/rayonlar'}</option>` : '';
            const suffix = region === 'seabreeze' && !options.includes('Digər') ? '<option value="Digər">Digər Rezidensiya</option>' : '';
            return first + options.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('') + suffix;
        }

        function syncDistrictSelect(select, region, includeAll = false) {
            if (!select) return;
            const selected = select.value || (includeAll ? 'all' : '');
            const wrapper = select.id === 'sb-project' ? document.getElementById('sb-district-wrap') : select;
            const hide = (!region && !includeAll) || (includeAll && select.id === 'filter-sb-project' && currentSiteSettings().showRayonFilter === false);
            wrapper?.classList.toggle('hidden', hide);
            if (hide) return;
            select.innerHTML = buildDistrictOptionHtml(region || 'seabreeze', includeAll);
            select.value = Array.from(select.options).some(opt => opt.value === selected) ? selected : (includeAll ? 'all' : (select.options[0]?.value || ''));
        }

        function cityToDistrictRegion(city = '') {
            const normalized = String(city || '').trim().toLowerCase();
            if (normalized === 'bakı' || normalized === 'baki') return 'baki';
            if (normalized === 'abşeron' || normalized === 'absheron') return 'absheron';
            if (normalized === 'sumqayıt' || normalized === 'sumqayit') return 'sumqayit';
            return '';
        }

        function ensureGeneralDistrictField() {
            const wrap = document.getElementById('sb-district-wrap');
            if (!wrap) return;
            if (!document.getElementById('sb-district')) {
                wrap.insertAdjacentHTML('afterend', '<input type="hidden" id="sb-district"><label id="sb-general-district-wrap" class="hidden space-y-1"><span class="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Rayon / qəsəbə *</span><select id="sb-general-district" class="w-full h-10 bg-[#0f172a] border border-white/10 rounded-xl px-3 text-xs text-white focus:outline-none focus:border-brand-500/60"></select></label>');
                document.getElementById('sb-general-district')?.addEventListener('change', event => {
                    const hidden = document.getElementById('sb-district');
                    if (hidden) hidden.value = event.target.value || '';
                });
                document.getElementById('sb-project')?.addEventListener('change', () => {
                    handleAdminProjectSelectionChange();
                });
            }
        }

        function syncGeneralDistrictSelect() {
            ensureGeneralDistrictField();
            const regionType = document.getElementById('sb-region-type')?.value || 'seabreeze';
            const city = document.getElementById('sb-project')?.value || '';
            const districtRegion = cityToDistrictRegion(city);
            const wrap = document.getElementById('sb-general-district-wrap');
            const select = document.getElementById('sb-general-district');
            const hidden = document.getElementById('sb-district');
            const shouldShow = regionType === 'general' && Boolean(districtRegion) && currentSiteSettings().showRayonFilter !== false;
            wrap?.classList.toggle('hidden', !shouldShow);
            if (!select || !hidden) return;
            if (!shouldShow) {
                hidden.value = regionType === 'seabreeze' ? (document.getElementById('sb-project')?.value || '') : '';
                return;
            }
            const previous = hidden.value || select.value;
            const options = getDistrictOptionsForRegion(districtRegion);
            select.innerHTML = options.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
            select.value = options.includes(previous) ? previous : (options[0] || '');
            hidden.value = select.value || '';
        }

        function syncCategoryOptionsForRegion(region, preferredValue = '') {
            const select = document.getElementById('sb-form-category');
            if (!select) return;
            const current = preferredValue || select.value;
            const options = region === 'general' ? GENERAL_CATEGORIES : SEA_BREEZE_CATEGORIES;
            select.innerHTML = options.map(item => `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`).join('');
            select.value = options.some(item => item.value === current) ? current : options[0]?.value || '';
        }

        function handleListingRegionTypeChange(preferredCategory = '') {
            const region = document.getElementById('sb-region-type')?.value || 'seabreeze';
            const label = document.getElementById('sb-district-label');
            if (label) label.textContent = region === 'seabreeze' ? 'Layihə *' : 'Şəhər *';
            syncCategoryOptionsForRegion(region, preferredCategory);
            syncDistrictSelect(document.getElementById('sb-project'), region === 'general' ? 'city' : region, false);
            ensureGeneralDistrictField();
            syncGeneralDistrictSelect();
            toggleMetroFieldForCity();
            clearAdminListingCoordinates({ resetMapView: true });
            setTimeout(initAdminListingMap, 50);
            toggleFormFieldsBasedOnCategory();
        }


        let projectLocationMap = null;
        let projectLocationMarker = null;
        function setProjectMapCoordinates(lat, lng, { moveMap = true, zoom = 16, verified = true, label = '' } = {}) {
            const latNum = Number(lat), lngNum = Number(lng);
            if (!isValidCoordinate(latNum, lngNum)) { updateProjectMapStatus(); return; }
            document.getElementById('project-latitude').value = latNum.toFixed(7);
            document.getElementById('project-longitude').value = lngNum.toFixed(7);
            document.getElementById('project-map-verified').value = verified ? 'true' : 'false';
            if (label && document.getElementById('project-location-search')) document.getElementById('project-location-search').value = label;
            if (projectLocationMap && typeof L !== 'undefined') {
                const point = [latNum, lngNum];
                if (!projectLocationMarker) {
                    projectLocationMarker = L.marker(point, { draggable: true }).addTo(projectLocationMap);
                    projectLocationMarker.on('dragend', event => { const pos = event.target.getLatLng(); setProjectMapCoordinates(pos.lat, pos.lng, { moveMap: false, verified: true }); });
                } else projectLocationMarker.setLatLng(point);
                if (moveMap) projectLocationMap.setView(point, Math.max(projectLocationMap.getZoom(), zoom));
            }
            updateProjectMapStatus();
        }
        function updateProjectMapStatus() {
            const status = document.getElementById('project-map-status');
            if (!status) return;
            const verified = document.getElementById('project-map-verified')?.value === 'true';
            const lat = document.getElementById('project-latitude')?.value;
            const lng = document.getElementById('project-longitude')?.value;
            const hasCoordinates = isValidCoordinate(lat, lng);
            document.getElementById('project-map-verify-btn')?.toggleAttribute('disabled', !hasCoordinates);
            status.textContent = verified && hasCoordinates ? `✅ Xəritə yeri təsdiqləndi: ${lat}, ${lng}` : (hasCoordinates ? 'Koordinat seçilib, təsdiq gözləyir.' : 'Xəritə yeri təsdiqlənməyib.');
        }
        function verifyProjectMapLocation() {
            const lat = document.getElementById('project-latitude')?.value;
            const lng = document.getElementById('project-longitude')?.value;
            if (!isValidCoordinate(lat, lng)) { showToast('Əvvəlcə xəritədə nöqtə seçin.'); return; }
            document.getElementById('project-map-verified').value = 'true';
            updateProjectMapStatus();
        }
        function initProjectLocationMap() {
            const el = document.getElementById('project-location-map');
            if (!el) return;
            if (typeof L === 'undefined') { ensureLeafletLoaded().then(initProjectLocationMap).catch(error => { console.error(error); setMapLoading('project-location-map-loading', false); }); return; }
            if (!projectLocationMap) { setMapLoading('project-location-map-loading', true); projectLocationMap = L.map(el, { scrollWheelZoom: true }).setView(SEA_BREEZE_DEFAULT_CENTER, 13); addOpenStreetMapLayer(projectLocationMap); attachMapLoadingOverlay(projectLocationMap, 'project-location-map-loading'); projectLocationMap.on('click', e => setProjectMapCoordinates(e.latlng.lat, e.latlng.lng, { verified: true })); }
            setTimeout(()=>projectLocationMap.invalidateSize(), 80);
            const lat=document.getElementById('project-latitude')?.value, lng=document.getElementById('project-longitude')?.value;
            if (isValidCoordinate(lat, lng)) setProjectMapCoordinates(lat,lng,{moveMap:true,verified:document.getElementById('project-map-verified')?.value==='true'});
        }
        function showProjectLocationSuggestions(){ document.getElementById('project-location-results')?.classList.remove('hidden'); }
        function debouncedProjectLocationSearch(){ clearTimeout(window.__projectLocationTimer); const q=(document.getElementById('project-location-search')?.value||'').trim(); const el=document.getElementById('project-location-results'); if(!el) return; if(q.length<3){el.innerHTML=q?'<div class="p-2 font-bold text-slate-600">Axtarış üçün ən az 3 hərf yazın</div>':''; el.classList.toggle('hidden',!q); return;} el.innerHTML='<div class="p-2 font-bold text-slate-600">Axtarılır...</div>'; el.classList.remove('hidden'); window.__projectLocationTimer=setTimeout(searchProjectLocation,500); }
        async function searchProjectLocation(){ const q=(document.getElementById('project-location-search')?.value||'').trim(); const el=document.getElementById('project-location-results'); if(q.length<3||!el) return; const rows=await searchLocationsWithPriority(q,{city:'Sea Breeze, Bakı',includeLocal:false}).catch(()=>[]); window.__lastProjectLocationResults=rows.filter(r=>r.source!=='project'||r.verifiedProjectLocation); el.innerHTML=window.__lastProjectLocationResults.length?window.__lastProjectLocationResults.map((item,idx)=>`<button type="button" onclick="selectProjectLocationResult(${idx})" class="block w-full rounded-xl px-3 py-2 text-left hover:bg-slate-50"><strong>${escapeHtml((item.display_name||q).split(',').slice(0,2).join(', '))}</strong><span class="block text-[10px] text-slate-500">${escapeHtml(item.display_name||q)}</span></button>`).join(''):'<div class="p-2 font-bold text-red-700">Uyğun yer tapılmadı</div>'; }
        function selectProjectLocationResult(index){ const item=(window.__lastProjectLocationResults||[])[index]; if(!item) return; setProjectMapCoordinates(item.lat,item.lon,{moveMap:true,label:item.display_name||item.name||'',verified:true}); document.getElementById('project-location-results')?.classList.add('hidden'); }

        let adminListingMap = null;
        let adminListingMarker = null;
        let detailListingMap = null;
        window.detailListingMap = detailListingMap;
        let detailListingMarker = null;
        let projectDetailMap = null;
        let projectDetailMarker = null;
        let fullscreenMap = null;
        let fullscreenMapMarker = null;
        let fullscreenMapSource = null;
        let fullscreenMapSelection = null;

        function isBakuSelectedForListing() {
            const region = document.getElementById('sb-region-type')?.value || '';
            const city = document.getElementById('sb-project')?.value || '';
            return region === 'general' && city.toLowerCase() === 'bakı';
        }

        function populateMetroSelect() {
            const select = document.getElementById('sb-metro');
            if (!select || select.dataset.ready === '1') return;
            select.innerHTML = '<option value="">Metro seçilməyib</option>' + BAKU_METRO_STATIONS.map(station => `<option value="${escapeHtml(station)}">${escapeHtml(station)}</option>`).join('');
            select.dataset.ready = '1';
        }

        function toggleMetroFieldForCity() {
            populateMetroSelect();
            const city = document.getElementById('sb-project')?.value || '';
            const isBaku = city === 'Bakı' || city === 'Sea Breeze' || city === '';
            const showMetro = currentSiteSettings().showMetroFilter !== false && isBaku;
            document.getElementById('sb-metro-wrap')?.classList.toggle('hidden', !showMetro);
            if (!showMetro && document.getElementById('sb-metro')) document.getElementById('sb-metro').value = '';
        }
        function setMapLoading(target, isLoading) {
            const overlay = document.getElementById(target);
            overlay?.classList.toggle('is-hidden', !isLoading);
        }

        function attachMapLoadingOverlay(map, overlayId) {
            if (!map) return;
            setMapLoading(overlayId, true);
            map.once('load', () => setMapLoading(overlayId, false));
            map.on('tileloadstart', () => setMapLoading(overlayId, true));
            map.on('tileload', () => setMapLoading(overlayId, false));
            map.on('tileerror', () => setMapLoading(overlayId, false));
            setTimeout(() => setMapLoading(overlayId, false), 2200);
        }


        const DEFAULT_SEA_BREEZE_LOCATION = {
            lat: 40.5936578,
            lng: 49.9658956,
            zoom: 14
        };
        const AZERBAIJAN_COORDINATE_BOUNDS = { minLat: 38, maxLat: 42, minLng: 44, maxLng: 52 };
        const SEA_BREEZE_DEFAULT_CENTER = [DEFAULT_SEA_BREEZE_LOCATION.lat, DEFAULT_SEA_BREEZE_LOCATION.lng];
        const BAKU_DEFAULT_CENTER = [40.4093, 49.8671];
        const BAKU_DEFAULT_ZOOM = 12;

        function isValidCoordinate(lat, lng) {
            const nLat = Number(lat);
            const nLng = Number(lng);
            return Number.isFinite(nLat)
                && Number.isFinite(nLng)
                && !(nLat === 0 && nLng === 0)
                && nLat >= 38 && nLat <= 42
                && nLng >= 44 && nLng <= 52;
        }

        function selectedAdminProjectCoordinates() {
            const projectTitle = document.getElementById('sb-project')?.value || '';
            const project = getOfficialProjects().find(item => item.title === projectTitle);
            return hasProjectCoordinates(project) ? [Number(project.latitude), Number(project.longitude)] : null;
        }

        function adminMapDefaultCenter() {
            const lat = document.getElementById('sb-latitude')?.value;
            const lng = document.getElementById('sb-longitude')?.value;
            if (isValidCoordinate(lat, lng)) return [Number(lat), Number(lng)];
            const projectPoint = selectedAdminProjectCoordinates();
            if (projectPoint) return projectPoint;
            const region = document.getElementById('sb-region-type')?.value || 'seabreeze';
            return region === 'seabreeze' ? SEA_BREEZE_DEFAULT_CENTER : BAKU_DEFAULT_CENTER;
        }

        function setAdminListingMapNote(message = '', { warning = false } = {}) {
            const note = document.getElementById('sb-manual-pin-note');
            if (!note) return;
            note.textContent = message || 'Pin xəritədə əl ilə seçildi';
            note.classList.toggle('hidden', !message);
            note.classList.toggle('text-amber-600', Boolean(warning));
            note.classList.toggle('text-emerald-600', !warning && Boolean(message));
        }

        function setAdminListingCoordinates(lat, lng, { moveMap = true, reverse = true, zoom = 16, manual = false, note = '', warning = false } = {}) {
            const latNum = Number(lat);
            const lngNum = Number(lng);
            if (!isValidCoordinate(latNum, lngNum)) return;
            document.getElementById('sb-latitude').value = latNum.toFixed(7);
            document.getElementById('sb-longitude').value = lngNum.toFixed(7);
            setAdminListingMapNote(note || (manual ? 'Pin xəritədə əl ilə seçildi' : ''), { warning });
            if (adminListingMap && typeof L !== 'undefined') {
                const point = [latNum, lngNum];
                if (!adminListingMarker) {
                    adminListingMarker = L.marker(point, { draggable: true }).addTo(adminListingMap);
                    adminListingMarker.on('dragend', event => {
                        const pos = event.target.getLatLng();
                        setAdminListingCoordinates(pos.lat, pos.lng, { moveMap: false, reverse: false, manual: true });
                    });
                } else {
                    adminListingMarker.setLatLng(point);
                }
                if (moveMap) adminListingMap.setView(point, Math.max(adminListingMap.getZoom(), zoom));
            }
            if (reverse) reverseGeocodeAdminListingLocation(latNum, lngNum);
        }

        function clearAdminListingCoordinates({ clearSearch = false, clearAddress = false, resetMapView = false } = {}) {
            const latInput = document.getElementById('sb-latitude');
            const lngInput = document.getElementById('sb-longitude');
            if (latInput) latInput.value = '';
            if (lngInput) lngInput.value = '';
            const searchInput = document.getElementById('sb-location-search');
            if (searchInput) {
                delete searchInput.dataset.selectedLocation;
                if (clearSearch) searchInput.value = '';
            }
            if (clearAddress) {
                const streetInput = document.getElementById('sb-street-address');
                if (streetInput) streetInput.value = '';
            }
            document.getElementById('sb-location-results')?.classList.add('hidden');
            setAdminListingMapNote('');
            window.__lastAdminLocationResults = [];
            window.__lastAdminLocationSearchToken = `cleared-${Date.now()}`;
            if (adminListingMarker) {
                adminListingMarker.remove();
                adminListingMarker = null;
            }
            if (resetMapView && adminListingMap) adminListingMap.setView(adminMapDefaultCenter(), 12);
        }

        function handleAdminProjectSelectionChange() {
            syncGeneralDistrictSelect();
            toggleMetroFieldForCity();
            const selectedProject = document.getElementById('sb-project')?.value || '';
            const regionType = document.getElementById('sb-region-type')?.value || 'seabreeze';
            if (regionType === 'seabreeze') {
                const districtInput = document.getElementById('sb-district');
                if (districtInput) districtInput.value = selectedProject;
                const streetInput = document.getElementById('sb-street-address');
                if (streetInput && selectedProject) streetInput.value = selectedProject;
                const searchInput = document.getElementById('sb-location-search');
                if (searchInput && selectedProject) searchInput.value = selectedProject;
            }
            const meta = getOfficialProjects().find(item => item.title === selectedProject);
            clearAdminListingCoordinates({ resetMapView: true });
            if (meta && hasProjectCoordinates(meta)) {
                const verified = hasVerifiedProjectCoordinates(meta);
                setAdminListingCoordinates(meta.latitude, meta.longitude, {
                    moveMap: true,
                    reverse: false,
                    zoom: 16,
                    note: verified ? 'Təsdiqli layihə koordinatı seçildi' : 'Layihə koordinatı var, xəritə yeri hələ təsdiqlənməyib.',
                    warning: !verified
                });
            }
        }

        function initAdminListingMap() {
            const el = document.getElementById('sb-location-map');
            if (!el) return;
            if (typeof L === 'undefined') { ensureLeafletLoaded().then(initAdminListingMap).catch(error => { console.error(error); setMapLoading('sb-location-map-loading', false); }); return; }
            if (!adminListingMap) {
                setMapLoading('sb-location-map-loading', true);
                adminListingMap = L.map(el, { scrollWheelZoom: true }).setView(adminMapDefaultCenter(), 12);
                addOpenStreetMapLayer(adminListingMap);
                attachMapLoadingOverlay(adminListingMap, 'sb-location-map-loading');
                adminListingMap.on('click', event => setAdminListingCoordinates(event.latlng.lat, event.latlng.lng, { moveMap: false, reverse: false, manual: true }));
            }
            setTimeout(() => { adminListingMap.invalidateSize(); adminListingMap.setView(adminListingMarker?.getLatLng?.() || adminMapDefaultCenter(), adminListingMap.getZoom()); }, 150);
            setTimeout(() => { adminListingMap.invalidateSize(); adminListingMap.setView(adminListingMarker?.getLatLng?.() || adminMapDefaultCenter(), adminListingMap.getZoom()); }, 500);
            const lat = document.getElementById('sb-latitude')?.value;
            const lng = document.getElementById('sb-longitude')?.value;
            if (isValidCoordinate(lat, lng)) setAdminListingCoordinates(lat, lng, { moveMap: true });
            else {
                if (adminListingMarker) {
                    adminListingMarker.remove();
                    adminListingMarker = null;
                }
                adminListingMap.setView(adminMapDefaultCenter(), 12);
            }
        }

        function cleanAddressPart(value = '') {
            return String(value || '').replace(/\s+rayonu$/i, '').trim();
        }

        function fillLocationFieldsFromAddress(address = {}, displayName = '') {
            const district = cleanAddressPart(address.city_district || address.county || address.municipality || address.city || address.suburb || address.town || '');
            const settlement = cleanAddressPart(address.village || address.town || address.suburb || address.neighbourhood || address.hamlet || '');
            const streetAddress = [address.road || address.pedestrian || address.footway || address.street, address.house_number].filter(Boolean).join(' ').trim()
                || [address.neighbourhood, address.suburb].filter(Boolean).join(', ').trim()
                || String(displayName || '').split(',').slice(0, 2).join(', ').trim();
            const districtInput = document.getElementById('sb-district');
            if (districtInput && district) districtInput.value = district;
            const districtSelect = document.getElementById('sb-general-district');
            if (districtSelect && district) {
                const matched = Array.from(districtSelect.options).find(opt => opt.value.toLowerCase() === district.toLowerCase() || district.toLowerCase().includes(opt.value.toLowerCase()) || opt.value.toLowerCase().includes(district.toLowerCase()));
                if (matched) {
                    districtSelect.value = matched.value;
                    if (districtInput) districtInput.value = matched.value;
                }
            }
            const settlementInput = document.getElementById('sb-settlement');
            if (settlementInput) settlementInput.value = settlement || district || '';
            const streetInput = document.getElementById('sb-street-address');
            if (streetInput) streetInput.value = streetAddress || '';
        }

        async function reverseGeocodeAdminListingLocation(lat, lng) {
            if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return;
            const token = `${Number(lat).toFixed(7)},${Number(lng).toFixed(7)}`;
            window.__lastAdminReverseGeocodeToken = token;
            const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
            try {
                const data = await fetch(url, { headers: { Accept: 'application/json' } }).then(res => res.json());
                if (window.__lastAdminReverseGeocodeToken !== token) return;
                fillLocationFieldsFromAddress(data.address || {}, data.display_name || '');
            } catch (error) {
                console.warn('Reverse geocoding alınmadı:', error.message);
            }
        }

        function showAdminLocationSuggestions() {
            const resultsEl = document.getElementById('sb-location-results');
            const query = (document.getElementById('sb-location-search')?.value || '').trim();
            if (!resultsEl) return;
            if (query.length < 3) {
                resultsEl.innerHTML = '<div class="rounded-xl bg-white/5 border border-white/10 p-2 text-gray-300">Axtarış üçün ən az 3 hərf yazın</div>';
                resultsEl.classList.remove('hidden');
                return;
            }
            resultsEl.classList.remove('hidden');
        }

        function azSearchVariant(query = '') {
            return String(query || '')
                .replace(/\bhesen\b/gi, 'Həsən')
                .replace(/\bhasan\b/gi, 'Həsən')
                .replace(/\beliyev\b/gi, 'Əliyev')
                .replace(/\baliyev\b/gi, 'Əliyev')
                .replace(/\bsadiqcan\b/gi, 'Sadıqcan')
                .replace(/\bsadigcan\b/gi, 'Sadıqcan')
                .replace(/\bkucesi\b|\bkuchesi\b|\bkuce\b|\bkuc\b/gi, 'küçəsi')
                .replace(/\bprospekti\b|\bprospekt\b|\bavenue\b|\bave\b|\bpr\b/gi, 'prospekti')
                .replace(/\bqesebesi\b|\bqesebe\b/gi, 'qəsəbəsi')
                .trim();
        }

        function normalizeAddressQuery(value = '') {
            const ascii = String(value || '')
                .toLocaleLowerCase('az-AZ')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/ə/g, 'e')
                .replace(/ı/g, 'i')
                .replace(/ö/g, 'o')
                .replace(/ü/g, 'u')
                .replace(/ğ/g, 'g')
                .replace(/ş/g, 's')
                .replace(/ç/g, 'c')
                .replace(/\br-n\b/g, ' rn ')
                .replace(/[^a-z0-9\s-]/g, ' ')
                .replace(/\b(kuchesi|kucesi|kuch|kuce|kuc|street|st)\b/g, ' kuce ')
                .replace(/\b(prospekti|prospekt|avenue|ave|pr)\b/g, ' prospekt ')
                .replace(/\b(qesebesi|qesebe|gesebesi|gesebe)\b/g, ' qesebe ')
                .replace(/\b(rayonu|rayon|r-n|rn)\b/g, ' rayon ')
                .replace(/\b(metrosu|metro|m)\b/g, ' metro ')
                .replace(/\s+/g, ' ')
                .trim();
            const tokens = ascii.split(' ').filter(Boolean);
            const suffixes = new Set(['kuce', 'prospekt', 'qesebe', 'rayon', 'metro']);
            const looseTokens = tokens.map(token => token.replace(/q/g, 'g'));
            return {
                original: String(value || '').trim(),
                normalized: ascii,
                loose: looseTokens.join(' '),
                tokens,
                looseTokens,
                withoutSuffix: tokens.filter(token => !suffixes.has(token)).join(' '),
            };
        }

        function normalizeLocationSearchText(value = '') {
            return normalizeAddressQuery(value).normalized;
        }

        function levenshteinDistance(a = '', b = '') {
            const left = normalizeLocationSearchText(a);
            const right = normalizeLocationSearchText(b);
            if (left === right) return 0;
            if (!left.length) return right.length;
            if (!right.length) return left.length;
            const row = Array.from({ length: right.length + 1 }, (_, idx) => idx);
            for (let i = 1; i <= left.length; i += 1) {
                let prev = row[0];
                row[0] = i;
                for (let j = 1; j <= right.length; j += 1) {
                    const tmp = row[j];
                    row[j] = left[i - 1] === right[j - 1]
                        ? prev
                        : Math.min(prev + 1, row[j] + 1, row[j - 1] + 1);
                    prev = tmp;
                }
            }
            return row[right.length];
        }

        function locationTokenMatches(token = '', targetToken = '') {
            const q = normalizeAddressQuery(token).loose;
            const t = normalizeAddressQuery(targetToken).loose;
            if (q.length < 2 || !t) return false;
            if (t.startsWith(q) || q.startsWith(t) || t.includes(q)) return true;
            return q.length >= 4 && levenshteinDistance(q, t.slice(0, Math.max(q.length, Math.min(t.length, q.length + 1)))) <= 1;
        }

        function locationTextContains(haystack = '', needle = '') {
            const normalizedNeedle = normalizeLocationSearchText(needle);
            if (normalizedNeedle.length < 2) return false;
            const normalizedHaystack = normalizeLocationSearchText(haystack);
            if (normalizedHaystack.includes(normalizedNeedle)) return true;
            const queryTokens = normalizedNeedle.split(' ').filter(Boolean);
            const targetTokens = normalizedHaystack.split(' ').filter(Boolean);
            return queryTokens.every(token => targetTokens.some(targetToken => locationTokenMatches(token, targetToken)));
        }

        const KNOWN_SEA_BREEZE_PLACES = [];
        const LOCAL_LOCATION_INDEX = [
            ...KNOWN_SEA_BREEZE_PLACES.map(place => ({ ...place, city: 'Sea Breeze', knownPlace: true, addressText: `${place.title}, Sea Breeze, Baku, Azerbaijan` })),
            { title: 'Sadıqcan küçəsi', city: 'Bakı', lat: 40.4055, lon: 49.8738, keywords: 'sadıqcan küçəsi sadiqcan kucesi sadigcan kuchesi sadiqcan kuce sadıqcan küç sadigcan kuc sadigcan street' },
            { title: 'Montin', city: 'Bakı', lat: 40.4094, lon: 49.8747, keywords: 'montin montinn montın' },
            { title: 'Montin qəsəbəsi', city: 'Bakı', lat: 40.4102, lon: 49.8760, keywords: 'montin qesebesi montin qəsəbəsi montin qesebe' },
            { title: 'Montin bazarı', city: 'Bakı', lat: 40.4109, lon: 49.8754, keywords: 'montin bazari montin bazarı montin market bazar' },
            { title: 'Nərimanov', city: 'Bakı', lat: 40.4022, lon: 49.8717, keywords: 'nerimanov nərimanov neriman narimanov nariman' },
            { title: 'Gənclik', city: 'Bakı', lat: 40.4006, lon: 49.8507, keywords: 'gənclik genclik genceklik ganclik metro' },
            { title: '28 May', city: 'Bakı', lat: 40.3798, lon: 49.8486, keywords: '28 may iyirmi sekkiz may 28 ma metro' },
            { title: 'Memar Əcəmi', city: 'Bakı', lat: 40.4108, lon: 49.8138, keywords: 'memar əcəmi memar ecemi mem ec memecemi ajami acami metro' },
            { title: 'Yasamal', city: 'Bakı', lat: 40.3770, lon: 49.8060, keywords: 'yasamal yasam baki bakı rayon' },
            { title: 'Elmlər Akademiyası', city: 'Bakı', lat: 40.3750, lon: 49.8122, keywords: 'elmler akademiyasi elmlər akademiyası elmler elmlər akademiya metro' },
            { title: 'İnşaatçılar', city: 'Bakı', lat: 40.3916, lon: 49.8028, keywords: 'insaatcilar inşaatçılar insaatcılar inshaatchilar metro' },
            { title: 'Xətai', city: 'Bakı', lat: 40.3834, lon: 49.8751, keywords: 'xetai xətai khatai metro' },
            { title: 'Əhmədli', city: 'Bakı', lat: 40.3855, lon: 49.9527, keywords: 'ehmedli əhmədli ahmadli ahmedli metro' },
            { title: 'Həzi Aslanov', city: 'Bakı', lat: 40.3735, lon: 49.9537, keywords: 'hezi aslanov həzi aslanov hazi aslanov metro' },
            { title: 'Neftçilər', city: 'Bakı', lat: 40.4110, lon: 49.9435, keywords: 'neftciler neftçilər neftchiler metro' },
            { title: 'Qara Qarayev', city: 'Bakı', lat: 40.4178, lon: 49.9344, keywords: 'qara qarayev gara garayev qara qara metro' },
            { title: 'Koroğlu', city: 'Bakı', lat: 40.4216, lon: 49.9183, keywords: 'koroglu koroğlu koroghlu metro' },
            { title: 'Azadlıq', city: 'Bakı', lat: 40.4252, lon: 49.8417, keywords: 'azadliq azadlıq azadlig metro' },
            { title: 'Dərnəgül', city: 'Bakı', lat: 40.4258, lon: 49.8606, keywords: 'dernegul dərnəgül darnegul metro' },
            { title: 'Bakıxanov', city: 'Bakı', lat: 40.4212, lon: 49.9644, keywords: 'bakixanov bakıxanov bakihanov razin' },
            { title: 'Buzovna', city: 'Bakı', lat: 40.5194, lon: 50.1139, keywords: 'buzovna buzovna qesebesi' },
            { title: 'Mərdəkan', city: 'Bakı', lat: 40.4920, lon: 50.1429, keywords: 'merdekan mərdekan mərdəkan mardakan' },
            { title: 'Bilgəh', city: 'Bakı', lat: 40.5680, lon: 50.0378, keywords: 'bilgeh bilgəh bilgah' },
            { title: 'Park Azure', city: 'Bakı', lat: 40.3832, lon: 49.8758, keywords: 'park azure park azur azure xetai' },
            { title: 'Port Baku', city: 'Bakı', lat: 40.3736, lon: 49.8586, keywords: 'port baku port baki port bakı' },
            { title: 'Ağ Şəhər', city: 'Bakı', lat: 40.3843, lon: 49.8876, keywords: 'ag seher ağ şəhər ag sheher white city' },
            { title: 'White City', city: 'Bakı', lat: 40.3843, lon: 49.8876, keywords: 'white city ag seher ağ şəhər' },
            { title: 'Grand Hayat', city: 'Bakı', lat: 40.3989, lon: 49.8232, keywords: 'grand hayat grand hayat yasamal' },
            { title: 'Crescent Bay', city: 'Bakı', lat: 40.3597, lon: 49.8363, keywords: 'crescent bay crescent bəy bayil' },
            { title: 'Badamdar', city: 'Bakı', lat: 40.3378, lon: 49.8039, keywords: 'badamdar badamdar qesebesi' },
            { title: 'Bayıl', city: 'Bakı', lat: 40.3497, lon: 49.8354, keywords: 'bayil bayıl bail' },
            { title: 'Sahil', city: 'Bakı', lat: 40.3712, lon: 49.8424, keywords: 'sahil metro bulvar' },
            { title: 'Nizami', city: 'Bakı', lat: 40.3791, lon: 49.8306, keywords: 'nizami nizami metro' },
            { title: '8 Noyabr', city: 'Bakı', lat: 40.3997, lon: 49.8297, keywords: '8 noyabr sekkiz noyabr 8 no metro' }
        ];
        const BUILTIN_LOCATION_SUGGESTIONS = LOCAL_LOCATION_INDEX;

        function localLocationCandidateText(item = '') {
            return [item.title, item.city, item.keywords].filter(Boolean).join(' ');
        }

        function localLocationMatchScore(item = {}, query = '') {
            const parsed = normalizeAddressQuery(query);
            const q = parsed.normalized;
            if (q.length < 2) return 0;
            const values = [item.title, item.city, item.display_name, ...(String(item.keywords || '').split(/\s{2,}|[,;|]/))]
                .map(value => normalizeAddressQuery(value))
                .filter(value => value.normalized);
            const normalizedValues = values.flatMap(value => [value.normalized, value.loose, value.withoutSuffix]).filter(Boolean);
            const candidate = normalizeAddressQuery(localLocationCandidateText(item));
            const text = candidate.normalized;
            const looseText = candidate.loose;
            if (normalizedValues.some(value => value === q || value === parsed.loose || (parsed.withoutSuffix && value === parsed.withoutSuffix))) return 120;
            if (normalizedValues.some(value => value.startsWith(q) || value.startsWith(parsed.loose)) || text.includes(q) || looseText.includes(parsed.loose)) return 95;
            if (parsed.withoutSuffix && (text.includes(parsed.withoutSuffix) || looseText.includes(parsed.withoutSuffix.replace(/q/g, 'g')))) return 88;
            if (locationTextContains(text, q) || locationTextContains(looseText, parsed.loose)) return 78;
            const targetTokens = looseText.split(' ').filter(Boolean);
            const fuzzyTokens = parsed.looseTokens.filter(token => !['kuce', 'prospekt', 'qesebe', 'rayon', 'metro'].includes(token));
            const typoMatch = fuzzyTokens.every(token => targetTokens.some(target => {
                if (locationTokenMatches(token, target)) return true;
                const prefix = target.slice(0, Math.min(target.length, Math.max(token.length, 3)));
                const maxDistance = token.length >= 7 ? 2 : 1;
                return token.length >= 3 && levenshteinDistance(token, prefix) <= maxDistance;
            }));
            return typoMatch ? 60 : 0;
        }

        function locationIndexRow(item) {
            const displayName = item.addressText || `${item.title}, ${item.city}, Azerbaijan`;
            return {
                source: item.knownPlace ? 'known' : 'local',
                type: item.knownPlace ? 'known_place' : 'neighbourhood',
                class: 'place',
                lat: item.lat,
                lon: item.lon,
                display_name: displayName,
                address: { city: item.city, city_district: item.city === 'Sea Breeze' && item.title !== 'Sea Breeze' ? item.title : item.city, suburb: item.title, neighbourhood: item.title },
                projectTitle: item.city === 'Sea Breeze' && item.title !== 'Sea Breeze' ? item.title : '',
                knownPlace: Boolean(item.knownPlace),
                addressText: displayName,
            };
        }

        function localLocationRowsForQuery(query = '') {
            const q = String(query || '').trim();
            if (q.length < 3) return [];
            return LOCAL_LOCATION_INDEX
                .map((item, index) => ({ item, index, score: localLocationMatchScore(item, q) }))
                .filter(entry => entry.score > 0)
                .sort((a, b) => b.score - a.score || a.index - b.index)
                .map(entry => locationIndexRow(entry.item))
                .slice(0, 6);
        }

        const PROJECT_ALIAS_FALLBACKS = {
            'Reportage Heights': ['reportage', 'reportage heights', 'sea breeze reportage', 'kazino yanı', 'halfmoon yanı', 'halfmoon'],
            'Brabus Island': ['brabus', 'brabus island', 'brabus island baku', 'sea breeze brabus'],
            'Sea Breeze': ['seabreeze', 'sea breeze baku', 'sea breeze resort'],
            'Panorama by Elie Saab': ['panorama', 'elie saab', 'panorama elie saab'],
            'Caspian Dream Liner': ['caspian', 'dream liner', 'caspian dream'],
            'The Grand': ['grand', 'the grand sea breeze'],
            'Park Residences': ['park residence', 'park residences'],
            'Gardens Residences': ['garden residence', 'gardens residences'],
            'Malibu Residence': ['malibu', 'malibu residence']
        };

        function projectAliases(project = {}) {
            const explicit = String(project.aliases || '').split(/[\n,;|]+/).map(item => item.trim()).filter(Boolean);
            return [...new Set([...(PROJECT_ALIAS_FALLBACKS[project.title] || []), ...explicit])];
        }

        function hasProjectCoordinates(project = {}) {
            return isValidCoordinate(project.latitude, project.longitude);
        }

        function hasVerifiedProjectCoordinates(project = {}) {
            return Boolean(project.mapLocationVerified) && hasProjectCoordinates(project);
        }

        function projectLocationRowsForQuery(query = '') {
            const parsed = normalizeAddressQuery(query);
            const q = parsed.normalized;
            if (q.length < 2) return [];
            return getOfficialProjects().map((project, index) => {
                const title = normalizeAddressQuery(project.title || '');
                const aliases = projectAliases(project).map(alias => normalizeAddressQuery(alias));
                const address = normalizeAddressQuery([project.mapLocationLabel, project.zone, project.location, project.address, project.streetAddress].filter(Boolean).join(' '));
                let score = 0, matchKind = 'project';
                if (title.normalized === q) score = 500;
                else if (aliases.some(a => a.normalized === q || a.loose === parsed.loose)) { score = 450; matchKind = 'alias'; }
                else if (title.normalized.includes(q) || q.includes(title.normalized)) score = 380;
                else if (aliases.some(a => a.normalized.includes(q) || a.loose.includes(parsed.loose))) { score = 350; matchKind = 'alias'; }
                else if (address.normalized.includes(q)) { score = 300; matchKind = 'address'; }
                if (!score) return null;
                const verified = hasVerifiedProjectCoordinates(project);
                return {
                    source: 'project', type: 'project', class: 'place', projectId: project.id, projectTitle: project.title,
                    lat: Number.isFinite(Number(project.latitude)) ? project.latitude : null, lon: Number.isFinite(Number(project.longitude)) ? project.longitude : null,
                    display_name: project.mapLocationLabel || `${project.title}, Sea Breeze, Baku, Azerbaijan`,
                    name: project.title,
                    address: { city: 'Sea Breeze', city_district: project.title, suburb: project.title, neighbourhood: project.title },
                    verifiedProjectLocation: verified, matchKind, score: score + (verified ? 20 : 0), index
                };
            }).filter(Boolean).sort((a,b) => b.score - a.score || a.index - b.index).slice(0, 8);
        }

        function locationRowsBeforeRemote(query = '') {
            return mergeLocationRows(projectLocationRowsForQuery(query), localLocationRowsForQuery(query), 8);
        }

        function mergeLocationRows(...args) {
            let limit = 8;
            if (typeof args[args.length - 1] === 'number') limit = args.pop();
            const seen = new Set();
            return args.flat().filter(item => {
                const key = item?.source === 'project'
                    ? `project:${normalizeLocationSearchText(item.projectTitle || item.display_name)}`
                    : ((item?.source === 'local' || item?.source === 'known')
                        ? `local:${normalizeLocationSearchText(item.display_name)}`
                        : (item?.mapbox_id || item?.osm_id || `${item?.lat},${item?.lon},${item?.display_name}`));
                if (!item || seen.has(key)) return false;
                if (item.lat !== null && item.lat !== undefined && item.lon !== null && item.lon !== undefined && !isValidCoordinate(item.lat, item.lon)) return false;
                seen.add(key);
                return true;
            }).slice(0, limit);
        }

        function exactGenericLocationQueryMatch(item = {}, query = '') {
            const q = normalizeLocationSearchText(query);
            const name = normalizeLocationSearchText(item.name || String(item.display_name || '').split(',')[0] || '');
            if (!q || !name) return false;
            const aliases = {
                baki: ['baki', 'baku'],
                baku: ['baki', 'baku'],
                seki: ['seki', 'sheki'],
                sheki: ['seki', 'sheki'],
                azerbaycan: ['azerbaycan', 'azerbaijan'],
                azerbaijan: ['azerbaycan', 'azerbaijan'],
            };
            if (q === name) return true;
            return (aliases[name] || []).includes(q);
        }

        function isWeakGenericRemoteLocation(item = {}, query = '') {
            const type = String(item.type || item.class || '').toLowerCase();
            const display = String(item.display_name || item.name || '');
            const firstPart = display.split(',')[0] || item.name || '';
            const genericType = ['country', 'region', 'place', 'locality'].includes(type);
            const genericName = ['baki', 'baku', 'seki', 'sheki', 'azerbaycan', 'azerbaijan'].includes(normalizeLocationSearchText(firstPart));
            if (!genericType && !genericName) return false;
            return !exactGenericLocationQueryMatch({ ...item, name: item.name || firstPart }, query);
        }

        function filterRemoteLocationRows(rows = [], query = '') {
            return (Array.isArray(rows) ? rows : []).filter(item => {
                if (!isValidCoordinate(item?.lat, item?.lon)) return false;
                return !isWeakGenericRemoteLocation(item, query);
            });
        }

        function isSearchResponseCurrent(inputId = '', tokenName = '', token = '', query = '') {
            const currentQuery = (document.getElementById(inputId)?.value || '').trim();
            return window[tokenName] === token && currentQuery === query;
        }

        function applyProjectLocationSelection(projectTitle = '') {
            const title = String(projectTitle || '').trim();
            if (!title) return;
            const regionSelect = document.getElementById('sb-region-type');
            if (regionSelect && regionSelect.value !== 'seabreeze') {
                regionSelect.value = 'seabreeze';
                handleListingRegionTypeChange();
            }
            const projectSelect = document.getElementById('sb-project');
            if (projectSelect) {
                const option = Array.from(projectSelect.options).find(opt => opt.value.toLocaleLowerCase('az-AZ') === title.toLocaleLowerCase('az-AZ'));
                if (option) projectSelect.value = option.value;
            }
            const districtInput = document.getElementById('sb-district');
            if (districtInput) districtInput.value = title;
            const settlementInput = document.getElementById('sb-settlement');
            if (settlementInput) settlementInput.value = title;
            const streetInput = document.getElementById('sb-street-address');
            if (streetInput) streetInput.value = title;
        }

        function adminLocationSearchCity() {
            const region = document.getElementById('sb-region-type')?.value || '';
            const city = document.getElementById('sb-project')?.value || '';
            if (region === 'general' && city) return city;
            return 'Sea Breeze, Bakı';
        }


        function titleCaseAddressVariant(value = '') {
            return String(value || '').split(' ').filter(Boolean).map(part => part.charAt(0).toLocaleUpperCase('az-AZ') + part.slice(1)).join(' ');
        }

        function isAzerbaijanOrBakuContextIncluded(value = '') {
            return /\b(azerbaijan|azərbaycan|azerbaycan|baku|bakı|baki)\b/i.test(normalizeAddressQuery(value).normalized);
        }

        function isSeaBreezeKnownPlaceQuery(value = '') {
            const normalized = normalizeLocationSearchText(value);
            if (!normalized) return false;
            return KNOWN_SEA_BREEZE_PLACES.some(place => {
                const title = normalizeLocationSearchText(place.title);
                return normalized === title || title.includes(normalized) || normalized.includes(title);
            });
        }

        function withAddressSearchContext(value = '', { city = 'Bakı' } = {}) {
            const raw = String(value || '').trim();
            if (!raw || isAzerbaijanOrBakuContextIncluded(raw)) return raw;
            if (isSeaBreezeKnownPlaceQuery(raw)) return `${raw}, Sea Breeze, Baku, Azerbaijan`;
            return `${raw}, ${city || 'Baku'}, Azerbaijan`;
        }

        function addressRemoteQueryVariants(query = '', { city = 'Bakı', district = '' } = {}) {
            const parsed = normalizeAddressQuery(query);
            const azVariant = azSearchVariant(query);
            const normalizedKuce = parsed.normalized.replace(/\bkuce\b/g, 'kucesi');
            const titleNormalized = titleCaseAddressVariant(normalizedKuce);
            const titleWithoutSuffix = titleCaseAddressVariant(parsed.withoutSuffix);
            const raw = String(query || '').trim();
            const bases = [raw, azVariant, normalizedKuce, titleNormalized]
                .concat(titleWithoutSuffix ? [titleWithoutSuffix] : [])
                .filter(Boolean);
            const phrases = [];
            if (raw) {
                phrases.push(`${raw}, Azerbaijan`);
                phrases.push(`${raw}, Baku`);
                phrases.push(`${raw}, Sea Breeze Baku`);
            }
            bases.forEach(value => {
                phrases.push(withAddressSearchContext(value, { city }));
                phrases.push([value, district, city, 'Azərbaycan'].filter(Boolean).join(', '));
                phrases.push([value, isSeaBreezeKnownPlaceQuery(value) ? 'Sea Breeze' : '', 'Bakı', 'Azərbaycan'].filter(Boolean).join(', '));
                phrases.push([value, isSeaBreezeKnownPlaceQuery(value) ? 'Sea Breeze' : '', city, 'Azerbaijan'].filter(Boolean).join(', '));
            });
            if (titleWithoutSuffix) phrases.push(withAddressSearchContext(titleWithoutSuffix, { city }));
            return Array.from(new Set(phrases.map(value => value.replace(/\s+/g, ' ').trim()).filter(Boolean))).slice(0, 10);
        }



        const MAPBOX_BAKU_PROXIMITY = { lng: 49.8671, lat: 40.4093 };
        const MAPBOX_GEOCODING_ENDPOINT = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
        const MAPBOX_FALLBACK_WARNING = 'Mapbox Geocoding unavailable, falling back to local Azerbaijan/Baku index';
        window.__mapboxGeocodingState = window.__mapboxGeocodingState || { tokenPromise: null, warned: false };

        async function getMapboxAccessToken() {
            const state = window.__mapboxGeocodingState;
            if (!state.tokenPromise) {
                state.tokenPromise = fetch('/api/config/maps', { headers: { Accept: 'application/json' } })
                    .then(res => res.ok ? res.json() : {})
                    .then(data => String(data.mapboxAccessToken || '').trim())
                    .catch(() => '');
            }
            return state.tokenPromise;
        }

        function warnMapboxFallback() {
            const state = window.__mapboxGeocodingState;
            if (state.warned) return;
            state.warned = true;
            console.warn(MAPBOX_FALLBACK_WARNING);
        }

        function mapboxContextValue(feature = {}, idPrefix = '') {
            return (feature.context || []).find(part => String(part.id || '').startsWith(idPrefix))?.text || '';
        }

        function mapboxFeatureToLocationRow(feature = {}, fallbackQuery = '') {
            const center = Array.isArray(feature.center) ? feature.center : [];
            const lon = Number(center[0]);
            const lat = Number(center[1]);
            const displayName = feature.place_name || [feature.text, feature.properties?.address, 'Azərbaycan'].filter(Boolean).join(', ') || fallbackQuery;
            const road = feature.place_type?.includes('address') ? (feature.text || '') : '';
            const houseNumber = feature.address || feature.properties?.address || '';
            const neighbourhood = mapboxContextValue(feature, 'neighborhood') || (feature.place_type?.includes('neighborhood') ? feature.text : '');
            const suburb = mapboxContextValue(feature, 'locality') || neighbourhood;
            const city = mapboxContextValue(feature, 'place') || mapboxContextValue(feature, 'region') || 'Bakı';
            return {
                source: 'mapbox',
                type: feature.place_type?.[0] || 'place',
                class: 'place',
                mapbox_id: feature.id || '',
                lat,
                lon,
                display_name: displayName,
                name: feature.text || displayName,
                address: {
                    road,
                    house_number: houseNumber,
                    suburb,
                    neighbourhood,
                    city,
                    city_district: city,
                    country: mapboxContextValue(feature, 'country') || 'Azerbaijan',
                },
                relevance: Number(feature.relevance || 0),
            };
        }

        async function mapboxGeocodingSearch(query = '', { city = 'Bakı', district = '' } = {}) {
            const q = String(query || '').trim();
            if (q.length < 3) return [];
            const token = await getMapboxAccessToken();
            if (!token) throw new Error('MAPBOX_ACCESS_TOKEN is missing');
            const variants = addressRemoteQueryVariants(q, { city, district }).slice(0, 4);
            const responses = await Promise.all(variants.map(phrase => {
                const params = new URLSearchParams({
                    country: 'az',
                    language: 'az',
                    limit: '8',
                    autocomplete: 'true',
                    proximity: `${MAPBOX_BAKU_PROXIMITY.lng},${MAPBOX_BAKU_PROXIMITY.lat}`,
                    access_token: token,
                });
                const url = `${MAPBOX_GEOCODING_ENDPOINT}/${encodeURIComponent(phrase)}.json?${params.toString()}`;
                return fetch(url, { headers: { Accept: 'application/json' } }).then(res => {
                    if (!res.ok) throw new Error(`Mapbox Geocoding status: ${res.status}`);
                    return res.json();
                });
            }));
            const seen = new Set();
            return responses
                .flatMap(data => Array.isArray(data.features) ? data.features : [])
                .map(feature => mapboxFeatureToLocationRow(feature, q))
                .filter(item => {
                    if (!isValidCoordinate(item.lat, item.lon)) return false;
                    const key = item.mapbox_id || `${item.lat},${item.lon},${item.display_name}`;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                })
                .sort((a, b) => locationDistanceKm(a.lat, a.lon, MAPBOX_BAKU_PROXIMITY.lat, MAPBOX_BAKU_PROXIMITY.lng) - locationDistanceKm(b.lat, b.lon, MAPBOX_BAKU_PROXIMITY.lat, MAPBOX_BAKU_PROXIMITY.lng))
                .slice(0, 8);
        }

        function locationDistanceKm(lat1, lon1, lat2, lon2) {
            const toRad = deg => Number(deg) * Math.PI / 180;
            const dLat = toRad(lat2 - lat1);
            const dLon = toRad(lon2 - lon1);
            const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
            return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }

        async function resolveLocationResult(item) {
            return item;
        }

        async function nominatimRemoteSearch(query = '', { city = 'Bakı', district = '' } = {}) {
            const q = String(query || '').trim();
            if (q.length < 3) return [];
            const searchPhrases = addressRemoteQueryVariants(q, { city, district });
            const responses = await Promise.all(searchPhrases.map(phrase => {
                const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=az&q=${encodeURIComponent(phrase)}`;
                return fetch(url, { headers: { Accept: 'application/json' } }).then(res => res.ok ? res.json() : []);
            }));
            const seen = new Set();
            return responses.flat().filter(item => {
                const key = item?.mapbox_id || item?.osm_id || `${item?.lat},${item?.lon},${item?.display_name}`;
                if (!item || seen.has(key)) return false;
                seen.add(key);
                return true;
            }).slice(0, 8);
        }

        async function searchLocationsWithPriority(query = '', { city = 'Bakı', district = '', includeLocal = true } = {}) {
            const q = String(query || '').trim();
            console.info('[map-search] query', q);
            if (q.length < 3) {
                console.info('[map-search] provider local count', 0);
                console.info('[map-search] provider mapbox count', 0);
                console.info('[map-search] provider nominatim count', 0);
                console.info('[map-search] final count', 0);
                return [];
            }
            const localRows = includeLocal ? mergeLocationRows(projectLocationRowsForQuery(q), localLocationRowsForQuery(q), 10) : projectLocationRowsForQuery(q);
            const hasVerifiedLocalProject = localRows.some(item => item?.source === 'project' && item.verifiedProjectLocation);
            console.info('[map-search] provider local count', localRows.length);
            console.info('[map-search] verified local project match', hasVerifiedLocalProject);
            let nominatimRows = [];
            console.info('[map-search] provider mapbox count', 0);
            if (!hasVerifiedLocalProject) {
                try {
                    nominatimRows = filterRemoteLocationRows(await nominatimRemoteSearch(q, { city, district }), q);
                } catch (error) {
                    warnMapboxFallback();
                }
            }
            console.info('[map-search] provider nominatim count', nominatimRows.length);
            const finalRows = mergeLocationRows(localRows, nominatimRows, 10);
            console.info('[map-search] final count', finalRows.length);
            if (!finalRows.length) console.info('[map-search] no results after all providers');
            return finalRows;
        }

        function renderLocationSuggestionBadge(item = {}) {
            return item.knownPlace ? '<span class="known-place-badge">Tanınmış məkan</span>' : '';
        }

        function renderLocationSourceBadge(item = {}) {
            if (item.source === 'project') return `<span class="known-place-badge">${item.verifiedProjectLocation ? (item.matchKind === 'alias' ? 'Alias' : 'Təsdiqli layihə') : 'Layihə'}</span>`;
            return '<span class="known-place-badge">Xəritə</span>';
        }

        function locationSuggestionSubtext(item = {}, query = '') {
            if (item.source === 'project' && !item.verifiedProjectLocation) return 'Layihə tapıldı, xəritə yeri təsdiqlənməyib';
            return item.display_name || query;
        }

        function renderAdminLocationResults(rows, query, { loading = false, error = false } = {}) {
            const resultsEl = document.getElementById('sb-location-results');
            if (!resultsEl) return;
            resultsEl.classList.remove('hidden');
            const hasRows = Array.isArray(rows) && rows.length;
            const rowsHtml = hasRows ? rows.map((item, idx) => `<button type="button" onclick="selectAdminLocationResult(${idx})" class="admin-location-suggestion"><span class="flex items-center gap-2"><span class="block font-extrabold">${escapeHtml((item.display_name || query).split(',').slice(0, 2).join(', '))}</span>${renderLocationSuggestionBadge(item)}${renderLocationSourceBadge(item)}</span><span class="mt-1 block text-[10px] font-semibold text-slate-400">${escapeHtml(locationSuggestionSubtext(item, query))}</span></button>`).join('') : '';
            if (hasRows) {
                resultsEl.innerHTML = `${rowsHtml}${loading ? '<div class="rounded-xl bg-white/5 border border-white/10 p-2 text-gray-300">Axtarılır...</div>' : ''}`;
                return;
            }
            if (loading) {
                resultsEl.innerHTML = '<div class="rounded-xl bg-white/5 border border-white/10 p-2 text-gray-300">Axtarılır...</div>';
                return;
            }
            resultsEl.innerHTML = error
                ? '<div class="rounded-xl bg-red-500/10 border border-red-500/20 p-2 text-red-200">Axtarış alınmadı. Xəritədən pin seçə bilərsiniz.</div>'
                : '<div class="rounded-xl bg-red-500/10 border border-red-500/20 p-2 text-red-200">Uyğun yer tapılmadı. Xəritədən pin seçə bilərsiniz.</div>';
        }

        function debouncedAdminLocationSearch() {
            clearTimeout(window.__adminLocationSearchTimer);
            const queryInput = document.getElementById('sb-location-search');
            const query = (queryInput?.value || '').trim();
            const resultsEl = document.getElementById('sb-location-results');
            if (!resultsEl) return;
            if (queryInput?.dataset.selectedLocation && query !== queryInput.dataset.selectedLocation) {
                delete queryInput.dataset.selectedLocation;
                clearAdminListingCoordinates();
            }
            window.__lastAdminLocationSearchToken = `typing-${Date.now()}`;
            if (query.length < 3) {
                window.__lastAdminLocationResults = [];
                if (!query.length) clearAdminListingCoordinates({ clearAddress: true });
                resultsEl.innerHTML = query.length ? '<div class="rounded-xl bg-white/5 border border-white/10 p-2 text-gray-300">Axtarış üçün ən az 3 hərf yazın</div>' : '';
                resultsEl.classList.toggle('hidden', !query.length);
                return;
            }
            resultsEl.innerHTML = '<div class="rounded-xl bg-white/5 border border-white/10 p-2 text-gray-300">Axtarılır...</div>';
            resultsEl.classList.remove('hidden');
            window.__adminLocationSearchTimer = setTimeout(searchAdminListingLocation, 600);
        }

        async function searchAdminListingLocation() {
            const queryInput = document.getElementById('sb-location-search');
            const resultsEl = document.getElementById('sb-location-results');
            const query = (queryInput?.value || '').trim();
            if (query.length < 3 || !resultsEl) return;
            const token = `${Date.now()}-${query}`;
            window.__lastAdminLocationSearchToken = token;
            resultsEl.classList.remove('hidden');
            const instantRows = [];
            window.__lastAdminLocationResults = instantRows;
            renderAdminLocationResults(instantRows, query, { loading: true });
            const city = adminLocationSearchCity();
            const district = document.getElementById('sb-district')?.value || '';
            try {
                const rows = await searchLocationsWithPriority(query, { city, district, includeLocal: false });
                if (!isSearchResponseCurrent('sb-location-search', '__lastAdminLocationSearchToken', token, query)) return;
                window.__lastAdminLocationResults = rows;
                renderAdminLocationResults(rows, query, { error: false });
            } catch (error) {
                if (!isSearchResponseCurrent('sb-location-search', '__lastAdminLocationSearchToken', token, query)) return;
                window.__lastAdminLocationResults = [];
                renderAdminLocationResults([], query, { error: true });
            }
        }

        async function selectAdminLocationResult(index, { keepResults = false } = {}) {
            let item = (window.__lastAdminLocationResults || [])[index];
            if (!item) return;
            try {
                item = await resolveLocationResult(item);
            } catch (error) {
                warnMapboxFallback();
                return;
            }
            const searchInput = document.getElementById('sb-location-search');
            if (item.source === 'project' || item.projectTitle) applyProjectLocationSelection(item.projectTitle || item.display_name || '');
            const isUnverifiedProject = item.source === 'project' && !item.verifiedProjectLocation;
            if (isUnverifiedProject && !Number.isFinite(Number(item.lat)) && !Number.isFinite(Number(item.lon))) {
                showToast('Layihə üçün koordinat saxlanmayıb. İstəsəniz xəritədən pin seçə bilərsiniz.');
            }
            const zoom = item.type === 'house' || item.class === 'highway' ? 17 : 16;
            if (isValidCoordinate(item.lat, item.lon)) {
                setAdminListingCoordinates(item.lat, item.lon, {
                    moveMap: true,
                    reverse: false,
                    zoom,
                    note: item.source === 'project' ? 'Layihə koordinatı seçildi' : '',
                    warning: false
                });
            }
            fillLocationFieldsFromAddress(item.address || {}, item.display_name || item.name || '');
            if (searchInput) {
                searchInput.value = item.display_name || item.name || searchInput.value;
                searchInput.dataset.selectedLocation = searchInput.value;
            }
            if (fullscreenMapSource === 'admin') {
                updateFullscreenMarker([Number(item.lat), Number(item.lon)], true);
                fullscreenMap?.setView([Number(item.lat), Number(item.lon)], zoom);
                const fullscreenInput = document.getElementById('fullscreen-map-search-input');
                if (fullscreenInput) fullscreenInput.value = item.display_name || item.name || fullscreenInput.value;
            }
            if (!keepResults) document.getElementById('sb-location-results')?.classList.add('hidden');
            document.getElementById('sb-manual-pin-note')?.classList.add('hidden');
        }

        async function handleAdminLocationSearchKeydown(event) {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            if (!(window.__lastAdminLocationResults || []).length) await searchAdminListingLocation();
            await selectAdminLocationResult(0);
        }

        function renderFullscreenMapResults(rows, query, { loading = false, error = false } = {}) {
            const resultsEl = document.getElementById('fullscreen-map-results');
            if (!resultsEl) return;
            resultsEl.classList.remove('hidden');
            const hasRows = Array.isArray(rows) && rows.length;
            const rowsHtml = hasRows ? rows.map((item, idx) => `<button type="button" onclick="selectFullscreenMapResult(${idx})" class="block w-full rounded-xl px-3 py-2 text-left hover:bg-brand-50 focus:bg-brand-50 focus:outline-none"><span class="block font-extrabold text-slate-900">${escapeHtml((item.display_name || query).split(',').slice(0, 2).join(', '))}</span><span class="mt-1 block text-[11px] font-semibold text-slate-500">${escapeHtml(item.display_name || query)}</span></button>`).join('') : '';
            if (hasRows) {
                resultsEl.innerHTML = `${rowsHtml}${loading ? '<div class="rounded-xl bg-slate-50 border border-slate-100 p-3 text-slate-600 font-bold">Mapbox nəticələri yoxlanılır...</div>' : ''}`;
                return;
            }
            if (loading) {
                resultsEl.innerHTML = '<div class="rounded-xl bg-slate-50 border border-slate-100 p-3 text-slate-600 font-bold">Axtarılır...</div>';
                return;
            }
            resultsEl.innerHTML = error
                ? '<div class="rounded-xl bg-red-50 border border-red-100 p-3 text-red-700 font-bold">Axtarış alınmadı. Yenidən cəhd edin.</div>'
                : '<div class="rounded-xl bg-red-50 border border-red-100 p-3 text-red-700 font-bold">Nəticə tapılmadı.</div>';
        }

        function showFullscreenMapSuggestions() {
            if (!['admin','public'].includes(fullscreenMapSource)) return;
            const query = (document.getElementById('fullscreen-map-search-input')?.value || '').trim();
            const resultsEl = document.getElementById('fullscreen-map-results');
            if (query.length >= 2 && resultsEl) resultsEl.classList.remove('hidden');
        }

        function debouncedFullscreenMapSearch() {
            clearTimeout(window.__fullscreenMapSearchTimer);
            if (!['admin','public'].includes(fullscreenMapSource)) return;
            const query = (document.getElementById('fullscreen-map-search-input')?.value || '').trim();
            const resultsEl = document.getElementById('fullscreen-map-results');
            if (query.length < 2) {
                if (resultsEl) {
                    resultsEl.innerHTML = '';
                    resultsEl.classList.add('hidden');
                }
                return;
            }
            const instantRows = locationRowsBeforeRemote(query);
            window.__lastFullscreenMapResults = instantRows;
            renderFullscreenMapResults(instantRows, query, { loading: true });
            window.__fullscreenMapSearchTimer = setTimeout(searchFullscreenMapLocation, 250);
        }

        async function searchFullscreenMapLocation() {
            if (!['admin','public'].includes(fullscreenMapSource)) return;
            const query = (document.getElementById('fullscreen-map-search-input')?.value || '').trim();
            const resultsEl = document.getElementById('fullscreen-map-results');
            if (query.length < 2 || !resultsEl) return;
            const token = `${Date.now()}-${query}`;
            window.__lastFullscreenMapSearchToken = token;
            resultsEl.classList.remove('hidden');
            const instantRows = locationRowsBeforeRemote(query);
            window.__lastFullscreenMapResults = instantRows;
            renderFullscreenMapResults(instantRows, query, { loading: true });
            const city = fullscreenMapSource === 'admin' ? adminLocationSearchCity() : 'Bakı';
            try {
                const rows = await searchLocationsWithPriority(query, { city });
                if (!isSearchResponseCurrent('fullscreen-map-search-input', '__lastFullscreenMapSearchToken', token, query)) return;
                window.__lastFullscreenMapResults = rows;
                renderFullscreenMapResults(rows, query, { error: !rows.length });
            } catch (error) {
                if (!isSearchResponseCurrent('fullscreen-map-search-input', '__lastFullscreenMapSearchToken', token, query)) return;
                window.__lastFullscreenMapResults = [];
                renderFullscreenMapResults([], query, { error: true });
            }
        }

        function setDetailMapPoint(point, zoom = 16, address = '') {
            if (!Array.isArray(point) || !fullscreenMap) return;
            fullscreenMap.setView(point, zoom);
            updateFullscreenMarker(point, false);
            if (detailListingMap) {
                detailListingMap.setView(point, zoom);
                if (!detailListingMarker) detailListingMarker = L.marker(point).addTo(detailListingMap);
                else detailListingMarker.setLatLng(point);
            }
            if (window.activePropertyListing) {
                window.activePropertyListing.latitude = point[0];
                window.activePropertyListing.longitude = point[1];
                if (address) window.activePropertyListing.streetAddress = address;
            }
            if (address) document.getElementById('p-modal-street-address').textContent = `📌 ${address}`;
        }

        async function selectFullscreenMapResult(index) {
            let item = (window.__lastFullscreenMapResults || [])[index];
            if (!item) return;
            try {
                item = await resolveLocationResult(item);
            } catch (error) {
                warnMapboxFallback();
                return;
            }
            const point = [Number(item.lat), Number(item.lon)];
            if (!isValidCoordinate(point[0], point[1])) return;
            const zoom = item.type === 'house' || item.class === 'highway' ? 17 : 16;
            const address = item.display_name || item.name || '';
            if (fullscreenMapSource === 'admin' || fullscreenMapSource === 'public') {
                setFullscreenMapSelection(point[0], point[1], { address, addressData: item.address || null, projectTitle: item.projectTitle || '', updateMarker: true, moveMap: true, zoom });
            } else {
                return;
            }
            const input = document.getElementById('fullscreen-map-search-input');
            if (input) input.value = address || input.value;
        }


        async function handleFullscreenMapSearchKeydown(event) {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            if (!(window.__lastFullscreenMapResults || []).length) await searchFullscreenMapLocation();
            await selectFullscreenMapResult(0);
            document.getElementById('fullscreen-map-results')?.classList.add('hidden');
        }


        let leafletLoadPromise = null;
        function ensureLeafletLoaded() {
            if (typeof L !== 'undefined') return Promise.resolve();
            if (leafletLoadPromise) return leafletLoadPromise;
            leafletLoadPromise = new Promise((resolve, reject) => {
                const existingCss = document.querySelector('link[data-leaflet-css]');
                if (!existingCss) {
                    const css = document.createElement('link');
                    css.rel = 'stylesheet';
                    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                    css.dataset.leafletCss = 'true';
                    document.head.appendChild(css);
                }
                const existingScript = document.querySelector('script[data-leaflet-js]');
                if (existingScript) {
                    existingScript.addEventListener('load', resolve, { once: true });
                    existingScript.addEventListener('error', reject, { once: true });
                    return;
                }
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                script.defer = true;
                script.dataset.leafletJs = 'true';
                script.onload = resolve;
                script.onerror = () => reject(new Error('Leaflet xəritə kitabxanası yüklənmədi.'));
                document.head.appendChild(script);
            });
            return leafletLoadPromise;
        }

        function addOpenStreetMapLayer(map) {
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);
        }

        function updateMobileModalMetrics() {
            const bottomNavHeight = document.querySelector('.mobile-bottom-nav')?.offsetHeight || 80;
            document.documentElement.style.setProperty('--mobile-bottom-nav-height', `${bottomNavHeight}px`);
        }

        const APP_MODAL_IDS = [
            'project-inquiry-modal',
            'property-detail-modal',
            'project-detail-modal-official',
            'project-lightbox',
            'media-modal',
            'property-lightbox',
            'fullscreen-map-modal',
            'user-edit-modal',
            'contact-phone-modal',
            'listing-submission-overlay',
            'listing-result-modal'
        ];
        const MODAL_STATE_CLASSES = ['modal-open', 'no-scroll', 'blur-active', 'overflow-hidden', 'is-modal-open', 'has-modal-open', 'backdrop-active', 'overlay-active', 'blurred', 'is-blurred', 'app-blur', 'modal-blur'];
        const MODAL_BACKGROUND_SELECTORS = ['#app', '#root', '#page', '#main', 'main', '.app', '.page', '.content', '.tab-content', '.page-shell', '.public-page'];
        const MODAL_BACKGROUND_CLASSES = ['blur', 'blur-sm', 'blur-md', 'blur-lg', 'backdrop-blur', 'backdrop-blur-sm', 'backdrop-blur-md', 'filter', 'is-blurred', 'app-blur', 'modal-blur'];

        function isElementVisibleById(id) {
            const el = document.getElementById(id);
            return Boolean(el && !el.classList.contains('hidden'));
        }

        function getVisibleModalIds() {
            return APP_MODAL_IDS.filter(isElementVisibleById);
        }

        function ensureGlobalModalBackdrop() {
            let backdrop = document.getElementById('global-modal-backdrop');
            if (!backdrop) {
                backdrop = document.createElement('div');
                backdrop.id = 'global-modal-backdrop';
                backdrop.className = 'modal-backdrop';
                backdrop.setAttribute('aria-hidden', 'true');
                document.body.appendChild(backdrop);
            }
            return backdrop;
        }

        function cleanupModalState() {
            document.body.classList.remove(...MODAL_STATE_CLASSES);
            document.documentElement.classList.remove(...MODAL_STATE_CLASSES);
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
            document.body.style.filter = '';
            document.documentElement.style.filter = '';
            document.getElementById('global-modal-backdrop')?.classList.remove('active', 'is-active', 'open', 'is-open', 'show', 'visible');

            MODAL_BACKGROUND_SELECTORS.forEach((selector) => {
                document.querySelectorAll(selector).forEach((el) => {
                    el.classList.remove(...MODAL_BACKGROUND_CLASSES);
                    el.style.filter = '';
                    el.style.backdropFilter = '';
                    el.style.webkitBackdropFilter = '';
                    el.style.opacity = '';
                    if (el.dataset.modalAriaHidden === 'true') {
                        el.removeAttribute('aria-hidden');
                        delete el.dataset.modalAriaHidden;
                    }
                    if (el.dataset.modalInert === 'true') {
                        el.removeAttribute('inert');
                        delete el.dataset.modalInert;
                    }
                });
            });

            document.querySelectorAll('.modal-glass-backdrop.hidden, .fullscreen-map-backdrop.hidden, [data-modal-backdrop].hidden, .modal-backdrop.hidden, .site-overlay.hidden, [data-site-overlay].hidden').forEach((el) => {
                el.classList.remove('active', 'is-active', 'open', 'is-open', 'show', 'visible', 'backdrop-active', 'overlay-active');
                if (el.dataset.modalAriaHidden === 'true') {
                    el.removeAttribute('aria-hidden');
                    delete el.dataset.modalAriaHidden;
                }
                if (el.dataset.modalInert === 'true') {
                    el.removeAttribute('inert');
                    delete el.dataset.modalInert;
                }
            });
        }

        function setModalOpenState(isOpen) {
            updateMobileModalMetrics();
            if (!isOpen) {
                cleanupModalState();
                return;
            }
            document.body.classList.add('modal-open');
            ensureGlobalModalBackdrop().classList.add('active');
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';
        }

        function syncModalOpenState() {
            const visibleModalIds = getVisibleModalIds();
            setModalOpenState(visibleModalIds.length > 0);
            APP_MODAL_IDS.forEach((id) => {
                const modal = document.getElementById(id);
                if (!modal) return;
                modal.classList.toggle('is-active', visibleModalIds.includes(id));
                if (!visibleModalIds.includes(id)) modal.classList.remove('active', 'open', 'show', 'visible', 'backdrop-active', 'overlay-active');
            });
        }


        function forceHideUserEditModal() {
            const modal = document.getElementById('user-edit-modal');
            if (!modal) return;
            modal.classList.add('hidden');
            modal.classList.remove('active', 'is-active', 'open', 'is-open', 'show', 'visible', 'backdrop-active', 'overlay-active');
            modal.setAttribute('aria-hidden', 'true');
            modal.style.display = '';
            modal.style.visibility = '';
            const password = document.getElementById('edit-user-password');
            if (password) password.value = '';
        }

        function emergencyStartupOverlayCleanup() {
            forceHideUserEditModal();
            cleanupModalState();
            document.querySelectorAll('.modal-backdrop, .site-overlay, [data-site-overlay], [data-modal-backdrop]').forEach((el) => {
                if (el.id === 'global-modal-backdrop') return;
                if (APP_MODAL_IDS.includes(el.id)) return;
                const ownsVisibleModal = el.closest(APP_MODAL_IDS.map(id => `#${id}`).join(','));
                if (ownsVisibleModal) return;
                el.remove();
            });
            document.querySelectorAll('.modal-glass-backdrop, .fullscreen-map-backdrop').forEach((el) => {
                if (!APP_MODAL_IDS.includes(el.id)) return;
                el.classList.add('hidden');
                el.classList.remove('active', 'is-active', 'open', 'is-open', 'show', 'visible', 'backdrop-active', 'overlay-active');
                if (el.id === 'user-edit-modal') el.setAttribute('aria-hidden', 'true');
            });
            syncModalOpenState();
        }

        let fullscreenMapCloseCleanup = null;

        function renderListingDetailMap(listing = {}) {
            const mapEl = document.getElementById('p-modal-location-map');
            const frameEl = document.getElementById('p-modal-map-frame');
            const lat = Number(listing.latitude);
            const lng = Number(listing.longitude);
            const relatedProject = getOfficialProjects().find(project => project.title === listing.project);
            const hasListingCoordinates = isValidCoordinate(listing.latitude, listing.longitude);
            const hasProjectFallbackCoordinates = !hasListingCoordinates && hasProjectCoordinates(relatedProject);
            const hasCoordinates = hasListingCoordinates || hasProjectFallbackCoordinates;
            if (!mapEl) return;
            frameEl?.classList.toggle('hidden', !hasCoordinates);
            if (!hasCoordinates) {
                console.warn('[map] invalid coordinates, hiding map section');
                if (detailListingMarker) {
                    detailListingMarker.remove();
                    detailListingMarker = null;
                }
                setMapLoading('p-modal-location-map-loading', false);
                return;
            }
            if (typeof L === 'undefined') { ensureLeafletLoaded().then(() => renderListingDetailMap(listing)).catch(error => { console.error(error); setMapLoading('p-modal-location-map-loading', false); frameEl?.classList.add('hidden'); }); return; }
            const point = hasListingCoordinates ? [lat, lng] : [Number(relatedProject.latitude), Number(relatedProject.longitude)];
            const zoom = hasListingCoordinates ? 15 : 16;
            setTimeout(() => {
                if (!detailListingMap) {
                    detailListingMap = L.map(mapEl, { scrollWheelZoom: true }).setView(point, zoom);
                    window.detailListingMap = detailListingMap;
                    addOpenStreetMapLayer(detailListingMap);
                } else {
                    detailListingMap.setView(point, zoom);
                }
                if (hasCoordinates) {
                    if (!detailListingMarker) detailListingMarker = L.marker(point).addTo(detailListingMap);
                    else detailListingMarker.setLatLng(point);
                } else if (detailListingMarker) {
                    detailListingMarker.remove();
                    detailListingMarker = null;
                }
                detailListingMap.invalidateSize();
                setTimeout(() => { detailListingMap?.invalidateSize(); detailListingMap?.setView(point, zoom); }, 150);
                setTimeout(() => { detailListingMap?.invalidateSize(); detailListingMap?.setView(point, zoom); }, 500);
            }, 120);
        }

        async function geocodeListingDetailAddressFallback(listing = {}) {
            const query = [listing.streetAddress, listing.settlement, listing.district || listing.project, listing.city || 'Bakı'].filter(Boolean).join(', ');
            if (!query || query.length < 3 || !detailListingMap) return;
            const token = `${listing.id || ''}-${query}`;
            window.__lastDetailMapFallbackToken = token;
            try {
                const rows = await searchLocationsWithPriority(query, { city: listing.city || 'Bakı', district: listing.district || listing.project || '' });
                if (window.__lastDetailMapFallbackToken !== token) return;
                const item = rows.find(row => Number.isFinite(Number(row.lat)) && Number.isFinite(Number(row.lon)));
                if (!item) return;
                const point = [Number(item.lat), Number(item.lon)];
                detailListingMap.setView(point, item.type === 'house' ? 17 : 15);
                if (!detailListingMarker) detailListingMarker = L.marker(point).addTo(detailListingMap);
                else detailListingMarker.setLatLng(point);
            } catch (error) {
                console.warn('Detail xəritə ünvan geokodinqi alınmadı:', error.message);
            }
        }


        function fullscreenSearchCity() {
            if (fullscreenMapSource === 'public') return publicLocationCity();
            return adminLocationSearchCity();
        }
        function debouncedFullscreenLocationSearch() { clearTimeout(window.__fullscreenLocationTimer); const q=(document.getElementById('fullscreen-location-search')?.value||'').trim(); const el=document.getElementById('fullscreen-location-results'); if(!el) return; window.__lastFullscreenLocationToken=`typing-${Date.now()}`; if(q.length<3){ window.__lastFullscreenLocationResults=[]; el.innerHTML=q.length?'<div class="rounded-xl bg-slate-50 p-2 font-bold text-slate-600">Axtarış üçün ən az 3 hərf yazın</div>':''; el.classList.toggle('hidden',!q.length); return;} el.innerHTML='<div class="rounded-xl bg-slate-50 p-2 font-bold text-slate-600">Axtarılır...</div>'; el.classList.remove('hidden'); window.__fullscreenLocationTimer=setTimeout(searchFullscreenLocation,600); }
        async function searchFullscreenLocation() { const q=(document.getElementById('fullscreen-location-search')?.value||'').trim(); if(q.length<3) return; const token=`${Date.now()}-${q}`; window.__lastFullscreenLocationToken=token; const instantRows=locationRowsBeforeRemote(q); window.__lastFullscreenLocationResults=instantRows; renderPublicLocationResults(instantRows,q,'fullscreen',{loading:true}); try { const rows=await searchLocationsWithPriority(q,{city:fullscreenSearchCity()}); if(!isSearchResponseCurrent('fullscreen-location-search','__lastFullscreenLocationToken',token,q)) return; window.__lastFullscreenLocationResults=rows; renderPublicLocationResults(rows,q,'fullscreen',{error:false}); } catch(e){ if(!isSearchResponseCurrent('fullscreen-location-search','__lastFullscreenLocationToken',token,q)) return; window.__lastFullscreenLocationResults=[]; renderPublicLocationResults([],q,'fullscreen',{error:true}); } }
        async function selectFullscreenLocationResult(index) {
            let item = (window.__lastFullscreenLocationResults || [])[index];
            if (!item) return;
            try { item = await resolveLocationResult(item); } catch (error) { warnMapboxFallback(); return; }
            const input = document.getElementById('fullscreen-location-search');
            if (input) input.value = item.display_name || item.name || input.value;
            document.getElementById('fullscreen-location-results')?.classList.add('hidden');
            const point = [Number(item.lat), Number(item.lon)];
            if (!isValidCoordinate(point[0], point[1])) return;
            const zoom = item.type === 'house' ? 17 : 16;
            setFullscreenMapSelection(point[0], point[1], { address: item.display_name || item.name || '', addressData: item.address || null, projectTitle: item.projectTitle || '', updateMarker: true, moveMap: true, zoom, manual: false });
        }


        async function handleFullscreenLocationSearchKeydown(event) {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            if (!(window.__lastFullscreenLocationResults || []).length) await searchFullscreenLocation();
            await selectFullscreenLocationResult(0);
        }

        function setBackgroundMapsDisabled(disabled) {
            ['sb-location-map', 'pl-location-map', 'p-modal-location-map'].forEach(id => {
                const mapEl = document.getElementById(id);
                mapEl?.classList.toggle('is-background-disabled', Boolean(disabled));
                mapEl?.closest('.map-frame')?.classList.toggle('is-background-disabled', Boolean(disabled));
            });
        }

        function setFullscreenMapSelection(lat, lng, { address = '', addressData = null, projectTitle = '', updateMarker = true, moveMap = false, zoom = 16, manual = false } = {}) {
            const latNum = Number(lat);
            const lngNum = Number(lng);
            if (!isValidCoordinate(latNum, lngNum)) return;
            fullscreenMapSelection = { lat: latNum, lng: lngNum, address, addressData, projectTitle, manual };
            const point = [latNum, lngNum];
            if (updateMarker) updateFullscreenMarker(point, ['admin','public'].includes(fullscreenMapSource));
            if (moveMap) fullscreenMap?.setView(point, zoom);
        }

        async function applyFullscreenSelectionReverseGeocode(selection) {
            if (!selection || selection.manual || selection.addressData || selection.address) return selection;
            try {
                const data = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${encodeURIComponent(selection.lat)}&lon=${encodeURIComponent(selection.lng)}`, { headers: { Accept: 'application/json' } }).then(res => res.json());
                return { ...selection, addressData: data.address || null, address: data.display_name || '' };
            } catch (error) {
                console.warn('Modal reverse geocoding alınmadı:', error.message);
                return selection;
            }
        }

        async function confirmFullscreenMapSelection() {
            if (!['admin','public'].includes(fullscreenMapSource) || !fullscreenMapSelection) return;
            const selection = await applyFullscreenSelectionReverseGeocode(fullscreenMapSelection);
            const zoom = fullscreenMap?.getZoom?.() || 16;
            if (fullscreenMapSource === 'admin') {
                setAdminListingCoordinates(selection.lat, selection.lng, { moveMap: true, reverse: false, zoom, manual: Boolean(selection.manual) });
                if (selection.projectTitle) applyProjectLocationSelection(selection.projectTitle);
                else fillLocationFieldsFromAddress(selection.addressData || {}, selection.address || '');
                const input = document.getElementById('sb-location-search');
                if (input && selection.address) input.value = selection.address;
            } else if (fullscreenMapSource === 'public') {
                setPublicListingCoordinates(selection.lat, selection.lng, { moveMap: true, reverse: false, zoom, manual: Boolean(selection.manual) });
                fillPublicLocationFieldsFromAddress(selection.addressData || {}, selection.address || '');
                const input = document.getElementById('pl-location-search');
                if (input && selection.address) input.value = selection.address;
            }
            closeFullscreenMap();
        }

        function currentMapPoint(source) {
            if (source === 'admin') {
                const lat = Number(document.getElementById('sb-latitude')?.value);
                const lng = Number(document.getElementById('sb-longitude')?.value);
                if (isValidCoordinate(lat, lng)) return { point: [lat, lng], zoom: Math.max(adminListingMap?.getZoom?.() || 16, 15), hasMarker: true };
                return { point: adminMapDefaultCenter(), zoom: BAKU_DEFAULT_ZOOM, hasMarker: false };
            }
            if (source === 'public') {
                const lat = Number(document.getElementById('pl-latitude')?.value);
                const lng = Number(document.getElementById('pl-longitude')?.value);
                if (isValidCoordinate(lat, lng)) return { point: [lat, lng], zoom: Math.max(publicListingMap?.getZoom?.() || 16, 15), hasMarker: true };
                return { point: publicMapDefaultCenter(), zoom: 12, hasMarker: false };
            }
            const markerPoint = detailListingMarker?.getLatLng?.();
            if (markerPoint) return { point: [markerPoint.lat, markerPoint.lng], zoom: detailListingMap?.getZoom?.() || 15, hasMarker: true };
            return { point: SEA_BREEZE_DEFAULT_CENTER, zoom: DEFAULT_SEA_BREEZE_LOCATION.zoom, hasMarker: false };
        }

        function resizeFullscreenMapAfterOpen() {
            if (!fullscreenMap) return;
            requestAnimationFrame(() => {
                fullscreenMap.invalidateSize();
                setTimeout(() => fullscreenMap?.invalidateSize(), 150);
                setTimeout(() => fullscreenMap?.invalidateSize(), 400);
            });
        }

        function openFullscreenMap(source = 'detail') {
            if (typeof L === 'undefined') { ensureLeafletLoaded().then(() => openFullscreenMap(source)).catch(error => { console.error(error); setMapLoading('fullscreen-map-loading', false); }); return; }
            fullscreenMapSource = source;
            const modal = document.getElementById('fullscreen-map-modal');
            const canvas = document.getElementById('fullscreen-map-canvas');
            if (!modal || !canvas) return;
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            setModalOpenState(true);
            setBackgroundMapsDisabled(true);
            fullscreenMapCloseCleanup?.();
            fullscreenMapCloseCleanup = attachFullscreenMapCloseHandlers();
            const isEditableMap = ['admin','public'].includes(source);
            document.getElementById('fullscreen-map-search-wrap')?.classList.toggle('hidden', !isEditableMap);
            document.getElementById('fullscreen-map-search-panel')?.classList.add('hidden');
            document.getElementById('fullscreen-map-confirm')?.classList.toggle('hidden', !isEditableMap);
            const fsInput = document.getElementById('fullscreen-location-search'); if (fsInput) fsInput.value = '';
            document.getElementById('fullscreen-location-results')?.classList.add('hidden');
            const { point, zoom, hasMarker } = currentMapPoint(source);
            fullscreenMapSelection = hasMarker && ['admin','public'].includes(source) ? { lat: point[0], lng: point[1], address: '', addressData: null, projectTitle: '' } : null;
            requestAnimationFrame(() => {
                setTimeout(() => {
                    if (!fullscreenMap) {
                        setMapLoading('fullscreen-map-loading', true);
                        fullscreenMap = L.map(canvas, { scrollWheelZoom: true }).setView(point, zoom);
                        addOpenStreetMapLayer(fullscreenMap);
                        attachMapLoadingOverlay(fullscreenMap, 'fullscreen-map-loading');
                        fullscreenMap.on('click', event => {
                            if (!['admin','public'].includes(fullscreenMapSource)) return;
                            setFullscreenMapSelection(event.latlng.lat, event.latlng.lng, { updateMarker: true, manual: true });
                        });
                    } else {
                        fullscreenMap.setView(point, zoom);
                    }
                    if (hasMarker) updateFullscreenMarker(point, source === 'admin' || source === 'public');
                    else clearFullscreenMarker();
                    const input = document.getElementById('fullscreen-map-search-input');
                    const results = document.getElementById('fullscreen-map-results');
                    if (input) input.value = source === 'admin' ? (document.getElementById('sb-location-search')?.value || '') : (source === 'public' ? (document.getElementById('pl-location-search')?.value || '') : '');
                    if (!['admin','public'].includes(source) && document.activeElement === input) input?.blur();
                    if (results) {
                        results.innerHTML = '';
                        results.classList.add('hidden');
                    }
                    resizeFullscreenMapAfterOpen();
                }, 100);
            });
        }

        function clearFullscreenMarker() {
            if (!fullscreenMapMarker) return;
            fullscreenMapMarker.remove();
            fullscreenMapMarker = null;
        }

        function updateFullscreenMarker(point, draggable = false) {
            if (!fullscreenMap || !Array.isArray(point)) return;
            if (!fullscreenMapMarker) {
                fullscreenMapMarker = L.marker(point, { draggable }).addTo(fullscreenMap);
                fullscreenMapMarker.on('dragend', event => {
                    if (!['admin','public'].includes(fullscreenMapSource)) return;
                    const pos = event.target.getLatLng();
                    setFullscreenMapSelection(pos.lat, pos.lng, { updateMarker: false, manual: true });
                });
            } else {
                fullscreenMapMarker.setLatLng(point);
                if (draggable) fullscreenMapMarker.dragging?.enable();
                else fullscreenMapMarker.dragging?.disable();
            }
        }

        function attachFullscreenMapCloseHandlers() {
            const modal = document.getElementById('fullscreen-map-modal');
            const closeBtn = document.getElementById('fullscreen-map-close-btn');
            const handleClose = event => {
                event?.preventDefault?.();
                event?.stopPropagation?.();
                closeFullscreenMap();
            };
            const handleKeydown = event => {
                if (event.key === 'Escape') closeFullscreenMap();
            };
            const handleBackdropTouch = event => {
                if (event.target === modal) handleClose(event);
            };
            closeBtn?.addEventListener('click', handleClose);
            closeBtn?.addEventListener('touchstart', handleClose, { passive: false });
            modal?.addEventListener('touchstart', handleBackdropTouch, { passive: false });
            document.addEventListener('keydown', handleKeydown);
            return () => {
                closeBtn?.removeEventListener('click', handleClose);
                closeBtn?.removeEventListener('touchstart', handleClose);
                modal?.removeEventListener('touchstart', handleBackdropTouch);
                document.removeEventListener('keydown', handleKeydown);
            };
        }

        function closeFullscreenMap() {
            const modal = document.getElementById('fullscreen-map-modal');
            modal?.classList.add('hidden');
            modal?.classList.remove('flex');
            document.getElementById('fullscreen-map-search-wrap')?.classList.add('hidden');
            document.getElementById('fullscreen-map-search-panel')?.classList.add('hidden');
            document.getElementById('fullscreen-map-confirm')?.classList.add('hidden');
            document.getElementById('fullscreen-location-results')?.classList.add('hidden');
            document.getElementById('fullscreen-map-results')?.classList.add('hidden');
            clearTimeout(window.__fullscreenLocationTimer);
            clearTimeout(window.__fullscreenMapSearchTimer);
            fullscreenMapCloseCleanup?.();
            fullscreenMapCloseCleanup = null;
            fullscreenMapSelection = null;
            setBackgroundMapsDisabled(false);
            document.body.classList.remove('modal-open');
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
            setTimeout(() => {
                fullscreenMap?.invalidateSize();
                adminListingMap?.invalidateSize?.();
                publicListingMap?.invalidateSize?.();
                detailListingMap?.invalidateSize?.();
                syncModalOpenState();
            }, 80);
        }

        function handlePublicRegionFilterChange() {
            const region = document.getElementById('filter-sb-region')?.value || 'all';
            syncDistrictSelect(document.getElementById('filter-sb-project'), region === 'all' ? 'seabreeze' : region, true);
            listingPage = 1;
            renderSeaBreeze();
        }

        function handleAdminRegionFilterChange() {
            const region = document.getElementById('admin-listing-region-filter')?.value || 'all';
            syncDistrictSelect(document.getElementById('admin-listing-district-filter'), region === 'all' ? 'seabreeze' : region, true);
            renderAdminDashboard();
        }


        function updateHeroProjectOptions() {
            const select = document.getElementById('hero-project-id-input');
            if (!select) return;
            const current = select.value;
            const projects = getOfficialProjects();
            select.innerHTML = '<option value="">Layihə seçin</option>' + projects.map(project => `<option value="${escapeHtml(project.id)}">${escapeHtml(project.title)}</option>`).join('');
            if (current) select.value = current;
        }

        function renderOfficialProjectOptions() {
            updateHeroProjectOptions();
            syncDistrictSelect(document.getElementById('filter-sb-project'), document.getElementById('filter-sb-region')?.value === 'all' ? 'seabreeze' : (document.getElementById('filter-sb-region')?.value || 'seabreeze'), true);
            syncDistrictSelect(document.getElementById('sb-project'), (document.getElementById('sb-region-type')?.value || 'seabreeze') === 'general' ? 'city' : (document.getElementById('sb-region-type')?.value || 'seabreeze'), false);
            syncDistrictSelect(document.getElementById('admin-listing-district-filter'), document.getElementById('admin-listing-region-filter')?.value === 'all' ? 'seabreeze' : (document.getElementById('admin-listing-region-filter')?.value || 'seabreeze'), true);
            refreshPublicProjectDropdown();
            handleListingRegionTypeChange();
        }

        let activeUser = null;
        // Project public UI state moved to /js/components/projects.js
        let listingPage = 1;
        const PAGE_SIZE = 20;
        window.PAGE_SIZE = PAGE_SIZE;
        window.getActiveUser = () => activeUser;
        let uploadedEventImages = [];
        let uploadedEventImageFiles = [];
        let uploadedListingImages = [];
        let uploadedListingImageFiles = [];
        let currentlyEditingGalleryItemId = null;
        let bulkProjectImportRows = [];
        let projectOrderDirty = false;
        let draggedProjectId = null;
        let adminProjectSearchQuery = '';
        let draggedAdId = null;
        let isAdSaveSubmitting = false;

        // SESSION CONTROL
        async function initializeAuth() {
            const token = getAuthToken();
            const cachedUser = localStorage.getItem('besthome_user_data') || sessionStorage.getItem('besthome_user_data');
            if (cachedUser) {
                try {
                    const user = JSON.parse(cachedUser);
                    const role = normalizeAuthRole(user.role);
                    activeUser = { role, name: user.fullname || user.name || (role === 'admin' ? 'Admin' : 'İstifadəçi'), fullname: user.fullname || user.name || '', id: user.id, email: user.email, phone: user.phone || '', avatarUrl: user.avatarUrl || user.avatar_url || '', bio: user.bio || '' };
                    updateHeaderUI();
                } catch (_error) {
                    activeUser = null;
                }
            }

            if (!token) {
                activeUser = null;
                updateHeaderUI();
                return;
            }

            try {
                const result = await apiRequest('/api/auth/me', { authRedirect: false });
                const user = result.user || result;
                const role = normalizeAuthRole(user.role);
                activeUser = { role, name: user.fullname || user.email || (role === 'admin' ? 'Admin' : 'İstifadəçi'), fullname: user.fullname || '', id: user.id, email: user.email, phone: user.phone || '', avatarUrl: user.avatarUrl || user.avatar_url || '', bio: user.bio || '', provider: user.provider || 'local', createdAt: user.createdAt || user.created_at, lastLogin: user.lastLogin || user.last_login };
                setAuthSession(token, { ...user, role, fullname: activeUser.name });
            } catch (error) {
                if (error?.status === 401 || error?.status === 403) {
                    clearAuthSession();
                    activeUser = null;
                } else {
                    console.warn('Sessiya yoxlanışı müvəqqəti alınmadı:', error.message);
                }
            }
            updateHeaderUI();
        }

        function checkSession() {
            initializeAuth();
        }


        let publicListingMap = null;
        let publicListingMarker = null;
        let publicListingSubmitting = false;
        let publicListingImageFiles = [];
        let myListingsFilter = 'all';

        function spaNavigate(path) {
            history.pushState({ path }, '', path);
            routeToCurrentPath();
        }

        function navigateToCreateListing() {
            if (!activeUser) { setPendingAuthRoute('/elan-elave-et'); switchTab('admin-login'); return; }
            spaNavigate('/elan-elave-et');
        }

        function navigateToMyListings() {
            if (!activeUser) { setPendingAuthRoute('/profil/elanlarim'); switchTab('admin-login'); return; }
            spaNavigate('/profil/elanlarim');
        }

        function navigateToListingPreview(listingKey) {
            if (!listingKey) { navigateToMyListings(); return; }
            spaNavigate(`/listing/${encodeURIComponent(String(listingKey))}`);
        }

        function navigateToFavorites() {
            if (!activeUser) { setPendingAuthRoute('/profil/favoriler'); switchTab('admin-login'); return; }
            spaNavigate('/profil/favoriler');
        }

        function navigateToProfileInfo() {
            if (!activeUser) { setPendingAuthRoute('/profil/melumatlar'); switchTab('admin-login'); return; }
            spaNavigate('/profil/melumatlar');
        }

        function navigateToProfileSettings() {
            if (!activeUser) { setPendingAuthRoute('/profil/melumatlar'); switchTab('admin-login'); return; }
            spaNavigate('/profil/melumatlar');
        }

        function profileMenuItemsHtml(itemClass = 'profile-dropdown-item', closeAction = '') {
            const close = closeAction ? `; ${closeAction}` : '';
            const userMenu = `
                <button onclick="navigateToMyListings()${close}" class="${itemClass}" role="menuitem">📋 Elanlar</button>
                <button onclick="navigateToFavorites()${close}" class="${itemClass}" role="menuitem">❤️ Favorilər</button>
                <button onclick="navigateToMessages()${close}" class="${itemClass}" role="menuitem">💬 Mesajlar</button>
                <button onclick="navigateToProfileInfo()${close}" class="${itemClass}" role="menuitem">👤 Profil</button>
            `;
            return `
                ${userMenu}
                <button onclick="logoutAdmin()${close}" class="${itemClass} text-red-600" role="menuitem">🚪 Çıxış</button>
            `;
        }

        function renderMobileProfileMenu() {
            const sheet = document.getElementById('mobile-profile-sheet');
            if (sheet) sheet.innerHTML = profileMenuItemsHtml('mobile-profile-sheet__item', 'closeMobileProfileMenu()');
        }

        function toggleMobileProfileMenu() {
            if (!activeUser) { closeMobileProfileMenu(); setPendingAuthRoute('/profil'); switchTab('admin-login'); return; }
            renderMobileProfileMenu();
            const sheet = document.getElementById('mobile-profile-sheet');
            const backdrop = document.getElementById('mobile-profile-backdrop');
            const isOpen = sheet?.classList.contains('is-open');
            sheet?.classList.toggle('is-open', !isOpen);
            backdrop?.classList.toggle('is-open', !isOpen);
            setMobileBottomNavActive(isOpen ? null : 'profile');
        }

        function closeMobileProfileMenu() {
            document.getElementById('mobile-profile-sheet')?.classList.remove('is-open');
            document.getElementById('mobile-profile-backdrop')?.classList.remove('is-open');
            setMobileBottomNavActive();
        }

        function setMobileBottomNavActive(forcedTab = null) {
            const path = window.location.pathname;
            const active = forcedTab
                || (path === '/elanlar' || path.startsWith('/listing/') ? 'listings'
                    : (path === '/elan-elave-et' || path === '/create-listing' ? 'create-listing'
                        : (path === '/ipoteka-kalkulyatoru' ? 'mortgage'
                            : (path.startsWith('/profil') || path.startsWith('/profile') || path.startsWith('/admin') || path === '/menim-elanlarim' || path === '/favoriler' ? 'profile' : 'seabreeze'))));
            document.querySelectorAll('.mobile-bottom-nav__item').forEach(btn => {
                btn.classList.toggle('is-active', btn.dataset.mobileTab === active);
            });
        }

        function navigateListingsType(type = '') {
            const normalized = String(type || '').toLowerCase();
            const queryType = normalized === 'kiraye' ? 'kiraye' : (normalized === 'satis' ? 'satis' : '');
            spaNavigate(queryType ? `/elanlar?type=${queryType}` : '/elanlar');
        }

        function applyListingsRouteFilters() {
            const type = new URLSearchParams(window.location.search).get('type');
            const select = document.getElementById('filter-sb-type');
            if (!select) return;
            const mapped = type === 'satis' ? 'Satis' : (type === 'kiraye' ? 'Kiraye' : 'all');
            select.value = mapped;
            listingPage = 1;
        }

        function getPublicSeaBreezeProjectNames() {
            return getUniqueSeaBreezeProjectNames();
        }

        function publicProjectOptionsHtml(selected = '') {
            const names = getPublicSeaBreezeProjectNames();
            const selectedTitle = projectTitleCase(selected);
            if (!names.length) return '<option value="" disabled selected>Layihələr yüklənir...</option>';
            return names.map((name, index) => {
                const value = escapeHtml(name);
                const isSelected = selectedTitle ? name === selectedTitle : index === 0;
                return `<option value="${value}"${isSelected ? ' selected' : ''}>${value}</option>`;
            }).join('');
        }

        function refreshPublicProjectDropdown() {
            const select = document.getElementById('pl-project');
            if (!select) return;
            const current = select.value || '';
            select.innerHTML = publicProjectOptionsHtml(current);
            syncPublicProjectFields();
        }

        function renderPublicListingForm(success = false, createdListing = null) {
            const root = document.getElementById('public-listing-root');
            if (!root) return;
            if (!activeUser) { switchTab('admin-login'); return; }
            updateSeo({ title: 'Elan əlavə et', path: '/elan-elave-et' });
            if (success) {
                const createdListingKey = createdListing ? String(createdListing.listingCode || createdListing.listing_code || createdListing.code || createdListing.id || '') : '';
                const viewButton = createdListingKey
                    ? `<button onclick="navigateToListingPreview('${escapeHtml(createdListingKey)}')" class="rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-900 px-6 py-3 font-black transition">📄 Elana bax</button>`
                    : `<button onclick="navigateToMyListings()" class="rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-900 px-6 py-3 font-black transition">📄 Elanı önizlə</button>`;
                root.innerHTML = `<div class="public-form-card rounded-[2rem] p-8 md:p-12 text-center max-w-2xl mx-auto">
                    <div class="text-5xl mb-4">✅</div><h1 class="text-3xl md:text-4xl font-black text-slate-950">Elanınız qəbul edildi və təsdiq gözləyir</h1>
                    <p class="mt-3 text-slate-600 font-semibold">Moderator təsdiqindən sonra saytda görünəcək. Təsdiq gözləyən elan önizləmə rejimində açılacaq.</p>
                    <div class="mt-8 flex flex-col sm:flex-row justify-center gap-3">
                        <button onclick="switchTab('seabreeze')" class="rounded-2xl bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 font-black transition">🏠 Layihələrə qayıt</button>
                        ${viewButton}
                    </div></div>`;
                return;
            }
            publicListingImageFiles = [];
            root.innerHTML = `<div class="mb-6"><button onclick="switchTab('seabreeze')" class="text-sm font-black text-brand-700 hover:underline">← Ana səhifə</button></div>
                <div class="public-form-card rounded-[2rem] p-4 sm:p-6 md:p-8">
                    <div class="mb-6"><h1 class="text-3xl md:text-4xl font-black text-slate-950">➕ Elan əlavə et</h1><p class="text-slate-600 font-semibold mt-2">Elan moderator yoxlamasından sonra yayımlanacaq.</p></div>
                    <form id="public-listing-form" onsubmit="submitPublicListing(event)" class="space-y-6">
                        <input type="hidden" id="pl-city" value=""><input type="hidden" id="pl-district" value=""><input type="hidden" id="pl-settlement" value=""><input type="hidden" id="pl-metro" value="">
                        <div class="public-form-row public-form-row--3">
                            <label class="public-form-field block"><span class="public-form-label">Başlıq</span><input id="pl-title" type="text" required class="public-form-input" placeholder="Məs: 2 otaqlı dəniz mənzərəli mənzil"></label>
                            <label class="public-form-field"><span class="public-form-label">Region</span><select id="pl-region-type" onchange="handlePublicListingRegionChange()" class="public-form-input"><option value="seabreeze" selected>Sea Breeze</option></select></label>
                            <label class="public-form-field"><span class="public-form-label">Layihə</span><select id="pl-project" onchange="syncPublicProjectFields()" class="public-form-input" required>${publicProjectOptionsHtml()}</select></label>
                        </div>
                        <div class="public-form-row public-form-row--4">
                            <label class="public-form-field"><span class="public-form-label">Kateqoriya</span><select id="pl-category" onchange="togglePublicLandField()" class="public-form-input"><option value="Apartment">Mənzil</option><option value="Villa">Villa</option><option value="Townhouse">Taunhaus</option><option value="LandSale">Torpaq</option><option value="Commercial">Obyekt</option></select></label>
                            <label class="public-form-field"><span class="public-form-label">Elan növü</span><select id="pl-listing-type" onchange="calculatePublicSqPrice()" class="public-form-input"><option value="Satis">Satış</option><option value="Kiraye">Kirayə</option><option value="GunlukKiraye">Günlük kirayə</option></select></label>
                            <label class="public-form-field"><span class="public-form-label">Qiymət</span><input id="pl-price" type="number" min="1" required oninput="calculatePublicSqPrice()" class="public-form-input" placeholder="Məs: 185000"></label>
                            <label class="public-form-field"><span class="public-form-label">Valyuta</span><select id="pl-currency" onchange="calculatePublicSqPrice()" class="public-form-input"><option value="AZN">AZN</option><option value="USD">USD</option></select></label>
                        </div>
                        <div class="public-form-row public-form-row--4">
                            <label class="public-form-field"><span class="public-form-label">Otaq sayı</span><input id="pl-rooms" type="number" min="1" required class="public-form-input" value="2"></label>
                            <label class="public-form-field"><span class="public-form-label">Sahə</span><input id="pl-area" type="number" min="1" step="any" required oninput="calculatePublicSqPrice()" class="public-form-input" placeholder="m²"></label>
                            <label class="public-form-field"><span class="public-form-label">Mərtəbə</span><input id="pl-floor-number" type="number" min="1" required class="public-form-input" value="1"></label>
                            <label class="public-form-field"><span class="public-form-label">Mərtəbə sayı</span><input id="pl-floor-count" type="number" min="1" required class="public-form-input" value="1"></label>
                        </div>
                        <div class="public-form-row public-form-row--owner">
                            <label id="pl-land-wrap" class="public-form-field"><span class="public-form-label">Torpaq sahəsi (Sot)</span><input id="pl-land" type="number" min="0" step="any" class="public-form-input" placeholder="Məs: 4.5"></label>
                        </div>
                        <div class="public-form-row public-form-row--calc">
                            <div id="pl-calc-result-box" class="public-calc-box"><strong>1 m² üçün qiymət:</strong> <span id="pl-calc-val">0 ₼</span></div>
                        </div>
                        <div class="public-form-row public-form-row--owner">
                            <label class="public-form-field min-w-0"><span class="public-form-label">Elan sahibi</span><select id="pl-owner-type" class="public-form-input"><option value="owner">Əmlak sahibi</option><option value="agent">Vasitəçi</option></select></label>
                            <label class="public-checkbox-pill"><input type="checkbox" id="pl-has-document"><span>Kupça / Çıxarış var</span></label>
                            <label class="public-checkbox-pill"><input type="checkbox" id="pl-is-credit" onchange="togglePublicCreditFields()"><span>Kredit var</span></label>
                        </div>
                        <div id="pl-credit-fields" class="hidden grid grid-cols-1 sm:grid-cols-3 gap-3 public-section-box">
                            <label class="public-form-field"><span class="public-form-label">İlkin ödəniş</span><input type="number" id="pl-credit-down" min="0" class="public-form-input"></label>
                            <label class="public-form-field"><span class="public-form-label">Aylıq ödəniş</span><input type="number" id="pl-credit-monthly" min="0" class="public-form-input"></label>
                            <label class="public-form-field"><span class="public-form-label">Müddət (il)</span><input type="number" id="pl-credit-years" min="1" class="public-form-input"></label>
                        </div>
                        <label class="public-form-field block"><span class="public-form-label">Təsvir</span><textarea id="pl-desc" required rows="8" class="public-form-input public-description-input" placeholder="Əmlak haqqında məlumat yazın..."></textarea></label>
                        <div class="public-section-box space-y-4">
                            <input type="hidden" id="pl-street-address"><input type="hidden" id="pl-latitude"><input type="hidden" id="pl-longitude">
                            <span class="public-form-label">Ünvan və xəritə</span>
                            <label class="relative block public-form-field"><span class="public-form-label">Xəritədə axtar</span><input id="pl-location-search" type="search" oninput="debouncedPublicLocationSearch()" onfocus="showPublicLocationSuggestions()" onkeydown="handlePublicLocationSearchKeydown(event)" class="public-form-input" placeholder="🔍 Ünvan və ya obyekt axtar…" aria-controls="pl-location-results" aria-expanded="false" autocomplete="off"><div id="pl-location-results" class="public-location-suggestions hidden absolute left-0 right-0 top-full z-[1000] mt-2 space-y-1 rounded-2xl border border-slate-200 bg-white p-2 text-xs shadow-2xl"></div></label>
                            <div class="map-frame"><button type="button" class="map-expand-btn" onclick="openFullscreenMap('public')">⛶ Xəritəni böyüt</button><div id="pl-location-map" class="public-location-map"></div><div id="pl-location-map-loading" class="map-loading-overlay">🗺️ Xəritə yüklənir…</div></div><p class="manual-pin-note">Xəritədə yeri dəqiq seçin, elan bu koordinata görə göstəriləcək.</p><p id="pl-manual-pin-note" class="manual-pin-note hidden">Pin xəritədə əl ilə seçildi</p>
                        </div>
                        <div class="public-section-box" id="pl-images-dropzone" ondragover="handleListingImagesDragOver(event)" ondragleave="handleListingImagesDragLeave(event)" ondrop="handlePublicListingImagesDrop(event)"><span class="public-form-label">Şəkillər</span><input id="pl-images" type="file" multiple accept="image/*" onchange="handlePublicListingImages(this.files)" class="block w-full rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-700"><p class="mt-3 text-xs font-bold leading-5 text-slate-500">Böyük telefon şəkilləri avtomatik WebP formatına sıxılır. İlk şəkil cover olacaq; sürüşdürərək və ya oxlarla sıranı dəyişin.</p><div id="pl-upload-progress" class="hidden mt-3 space-y-1"><div class="listing-upload-progress"><div class="listing-upload-progress__bar"></div></div><div class="listing-upload-progress__text text-[10px] text-slate-500 font-bold">0%</div></div><div id="pl-images-preview" class="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3"></div></div>
                        <div id="pl-submit-error" class="hidden rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700" role="alert"></div>
                        <button id="pl-submit-btn" type="submit" class="async-submit-btn w-full rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-black py-4 transition"><span id="pl-submit-spinner" class="button-spinner hidden"></span><span id="pl-submit-text">Yerləşdir</span></button>
                    </form>
                </div>`;
            handlePublicListingRegionChange();
            syncPublicProjectFields();
            togglePublicLandField();
            setTimeout(initPublicListingMap, 120);
            setTimeout(() => publicListingMap?.invalidateSize?.(), 360);
        }

        function syncPublicProjectFields() {
            const project = document.getElementById('pl-project')?.value || '';
            const districtInput = document.getElementById('pl-district');
            const settlementInput = document.getElementById('pl-settlement');
            const streetInput = document.getElementById('pl-street-address');
            if (districtInput) districtInput.value = project;
            if (settlementInput && !settlementInput.value) settlementInput.value = project;
            if (streetInput && !streetInput.value) streetInput.value = project;
            const meta = getOfficialProjects().find(item => item.title === project);
            if (meta && hasProjectCoordinates(meta)) setPublicListingCoordinates(meta.latitude, meta.longitude, { moveMap: true, reverse: false, zoom: 16 });
            else clearPublicListingCoordinates({ resetMapView: true });
        }

        function handlePublicListingRegionChange() {
            const regionSelect = document.getElementById('pl-region-type');
            if (regionSelect) regionSelect.value = 'seabreeze';
            const cityInput = document.getElementById('pl-city');
            const districtInput = document.getElementById('pl-district');
            const settlementInput = document.getElementById('pl-settlement');
            const metroInput = document.getElementById('pl-metro');
            if (cityInput) cityInput.value = '';
            if (districtInput) districtInput.value = '';
            if (settlementInput) settlementInput.value = '';
            if (metroInput) metroInput.value = '';
            syncPublicProjectFields();
            document.getElementById('pl-city-wrap')?.classList.add('hidden');
            document.getElementById('pl-district-wrap')?.classList.add('hidden');
            document.getElementById('pl-settlement-wrap')?.classList.add('hidden');
            document.getElementById('pl-metro-wrap')?.classList.add('hidden');
            if (publicListingMap) {
                publicListingMap.setView(publicMapDefaultCenter(), 12);
                setTimeout(() => publicListingMap?.invalidateSize?.(), 80);
            }
        }

        function publicMapDefaultCenter() {
            const lat = document.getElementById('pl-latitude')?.value;
            const lng = document.getElementById('pl-longitude')?.value;
            if (isValidCoordinate(lat, lng)) return [Number(lat), Number(lng)];
            const projectTitle = document.getElementById('pl-project')?.value || '';
            const project = getOfficialProjects().find(item => item.title === projectTitle);
            if (hasProjectCoordinates(project)) return [Number(project.latitude), Number(project.longitude)];
            const city = document.getElementById('pl-city')?.value || 'Sea Breeze';
            if (city === 'Sea Breeze') return SEA_BREEZE_DEFAULT_CENTER;
            if (city === 'Abşeron') return [40.457, 49.75];
            if (city === 'Sumqayıt') return [40.585, 49.631];
            return [40.4093, 49.8671];
        }

        function applyPublicKnownPlaceSelection(projectTitle = '') {
            const title = String(projectTitle || '').trim();
            if (!title) return;
            const regionSelect = document.getElementById('pl-region-type');
            if (regionSelect && regionSelect.value !== 'seabreeze') {
                regionSelect.value = 'seabreeze';
                handlePublicListingRegionChange();
            }
            const projectSelect = document.getElementById('pl-project');
            if (projectSelect?.options) {
                const option = Array.from(projectSelect.options).find(opt => opt.value.toLocaleLowerCase('az-AZ') === title.toLocaleLowerCase('az-AZ'));
                if (option) projectSelect.value = option.value;
            }
            const districtInput = document.getElementById('pl-district');
            if (districtInput) districtInput.value = document.getElementById('pl-project')?.value || title;
            const settlementInput = document.getElementById('pl-settlement');
            if (settlementInput) settlementInput.value = title;
            const streetInput = document.getElementById('pl-street-address');
            if (streetInput) streetInput.value = title;
        }

        function clearPublicListingCoordinates({ resetMapView = false } = {}) {
            const latInput = document.getElementById('pl-latitude');
            const lngInput = document.getElementById('pl-longitude');
            if (latInput) latInput.value = '';
            if (lngInput) lngInput.value = '';
            document.getElementById('pl-manual-pin-note')?.classList.add('hidden');
            if (publicListingMarker) { publicListingMarker.remove(); publicListingMarker = null; }
            if (resetMapView && publicListingMap) publicListingMap.setView(publicMapDefaultCenter(), DEFAULT_SEA_BREEZE_LOCATION.zoom);
        }

        function setPublicListingCoordinates(lat, lng, { moveMap = true, reverse = true, zoom = 16, manual = false } = {}) {
            const latNum = Number(lat), lngNum = Number(lng);
            if (!isValidCoordinate(latNum, lngNum)) return;
            document.getElementById('pl-latitude').value = latNum.toFixed(7);
            document.getElementById('pl-longitude').value = lngNum.toFixed(7);
            document.getElementById('pl-manual-pin-note')?.classList.toggle('hidden', !manual);
            if (publicListingMap && typeof L !== 'undefined') {
                const point = [latNum, lngNum];
                if (!publicListingMarker) {
                    publicListingMarker = L.marker(point, { draggable: true }).addTo(publicListingMap);
                    publicListingMarker.on('dragend', e => { const pos=e.target.getLatLng(); setPublicListingCoordinates(pos.lat,pos.lng,{moveMap:false,reverse:false,manual:true}); });
                } else publicListingMarker.setLatLng(point);
                if (moveMap) publicListingMap.setView(point, Math.max(publicListingMap.getZoom(), zoom));
            }
            closePublicAddressSuggestions();
            if (reverse) reverseGeocodePublicListingLocation(latNum, lngNum);
        }

        function initPublicListingMap() {
            const el = document.getElementById('pl-location-map');
            if (!el) return;
            if (typeof L === 'undefined') { ensureLeafletLoaded().then(initPublicListingMap).catch(error => { console.error(error); setMapLoading('pl-location-map-loading', false); }); return; }
            if (publicListingMap) { publicListingMap.remove(); publicListingMap = null; publicListingMarker = null; }
            setMapLoading('pl-location-map-loading', true);
            publicListingMap = L.map(el, { scrollWheelZoom: true }).setView(publicMapDefaultCenter(), DEFAULT_SEA_BREEZE_LOCATION.zoom);
            addOpenStreetMapLayer(publicListingMap);
            attachMapLoadingOverlay(publicListingMap, 'pl-location-map-loading');
            publicListingMap.on('click', e => setPublicListingCoordinates(e.latlng.lat, e.latlng.lng, { moveMap:false, reverse:false, manual:true }));
            setTimeout(() => { publicListingMap.invalidateSize(); publicListingMap.setView(publicListingMarker?.getLatLng?.() || publicMapDefaultCenter(), publicListingMap.getZoom()); }, 150);
            setTimeout(() => { publicListingMap.invalidateSize(); publicListingMap.setView(publicListingMarker?.getLatLng?.() || publicMapDefaultCenter(), publicListingMap.getZoom()); }, 500);
        }

        function fillPublicLocationFieldsFromAddress(address = {}, displayName = '') {
            const district = cleanAddressPart(address.city_district || address.county || address.municipality || address.city || address.suburb || address.town || '');
            const settlement = cleanAddressPart(address.village || address.town || address.suburb || address.neighbourhood || address.hamlet || '');
            const street = [address.road || address.pedestrian || address.footway || address.street, address.house_number].filter(Boolean).join(' ').trim()
                || [address.neighbourhood, address.suburb].filter(Boolean).join(', ').trim()
                || String(displayName || '').split(',').slice(0, 2).join(', ').trim();
            const districtSelect = document.getElementById('pl-district');
            if (districtSelect && district) {
                const matched = Array.from(districtSelect.options).find(opt => district.toLowerCase().includes(opt.value.toLowerCase()) || opt.value.toLowerCase().includes(district.toLowerCase()));
                if (matched) districtSelect.value = matched.value;
            }
            if (document.getElementById('pl-settlement')) document.getElementById('pl-settlement').value = settlement || district || '';
            if (document.getElementById('pl-street-address')) document.getElementById('pl-street-address').value = street || '';
        }

        async function reverseGeocodePublicListingLocation(lat, lng) {
            try { const data = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`, { headers:{Accept:'application/json'} }).then(r=>r.json()); fillPublicLocationFieldsFromAddress(data.address||{}, data.display_name||''); } catch(e) { console.warn('Reverse geocoding alınmadı:', e.message); }
        }

        async function handlePublicListingImages(files) {
            try {
                setPublicListingError('');
                const compressed = await compressListingImages(files, 'pl-upload-progress');
                publicListingImageFiles.push(...compressed);
                renderPublicListingImagesPreview();
            } catch (error) {
                console.error('Şəkil emalı alınmadı:', error);
                setPublicListingError('Şəkil emalı alınmadı. Zəhmət olmasa başqa şəkil seçin və yenidən cəhd edin.');
            } finally {
                const input = document.getElementById('pl-images');
                if (input) input.value = '';
                resetListingUploadProgress('pl-upload-progress');
            }
        }

        function renderPublicListingImagesPreview() {
            const preview = document.getElementById('pl-images-preview');
            if (!preview) return;
            preview.innerHTML = publicListingImageFiles.map((file, idx) => `<div class="listing-sortable-thumb relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 group" data-index="${idx}" data-sort-scope="public" draggable="false" onpointerdown="handleListingSortPointerDown(event, ${idx}, 'public')" onpointermove="handleListingSortPointerMove(event)" onpointerup="handleListingSortPointerUp(event)" onpointercancel="handleListingSortPointerUp(event)"><img src="${URL.createObjectURL(file)}" loading="lazy" decoding="async" class="w-full h-full object-cover" alt="Elan şəkli ${idx + 1}">${idx === 0 ? '<span class="absolute left-1 top-1 bg-brand-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded">Cover</span>' : '<span class="absolute left-1 top-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">↕</span>'}<button type="button" onclick="deletePublicListingPhoto(${idx})" class="absolute right-1 top-1 w-6 h-6 rounded-full bg-red-600/90 text-white text-xs">×</button><div class="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 flex justify-around text-[10px] text-white opacity-100 sm:opacity-0 group-hover:opacity-100"><button type="button" onclick="movePublicListingPhoto(${idx}, ${idx - 1})">←</button><button type="button" onclick="movePublicListingPhoto(${idx}, ${idx + 1})">→</button></div></div>`).join('');
        }

        function deletePublicListingPhoto(index) {
            publicListingImageFiles.splice(index, 1);
            renderPublicListingImagesPreview();
        }

        function movePublicListingPhoto(fromIndex, toIndex) {
            reorderArrayItem(publicListingImageFiles, fromIndex, toIndex);
            renderPublicListingImagesPreview();
        }

        function handlePublicListingImagesDrop(event) {
            event.preventDefault();
            event.currentTarget.classList.remove('border-brand-500', 'bg-brand-500/10');
            handlePublicListingImages(event.dataTransfer?.files);
        }

        function publicLocationCity() { return document.getElementById('pl-city')?.value || getVisibleGeneralCities()[0]?.value || 'Bakı'; }
        function closePublicAddressSuggestions() {
            const suggestionsBox = document.getElementById('pl-location-results');
            const searchInput = document.getElementById('pl-location-search');
            if (suggestionsBox) {
                suggestionsBox.innerHTML = '';
                suggestionsBox.classList.add('hidden');
                suggestionsBox.classList.remove('is-open');
            }
            if (searchInput) searchInput.setAttribute('aria-expanded', 'false');
        }

        function openPublicAddressSuggestions() {
            const suggestionsBox = document.getElementById('pl-location-results');
            const searchInput = document.getElementById('pl-location-search');
            if (suggestionsBox) {
                suggestionsBox.classList.remove('hidden');
                suggestionsBox.classList.add('is-open');
            }
            if (searchInput) searchInput.setAttribute('aria-expanded', 'true');
        }

        function renderPublicLocationResults(rows, query, target='pl', { loading = false, error = false } = {}) {
            const el = document.getElementById(target === 'fullscreen' ? 'fullscreen-location-results' : 'pl-location-results');
            if (!el) return;
            if (target === 'pl') openPublicAddressSuggestions();
            else el.classList.remove('hidden');
            const hasRows = Array.isArray(rows) && rows.length;
            const rowsHtml = hasRows ? rows.map((item, idx)=>`<button type="button" onclick="${target === 'fullscreen' ? `selectFullscreenLocationResult(${idx})` : `selectPublicLocationResult(${idx})`}" class="public-location-suggestion"><span class="flex items-center gap-2"><span class="block font-extrabold">${escapeHtml((item.display_name||query).split(',').slice(0,2).join(', '))}</span>${renderLocationSuggestionBadge(item)}${renderLocationSourceBadge(item)}</span><span class="mt-1 block text-[10px] font-semibold text-slate-500">${escapeHtml(locationSuggestionSubtext(item, query))}</span></button>`).join('') : '';
            if (hasRows) { el.innerHTML = `${rowsHtml}${loading ? '<div class="rounded-xl bg-slate-50 p-2 font-bold text-slate-600">Axtarılır...</div>' : ''}`; return; }
            if (loading) { el.innerHTML = '<div class="rounded-xl bg-slate-50 p-2 font-bold text-slate-600">Axtarılır...</div>'; return; }
            el.innerHTML = error
                ? '<div class="rounded-xl bg-red-50 p-2 text-red-700 font-bold">Axtarış alınmadı. Xəritədən pin seçə bilərsiniz.</div>'
                : '<div class="rounded-xl bg-red-50 border border-red-100 p-2 text-red-700 font-bold">Uyğun yer tapılmadı. Xəritədən pin seçə bilərsiniz.</div>';
        }
        function debouncedPublicLocationSearch() {
            clearTimeout(window.__publicLocationTimer);
            const q=(document.getElementById('pl-location-search')?.value||'').trim();
            const el=document.getElementById('pl-location-results');
            if(!el) return;
            window.__lastPublicLocationToken = `typing-${Date.now()}`;
            if(q.length<3){ window.__lastPublicLocationResults=[]; el.innerHTML=q.length ? '<div class="rounded-xl bg-slate-50 p-2 font-bold text-slate-600">Axtarış üçün ən az 3 hərf yazın</div>' : ''; if(q.length) openPublicAddressSuggestions(); else closePublicAddressSuggestions(); return; }
            el.innerHTML='<div class="rounded-xl bg-slate-50 p-2 font-bold text-slate-600">Axtarılır...</div>';
            openPublicAddressSuggestions();
            window.__publicLocationTimer=setTimeout(searchPublicListingLocation,600);
        }
        function showPublicLocationSuggestions() { const el=document.getElementById('pl-location-results'); const q=(document.getElementById('pl-location-search')?.value||'').trim(); if(!el) return; if(q.length<3){el.innerHTML=q.length?'<div class="rounded-xl bg-slate-50 p-2 font-bold text-slate-600">Axtarış üçün ən az 3 hərf yazın</div>':''; if(q.length) openPublicAddressSuggestions(); else closePublicAddressSuggestions(); return;} openPublicAddressSuggestions(); }
        async function nominatimSearch(query, city='Bakı') { return searchLocationsWithPriority(query, { city }); }
        async function searchPublicListingLocation() { const q=(document.getElementById('pl-location-search')?.value||'').trim(); if(q.length<3) return; const token=`${Date.now()}-${q}`; window.__lastPublicLocationToken=token; const instantRows=locationRowsBeforeRemote(q); window.__lastPublicLocationResults=instantRows; renderPublicLocationResults(instantRows,q,'pl',{loading:true}); try { const rows=await searchLocationsWithPriority(q,{city:publicLocationCity()}); if(!isSearchResponseCurrent('pl-location-search','__lastPublicLocationToken',token,q)) return; window.__lastPublicLocationResults=rows; renderPublicLocationResults(rows,q,'pl',{error:false}); } catch(e){ if(!isSearchResponseCurrent('pl-location-search','__lastPublicLocationToken',token,q)) return; window.__lastPublicLocationResults=[]; renderPublicLocationResults([],q,'pl',{error:true}); } }
        async function selectPublicLocationResult(index) { let item=(window.__lastPublicLocationResults||[])[index]; if(!item) return; try { item=await resolveLocationResult(item); } catch(error) { warnMapboxFallback(); return; } const input=document.getElementById('pl-location-search'); if(item.knownPlace || item.source==='project' || item.projectTitle) applyPublicKnownPlaceSelection(item.projectTitle || item.display_name || ''); if(isValidCoordinate(item.lat, item.lon)) setPublicListingCoordinates(item.lat,item.lon,{moveMap:true,reverse:false,zoom: item.type==='house'?17:16,manual:false}); fillPublicLocationFieldsFromAddress(item.address||{}, item.display_name||item.name||''); if(input) input.value=item.display_name||item.name||input.value; closePublicAddressSuggestions(); }

        async function handlePublicLocationSearchKeydown(event) { if(event.key==='Escape') { event.preventDefault(); closePublicAddressSuggestions(); return; } if(event.key!=='Enter') return; event.preventDefault(); if(!(window.__lastPublicLocationResults||[]).length) await searchPublicListingLocation(); await selectPublicLocationResult(0); }

        function setPublicListingError(message = '') { const box=document.getElementById('pl-submit-error'); if(!box) return; box.textContent=message; box.classList.toggle('hidden', !message); }
        function setPublicSubmitLoading(loading) { const btn=document.getElementById('pl-submit-btn'); btn?.classList.toggle('is-loading',loading); if(btn) btn.disabled=loading; document.getElementById('pl-submit-spinner')?.classList.toggle('hidden',!loading); const text=document.getElementById('pl-submit-text'); if(text) text.textContent=loading?'Yerləşdirilir...':'Yerləşdir'; }
        function togglePublicLandField() {
            const category = document.getElementById('pl-category')?.value || '';
            const wrap = document.getElementById('pl-land-wrap');
            if (wrap) wrap.classList.toggle('hidden', !['LandSale', 'Villa', 'Townhouse'].includes(category));
        }
        function togglePublicCreditFields() {
            const enabled = document.getElementById('pl-is-credit')?.checked;
            document.getElementById('pl-credit-fields')?.classList.toggle('hidden', !enabled);
        }
        function calculatePublicSqPrice() {
            const area = parseFloat(document.getElementById('pl-area')?.value);
            const price = parseFloat(document.getElementById('pl-price')?.value);
            const listingType = document.getElementById('pl-listing-type')?.value || 'Satis';
            const calcBox = document.getElementById('pl-calc-result-box');
            if (!calcBox) return;
            if (!isSaleListing(listingType)) {
                calcBox.classList.add('hidden');
                return;
            }
            calcBox.classList.remove('hidden');
            const calcVal = document.getElementById('pl-calc-val');
            if (area > 0 && price > 0 && calcVal) {
                calcVal.textContent = formatPrice(Math.round(price / area), document.getElementById('pl-currency')?.value || 'AZN');
            } else if (calcVal) {
                calcVal.textContent = '0 ₼';
            }
        }

        function requireAuthTokenForListing() {
            const token = getAuthToken();
            if (token) return token;
            activeUser = null;
            clearAuthSession();
            updateHeaderUI();
            setPendingAuthRoute();
            switchTab('admin-login');
            throw new Error('Sessiya tapılmadı. Zəhmət olmasa yenidən daxil olun.');
        }

        async function submitPublicListing(event) {
            event.preventDefault(); if(publicListingSubmitting) return; if(!activeUser){ switchTab('admin-login'); return; }
            publicListingSubmitting=true; setPublicSubmitLoading(true); setPublicListingError('');
            try {
                requireAuthTokenForListing();
                if (!(await ensureListingContactPhone())) return;
                if (!publicListingImageFiles.length) throw new Error('Elan yerləşdirmək üçün ən azı 1 şəkil seçin.');
                const regionType=document.getElementById('pl-region-type').value;
                const city=document.getElementById('pl-city')?.value || '';
                const selectedProject=document.getElementById('pl-project')?.value || document.getElementById('pl-district')?.value || '';
                const district=selectedProject;
                const isCredit = document.getElementById('pl-is-credit')?.checked || false;
                const payload={ title:document.getElementById('pl-title')?.value?.trim() || [city,district,document.getElementById('pl-category').selectedOptions[0]?.textContent].filter(Boolean).join(' • '), regionType, city, district, project: regionType==='seabreeze'?selectedProject:'', category:document.getElementById('pl-category').value, listingType:document.getElementById('pl-listing-type').value, price:document.getElementById('pl-price').value, currency:document.getElementById('pl-currency')?.value || 'AZN', rooms:document.getElementById('pl-rooms').value, area:document.getElementById('pl-area').value, floorNumber:document.getElementById('pl-floor-number').value, floorCount:document.getElementById('pl-floor-count').value, land:document.getElementById('pl-land')?.value || '', pricePerM2:(parseFloat(document.getElementById('pl-area')?.value)>0 && parseFloat(document.getElementById('pl-price')?.value)>0) ? Math.round(parseFloat(document.getElementById('pl-price').value)/parseFloat(document.getElementById('pl-area').value)) : null, metroStation:document.getElementById('pl-metro')?.value || '', settlement:document.getElementById('pl-settlement')?.value || '', streetAddress:document.getElementById('pl-street-address').value, latitude:isValidCoordinate(document.getElementById('pl-latitude').value, document.getElementById('pl-longitude').value) ? document.getElementById('pl-latitude').value : '', longitude:isValidCoordinate(document.getElementById('pl-latitude').value, document.getElementById('pl-longitude').value) ? document.getElementById('pl-longitude').value : '', desc:document.getElementById('pl-desc').value, isCredit, ownerType:document.getElementById('pl-owner-type')?.value || 'owner', hasDocument:document.getElementById('pl-has-document')?.checked || false, creditDownPayment:isCredit && document.getElementById('pl-credit-down')?.value ? parseFloat(document.getElementById('pl-credit-down').value) : null, creditMonthlyPayment:isCredit && document.getElementById('pl-credit-monthly')?.value ? parseFloat(document.getElementById('pl-credit-monthly').value) : null, creditYears:isCredit && document.getElementById('pl-credit-years')?.value ? parseInt(document.getElementById('pl-credit-years').value, 10) : null };
                const formData = new FormData(); const apiPayload = { ...uiListingToApi(payload), region_type: 'seabreeze', city: '', district: selectedProject, project_name: selectedProject }; Object.entries(apiPayload).forEach(([k,v])=>{ if(v!==undefined && v!==null && k!=='images') formData.append(k,v); }); publicListingImageFiles.forEach(file=>formData.append('images',file)); formData.append('image_order', JSON.stringify(publicListingImageFiles.map((_, idx) => ({ type: 'file', fileIndex: idx }))));
                setListingFormDisabled('public-listing-form', true);
                showListingSubmissionOverlay();
                const saved = await uploadFormDataWithProgress('/api/listings', formData, 'pl-upload-progress', 'POST');
                const savedListing = extractListingFromResponse(saved);
                const savedUi = dbListingToUi(savedListing);
                cacheData('listings', [savedUi, ...(appData.listings || []).filter(x => String(x.id) !== String(savedUi.id))]);
                if (isAdminRole(activeUser?.role)) scheduleIdleTask(() => loadAdminListings({ render: false }).catch(() => {}), 300);
                hideListingSubmissionOverlay();
                renderPublicListingForm(true, savedUi);
                showListingResultModal({ type: 'success', createdListing: savedUi });
            } catch(error) {
                console.error('Elan göndərilmədi:', error);
                setPublicListingError(error.message || 'Elan göndərilmədi. Zəhmət olmasa yenidən cəhd edin.');
                showListingResultModal({ type: 'error', message: error.message || 'Elan göndərilmədi. Zəhmət olmasa yenidən cəhd edin.' });
            } finally {
                hideListingSubmissionOverlay();
                publicListingSubmitting=false;
                setPublicSubmitLoading(false);
                setListingFormDisabled('public-listing-form', false);
                resetListingUploadProgress('pl-upload-progress');
            }
        }

        async function renderMyListingsPage() {
            const root=document.getElementById('my-listings-root'); if(!root) return; if(!activeUser){ switchTab('admin-login'); return; }
            updateSeo({ title:'Mənim elanlarım', path:'/menim-elanlarim' });
            root.innerHTML='<div class="public-form-card rounded-[2rem] p-6 text-center font-black text-slate-600">Elanlar yüklənir...</div>';
            try {
                const rows=(await apiRequest('/api/listings/mine')).map(dbListingToUi);
                cacheData('listings', [...rows, ...(appData.listings || []).filter(existing => !rows.some(row => String(row.id) === String(existing.id)))]);
                const filtered = rows.filter(x=> myListingsFilter==='all' || normalizeListingStatus(x.status)===myListingsFilter);
                const buttons=[['all','Hamısı'],['pending','Gözləyən'],['approved','Təsdiqlənən'],['rejected','İmtina edilən']].map(([v,l])=>`<button onclick="myListingsFilter='${v}'; renderMyListingsPage()" class="rounded-full px-4 py-2 text-xs font-black ${myListingsFilter===v?'bg-brand-600 text-white':'bg-white text-slate-700 border border-slate-200'}">${l}</button>`).join('');
                root.innerHTML=`<div class="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4"><div><h1 class="text-3xl md:text-4xl font-black text-slate-950">📋 Mənim elanlarım</h1><p class="text-slate-600 font-semibold mt-1">Bütün elanlarınızı buradan idarə edin.</p></div><button onclick="navigateToCreateListing()" class="rounded-2xl bg-brand-600 text-white px-5 py-3 font-black">➕ Elan əlavə et</button></div><div class="mb-5 flex flex-wrap gap-2">${buttons}</div><div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">${filtered.length?filtered.map(p=>renderMyListingCard(p)).join(''):'<div class="col-span-full rounded-3xl bg-white border border-slate-200 p-12 text-center font-bold text-slate-500">Elan tapılmadı.</div>'}</div>`;
            } catch(error) { root.innerHTML=`<div class="rounded-3xl bg-red-50 border border-red-100 p-8 text-red-700 font-bold">Elanlar açılmadı: ${escapeHtml(error.message)}</div>`; }
        }

        function renderMyListingCard(p = {}) {
            const image = escapeHtml((p.images&&p.images[0])||p.img||'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80');
            return `<article class="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden hover:shadow-lg transition"><button type="button" onclick="openMyListingDetail('${p.id}')" class="block w-full text-left"><img src="${image}" class="h-48 w-full object-cover" alt=""><div class="p-4 space-y-2"><div class="flex items-start justify-between gap-2"><h2 class="font-black text-slate-950">${escapeHtml(p.title||'Elan')}</h2><span class="text-[10px] font-black px-2 py-1 rounded-full ${listingStatusBadgeClass(p.status)}">${listingStatusLabel(p.status)}</span></div><p class="text-xs font-bold text-slate-500">${escapeHtml(getListingLocationLabel(p))}</p><p class="text-lg font-black text-brand-700">${formatPrice(p.price,p.currency)}</p><p class="text-xs text-slate-500">Kod: ${formatListingCode(p.listingCode)} • ${formatAzDate(p.createdAt)}</p></div></button><div class="px-4 pb-4 grid grid-cols-3 gap-2"><button type="button" onclick="openMyListingDetail('${p.id}')" class="rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-3 py-2 text-xs font-black transition">👁 Elana bax</button><button type="button" onclick="editMyListing('${p.id}')" class="rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 text-xs font-black transition">✏️ Redaktə et</button><button type="button" onclick="deleteMyListing('${p.id}')" class="rounded-xl bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 text-xs font-black transition">🗑 Sil</button></div></article>`;
        }

        function openMyListingDetail(id) {
            const listing = appData.listings.find(item => String(item.id) === String(id));
            if (listing) openPropertyModal(listing.id, true);
        }

        function editMyListing(id) {
            const listing = appData.listings.find(item => String(item.id) === String(id));
            if (!listing) return;
            switchTab('admin-dashboard');
            setTimeout(() => editSeaBreezeItem(listing.id), 120);
        }

        async function deleteMyListing(id) {
            if (!confirm('Elanı silmək istədiyinizə əminsiniz?')) return;
            try {
                await apiRequest(`/api/listings/${id}`, { method: 'DELETE' });
                cacheData('listings', appData.listings.filter(x => String(x.id) !== String(id)));
                await renderMyListingsPage();
            } catch (error) {
                alert('Elan silinmədi: ' + error.message);
            }
        }

        async function renderFavoritesPage() {
            const root = document.getElementById('my-listings-root');
            if (!root) return;
            if (!activeUser) { switchTab('admin-login'); return; }
            updateSeo({ title: 'Favorilər', path: '/favoriler' });
            logFavoritesDebug('renderFavoritesPage called', { cachedFavoriteIds: Array.from(appData.favoriteListingIds || []) });
            root.innerHTML = `
                <div class="public-form-card rounded-[2rem] p-8 text-center font-black text-slate-600 flex flex-col items-center gap-3">
                    <span class="inline-flex h-10 w-10 animate-spin rounded-full border-4 border-rose-100 border-t-rose-500" aria-hidden="true"></span>
                    <span>❤️ Favorilər yüklənir…</span>
                </div>
            `;
            try {
                const favorites = await apiRequest('/api/favorites');
                const favoriteIds = favoriteIdsFromRecords(favorites);
                logFavoritesDebug('renderFavoritesPage returned records', { records: favorites, favoriteIds: Array.from(favoriteIds) });
                const listings = (Array.isArray(favorites) ? favorites : [])
                    .map(favorite => {
                        const listing = favorite?.listing || null;
                        const listingId = extractFavoriteListingId(favorite);
                        return listing ? dbListingToUi(listing) : (appData.listings || []).find(item => String(item.id) === String(listingId));
                    })
                    .filter(item => item && item.id);
                const existingListings = appData.listings || [];
                cacheData('listings', [...listings, ...existingListings.filter(existing => !listings.some(row => String(row.id) === String(existing.id)))]);
                appData.favoriteListingIds = favoriteIds.size ? favoriteIds : new Set(listings.map(item => String(item.id)));
                cacheFavoriteListingIds(appData.favoriteListingIds);
                logFavoritesDebug('renderFavoritesPage rendering cards', { count: listings.length, favoriteIds: Array.from(appData.favoriteListingIds) });
                root.innerHTML = `
                    <div class="mb-6">
                        <h1 class="text-3xl md:text-4xl font-black text-slate-950">❤️ Favorilər</h1>
                        <p class="text-slate-600 font-semibold mt-1">Seçdiyiniz elanlar.</p>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        ${listings.length ? listings.map(p => publicListingCard(p)).join('') : '<div class="col-span-full rounded-3xl bg-white border border-slate-200 p-12 text-center font-bold text-slate-700 shadow-sm">❤️ Favori elan yoxdur</div>'}
                    </div>
                `;
            } catch(error) {
                console.error('Favorilər açılmadı:', error);
                root.innerHTML = `<div class="rounded-3xl bg-red-50 border border-red-100 p-8 text-red-700 font-bold">Favorilər açılmadı: ${escapeHtml(error.message)}</div>`;
            }
        }


        const MESSAGE_NOTIFICATION_TYPES = new Set(['new_message', 'message']);
        function updateHeaderUI() {
            const container = document.getElementById('header-user-status');
            const mobileIcon = document.getElementById('mobile-user-status-icon');
            const mobileActions = document.getElementById('mobile-user-status-actions');

            document.getElementById('add-listing-fab')?.classList.remove('is-visible');

            if (activeUser) {
                const initial = escapeHtml((activeUser.name || 'U')[0]);
                if (container) container.innerHTML = `
                    ${themeToggleHtml()}
                    <button onclick="toggleNotificationsPanel()" data-notification-toggle class="header-action-btn header-badge-btn" aria-label="Bildirişlər"><i class="fa-solid fa-bell"></i>${badgeSlotHtml('notification', messagingState.notificationsUnread)}</button>
                    <button onclick="navigateToMessages()" class="header-action-btn header-badge-btn" aria-label="Mesajlar"><i class="fa-solid fa-message"></i>${badgeSlotHtml('message', messagingState.messagesUnread)}</button>
                    <div class="relative group">
                        <button class="header-action-btn" aria-haspopup="true"><i class="fa-solid fa-user"></i><span>Profil</span><i class="fa-solid fa-chevron-down text-[10px]"></i></button>
                        <div class="profile-dropdown-shell absolute right-0 top-full z-50 hidden group-hover:block group-focus-within:block">
                            <div class="profile-dropdown-menu" role="menu" aria-label="Profil menyusu">
${profileMenuItemsHtml()}
                            </div>
                        </div>
                    </div>
                    <button onclick="navigateToCreateListing()" class="header-action-btn header-action-btn--primary"><i class="fa-solid fa-plus"></i><span>Elan əlavə et</span></button>
                `;
                if (mobileIcon) mobileIcon.innerHTML = `<div class="flex items-center gap-2"><button onclick="toggleNotificationsPanel()" data-notification-toggle class="header-action-btn header-badge-btn mobile-notification-btn" aria-label="Bildirişlər"><i class="fa-solid fa-bell"></i>${badgeSlotHtml('notification', messagingState.notificationsUnread)}</button>${themeToggleHtml('mobile-header-icon')}</div>`;
                readMessagingCache();
                refreshHeaderBadges();
                loadBadgeSummary();
                connectRealtime();
                preloadMessagingData();
                if (mobileActions) mobileActions.innerHTML = ``;
                updateMobileNotificationAccess();
            } else {
                if (container) container.innerHTML = `
                    ${themeToggleHtml()}
                    <button onclick="setPendingAuthRoute('/profil'); switchTab('admin-login')" class="header-action-btn"><i class="fa-solid fa-right-to-bracket"></i><span>Giriş</span></button>
                `;
                if (mobileIcon) mobileIcon.innerHTML = `<div class="flex items-center gap-2">${themeToggleHtml('mobile-header-icon')}<button onclick="setPendingAuthRoute('/profil'); switchTab('admin-login')" class="header-action-btn" aria-label="Giriş"><i class="fa-solid fa-right-to-bracket"></i></button></div>`;
                if (mobileActions) mobileActions.innerHTML = ``;
                disconnectRealtime();
                messagingState.notificationsUnread = 0;
                messagingState.messagesUnread = 0;
                refreshHeaderBadges();
                updateMobileNotificationAccess();
            }
            applySiteTheme(preferredTheme());
        }

        async function logoutAdmin() {
            try { if (getAuthToken()) await apiRequest('/api/auth/logout', { method: 'POST' }); } catch (_error) {}
            stopAuthHeartbeat({ markOffline: true });
            stopAdminUsersAutoRefresh();
            clearAuthSession();
            activeUser = null;
            updateHeaderUI();
            switchTab(isAdminHost() ? 'admin-login' : 'seabreeze', { skipPush: isAdminHost() });
        }

        // TABS SWITCHER
        function switchTab(tabId, options = {}) {
            cleanupTransientListingModals();
            closeMobileProfileMenu();
            activeTabId = tabId;
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            const targetId = tabId === 'favorites' ? 'tab-my-listings' : 'tab-' + tabId;
            const target = document.getElementById(targetId);
            if (target) target.classList.remove('hidden');
            if (tabId === 'seabreeze-info') {
                document.getElementById('seabreeze-info-tab')?.classList.remove('hidden');
                document.getElementById('tab-seabreeze-info')?.classList.remove('hidden');
            }

            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('text-brand-500', 'border-b-2', 'border-brand-500');
                link.classList.add('text-gray-500');
            });
            const activeLink = document.getElementById('nav-' + tabId);
            if (activeLink) activeLink.classList.add('text-brand-500', 'border-b-2', 'border-brand-500');

            if (tabId === 'admin-login') {
                isLoginSubmitting = false;
                setLoginButtonLoading(false);
            }

            if (tabId !== 'listings') hideListingHero();

            if (tabId === 'messages') {
                const params = new URLSearchParams(window.location.search);
                const conversationId = params.get('conversation');
                readMessagingCache();
                renderConversations(Boolean(!messagingState.conversations.length));
                if (conversationId) openConversation(conversationId);
                else if (messagingState.pendingConversation) openConversation(messagingState.pendingConversation.id);
                else {
                    const targetConversation = messagingState.conversations.find(c => Number(c.unreadCount || 0) > 0);
                    if (targetConversation) openConversation(targetConversation.id);
                }
                loadConversations(false, { autoSelect: !conversationId && !messagingState.pendingConversation }).catch(error => showToast(error.message || 'Söhbətlər yüklənmədi.'));
            } else if (tabId === 'seabreeze-info') {
                renderSeaBreezeInfoPage();
            } else if (tabId === 'seabreeze') {
                if (homepageHydration.initialHomepageLoaded) {
                    renderOfficialProjectOptions();
                    switchProjectCategory(window.getSelectedProjectCategory?.() || 'all');
                    setupHomepageLazyLoaders();
                } else {
                    setHomepageInitialLoading(true);
                }
            } else if (tabId === 'listings') {
                renderSeaBreeze();
                if (!homepageHydration.listings) loadListingsLazy();
                else scheduleIdleTask(() => cachedApiGet('listings', '/api/listings?page=1&limit=100&status=approved', { force: true }).then(rows => { cacheData('listings', normalizeSeaBreezeList(rows).map(dbListingToUi)); renderSeaBreeze(); }).catch(() => {}), 200);
            } else if (tabId === 'portfolio') {
                renderPortfolio();
                if (!homepageHydration.gallery) loadGalleryBackground();
                else scheduleIdleTask(() => loadGalleryBackground().catch(() => {}), 200);
            } else if (tabId === 'create-listing') {
                renderPublicListingForm(false);
            } else if (tabId === 'my-listings') {
                renderMyListingsPage();
            } else if (tabId === 'favorites') {
                renderFavoritesPage();
            } else if (tabId === 'career') {
                renderCareerSection();
                loadVacanciesBackground();
            } else if (tabId === 'mortgage') {
                calculateMortgage();
            } else if (tabId === 'admin-dashboard') {
                renderAdminDashboard();
                if (isAdminRole(activeUser?.role)) {
                    loadAdminBackground().catch(error => console.warn('Admin fon yüklənməsi alınmadı:', error.message));
                    loadAdminListings({ force: true }).catch(() => {});
                    loadSeaBreezeAdmin().catch(() => {});
                }
            }

            const routePaths = { 'seabreeze-info': '/sea-breeze-haqqinda', home: '/haqqimizda', mortgage: '/ipoteka-kalkulyatoru', career: '/vakansiya', portfolio: '/qalereya', listings: '/elanlar', 'create-listing': '/elan-elave-et', 'my-listings': '/profil/elanlarim', favorites: '/profil/favoriler', messages: '/profil/mesajlar' };
            const routeTitles = { 'seabreeze-info': 'Sea Breeze Haqqında', home: 'Haqqımızda', mortgage: 'İpoteka Kalkulyatoru', career: 'Vakansiya', portfolio: 'Qalereya', listings: 'Elanlar', 'create-listing': 'Elan əlavə et', 'my-listings': 'Mənim elanlarım', favorites: 'Favorilər', messages: 'Mesajlar' };
            const routePath = routePaths[tabId] || '/';
            const staticSeo = STATIC_SEO[routePath];
            updateSeo({ title: staticSeo?.title || routeTitles[tabId] || SITE_NAME, description: staticSeo?.description || DEFAULT_SEO_DESCRIPTION, path: routePath });
            if (!options.skipPush && window.location.pathname !== routePath && !['admin-dashboard', 'admin-login'].includes(tabId)) {
                history.pushState({ tabId }, '', routePath);
            }
            if (tabId === 'listings') renderListingHero(listingHeroIndex);
            else hideListingHero();
            setMobileBottomNavActive(tabId === 'my-listings' || tabId === 'favorites' || tabId === 'admin-dashboard' ? 'profile' : null);
            updateMobileMenuActiveState();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function normalizeMobileMenuPath(path = window.location.pathname) {
            const cleanPath = (path || '/').toLowerCase().replace(/\/+$/, '') || '/';
            const aliases = {
                '/gallery': '/qalereya',
                '/portfolio': '/qalereya',
                '/vacancies': '/vakansiya',
                '/career': '/vakansiya',
                '/': '/haqqimizda'
            };
            return aliases[cleanPath] || cleanPath;
        }

        function updateMobileMenuActiveState() {
            const activePath = normalizeMobileMenuPath();
            const labels = {
                '/sea-breeze-haqqinda': 'Sea Breeze Haqqında',
                '/qalereya': 'Qalereya',
                '/haqqimizda': 'Haqqımızda',
                '/vakansiya': 'Vakansiya'
            };
            document.querySelectorAll('.bh-mobile-menu-link[data-route]').forEach(link => {
                const isActive = normalizeMobileMenuPath(link.dataset.route) === activePath;
                link.classList.toggle('is-active', isActive);
                link.setAttribute('aria-current', isActive ? 'page' : 'false');
            });
            const currentPage = document.getElementById('mobileMenuCurrentPage');
            if (currentPage) currentPage.textContent = labels[activePath] || 'Layihələr';
        }

        window.toggleMobileMenu = function(force) {
            const panel = document.getElementById('mobileMenuPanel');
            const backdrop = document.getElementById('mobileMenuBackdrop');
            const btn = document.querySelector('[data-mobile-menu-button]');

            if (!panel) {
                console.error('mobileMenuPanel not found');
                return;
            }

            const open = typeof force === 'boolean'
                ? force
                : panel.classList.contains('hidden');

            if (open) updateMobileMenuActiveState();
            panel.classList.toggle('hidden', !open);
            panel.classList.toggle('is-open', open);
            if (backdrop) backdrop.classList.toggle('hidden', !open);
            if (btn) btn.setAttribute('aria-expanded', String(open));

            const icon = document.getElementById('menu-icon');
            if (icon) icon.className = open ? 'fa-solid fa-xmark text-2xl' : 'fa-solid fa-bars text-xl';
            if (btn) btn.setAttribute('aria-label', open ? 'Menyunu bağla' : 'Menyunu aç');

            console.log('mobile menu opened', open, panel.className);
        };

        // Project category and card image helpers moved to /js/components/projects.js

        function renderPagination(containerId, page, totalPages, onPageChange) {
            const container = document.getElementById(containerId);
            if (!container) return;
            if (totalPages <= 1) {
                container.innerHTML = '';
                return;
            }
            container.innerHTML = `
                <button ${page <= 1 ? 'disabled' : ''} class="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-300 disabled:opacity-40 hover:bg-white/10 transition" onclick="${onPageChange}(${page - 1})">Əvvəlki</button>
                <span class="text-xs text-gray-400 bg-white/5 border border-white/10 rounded-xl px-4 py-2">${page} / ${totalPages}</span>
                <button ${page >= totalPages ? 'disabled' : ''} class="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-300 disabled:opacity-40 hover:bg-white/10 transition" onclick="${onPageChange}(${page + 1})">Növbəti</button>
            `;
        }

        // Project pagination handler moved to /js/components/projects.js

        function setListingPage(page) {
            listingPage = Math.max(1, page);
            renderSeaBreeze();
            document.getElementById('seabreeze-properties-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        function getListingLocationLabel(listing = {}) {
            const settings = currentSiteSettings();
            const region = getListingRegionType(listing);
            if (!isRegionVisible(region)) return '';
            if (region === 'seabreeze') return listing.project || (settings.showRayonFilter !== false ? listing.district : '') || (settings.showQesebeFilter !== false ? listing.settlement : '') || 'Sea Breeze';
            return (settings.showQesebeFilter !== false ? (listing.settlement || listing.neighborhood) : '') || (settings.showRayonFilter !== false ? listing.district : '') || listing.city || 'Digər ərazilər';
        }

        function listingLocationPrimary(listing = {}) {
            const settings = currentSiteSettings();
            if (!isListingLocationVisible(listing)) return '';
            if (settings.showRayonFilter === false) return listing.project || listing.city || '';
            return listing.district || listing.project || listing.city || '';
        }

        function renderListingLocationLines(listing = {}) {
            const settings = currentSiteSettings();
            const primary = listingLocationPrimary(listing);
            const rows = [];
            if (primary) rows.push(['📍', primary]);
            if (settings.showMetroFilter !== false && listing.metroStation && isListingLocationVisible(listing)) rows.push(['🚇', listing.metroStation]);
            return rows.length ? `<div class="listing-location-lines">${rows.map(([icon, label]) => `<div class="listing-location-lines__row"><span>${icon}</span><span>${escapeHtml(label)}</span></div>`).join('')}</div>` : '';
        }

        function renderLocationBadges(listing = {}) {
            const settings = currentSiteSettings();
            const rows = [];
            const primary = listingLocationPrimary(listing);
            if (primary) rows.push(['📍', primary]);
            if (settings.showMetroFilter !== false && listing.metroStation && isListingLocationVisible(listing)) rows.push(['🚇', listing.metroStation]);
            return rows.length ? rows.map(([icon, label]) => `<span class="location-badge"><span>${icon}</span>${escapeHtml(label)}</span>`).join('') : '';
        }

        function ownerBadgeLabel(ownerType) {
            return ownerType === 'agent' ? 'VASİTƏÇİ' : 'SAHİBİNDƏN';
        }

        function getListingBadges(listing = {}) {
            const badges = [];
            badges.push({ key: 'sale', label: canonicalListingType(listing.listingType) === 'Satis' ? 'SATILIR' : listingTypeLabel(listing.listingType).toUpperCase(), cls: listingTypeBadgeClass(listing.listingType) });
            if (listing.isCredit) badges.push({ key: 'credit', label: 'KREDİTLƏ', cls: 'bg-red-600/95 text-white' });
            if (listing.hasDocument) badges.push({ key: 'document', label: 'KUPÇA VAR', cls: 'bg-emerald-600/95 text-white' });
            badges.push({ key: 'owner', label: ownerBadgeLabel(listing.ownerType), cls: listing.ownerType === 'agent' ? 'bg-amber-500/95 text-slate-950' : 'bg-blue-600/95 text-white' });
            return badges;
        }

        function renderListingCardImageStrip(listing = {}) {
            const images = Array.isArray(listing.images) ? listing.images.filter(Boolean) : [];
            const extraImages = images.slice(1, 5);
            if (!extraImages.length) return '';
            return `<div class="listing-card-image-strip">${extraImages.map((url, idx) => `<span class="listing-card-image-strip__thumb"><img src="${escapeHtml(url)}" alt="Elan əlavə şəkli ${idx + 1}" loading="lazy"></span>`).join('')}</div>`;
        }

        function renderListingBadgeStack(listing, detail = false) {
            const base = detail
                ? 'inline-flex items-center w-fit rounded-full px-3 py-1 text-[10px] font-black uppercase border border-white/10 shadow-sm'
                : 'sea-breeze-listing-card__badge text-[9px] font-black px-2.5 py-1 rounded-full uppercase shadow-lg';
            return getListingBadges(listing).map(badge => `<span class="${base} ${badge.cls}">${escapeHtml(badge.label)}</span>`).join('');
        }

        function currentListingUrl(listing = {}) {
            const code = formatListingCode(listing.listingCode || listing.code || listing.id);
            return new URL(`/listing/${encodeURIComponent(code)}`, window.location.origin).href;
        }

        function buildWhatsAppMessage(listing, authorName) {
            const price = Number(listing.price);
            return `👋 Salam ${authorName},

🏠 BestHome.az saytında yerləşdirilən bu əmlakla maraqlanıram.

📌 Elan:
${listing.title || 'Elan'}

💰 Qiymət:
${Number.isFinite(price) ? formatPrice(price, listing.currency) : '—'}

📍 Elan linki:
${currentListingUrl(listing)}

📅 Elanı BestHome.az üzərindən gördüm və əlavə məlumat almaq istəyirəm.

Zəhmət olmasa mənimlə əlaqə saxlayın.

Təşəkkür edirəm. 🙏`;
        }

        function emptyDataState(message = 'Hələ məlumat əlavə edilməyib.') {
            return `<div class="col-span-full py-12 text-center text-gray-500 glass-card rounded-2xl font-bold">${message}</div>`;
        }

        function renderCardSkeletons(count = 6) {
            return Array.from({ length: count }).map(() => `
                <div class="glass-card rounded-2xl overflow-hidden animate-pulse">
                    <div class="h-48 md:h-52 bg-slate-200/80"></div>
                    <div class="p-4 space-y-3">
                        <div class="h-4 w-3/4 rounded-full bg-slate-200"></div>
                        <div class="h-3 w-full rounded-full bg-slate-200"></div>
                        <div class="h-3 w-2/3 rounded-full bg-slate-200"></div>
                    </div>
                </div>
            `).join('');
        }


        // Project rendering and modal functions moved to /js/components/projects.js

        // RENDER PROPERTIES ELAN GRID
        function renderSeaBreeze() {
            const properties = [...(appData.listings || [])].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0) || Number(b.id || 0) - Number(a.id || 0));
            const grid = document.getElementById('seabreeze-properties-grid');
            if (!grid) return;
            grid.innerHTML = '';
            if (dataLoadState.listings.loading) {
                grid.innerHTML = renderCardSkeletons(6);
                renderPagination('listings-pagination', 1, 1, 'setListingPage');
                return;
            }

            const regionFilter = document.getElementById('filter-sb-region')?.value || 'all';
            const projectFilter = document.getElementById('filter-sb-project')?.value || 'all';
            const typeFilter = document.getElementById('filter-sb-type')?.value || 'all';
            const creditOnly = document.getElementById('filter-sb-credit')?.checked;
            const searchQuery = (document.getElementById('filter-sb-search')?.value || '').trim().toLowerCase();

            const filtered = properties.filter(p => {
                if (normalizeListingStatus(p.status) !== 'approved') return false;
                const listingRegion = getListingRegionType(p);
                const listingDistrict = getListingDistrict(p);
                if (regionFilter !== 'all' && listingRegion !== regionFilter) return false;
                if (projectFilter !== 'all' && listingDistrict !== projectFilter) return false;
                if (typeFilter !== 'all' && canonicalListingType(p.listingType) !== typeFilter) return false;
                if (creditOnly && !p.isCredit) return false;
                if (searchQuery) {
                    const searchable = [
                        p.title,
                        p.desc,
                        p.project,
                        p.district,
                        p.city,
                        p.settlement,
                        p.streetAddress,
                        p.listingCode,
                        getListingLocationLabel(p),
                        listingTypeLabel(p.listingType)
                    ].map(value => String(value || '').toLowerCase()).join(' ');
                    if (!searchable.includes(searchQuery)) return false;
                }
                return true;
            });
            const totalPages = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1);
            listingPage = Math.min(listingPage, totalPages);
            const paged = filtered.slice((listingPage - 1) * PAGE_SIZE, listingPage * PAGE_SIZE);

            if (filtered.length === 0) {
                grid.innerHTML = properties.length === 0 ? emptyDataState() : `<div class="col-span-full py-12 text-center text-gray-500">Kriteriyalara uyğun elan tapılmadı.</div>`;
                renderPagination('listings-pagination', 1, 1, 'setListingPage');
                return;
            }

            paged.forEach(p => {
                const canonicalType = canonicalListingType(p.listingType);
                const listingLabel = listingTypeLabel(p.listingType);
                const locationLabel = getListingLocationLabel(p);
                const locationLinesHtml = renderListingLocationLines(p);
                const isRent = canonicalType === 'Kiraye';
                const isDailyRent = canonicalType === 'GunlukKiraye';
                const listingTitle = p.title || '—';
                const listingDesc = p.desc || '';
                const formattedPrice = formatPrice(p.price, p.currency);
                const mainImage = p.img || p.images?.[0] || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80';
                const badgeColor = listingTypeBadgeClass(p.listingType);
                const isFavorite = appData.favoriteListingIds?.has(String(p.id));
                const roomFact = p.rooms != null && p.rooms !== '' ? `${p.rooms} otaq` : '— otaq';
                const areaFact = formatOptionalNumber(p.area, ' m²');
                const floorFact = `${formatListingFloor(p.floorNumber ?? p.floor, p.floorCount).replace(/\s*\/\s*/g, '/')} mərtəbə`;
                let sqPriceHtml = '';
                if (isSaleListing(p.listingType) && Number(p.area) > 0) {
                    const sqPrice = Math.round(Number(p.price) / Number(p.area));
                    sqPriceHtml = `
                        <div class="sea-breeze-listing-card__price-per-m2 text-right">
                            <span class="text-[9px] text-black uppercase font-semibold">1 m² Qiyməti</span>
                            <div class="text-xs font-semibold text-black">${formatPrice(sqPrice, p.currency)}</div>
                        </div>
                    `;
                }

                const infoRowHtml = `
                    <div class="listing-info-row sea-breeze-listing-card__stats">
                        <span class="listing-info-row__item">🛏 <strong>${escapeHtml(roomFact)}</strong></span>
                        <span class="listing-info-row__divider">|</span>
                        <span class="listing-info-row__item">📐 <strong>${escapeHtml(areaFact)}</strong></span>
                        <span class="listing-info-row__divider">|</span>
                        <span class="listing-info-row__item">🏢 <strong>${escapeHtml(formatListingFloor(p.floorNumber ?? p.floor, p.floorCount).replace(/\s*\/\s*/g, '/'))}</strong></span>
                        ${p.land ? `<span class="listing-info-row__divider">|</span><span class="listing-info-row__item">🌿 <strong>${escapeHtml(String(p.land))} Sot</strong></span>` : ''}
                    </div>
                `;

                const cardHtml = `
                    <div data-listing-id="${p.id}" class="sea-breeze-listing-card cursor-pointer rounded-2xl overflow-hidden glass-card hover:border-brand-500/40 transition-all duration-300 group flex flex-col h-full min-w-0 max-w-full bg-white">
                        <div class="sea-breeze-listing-card__media h-48 md:h-52 overflow-hidden relative min-w-0 max-w-full">
                            <img src="${mainImage}" width="640" height="480" loading="lazy" decoding="async" class="sea-breeze-listing-card__image w-full h-full object-cover group-hover:scale-105 transition duration-500" onerror="this.src='https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80'">
                            ${p.vip ? '<div class="sea-breeze-listing-card__promo-badge absolute top-4 left-4 bg-purple-600/90 text-white text-[9px] font-bold px-2.5 py-1 rounded-full uppercase">VIP</div>' : ''}
                            ${p.featured ? '<div class="sea-breeze-listing-card__promo-badge absolute top-4 left-16 bg-blue-600/90 text-white text-[9px] font-bold px-2.5 py-1 rounded-full uppercase">Featured</div>' : ''}
                            <button type="button" data-favorite-btn="${p.id}" onclick="toggleFavorite(event, '${p.id}')" class="favorite-btn sea-breeze-listing-card__favorite absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 text-red-500 shadow-lg hover:scale-105 transition disabled:opacity-60 disabled:cursor-not-allowed" aria-label="Favorit" aria-pressed="${isFavorite ? 'true' : 'false'}"><i class="${isFavorite ? 'fa-solid' : 'fa-regular'} fa-heart"></i></button>
                        </div>
                        <div class="sea-breeze-listing-card__body p-4 md:p-5 space-y-3 flex-1 min-w-0 max-w-full">
                            <div class="space-y-1.5">
                                ${locationLinesHtml || (locationLabel ? `<p class="sea-breeze-listing-card__meta text-sm font-extrabold text-slate-700"><i class="fa-solid fa-location-dot text-brand-600 mr-1.5"></i>${escapeHtml(locationLabel)}</p>` : '')}
                                <h3 class="sea-breeze-listing-card__title text-gray-950 font-black text-base leading-snug truncate">${escapeHtml(listingTitle)}</h3>
                            </div>
                            <div class="sea-breeze-listing-card__price min-w-0 max-w-full">
                                <strong class="text-xl md:text-2xl font-black text-gray-950 tracking-tight">${formattedPrice}${isRent && formattedPrice !== '—' ? '<span class="sea-breeze-listing-card__price-period text-sm"> /ay</span>' : ''}${isDailyRent && formattedPrice !== '—' ? '<span class="sea-breeze-listing-card__price-period text-sm"> /gün</span>' : ''}</strong>
                            </div>
                            <div class="listing-card-badge-row">${renderListingBadgeStack(p)}</div>
                            ${infoRowHtml}
                            <div class="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
                                ${p.ownerId || p.authorId ? `<a href="/user/${encodeURIComponent(p.ownerId || p.authorId)}" onclick="event.stopPropagation()" class="text-sm font-bold text-brand-700 hover:underline truncate">${escapeHtml(p.ownerName || agentNameById(p.authorId) || 'BestHome Agent')}</a>` : `<span class="text-sm font-bold text-brand-700 truncate">${escapeHtml(p.ownerName || agentNameById(p.authorId) || 'BestHome Agent')}</span>`}
                                <span class="text-sm font-black text-brand-700 whitespace-nowrap">Kod: ${formatListingCode(p.listingCode)}</span>
                            </div>
                            <div class="flex items-center justify-between gap-2 text-[10px] text-gray-500">
                                <span><i class="fa-regular fa-calendar mr-1"></i>${formatAzDateTime(p.createdAt)}</span>
                                <span><i class="fa-regular fa-eye mr-1"></i>${p.viewCount || 0} <i class="fa-regular fa-heart ml-2 mr-1"></i><span data-favorite-count="${p.id}">${p.favoritesCount || 0}</span></span>
                            </div>
                        </div>
                    </div>
                `;
                grid.insertAdjacentHTML('beforeend', cardHtml);
            });
            renderPagination('listings-pagination', listingPage, totalPages, 'setListingPage');
        }


        function getListingFavoriteCount(listingId) {
            const key = String(listingId);
            const listing = appData.listings.find(item => String(item.id) === key);
            if (listing) return Number(listing.favoritesCount || 0);
            if (window.activePropertyListing && String(window.activePropertyListing.id) === key) return Number(window.activePropertyListing.favoritesCount || 0);
            return 0;
        }

        function setListingFavoriteCount(listingId, count) {
            const key = String(listingId);
            const safeCount = Math.max(0, Number(count || 0));
            appData.listings.forEach((item) => {
                if (String(item.id) === key) item.favoritesCount = safeCount;
            });
            if (window.activePropertyListing && String(window.activePropertyListing.id) === key) window.activePropertyListing.favoritesCount = safeCount;
        }

        function updateFavoriteUI(listingId, isFavorite, count = getListingFavoriteCount(listingId)) {
            const key = String(listingId);
            const safeCount = Math.max(0, Number(count || 0));
            if (isFavorite) appData.favoriteListingIds.add(key);
            else appData.favoriteListingIds.delete(key);
            setListingFavoriteCount(key, safeCount);
            cacheFavoriteListingIds(appData.favoriteListingIds);
            renderFavoriteControlState(key);
        }

        function renderFavoriteControlState(listingId) {
            const key = String(listingId);
            const isFavorite = appData.favoriteListingIds?.has(key);
            const count = getListingFavoriteCount(key);
            document.querySelectorAll('[data-favorite-btn], button[onclick*="toggleFavorite(event,"]').forEach((button) => {
                const buttonListingId = button.dataset.favoriteBtn || (button.getAttribute('onclick') || '').match(/toggleFavorite\(event, ['"]([^'"]+)['"]\)/)?.[1];
                if (String(buttonListingId || '') !== key) return;
                button.setAttribute('aria-pressed', isFavorite ? 'true' : 'false');
                const icon = button.querySelector('i');
                if (icon) {
                    icon.classList.toggle('fa-solid', isFavorite);
                    icon.classList.toggle('fa-regular', !isFavorite);
                }
            });
            document.querySelectorAll('[data-favorite-count]').forEach((node) => {
                if (String(node.dataset.favoriteCount || '') === key) node.textContent = count;
            });
            const detailBtn = document.getElementById('p-modal-favorite-btn');
            if (detailBtn && window.activePropertyListing && String(window.activePropertyListing.id) === key) {
                detailBtn.innerHTML = `<i class="${isFavorite ? 'fa-solid' : 'fa-regular'} fa-heart"></i><span>${isFavorite ? 'Favoridən çıxar' : 'Favori'}</span>`;
                detailBtn.setAttribute('aria-pressed', isFavorite ? 'true' : 'false');
            }
        }

        async function toggleFavorite(event, listingId) {
            event?.preventDefault?.();
            event?.stopPropagation?.();
            if (!getAuthToken()) {
                showToast('Favori əlavə etmək üçün giriş edin.');
                switchTab('admin-login');
                return;
            }
            const key = String(listingId);
            const clickedButton = event?.currentTarget?.closest?.('button') || event?.target?.closest?.('button');
            if (clickedButton?.disabled) return;
            const previousState = appData.favoriteListingIds?.has(key);
            const previousCount = getListingFavoriteCount(key);
            const nextState = !previousState;
            const nextCount = Math.max(0, previousCount + (nextState ? 1 : -1));
            console.time('favorite-toggle');
            const requestStartedAt = performance.now();
            if (clickedButton) clickedButton.disabled = true;
            updateFavoriteUI(key, nextState, nextCount);
            logFavoritesDebug('optimistic favorite UI updated', { listingId: key, previousState, nextState, previousCount, nextCount });
            try {
                const response = nextState
                    ? await apiRequest('/api/favorites', { method: 'POST', body: JSON.stringify({ listingId }) })
                    : await apiRequest(`/api/favorites/${listingId}`, { method: 'DELETE' });
                console.log('favorite-toggle API response time:', `${Math.round(performance.now() - requestStartedAt)}ms`, response || { status: 204 });
                logFavoritesDebug('toggleFavorite stored ids', { listingId: key, isFavorite: nextState, favoriteIds: Array.from(appData.favoriteListingIds) });
            } catch (err) {
                updateFavoriteUI(key, previousState, previousCount);
                showToast('Favori əməliyyatı alınmadı');
                console.warn('Favorite toggle failed; optimistic UI reverted:', err);
            } finally {
                if (clickedButton) clickedButton.disabled = false;
                console.timeEnd('favorite-toggle');
            }
        }

        async function trackListingView(listingId) {
            const key = `besthome-viewed-listing-${listingId}`;
            if (sessionStorage.getItem(key)) return;
            try {
                const result = await apiRequest(`/api/listings/${listingId}/view`, { method: 'POST', body: JSON.stringify({}) });
                sessionStorage.setItem(key, '1');
                if (result?.counted) {
                    const idx = appData.listings.findIndex(item => String(item.id) === String(listingId));
                    if (idx > -1) appData.listings[idx].viewCount = result.viewCount;
                }
            } catch (error) {
                console.warn('Listing view tracking failed:', error.message);
            }
        }

        // Listing modal functions moved to /js/components/listing-modal.js

        // PORTFOLIO AND LIGHTBOX ENGINE
        const GALLERY_PAGE_LIMIT = 5000;
        let activeModalGalleryItems = [];
        let activeModalGalleryIndex = 0;
        let activeModalMediaIndex = 0;

        window.BestHomeGallery.configure({
            pageLimit: GALLERY_PAGE_LIMIT,
            orderedGalleryItems,
            escapeHtml,
            renderCardSkeletons,
            emptyDataState,
            apiRequest,
            extractResponseItems,
            isTabAktiv,
            renderAdminGallery: () => renderAdminGallery(),
            isGalleryLoading: () => dataLoadState.gallery.loading,
            setGalleryLoading: (loading, error) => {
                dataLoadState.gallery.loading = Boolean(loading);
                if (typeof error === 'string') dataLoadState.gallery.error = error;
            },
            setGalleryLoaded: (loaded) => { dataLoadState.gallery.loaded = Boolean(loaded); },
            setGalleryItems: (items) => {
                appData.gallery = Array.isArray(items) ? items : [];
                cacheData('gallery', appData.gallery);
            }
        });

        function filterPortfolio(type) { return window.BestHomeGallery.filterPortfolio(type); }
        function galleryItems() { return window.BestHomeGallery.galleryItems(); }
        function renderGalleryHero() { return window.BestHomeGallery.renderGalleryHero(); }
        function adminGalleryActionArg(id) {
            return `'${String(id ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, '\\n')}'`;
        }

        function getAdminGalleryContainer() {
            let container = document.getElementById('admin-gallery-list');
            if (container) return container;
            const subtab = document.getElementById('admin-subtab-gallery-manager');
            if (!subtab) return null;
            container = document.createElement('div');
            container.id = 'admin-gallery-list';
            container.className = 'space-y-4 lg:col-span-7';
            subtab.appendChild(container);
            return container;
        }

        function adminGalleryItems() {
            const galleryFilter = document.getElementById('admin-gallery-filter')?.value || 'all';
            return (Array.isArray(appData.gallery) ? appData.gallery : [])
                .map(normalizeGalleryItem)
                .filter(item => galleryFilter === 'all' || item.media_type === galleryFilter || item.mediaType === galleryFilter)
                .sort((a, b) => (Number(a.sortOrder || 0) - Number(b.sortOrder || 0)) || new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        }

        function renderAdminGalleryPreview(item = {}) {
            const normalized = normalizeGalleryItem(item);
            const title = escapeHtml(normalized.title || 'Qalereya');
            const imageSrc = normalized.thumbnail || normalized.thumbnailUrl || normalized.thumbnail_url || normalized.imageUrl || normalized.image_url || normalized.image || normalized.images?.[0] || '';
            const videoSrc = normalized.videoUrl || normalized.video_url || normalized.url || '';
            if (normalized.mediaType === 'video') {
                if (imageSrc) {
                    return `<div class="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-black/40 border border-white/10"><img src="${escapeHtml(imageSrc)}" alt="${title}" loading="lazy" class="w-full h-full object-cover"><span class="absolute inset-0 flex items-center justify-center text-white text-lg bg-black/20"><i class="fa-solid fa-play"></i></span></div>`;
                }
                if (videoSrc && /\.(mp4|webm|mov)(\?|#|$)/i.test(videoSrc)) {
                    return `<video src="${escapeHtml(videoSrc)}" muted playsinline preload="metadata" class="shrink-0 w-20 h-20 rounded-xl object-cover bg-black/40 border border-white/10"></video>`;
                }
                return '<div class="shrink-0 w-20 h-20 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-300"><i class="fa-solid fa-video"></i></div>';
            }
            if (imageSrc) {
                return `<img src="${escapeHtml(imageSrc)}" alt="${title}" loading="lazy" class="shrink-0 w-20 h-20 rounded-xl object-cover bg-white/5 border border-white/10">`;
            }
            return '<div class="shrink-0 w-20 h-20 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-300"><i class="fa-regular fa-image"></i></div>';
        }

        function renderAdminGalleryFallback(items, container) {
            container.innerHTML = items.map((rawItem) => {
                const item = normalizeGalleryItem(rawItem);
                const idArg = adminGalleryActionArg(item.id);
                const preview = renderAdminGalleryPreview(item);
                return `<div class="admin-media-card glass-card p-4 rounded-2xl flex gap-3 items-center text-xs" data-gallery-id="${escapeHtml(item.id)}">
                    ${preview}
                    <div class="min-w-0 flex-1">
                        <h3 class="font-black text-white truncate">${escapeHtml(item.title || 'Adsız media')}</h3>
                        <p class="text-[11px] text-gray-400 line-clamp-2">${escapeHtml(item.desc || item.description || 'Açıqlama yoxdur')}</p>
                    </div>
                    <div class="flex flex-col sm:flex-row gap-2 shrink-0">
                        <button type="button" onclick="editGalleryItem(${idArg})" class="text-blue-400 px-3 py-2 bg-blue-500/10 hover:bg-blue-500 hover:text-white rounded-xl transition">Redaktə</button>
                        <button type="button" onclick="deleteGalleryItem(${idArg})" class="text-red-400 px-3 py-2 bg-red-500/10 hover:bg-red-500 hover:text-white rounded-xl transition"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>`;
            }).join('');
        }

        function renderAdminGallery() {
            const items = adminGalleryItems();
            const container = getAdminGalleryContainer();
            if (!container) return;
            container.innerHTML = '';
            if (dataLoadState.gallery.loading && items.length === 0) {
                container.innerHTML = '<div class="glass-card p-6 rounded-2xl text-center text-sm text-gray-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Qalereya yüklənir…</div>';
                return;
            }
            if (dataLoadState.gallery.error && items.length === 0) {
                container.innerHTML = '<div class="glass-card p-6 rounded-2xl text-center text-sm font-bold text-red-300">Məlumat yüklənmədi. Yenidən cəhd edin.</div>';
                return;
            }
            if (items.length === 0) {
                container.innerHTML = '<div class="glass-card p-6 rounded-2xl text-center text-sm font-bold text-gray-400">Məlumat yoxdur</div>';
                return;
            }
            try {
                container.innerHTML = items.map((g, index) => {
                    const idArg = adminGalleryActionArg(g.id);
                    const isFeatured = Boolean(g.isFeatured || g.is_featured);
                    return `<div class="admin-media-card media-card glass-card p-3 rounded-2xl flex gap-3 items-center text-xs" data-gallery-id="${escapeHtml(g.id)}">
                        <button type="button" class="admin-media-drag-handle shrink-0 bg-white/5 hover:bg-brand-500/20 text-gray-300 hover:text-white w-10 h-10 rounded-xl transition" onpointerdown="startGalleryDrag(event, ${idArg})" aria-label="Media sırasını dəyiş">
                            <i class="fa-solid fa-grip-vertical"></i>
                        </button>
                        ${renderAdminGalleryPreview(g)}
                        <div class="min-w-0 flex-1">
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="font-black text-white truncate">${escapeHtml(g.title || 'Adsız media')}</span>
                                <span class="rounded-full bg-white/10 text-gray-300 px-2 py-0.5 text-[10px] font-bold">${g.type === 'event' ? 'Qalereya' : 'Video'}</span>
                                <span class="rounded-full bg-brand-500/15 text-brand-200 px-2 py-0.5 text-[10px] font-bold">#${index + 1}</span>
                            </div>
                            <p class="text-[11px] text-gray-400 mt-1 line-clamp-1">${escapeHtml(g.desc || g.description || 'Açıqlama yoxdur')}</p>
                        </div>
                        <div class="flex flex-col sm:flex-row gap-2 shrink-0">
                            ${g.type === 'video' ? `<button type="button" onclick="toggleGalleryHero(${idArg}, ${!isFeatured})" ${galleryHeroToggleSubmittingId === String(g.id) ? 'disabled' : ''} class="text-amber-300 px-3 py-2 ${isFeatured ? 'bg-amber-500/20 hover:bg-amber-500' : 'bg-white/5 hover:bg-amber-500'} hover:text-white rounded-xl transition disabled:opacity-60 disabled:cursor-not-allowed">${galleryHeroToggleSubmittingId === String(g.id) ? 'Gözləyin…' : (isFeatured ? '⭐ Herodan çıxart' : '⭐ Heroya əlavə et')}</button>` : ''}
                            <button type="button" onclick="editGalleryItem(${idArg})" class="text-blue-400 px-3 py-2 bg-blue-500/10 hover:bg-blue-500 hover:text-white rounded-xl transition">Redaktə</button>
                            <button type="button" onclick="deleteGalleryItem(${idArg})" class="text-red-400 px-3 py-2 bg-red-500/10 hover:bg-red-500 hover:text-white rounded-xl transition"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>`;
                }).join('');
            } catch (error) {
                console.warn('Admin qalereya render alınmadı, sadə render istifadə olunur:', error.message);
                renderAdminGalleryFallback(items, container);
            }
        }

        function galleryItemMediaCount(item) {
            return item.type === 'event' ? Math.max(1, item.images?.length || 0) : 1;
        }

        const markMediaLoaded = window.BestHomeGallery.markMediaLoaded;
        window.markMediaLoaded = markMediaLoaded;

        function observeGalleryMedia() { return window.BestHomeGallery.observeGalleryMedia(); }
        async function loadGalleryPage(page = 1) { return window.BestHomeGallery.loadGalleryPage(page); }
        async function loadGallery() { return window.BestHomeGallery.loadGallery(); }

        let galleryHeroToggleSubmittingId = null;

        async function toggleGalleryHero(id, isFeatured) {
            if (galleryHeroToggleSubmittingId !== null) return;
            galleryHeroToggleSubmittingId = String(id);
            renderAdminDashboard();
            try {
                await apiRequest(`/api/gallery/${encodeURIComponent(id)}/hero`, {
                    method: 'POST',
                    body: JSON.stringify({ isFeatured: Boolean(isFeatured) })
                });
                await loadGallery();
                renderAdminGallery();
                renderPortfolio();
                renderGalleryHero();
            } catch (error) {
                alert(error.message || 'Hero statusu yenilənmədi.');
                renderAdminDashboard();
            } finally {
                galleryHeroToggleSubmittingId = null;
                renderAdminDashboard();
            }
        }

        function renderPortfolioPagination() { return window.BestHomeGallery.renderPortfolioPagination(); }
        function renderFeaturedVideoSection(videos = []) { return window.BestHomeGallery.renderFeaturedVideoSection(videos); }
        function changeFeaturedVideo(dir) { return window.BestHomeGallery.changeFeaturedVideo(dir); }
        function renderPortfolio() { return window.BestHomeGallery.renderPortfolio(); }

        // KARYERA & VAKANSİYA SİSTEMİ
        function renderCareerSection() {
            const list = appData.vacancies;
            const container = document.getElementById('active-vacancies-list');
            const dropdown = document.getElementById('app-vacancy');

            document.getElementById('career-intro-text-view').textContent = appData.careerText || '';

            container.innerHTML = '';
            dropdown.innerHTML = '<option value="" disabled selected>Vakansiya seçin *</option>';

            const activeOnes = list.filter(v => (v.isActive ?? v.status === 'Aktiv') === true);

            if (activeOnes.length === 0) {
                container.innerHTML = `<div class="p-6 text-center text-gray-500 glass-card rounded-2xl">Aktiv vakansiya yoxdur.</div>`;
                dropdown.innerHTML += `<option value="Ümumi Müraciət">Ümumi Müraciət</option>`;
                return;
            }

            activeOnes.forEach(v => {
                container.innerHTML += `
                    <div class="glass-card rounded-2xl overflow-hidden border-l-4 border-brand-500">
                        <div onclick="openVacancyRoute('${v.id}')" class="p-4 flex justify-between items-center cursor-pointer hover:bg-brand-50/70 transition">
                            <div>
                                <h3 class="text-sm md:text-base font-bold text-gray-900">${escapeHtml(v.title)}</h3>
                                <div class="flex flex-wrap gap-2 text-[11px] md:text-xs text-gray-700 mt-1">
                                    <span><i class="fa-solid fa-location-dot mr-1"></i> ${escapeHtml(v.location)}</span>
                                    <span><i class="fa-solid fa-money-bill mr-1"></i> ${escapeHtml(v.salary)}</span>
                                </div>
                            </div>
                            <i id="vac-arrow-${v.id}" class="fa-solid fa-chevron-down text-gray-500"></i>
                        </div>
                        <div id="vac-detail-${v.id}" class="hidden p-4 bg-brand-50/80 border-t border-brand-200 text-xs text-gray-700 space-y-3 whitespace-pre-line">
                            ${escapeHtml(v.desc)}
                            <div class="pt-2 flex justify-end">
                                <button onclick="selectVacancy('${v.title}')" class="bg-brand-700 text-white text-[10px] font-bold px-4 py-2 rounded-xl">Müraciət et</button>
                            </div>
                        </div>
                    </div>
                `;
                dropdown.innerHTML += `<option value="${v.title}">${v.title}</option>`;
            });
            dropdown.innerHTML += `<option value="Ümumi Müraciət">Ümumi Müraciət</option>`;
        }


        function openVacancyRoute(id) {
            const vacancy = appData.vacancies.find(item => String(item.id) === String(id));
            if (!vacancy) return;
            history.pushState({ route: 'vacancy', id: vacancy.id }, '', vacancyPath(vacancy));
            updateSeo({ title: `${vacancy.title} Vakansiyası`, description: vacancy.desc || DEFAULT_SEO_DESCRIPTION, path: vacancyPath(vacancy) });
            toggleVacancyAccordion(vacancy.id);
        }

        function toggleVacancyAccordion(id) {
            const block = document.getElementById('vac-detail-' + id);
            const arrow = document.getElementById('vac-arrow-' + id);
            if (block.classList.contains('hidden')) {
                block.classList.remove('hidden');
                arrow.className = "fa-solid fa-chevron-up text-brand-500";
            } else {
                block.classList.add('hidden');
                arrow.className = "fa-solid fa-chevron-down text-gray-500";
            }
        }

        function selectVacancy(title) {
            document.getElementById('app-vacancy').value = title;
            document.getElementById('career-form').scrollIntoView({ behavior: 'smooth' });
        }

        let selectedCvFile = '';
        function handleFileSelect(e) {
            const file = e.target.files[0];
            if (file) {
                selectedCvFile = file.name;
                document.getElementById('cv-file-name').textContent = "Seçildi: " + file.name;
            }
        }

        async function handleFormSubmit(e) {
            e.preventDefault();
            const newItem = {
                name: document.getElementById('app-name').value,
                surname: document.getElementById('app-surname').value,
                phone: document.getElementById('app-phone').value,
                email: document.getElementById('app-email').value,
                vacancy: document.getElementById('app-vacancy').value,
                fileName: selectedCvFile || "cv.pdf",
                notes: document.getElementById('app-notes').value,
                date: formatAzDate(new Date()),
                status: "Gözləmədə"
            };

            try {
                const formData = new FormData();
                formData.append('fullname', `${newItem.name} ${newItem.surname}`.trim());
                formData.append('phone', newItem.phone);
                const selectedVacancy = appData.vacancies.find(v => v.title === newItem.vacancy);
                if (selectedVacancy && Number.isInteger(Number(selectedVacancy.id))) formData.append('vacancy_id', selectedVacancy.id);
                if (document.getElementById('app-cv').files[0]) formData.append('cv', document.getElementById('app-cv').files[0]);
                const created = await apiRequest('/api/applications', 'POST', formData);
                cacheData('applications', [dbAppToUi(created), ...appData.applications]);
            } catch (error) {
                alert('Müraciət API-yə göndərilmədi: ' + error.message);
                return;
            }

            document.getElementById('career-form').reset();
            document.getElementById('cv-file-name').textContent = "CV Faylı seçin (PDF, DOCX)";
            selectedCvFile = '';
            
            const alertBox = document.getElementById('form-success-alert');
            alertBox.classList.remove('hidden');
            setTimeout(() => alertBox.classList.add('hidden'), 5000);
        }


        function getMortgageCalculation() {
            const price = Math.max(0, Number(document.getElementById('mortgage-price')?.value) || 0);
            const down = Math.min(Math.max(0, Number(document.getElementById('mortgage-down')?.value) || 0), price);
            const rate = Math.max(0, Number(document.getElementById('mortgage-rate')?.value) || 0);
            const years = Math.max(1, Number(document.getElementById('mortgage-years')?.value) || 1);
            const loan = Math.max(price - down, 0);
            const months = years * 12;
            const monthlyRate = rate / 100 / 12;
            const monthly = loan === 0 ? 0 : monthlyRate === 0 ? loan / months : loan * (monthlyRate * ((1 + monthlyRate) ** months)) / (((1 + monthlyRate) ** months) - 1);
            const total = monthly * months;
            const interest = Math.max(total - loan, 0);
            return { price, down, rate, years, loan, monthly, total, interest };
        }

        function calculateMortgage() {
            const result = getMortgageCalculation();
            const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = formatCurrency(value); };
            setText('mortgage-loan', result.loan);
            setText('mortgage-monthly', result.monthly);
            setText('mortgage-total', result.total);
            setText('mortgage-interest', result.interest);
            return result;
        }

        function downloadMortgagePdf() {
            const r = calculateMortgage();
            const printWindow = window.open('', '_blank', 'noopener,noreferrer');
            if (!printWindow) return alert('PDF pəncərəsi bloklandı. Brauzer popup icazəsini aktiv edin.');
            printWindow.document.write(`<!doctype html><html lang="az"><head><meta charset="utf-8"><title>İpoteka Kalkulyatoru</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111827}h1{color:#111827}.card{border:1px solid #CFCFFF;border-radius:16px;padding:16px;margin:12px 0}.value{font-size:24px;font-weight:900}</style></head><body><h1>BestHome.az — İpoteka Kalkulyatoru</h1><p>Mənzil qiyməti: <strong>${formatCurrency(r.price)}</strong></p><p>İlkin ödəniş: <strong>${formatCurrency(r.down)}</strong></p><p>Faiz dərəcəsi: <strong>${r.rate}%</strong> • Müddət: <strong>${r.years} il</strong></p><div class="card">Kredit məbləği<div class="value">${formatCurrency(r.loan)}</div></div><div class="card">Aylıq ödəniş<div class="value">${formatCurrency(r.monthly)}</div></div><div class="card">Ümumi ödəniş<div class="value">${formatCurrency(r.total)}</div></div><div class="card">Ümumi faiz<div class="value">${formatCurrency(r.interest)}</div></div></body></html>`);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => printWindow.print(), 250);
        }

        // LOGIN ENGINE
        async function handleUserRegister(e) {
            e.preventDefault();
            if (isRegisterSubmitting) return;
            isRegisterSubmitting = true;
            setRegisterButtonLoading(true);
            const error = document.getElementById('register-error');
            try {
                const emailInput = document.getElementById('register-email');
                const email = (emailInput?.value || '').trim().toLowerCase();
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
                    if (emailInput) emailInput.setCustomValidity('Email ünvanını düzgün daxil edin.');
                    if (emailInput?.reportValidity) emailInput.reportValidity();
                    throw new Error('Email ünvanını düzgün daxil edin.');
                }
                if (emailInput) emailInput.setCustomValidity('');
                const result = await apiRequest('/api/auth/register', { method: 'POST', body: JSON.stringify({ fullname: document.getElementById('register-fullname').value, phone: document.getElementById('register-phone').value, email, password: document.getElementById('register-pass').value }) });
                error.classList.add('hidden');
                const success = document.getElementById('register-success');
                success.textContent = result.message || 'Qeydiyyat tamamlandı. Hesabınız aktivdir.';
                success.classList.remove('hidden');
                e.target.reset();
                if (result.token && result.user) {
                    setAuthSession(result.token, result.user);
                    const role = normalizeAuthRole(result.user.role);
                    activeUser = { role, name: result.user.fullname || result.user.email, fullname: result.user.fullname || '', id: result.user.id, email: result.user.email, phone: result.user.phone || '', avatarUrl: result.user.avatarUrl || result.user.avatar_url || '', bio: result.user.bio || '', provider: result.user.provider || 'local' };
                    updateHeaderUI();
                    await hydrateFromDatabase();
                    history.replaceState({ path: '/profil' }, '', '/profil');
                    await routeToCurrentPath();
                    return;
                }
                switchTab('admin-login');
                const status = document.getElementById('login-status');
                if (status) { status.textContent = result.message || 'Qeydiyyat tamamlandı. Hesabınız aktivdir və daxil ola bilərsiniz.'; status.classList.remove('hidden'); }
            } catch (apiError) {
                error.textContent = apiError.message || 'Qeydiyyat alınmadı.';
                error.classList.remove('hidden');
            } finally {
                isRegisterSubmitting = false;
                setRegisterButtonLoading(false);
            }
        }

        async function handleForgotPassword(e) {
            e.preventDefault();
            const box = document.getElementById('forgot-message');
            const button = document.getElementById('forgot-submit-btn');
            const originalText = button?.textContent || 'Göndər';
            if (button) { button.disabled = true; button.textContent = 'Göndərilir…'; button.classList.add('opacity-70', 'cursor-not-allowed'); }
            box.classList.add('hidden');
            box.className = 'hidden bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-3 rounded-xl text-xs';
            try {
                const response = await apiRequest('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: document.getElementById('forgot-email').value }) });
                box.textContent = response?.message || 'Şifrə bərpa linki email ünvanınıza göndərildi.';
                box.className = 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-3 rounded-xl text-xs';
            } catch (error) {
                box.textContent = error.message || 'Şifrə bərpa linki göndərilə bilmədi. Bir az sonra yenidən cəhd edin.';
                box.className = 'bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded-xl text-xs';
            } finally {
                if (button) { button.disabled = false; button.textContent = originalText; button.classList.remove('opacity-70', 'cursor-not-allowed'); }
            }
        }


        function currentResetToken() {
            return new URLSearchParams(window.location.search).get('token') || '';
        }

        function startGoogleLogin() {
            window.location.href = '/api/auth/google';
        }

        async function resendVerificationFromLogin() {
            const email = document.getElementById('login-email')?.value || '';
            const error = document.getElementById('login-error');
            try {
                const result = await apiRequest('/api/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) });
                error.textContent = result.message || 'Yeni təsdiqləmə linki göndərildi.';
                error.className = 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-3 rounded-xl text-xs';
            } catch (apiError) {
                error.textContent = apiError.message || 'Təsdiqləmə linki göndərilmədi.';
                error.className = 'bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs';
            }
        }

        async function handleResetPassword(e) {
            e.preventDefault();
            const box = document.getElementById('reset-message');
            try {
                const result = await apiRequest('/api/auth/reset-password', {
                    method: 'POST',
                    body: JSON.stringify({
                        token: currentResetToken(),
                        password: document.getElementById('reset-new-password').value,
                        passwordConfirmation: document.getElementById('reset-confirm-password').value
                    })
                });
                box.textContent = result.message || 'Şifrəniz uğurla dəyişdirildi ✅';
                box.className = 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-3 rounded-xl text-xs';
                e.target.reset();
            } catch (apiError) {
                box.textContent = apiError.message || 'Şifrə bərpası alınmadı.';
                box.className = 'bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs';
            }
        }

        async function verifyEmailFromUrl() {
            if (window.location.pathname !== '/verify-email') return false;
            switchTab('admin-login', { skipPush: true });
            const status = document.getElementById('login-status');
            const error = document.getElementById('login-error');
            try {
                const result = await apiRequest('/api/auth/verify-email', { method: 'POST', body: JSON.stringify({ token: currentResetToken() }) });
                status.textContent = result.message || 'Hesab uğurla təsdiqləndi ✅';
                status.classList.remove('hidden');
                error.classList.add('hidden');
            } catch (apiError) {
                error.textContent = apiError.message || 'Email təsdiqləmə alınmadı.';
                error.className = 'bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs';
                status.classList.add('hidden');
            }
            return true;
        }

        async function completeGoogleLoginFromUrl() {
            const params = new URLSearchParams(window.location.search);
            const token = params.get('token');
            if (!token) return false;
            setAuthSession(token, null);
            params.delete('token');
            const cleanUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`;
            window.history.replaceState({}, '', cleanUrl);
            try {
                const result = await apiRequest('/api/auth/me');
                setAuthSession(token, result.user);
                const user = result.user;
                const role = normalizeAuthRole(user.role);
                activeUser = { role, name: user.fullname || user.email, fullname: user.fullname || '', id: user.id, email: user.email, phone: user.phone || '', avatarUrl: user.avatarUrl || user.avatar_url || '', bio: user.bio || '', provider: user.provider || 'google' };
                updateHeaderUI();
                homepageHydration.admin = false;
                scheduleIdleTask(() => hydrateFromDatabase().catch(error => console.warn('Google login sonrası məlumat yüklənməsi tamamlanmadı:', error.message)), 250);
                if (isAdminRole(activeUser.role)) { await refreshAdminStats({ render: true }).catch(() => {}); await loadAdminListings({ render: false }).catch(() => {}); }
                const pendingRoute = consumePendingAuthRoute();
                if (pendingRoute) history.replaceState({ path: pendingRoute }, '', pendingRoute);
                await routeToCurrentPath();
                return true;
            } catch (_error) {
                clearAuthSession();
                return false;
            }
        }

        async function handleProfileUpdate(e) {
            e.preventDefault();
            try {
                const result = await apiRequest('/api/auth/me', { method: 'PUT', body: JSON.stringify({ fullname: document.getElementById('profile-fullname').value, phone: normalizeAzerbaijanPhone(document.getElementById('profile-phone').value) || document.getElementById('profile-phone').value, avatar_url: document.getElementById('profile-avatar').value, bio: document.getElementById('profile-bio').value }) });
                setAuthSession(result.token, result.user);
                activeUser = { ...activeUser, name: result.user.fullname, fullname: result.user.fullname, email: result.user.email, phone: result.user.phone || '', avatarUrl: result.user.avatarUrl || result.user.avatar_url || '', bio: result.user.bio || '' };
                updateHeaderUI();
                populateProfileForm(result.user);
                alert('Profil yeniləndi.');
            } catch (error) { alert('Profil yenilənmədi: ' + error.message); }
        }

        async function handlePasswordChange(e) {
            e.preventDefault();
            try {
                await apiRequest('/api/auth/me/password', { method: 'PUT', body: JSON.stringify({ current_password: document.getElementById('profile-current-password').value, new_password: document.getElementById('profile-new-password').value }) });
                document.getElementById('profile-current-password').value = '';
                document.getElementById('profile-new-password').value = '';
                alert('Şifrə yeniləndi.');
            } catch (error) { alert('Şifrə yenilənmədi: ' + error.message); }
        }

        function populateProfileForm(user = null) {
            if (!activeUser && !user) return;
            const stored = user || JSON.parse(localStorage.getItem('besthome_user_data') || sessionStorage.getItem('besthome_user_data') || '{}');
            const merged = { ...activeUser, ...stored };
            const avatar = merged.avatarUrl || merged.avatar_url || '';
            if (document.getElementById('profile-fullname')) document.getElementById('profile-fullname').value = merged.fullname || merged.name || '';
            if (document.getElementById('profile-phone')) document.getElementById('profile-phone').value = merged.phone || '';
            if (document.getElementById('profile-email')) document.getElementById('profile-email').value = merged.email || '';
            if (document.getElementById('profile-avatar')) document.getElementById('profile-avatar').value = avatar;
            const providerLabel = document.getElementById('profile-provider-label');
            if (providerLabel) providerLabel.classList.toggle('hidden', (merged.provider || 'local') !== 'google');
            if (document.getElementById('profile-bio')) document.getElementById('profile-bio').value = merged.bio || '';
            if (document.getElementById('profile-avatar-preview')) document.getElementById('profile-avatar-preview').src = avatar || avatarFallback(merged.fullname || merged.name || 'BestHome');
            const completion = profileCompletionFor({ ...merged, avatarUrl: avatar });
            if (document.getElementById('profile-completion-label')) document.getElementById('profile-completion-label').textContent = `${completion}%`;
            if (document.getElementById('profile-completion-bar')) document.getElementById('profile-completion-bar').style.width = `${completion}%`;
            document.getElementById('profile-phone-warning')?.classList.toggle('hidden', userHasContactPhone(merged));
        }

        function fillProfileForm() { populateProfileForm(); }

        function previewProfileAvatar(file) {
            if (!file) return;
            const url = URL.createObjectURL(file);
            document.getElementById('profile-avatar-preview').src = url;
        }

        async function uploadProfileAvatar() {
            const file = document.getElementById('profile-avatar-file')?.files?.[0];
            if (!file) return alert('Şəkil seçin.');
            const formData = new FormData();
            formData.append('avatar', file);
            try {
                const result = await apiRequest('/api/users/me/avatar', 'POST', formData);
                setAuthSession(getAuthToken(), result.user);
                activeUser = { ...activeUser, avatarUrl: result.avatarUrl };
                populateProfileForm(result.user);
                alert('Profil şəkli yeniləndi.');
            } catch (error) { alert('Şəkil yüklənmədi: ' + error.message); }
        }

        async function deleteProfileAvatar() {
            try {
                const result = await apiRequest('/api/users/me/avatar', { method: 'DELETE' });
                setAuthSession(getAuthToken(), result.user);
                activeUser = { ...activeUser, avatarUrl: '' };
                populateProfileForm(result.user);
            } catch (error) { alert('Şəkil silinmədi: ' + error.message); }
        }

        function openAvatarModal(src) {
            if (!src) return;
            showInlineModal('Avatar', `<img src="${src}" class="max-h-[70vh] mx-auto rounded-3xl object-contain">`);
        }

        let isRegisterSubmitting = false;
        let isListingSaveSubmitting = false;
        let isProjectSaveSubmitting = false;
        let isOfficialProjectFormExpanded = false;
        let isHeroSaveSubmitting = false;
        let isGallerySaveSubmitting = false;
        let editingGalleryThumbnail = '';
        let isVacancySaveSubmitting = false;
        let isUserActionSubmitting = false;

        const setSubmitButtonLoading = window.BestHomeAdmin.setSubmitButtonLoading;


        const adminActionLocks = new Set();

        function beginAdminAction(button, key, loadingText = 'Gözləyin...') {
            const lockKey = String(key || 'admin-action');
            if (adminActionLocks.has(lockKey)) return null;
            adminActionLocks.add(lockKey);
            const target = button?.closest?.('button') || button;
            const originalHtml = target?.innerHTML || '';
            if (target) {
                target.disabled = true;
                target.classList.add('is-loading');
                target.setAttribute('aria-busy', 'true');
                target.innerHTML = `<span class="button-spinner" aria-hidden="true"></span><span>${escapeHtml(loadingText)}</span>`;
            }
            return () => {
                adminActionLocks.delete(lockKey);
                if (!target?.isConnected) return;
                target.disabled = false;
                target.classList.remove('is-loading');
                target.setAttribute('aria-busy', 'false');
                target.innerHTML = originalHtml;
            };
        }

        function finishAdminAction(restore) {
            if (typeof restore === 'function') restore();
        }

        function runInstantAdminAction(button, loadingText, callback) {
            const restore = beginAdminAction(button, `instant:${loadingText}:${Date.now()}:${Math.random()}`, loadingText);
            if (!restore) return;
            requestAnimationFrame(() => {
                try { callback?.(); }
                finally { setTimeout(() => finishAdminAction(restore), 250); }
            });
        }

        function extractListingFromResponse(response) {
            if (!response) return {};
            return response.listing || response.data?.listing || response.data || response;
        }

        function setListingFormDisabled(formId, isDisabled) {
            const form = document.getElementById(formId);
            if (!form) return;
            form.classList.toggle('listing-form-disabled', isDisabled);
            form.setAttribute('aria-busy', isDisabled ? 'true' : 'false');
            form.querySelectorAll('input, select, textarea, button').forEach((control) => {
                control.disabled = isDisabled;
            });
        }

        function hideListingSubmissionOverlay() {
            document.getElementById('listing-submission-overlay')?.remove();
            syncModalOpenState();
        }

        function showListingSubmissionOverlay() {
            hideListingSubmissionOverlay();
            document.body.insertAdjacentHTML('beforeend', `<div id="listing-submission-overlay" role="alertdialog" aria-modal="true" aria-live="assertive" aria-labelledby="listing-submission-title">
                <div class="listing-modal-backdrop" aria-hidden="true"></div>
                <div class="listing-submission-overlay">
                <div class="listing-submission-card">
                    <div class="listing-submission-spinner" aria-hidden="true"></div>
                    <h3 id="listing-submission-title" class="text-xl font-black">Elan yerləşdirilir...</h3>
                    <p class="mt-2 text-sm font-semibold text-slate-600">Zəhmət olmasa gözləyin.</p>
                </div>
                </div>
            </div>`);
            setModalOpenState(true);
        }

        function showListingResultModal({ type = 'success', message = '', createdListing = null } = {}) {
            closeListingResultModal();
            const isSuccess = type === 'success';
            const createdListingKey = createdListing ? String(createdListing.listingCode || createdListing.listing_code || createdListing.code || createdListing.id || '') : '';
            const title = isSuccess ? 'Elanınız qəbul edildi' : 'Elan göndərilmədi';
            const icon = isSuccess ? '✅' : '❌';
            const body = message || (isSuccess ? 'Elan moderator təsdiqindən sonra saytda görünəcək.' : 'Zəhmət olmasa məlumatları yoxlayıb yenidən cəhd edin.');
            const viewButton = isSuccess && createdListingKey
                ? `<button type="button" onclick="closeListingResultModal(); navigateToListingPreview('${escapeHtml(createdListingKey)}')" class="rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-900 px-5 py-3 font-black transition">📄 Elana bax</button>`
                : '';
            document.body.insertAdjacentHTML('beforeend', `<div id="listing-result-modal" role="alertdialog" aria-modal="true" aria-labelledby="listing-result-title">
                <div class="listing-modal-backdrop" aria-hidden="true"></div>
                <div class="listing-modal-shell">
                    <div class="listing-modal-card">
                        <div class="text-5xl mb-4">${icon}</div>
                        <h3 id="listing-result-title" class="text-2xl font-black text-slate-950">${escapeHtml(title)}</h3>
                        <p class="mt-3 text-sm font-semibold text-slate-600">${escapeHtml(body)}</p>
                        <div class="mt-6 flex flex-col sm:flex-row justify-center gap-3">
                            ${isSuccess ? `<button type="button" onclick="closeListingResultModal(); navigateToMyListings()" class="rounded-2xl bg-brand-600 hover:bg-brand-700 text-white px-5 py-3 font-black transition">Mənim elanlarım</button>${viewButton}` : `<button type="button" onclick="closeListingResultModal()" class="rounded-2xl bg-brand-600 hover:bg-brand-700 text-white px-5 py-3 font-black transition">Bağla</button>`}
                        </div>
                    </div>
                </div>
            </div>`);
            setModalOpenState(true);
        }

        function setRegisterButtonLoading(isLoading) {
            setSubmitButtonLoading('register-submit-btn', isLoading, 'Hesab yaradılır…', '📧 Qeydiyyat');
        }

        function setListingSaveButtonLoading(isLoading) {
            setSubmitButtonLoading('listing-save-submit-btn', isLoading, 'Elan saxlanılır…', 'Yadda Saxla');
        }
        function setProjectSaveButtonLoading(isLoading) { setSubmitButtonLoading('project-save-submit-btn', isLoading, 'Layihə saxlanılır…', '<i class="fa-solid fa-floppy-disk mr-2"></i>Layihəni Yadda Saxla'); }
        function setHeroSaveButtonLoading(isLoading) { setSubmitButtonLoading('hero-form-submit', isLoading, 'Hero saxlanılır…', 'Yadda Saxla'); }
        function setGallerySaveButtonLoading(isLoading) { setSubmitButtonLoading('gallery-save-submit-btn', isLoading, 'Qalereya saxlanılır…', 'Saxla'); }
        function setVacancySaveButtonLoading(isLoading) { setSubmitButtonLoading('vacancy-save-submit-btn', isLoading, 'Vakansiya saxlanılır…', 'Yadda Saxla'); }
        function setAdSaveButtonLoading(isLoading) { setSubmitButtonLoading('ad-save-submit-btn', isLoading, 'Yadda saxlanılır…', 'Yadda Saxla'); }
        function setUserCreateButtonLoading(isLoading) { setSubmitButtonLoading('user-create-submit-btn', isLoading, 'İstifadəçi yaradılır…', 'Yarat'); }
        function setUserEditButtonLoading(isLoading) { setSubmitButtonLoading('user-edit-submit-btn', isLoading, 'İstifadəçi saxlanılır…', 'Yadda saxla'); }
        function setUserActionStatusLoading(isLoading, text = 'İstifadəçi əməliyyatı icra olunur…') {
            const status = document.getElementById('admin-user-action-status');
            if (!status) return;
            status.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i>${text}`;
            status.classList.toggle('hidden', !isLoading);
        }

        function getLoginSubmitButton() {
            return document.getElementById('login-submit-btn');
        }

        function setLoginButtonLoading(isLoading) {
            const button = getLoginSubmitButton();
            if (!button) return;

            button.disabled = isLoading;
            button.classList.toggle('is-loading', isLoading);
            button.setAttribute('aria-busy', isLoading ? 'true' : 'false');
            button.innerHTML = isLoading
                ? '<span class="login-spinner" aria-hidden="true"></span><span>Məlumatlar yoxlanılır…</span>'
                : '📧 Email ilə daxil ol';
        }

        function setLoginButtonSuccess() {
            const button = getLoginSubmitButton();
            if (!button) return;

            button.disabled = true;
            button.classList.remove('is-loading');
            button.setAttribute('aria-busy', 'false');
            button.innerHTML = '<span aria-hidden="true">✓</span><span>Xoş gəlmisiniz</span>';
        }

        const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        async function handleGeneralLogin(e) {
            e.preventDefault();
            if (isLoginSubmitting) return;

            isLoginSubmitting = true;
            setLoginButtonLoading(true);

            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-pass').value;
            const error = document.getElementById('login-error');

            try {
                const result = await apiRequest('/api/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password: pass })
                });
                error.classList.add('hidden');
                setAuthSession(result.token, result.user);
                activeUser = { role: normalizeAuthRole(result.user.role), name: result.user.fullname || result.user.email, fullname: result.user.fullname || '', id: result.user.id, email: result.user.email, phone: result.user.phone || '', avatarUrl: result.user.avatarUrl || result.user.avatar_url || '', bio: result.user.bio || '' };
                updateHeaderUI();
                setLoginButtonSuccess();
                homepageHydration.admin = false;
                const pendingRoute = consumePendingAuthRoute();
                const targetPath = isAdminHost()
                    ? (isAdminRole(activeUser.role) ? (pendingRoute && pendingRoute.startsWith('/admin') ? pendingRoute : '/admin') : '/')
                    : (pendingRoute || (isAdminRole(activeUser.role) ? '/admin' : '/profil'));
                history.replaceState({ path: targetPath }, '', targetPath);
                const routePromise = routeToCurrentPath();
                scheduleIdleTask(() => hydrateFromDatabase().catch(error => console.warn('Login sonrası məlumat yüklənməsi tamamlanmadı:', error.message)), 250);
                if (isAdminRole(activeUser.role)) {
                    appData.dashboardStatsLoading = true;
                    renderDashboardCards();
                    refreshAdminStats({ render: true }).catch(() => {});
                    loadAdminListings({ render: false }).catch(() => {});
                    loadAdminBackground().catch(() => {});
                }
                try {
                    await routePromise;
                } catch (routeError) {
                    console.warn('Login yönləndirməsi alınmadı:', routeError.message);
                    setLoginButtonLoading(false);
                }
                isLoginSubmitting = false;
                return;
            } catch (apiError) {
                console.warn('API login alınmadı:', apiError.message);
                clearAuthSession();
                activeUser = null;
                error.textContent = apiError.message || 'E-poçt və ya şifrə yanlışdır!';
                error.className = 'bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs';
                const resendBtn = document.getElementById('resend-verification-btn');
                if (resendBtn) resendBtn.classList.toggle('hidden', !/təsdiqləməlisiniz|verify/i.test(error.textContent));
                setLoginButtonLoading(false);
                isLoginSubmitting = false;
            }
        }

        // SUBTABS WITHIN THE DASHBOARD
        const ADMIN_SUBTAB_ROUTES = {
            'seabreeze-manager': '/admin/listings',
            'projects-manager': '/admin/projects',
            'projects-archive': '/admin/projects/archive',
            'project-inquiries': '/admin/project-inquiries',
            'gallery-manager': '/admin/gallery',
            'ads-manager': '/admin/ads',
            'site-music': '/admin/site-music',
            'vacancy-manager': '/admin/vacancies',
            'site-settings': '/admin/site-settings',
            'seabreeze-hero': '/admin/seabreeze-hero',
            'seabreeze-info-admin': '/admin/seabreeze-info',
            'hero-sections': '/admin/project-hero',
            'listing-hero': '/admin/listing-hero',
            'google-email': '/admin/google-email',
            'broadcast-notifications': '/admin/notifications/broadcast',
            'user-profile': '/profil/melumatlar'
        };

        function normalizeAdminSubtab(subtab) {
            const key = String(subtab || '').trim().toLowerCase();
            const subtabAliases = { ads: 'ads-manager', reklam: 'ads-manager', advertisement: 'ads-manager', advertisements: 'ads-manager', music: 'site-music', musiqi: 'site-music', 'site-music': 'site-music', gallery: 'gallery-manager', 'media-gallery': 'gallery-manager', qalereya: 'gallery-manager', 'media-qalereya': 'gallery-manager' };
            return subtabAliases[key] || subtab;
        }

        function adminSubtabPanels() {
            return Array.from(document.querySelectorAll('.admin-subtab-panel, [id^="admin-subtab-"]'))
                .filter(panel => panel.id !== 'admin-subtabs-container');
        }

        function hideAdminSubtabPanels() {
            adminSubtabPanels().forEach((panel) => {
                panel.classList.add('hidden');
                panel.classList.remove('active', 'is-active', 'show', 'open');
                panel.setAttribute('aria-hidden', 'true');
                panel.hidden = true;
                panel.style.setProperty('display', 'none', 'important');
            });
        }

        function showAdminSubtab(tabName) {
            const subtab = normalizeAdminSubtab(tabName) || 'seabreeze-manager';
            const panel = document.getElementById(`admin-subtab-${subtab}`);
            hideAdminSubtabPanels();
            if (!panel) return '';
            panel.classList.add('admin-subtab-panel', 'active', 'is-active', 'show');
            panel.classList.remove('hidden');
            panel.removeAttribute('hidden');
            panel.hidden = false;
            panel.style.removeProperty('display');
            panel.setAttribute('aria-hidden', 'false');
            return subtab;
        }

        window.showAdminSubtab = showAdminSubtab;
        window.hideAdminSubtabPanels = hideAdminSubtabPanels;

        function switchAdminSubtab(subtab, options = {}) {
            subtab = normalizeAdminSubtab(subtab);
            const isAdmin = isAdminRole(activeUser?.role);
            currentAdminSubtab = subtab || currentAdminSubtab;
            const isRestrictedDashboardTab = ['projects-manager', 'projects-archive', 'project-inquiries', 'hero-sections', 'listing-hero', 'cvs', 'agents-manager', 'google-email', 'broadcast-notifications', 'vacancy-manager', 'gallery-manager', 'ads-manager', 'site-music', 'site-settings', 'seabreeze-hero', 'seabreeze-info-admin'].includes(subtab);
            if (activeUser && !isAdmin && isRestrictedDashboardTab) {
                subtab = 'seabreeze-manager';
                currentAdminSubtab = subtab;
            }

            const targetPanelId = `admin-subtab-${subtab}`;
            const targetPanel = document.getElementById(targetPanelId);
            if (!targetPanel) {
                subtab = 'seabreeze-manager';
                currentAdminSubtab = subtab;
            }

            renderDashboardSubtabButtons(subtab);
            toggleAdminSidebar(false);

            subtab = showAdminSubtab(subtab) || 'seabreeze-manager';
            currentAdminSubtab = subtab;
            document.querySelectorAll('#admin-subtabs-container .admin-subtab-button, [data-admin-tab]').forEach((button) => {
                const buttonSubtab = normalizeAdminSubtab(button.dataset.adminTab || button.getAttribute('data-tab') || button.id?.replace(/^subtab-btn-/, ''));
                const isActiveButton = buttonSubtab === subtab || (button.id === 'subtab-btn-sb' && subtab === 'seabreeze-manager');
                button.classList.toggle('is-active', isActiveButton);
                button.classList.toggle('active', isActiveButton);
                button.setAttribute('aria-selected', isActiveButton ? 'true' : 'false');
            });
            const subtabRoute = ADMIN_SUBTAB_ROUTES[subtab] || '/admin';
            if (!options.skipPush && (isAdmin || subtab === 'user-profile') && window.location.pathname !== subtabRoute) {
                history.pushState({ path: subtabRoute, adminSubtab: subtab }, '', subtabRoute);
                updateSeo({ title: 'Admin Panel', path: subtabRoute });
            }
            if (isAdmin && ['seabreeze-manager','projects-manager','project-inquiries','gallery-manager','ads-manager','site-music'].includes(subtab)) refreshAdminStats({ render: true });
            if (subtab === 'projects-manager') {
                renderAdminProjects();
                renderBulkProjectPreview();
                updateProjectImagePreview();
            }
            if (subtab === 'projects-archive') { loadArchivedProjects(); }
            if (subtab === 'project-inquiries') { loadProjectInquiries(); }
            if (subtab === 'seabreeze-manager') {
                toggleMetroFieldForCity();
                setTimeout(initAdminListingMap, 80);
                if (isAdmin) loadAdminListings({ force: true }).catch(() => {});
            }
            if (subtab === 'gallery-manager') {
                renderAdminDashboard();
                void loadGalleryPage(window.BestHomeGallery.getPagination().page || 1);
            }
            if (subtab === 'ads-manager') {
                setAdFormOpen(false);
                renderAdminDashboard();
                void loadAdminAds({ force: true });
            }
            if (subtab === 'site-settings') { fillSiteSettingsForm(); }
            if (subtab === 'user-profile') { fillProfileForm(); if (isAdmin) refreshAdminStats({ render: true }); }
            if (subtab === 'google-email') { loadGoogleEmailRecipientCount(); }
            if (subtab === 'hero-sections') {
                loadAdminHeroSlides();
                resetHeroSlideForm();
            }
            if (subtab === 'listing-hero') {
                loadAdminListingHeroItems();
                resetListingHeroForm();
            }
            if (subtab === 'seabreeze-hero' || subtab === 'seabreeze-info-admin') {
                loadSeaBreezeAdmin();
            }
            if (subtab === 'agents-manager') startAdminUsersAutoRefresh(); else stopAdminUsersAutoRefresh();
        }

        function setSeaBreezeFormOpen(isOpen, { focusTitle = false } = {}) {
            const form = document.getElementById('admin-listing-form');
            const toggle = document.getElementById('sb-form-toggle');
            const icon = document.getElementById('sb-form-toggle-icon');
            if (!form) return;
            form.classList.toggle('hidden', !isOpen);
            toggle?.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            icon?.classList.toggle('fa-chevron-down', !isOpen);
            icon?.classList.toggle('fa-chevron-up', isOpen);
            if (isOpen) setTimeout(() => initAdminListingMap(), 80);
            if (focusTitle) toggle?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        function toggleSeaBreezeForm() {
            const form = document.getElementById('admin-listing-form');
            setSeaBreezeFormOpen(form?.classList.contains('hidden'));
        }

        function toggleCreditFields() {
            const enabled = document.getElementById('sb-is-credit')?.checked;
            document.getElementById('sb-credit-fields')?.classList.toggle('hidden', !enabled);
        }

        // DYNAMIC CALC 1m²
        function calculateSqPrice() {
            const area = parseFloat(document.getElementById('sb-area').value);
            const price = parseFloat(document.getElementById('sb-price').value);
            const isSale = isSaleListing(document.getElementById('sb-listing-type').value);
            const calcBox = document.getElementById('calc-result-box');

            if (!isSale) {
                calcBox.classList.add('hidden');
                return;
            }
            calcBox.classList.remove('hidden');

            if (area > 0 && price > 0) {
                const sq = Math.round(price / area);
                document.getElementById('sb-calc-val').textContent = formatPrice(sq, document.getElementById('sb-currency')?.value || 'AZN');
            } else {
                document.getElementById('sb-calc-val').textContent = '0';
            }
        }

        // TOGGLE EXTRA FORM FIELDS FOR VILLAS, TOWNHOUSES & LAND SALE
        function toggleFormFieldsBasedOnCategory() {
            const cat = document.getElementById('sb-form-category').value;
            const landBlock = document.getElementById('torpaq-sahəsi-block');
            const landInput = document.getElementById('sb-land');
            const shouldShowLand = cat === 'Villa' || cat === 'Townhouse' || cat === 'LandSale';
            
            if (shouldShowLand) {
                landBlock.classList.remove('hidden');
                landInput.required = cat === 'LandSale';
            } else {
                landBlock.classList.add('hidden');
                landInput.required = false;
                landInput.value = '';
            }
            calculateSqPrice();
        }

        // FILE BASE64 PREVIEWS
        function convertImageToBase64(input, outputId) {
            const file = input.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById(outputId).value = e.target.result;
                    document.getElementById('sb-file-name-badge').classList.remove('hidden');
                    document.getElementById('sb-file-name-text').textContent = file.name;
                };
                reader.readAsDataURL(file);
            }
        }

        function clearSelectedFile(fileInputId, hiddenInputId, badgeId) {
            document.getElementById(fileInputId).value = '';
            document.getElementById(hiddenInputId).value = '';
            document.getElementById(badgeId).classList.add('hidden');
        }



        const LISTING_IMAGE_MAX_WIDTH = 1920;
        const LISTING_IMAGE_QUALITY = 0.78;
        const LISTING_IMAGE_MIME = 'image/webp';

        function setListingUploadProgress(targetId, percent, label = '') {
            const root = document.getElementById(targetId);
            if (!root) return;
            root.classList.remove('hidden');
            const bar = root.querySelector('.listing-upload-progress__bar');
            const text = root.querySelector('.listing-upload-progress__text');
            const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
            if (bar) bar.style.width = `${safePercent}%`;
            if (text) text.textContent = label || `${Math.round(safePercent)}%`;
        }

        function resetListingUploadProgress(targetId) {
            const root = document.getElementById(targetId);
            if (!root) return;
            root.classList.add('hidden');
            const bar = root.querySelector('.listing-upload-progress__bar');
            if (bar) bar.style.width = '0%';
        }

        async function compressListingImage(file) {
            if (!file?.type?.startsWith('image/')) return file;
            if (file.type === LISTING_IMAGE_MIME && file.size <= 1024 * 1024) return file;
            const bitmap = await createImageBitmap(file);
            const scale = Math.min(1, LISTING_IMAGE_MAX_WIDTH / Math.max(bitmap.width, bitmap.height));
            const width = Math.max(1, Math.round(bitmap.width * scale));
            const height = Math.max(1, Math.round(bitmap.height * scale));
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d', { alpha: false });
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(bitmap, 0, 0, width, height);
            bitmap.close?.();
            const blob = await new Promise((resolve) => canvas.toBlob(resolve, LISTING_IMAGE_MIME, LISTING_IMAGE_QUALITY));
            if (!blob) return file;
            const baseName = String(file.name || 'listing-image').replace(/\.[^.]+$/, '');
            return new File([blob], `${baseName}.webp`, { type: LISTING_IMAGE_MIME, lastModified: Date.now() });
        }

        async function compressListingImages(files, progressId) {
            const imageFiles = Array.from(files || []).filter(file => file.type && file.type.startsWith('image/'));
            if (!imageFiles.length) return [];
            let completed = 0;
            const compressed = await Promise.all(imageFiles.map(async (file, index) => {
                setListingUploadProgress(progressId, (completed / imageFiles.length) * 100, `Şəkil sıxılır ${index + 1}/${imageFiles.length}…`);
                const output = await compressListingImage(file);
                completed += 1;
                setListingUploadProgress(progressId, (completed / imageFiles.length) * 100, `Şəkil sıxılır ${completed}/${imageFiles.length}…`);
                return output;
            }));
            setListingUploadProgress(progressId, 100, 'Sıxılma tamamlandı');
            return compressed;
        }

        function uploadFormDataWithProgress(url, formData, progressId, method = 'POST') {
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open(method, url.startsWith('http') ? url : `${API_BASE}${url}`);
                const token = getAuthToken();
                if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                xhr.upload.onprogress = (event) => {
                    if (!event.lengthComputable) return;
                    setListingUploadProgress(progressId, Math.round((event.loaded / event.total) * 100), `Yüklənir ${Math.round((event.loaded / event.total) * 100)}%`);
                };
                xhr.onload = () => {
                    let body = null;
                    try { body = xhr.responseText ? JSON.parse(xhr.responseText) : null; } catch (_error) { body = null; }
                    const message = body?.message || body?.error || (xhr.responseText && xhr.responseText.slice(0, 240)) || 'API sorğusu uğursuz oldu';
                    if (xhr.status === 401) {
                        if (getAuthToken()) redirectToLoginOnAuthFailure();
                        const error = new Error(body?.message || 'Sessiya bitib. Zəhmət olmasa yenidən daxil olun.');
                        error.status = 401;
                        reject(error);
                    } else if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(xhr.status === 204 ? null : body);
                    } else {
                        const error = new Error(message);
                        error.status = xhr.status;
                        reject(error);
                    }
                };
                xhr.onerror = () => reject(new Error('Şəbəkə xətası baş verdi'));
                xhr.ontimeout = () => reject(new Error('Şəkil yükləmə sorğusunun vaxtı bitdi. Zəhmət olmasa yenidən cəhd edin.'));
                xhr.timeout = 120000;
                xhr.send(formData);
            });
        }

        function reorderArrayItem(items, fromIndex, toIndex) {
            if (!Array.isArray(items) || fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) return;
            const [item] = items.splice(fromIndex, 1);
            items.splice(toIndex, 0, item);
        }

        let listingSortDragIndex = null;
        function handleListingSortDragStart(event, index) {
            listingSortDragIndex = index;
            event.currentTarget.classList.add('is-dragging');
            event.dataTransfer?.setData('text/plain', String(index));
            if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
        }
        function handleListingSortDragOver(event, index) {
            event.preventDefault();
            event.currentTarget.classList.add('is-drag-over');
            if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
        }
        function handleListingSortDragLeave(event) { event.currentTarget.classList.remove('is-drag-over'); }
        function handleListingSortDrop(event, index, scope = 'admin') {
            event.preventDefault();
            event.currentTarget.classList.remove('is-drag-over');
            const from = Number(event.dataTransfer?.getData('text/plain') || listingSortDragIndex);
            if (scope === 'public') movePublicListingPhoto(from, index);
            else moveListingPhotoToIndex(from, index);
        }
        function handleListingSortDragEnd(event) {
            event.currentTarget.classList.remove('is-dragging');
            document.querySelectorAll('.listing-sortable-thumb.is-drag-over').forEach(el => el.classList.remove('is-drag-over'));
            listingSortDragIndex = null;
        }

        let listingPointerSort = null;
        function handleListingSortPointerDown(event, index, scope = 'admin') {
            if (event.target.closest('button')) return;
            event.preventDefault();
            listingPointerSort = { index, scope, pointerId: event.pointerId, sourceEl: event.currentTarget };
            event.currentTarget.setPointerCapture?.(event.pointerId);
            event.currentTarget.classList.add('is-dragging');
        }
        function handleListingSortPointerMove(event) {
            if (!listingPointerSort) return;
            const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(`.listing-sortable-thumb[data-sort-scope="${listingPointerSort.scope}"]`);
            document.querySelectorAll('.listing-sortable-thumb.is-drag-over').forEach(el => el.classList.remove('is-drag-over'));
            target?.classList.add('is-drag-over');
        }
        function handleListingSortPointerUp(event) {
            if (!listingPointerSort) return;
            const { index, scope, pointerId, sourceEl } = listingPointerSort;
            sourceEl?.releasePointerCapture?.(pointerId);
            const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(`.listing-sortable-thumb[data-sort-scope="${scope}"]`);
            const toIndex = Number(target?.dataset.index);
            document.querySelectorAll('.listing-sortable-thumb.is-dragging,.listing-sortable-thumb.is-drag-over').forEach(el => el.classList.remove('is-dragging', 'is-drag-over'));
            listingPointerSort = null;
            if (!Number.isInteger(toIndex) || toIndex === index) return;
            if (scope === 'public') movePublicListingPhoto(index, toIndex);
            else moveListingPhotoToIndex(index, toIndex);
        }

        async function handleListingImageSelection(fileList) {
            const files = await compressListingImages(fileList, 'sb-upload-progress');
            files.forEach(file => {
                uploadedListingImageFiles.push(file);
                uploadedListingImages.push(URL.createObjectURL(file));
            });
            const input = document.getElementById('sb-img-file');
            if (input) input.value = '';
            renderListingImagesPreview();
        }

        function renderListingImagesPreview() {
            const container = document.getElementById('sb-images-preview');
            const count = document.getElementById('sb-images-count');
            if (!container || !count) return;
            count.textContent = `${uploadedListingImages.length} şəkil seçildi`;
            document.getElementById('sb-file-name-badge')?.classList.toggle('hidden', uploadedListingImages.length === 0);
            const firstName = uploadedListingImageFiles[0]?.name || (uploadedListingImages[0] ? 'Yaddaşdakı şəkillər' : '');
            const fileNameText = document.getElementById('sb-file-name-text');
            if (fileNameText && firstName) fileNameText.textContent = firstName;
            container.innerHTML = uploadedListingImages.map((img, idx) => `
                <div class="listing-sortable-thumb relative aspect-square rounded-xl overflow-hidden border border-white/10 group bg-white/5" data-index="${idx}" data-sort-scope="admin" draggable="false" onpointerdown="handleListingSortPointerDown(event, ${idx}, 'admin')" onpointermove="handleListingSortPointerMove(event)" onpointerup="handleListingSortPointerUp(event)" onpointercancel="handleListingSortPointerUp(event)">
                    <img src="${img}" loading="lazy" decoding="async" class="w-full h-full object-cover" alt="Elan şəkli ${idx + 1}">
                    ${idx === 0 ? '<span class="absolute left-1 top-1 bg-brand-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">Cover</span>' : '<span class="absolute left-1 top-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">↕ Sırala</span>'}
                    <button type="button" onclick="deleteListingPhotoTemp(${idx})" class="absolute top-1 right-1 bg-red-600/80 hover:bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] z-10"><i class="fa-solid fa-xmark"></i></button>
                    <div class="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 flex justify-around text-[10px] text-white opacity-100 sm:opacity-0 group-hover:opacity-100 transition">
                        <button type="button" onclick="moveListingPhotoTemp(${idx}, -1)" aria-label="Sola çək"><i class="fa-solid fa-arrow-left"></i></button>
                        <button type="button" onclick="moveListingPhotoTemp(${idx}, 1)" aria-label="Sağa çək"><i class="fa-solid fa-arrow-right"></i></button>
                    </div>
                </div>
            `).join('');
        }

        function deleteListingPhotoTemp(index) {
            uploadedListingImages.splice(index, 1);
            uploadedListingImageFiles.splice(index, 1);
            renderListingImagesPreview();
        }

        function moveListingPhotoTemp(index, direction) {
            const newIndex = index + direction;
            if (newIndex < 0 || newIndex >= uploadedListingImages.length) return;
            [uploadedListingImages[index], uploadedListingImages[newIndex]] = [uploadedListingImages[newIndex], uploadedListingImages[index]];
            [uploadedListingImageFiles[index], uploadedListingImageFiles[newIndex]] = [uploadedListingImageFiles[newIndex], uploadedListingImageFiles[index]];
            renderListingImagesPreview();
        }

        function moveListingPhotoToIndex(fromIndex, toIndex) {
            reorderArrayItem(uploadedListingImages, fromIndex, toIndex);
            reorderArrayItem(uploadedListingImageFiles, fromIndex, toIndex);
            renderListingImagesPreview();
        }

        function clearListingImages() {
            uploadedListingImages = [];
            uploadedListingImageFiles = [];
            const input = document.getElementById('sb-img-file');
            if (input) input.value = '';
            document.getElementById('sb-img-preview-val').value = '';
            renderListingImagesPreview();
        }

        function handleListingImagesDragOver(event) {
            event.preventDefault();
            event.currentTarget.classList.add('border-brand-500', 'bg-brand-500/10');
        }

        function handleListingImagesDragLeave(event) {
            event.currentTarget.classList.remove('border-brand-500', 'bg-brand-500/10');
        }

        function handleListingImagesDrop(event) {
            event.preventDefault();
            event.currentTarget.classList.remove('border-brand-500', 'bg-brand-500/10');
            handleListingImageSelection(event.dataTransfer?.files);
        }

        // CONVERT & REORDER IMAGES IN GALLERY
        function convertMultipleImagesToBase64(input) {
            const files = Array.from(input.files);
            document.getElementById('g-images-count').textContent = `${files.length + uploadedEventImages.length} şəkil seçildi`;
            files.forEach(file => {
                uploadedEventImageFiles.push(file);
                uploadedEventImages.push(URL.createObjectURL(file));
                renderGalleryMultiPreview();
            });
            input.value = '';
        }

        function renderGalleryMultiPreview() {
            const container = document.getElementById('gallery-multi-preview');
            container.innerHTML = '';
            uploadedEventImages.forEach((img, idx) => {
                container.innerHTML += `
                    <div class="relative w-20 h-20 rounded-xl overflow-hidden border border-white/10 group">
                        <img src="${img}" class="w-full h-full object-cover">
                        <!-- X Close button for deleting this specific photo -->
                        <button type="button" onclick="deleteGalleryPhotoFromTemp(${idx})" class="absolute top-1 right-1 bg-red-600/80 hover:bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] z-10">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                        <!-- Left/Right controls for sorting order -->
                        <div class="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 flex justify-around text-[10px] text-white opacity-0 group-hover:opacity-100 transition">
                            <button type="button" onclick="moveGalleryPhotoTemp(${idx}, -1)"><i class="fa-solid fa-arrow-left"></i></button>
                            <button type="button" onclick="moveGalleryPhotoTemp(${idx}, 1)"><i class="fa-solid fa-arrow-right"></i></button>
                        </div>
                    </div>
                `;
            });
        }

        function deleteGalleryPhotoFromTemp(index) {
            uploadedEventImages.splice(index, 1);
            uploadedEventImageFiles.splice(index, 1);
            document.getElementById('g-images-count').textContent = `${uploadedEventImages.length} şəkil seçildi`;
            renderGalleryMultiPreview();
        }

        function moveGalleryPhotoTemp(index, direction) {
            const newIndex = index + direction;
            if (newIndex >= 0 && newIndex < uploadedEventImages.length) {
                const temp = uploadedEventImages[index];
                uploadedEventImages[index] = uploadedEventImages[newIndex];
                uploadedEventImages[newIndex] = temp;
                const tempFile = uploadedEventImageFiles[index];
                uploadedEventImageFiles[index] = uploadedEventImageFiles[newIndex];
                uploadedEventImageFiles[newIndex] = tempFile;
                renderGalleryMultiPreview();
            }
        }

        function updateProjectImagePreview() {
            const imageUrl = (collectProjectImageInputs()[0] || document.getElementById('project-img')?.value) || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80';
            const desktop = document.getElementById('project-preview-source-desktop');
            const tablet = document.getElementById('project-preview-source-tablet');
            const img = document.getElementById('project-preview-img');
            if (desktop) desktop.srcset = imageUrl;
            if (tablet) tablet.srcset = imageUrl;
            if (img) img.src = imageUrl;
        }

        function setOfficialProjectFormExpanded(expanded, options = {}) {
            isOfficialProjectFormExpanded = Boolean(expanded);
            const card = document.getElementById('official-project-form-card');
            const content = document.getElementById('official-project-form-collapse');
            const toggleBtn = document.getElementById('project-form-toggle-btn');
            if (card) card.classList.toggle('is-expanded', isOfficialProjectFormExpanded);
            if (content) {
                content.setAttribute('aria-hidden', isOfficialProjectFormExpanded ? 'false' : 'true');
                if (isOfficialProjectFormExpanded) {
                    content.removeAttribute('inert');
                } else {
                    content.setAttribute('inert', '');
                }
            }
            if (toggleBtn) {
                toggleBtn.setAttribute('aria-expanded', isOfficialProjectFormExpanded ? 'true' : 'false');
                toggleBtn.textContent = isOfficialProjectFormExpanded ? 'Formu bağla' : 'Formu aç';
            }
            if (options.hideSuccess !== false) {
                document.getElementById('project-save-success')?.classList.add('hidden');
            }
        }

        function toggleOfficialProjectForm() {
            setOfficialProjectFormExpanded(!isOfficialProjectFormExpanded);
        }

        function collapseOfficialProjectForm() {
            setOfficialProjectFormExpanded(false);
        }

        function showProjectSaveSuccess(message = 'Layihə uğurla saxlanıldı.') {
            const success = document.getElementById('project-save-success');
            if (!success) return;
            success.textContent = message;
            success.classList.remove('hidden');
        }

        function resetOfficialProjectForm() {
            document.getElementById('edit-project-id').value = '';
            document.getElementById('project-slug').value = '';
            document.getElementById('project-form-action-title').textContent = 'Yeni Layihə Əlavə Et';
            document.getElementById('official-project-form')?.reset();
            document.getElementById('project-map-verified') && (document.getElementById('project-map-verified').value = 'false');
            updateProjectMapStatus();
            if (projectLocationMarker) { projectLocationMarker.remove(); projectLocationMarker = null; }
            document.getElementById('project-featured-hero').checked = false;
            document.getElementById('project-hero-badge')?.classList.add('hidden');
            document.getElementById('project-save-success')?.classList.add('hidden');
            renderProjectImageInputs(['']);
            setProjectPdfStatus(null);
            updateProjectImagePreview();
        }

        function normalizeAdminSearchValue(value) {
            return String(value || '').trim().toLocaleLowerCase('az-AZ');
        }

        function projectMatchesAdminSearch(project) {
            const query = normalizeAdminSearchValue(adminProjectSearchQuery);
            if (!query) return true;
            return [project?.title, project?.name].some(value => normalizeAdminSearchValue(value).includes(query));
        }

        function setAdminProjectSearch(value) {
            adminProjectSearchQuery = String(value || '');
            ['admin-project-search', 'admin-archived-project-search'].forEach(id => {
                const input = document.getElementById(id);
                if (input && input.value !== adminProjectSearchQuery) input.value = adminProjectSearchQuery;
            });
            renderAdminProjects();
            renderArchivedProjects();
        }

        function setProjectOrderDirty(isDirty) {
            projectOrderDirty = Boolean(isDirty);
            const saveBtn = document.getElementById('save-project-order-btn');
            const status = document.getElementById('admin-project-order-status');
            if (saveBtn) saveBtn.classList.toggle('hidden', !projectOrderDirty);
            if (status) status.classList.toggle('hidden', !projectOrderDirty);
        }

        function getAdminProjectOrderFromDom() {
            return Array.from(document.querySelectorAll('#admin-projects-grid .admin-project-card'))
                .map(card => String(card.dataset.projectId || ''))
                .filter(Boolean);
        }

        function applyAdminProjectDomOrder() {
            const ids = getAdminProjectOrderFromDom();
            if (!ids.length) return;
            const byId = new Map(getOfficialProjects().map(project => [String(project.id), project]));
            const ordered = ids.map((id, index) => ({ ...byId.get(id), displayOrder: index + 1 })).filter(Boolean);
            saveOfficialProjects(ordered);
            renderOfficialProjectOptions();
            renderOfficialProjects();
        }

        function clearProjectDropTargets() {
            document.querySelectorAll('#admin-projects-grid .is-drop-target').forEach(card => card.classList.remove('is-drop-target'));
        }

        function startProjectDrag(event, projectId) {
            if (!activeUser || !isAdminRole(activeUser.role) || adminProjectSearchQuery.trim()) return;
            const card = event.target.closest('.admin-project-card');
            const grid = document.getElementById('admin-projects-grid');
            if (!card || !grid) return;
            event.preventDefault();
            draggedProjectId = String(projectId);
            card.classList.add('is-dragging');
            card.setPointerCapture?.(event.pointerId);

            const onPointerMove = (moveEvent) => {
                const target = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)?.closest?.('.admin-project-card');
                if (!target || target === card || !grid.contains(target)) return;
                clearProjectDropTargets();
                target.classList.add('is-drop-target');
                const rect = target.getBoundingClientRect();
                const insertAfter = moveEvent.clientY > rect.top + rect.height / 2;
                grid.insertBefore(card, insertAfter ? target.nextSibling : target);
            };

            const onPointerUp = () => {
                card.classList.remove('is-dragging');
                clearProjectDropTargets();
                window.removeEventListener('pointermove', onPointerMove);
                window.removeEventListener('pointerup', onPointerUp);
                window.removeEventListener('pointercancel', onPointerUp);
                draggedProjectId = null;
                applyAdminProjectDomOrder();
                setProjectOrderDirty(true);
            };

            window.addEventListener('pointermove', onPointerMove, { passive: true });
            window.addEventListener('pointerup', onPointerUp, { once: true });
            window.addEventListener('pointercancel', onPointerUp, { once: true });
        }


        function getAdminGalleryOrderFromDom() {
            return Array.from(document.querySelectorAll('#admin-gallery-list .admin-media-card'))
                .map(card => String(card.dataset.galleryId || ''))
                .filter(Boolean);
        }

        function clearGalleryDropTargets() {
            document.querySelectorAll('#admin-gallery-list .is-drop-target').forEach(card => card.classList.remove('is-drop-target'));
        }

        async function persistGalleryOrderFromDom() {
            const ids = getAdminGalleryOrderFromDom();
            if (!ids.length) return;
            const byId = new Map(appData.gallery.map(item => [String(item.id), item]));
            const ordered = ids.map((id, index) => ({ ...byId.get(id), sortOrder: index + 1 })).filter(Boolean);
            const remaining = appData.gallery.filter(item => !ids.includes(String(item.id))).map((item, offset) => ({ ...item, sortOrder: ordered.length + offset + 1 }));
            cacheData('gallery', [...ordered, ...remaining]);
            renderPortfolio();
            try {
                const response = await apiRequest('/api/gallery/reorder', { method: 'PUT', body: JSON.stringify({ order: ordered.map((item, index) => ({ id: Number(item.id), sortOrder: index + 1 })) }) });
                const rows = Array.isArray(response?.items) ? response.items : [];
                if (rows.length) cacheData('gallery', rows.map(dbGalleryToUi).sort((a, b) => (Number(a.sortOrder || 0) - Number(b.sortOrder || 0)) || new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
                await refreshAdminStats({ render: true }).catch(() => {});
                renderAdminDashboard();
                renderPortfolio();
            } catch (error) {
                alert('Media sırası yadda saxlanılmadı: ' + error.message);
                renderAdminDashboard();
            }
        }

        function startGalleryDrag(event, galleryId) {
            if (!activeUser || !isAdminRole(activeUser.role)) return;
            const card = event.target.closest('.admin-media-card');
            const list = document.getElementById('admin-gallery-list');
            if (!card || !list) return;
            event.preventDefault();
            card.classList.add('is-dragging');
            card.setPointerCapture?.(event.pointerId);

            const onPointerMove = (moveEvent) => {
                const target = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)?.closest?.('.admin-media-card');
                if (!target || target === card || !list.contains(target)) return;
                clearGalleryDropTargets();
                target.classList.add('is-drop-target');
                const rect = target.getBoundingClientRect();
                const insertAfter = moveEvent.clientY > rect.top + rect.height / 2;
                list.insertBefore(card, insertAfter ? target.nextSibling : target);
            };

            const onPointerUp = () => {
                card.classList.remove('is-dragging');
                clearGalleryDropTargets();
                window.removeEventListener('pointermove', onPointerMove);
                window.removeEventListener('pointerup', onPointerUp);
                window.removeEventListener('pointercancel', onPointerUp);
                persistGalleryOrderFromDom();
            };

            window.addEventListener('pointermove', onPointerMove, { passive: true });
            window.addEventListener('pointerup', onPointerUp, { once: true });
            window.addEventListener('pointercancel', onPointerUp, { once: true });
        }

        async function saveProjectOrder(button = null) {
            if (!activeUser || !isAdminRole(activeUser.role)) return;
            const projects = getOfficialProjects().map((project, index) => ({ ...project, displayOrder: index + 1 }));
            const order = projects
                .filter(project => Number.isInteger(Number(project.id)))
                .map((project, index) => ({ id: Number(project.id), displayOrder: index + 1 }));
            if (!order.length) {
                alert('Yadda saxlamaq üçün API-də mövcud layihə tapılmadı. Əvvəlcə layihələri backend-ə əlavə edin.');
                return;
            }

            const saveBtn = button || document.getElementById('save-project-order-btn');
            const restore = beginAdminAction(saveBtn, 'project-order-save', 'Yenilənir...');
            if (!restore) return;
            try {
                const response = await apiRequest('/api/projects/reorder', { method: 'PUT', body: JSON.stringify({ order }) });
                const rows = Array.isArray(response?.data) ? response.data : [];
                cacheData('projects', rows.length ? rows.map(dbProjectToUi) : projects);
                setProjectOrderDirty(false);
                renderOfficialProjectOptions();
                renderOfficialProjects();
                renderAdminProjects();
                await loadAdminProjects({ render: true }).catch(() => {});
                await refreshAdminStats({ render: true }).catch(() => {});
                showToast('✅ Layihə sırası yeniləndi.');
            } catch (error) {
                alert('Layihə sırası yadda saxlanılmadı: ' + error.message);
            } finally {
                finishAdminAction(restore);
            }
        }

        function renderAdminProjects() {
            const grid = document.getElementById('admin-projects-grid');
            if (!grid) return;
            const projects = getOfficialProjects().filter(projectMatchesAdminSearch);
            grid.innerHTML = '';
            setProjectOrderDirty(projectOrderDirty);

            if (projects.length === 0) {
                grid.innerHTML = `<div class="col-span-full py-10 text-center text-gray-500 glass-card rounded-2xl">${adminProjectSearchQuery.trim() ? 'Uyğun layihə tapılmadı.' : 'Layihə tapılmadı.'}</div>`;
                return;
            }

            projects.forEach((project, index) => {
                grid.innerHTML += `
                    <div class="admin-project-card glass-card rounded-2xl overflow-hidden border border-white/5 flex flex-col" data-project-id="${project.id}">
                        <div class="h-40 relative overflow-hidden">
                            ${getProjectPictureMarkup(project, 'w-full h-full object-cover transition duration-500')}
                            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                            <span class="absolute top-3 right-3 bg-brand-700 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">${project.year}</span>
                            <span class="absolute top-3 left-3 bg-black/50 text-white text-[10px] font-bold px-2.5 py-1 rounded-full"><i class="fa-solid fa-images mr-1"></i>${getProjectImages(project).length}</span>
                            <h3 class="absolute bottom-3 left-3 right-3 text-white font-extrabold text-sm line-clamp-1">${project.title}</h3>
                        </div>
                        <div class="p-4 space-y-3 flex-1 flex flex-col justify-between">
                            <div class="space-y-2">
                                <div class="flex items-center justify-between gap-2 text-[10px] text-gray-400">
                                    <span><i class="fa-solid fa-building mr-1 text-brand-500"></i>${project.floors}</span>
                                    <span><i class="fa-solid fa-expand mr-1 text-brand-500"></i>${project.area}</span>
                                </div>
                                <p class="text-[11px] text-gray-400 line-clamp-2">${project.desc}</p>
                                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] font-bold text-gray-300">
                                    <span class="rounded-lg bg-white/5 px-2 py-1">👁 Baxışlar: ${Number(project.viewCount || 0).toLocaleString('az-AZ')}</span>
                                    <span class="rounded-lg bg-white/5 px-2 py-1">🖱 Kliklər: ${Number(project.clickCount || 0).toLocaleString('az-AZ')}</span>
                                    <span class="rounded-lg bg-white/5 px-2 py-1">💬 Maraqlanmalar: ${Number(project.inquiryCount || 0).toLocaleString('az-AZ')}</span>
                                </div>
                                <div class="flex flex-wrap items-center gap-2">
                                    <span class="inline-flex w-fit items-center rounded-full bg-white/5 border border-white/10 px-2 py-1 text-[10px] text-gray-300">Slug: ${project.slug || '—'}</span>
                                    <span class="inline-flex w-fit items-center rounded-full ${project.featuredInHero ? 'bg-amber-500/15 text-amber-300 border-amber-500/20' : 'bg-white/5 text-gray-500 border-white/10'} border px-2 py-1 text-[10px] font-bold">Hero: ${project.featuredInHero ? '⭐ Bəli' : '— Xeyr'}</span>
                                    <span class="inline-flex w-fit items-center rounded-full ${project.pdfUrl ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' : 'bg-white/5 text-gray-500 border-white/10'} border px-2 py-1 text-[10px] font-bold">PDF: ${project.pdfUrl ? 'Var' : '—'}</span>
                                </div>
                            </div>
                            <div class="flex items-center justify-between gap-2 pt-3 border-t border-white/5">
                                <button type="button" class="admin-project-drag-handle bg-white/5 hover:bg-brand-500/20 text-gray-300 hover:text-white text-sm font-bold px-3 py-2 rounded-lg transition" onpointerdown="startProjectDrag(event, '${project.id}')" aria-label="Layihə sırasını dəyiş">
                                    ☰ <span class="text-[10px] ml-1">${index + 1}</span>
                                </button>
                                <div class="flex items-center justify-end gap-2">
                                    <button type="button" onclick="toggleProjectHero('${project.id}', ${!project.featuredInHero}, this)" class="${project.featuredInHero ? 'bg-amber-500/10 text-amber-300 hover:bg-amber-500' : 'bg-white/5 text-gray-300 hover:bg-amber-500'} hover:text-white text-[10px] font-bold px-3 py-2 rounded-lg transition">⭐ Hero</button>
                                    <button onclick="runInstantAdminAction(this, 'Yenilənir...', () => editOfficialProject('${project.id}'))" class="bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white text-[10px] font-bold px-3 py-2 rounded-lg transition"><i class="fa-solid fa-pen mr-1"></i>Edit</button>
                                    <button onclick="setProjectArchived('${project.id}', true, this)" class="bg-purple-500/10 hover:bg-purple-500 text-purple-300 hover:text-white text-[10px] font-bold px-3 py-2 rounded-lg transition"><i class="fa-solid fa-box-archive mr-1"></i>Arxiv</button>
                                    <button onclick="deleteOfficialProject('${project.id}', this)" class="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white text-[10px] font-bold px-3 py-2 rounded-lg transition"><i class="fa-solid fa-trash mr-1"></i>Delete</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
        }


        async function loadArchivedProjects() {
            if (!activeUser || !isAdminRole(activeUser.role)) return;
            const grid = document.getElementById('admin-archived-projects-grid');
            if (grid) grid.innerHTML = '<div class="col-span-full py-10 text-center text-gray-500 glass-card rounded-2xl">Arxiv yüklənir...</div>';
            try {
                const rows = await apiRequest('/api/projects/archived');
                appData.archivedProjects = (Array.isArray(rows) ? rows : []).map(dbProjectToUi);
                renderArchivedProjects();
            } catch (error) {
                if (grid) grid.innerHTML = `<div class="col-span-full py-10 text-center text-red-400 glass-card rounded-2xl">Arxiv yüklənmədi: ${escapeHtml(error.message)}</div>`;
            }
        }

        function renderArchivedProjects() {
            const grid = document.getElementById('admin-archived-projects-grid');
            if (!grid) return;
            const projects = (Array.isArray(appData.archivedProjects) ? appData.archivedProjects : []).filter(projectMatchesAdminSearch);
            if (!projects.length) {
                grid.innerHTML = `<div class="col-span-full py-10 text-center text-gray-500 glass-card rounded-2xl">${adminProjectSearchQuery.trim() ? 'Uyğun layihə tapılmadı.' : 'Arxivdə layihə yoxdur.'}</div>`;
                return;
            }
            grid.innerHTML = projects.map(project => `
                <div class="glass-card rounded-2xl overflow-hidden border border-white/5 flex flex-col">
                    <div class="h-40 relative overflow-hidden">
                        ${getProjectPictureMarkup(project, 'w-full h-full object-cover transition duration-500')}
                        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                        <span class="absolute top-3 right-3 bg-purple-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">Arxiv</span>
                        <h3 class="absolute bottom-3 left-3 right-3 text-white font-extrabold text-sm line-clamp-1">${escapeHtml(project.title)}</h3>
                    </div>
                    <div class="p-4 space-y-3">
                        <p class="text-[11px] text-gray-400 line-clamp-2">${escapeHtml(project.desc || '')}</p>
                        <button type="button" onclick="setProjectArchived('${project.id}', false, this)" class="w-full bg-emerald-500/10 hover:bg-emerald-500 text-emerald-300 hover:text-white text-xs font-bold px-3 py-2.5 rounded-xl transition"><i class="fa-solid fa-box-open mr-1"></i>Arxivdən çıxar</button>
                    </div>
                </div>
            `).join('');
        }

        async function setProjectArchived(id, isArchived, button = null) {
            if (!activeUser || !isAdminRole(activeUser.role)) return;
            const message = isArchived ? 'Bu layihə arxivə göndərilsin?' : 'Bu layihə arxivdən çıxarılsın?';
            if (!confirm(message)) return;
            const restore = beginAdminAction(button, `project-archive:${id}:${isArchived}`, 'Yenilənir...');
            if (!restore) return;
            try {
                const saved = dbProjectToUi(await apiRequest(`/api/projects/${id}/archive`, { method: 'PATCH', body: JSON.stringify({ isArchived }) }));
                if (isArchived) {
                    saveOfficialProjects(getOfficialProjects().filter(project => String(project.id) !== String(id)));
                    appData.archivedProjects = [saved, ...(appData.archivedProjects || []).filter(project => String(project.id) !== String(id))];
                } else {
                    appData.archivedProjects = (appData.archivedProjects || []).filter(project => String(project.id) !== String(id));
                    saveOfficialProjects([...getOfficialProjects(), saved]);
                }
                renderOfficialProjectOptions();
                renderOfficialProjects();
                renderAdminProjects();
                renderArchivedProjects();
                renderSeaBreezeHero(0);
                await loadAdminProjects({ render: true }).catch(() => {});
                showToast(isArchived ? '✅ Layihə arxivləndi.' : '✅ Layihə arxivdən çıxarıldı.');
            } catch (error) {
                alert(`Layihənin arxiv statusu dəyişmədi: ${error.message}`);
            } finally {
                finishAdminAction(restore);
            }
        }


        async function toggleProjectHero(id, featured, button = null) {
            if (!activeUser || !isAdminRole(activeUser.role)) return;
            const restore = beginAdminAction(button, `project-hero:${id}`, featured ? 'Əlavə edilir...' : 'Silinir...');
            if (!restore) return;
            try {
                const saved = await apiRequest(`/api/projects/${id}/hero`, { method: 'PATCH', body: JSON.stringify({ featured_in_hero: featured }) });
                const savedUi = dbProjectToUi(saved);
                const projects = [...getOfficialProjects()];
                const idx = projects.findIndex(item => String(item.id) === String(id));
                if (idx > -1) projects[idx] = savedUi;
                saveOfficialProjects(projects);
                renderAdminProjects();
                renderSeaBreezeHero(0);
                await loadAdminProjects({ render: true }).catch(() => {});
                showToast(featured ? '✅ Layihə hero-ya əlavə edildi.' : '✅ Layihə hero-dan çıxarıldı.');
            } catch (error) {
                alert('Hero statusu dəyişmədi: ' + error.message);
            } finally {
                finishAdminAction(restore);
            }
        }

        const bulkProjectFieldDefinitions = [
            ['title', 'Title', 'text'], ['slug', 'Slug', 'text'], ['category', 'Category', 'text'], ['zone', 'Zone', 'text'],
            ['deliveryDate', 'Delivery Date', 'text'], ['coastline', 'Coastline', 'text'], ['seaDistance', 'Sea Distance', 'text'],
            ['buildingCount', 'Building Count', 'text'], ['floorCount', 'Floor Count', 'text'], ['repairStatus', 'Repair Status', 'text'],
            ['apartmentCount', 'Apartment Count', 'text'], ['parkingSpaces', 'Parking Spaces', 'text'],
            ['apartmentFormats', 'Apartment Formats', 'textarea'], ['apartmentAreas', 'Apartment Areas', 'textarea'], ['areaRange', 'Area Range', 'text'],
            ['pricePerM2', 'Price Per M2', 'text'], ['totalPrice', 'Total Price', 'text'], ['bankMortgage', 'Bank Mortgage', 'text'],
            ['internalCredit', 'Internal Credit', 'text'], ['downPayment', 'Down Payment', 'text'],
            ['infrastructure', 'Infrastructure', 'textarea'], ['features', 'Features', 'textarea'], ['description', 'Description', 'textarea'],
            ['images', 'Images', 'textarea'], ['featuredInHero', 'Featured In Hero', 'checkbox']
        ];

        function getBulkProjectEmptyRow() {
            return Object.fromEntries(bulkProjectFieldDefinitions.map(([field]) => [field, '']));
        }

        function normalizeBulkProjectLabel(label) {
            const key = String(label || '').toLocaleLowerCase('az-AZ').trim()
                .replace(/[ə]/g, 'e').replace(/[ı]/g, 'i').replace(/[ö]/g, 'o').replace(/[ü]/g, 'u')
                .replace(/[ğ]/g, 'g').replace(/[ç]/g, 'c').replace(/[ş]/g, 's')
                .replace(/[^\p{L}\p{N}]+/gu, '');
            const aliases = {
                title: ['title', 'layiheadi', 'проект'], slug: ['slug'], category: ['category', 'kateqoriya', 'категория'],
                zone: ['zone', 'zona', 'зона'], deliveryDate: ['deliverydate', 'deliveryyear', 'tehvil', 'tehviltarixi', 'сдача'],
                coastline: ['coastline', 'sahilxetti', 'береговаялиния'], seaDistance: ['seadistance', 'denizemesafe', 'denizemesafesi', 'расстояниедоморя'],
                buildingCount: ['buildingcount', 'binalarinsayi', 'количествозданий'], floorCount: ['floorcount', 'mertebesayi', 'этажность'],
                repairStatus: ['repairstatus', 'renovationstatus', 'temir', 'temirstatusu', 'отделка'], apartmentCount: ['apartmentcount', 'menzilsayi', 'umumimenzilsayi', 'общееколвоквартир'],
                parkingSpaces: ['parkingspaces', 'parkingyerleri', 'parkinqyerleri', 'подземныйпаркинг'], apartmentFormats: ['apartmentformats', 'menzilformatlari', 'форматыквартир'],
                apartmentAreas: ['apartmentareas', 'menzilsaheleri'], areaRange: ['arearange', 'area', 'sahe', 'площадь'],
                pricePerM2: ['priceperm2', '1m2qiymeti', '1m²qiymeti', 'ценазам2'], totalPrice: ['totalprice', 'umumiqiymet', 'стоимость'],
                bankMortgage: ['bankmortgage', 'bankipotekasi', 'банковскаяипотека'], internalCredit: ['internalcredit', 'daxilikredit', 'рассрочка'],
                downPayment: ['downpayment', 'ilkinodenis'], infrastructure: ['infrastructure', 'infrastruktur', 'инфраструктура'],
                features: ['features', 'feature', 'xususiyyetler', 'особенности', 'hovuzlar', 'бассейны'], description: ['description', 'desc', 'tesvir', 'aciqlama', 'описание'],
                images: ['images', 'sekiller', 'изображения'], featuredInHero: ['featuredinhero', 'herodagoster', 'показыватьвhero']
            };
            return Object.entries(aliases).find(([, values]) => values.includes(key))?.[0] || null;
        }

        function getBulkProjectTitleMatch(line) {
            return String(line || '').match(/^\s*\d+\.\s+(.+)\s*$/);
        }

        function isBulkProjectSeparatorLine(line) {
            return /^\s*-{3,}\s*$/.test(String(line || ''));
        }

        function splitBulkProjectBlocks(input) {
            const blocks = [];
            let current = [];
            String(input || '').replace(/\r\n/g, '\n').split('\n').forEach(line => {
                const numberedTitle = getBulkProjectTitleMatch(line);
                if (isBulkProjectSeparatorLine(line) || (numberedTitle && current.length)) {
                    if (current.some(item => item.trim())) blocks.push(current.join('\n').trim());
                    current = numberedTitle ? [line] : [];
                } else {
                    current.push(line);
                }
            });
            if (current.some(item => item.trim())) blocks.push(current.join('\n').trim());
            return blocks.filter(Boolean);
        }

        function inferBulkProjectCategory(row) {
            return String(row.category || '').trim();
        }

        function appendBulkProjectField(row, field, value) {
            const cleaned = String(value || '').trim();
            if (!field || !cleaned) return;
            if (field === 'featuredInHero') {
                row[field] = ['true', '1', 'yes', 'beli', 'bəli', 'да', 'on'].includes(cleaned.toLowerCase());
                return;
            }
            const separator = ['description', 'features', 'infrastructure', 'apartmentFormats', 'apartmentAreas', 'images'].includes(field) ? '\n' : ' ';
            row[field] = row[field] ? `${row[field]}${separator}${cleaned}`.trim() : cleaned;
        }

        function parseBulkProjectBlock(block) {
            const row = getBulkProjectEmptyRow();
            const lines = String(block || '').split('\n');
            let activeField = null;
            lines.forEach((rawLine, index) => {
                const line = rawLine.trim();
                if (!line || isBulkProjectSeparatorLine(line)) return;
                const numberedTitle = getBulkProjectTitleMatch(line);
                if (numberedTitle && index === 0) {
                    row.title = numberedTitle[1].trim();
                    activeField = 'title';
                    return;
                }
                const inlineMatch = line.match(/^([^:：]{2,60})\s*[:：]\s*(.*)$/);
                if (inlineMatch) {
                    const field = normalizeBulkProjectLabel(inlineMatch[1]);
                    if (field) {
                        activeField = field;
                        appendBulkProjectField(row, field, inlineMatch[2]);
                    } else {
                        activeField = 'description';
                        appendBulkProjectField(row, 'description', line);
                    }
                    return;
                }
                const fieldOnly = normalizeBulkProjectLabel(line);
                if (fieldOnly) {
                    activeField = fieldOnly;
                    return;
                }
                appendBulkProjectField(row, activeField && activeField !== 'title' ? activeField : 'description', line);
            });
            row.category = inferBulkProjectCategory(row);
            return row;
        }

        function normalizeBulkProjectTitle(value) {
            return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
        }

        function findBulkProjectMatch(row) {
            const slug = localSlug(row.slug);
            if (slug) {
                const slugMatch = getOfficialProjects().find(project => localSlug(project.slug) === slug);
                if (slugMatch) return slugMatch;
            }
            const title = String(row.title || '').trim().toLowerCase();
            const exactMatch = getOfficialProjects().find(project => String(project.title || '').trim().toLowerCase() === title);
            if (exactMatch) return exactMatch;
            const normalized = normalizeBulkProjectTitle(row.title);
            return getOfficialProjects().find(project => normalizeBulkProjectTitle(project.title) === normalized) || null;
        }

        function refreshBulkProjectRowAction(row) {
            row._action = String(row.title || '').trim() ? (findBulkProjectMatch(row) ? 'UPDATE' : 'CREATE') : 'SKIP';
        }

        function bulkProjectRowsForApi(rows) {
            return rows.map(row => {
                const payload = Object.fromEntries(bulkProjectFieldDefinitions
                    .map(([field]) => [field, row[field]])
                    .filter(([, value]) => value !== '' && value !== undefined && value !== null));
                if (payload.images) payload.images = String(payload.images).split(/[\n,]+/).map(value => value.trim()).filter(Boolean);
                return payload;
            });
        }

        async function parseBulkProjectImport() {
            const input = document.getElementById('bulk-project-input');
            const status = document.getElementById('bulk-project-import-status');
            const blocks = splitBulkProjectBlocks(input?.value || '');
            bulkProjectImportRows = blocks.map(parseBulkProjectBlock).filter(row => row.title || row.description);
            bulkProjectImportRows.forEach(refreshBulkProjectRowAction);
            renderBulkProjectPreview();
            if (!bulkProjectImportRows.length) {
                if (status) status.textContent = 'Layihə bloku tapılmadı.';
                return;
            }
            try {
                const preview = await apiRequest('/api/projects/bulk/preview', { method: 'POST', body: JSON.stringify({ projects: bulkProjectRowsForApi(bulkProjectImportRows) }) });
                (preview.rows || []).forEach(item => {
                    if (bulkProjectImportRows[item.index]) bulkProjectImportRows[item.index]._action = item.action;
                });
                renderBulkProjectPreview();
            } catch (_error) {
                // The locally loaded projects still provide a useful preview if the preview request fails.
            }
            if (status) status.textContent = `${bulkProjectImportRows.length} layihə tapıldı.`;
        }

        function updateBulkProjectRow(index, field, value) {
            if (!bulkProjectImportRows[index]) return;
            bulkProjectImportRows[index][field] = field === 'featuredInHero' ? Boolean(value) : String(value ?? '');
            if (field === 'title' || field === 'slug') {
                refreshBulkProjectRowAction(bulkProjectImportRows[index]);
                renderBulkProjectPreview();
            }
        }

        function toggleBulkProjectDetails(index) {
            if (!bulkProjectImportRows[index]) return;
            bulkProjectImportRows[index]._expanded = !bulkProjectImportRows[index]._expanded;
            renderBulkProjectPreview();
        }

        function removeBulkProjectRow(index) {
            bulkProjectImportRows.splice(index, 1);
            renderBulkProjectPreview();
        }

        function bulkProjectInputCell(index, field, value) {
            const safeValue = escapeHtml(String(value ?? ''));
            return `<input type="text" value="${safeValue}" oninput="updateBulkProjectRow(${index}, '${field}', this.value)" class="w-full min-w-24 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-[11px] text-white focus:outline-none focus:border-brand-500">`;
        }

        function renderBulkProjectDetailEditor(row, index) {
            return bulkProjectFieldDefinitions.map(([field, label, type]) => {
                const value = row[field] ?? '';
                if (type === 'checkbox') return `<label class="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[11px] font-bold text-gray-300"><input type="checkbox" ${value ? 'checked' : ''} onchange="updateBulkProjectRow(${index}, '${field}', this.checked)">${label}</label>`;
                const safeValue = escapeHtml(String(value));
                const control = type === 'textarea'
                    ? `<textarea rows="3" oninput="updateBulkProjectRow(${index}, '${field}', this.value)" class="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-[11px] text-white focus:outline-none focus:border-brand-500">${safeValue}</textarea>`
                    : `<input type="text" value="${safeValue}" oninput="updateBulkProjectRow(${index}, '${field}', this.value)" class="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-[11px] text-white focus:outline-none focus:border-brand-500">`;
                return `<label class="flex flex-col gap-1 text-[10px] font-bold uppercase text-gray-400">${label}${control}</label>`;
            }).join('');
        }

        function renderBulkProjectPreview() {
            const tbody = document.getElementById('bulk-project-preview-body');
            const saveBtn = document.getElementById('bulk-project-save-btn');
            if (!tbody) return;
            if (!bulkProjectImportRows.length) {
                tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-gray-500 text-xs">Parse etdikdən sonra layihələr burada görünəcək.</td></tr>';
                if (saveBtn) saveBtn.disabled = true;
                return;
            }
            tbody.innerHTML = bulkProjectImportRows.map((row, index) => `
                <tr class="align-top hover:bg-white/[0.02]">
                    <td class="p-2 whitespace-nowrap"><span class="inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${row._action === 'UPDATE' ? 'bg-amber-500/15 text-amber-300' : row._action === 'CREATE' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-gray-500/15 text-gray-400'}">${row._action === 'UPDATE' ? '✓ UPDATE' : row._action === 'CREATE' ? '+ CREATE' : 'SKIP'}</span></td>
                    <td class="p-2">${bulkProjectInputCell(index, 'title', row.title)}</td>
                    <td class="p-2">${bulkProjectInputCell(index, 'zone', row.zone)}</td>
                    <td class="p-2">${bulkProjectInputCell(index, 'deliveryDate', row.deliveryDate)}</td>
                    <td class="p-2">${bulkProjectInputCell(index, 'areaRange', row.areaRange)}</td>
                    <td class="p-2">${bulkProjectInputCell(index, 'totalPrice', row.totalPrice || row.pricePerM2)}</td>
                    <td class="p-2 text-right whitespace-nowrap"><button type="button" onclick="toggleBulkProjectDetails(${index})" class="bg-brand-500/15 hover:bg-brand-500 text-brand-300 hover:text-white text-[10px] font-bold px-3 py-2 rounded-lg transition">${row._expanded ? 'Bağla' : 'Ətraflı redaktə'}</button><button type="button" onclick="removeBulkProjectRow(${index})" class="ml-1 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white text-[10px] font-bold px-3 py-2 rounded-lg transition">Sil</button></td>
                </tr>
                ${row._expanded ? `<tr><td colspan="7" class="p-4 bg-black/10"><div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">${renderBulkProjectDetailEditor(row, index)}</div></td></tr>` : ''}
            `).join('');
            if (saveBtn) saveBtn.disabled = !bulkProjectImportRows.some(row => String(row.title || '').trim());
        }

        function bulkProjectRowToUi(row) {
            const images = String(row.images || '').split(/[\n,]+/).map(value => value.trim()).filter(Boolean);
            return {
                title: String(row.title || '').trim(), slug: String(row.slug || '').trim(), category: inferBulkProjectCategory(row),
                zone: String(row.zone || '').trim(), year: String(row.deliveryDate || '').trim(), coastline: String(row.coastline || '').trim(), seaDistance: String(row.seaDistance || '').trim(),
                buildings: String(row.buildingCount || '').trim(), floors: String(row.floorCount || '').trim(), repairStatus: String(row.repairStatus || '').trim(), apartments: String(row.apartmentCount || '').trim(), parking: String(row.parkingSpaces || '').trim(),
                apartmentFormats: String(row.apartmentFormats || '').trim(), apartmentAreas: String(row.apartmentAreas || '').trim(), area: String(row.areaRange || '').trim(),
                pricePerM2: String(row.pricePerM2 || '').trim(), totalPrice: String(row.totalPrice || '').trim(), bankMortgage: String(row.bankMortgage || '').trim(), internalCredit: String(row.internalCredit || '').trim(), downPayment: String(row.downPayment || '').trim(),
                infrastructure: String(row.infrastructure || '').trim(), features: String(row.features || '').trim(), desc: String(row.description || '').trim(),
                img: images[0] || '', images, featuredInHero: Boolean(row.featuredInHero)
            };
        }

        async function saveBulkProjectImport() {
            if (!activeUser || !isAdminRole(activeUser.role)) return;
            const validRows = bulkProjectImportRows.filter(row => String(row.title || '').trim());
            if (!validRows.length) {
                alert('Yadda saxlamaq üçün ən azı bir layihə adı olmalıdır.');
                return;
            }
            const saveBtn = document.getElementById('bulk-project-save-btn');
            const status = document.getElementById('bulk-project-import-status');
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>Saving...';
            }
            try {
                const result = await apiRequest('/api/projects/bulk', { method: 'POST', body: JSON.stringify({ projects: bulkProjectRowsForApi(bulkProjectImportRows) }) });
                const savedProjects = (result.projects || []).map(dbProjectToUi);
                const projectsById = new Map(getOfficialProjects().map(project => [String(project.id), project]));
                savedProjects.forEach(project => projectsById.set(String(project.id), project));
                saveOfficialProjects([...projectsById.values()]);
                bulkProjectImportRows = [];
                document.getElementById('bulk-project-input').value = '';
                renderBulkProjectPreview();
                renderOfficialProjectOptions();
                renderOfficialProjects();
                renderAdminProjects();
                const summary = result.summary || {};
                if (status) status.textContent = `Created: ${summary.created || 0} · Updated: ${summary.updated || 0} · Skipped: ${summary.skipped || 0}`;
            } catch (error) {
                alert('Bulk layihələr API-yə yazılmadı: ' + error.message);
                if (status) status.textContent = 'Yadda saxlanma zamanı xəta baş verdi.';
            } finally {
                if (saveBtn) {
                    saveBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up mr-1"></i>Bütün layihələri saxla';
                    saveBtn.disabled = !bulkProjectImportRows.some(row => String(row.title || '').trim());
                }
            }
        }

        function clearBulkProjectImport() {
            bulkProjectImportRows = [];
            const input = document.getElementById('bulk-project-input');
            const status = document.getElementById('bulk-project-import-status');
            if (input) input.value = '';
            if (status) status.textContent = '';
            renderBulkProjectPreview();
        }

        async function handleSaveOfficialProject(e) {
            e.preventDefault();
            if (!activeUser || !isAdminRole(activeUser.role) || isProjectSaveSubmitting) return;
            isProjectSaveSubmitting = true;
            setProjectSaveButtonLoading(true);

            const editId = document.getElementById('edit-project-id').value;
            const projectImages = collectProjectImageInputs();
            const imageUrl = projectImages[0] || '';
            const title = document.getElementById('project-title').value.trim();
            const projects = [...getOfficialProjects()];
            const existing = projects.find(item => String(item.id) === String(editId)) || {};
            const projectPayload = {
                id: editId || null,
                category: document.getElementById('project-category').value,
                title,
                zone: document.getElementById('project-zone').value.trim(),
                year: document.getElementById('project-year').value.trim(),
                coastline: document.getElementById('project-coastline').value.trim(),
                seaDistance: document.getElementById('project-sea-distance').value.trim(),
                img: imageUrl,
                images: projectImages,
                picture: buildProjectPictureFromLink(imageUrl, existing.picture),
                desc: document.getElementById('project-desc').value.trim(),
                buildings: document.getElementById('project-buildings').value.trim(),
                floors: document.getElementById('project-floors').value.trim(),
                area: document.getElementById('project-area').value.trim(),
                apartments: document.getElementById('project-apartments').value.trim(),
                parking: document.getElementById('project-parking').value.trim(),
                repairStatus: document.getElementById('project-repair').value.trim(),
                apartmentFormats: document.getElementById('project-apartment-formats').value.trim(),
                apartmentAreas: document.getElementById('project-apartment-areas').value.trim(),
                pricePerM2: document.getElementById('project-price-m2').value.trim(),
                totalPrice: document.getElementById('project-total-price').value.trim(),
                bankMortgage: document.getElementById('project-mortgage').value.trim(),
                internalCredit: document.getElementById('project-internal-credit').value.trim(),
                downPayment: document.getElementById('project-down-payment').value.trim(),
                infrastructure: document.getElementById('project-infrastructure').value.trim(),
                features: document.getElementById('project-features').value.trim(),
                slug: document.getElementById('project-slug').value.trim(),
                featuredInHero: document.getElementById('project-featured-hero')?.checked || false,
                aliases: document.getElementById('project-aliases')?.value.trim() || '',
                latitude: isValidCoordinate(document.getElementById('project-latitude')?.value, document.getElementById('project-longitude')?.value) ? safeNumber(document.getElementById('project-latitude')?.value) : null,
                longitude: isValidCoordinate(document.getElementById('project-latitude')?.value, document.getElementById('project-longitude')?.value) ? safeNumber(document.getElementById('project-longitude')?.value) : null,
                mapLocationVerified: isValidCoordinate(document.getElementById('project-latitude')?.value, document.getElementById('project-longitude')?.value)
                    ? document.getElementById('project-map-verified')?.value !== 'false'
                    : false,
                mapLocationLabel: document.getElementById('project-location-search')?.value.trim() || title
            };

            try {
                const saved = editId
                    ? await apiRequest(`/api/projects/${editId}`, { method: 'PUT', body: JSON.stringify(uiProjectToApi(projectPayload)) })
                    : await apiRequest('/api/projects', { method: 'POST', body: JSON.stringify(uiProjectToApi(projectPayload)) });
                const savedUi = dbProjectToUi(saved);
                const idx = projects.findIndex(item => String(item.id) === String(editId));
                if (idx > -1) {
                    const oldTitle = projects[idx].title;
                    projects[idx] = savedUi;
                    await syncListingProjectNames(oldTitle, title, imageUrl);
                } else {
                    projects.unshift(savedUi);
                }
                saveOfficialProjects(projects);
                renderOfficialProjectOptions();
                renderOfficialProjects();
                renderAdminProjects();
                await loadAdminProjects({ render: true }).catch(() => {});
                await refreshAdminStats({ render: true }).catch(() => {});
                resetOfficialProjectForm();
                collapseOfficialProjectForm();
                showProjectSaveSuccess('Layihə uğurla saxlanıldı. Siyahı yeniləndi.');
                showToast('✅ Layihə saxlanıldı.');
            } catch (error) {
                alert('Layihə API-yə yazılmadı: ' + error.message);
            } finally {
                isProjectSaveSubmitting = false;
                setProjectSaveButtonLoading(false);
            }
        }

        function editOfficialProject(id) {
            const project = getOfficialProjects().find(item => item.id === id);
            if (!project) return;
            document.getElementById('edit-project-id').value = project.id;
            document.getElementById('project-form-action-title').textContent = 'Layihəni redaktə et';
            document.getElementById('project-title').value = project.title;
            document.getElementById('project-slug').value = project.slug || '';
            document.getElementById('project-aliases').value = project.aliases || '';
            document.getElementById('project-latitude').value = Number.isFinite(Number(project.latitude)) ? Number(project.latitude).toFixed(7) : '';
            document.getElementById('project-longitude').value = Number.isFinite(Number(project.longitude)) ? Number(project.longitude).toFixed(7) : '';
            document.getElementById('project-map-verified').value = project.mapLocationVerified ? 'true' : 'false';
            updateProjectMapStatus();
            setTimeout(initProjectLocationMap, 120);
            document.getElementById('project-category').value = project.category;
            document.getElementById('project-zone').value = project.zone || '';
            document.getElementById('project-year').value = project.year;
            document.getElementById('project-coastline').value = project.coastline || '';
            document.getElementById('project-sea-distance').value = project.seaDistance || '';
            document.getElementById('project-buildings').value = project.buildings || '';
            document.getElementById('project-floors').value = project.floors;
            document.getElementById('project-area').value = project.area;
            document.getElementById('project-apartments').value = project.apartments;
            document.getElementById('project-parking').value = project.parking || '';
            document.getElementById('project-repair').value = project.repairStatus;
            document.getElementById('project-apartment-formats').value = project.apartmentFormats || '';
            document.getElementById('project-apartment-areas').value = project.apartmentAreas || '';
            document.getElementById('project-price-m2').value = project.pricePerM2 || '';
            document.getElementById('project-total-price').value = project.totalPrice || '';
            document.getElementById('project-mortgage').value = project.bankMortgage || '';
            document.getElementById('project-internal-credit').value = project.internalCredit || '';
            document.getElementById('project-down-payment').value = project.downPayment || '';
            document.getElementById('project-infrastructure').value = project.infrastructure || '';
            document.getElementById('project-features').value = Array.isArray(project.features) ? project.features.join(' / ') : project.features;
            document.getElementById('project-desc').value = project.desc;
            document.getElementById('project-featured-hero').checked = Boolean(project.featuredInHero);
            document.getElementById('project-hero-badge')?.classList.toggle('hidden', !project.featuredInHero);
            const images = getProjectImages(project);
            document.getElementById('project-img').value = images[0] || project.img || '';
            renderProjectImageInputs(images.length ? images : ['']);
            updateProjectImagePreview();
            setProjectPdfStatus(project);
            setOfficialProjectFormExpanded(true);
            document.getElementById('official-project-form-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        async function deleteOfficialProject(id, button = null) {
            if (!activeUser || !isAdminRole(activeUser.role)) return;
            if (!confirm('Bu layihəni silmək istədiyinizə əminsiniz?')) return;
            const restore = beginAdminAction(button, `project-delete:${id}`, 'Silinir...');
            if (!restore) return;
            try {
                await apiRequest(`/api/projects/${id}`, { method: 'DELETE' });
                saveOfficialProjects(getOfficialProjects().filter(item => String(item.id) !== String(id)));
                renderOfficialProjectOptions();
                renderOfficialProjects();
                renderAdminProjects();
                await loadAdminProjects({ render: true }).catch(() => {});
                await refreshAdminStats({ render: true }).catch(() => {});
                showToast('✅ Layihə silindi.');
            } catch (error) {
                alert('Layihə API-dən silinmədi: ' + error.message);
            } finally {
                finishAdminAction(restore);
            }
        }

        async function restoreDefaultOfficialProjects() {
            if (!activeUser || !isAdminRole(activeUser.role)) return;
            if (!confirm('Bütün layihə məlumatları ilkin 1-10 layihə datası ilə bərpa edilsin?')) return;
            try {
                for (const project of getOfficialProjects()) {
                    if (Number.isInteger(Number(project.id))) await apiRequest(`/api/projects/${project.id}`, { method: 'DELETE' });
                }
                const created = [];
                for (const project of officialSeaBreezeProjects) {
                    created.push(dbProjectToUi(await apiRequest('/api/projects', { method: 'POST', body: JSON.stringify(uiProjectToApi(project)) })));
                }
                saveOfficialProjects(created);
                renderOfficialProjectOptions();
                renderOfficialProjects();
                renderAdminProjects();
                resetOfficialProjectForm();
            } catch (error) {
                alert('Layihələr API-də bərpa edilmədi: ' + error.message);
            }
        }

        async function syncListingProjectNames(oldTitle, newTitle, newImage) {
            const listings = [...appData.listings];
            const updates = listings.map(async (item, index) => {
                if (item.project === oldTitle) {
                    const updated = { ...item, project: newTitle, img: newImage || item.img };
                    const saved = await apiRequest(`/api/listings/${item.id}`, { method: 'PUT', body: JSON.stringify(uiListingToApi(updated)) });
                    listings[index] = dbListingToUi(saved);
                }
            });
            await Promise.all(updates);
            cacheData('listings', listings);
        }

        // RENDER ADMIN CABINET (Realtime Data Mapping)

        function mapOverviewStats(stats = {}) {
            return {
                totalUsers: stats.totalUsers ?? stats.usersTotal ?? stats.userCount ?? (appData.agents || []).length,
                totalListings: stats.listingsTotal ?? stats.totalListings ?? 0,
                pendingListings: stats.listingsPending ?? stats.pendingListings ?? 0,
                approvedListings: stats.listingsApproved ?? stats.approvedListings ?? 0,
                rejectedListings: stats.listingsRejected ?? stats.rejectedListings ?? 0,
                archivedListings: stats.listingsArchived ?? stats.archivedListings ?? 0,
                totalViews: stats.adViews ?? stats.totalViews ?? 0,
                totalClicks: stats.adClicks ?? stats.totalClicks ?? 0,
                totalFavorites: stats.favoritesTotal ?? stats.totalFavorites ?? 0,
                projectsCount: stats.projectsTotal ?? stats.projectsCount ?? 0,
                galleryCount: stats.galleryTotal ?? stats.galleryCount ?? 0,
                vacanciesCount: stats.vacanciesTotal ?? stats.vacanciesCount ?? 0,
                applicationsCount: stats.applicationsTotal ?? stats.applicationsCount ?? 0,
                totalAds: stats.adsTotal ?? stats.totalAds ?? 0,
                activeAds: stats.adsActive ?? stats.activeAds ?? 0,
                totalProjectViews: stats.totalProjectViews ?? 0,
                totalProjectClicks: stats.totalProjectClicks ?? 0,
                totalProjectInquiries: stats.totalProjectInquiries ?? 0,
                projectInquiriesTotal: stats.projectInquiriesTotal ?? stats.totalProjectInquiries ?? 0
            };
        }

        function getDashboardStats() {
            return mapOverviewStats(appData.dashboardStats || {});
        }

        async function refreshAdminStats({ render = true } = {}) {
            if (!isAdminRole(activeUser?.role) || !getAuthToken()) return null;
            appData.dashboardStatsError = '';
            appData.dashboardStatsLoading = true;
            if (render) renderDashboardCards();
            try {
                const overview = await apiRequest('/api/admin/stats/overview', { authRedirect: false });
                appData.dashboardStats = overview;
                appData.dashboardStatsError = '';
                return overview;
            } catch (error) {
                appData.dashboardStats = null;
                appData.dashboardStatsError = 'Statistika yüklənmədi';
                console.warn('Admin statistika oxunmadı:', error.message);
                return null;
            } finally {
                appData.dashboardStatsLoading = false;
                if (render) renderDashboardCards();
            }
        }


        currentAdminAnalyticsTab = window.currentAdminAnalyticsTab || 'listings';
        window.currentAdminAnalyticsTab = currentAdminAnalyticsTab;
        let adminAnalyticsExpanded = localStorage.getItem('adminAnalyticsExpanded') === 'true';

        function toggleAdminAnalyticsPanel() {
            adminAnalyticsExpanded = !adminAnalyticsExpanded;
            localStorage.setItem('adminAnalyticsExpanded', String(adminAnalyticsExpanded));
            const panel = document.querySelector('.admin-analytics-card');
            if (!panel) return;
            panel.classList.toggle('is-expanded', adminAnalyticsExpanded);
            const header = panel.querySelector('.admin-analytics-header');
            const content = panel.querySelector('.admin-analytics-content');
            const arrow = panel.querySelector('.admin-analytics-arrow');
            header?.setAttribute('aria-expanded', String(adminAnalyticsExpanded));
            content?.setAttribute('aria-hidden', String(!adminAnalyticsExpanded));
            if (content) {
                if (adminAnalyticsExpanded) content.removeAttribute('inert');
                else content.setAttribute('inert', '');
            }
            if (arrow) arrow.textContent = adminAnalyticsExpanded ? '▲' : '▼';
        }

        function setAdminAnalyticsTab(tab = 'listings') {
            currentAdminAnalyticsTab = ['listings', 'ads', 'projects', 'career'].includes(tab) ? tab : 'listings';
            window.currentAdminAnalyticsTab = currentAdminAnalyticsTab;
            renderDashboardCards();
        }

        function dashboardNumber(value) {
            return Number(value || 0).toLocaleString('az-AZ');
        }

        function renderAdminKpiCard({ label, value, icon }) {
            return `
                <div class="admin-stat-card">
                    <div class="flex items-start justify-between gap-2">
                        <span class="admin-stat-card__icon"><i class="fa-solid ${icon}"></i></span>
                        <span class="h-1 w-8 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 opacity-80"></span>
                    </div>
                    <div class="mt-3 text-xl md:text-2xl font-black leading-none text-slate-950 dark:text-white">${dashboardNumber(value)}</div>
                    <div class="mt-1 text-[10px] font-black uppercase tracking-[.12em] text-slate-500 dark:text-slate-300">${label}</div>
                </div>
            `;
        }

        function renderAdminAnalyticsPanel(stats) {
            const tabs = [
                ['listings', 'Elanlar'],
                ['ads', 'Reklam'],
                ['projects', 'Layihələr'],
                ['career', 'Karyera']
            ];
            const groups = {
                listings: [
                    ['Təsdiqlənmiş', stats.approvedListings, 'fa-check-circle'],
                    ['Gözləyən', stats.pendingListings, 'fa-clock'],
                    ['Rədd edilmiş', stats.rejectedListings, 'fa-ban'],
                    ['Arxiv', stats.archivedListings, 'fa-box-archive'],
                    ['Seçilmişlər', stats.totalFavorites, 'fa-heart']
                ],
                ads: [
                    ['Reklamlar', stats.totalAds, 'fa-rectangle-ad'],
                    ['Aktiv reklamlar', stats.activeAds, 'fa-toggle-on'],
                    ['Reklam baxışları', stats.totalViews, 'fa-eye'],
                    ['Reklam klikləri', stats.totalClicks, 'fa-computer-mouse']
                ],
                projects: [
                    ['Layihə baxışları', stats.totalProjectViews, 'fa-eye'],
                    ['PDF yükləmələri', stats.totalProjectClicks, 'fa-file-arrow-down'],
                    ['Layihə maraqlanmaları', stats.totalProjectInquiries, 'fa-comments']
                ],
                career: [
                    ['Vakansiyalar', stats.vacanciesCount, 'fa-briefcase'],
                    ['CV müraciətləri', stats.applicationsCount, 'fa-file-lines']
                ]
            };
            const rows = groups[currentAdminAnalyticsTab] || groups.listings;
            return `
                <section class="admin-analytics-card col-span-full mt-0 ${adminAnalyticsExpanded ? 'is-expanded' : ''}">
                    <button type="button" class="admin-analytics-header" aria-expanded="${adminAnalyticsExpanded}" onclick="toggleAdminAnalyticsPanel()">
                        <span class="admin-analytics-header__icon" aria-hidden="true">📊</span>
                        <span class="min-w-0 text-left">
                            <span class="admin-analytics-header__eyebrow">Analitika</span>
                            <span class="admin-analytics-header__title">Qruplaşdırılmış göstəricilər</span>
                        </span>
                        <span class="admin-analytics-arrow" aria-hidden="true">${adminAnalyticsExpanded ? '▲' : '▼'}</span>
                    </button>
                    <div class="admin-analytics-content" aria-hidden="${!adminAnalyticsExpanded}" ${adminAnalyticsExpanded ? '' : 'inert'}>
                        <div class="admin-analytics-tabs" role="tablist" aria-label="Admin analitika qrupları">
                            ${tabs.map(([key, label]) => `<button type="button" class="admin-analytics-tab ${currentAdminAnalyticsTab === key ? 'is-active' : ''}" role="tab" aria-selected="${currentAdminAnalyticsTab === key}" onclick="setAdminAnalyticsTab('${key}')">${label}</button>`).join('')}
                        </div>
                        <div class="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
                            ${rows.map(([label, value, icon]) => `
                                <div class="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/5">
                                    <div class="flex items-center justify-between gap-2 text-slate-500 dark:text-slate-300"><span class="text-[11px] font-black">${label}</span><i class="fa-solid ${icon} text-indigo-500 dark:text-indigo-300"></i></div>
                                    <div class="mt-2 text-xl font-black text-slate-950 dark:text-white">${dashboardNumber(value)}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </section>
            `;
        }

        function renderDashboardSkeletonCards(count = 6) {
            const container = document.getElementById('admin-dashboard-cards');
            if (!container) return;
            container.innerHTML = Array.from({ length: count }).map(() => `
                <div class="admin-stat-card border border-white/10 bg-white/5 p-4 shadow-xl animate-pulse">
                    <div class="h-3 w-2/3 rounded bg-white/20"></div>
                    <div class="mt-5 h-8 w-1/2 rounded bg-white/20"></div>
                </div>
            `).join('');
        }

        function renderAdminDashboardWidgets(stats = {}) {
            const statusRows = [
                ['Aktiv', stats.approvedListings ?? 0], ['Gözləyən', stats.pendingListings ?? 0],
                ['Arxiv', stats.archivedListings ?? 0], ['Rədd', stats.rejectedListings ?? 0]
            ];
            const maxViews = Math.max(1, stats.totalProjectViews || stats.totalViews || stats.totalListings || 1);
            const bars = [35, 58, 44, 72, 61, 84, 68].map((base, i) => `<span class="admin-chart-bar" style="height:${Math.min(96, Math.max(18, base + ((maxViews + i) % 10)))}%"></span>`).join('');
            return `<div class="admin-dashboard-widgets">
                <section class="admin-widget-card"><h3>Baxışlar (Son 7 gün)</h3><div class="admin-placeholder-chart">${bars}</div></section>
                <section class="admin-widget-card"><h3>Son Aktivliklər</h3>${(stats.projectInquiriesTotal || stats.pendingListings) ? `<div class="admin-mini-row"><span>Gözləyən elanlar</span><strong>${stats.pendingListings || 0}</strong></div><div class="admin-mini-row"><span>Layihə müraciətləri</span><strong>${stats.projectInquiriesTotal || 0}</strong></div><div class="admin-mini-row"><span>Reklam baxışları</span><strong>${stats.totalViews || 0}</strong></div>` : '<div class="admin-empty-state">Hələ aktivlik yoxdur.</div>'}</section>
                <section class="admin-widget-card"><h3>Elan Statusları</h3>${statusRows.map(([label, value]) => `<div class="admin-mini-row"><span>${label}</span><strong>${value}</strong></div>`).join('')}</section>
                <section class="admin-widget-card"><h3>Ən Populyar Layihələr</h3><div class="admin-mini-row"><span>Layihə baxışları</span><strong>${stats.totalProjectViews || 0}</strong></div><div class="admin-mini-row"><span>Layihələr</span><strong>${stats.projectsCount || 0}</strong></div></section>
                <section class="admin-widget-card"><h3>Statistikalar</h3><div class="admin-mini-row"><span>Elan baxışları</span><strong>${stats.totalListingViews || stats.totalViews || 0}</strong></div><div class="admin-mini-row"><span>İstifadəçilər</span><strong>${stats.totalUsers || 0}</strong></div></section>
            </div>`;
        }

        function renderDashboardCards() {
            const container = document.getElementById('admin-dashboard-cards');
            if (!container || !activeUser) return;
            if (!isAdminRole(activeUser.role)) {
                const mine = appData.listings.filter(item => String(item.authorId) === String(activeUser.id));
                const stats = appData.dashboardStats || {};
                const cards = [
                    { label: 'Elanlar', value: stats.totalListings ?? mine.length, icon: 'fa-building' },
                    { label: 'Təsdiqlənmiş', value: stats.approvedListings ?? mine.filter(x => normalizeListingStatus(x.status) === 'approved').length, icon: 'fa-check-circle' },
                    { label: 'Gözləyən', value: stats.pendingListings ?? mine.filter(x => normalizeListingStatus(x.status) === 'pending').length, icon: 'fa-clock' },
                    { label: 'Rədd edilmiş', value: stats.rejectedListings ?? mine.filter(x => normalizeListingStatus(x.status) === 'rejected').length, icon: 'fa-ban' },
                    { label: 'Baxışlar', value: stats.totalViews ?? stats.views ?? mine.reduce((sum, x) => sum + (x.viewCount || 0), 0), icon: 'fa-eye' },
                    { label: 'Seçilmişlər', value: stats.totalFavorites ?? stats.favorites ?? mine.reduce((sum, x) => sum + (x.favoritesCount || 0), 0), icon: 'fa-heart' },
                ];
                container.innerHTML = cards.map(card => renderAdminKpiCard(card)).join('');
                return;
            }
            if (!appData.dashboardStats && !appData.dashboardStatsError) {
                if (!appData.dashboardStatsLoading) refreshAdminStats({ render: true });
                return renderDashboardSkeletonCards();
            }
            if (appData.dashboardStatsLoading && !appData.dashboardStats) return renderDashboardSkeletonCards();
            if (appData.dashboardStatsError && !appData.dashboardStats) {
                container.innerHTML = `<div class="col-span-full rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm font-black text-red-700 dark:text-red-200">Statistika yüklənmədi</div>`;
                return;
            }
            const stats = getDashboardStats();
            const kpis = [
                { label: 'Ümumi Elanlar', value: stats.totalListings, icon: 'fa-building' },
                { label: 'İstifadəçilər', value: stats.totalUsers, icon: 'fa-users' },
                { label: 'Layihələr', value: stats.projectsCount, icon: 'fa-diagram-project' },
                { label: 'Baxışlar', value: stats.totalProjectViews || stats.totalListingViews || stats.totalViews, icon: 'fa-eye' },
                { label: 'Reklam Baxışları', value: stats.totalViews, icon: 'fa-rectangle-ad' },
                { label: 'Müraciətlər', value: stats.projectInquiriesTotal, icon: 'fa-inbox' }
            ];
            container.innerHTML = kpis.map(card => renderAdminKpiCard(card)).join('') + renderAdminDashboardWidgets(stats) + renderAdminAnalyticsPanel(stats);
        }

        function syncAdminListingStatusFilters() {
            document.querySelectorAll('[data-listing-status-filter]').forEach(button => {
                const isActive = button.dataset.listingStatusFilter === adminListingStatusFilter;
                button.classList.toggle('is-active', isActive);
                button.setAttribute('aria-pressed', String(isActive));
            });
        }


        function setAdminListingStatusFilter(status = 'all') {
            const normalized = ['all', 'pending', 'approved', 'rejected', 'archived'].includes(status) ? status : 'all';
            adminListingStatusFilter = normalized;
            syncAdminListingStatusFilters();
            renderAdminDashboard();
        }

        async function loadProjectInquiries() {
            if (!isAdminRole(activeUser?.role)) return;
            const select = document.getElementById('project-inquiry-project-filter');
            if (select) {
                const current = select.value || 'all';
                select.innerHTML = '<option value="all">Bütün layihələr</option>' + getOfficialProjects().map(project => `<option value="${project.id}">${escapeHtml(project.title)}</option>`).join('');
                select.value = current;
            }
            const q = document.getElementById('project-inquiry-search')?.value.trim() || '';
            const projectId = select?.value && select.value !== 'all' ? select.value : '';
            const status = document.getElementById('project-inquiry-status-filter')?.value || 'all';
            const params = new URLSearchParams();
            if (q) params.set('q', q);
            if (projectId) params.set('projectId', projectId);
            if (status !== 'all') params.set('status', status);
            const list = document.getElementById('admin-project-inquiries-list');
            if (list) list.innerHTML = '<div class="glass-card rounded-2xl p-5 text-sm font-bold text-gray-300"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Müraciətlər yüklənir...</div>';
            try {
                appData.projectInquiries = await apiRequest(`/api/projects/inquiries${params.toString() ? `?${params}` : ''}`, { authRedirect: false });
                renderProjectInquiries();
            } catch (error) {
                if (list) list.innerHTML = '<div class="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm font-bold text-red-200">Müraciətlər yüklənmədi.</div>';
            }
        }

        function inquiryStatusLabel(status) {
            return { new: 'Yeni', contacted: 'Əlaqə saxlanıldı', closed: 'Bağlandı' }[status] || status || 'Yeni';
        }

        function renderProjectInquiries() {
            const list = document.getElementById('admin-project-inquiries-list');
            if (!list) return;
            const rows = Array.isArray(appData.projectInquiries) ? appData.projectInquiries : [];
            if (!rows.length) {
                list.innerHTML = '<div class="glass-card rounded-2xl p-8 text-center text-sm font-bold text-gray-400">Müraciət yoxdur</div>';
                return;
            }
            list.innerHTML = rows.map(row => `
                <article class="glass-card rounded-2xl border border-white/10 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div class="space-y-1">
                        <div class="flex flex-wrap items-center gap-2"><h3 class="text-white font-black">${escapeHtml(row.name || '—')}</h3><span class="rounded-full bg-brand-500/15 px-2 py-1 text-[10px] font-black text-brand-200">${inquiryStatusLabel(row.status)}</span></div>
                        <p class="text-sm font-bold text-gray-300">${escapeHtml(row.phone || '—')} • ${escapeHtml(row.project?.title || 'Layihə')}</p>
                        ${row.note ? `<p class="text-xs text-gray-400">${escapeHtml(row.note)}</p>` : ''}
                        <p class="text-[10px] text-gray-500">${row.createdAt ? new Date(row.createdAt).toLocaleString('az-AZ') : ''}</p>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <button onclick="updateProjectInquiryStatus(${row.id}, 'new')" class="rounded-lg bg-white/10 px-3 py-2 text-[10px] font-bold text-gray-200 hover:bg-white/20">Yeni</button>
                        <button onclick="updateProjectInquiryStatus(${row.id}, 'contacted')" class="rounded-lg bg-blue-500/10 px-3 py-2 text-[10px] font-bold text-blue-300 hover:bg-blue-500 hover:text-white">Əlaqə saxlanıldı</button>
                        <button onclick="updateProjectInquiryStatus(${row.id}, 'closed')" class="rounded-lg bg-emerald-500/10 px-3 py-2 text-[10px] font-bold text-emerald-300 hover:bg-emerald-500 hover:text-white">Bağla</button>
                        <button onclick="deleteProjectInquiry(${row.id})" class="rounded-lg bg-red-500/10 px-3 py-2 text-[10px] font-bold text-red-300 hover:bg-red-500 hover:text-white">Sil</button>
                    </div>
                </article>
            `).join('');
        }

        async function updateProjectInquiryStatus(id, status) {
            try {
                await apiRequest(`/api/projects/inquiries/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
                await loadProjectInquiries();
                await refreshAdminStats({ render: true }).catch(() => {});
            } catch (_error) { alert('Status yenilənmədi.'); }
        }

        async function deleteProjectInquiry(id) {
            if (!confirm('Müraciət silinsin?')) return;
            try {
                await apiRequest(`/api/projects/inquiries/${id}`, { method: 'DELETE' });
                await loadProjectInquiries();
                await refreshAdminStats({ render: true }).catch(() => {});
            } catch (_error) { alert('Müraciət silinmədi.'); }
        }

        function renderAdminDashboard() {
            if (!activeUser) {
                switchTab('admin-login');
                return;
            }

            renderDashboardCards();
            renderDashboardSubtabButtons(currentAdminSubtab);

            // Hide/Show restriction tags
            const adminTags = document.querySelectorAll('.admin-only-element');
            if (!isAdminRole(activeUser.role)) {
                adminTags.forEach(el => el.classList.add('hidden'));
                document.querySelectorAll('.user-only-element').forEach(el => el.classList.remove('hidden'));
                switchAdminSubtab('seabreeze-manager');
            } else {
                adminTags.forEach(el => el.classList.remove('hidden'));
                document.querySelectorAll('.user-only-element').forEach(el => el.classList.add('hidden'));
            }

            // 1. Listings Grid
            syncAdminListingStatusFilters();
            const codeSearch = document.getElementById('admin-listing-code-search')?.value.trim() || '';
            const regionFilter = document.getElementById('admin-listing-region-filter')?.value || 'all';
            const districtFilter = document.getElementById('admin-listing-district-filter')?.value || 'all';
            const properties = appData.listings.slice().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0) || Number(b.id || 0) - Number(a.id || 0)).filter(item => {
                const listingRegion = getListingRegionType(item);
                const listingDistrict = getListingDistrict(item);
                if (adminListingStatusFilter !== 'all' && normalizeListingStatus(item.status) !== adminListingStatusFilter) return false;
                if (codeSearch && !String(item.listingCode || '').includes(codeSearch.replace(/^BH/i, '')) && !formatListingCode(item.listingCode).toLowerCase().includes(codeSearch.toLowerCase())) return false;
                if (regionFilter !== 'all' && listingRegion !== regionFilter) return false;
                if (districtFilter !== 'all' && listingDistrict !== districtFilter) return false;
                return true;
            });
            const pContainer = document.getElementById('admin-seabreeze-list');
            pContainer.innerHTML = '';

            const adminListingsBlocked = isAdminRole(activeUser.role) && dataLoadState.adminListings.error;
            if (adminListingsBlocked) {
                pContainer.innerHTML = `<div class="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">${dataLoadState.adminListings.error}</div>`;
            } else if (isAdminRole(activeUser.role) && dataLoadState.adminListings.loading && !properties.length) {
                pContainer.innerHTML = '<div class="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-bold text-gray-300"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Elanlar yüklənir...</div>';
            } else if (!properties.length) {
                pContainer.innerHTML = '<div class="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-bold text-gray-400">Elan tapılmadı.</div>';
            }

            if (!adminListingsBlocked && properties.length) properties.forEach(p => {
                // Agent restriction filter
                if (activeUser.role === 'user' && p.authorId !== activeUser.id) return;

                const normalizedStatus = normalizeListingStatus(p.status);
                const isApproved = normalizedStatus === 'approved';
                const label = { pending: 'Gözləyir', approved: 'Aktiv', rejected: 'Rədd edildi', archived: 'Arxivdə' }[normalizedStatus] || 'Gözləyir';
                const badge = listingStatusBadgeClass(normalizedStatus);
                const mainImage = p.img || p.images?.[0] || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=200&q=80';
                const regionLabel = getRegionLabel(getListingRegionType(p) || 'unknown');
                const districtLabel = getListingDistrict(p) || (regionLabel === 'Unknown' ? '—' : regionLabel);
                const adminListingTitle = p.title || '—';
                const listingHeroItem = listingHeroItemForListing(p.id);
                const areaLabel = Number(p.area) > 0 ? `${Number(p.area).toLocaleString('az-AZ')} m²` : '— m²';
                const floorLabel = formatListingFloor(p.floorNumber ?? p.floor, p.floorCount).replace(/\s*\/\s*/g, '/');
                const heroAction = isAdminRole(activeUser.role) ? (listingHeroItem
                    ? `<button onclick="removeListingFromHero('${p.id}', false, this)" class="admin-listing-action admin-listing-action--hero"><i class="fa-solid fa-star"></i>Hero-dan çıxar</button>`
                    : `<button onclick="addListingToHero('${p.id}', this)" class="admin-listing-action admin-listing-action--hero-add"><i class="fa-regular fa-star"></i>Hero əlavə et</button>`) : '';

                pContainer.innerHTML += `
                    <article class="admin-listing-management-card glass-card">
                        <div class="admin-listing-management-card__summary">
                            <img src="${mainImage}" class="admin-listing-management-card__thumb" alt="${escapeHtml(adminListingTitle)}" loading="lazy">
                            <div class="admin-listing-management-card__info">
                                <div class="admin-listing-management-card__heading">
                                    <h3 class="admin-listing-management-card__title">${escapeHtml(adminListingTitle)}</h3>
                                    <span class="admin-listing-management-card__status ${badge}">${label}</span>
                                </div>
                                <div class="admin-listing-management-card__location"><i class="fa-solid fa-location-dot"></i><span>${escapeHtml(regionLabel)} • ${escapeHtml(districtLabel)}</span></div>
                                <div class="admin-listing-management-card__facts">
                                    <span><i class="fa-solid fa-door-open"></i>${p.rooms ?? '—'} otaq</span>
                                    <span><i class="fa-solid fa-ruler-combined"></i>${areaLabel}</span>
                                    <span><i class="fa-solid fa-building"></i>${escapeHtml(floorLabel)} mərtəbə</span>
                                </div>
                                <div class="admin-listing-management-card__footer-meta">
                                    <span class="admin-listing-management-card__code">${formatListingCode(p.listingCode)}</span>
                                    <strong class="admin-listing-management-card__price">${formatPrice(p.price, p.currency)}</strong>
                                    <span><i class="fa-regular fa-eye"></i>${p.viewCount || 0}</span>
                                    <span><i class="fa-regular fa-heart"></i>${p.favoritesCount || 0}</span>
                                </div>
                            </div>
                        </div>
                        <div class="admin-listing-management-card__actions">
                            ${isAdminRole(activeUser.role) && !isApproved ? `
                                <button onclick="approveListing(${p.id}, this)" class="admin-listing-action admin-listing-action--approve"><i class="fa-solid fa-check"></i>Təsdiqlə</button>
                            ` : ''}
                            ${isAdminRole(activeUser.role) && isApproved ? `
                                <button onclick="deactivateListing(${p.id}, this)" class="admin-listing-action admin-listing-action--deactivate"><i class="fa-solid fa-pause"></i>Deaktiv et</button>
                            ` : ''}
                            ${isAdminRole(activeUser.role) && normalizedStatus !== 'rejected' ? `
                                <button onclick="rejectListing(${p.id}, this)" class="admin-listing-action admin-listing-action--reject"><i class="fa-solid fa-ban"></i>Rədd et</button>
                            ` : ''}
                            ${heroAction}
                            <button onclick="runInstantAdminAction(this, 'Açılır...', () => openPropertyModal('${p.id}', true))" class="admin-listing-action admin-listing-action--open"><i class="fa-solid fa-arrow-up-right-from-square"></i>Aç</button>
                            <button onclick="runInstantAdminAction(this, 'Yenilənir...', () => editSeaBreezeItem(${p.id}))" class="admin-listing-action admin-listing-action--edit"><i class="fa-solid fa-pen"></i>Düzəliş</button>
                            <button onclick="deleteSeaBreezeItem(${p.id}, this)" class="admin-listing-action admin-listing-action--delete" aria-label="Elanı sil" title="Elanı sil"><i class="fa-solid fa-trash-can"></i></button>
                        </div>
                    </article>
                `;
            });

            if (isAdminRole(activeUser.role)) {
                // 2. CV Table
                const cvs = appData.applications;
                const cvBody = document.getElementById('admin-cv-tbody');
                cvBody.innerHTML = '';
                if (cvs.length === 0) {
                    cvBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-500">Müraciət yoxdur.</td></tr>`;
                } else {
                    cvs.forEach(c => {
                        cvBody.innerHTML += `
                            <tr class="border-b border-white/5 text-xs text-gray-300">
                                <td class="p-4 font-bold text-white">${c.name} ${c.surname}</td>
                                <td class="p-4">${c.phone} <br> <span class="text-[10px] text-gray-500">${c.email}</span></td>
                                <td class="p-4 text-brand-500 font-semibold">${c.vacancy || 'Ümumi müraciət'}</td>
                                <td class="p-4 text-gray-700 font-semibold">${c.date}</td>
                                <td class="p-4 text-right">
                                    <div class="flex justify-end gap-2">
                                        <button onclick="previewCvFile(${c.id})" class="text-emerald-600 px-3 py-1.5 bg-emerald-500/10 rounded-lg font-bold"><i class="fa-solid fa-eye mr-1"></i>CV Bax</button>
                                        <button onclick="deleteApp(${c.id})" class="text-red-400 px-2 py-1 bg-red-500/10 rounded"><i class="fa-solid fa-trash"></i></button>
                                    </div>
                                </td>
                            </tr>
                        `;
                    });
                }

                // 3. Users List
                const nameQuery = (document.getElementById('admin-user-search-name')?.value || '').trim().toLowerCase();
                const phoneQuery = (document.getElementById('admin-user-search-phone')?.value || '').trim().toLowerCase();
                const emailQuery = (document.getElementById('admin-user-search-email')?.value || '').trim().toLowerCase();
                const statusFilter = (document.getElementById('admin-user-status-filter')?.value || 'all').toLowerCase();
                const agents = appData.agents.filter(a => {
                    const fullname = (a.fullname || `${a.name || ''} ${a.surname || ''}`.trim() || '').toLowerCase();
                    const phone = String(a.phone || '').toLowerCase();
                    const email = String(a.email || '').toLowerCase();
                    const role = String(a.role || 'user').toLowerCase();
                    const matchesStatus = statusFilter === 'all'
                        || (statusFilter === 'online' && a.isOnline)
                        || (statusFilter === 'offline' && !a.isOnline)
                        || (statusFilter === 'admin' && isAdminRole(role))
                        || (statusFilter === 'user' && role === 'user');
                    return matchesStatus && (!nameQuery || fullname.includes(nameQuery)) && (!phoneQuery || phone.includes(phoneQuery)) && (!emailQuery || email.includes(emailQuery));
                });
                const agentsContainer = document.getElementById('admin-agents-grid');
                const usersCount = document.getElementById('admin-users-count');
                agentsContainer.innerHTML = '';
                if (usersCount) usersCount.textContent = `${agents.length} istifadəçi`;
                agents.forEach(a => {
                    const fullname = a.fullname || `${a.name || ''} ${a.surname || ''}`.trim() || 'Adsız istifadəçi';
                    const initials = fullname.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
                    const avatar = a.avatarUrl || avatarFallback(fullname);
                    const onlineBadgeClass = a.isOnline ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-gray-500/10 text-gray-300 border border-gray-500/20';
                    const onlineBadgeText = a.isOnline ? `🟢 ${a.statusText || 'Online'}${a.onlineSessionsCount ? ` (${a.onlineSessionsCount})` : ''}` : '⚫ Offline';
                    const lastLoginText = a.lastLogin ? formatAzDateTime(a.lastLogin) : 'Heç vaxt daxil olmayıb';
                    const lastActiveText = a.lastActiveAt ? formatAzDateTime(a.lastActiveAt) : '—';
                    agentsContainer.innerHTML += `
                        <div onclick="openUserListingsModal('${a.id}')" class="glass-card p-4 rounded-2xl border border-white/5 text-xs hover:border-brand-500/30 transition cursor-pointer">
                            <div class="flex flex-col md:flex-row md:items-center gap-4">
                                <img src="${avatar}" onclick="event.stopPropagation(); openAvatarModal(this.src)" class="w-16 h-16 rounded-2xl object-cover bg-brand-500/10 shrink-0 cursor-zoom-in" onerror="this.outerHTML='<div class=&quot;w-16 h-16 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-black shrink-0&quot;>${initials}</div>'">
                                <div class="min-w-0 flex-1 space-y-2">
                                    <div class="flex flex-wrap items-center gap-2">
                                        <h3 class="font-extrabold text-white text-base">${escapeHtml(fullname)}</h3>
                                        <span class="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-gray-300 border border-white/10">${roleLabel(a.role)}</span>
                                        <span class="text-[9px] px-2 py-0.5 rounded-full ${a.isActive === false ? 'bg-red-500/10 text-red-300 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'}">${a.isActive === false ? 'Bloklu' : 'Aktiv'}</span>
                                        <span class="text-[9px] px-2 py-0.5 rounded-full ${a.emailVerified ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'}">${a.emailVerified ? 'Email təsdiqli' : 'Email təsdiqsiz'}</span>
                                        <span class="text-[9px] px-2 py-0.5 rounded-full ${onlineBadgeClass}">${onlineBadgeText}</span>
                                    </div>
                                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-gray-300">
                                        <span><b class="text-gray-500 uppercase text-[9px] block">E-poçt</b>${escapeHtml(a.email || '—')}</span>
                                        <span><b class="text-gray-500 uppercase text-[9px] block">Telefon</b>${escapeHtml(a.phone || '—')}</span>
                                        <span><b class="text-gray-500 uppercase text-[9px] block">Qeydiyyat</b>${formatAzDateTime(a.createdAt || a.created_at)}</span>
                                    </div>
                                    <div class="grid grid-cols-2 md:grid-cols-6 gap-2 text-center">
                                        ${[['Elan', a.listingsCount], ['Təsdiqlənmiş', a.approvedListingsCount], ['Gözləyən', a.pendingListingsCount], ['Baxışlar', a.totalListingViews], ['Favori', a.totalFavorites || a.favoritesCount], ['Profil', `${a.profileCompletion || profileCompletionFor(a)}%`]].map(([label, value]) => `<span class="rounded-xl bg-white/5 border border-white/10 p-2"><strong class="block text-white">${value || 0}</strong><em class="not-italic text-[9px] text-gray-500 uppercase">${label}</em></span>`).join('')}
                                    </div>
                                    <p class="text-[10px] text-gray-500">Son giriş: ${lastLoginText} • Son aktivlik: ${lastActiveText} • Bio: ${escapeHtml(a.bio || '—')}</p>
                                </div>
                                <div class="flex md:flex-col items-center gap-2 shrink-0">
                                    <button type="button" data-edit-user-id="${escapeHtml(a.id)}" class="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition" aria-label="İstifadəçini redaktə et"><i class="fa-solid fa-pen"></i></button>
                                    ${!a.emailVerified ? `<button onclick="event.stopPropagation(); verifyUserEmail('${a.id}')" class="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition" aria-label="Emaili təsdiqlə"><i class="fa-solid fa-envelope-circle-check"></i></button>` : ''}
                                    <button onclick="event.stopPropagation(); toggleUserActive('${a.id}', ${a.isActive === false ? 'true' : 'false'})" class="w-9 h-9 rounded-lg ${a.isActive === false ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500' : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500'} hover:text-white transition" aria-label="Status"><i class="fa-solid ${a.isActive === false ? 'fa-check' : 'fa-ban'}"></i></button>
                                    <button onclick="event.stopPropagation(); deleteAgent('${a.id}')" class="w-9 h-9 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition" aria-label="İstifadəçini sil"><i class="fa-solid fa-trash"></i></button>
                                </div>
                            </div>
                        </div>
                    `;
                });

                // 4. Vacancies List
                const vacancies = appData.vacancies;
                const vacList = document.getElementById('admin-vacancies-list');
                vacList.innerHTML = '';
                vacancies.forEach(v => {
                    vacList.innerHTML += `
                        <div class="glass-card p-4 rounded-xl flex justify-between items-center text-xs transition ${(v.isActive ?? v.status === 'Aktiv') ? '' : 'opacity-50 grayscale'}">
                            <div>
                                <h3 class="font-bold text-white">${v.title} (${(v.isActive ?? v.status === 'Aktiv') ? 'Aktiv' : 'Bloklanıb'})</h3>
                                <span class="text-gray-400">${v.location} • ${v.salary}</span><br><span class="text-[10px] text-gray-500">Slug: ${v.slug || '—'}</span>
                            </div>
                            <div class="flex space-x-2">
                                <button onclick="editVacancy(${v.id})" class="text-blue-400 px-2 py-1 bg-blue-500/10 rounded">Redaktə</button>
                                <button onclick="toggleVacancyStatus(${v.id})" class="${(v.isActive ?? v.status === 'Aktiv') ? 'text-emerald-400 bg-emerald-500/10' : 'text-yellow-400 bg-yellow-500/10'} px-2 py-1 rounded">${(v.isActive ?? v.status === 'Aktiv') ? 'Aktiv' : 'Bloklanıb'}</button>
                                <button onclick="deleteVacancy(${v.id})" class="text-red-400 px-2 py-1 bg-red-500/10 rounded"><i class="fa-solid fa-trash"></i></button>
                            </div>
                        </div>
                    `;
                });

                // 5. Media Gallery
                renderAdminGallery();

                renderAdminAds();
                renderAdminMusicTracks();
            }
        }



        let isBroadcastSubmitting = false;
        let isBroadcastFormOpen = false;

        function setBroadcastFormOpen(isOpen) {
            isBroadcastFormOpen = Boolean(isOpen);
            document.getElementById('broadcast-form-card')?.classList.toggle('hidden', !isBroadcastFormOpen);
            document.getElementById('broadcast-form-toggle-btn')?.classList.toggle('hidden', isBroadcastFormOpen);
        }

        function resetBroadcastForm() {
            ['broadcast-title', 'broadcast-message', 'broadcast-link', 'broadcast-image-url', 'broadcast-video-url'].forEach(id => {
                const input = document.getElementById(id);
                if (input) input.value = '';
            });
        }

        function openBroadcastForm() {
            setBroadcastFormOpen(true);
        }

        function closeBroadcastForm() {
            resetBroadcastForm();
            setBroadcastFormOpen(false);
        }

        function toggleBroadcastForm() {
            if (isBroadcastFormOpen) closeBroadcastForm();
            else openBroadcastForm();
        }


        function setBroadcastButtonLoading(isLoading) {
            const btn = document.getElementById('broadcast-submit-btn');
            if (!btn) return;
            btn.disabled = Boolean(isLoading);
            btn.classList.toggle('is-loading', Boolean(isLoading));
            btn.innerHTML = isLoading ? '<span class="button-spinner"></span><span>Göndərilir…</span>' : 'Göndər';
        }

        function isAllowedBroadcastLink(link) {
            if (/^https?:\/\//i.test(link)) return true;
            if (!link.startsWith('/') || link.startsWith('//') || /^(mailto:|tel:|javascript:)/i.test(link)) return false;
            const pathOnly = link.split(/[?#]/)[0].replace(/\/$/, '') || '/';
            return ['/gallery', '/projects', '/listings'].includes(pathOnly);
        }

        function isAllowedBroadcastVideoUrl(videoUrl) {
            try {
                const parsed = new URL(videoUrl);
                const host = parsed.hostname.toLowerCase();
                return ['http:', 'https:'].includes(parsed.protocol) && (host.includes('youtube.com') || host.includes('youtu.be') || host.includes('vimeo.com') || parsed.pathname.toLowerCase().endsWith('.mp4'));
            } catch (_error) { return false; }
        }

        async function handleSendBroadcastNotification(e) {
            e.preventDefault();
            if (isBroadcastSubmitting) return;
            const title = document.getElementById('broadcast-title')?.value.trim() || '';
            const message = document.getElementById('broadcast-message')?.value.trim() || '';
            const link = document.getElementById('broadcast-link')?.value.trim() || '';
            const imageUrl = document.getElementById('broadcast-image-url')?.value.trim() || '';
            const videoUrl = document.getElementById('broadcast-video-url')?.value.trim() || '';
            if (!title || !message) return alert('Başlıq və mesaj tələb olunur.');
            if (title.length > 120) return alert('Başlıq maksimum 120 simvol olmalıdır.');
            if (message.length > 1000) return alert('Mesaj maksimum 1000 simvol olmalıdır.');
            if (link && !isAllowedBroadcastLink(link)) return alert('Link /gallery, /projects, /listings və ya http(s) URL olmalıdır.');
            if (imageUrl && !/^https?:\/\//i.test(imageUrl)) return alert('Şəkil URL http(s) formatında olmalıdır.');
            if (videoUrl && !isAllowedBroadcastVideoUrl(videoUrl)) return alert('Video URL YouTube, Vimeo və ya birbaşa MP4 linki olmalıdır.');
            if (!confirm('Bu bildiriş bütün qeydiyyatlı istifadəçilərə göndəriləcək. Davam edilsin?')) return;
            isBroadcastSubmitting = true;
            setBroadcastButtonLoading(true);
            const resultBox = document.getElementById('broadcast-result');
            if (resultBox) { resultBox.classList.add('hidden'); resultBox.textContent = ''; }
            try {
                const result = await apiRequest('/api/admin/notifications/broadcast', {
                    method: 'POST',
                    body: JSON.stringify({ title, message, link: link || null, imageUrl: imageUrl || null, videoUrl: videoUrl || null })
                });
                document.getElementById('broadcast-total-users').textContent = String(result.totalUsers || 0);
                document.getElementById('broadcast-created-count').textContent = String(result.createdCount || 0);
                document.getElementById('broadcast-failed-count').textContent = String(result.failedCount || 0);
                if (resultBox) {
                    resultBox.classList.remove('hidden');
                    resultBox.textContent = `Total users: ${result.totalUsers || 0}, Created: ${result.createdCount || 0}, Failed: ${result.failedCount || 0}`;
                }
                resetBroadcastForm();
                setBroadcastFormOpen(false);
            } catch (error) {
                alert('Broadcast bildiriş göndərilmədi: ' + error.message);
            } finally {
                isBroadcastSubmitting = false;
                setBroadcastButtonLoading(false);
            }
        }

        let isGoogleEmailSubmitting = false;

        function setGoogleEmailButtonLoading(isLoading) {
            const btn = document.getElementById('google-email-submit-btn');
            if (!btn) return;
            btn.disabled = Boolean(isLoading);
            btn.classList.toggle('is-loading', Boolean(isLoading));
            btn.innerHTML = isLoading ? '<span class="button-spinner"></span><span>Göndərilir…</span>' : 'Göndər';
        }

        function localGoogleUsersCount() {
            return [...new Set((appData.agents || [])
                .filter(user => (user.provider || 'local') === 'google')
                .map(user => String(user.email || '').trim().toLowerCase())
                .filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))].length;
        }

        async function loadGoogleEmailRecipientCount() {
            const el = document.getElementById('google-email-recipient-count');
            if (el) el.textContent = '…';
            try {
                const summary = await apiRequest('/api/admin/email/google-users/summary');
                if (el) el.textContent = String(summary.totalRecipients || 0);
                return summary.totalRecipients || 0;
            } catch (error) {
                const fallback = localGoogleUsersCount();
                if (el) el.textContent = String(fallback);
                console.warn('Google email recipient count alınmadı:', error.message);
                return fallback;
            }
        }

        async function handleSendGoogleUsersEmail(e) {
            e.preventDefault();
            if (isGoogleEmailSubmitting) return;
            const subject = document.getElementById('google-email-subject')?.value.trim() || '';
            const message = document.getElementById('google-email-message')?.value.trim() || '';
            if (!subject || !message) return alert('Subject və message tələb olunur.');
            const total = await loadGoogleEmailRecipientCount();
            if (!confirm(`Bu email Google ilə daxil olmuş ${total} istifadəçiyə göndəriləcək. Davam edilsin?`)) return;
            isGoogleEmailSubmitting = true;
            setGoogleEmailButtonLoading(true);
            const resultBox = document.getElementById('google-email-result');
            if (resultBox) { resultBox.classList.add('hidden'); resultBox.textContent = ''; }
            try {
                const result = await apiRequest('/api/admin/email/google-users', {
                    method: 'POST',
                    body: JSON.stringify({ subject, message })
                });
                document.getElementById('google-email-recipient-count').textContent = String(result.totalRecipients || 0);
                document.getElementById('google-email-sent-count').textContent = String(result.sentCount || 0);
                document.getElementById('google-email-failed-count').textContent = String(result.failedCount || 0);
                if (resultBox) {
                    resultBox.classList.remove('hidden');
                    resultBox.textContent = `Göndərildi: ${result.sentCount || 0}, Uğursuz: ${result.failedCount || 0}`;
                }
            } catch (error) {
                alert('Google istifadəçilərinə email göndərilmədi: ' + error.message);
            } finally {
                isGoogleEmailSubmitting = false;
                setGoogleEmailButtonLoading(false);
            }
        }

        // SAVE & REGISTER EVENTS
        async function handleSaveSeaBreezeItem(e) {
            e.preventDefault();
            if (isListingSaveSubmitting) return;
            isListingSaveSubmitting = true;
            setListingSaveButtonLoading(true);
            const editId = document.getElementById('edit-sb-id').value;
            const title = document.getElementById('sb-title').value;
            const regionType = document.getElementById('sb-region-type')?.value || 'seabreeze';
            const selectorValue = document.getElementById('sb-project').value;
            const project = regionType === 'seabreeze' ? selectorValue : '';
            const city = regionType === 'general' ? selectorValue : 'Sea Breeze';
            const detectedDistrict = document.getElementById('sb-district')?.value || '';
            const district = detectedDistrict || (regionType === 'seabreeze' ? project : '');
            const generalCityRegion = cityToLegacyRegion(city);
            const listingType = document.getElementById('sb-listing-type').value;
            const category = document.getElementById('sb-form-category').value;
            const rooms = parseInt(document.getElementById('sb-rooms').value);
            const area = parseFloat(document.getElementById('sb-area').value);
            const floorNumber = parseInt(document.getElementById('sb-floor-number').value);
            const floor = parseInt(document.getElementById('sb-floor').value);
            const land = document.getElementById('sb-land').value ? parseFloat(document.getElementById('sb-land').value) : null;
            const price = parseFloat(document.getElementById('sb-price').value);
            const desc = document.getElementById('sb-desc').value;
            const currency = document.getElementById('sb-currency')?.value || 'AZN';
            const isCredit = document.getElementById('sb-is-credit')?.checked || false;
            const ownerType = document.getElementById('sb-owner-type')?.value || 'owner';
            const hasDocument = document.getElementById('sb-has-document')?.checked || false;
            const creditDownPayment = document.getElementById('sb-credit-down')?.value ? parseFloat(document.getElementById('sb-credit-down').value) : null;
            const creditMonthlyPayment = document.getElementById('sb-credit-monthly')?.value ? parseFloat(document.getElementById('sb-credit-monthly').value) : null;
            const creditYears = document.getElementById('sb-credit-years')?.value ? parseInt(document.getElementById('sb-credit-years').value, 10) : null;
            const settlement = document.getElementById('sb-settlement')?.value.trim() || '';
            const metroStation = document.getElementById('sb-metro')?.value || '';
            const streetAddress = document.getElementById('sb-street-address')?.value.trim() || '';
            const latitude = safeNumber(document.getElementById('sb-latitude')?.value);
            const longitude = safeNumber(document.getElementById('sb-longitude')?.value);

            const listingLatitude = isValidCoordinate(latitude, longitude) ? latitude : null;
            const listingLongitude = isValidCoordinate(latitude, longitude) ? longitude : null;

            if (!editId && !(await ensureListingContactPhone())) {
                isListingSaveSubmitting = false;
                setListingSaveButtonLoading(false);
                return;
            }

            if (!floorNumber || floorNumber < 1) {
                alert('Yerləşdiyi mərtəbə minimum 1 olmalıdır.');
                isListingSaveSubmitting = false;
                setListingSaveButtonLoading(false);
                return;
            }
            if (!floor || floor < 1) {
                alert('Mərtəbə sayı bütün əmlak növləri üçün minimum 1 olmalıdır.');
                isListingSaveSubmitting = false;
                setListingSaveButtonLoading(false);
                return;
            }
            if (category === 'LandSale' && (!land || land <= 0)) {
                alert('Torpaq satışı üçün torpaq sahəsi daxil edilməlidir.');
                isListingSaveSubmitting = false;
                setListingSaveButtonLoading(false);
                return;
            }

            const urlImg = document.getElementById('sb-img-url').value.trim();
            const officialProjectImage = getOfficialProjects().find(item => item.title === project)?.img;
            const existingImageUrls = uploadedListingImages.filter(src => !String(src).startsWith('blob:'));
            const fallbackImage = urlImg || officialProjectImage || "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80";
            if (!uploadedListingImageFiles.length && !existingImageUrls.length && !urlImg && !editId) {
                existingImageUrls.push(fallbackImage);
            }
            const coverImg = existingImageUrls[0] || urlImg || fallbackImage;

            const list = [...appData.listings];
            const itemPayload = {
                id: editId || null,
                title,
                project,
                regionType,
                city,
                district,
                settlement,
                metroStation,
                streetAddress,
                latitude: listingLatitude,
                longitude: listingLongitude,
                generalCityRegion,
                listingType,
                category,
                rooms,
                area,
                floorNumber,
                floorCount: floor,
                floor,
                land,
                price,
                currency,
                isCredit,
                ownerType,
                hasDocument,
                creditDownPayment,
                creditMonthlyPayment,
                creditYears,
                img: coverImg,
                images: [coverImg, ...existingImageUrls.filter(url => url !== coverImg)],
                desc,
                authorId: activeUser.id,
                status: 'Təsdiqlənmiş'
            };

            const formData = new FormData();
            const apiPayload = uiListingToApi(itemPayload);
            Object.entries(apiPayload).forEach(([key, value]) => {
                if (value !== undefined && value !== null && key !== 'images') formData.append(key, value);
            });
            const orderedFiles = [];
            const imageOrder = [];
            uploadedListingImages.forEach((src, index) => {
                const file = uploadedListingImageFiles[index];
                if (file) {
                    imageOrder.push({ type: 'file', fileIndex: orderedFiles.length });
                    orderedFiles.push(file);
                } else if (src && !String(src).startsWith('blob:')) {
                    imageOrder.push({ type: 'url', url: src });
                }
            });
            orderedFiles.forEach(file => formData.append('images', file));
            if (existingImageUrls.length) formData.append('existing_images', JSON.stringify(existingImageUrls));
            if (imageOrder.length) formData.append('image_order', JSON.stringify(imageOrder));
            if (urlImg) formData.append('image_url', urlImg);

            try {
                requireAuthTokenForListing();
                setListingFormDisabled('admin-listing-form', true);
                showListingSubmissionOverlay();
                const saved = editId
                    ? await uploadFormDataWithProgress(`/api/listings/${editId}`, formData, 'sb-upload-progress', 'PUT')
                    : await uploadFormDataWithProgress('/api/listings', formData, 'sb-upload-progress', 'POST');
                const savedListing = extractListingFromResponse(saved);
                const savedUi = dbListingToUi(savedListing);
                const idx = list.findIndex(x => String(x.id) === String(editId));
                if (idx > -1) list[idx] = savedUi;
                else list.unshift(savedUi);
                cacheData('listings', list);
                if (isAdminRole(activeUser?.role)) await loadAdminListings({ render: false }).catch(() => {});
                resetSeaBreezeForm();
                renderAdminDashboard();
                renderSeaBreeze();
                hideListingSubmissionOverlay();
            } catch (error) {
                hideListingSubmissionOverlay();
                alert('Elan API-yə yazılmadı: ' + error.message);
            } finally {
                isListingSaveSubmitting = false;
                setListingSaveButtonLoading(false);
                setListingFormDisabled('admin-listing-form', false);
            }
        }

        function editSeaBreezeItem(id) {
            const list = appData.listings;
            const p = list.find(x => String(x.id) === String(id));
            if (p) {
                document.getElementById('edit-sb-id').value = p.id;
                document.getElementById('sb-title').value = p.title;
                document.getElementById('sb-region-type').value = normalizeRegionType(p.regionType, p.project) === 'seabreeze' ? 'seabreeze' : 'general';
                handleListingRegionTypeChange(p.category || 'Apartment');
                document.getElementById('sb-project').value = normalizeRegionType(p.regionType, p.project) === 'seabreeze' ? (getListingDistrict(p) || p.project) : (p.city || legacyRegionToCity(getListingRegionType(p)) || 'Bakı');
                syncGeneralDistrictSelect();
                if (document.getElementById('sb-district')) document.getElementById('sb-district').value = p.district || '';
                if (document.getElementById('sb-general-district') && p.district) {
                    const districtSelect = document.getElementById('sb-general-district');
                    if (Array.from(districtSelect.options).some(opt => opt.value === p.district)) districtSelect.value = p.district;
                }
                document.getElementById('sb-settlement').value = p.settlement || '';
                toggleMetroFieldForCity();
                document.getElementById('sb-metro').value = p.metroStation || '';
                document.getElementById('sb-street-address').value = p.streetAddress || '';
                document.getElementById('sb-latitude').value = isValidCoordinate(p.latitude, p.longitude) ? Number(p.latitude).toFixed(7) : '';
                document.getElementById('sb-longitude').value = isValidCoordinate(p.latitude, p.longitude) ? Number(p.longitude).toFixed(7) : '';
                document.getElementById('sb-manual-pin-note')?.classList.add('hidden');
                setTimeout(() => { initAdminListingMap(); if (isValidCoordinate(p.latitude, p.longitude)) setAdminListingCoordinates(p.latitude, p.longitude); }, 120);
                document.getElementById('sb-listing-type').value = p.listingType;
                document.getElementById('sb-form-category').value = p.category || "Apartment";
                document.getElementById('sb-rooms').value = p.rooms;
                document.getElementById('sb-area').value = p.area;
                document.getElementById('sb-floor-number').value = p.floorNumber || p.floor || 1;
                document.getElementById('sb-floor').value = p.floorCount || p.floor || 1;
                document.getElementById('sb-land').value = p.land || '';
                document.getElementById('sb-price').value = p.price;
                document.getElementById('sb-currency').value = p.currency || 'AZN';
                document.getElementById('sb-is-credit').checked = Boolean(p.isCredit);
                document.getElementById('sb-owner-type').value = p.ownerType || 'owner';
                document.getElementById('sb-has-document').checked = Boolean(p.hasDocument);
                toggleCreditFields();
                document.getElementById('sb-credit-down').value = p.creditDownPayment || '';
                document.getElementById('sb-credit-monthly').value = p.creditMonthlyPayment || '';
                document.getElementById('sb-credit-years').value = p.creditYears || '';
                document.getElementById('sb-desc').value = p.desc;

                uploadedListingImages = Array.isArray(p.images) && p.images.length ? [...p.images] : (p.img ? [p.img] : []);
                uploadedListingImageFiles = uploadedListingImages.map(() => null);
            document.getElementById('sb-img-url').value = '';
                document.getElementById('sb-img-preview-val').value = '';
                renderListingImagesPreview();

                document.getElementById('sb-form-action-title').textContent = "Elanı Redaktə Et";
                toggleFormFieldsBasedOnCategory();
                setSeaBreezeFormOpen(true, { focusTitle: true });
            }
        }

        function resetSeaBreezeForm() {
            document.getElementById('edit-sb-id').value = '';
            document.getElementById('sb-title').value = '';
            document.getElementById('sb-listing-type').value = 'Satis';
            document.getElementById('sb-region-type').value = 'seabreeze';
            handleListingRegionTypeChange();
            document.getElementById('sb-form-category').value = 'Apartment';
            document.getElementById('sb-rooms').value = '2';
            document.getElementById('sb-area').value = '';
            document.getElementById('sb-floor-number').value = '1';
            document.getElementById('sb-floor').value = '1';
            document.getElementById('sb-land').value = '';
            document.getElementById('sb-price').value = '';
            document.getElementById('sb-currency').value = 'AZN';
            document.getElementById('sb-is-credit').checked = false;
            document.getElementById('sb-owner-type').value = 'owner';
            document.getElementById('sb-has-document').checked = false;
            toggleCreditFields();
            document.getElementById('sb-credit-down').value = '';
            document.getElementById('sb-credit-monthly').value = '';
            document.getElementById('sb-credit-years').value = '';
            document.getElementById('sb-settlement').value = '';
            if (document.getElementById('sb-district')) document.getElementById('sb-district').value = '';
            syncGeneralDistrictSelect();
            document.getElementById('sb-metro').value = '';
            document.getElementById('sb-street-address').value = '';
            document.getElementById('sb-latitude').value = '';
            document.getElementById('sb-longitude').value = '';
            document.getElementById('sb-location-search').value = '';
            document.getElementById('sb-location-results')?.classList.add('hidden');
            document.getElementById('sb-manual-pin-note')?.classList.add('hidden');
            if (adminListingMarker) { adminListingMarker.remove(); adminListingMarker = null; }
            setTimeout(initAdminListingMap, 80);
            document.getElementById('sb-img-url').value = '';
            document.getElementById('sb-img-preview-val').value = '';
            uploadedListingImages = [];
            uploadedListingImageFiles = [];
            renderListingImagesPreview();
            document.getElementById('sb-desc').value = '';
            document.getElementById('sb-file-name-badge').classList.add('hidden');
            document.getElementById('sb-form-action-title').textContent = "Yeni Elan Əlavə Et";
            toggleFormFieldsBasedOnCategory();
        }

        async function deleteSeaBreezeItem(id, button = null) {
            const restore = beginAdminAction(button, `listing-delete:${id}`, 'Silinir...');
            if (!restore) return;
            try {
                await apiRequest(`/api/listings/${id}`, { method: 'DELETE' });
                cacheData('listings', appData.listings.filter(x => String(x.id) !== String(id)));
                if (isAdminRole(activeUser?.role)) await loadAdminListings({ render: false }).catch(() => {});
                renderAdminDashboard();
                renderSeaBreeze();
                showToast('✅ Elan silindi.');
            } catch (error) {
                alert('Elan API-dən silinmədi: ' + error.message);
            } finally {
                finishAdminAction(restore);
            }
        }

        async function approveListing(id, button = null) {
            return window.BestHomeAdminListings?.approveListing(id, button);
        }

        async function rejectListing(id, button = null) {
            return window.BestHomeAdminListings?.rejectListing(id, button);
        }


        async function deactivateListing(id, button = null) {
            return window.BestHomeAdminListings?.deactivateListing(id, button);
        }

        // USER REGISTRATION / EDITING
        function roleLabel(role) {
            return isAdminRole(role) ? 'Admin' : 'İstifadəçi';
        }

        async function handleRegisterAgent(e) {
            e.preventDefault();
            if (isUserActionSubmitting) return;
            isUserActionSubmitting = true;
            setUserCreateButtonLoading(true);
            const newUser = {
                fullname: document.getElementById('agent-reg-fullname').value.trim(),
                email: document.getElementById('agent-reg-email').value.trim(),
                phone: document.getElementById('agent-reg-phone').value.trim(),
                role: document.getElementById('agent-reg-role').value,
                password: document.getElementById('agent-reg-pass').value
            };
            try {
                const created = await apiRequest('/api/users', {
                    method: 'POST',
                    body: JSON.stringify(newUser)
                });
                cacheData('agents', [userToUi(created), ...appData.agents]);
                document.getElementById('agent-reg-fullname').value = '';
                document.getElementById('agent-reg-email').value = '';
                document.getElementById('agent-reg-phone').value = '';
                document.getElementById('agent-reg-role').value = 'user';
                document.getElementById('agent-reg-pass').value = '';
                renderAdminDashboard();
            } catch (error) {
                alert('İstifadəçi API-yə yazılmadı: ' + error.message);
            } finally {
                isUserActionSubmitting = false;
                setUserCreateButtonLoading(false);
            }
        }

        function openUserEditModal(id) {
            const user = appData.agents.find(x => String(x.id) === String(id));
            const modal = document.getElementById('user-edit-modal');
            if (!user || !modal) return;
            document.getElementById('edit-user-id').value = user.id;
            document.getElementById('edit-user-fullname').value = user.fullname || `${user.name || ''} ${user.surname || ''}`.trim();
            document.getElementById('edit-user-email').value = user.email || '';
            document.getElementById('edit-user-phone').value = user.phone || '';
            document.getElementById('edit-user-role').value = normalizeAuthRole(user.role);
            document.getElementById('edit-user-email-verified').checked = Boolean(user.emailVerified);
            const password = document.getElementById('edit-user-password');
            if (password) password.value = '';
            modal.classList.remove('hidden', 'active', 'open', 'show', 'visible');
            modal.setAttribute('aria-hidden', 'false');
            setModalOpenState(true);
        }

        function closeUserEditModal() {
            const modal = document.getElementById('user-edit-modal');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('active', 'is-active', 'open', 'is-open', 'show', 'visible', 'backdrop-active', 'overlay-active');
                modal.setAttribute('aria-hidden', 'true');
                modal.style.display = '';
                modal.style.visibility = '';
            }
            document.getElementById('edit-user-id').value = '';
            const phone = document.getElementById('edit-user-phone');
            if (phone) phone.value = '';
            const pass = document.getElementById('edit-user-password');
            if (pass) pass.value = '';
            syncModalOpenState();
        }

        function bindUserEditModalHandlers() {
            if (window.__userEditModalHandlersBound) return;
            window.__userEditModalHandlersBound = true;
            document.addEventListener('click', (event) => {
                const editButton = event.target.closest('[data-edit-user-id]');
                if (editButton) {
                    event.preventDefault();
                    event.stopPropagation();
                    openUserEditModal(editButton.dataset.editUserId);
                    return;
                }
                if (event.target.closest('[data-close-user-edit-modal]')) {
                    event.preventDefault();
                    event.stopPropagation();
                    closeUserEditModal();
                    return;
                }
                const modal = document.getElementById('user-edit-modal');
                if (modal && event.target === modal) closeUserEditModal();
            });
            document.addEventListener('keydown', (event) => {
                if (event.key !== 'Escape') return;
                const modal = document.getElementById('user-edit-modal');
                if (modal && !modal.classList.contains('hidden')) closeUserEditModal();
            });
        }

        async function handleSaveUserEdit(e) {
            e.preventDefault();
            if (isUserActionSubmitting) return;
            isUserActionSubmitting = true;
            setUserEditButtonLoading(true);
            const id = document.getElementById('edit-user-id').value;
            const payload = {
                fullname: document.getElementById('edit-user-fullname').value.trim(),
                email: document.getElementById('edit-user-email').value.trim(),
                phone: document.getElementById('edit-user-phone').value.trim(),
                role: document.getElementById('edit-user-role').value,
                emailVerified: document.getElementById('edit-user-email-verified').checked
            };
            const password = document.getElementById('edit-user-password')?.value.trim();
            if (password) payload.password = password;
            try {
                const updated = await apiRequest(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
                cacheData('agents', appData.agents.map(x => String(x.id) === String(id) ? userToUi(updated) : x));
                closeUserEditModal();
                renderAdminDashboard();
            } catch (error) {
                alert('İstifadəçi yenilənmədi: ' + error.message);
            } finally {
                isUserActionSubmitting = false;
                setUserEditButtonLoading(false);
            }
        }


        async function verifyUserEmail(id) {
            if (isUserActionSubmitting) return;
            isUserActionSubmitting = true;
            setUserActionStatusLoading(true, 'Email təsdiqlənir…');
            try {
                const updated = await apiRequest(`/api/users/${id}/verify-email`, { method: 'PATCH' });
                const idx = appData.agents.findIndex(x => String(x.id) === String(id));
                if (idx > -1) appData.agents[idx] = userToUi(updated);
                renderAdminDashboard();
            } catch (error) { alert('Email təsdiqlənmədi: ' + (error.message || 'Xəta')); }
            finally { isUserActionSubmitting = false; setUserActionStatusLoading(false); }
        }

        async function toggleUserActive(id, activate) {
            if (isUserActionSubmitting) return;
            isUserActionSubmitting = true;
            setUserActionStatusLoading(true, activate ? 'İstifadəçi aktiv edilir…' : 'İstifadəçi bloklanır…');
            try {
                const updated = await apiRequest(`/api/users/${id}/${activate ? 'activate' : 'block'}`, { method: 'PATCH' });
                const idx = appData.agents.findIndex(x => String(x.id) === String(id));
                if (idx > -1) appData.agents[idx] = userToUi(updated);
                renderAdminDashboard();
            } catch (error) { alert('İstifadəçi statusu dəyişmədi: ' + error.message); }
            finally { isUserActionSubmitting = false; setUserActionStatusLoading(false); }
        }

        async function deleteAgent(id) {
            if (!confirm('Bu istifadəçini silmək istədiyinizə əminsiniz?') || isUserActionSubmitting) return;
            isUserActionSubmitting = true;
            setUserActionStatusLoading(true, 'İstifadəçi silinir…');
            try {
                await apiRequest(`/api/users/${id}`, { method: 'DELETE' });
                cacheData('agents', appData.agents.filter(x => String(x.id) !== String(id)));
                renderAdminDashboard();
            } catch (error) {
                alert('İstifadəçi API-dən silinmədi: ' + error.message);
            } finally { isUserActionSubmitting = false; setUserActionStatusLoading(false); }
        }

        // SAVE & MANAGE VACANCIES (ACTIVE / BLOCKED LOGIC)
        async function handleSaveVacancy(e) {
            e.preventDefault();
            if (isVacancySaveSubmitting) return;
            isVacancySaveSubmitting = true;
            setVacancySaveButtonLoading(true);
            const editId = document.getElementById('edit-vac-id').value;
            const list = [...appData.vacancies];
            const existingVacancy = list.find(v => String(v.id) === String(editId));
            const existingAktiv = existingVacancy ? (existingVacancy.isActive ?? existingVacancy.status === 'Aktiv') : true;
            const vacancyPayload = {
                id: editId || null,
                title: document.getElementById('vac-title').value,
                type: document.getElementById('vac-type').value,
                salary: document.getElementById('vac-salary').value,
                location: document.getElementById('vac-location').value,
                desc: document.getElementById('vac-desc').value,
                slug: document.getElementById('vac-slug').value.trim(),
                status: existingAktiv ? "Aktiv" : "Bloklanıb",
                isActive: existingAktiv
            };

            try {
                const saved = editId
                    ? await apiRequest(`/api/vacancies/${editId}`, { method: 'PUT', body: JSON.stringify(uiVacancyToApi(vacancyPayload)) })
                    : await apiRequest('/api/vacancies', { method: 'POST', body: JSON.stringify(uiVacancyToApi(vacancyPayload)) });
                const savedUi = dbVacancyToUi(saved);
                const idx = list.findIndex(v => String(v.id) === String(editId));
                if (idx > -1) list[idx] = savedUi;
                else list.unshift(savedUi);
                cacheData('vacancies', list);
                document.getElementById('edit-vac-id').value = '';
                document.getElementById('vac-title').value = '';
                document.getElementById('vac-slug').value = '';
                document.getElementById('vac-type').value = '';
                document.getElementById('vac-salary').value = '';
                document.getElementById('vac-location').value = '';
                document.getElementById('vac-desc').value = '';
                document.getElementById('vac-form-title').textContent = "Yeni Vakansiya";
                renderAdminDashboard();
                renderCareerSection();
            } catch (error) {
                alert('Vakansiya API-yə yazılmadı: ' + error.message);
            } finally {
                isVacancySaveSubmitting = false;
                setVacancySaveButtonLoading(false);
            }
        }

        function editVacancy(id) {
            const list = appData.vacancies;
            const v = list.find(x => x.id === id);
            if (v) {
                document.getElementById('edit-vac-id').value = v.id;
                document.getElementById('vac-title').value = v.title;
                document.getElementById('vac-slug').value = v.slug || '';
                document.getElementById('vac-type').value = v.type;
                document.getElementById('vac-salary').value = v.salary;
                document.getElementById('vac-location').value = v.location;
                document.getElementById('vac-desc').value = v.desc;
                document.getElementById('vac-form-title').textContent = "Vakansiyanı Redaktə Et";
            }
        }

        async function toggleVacancyStatus(id) {
            const list = [...appData.vacancies];
            const idx = list.findIndex(x => String(x.id) === String(id));
            if (idx === -1) return;

            const previous = { ...list[idx] };
            const nextAktiv = !(previous.isActive ?? previous.status === 'Aktiv');
            list[idx] = { ...previous, isActive: nextAktiv, status: nextAktiv ? 'Aktiv' : 'Bloklanıb' };
            cacheData('vacancies', list);
            renderAdminDashboard();
            renderCareerSection();

            try {
                const updated = await apiRequest(`/api/vacancies/${id}/toggle`, { method: 'PATCH' });
                list[idx] = dbVacancyToUi(updated);
                cacheData('vacancies', list);
                renderAdminDashboard();
                renderCareerSection();
            } catch (error) {
                list[idx] = previous;
                cacheData('vacancies', list);
                renderAdminDashboard();
                renderCareerSection();
                alert('Vakansiya statusu dəyişmədi: ' + error.message);
            }
        }

        async function deleteVacancy(id) {
            try {
                await apiRequest(`/api/vacancies/${id}`, { method: 'DELETE' });
                cacheData('vacancies', appData.vacancies.filter(x => String(x.id) !== String(id)));
                renderAdminDashboard();
                renderCareerSection();
            } catch (error) {
                alert('Vakansiya API-dən silinmədi: ' + error.message);
            }
        }


        // SAVE & MANAGE GALLERY (EVENTS / VIDEOS)
        let isGalleryFormOpen = true;

        function getGalleryFormWrapper() {
            return document.getElementById('admin-gallery-form-wrapper') || document.getElementById('admin-gallery-form-card');
        }

        function setGalleryFormOpen() {
            isGalleryFormOpen = true;
            const wrapper = getGalleryFormWrapper();
            if (wrapper) {
                wrapper.classList.remove('hidden');
                wrapper.hidden = false;
                wrapper.style.display = 'block';
                wrapper.setAttribute('aria-hidden', 'false');
            }
            const toggleButton = document.getElementById('gallery-form-toggle-btn');
            if (toggleButton) toggleButton.classList.add('hidden');
        }

        function openGalleryForm(event) {
            event?.preventDefault?.();
            setGalleryFormOpen();
        }

        function closeGalleryForm(event) {
            event?.preventDefault?.();
            resetGalleryForm();
            setGalleryFormOpen();
        }

        function toggleGalleryForm(event) {
            event?.preventDefault?.();
            setGalleryFormOpen();
        }

        window.toggleGalleryForm = toggleGalleryForm;
        window.openGalleryForm = openGalleryForm;
        window.closeGalleryForm = closeGalleryForm;

        setGalleryFormOpen();
        document.addEventListener('DOMContentLoaded', setGalleryFormOpen);

        function renderGalleryVideoFormPreview() {
            const preview = document.getElementById('gallery-video-form-preview');
            const input = document.getElementById('g-video-url');
            if (!preview || !input) return;

            const url = input.value.trim();
            preview.innerHTML = '';
            preview.classList.add('hidden');
            if (!url) return;

            const youtubeId = getYouTubeVideoId(url);
            const showPreview = (markup) => {
                preview.innerHTML = markup;
                preview.classList.remove('hidden');
            };

            if (youtubeId) {
                const maxres = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
                const hq = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
                showPreview(`
                    <div class="relative h-full w-full bg-slate-900">
                        <img src="${escapeHtml(maxres)}" data-fallback-src="${escapeHtml(hq)}" onerror="handleGalleryThumbnailError(this)" alt="Video önizləmə" class="h-full w-full object-cover">
                        <div class="absolute inset-0 flex items-center justify-center bg-black/15"><span class="h-12 w-12 rounded-full bg-white/95 text-slate-950 flex items-center justify-center shadow-xl"><i class="fa-solid fa-play ml-0.5"></i></span></div>
                    </div>
                `);
                return;
            }

            if (/^https?:\/\/.+/i.test(url)) {
                showPreview(`<video src="${escapeHtml(url)}" controls muted preload="metadata" class="h-full w-full bg-black object-contain"></video>`);
            }
        }

        window.renderGalleryVideoFormPreview = renderGalleryVideoFormPreview;

        function toggleGalleryTypeFields() {
            const type = document.getElementById('g-type')?.value;
            if (type === 'event') {
                document.getElementById('gallery-event-fields')?.classList.remove('hidden');
                document.getElementById('gallery-video-fields')?.classList.add('hidden');
            } else {
                document.getElementById('gallery-event-fields')?.classList.add('hidden');
                document.getElementById('gallery-video-fields')?.classList.remove('hidden');
                renderGalleryVideoFormPreview();
            }
        }

        async function handleSaveGalleryItem(e) {
            e.preventDefault();
            if (isGallerySaveSubmitting) return;
            isGallerySaveSubmitting = true;
            setGallerySaveButtonLoading(true);
            const editId = document.getElementById('edit-g-id').value;
            const title = document.getElementById('g-title').value;
            const type = document.getElementById('g-type').value;
            const desc = document.getElementById('g-desc').value;
            const videoUrl = document.getElementById('g-video-url').value.trim();
            const videoFile = document.getElementById('g-video-file')?.files?.[0];
            const mediaType = type === 'video' ? 'video' : 'image';
            const galleryPayload = {
                id: editId || null,
                title,
                type,
                desc,
                images: type === 'event' ? uploadedEventImages : [],
                url: type === 'video' ? normalizeGalleryVideoUrl(videoUrl) : '',
                thumbnail: type === 'video' ? (editingGalleryThumbnail || getYouTubeThumbnail(videoUrl) || getVimeoThumbnail(videoUrl)) : ''
            };
            if (type === 'event' && galleryPayload.images.length === 0 && uploadedEventImageFiles.length === 0) {
                alert('Qalereya üçün ən azı bir şəkil seçin.');
                isGallerySaveSubmitting = false;
                setGallerySaveButtonLoading(false);
                return;
            }
            if (type === 'video' && !videoUrl && !videoFile) {
                alert('Video URL daxil edin və ya MP4 fayl seçin.');
                isGallerySaveSubmitting = false;
                setGallerySaveButtonLoading(false);
                return;
            }

            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', desc);
            formData.append('media_type', mediaType);
            formData.append('mediaType', mediaType);
            if (type === 'event') {
                uploadedEventImageFiles.forEach(file => formData.append('images', file));
                const existingImages = uploadedEventImages.filter(src => !String(src).startsWith('blob:'));
                if (existingImages.length) formData.append('existing_images', JSON.stringify(existingImages));
            } else {
                if (videoUrl) formData.append('video_url', videoUrl);
                if (videoFile) formData.append('video', videoFile);
                if (galleryPayload.thumbnail) formData.append('thumbnail_url', galleryPayload.thumbnail);
            }

            try {
                if (editId) await apiRequest(`/api/gallery/${editId}`, 'PUT', formData);
                else await apiRequest('/api/gallery', 'POST', formData);
                await loadGalleryPage(window.BestHomeGallery.getPagination().page || 1);
                await refreshAdminStats({ render: true }).catch(() => {});
                renderPortfolio();
                resetGalleryForm();
                setGalleryFormOpen();
                renderAdminDashboard();
            } catch (error) {
                alert('Qalereya API-yə yazılmadı: ' + error.message);
            } finally {
                isGallerySaveSubmitting = false;
                setGallerySaveButtonLoading(false);
            }
        }

        function editGalleryItem(id) {
            const list = appData.gallery;
            const g = list.find(x => String(x.id) === String(id));
            if (g) {
                document.getElementById('edit-g-id').value = g.id;
                document.getElementById('g-title').value = g.title;
                document.getElementById('g-type').value = g.media_type === 'video' || g.mediaType === 'video' || g.type === 'video' ? 'video' : 'event';
                document.getElementById('g-desc').value = g.desc || '';
                toggleGalleryTypeFields();

                if (document.getElementById('g-type').value === 'event') {
                    uploadedEventImages = g.images || [];
                    uploadedEventImageFiles = [];
                    document.getElementById('g-images-count').textContent = `${uploadedEventImages.length} şəkil yaddaşdadır`;
                    renderGalleryMultiPreview();
                } else {
                    document.getElementById('g-video-url').value = g.video_url || g.videoUrl || g.url || '';
                    editingGalleryThumbnail = g.thumbnail_url || g.thumbnailUrl || g.thumbnail || '';
                    renderGalleryVideoFormPreview();
                }
                document.getElementById('gallery-form-title').textContent = "Media Elementini Redaktə Et";
                openGalleryForm();
            }
        }

        function resetGalleryForm() {
            document.getElementById('edit-g-id').value = '';
            document.getElementById('g-title').value = '';
            document.getElementById('g-type').value = 'event';
            document.getElementById('g-video-url').value = '';
            editingGalleryThumbnail = '';
            renderGalleryVideoFormPreview();
            if (document.getElementById('g-video-file')) document.getElementById('g-video-file').value = '';
            document.getElementById('g-desc').value = '';
            uploadedEventImages = [];
            uploadedEventImageFiles = [];
            document.getElementById('gallery-multi-preview').innerHTML = '';
            document.getElementById('g-images-count').textContent = '0 şəkil seçildi';
            document.getElementById('gallery-form-title').textContent = "Yeni Qalereya";
            toggleGalleryTypeFields();
        }

        async function deleteGalleryItem(id) {
            try {
                await apiRequest(`/api/gallery/${id}`, { method: 'DELETE' });
                cacheData('gallery', appData.gallery.filter(x => String(x.id) !== String(id)));
                await loadGalleryPage(window.BestHomeGallery.getPagination().page || 1);
                await refreshAdminStats({ render: true }).catch(() => {});
                renderAdminDashboard();
                renderPortfolio();
            } catch (error) {
                alert('Qalereya API-dən silinmədi: ' + error.message);
            }
        }

        async function deleteApp(id) {
            try {
                await apiRequest(`/api/applications/${id}`, { method: 'DELETE' });
                cacheData('applications', appData.applications.filter(x => String(x.id) !== String(id)));
                renderAdminDashboard();
            } catch (error) {
                alert('Müraciət API-dən silinmədi: ' + error.message);
            }
        }

        // LIGHTBOX GENERAL PREVIEW
        let lightboxImages = [];
        let lightboxIndex = 0;
        let lightboxScale = 1;
        let lastLightboxTapAt = 0;
        let pinchStartDistance = 0;
        let pinchStartScale = 1;

        function getModalItemMedia(item) {
            if (!item) return [];
            return item.type === 'event' ? (item.images || []) : [item.url].filter(Boolean);
        }

        function updateModalDetails(item) {
            const isVideo = item?.type === 'video';
            document.getElementById('modal-media-badge').className = `inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-extrabold ${isVideo ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`;
            document.getElementById('modal-media-badge').textContent = isVideo ? 'Video' : 'Foto';
            document.getElementById('modal-title').textContent = item?.title || '';
            document.getElementById('modal-description').textContent = item?.desc || 'Təsvir əlavə edilməyib.';
            document.getElementById('modal-date').innerHTML = `<i class="fa-regular fa-calendar mr-1"></i>${formatAzDate(item?.createdAt)}`;
        }

        function renderModalThumbnails(item, media) {
            const strip = document.getElementById('modal-thumbnails');
            if (!strip) return;
            if (item.type !== 'event' || media.length <= 1) {
                strip.classList.add('hidden');
                strip.innerHTML = '';
                return;
            }
            strip.classList.remove('hidden');
            strip.innerHTML = media.map((src, idx) => `
                <button onclick="selectModalMedia(${idx})" class="aspect-square rounded-xl overflow-hidden border-2 transition ${idx === activeModalMediaIndex ? 'border-brand-500 ring-2 ring-brand-100' : 'border-transparent opacity-75 hover:opacity-100'}">
                    <img src="${escapeHtml(src)}" width="160" height="120" loading="lazy" decoding="async" class="w-full h-full object-cover" alt="Miniatür ${idx + 1}">
                </button>
            `).join('');
        }

        function renderModalMedia() {
            const item = activeModalGalleryItems[activeModalGalleryIndex];
            if (!item) return;
            const media = getModalItemMedia(item);
            activeModalMediaIndex = Math.max(0, Math.min(activeModalMediaIndex, Math.max(0, media.length - 1)));
            const current = media[activeModalMediaIndex] || item.thumbnail || '';
            const content = document.getElementById('modal-content');
            const isVideo = item.type === 'video';
            lightboxImages = media;
            lightboxIndex = activeModalMediaIndex;
            lightboxScale = Math.max(1, Math.min(lightboxScale, 3));

            if (isVideo) {
                const url = item.url ? normalizeGalleryVideoUrl(item.url) : '';
                const thumb = getGalleryVideoThumbnail(item);
                const fallbackThumb = getGalleryVideoThumbnailFallback(item);
                const isMp4 = /\.(mp4|webm|mov)($|[?#])/i.test(url) || url.startsWith('/uploads/');
                if (url) {
                    content.innerHTML = isMp4
                        ? `<video src="${escapeHtml(url)}" controls playsinline class="w-full h-full max-h-[70vh] object-contain bg-black"></video>`
                        : `<iframe src="${escapeHtml(url)}" class="w-full h-full min-h-[320px] md:min-h-[520px]" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
                } else if (thumb) {
                    content.innerHTML = `<div class="media-shell w-full h-full min-h-[280px] md:min-h-[520px] bg-gray-100 media-skeleton flex items-center justify-center"><img src="${escapeHtml(thumb)}" ${fallbackThumb ? `data-fallback-src="${escapeHtml(fallbackThumb)}"` : ''} loading="eager" decoding="async" onload="markMediaLoaded(this)" onerror="handleGalleryThumbnailError(this)" class="premium-lightbox-image gallery-media w-full h-full max-h-[70vh] object-contain" alt="${escapeHtml(item.title)}"></div>`;
                } else {
                    content.innerHTML = `<div class="w-full min-h-[320px] md:min-h-[520px] flex flex-col items-center justify-center text-white bg-gradient-to-br from-slate-950 via-slate-800 to-brand-900"><div class="w-20 h-20 rounded-full bg-white/95 text-slate-950 flex items-center justify-center text-3xl shadow-2xl"><i class="fa-solid fa-play ml-1"></i></div><span class="mt-4 text-sm font-black uppercase tracking-[0.3em] text-white/75">Video</span></div>`;
                }
            } else {
                content.innerHTML = `<div class="media-shell w-full h-full min-h-[280px] md:min-h-[520px] bg-gray-100 media-skeleton flex items-center justify-center"><img id="premium-lightbox-img" src="${escapeHtml(current)}" loading="eager" decoding="async" onload="markMediaLoaded(this)" class="premium-lightbox-image gallery-media w-full h-full max-h-[70vh] object-contain ${lightboxScale > 1 ? 'is-zoomed' : ''}" style="transform: scale(${lightboxScale})" alt="${escapeHtml(item.title)}"></div>`;
            }

            updateModalDetails(item);
            renderModalThumbnails(item, media);
            const itemCounter = activeModalGalleryItems.length > 1 ? `Image ${activeModalGalleryIndex + 1} / ${activeModalGalleryItems.length}` : '';
            const mediaCounter = media.length > 1 ? ` • ${activeModalMediaIndex + 1} / ${media.length}` : '';
            document.getElementById('modal-counter').textContent = `${itemCounter}${mediaCounter}`.replace(/^ • /, '');
            document.getElementById('modal-slider-controls').className = (activeModalGalleryItems.length > 1 || media.length > 1) ? 'absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-3 md:px-5 pointer-events-none' : 'hidden';
        }

        function orderedGalleryItems() {
            return [...appData.gallery].sort((a, b) => (Number(a.sortOrder || 0) - Number(b.sortOrder || 0)) || new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        }

        function openFeaturedVideoModal(index = window.BestHomeGallery.getFeaturedVideoIndex()) {
            const videos = featuredVideos();
            const selected = videos[index] || videos[0];
            if (!selected) return;
            window.BestHomeGallery.setFeaturedVideoIndex(Math.max(0, videos.findIndex(item => String(item.id) === String(selected.id))));
            activeModalGalleryItems = videos;
            activeModalGalleryIndex = window.BestHomeGallery.getFeaturedVideoIndex();
            activeModalMediaIndex = 0;
            lightboxScale = 1;
            updateSeo({ title: selected.title || 'Video', description: selected.desc || DEFAULT_SEO_DESCRIPTION, path: galleryPath(selected), image: selected.thumbnail || '', type: 'article' });
            renderModalMedia();
            document.getElementById('media-modal').classList.remove('hidden');
            setModalOpenState(true);
        }

        function openGalleryDetailModal(index = 0, pushRoute = false) {
            const orderedGallery = orderedGalleryItems();
            activeModalGalleryItems = orderedGallery.filter(item => window.BestHomeGallery.getCurrentFilter() === 'all' || item.type === window.BestHomeGallery.getCurrentFilter());
            const clicked = orderedGallery[index];
            activeModalGalleryIndex = Math.max(0, activeModalGalleryItems.findIndex(item => String(item.id) === String(clicked?.id)));
            activeModalMediaIndex = 0;
            lightboxScale = 1;
            const selected = activeModalGalleryItems[activeModalGalleryIndex];
            if (pushRoute && selected) history.pushState({ route: selected.type === 'video' ? 'video' : 'gallery', id: selected.id }, '', galleryPath(selected));
            if (selected) updateSeo({ title: selected.title || (selected.type === 'video' ? 'Video' : 'Qalereya'), description: selected.desc || DEFAULT_SEO_DESCRIPTION, path: galleryPath(selected), image: selected.thumbnail || selected.images?.[0] || '', type: 'article' });
            renderModalMedia();
            document.getElementById('media-modal').classList.remove('hidden');
            setModalOpenState(true);
        }

        function selectModalMedia(index) {
            activeModalMediaIndex = index;
            lightboxScale = 1;
            renderModalMedia();
        }

        function changeModalImage(dir) {
            const item = activeModalGalleryItems[activeModalGalleryIndex];
            const media = getModalItemMedia(item);
            lightboxScale = 1;
            if (item?.type === 'event' && media.length > 1) {
                activeModalMediaIndex += dir;
                if (activeModalMediaIndex < 0) activeModalMediaIndex = media.length - 1;
                if (activeModalMediaIndex >= media.length) activeModalMediaIndex = 0;
            } else if (activeModalGalleryItems.length > 1) {
                activeModalGalleryIndex += dir;
                if (activeModalGalleryIndex < 0) activeModalGalleryIndex = activeModalGalleryItems.length - 1;
                if (activeModalGalleryIndex >= activeModalGalleryItems.length) activeModalGalleryIndex = 0;
                activeModalMediaIndex = 0;
            }
            renderModalMedia();
        }

        function toggleLightboxZoom() {
            const item = activeModalGalleryItems[activeModalGalleryIndex];
            if (!item || item.type === 'video') return;
            lightboxScale = lightboxScale > 1 ? 1 : 2;
            renderModalMedia();
        }

        function openEventLightbox(encoded, title) {
            const arr = JSON.parse(decodeURIComponent(encoded));
            if (arr.length === 0) return;
            activeModalGalleryItems = [{ id: 'legacy', title, type: 'event', images: arr, desc: '', createdAt: new Date().toISOString() }];
            activeModalGalleryIndex = 0;
            activeModalMediaIndex = 0;
            lightboxScale = 1;
            renderModalMedia();
            document.getElementById('media-modal').classList.remove('hidden');
            setModalOpenState(true);
        }

        function openProjectLightboxFromModal() {
            if (!(window.getOfficialProjectImages?.().length || 0)) return;
            openProjectLightbox((window.getOfficialProjectImageIndex?.() || 0));
        }

        function openMediaModal(type, url, title) {
            activeModalGalleryItems = [{ id: 'legacy-video', title, type: 'video', url, thumbnail: '', desc: '', createdAt: new Date().toISOString() }];
            activeModalGalleryIndex = 0;
            activeModalMediaIndex = 0;
            renderModalMedia();
            document.getElementById('media-modal').classList.remove('hidden');
            setModalOpenState(true);
        }

        function closeModal() {
            document.getElementById('media-modal').classList.add('hidden');
            if (window.location.pathname.startsWith('/gallery/') || window.location.pathname.startsWith('/video/')) {
                history.pushState({ tabId: 'portfolio' }, '', '/gallery');
                updateSeo({ title: 'Qalereya', path: '/gallery' });
            }
            document.getElementById('modal-content').innerHTML = '';
            document.getElementById('modal-thumbnails').innerHTML = '';
            syncModalOpenState();
        }

        function getCvDisplayName(fileName = '') {
            return decodeURIComponent(String(fileName).split('/').pop() || 'CV faylı');
        }

        async function previewCvFile(applicationId) {
            const app = appData.applications.find(item => String(item.id) === String(applicationId));
            const displayName = getCvDisplayName(app?.fileName || app?.cvFile || 'CV faylı');
            try {
                const result = await apiRequest(`/api/applications/${applicationId}/cv-signed-url`, {
                    method: 'POST',
                    body: JSON.stringify({ expiresIn: 60 })
                });
                const { signedUrl } = result;
                console.info('[admin] CV preview signed URL', {
                    originalPath: result.originalPath || result.filePath,
                    normalizedPath: result.normalizedPath || result.createSignedUrlPath,
                    bucket: result.bucket,
                    supabaseResponse: result.supabaseResponse,
                    finalSignedUrl: signedUrl,
                    displayName
                });
                window.open(signedUrl, '_blank');
            } catch (error) {
                alert('CV üçün signed URL yaradılmadı: ' + error.message);
            }
        }


        let touchStartX = 0;
        let touchStartY = 0;

        function getTouchDistance(touches) {
            if (!touches || touches.length < 2) return 0;
            const [a, b] = touches;
            return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        }

        function handleModalTouchStart(event) {
            if (event.touches?.length === 2 && !document.getElementById('media-modal').classList.contains('hidden')) {
                pinchStartDistance = getTouchDistance(event.touches);
                pinchStartScale = lightboxScale;
                return;
            }
            const touch = event.changedTouches?.[0];
            if (!touch) return;
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
        }

        function handleModalTouchMove(event) {
            if (event.touches?.length === 2 && pinchStartDistance > 0 && !document.getElementById('media-modal').classList.contains('hidden')) {
                event.preventDefault();
                lightboxScale = Math.max(1, Math.min(3, pinchStartScale * (getTouchDistance(event.touches) / pinchStartDistance)));
                const img = document.getElementById('premium-lightbox-img');
                if (img) {
                    img.style.transform = `scale(${lightboxScale})`;
                    img.classList.toggle('is-zoomed', lightboxScale > 1);
                }
            }
        }

        function handleModalTouchEnd(event) {
            if (pinchStartDistance > 0) {
                pinchStartDistance = 0;
                return;
            }
            const now = Date.now();
            if (!document.getElementById('media-modal').classList.contains('hidden') && now - lastLightboxTapAt < 280) {
                lastLightboxTapAt = 0;
                toggleLightboxZoom();
                return;
            }
            lastLightboxTapAt = now;
            const touch = event.changedTouches?.[0];
            if (!touch) return;
            const deltaX = touch.clientX - touchStartX;
            const deltaY = touch.clientY - touchStartY;
            if (Math.abs(deltaX) < 45 || Math.abs(deltaX) < Math.abs(deltaY)) return;

            if (typeof window.isProjectLightboxOpen === 'function' && window.isProjectLightboxOpen() && (window.getOfficialProjectImages?.().length || 0) > 1) {
                changeProjectLightboxImage(deltaX > 0 ? -1 : 1);
                return;
            }
            if (typeof window.isPropertyLightboxOpen === 'function' && window.isPropertyLightboxOpen() && window.activePropertyImages.length > 1) {
                changePropertyLightboxImage(deltaX > 0 ? -1 : 1);
                return;
            }
            if (!document.getElementById('property-detail-modal').classList.contains('hidden') && window.activePropertyImages.length > 1) {
                changePropertyMainImage(deltaX > 0 ? -1 : 1);
                return;
            }
            if (!document.getElementById('media-modal').classList.contains('hidden') && (lightboxImages.length > 1 || activeModalGalleryItems.length > 1)) {
                changeModalImage(deltaX > 0 ? -1 : 1);
                return;
            }
            // Project detail switching is intentionally not handled by touch swipes.
            // Mobile users can scroll the modal vertically without accidental project changes;
            // project navigation remains available through the visible arrow buttons and keyboard.
        }

        document.addEventListener('click', (event) => {
            const suggestionsBox = document.getElementById('pl-location-results');
            const searchInput = document.getElementById('pl-location-search');
            if (!suggestionsBox || !searchInput || suggestionsBox.classList.contains('hidden')) return;
            if (searchInput.contains(event.target) || suggestionsBox.contains(event.target)) return;
            closePublicAddressSuggestions();
        }, true);

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') closePublicAddressSuggestions();
            const projectLightboxOpen = typeof window.isProjectLightboxOpen === 'function' && window.isProjectLightboxOpen();
            const propertyLightboxOpen = typeof window.isPropertyLightboxOpen === 'function' && window.isPropertyLightboxOpen();
            const inquiryOpen = !document.getElementById('project-inquiry-modal').classList.contains('hidden');
            const mediaOpen = !document.getElementById('media-modal').classList.contains('hidden');
            const projectOpen = !document.getElementById('project-detail-modal-official').classList.contains('hidden');
            const propertyOpen = !document.getElementById('property-detail-modal').classList.contains('hidden');

            if (event.key === 'Escape') {
                if (inquiryOpen) { closeProjectInquiryModal(); return; }
                if (projectLightboxOpen) { closeProjectLightbox(); return; }
                if (propertyLightboxOpen) { closePropertyLightbox(); return; }
                if (mediaOpen) closeModal();
                if (projectOpen) closeOfficialProjectModal();
                if (propertyOpen) closePropertyModal();
                return;
            }
            if (event.key === 'ArrowLeft') {
                if (projectLightboxOpen && (window.getOfficialProjectImages?.().length || 0) > 1) { event.preventDefault(); changeProjectLightboxImage(-1); return; }
                if (propertyLightboxOpen && window.activePropertyImages.length > 1) { event.preventDefault(); changePropertyLightboxImage(-1); return; }
                if (propertyOpen && window.activePropertyImages.length > 1) { event.preventDefault(); changePropertyMainImage(-1); return; }
                if (mediaOpen && (lightboxImages.length > 1 || activeModalGalleryItems.length > 1)) { event.preventDefault(); changeModalImage(-1); return; }
                if (projectOpen) { event.preventDefault(); navigateOfficialProject(-1); }
            }
            if (event.key === 'ArrowRight') {
                if (projectLightboxOpen && (window.getOfficialProjectImages?.().length || 0) > 1) { event.preventDefault(); changeProjectLightboxImage(1); return; }
                if (propertyLightboxOpen && window.activePropertyImages.length > 1) { event.preventDefault(); changePropertyLightboxImage(1); return; }
                if (propertyOpen && window.activePropertyImages.length > 1) { event.preventDefault(); changePropertyMainImage(1); return; }
                if (mediaOpen && (lightboxImages.length > 1 || activeModalGalleryItems.length > 1)) { event.preventDefault(); changeModalImage(1); return; }
                if (projectOpen) { event.preventDefault(); navigateOfficialProject(1); }
            }
        });

        document.getElementById('modal-content')?.addEventListener('dblclick', toggleLightboxZoom);
        window.addEventListener('resize', () => {
            if (typeof window.isPropertyLightboxOpen === 'function' && window.isPropertyLightboxOpen()) applyPropertyLightboxImageFit(document.getElementById('property-lightbox-img'));
            if (typeof window.isProjectLightboxOpen === 'function' && window.isProjectLightboxOpen()) applyPropertyLightboxImageFit(document.getElementById('project-lightbox-img'));
        });

        ['media-modal', 'project-detail-modal-official', 'property-detail-modal', 'property-lightbox', 'project-lightbox'].forEach((id) => {
            const modal = document.getElementById(id);
            if (modal) {
                modal.addEventListener('touchstart', handleModalTouchStart, { passive: true });
                modal.addEventListener('touchmove', handleModalTouchMove, { passive: false });
                modal.addEventListener('touchend', handleModalTouchEnd, { passive: true });
            }
        });


        function ensurePublicProfilePage() {
            let page = document.getElementById('tab-public-profile');
            if (!page) {
                document.querySelector('main')?.insertAdjacentHTML('beforeend', `<section id="tab-public-profile" class="tab-content hidden pt-28 pb-20 bg-gray-50 min-h-screen"><div id="public-profile-root" class="max-w-7xl mx-auto px-4"></div></section>`);
                page = document.getElementById('tab-public-profile');
            }
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            page.classList.remove('hidden');
            return document.getElementById('public-profile-root');
        }

        function publicListingCard(p) {
            const mainImage = p.img || p.images?.[0] || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80';
            const ownerId = p.ownerId || p.authorId;
            const canonicalType = canonicalListingType(p.listingType);
            const isRent = canonicalType === 'Kiraye';
            const isDailyRent = canonicalType === 'GunlukKiraye';
            const formattedPrice = formatPrice(p.price, p.currency);
            const publicLocationLabel = getListingLocationLabel(p);
            const locationLinesHtml = renderListingLocationLines(p) || (publicLocationLabel ? `<p class="sea-breeze-listing-card__meta text-sm font-extrabold text-slate-700"><i class="fa-solid fa-location-dot text-brand-600 mr-1.5"></i>${escapeHtml(publicLocationLabel)}</p>` : '');
            const roomFact = p.rooms != null && p.rooms !== '' ? `${p.rooms} otaq` : '— otaq';
            const areaFact = formatOptionalNumber(p.area, ' m²');
            const floorFact = formatListingFloor(p.floorNumber ?? p.floor, p.floorCount).replace(/\s*\/\s*/g, '/');
            const isFavorite = appData.favoriteListingIds?.has(String(p.id));
            return `<article data-listing-id="${p.id}" class="sea-breeze-listing-card cursor-pointer rounded-2xl overflow-hidden glass-card hover:border-brand-500/40 transition-all duration-300 group flex flex-col h-full bg-white">
                <div class="sea-breeze-listing-card__media h-48 md:h-52 overflow-hidden relative">
                    <img src="${escapeHtml(mainImage)}" width="640" height="480" loading="lazy" decoding="async" class="sea-breeze-listing-card__image w-full h-full object-cover group-hover:scale-105 transition duration-500" alt="${escapeHtml(p.title || 'Elan')}">
                    <span class="absolute top-4 left-4 text-[10px] font-black px-3 py-1 rounded-full ${listingStatusBadgeClass(p.status || 'approved')}">${listingStatusLabel(p.status || 'approved')}</span>
                    <button type="button" data-favorite-btn="${p.id}" onclick="toggleFavorite(event, '${p.id}')" class="favorite-btn sea-breeze-listing-card__favorite absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 text-red-500 shadow-lg hover:scale-105 transition disabled:opacity-60 disabled:cursor-not-allowed" aria-label="Favorit" aria-pressed="${isFavorite ? 'true' : 'false'}"><i class="${isFavorite ? 'fa-solid' : 'fa-regular'} fa-heart"></i></button>
                </div>
                <div class="sea-breeze-listing-card__body p-4 md:p-5 space-y-3 flex-1">
                    ${locationLinesHtml}
                    <h3 class="sea-breeze-listing-card__title text-gray-950 font-black text-base truncate">${escapeHtml(p.title || '—')}</h3>
                    <strong class="block text-xl font-black text-gray-950">${formattedPrice}${isRent && formattedPrice !== '—' ? '<span class="sea-breeze-listing-card__price-period text-sm"> /ay</span>' : ''}${isDailyRent && formattedPrice !== '—' ? '<span class="sea-breeze-listing-card__price-period text-sm"> /gün</span>' : ''}</strong>
                    <div class="listing-card-badge-row">${renderListingBadgeStack(p)}</div>
                    <div class="listing-info-row"><span class="listing-info-row__item">🛏 <strong>${escapeHtml(roomFact)}</strong></span><span class="listing-info-row__divider">|</span><span class="listing-info-row__item">📐 <strong>${escapeHtml(areaFact)}</strong></span><span class="listing-info-row__divider">|</span><span class="listing-info-row__item">🏢 <strong>${escapeHtml(floorFact)}</strong></span></div>
                    <div class="flex items-center justify-between gap-3 pt-2 border-t border-slate-100"><span class="text-[11px] font-bold text-brand-700 truncate">${escapeHtml(p.ownerName || agentNameById(ownerId) || 'BestHome Agent')}</span><span class="text-[10px] font-black text-brand-700 whitespace-nowrap">Kod: ${formatListingCode(p.listingCode)}</span></div>
                </div>
            </article>`;
        }

        async function renderPublicProfile(userId, listingsOnly = false) {
            const root = ensurePublicProfilePage();
            root.innerHTML = '<div class="py-20 text-center text-gray-500 font-bold">Profil yüklənir...</div>';
            try {
                const page = Number(new URLSearchParams(window.location.search).get('page') || '1');
                const payload = await apiRequest(`/api/users/public/${encodeURIComponent(userId)}${listingsOnly ? '/listings' : ''}?page=${page}&limit=12`);
                const user = userToUi(payload.user);
                const listings = (payload.listings || []).map(dbListingToUi);
                listings.forEach(item => { item.ownerName = user.fullname; item.ownerId = user.id; });
                updateSeo({ title: payload.seo?.title || `${user.fullname} - BestHome`, description: payload.seo?.description || `Təsdiqlənmiş elanlar — ${user.fullname}`, path: window.location.pathname });
                const completion = payload.user.profileCompletion ?? profileCompletionFor(user);
                const stats = payload.user;
                const pagination = payload.pagination || { page, totalPages: 1 };
                const pager = pagination.totalPages > 1 ? `<div class="flex justify-center gap-2 mt-8">${Array.from({ length: pagination.totalPages }, (_, idx) => idx + 1).map(n => `<a href="/user/${user.id}/listings?page=${n}" class="px-4 py-2 rounded-xl text-sm font-bold ${n === pagination.page ? 'bg-brand-600 text-white' : 'bg-white text-gray-700 border border-gray-200'}">${n}</a>`).join('')}</div>` : '';
                root.innerHTML = `<div class="rounded-[2rem] bg-white shadow-xl border border-gray-100 p-6 md:p-8 mb-8">
                    <div class="flex flex-col md:flex-row gap-6 items-center md:items-start"><img src="${user.avatarUrl || avatarFallback(user.fullname)}" onclick="openAvatarModal(this.src)" class="w-32 h-32 rounded-full object-cover border-4 border-brand-100 shadow cursor-zoom-in"><div class="flex-1 text-center md:text-left"><h1 class="text-3xl font-black text-gray-950">${escapeHtml(user.fullname)}</h1><p class="mt-2 text-gray-600 max-w-2xl">${escapeHtml(user.bio || 'Bio əlavə edilməyib.')}</p><p class="mt-3 text-sm text-gray-500"><i class="fa-regular fa-calendar mr-1"></i> Qeydiyyat tarixi: ${formatAzDate(user.createdAt)}</p><div class="mt-4"><div class="flex justify-between text-xs font-black text-gray-500"><span>Profil tamamlanması</span><span>${completion}%</span></div><div class="h-2 bg-gray-100 rounded-full overflow-hidden mt-1"><div class="h-full bg-brand-500" style="width:${completion}%"></div></div></div></div></div>
                    <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6 text-center">${[['Elanlar', stats.listingsCount], ['Təsdiqlənmiş', stats.approvedListingsCount], ['Gözləyən', stats.pendingListingsCount], ['Baxışlar', stats.totalListingViews], ['Seçilmişlər', stats.totalFavorites]].map(([l,v]) => `<div class="rounded-2xl bg-gray-50 p-4"><div class="text-2xl font-black text-gray-950">${Number(v||0).toLocaleString('az-AZ')}</div><div class="text-[10px] uppercase font-bold text-gray-500">${l}</div></div>`).join('')}</div>
                </div><div class="flex items-center justify-between mb-4"><h2 class="text-2xl font-black text-gray-950">Təsdiqlənmiş elanlar</h2><a href="/user/${user.id}/listings" class="text-brand-700 font-bold text-sm hover:underline">Bütün elanlar</a></div><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">${listings.length ? listings.map(publicListingCard).join('') : '<div class="col-span-full p-12 text-center bg-white rounded-3xl text-gray-500">Təsdiqlənmiş elan yoxdur.</div>'}</div>${pager}`;
            } catch (error) {
                root.innerHTML = `<div class="py-20 text-center text-red-500 font-bold">Profil açılmadı: ${escapeHtml(error.message)}</div>`;
            }
        }


        const SEABREEZE_STATS = [['750+','ha'],['11M+','ağac və kol'],['50+','restoran və bar'],['7500+','işçi'],['3.5M+','m² yaşayış və kommersiya'],['7km+','çimərlik'],['60+','hovuz'],['50,000+','sakin'],['50+','layihə']];
        const hasSbImage = (item) => Boolean(item?.image_url || item?.imageUrl);
        const hasSbVideo = (item) => Boolean(item?.video_url || item?.videoUrl);
        const sbMedia = (item, cls='', options = {}) => {
            const imageUrl = item?.image_url || item?.imageUrl || '';
            const videoUrl = item?.video_url || item?.videoUrl || '';
            if (videoUrl) return `<video class="${cls}" src="${escapeHtml(videoUrl)}" ${imageUrl ? `poster="${escapeHtml(imageUrl)}"` : ''} autoplay muted ${options.loop === false ? '' : 'loop'} playsinline></video>`;
            if (imageUrl) return `<img class="${cls}" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item?.title || 'Sea Breeze')}" loading="lazy">`;
            return options.placeholder ? `<div class="${escapeHtml(options.placeholderClass || 'sb-info-placeholder')}" aria-hidden="true"></div>` : '';
        };
        const seaBreezeHeroDuration = (slide) => Math.min(30, Math.max(2, Number(slide?.durationSeconds ?? slide?.duration_seconds ?? 6) || 6)) * 1000;
        let seaBreezePublicHeroTimer = null;
        let seaBreezePublicHeroIndex = 0;
        function goToSeaBreezePublicHero(index) {
            const slides = document.querySelectorAll('#seaBreezeHero .sb-hero-slide');
            if (slides.length <= 1) return;
            slides[seaBreezePublicHeroIndex]?.classList.remove('is-active');
            seaBreezePublicHeroIndex = ((index % slides.length) + slides.length) % slides.length;
            slides[seaBreezePublicHeroIndex]?.classList.add('is-active');
            startSeaBreezePublicHeroTimer();
        }
        function moveSeaBreezePublicHero(delta) { goToSeaBreezePublicHero(seaBreezePublicHeroIndex + delta); }
        function startSeaBreezePublicHeroTimer() {
            clearTimeout(seaBreezePublicHeroTimer);
            const heroContainer = document.getElementById('seaBreezeHero');
            const slides = heroContainer?.querySelectorAll('.sb-hero-slide') || [];
            if (slides.length <= 1) return;
            const data = JSON.parse(heroContainer.dataset.heroSlides || '[]');
            seaBreezePublicHeroTimer = setTimeout(() => moveSeaBreezePublicHero(1), seaBreezeHeroDuration(data[seaBreezePublicHeroIndex]));
        }
        window.moveSeaBreezePublicHero = moveSeaBreezePublicHero;
        window.goToSeaBreezePublicHero = goToSeaBreezePublicHero;
        function normalizeSeaBreezeList(data) {
            if (Array.isArray(data)) return data;
            if (Array.isArray(data?.data)) return data.data;
            if (Array.isArray(data?.items)) return data.items;
            return [];
        }
        async function fetchSeaBreezeList(endpoint, label, options = {}) {
            const cacheMap = { hero: 'seaBreezeHero', sections: 'seaBreezeSections', gallery: 'seaBreezeGallery' };
            try {
                return normalizeSeaBreezeList(await cachedApiGet(cacheMap[label] || label, endpoint, options));
            } catch (_error) {
                return normalizeSeaBreezeList(getCachedData(cacheMap[label] || label) || []);
            }
        }
        function ensureSeaBreezeContainers() {
            let root = document.getElementById('seabreeze-info-root');
            if (!root) {
                const tab = document.getElementById('tab-seabreeze-info');
                tab?.insertAdjacentHTML('beforeend', '<div id="seabreeze-info-root"></div>');
                root = document.getElementById('seabreeze-info-root');
            }
            if (!root) return null;
            if (!document.getElementById('seaBreezeHero')) root.insertAdjacentHTML('beforeend', '<div id="seaBreezeHero"></div>');
            if (!document.getElementById('seaBreezeSections')) root.insertAdjacentHTML('beforeend', '<div id="seaBreezeSections"></div>');
            if (!document.getElementById('seaBreezeGallery')) root.insertAdjacentHTML('beforeend', '<div id="seaBreezeGallery"></div>');
            return root;
        }
        function renderSeaBreezePublicHero(heroData = []) {
            const heroContainer = document.getElementById('seaBreezeHero');
            if (!heroContainer) return;
            const hero = normalizeSeaBreezeList(heroData);
            const slides = hero;
            seaBreezePublicHeroIndex = 0;
            clearTimeout(seaBreezePublicHeroTimer);
            if (!slides.length) { heroContainer.innerHTML = ''; heroContainer.removeAttribute('data-hero-slides'); return; }
            heroContainer.dataset.heroSlides = JSON.stringify(slides.map(slide => ({ durationSeconds: slide.durationSeconds ?? slide.duration_seconds ?? 6 })));
            heroContainer.innerHTML = `<div class="sb-hero-slider site-main-hero site-hero-frame">${slides.map((h,i)=>{ const title = h.title || ''; const subtitle = h.subtitle || h.description || ''; const ctaText = h.ctaText || h.cta_text || ''; const rawCtaLink = h.ctaLink || h.cta_link || ''; const ctaLink = (typeof rawCtaLink === 'string' && rawCtaLink.trim()) ? rawCtaLink.trim() : '/projects'; const copy = (title || subtitle || ctaText) ? `<div class="sb-hero-copy"><span>BestHome.az Premium</span>${title ? `<h2>${escapeHtml(title)}</h2>` : ''}${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}${ctaText ? `<a href="${escapeHtml(ctaLink)}" onclick="if((this.getAttribute('href')||'').startsWith('#')){event.preventDefault(); document.querySelector(this.getAttribute('href'))?.scrollIntoView({behavior:'smooth'});}">${escapeHtml(ctaText)}</a>` : ''}</div>` : ''; return `<article class="sb-hero-slide ${i?'':'is-active'}">${sbMedia(h,'sb-hero-media site-main-hero-media', { placeholder: true, placeholderClass: 'sb-hero-placeholder', loop: false })}${copy}</article>`; }).join('')}${slides.length > 1 ? `<button type="button" class="hero-nav-arrow hero-nav-arrow--prev sb-hero-nav" onclick="moveSeaBreezePublicHero(-1)" aria-label="Əvvəlki Sea Breeze hero">‹</button><button type="button" class="hero-nav-arrow hero-nav-arrow--next sb-hero-nav" onclick="moveSeaBreezePublicHero(1)" aria-label="Növbəti Sea Breeze hero">›</button>` : ''}</div>`;
            heroContainer.querySelectorAll('video').forEach((video) => {
                video.addEventListener('ended', () => moveSeaBreezePublicHero(1));
                video.addEventListener('error', () => moveSeaBreezePublicHero(1));
                video.addEventListener('stalled', () => moveSeaBreezePublicHero(1));
                video.play?.().catch(() => {});
            });
            startSeaBreezePublicHeroTimer();
        }
        function renderSeaBreezeContent(content = '') {
            const lines = String(content || '').split(/\n+/).map(line => line.trim()).filter(Boolean);
            if (!lines.length) return '';
            const chunks = [];
            let list = [];
            const flushList = () => {
                if (list.length) {
                    chunks.push(`<ul class="sb-info-list">${list.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`);
                    list = [];
                }
            };
            lines.forEach((line) => {
                if (/^[—–-]\s+/.test(line)) {
                    list.push(line.replace(/^[—–-]\s+/, ''));
                } else {
                    flushList();
                    chunks.push(`<p>${escapeHtml(line)}</p>`);
                }
            });
            flushList();
            return `<div class="sb-info-copy">${chunks.join('')}</div>`;
        }
        const seaBreezeSectionExpanded = {};
        function getSeaBreezeSectionKey(sec = {}, index = 0) {
            return String(sec.section_key || sec.sectionKey || sec.id || `section-${index}`).toLowerCase();
        }
        function setSeaBreezeToggleLabel(button, expanded) {
            if (!button) return;
            button.innerHTML = expanded ? 'Daha az göstər <i class="fa-solid fa-chevron-up"></i>' : 'Daha çox göstər <i class="fa-solid fa-chevron-down"></i>';
        }
        function toggleSeaBreezeLongContent(button) {
            const section = button?.closest('.sb-info-section');
            const collapsible = section?.querySelector('.sb-info-collapsible');
            if (!section || !collapsible) return;
            const sectionKey = section.dataset.sectionKey || section.id;
            const expanded = collapsible.classList.toggle('is-collapsed') === false;
            seaBreezeSectionExpanded[sectionKey] = expanded;
            setSeaBreezeToggleLabel(button, expanded);
        }
        function refreshSeaBreezeReadMoreControls() {
            document.querySelectorAll('#seaBreezeSections .sb-info-section').forEach((section) => {
                const collapsible = section.querySelector('.sb-info-collapsible');
                const button = section.querySelector('.sb-info-toggle');
                if (!collapsible || !button) return;
                const sectionKey = section.dataset.sectionKey || section.id;
                const expanded = seaBreezeSectionExpanded[sectionKey] === true;
                collapsible.classList.add('is-collapsed');
                const collapsedHeight = collapsible.clientHeight;
                collapsible.classList.remove('is-collapsed');
                const fullHeight = collapsible.scrollHeight;
                const hasOverflow = fullHeight > collapsedHeight + 2;
                button.hidden = !hasOverflow;
                collapsible.classList.toggle('is-collapsed', hasOverflow && !expanded);
                setSeaBreezeToggleLabel(button, expanded && hasOverflow);
            });
        }
        function scrollToSeaBreezeSection(index) {
            document.getElementById(`sb-info-section-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        window.toggleSeaBreezeLongContent = toggleSeaBreezeLongContent;
        window.scrollToSeaBreezeSection = scrollToSeaBreezeSection;
        window.addEventListener('resize', () => requestAnimationFrame(refreshSeaBreezeReadMoreControls));
        function renderSeaBreezeInfoSection(sec, i, total = 0) {
            const facts = Array.isArray(sec.facts) ? sec.facts.filter(Boolean) : [];
            const content = String(sec.content || '');
            const media = sbMedia(sec);
            const imageUrl = sec.image_url || sec.imageUrl || '';
            const videoUrl = sec.video_url || sec.videoUrl || '';
            const sectionKey = getSeaBreezeSectionKey(sec, i);
            const isExpanded = seaBreezeSectionExpanded[sectionKey] === true;
            const classes = ['sb-info-section'];
            if (i % 2) classes.push('is-reverse');
            if (!media) classes.push('is-text-only');
            if (content || facts.length) classes.push('is-long-content');
            const factClass = `sb-fact-cards${facts.length > 6 ? ' is-compact' : ''}`;
            const mediaType = videoUrl ? 'video' : 'image';
            const mediaUrl = videoUrl || imageUrl;
            const mediaHtml = media ? `<div class="sb-info-media" onclick="openSeaBreezeMediaModal('${escapeHtml(mediaUrl)}','${mediaType}','${escapeHtml(sec.title || 'Sea Breeze Haqqında')}')">${media}</div>` : '';
            const bodyHtml = `${content ? renderSeaBreezeContent(content) : ''}${facts.length ? `<ul class="${factClass}">${facts.map(f=>`<li>${escapeHtml(f)}</li>`).join('')}</ul>` : ''}`;
            const toggleHtml = bodyHtml ? `<button type="button" class="sb-info-toggle" onclick="toggleSeaBreezeLongContent(this)" hidden>Daha çox göstər <i class="fa-solid fa-chevron-down"></i></button>` : '';
            const nextHtml = total > 1 ? `<div><button type="button" class="sb-next-section-btn" onclick="scrollToSeaBreezeSection(${Math.min(i + 1, total - 1)})">${i >= total - 1 ? 'İlk bölməyə qayıt' : 'Növbəti bölmə'} <i class="fa-solid fa-arrow-${i >= total - 1 ? 'up' : 'down'}"></i></button></div>` : '';
            return `<section id="sb-info-section-${i}" data-section-key="${escapeHtml(sectionKey)}" class="${classes.join(' ')}">${mediaHtml}<div class="sb-info-text"><small>${String(i+1).padStart(2,'0')}</small><h2>${escapeHtml(sec.title || 'Sea Breeze Haqqında')}</h2>${bodyHtml ? `<div class="sb-info-collapsible${isExpanded ? '' : ' is-collapsed'}">${bodyHtml}</div>` : ''}${toggleHtml}${nextHtml}</div></section>`;
        }
        function renderSeaBreezePublicSections(sectionsData = []) {
            const sectionsContainer = document.getElementById('seaBreezeSections');
            if (!sectionsContainer) return;
            const sections = normalizeSeaBreezeList(sectionsData).sort((a,b) => (Number(a.sort_order ?? a.sortOrder ?? 9999) - Number(b.sort_order ?? b.sortOrder ?? 9999)) || (Number(a.id || 0) - Number(b.id || 0)));
            const ctaSection = sections.find(sec => String(sec.section_key || sec.sectionKey).toLowerCase() === 'cta');
            const sectionRows = sections.filter(sec => String(sec.section_key || sec.sectionKey).toLowerCase() !== 'cta');
            const nav = sectionRows.length > 1 ? `<nav class="sb-section-nav" aria-label="Sea Breeze bölmələri">${sectionRows.map((_, i) => `<button type="button" onclick="scrollToSeaBreezeSection(${i})" aria-label="${i + 1}-ci bölmə">${i + 1}</button>`).join('')}</nav>` : '';
            sectionsContainer.innerHTML = `${nav}${sectionRows.map((sec,i)=>renderSeaBreezeInfoSection(sec, i, sectionRows.length)).join('')}${ctaSection ? `<section class="sb-final-cta"><h2>${escapeHtml(ctaSection.title || 'Sea Breeze-in bir hissəsinə çevrilin')}</h2><p>${escapeHtml(ctaSection.content || '')}</p><div><button onclick="switchTab('seabreeze')">Layihələrə bax</button><button onclick="switchTab('listings')">Elanlara bax</button></div></section>` : ''}`;
            requestAnimationFrame(refreshSeaBreezeReadMoreControls);
        }
        function renderSeaBreezePublicGallery(galleryData = []) {
            const galleryContainer = document.getElementById('seaBreezeGallery');
            if (!galleryContainer) return;
            const gallery = normalizeSeaBreezeList(galleryData).filter(g => g?.media_url || g?.mediaUrl);
            galleryContainer.innerHTML = gallery.length ? `<section class="sb-gallery"><h2>Sea Breeze Haqqında Qalereya</h2><div>${gallery.map(g=>`<figure>${(g.media_type || g.mediaType)==='video'?`<video src="${escapeHtml(g.media_url || g.mediaUrl)}" controls muted></video>`:`<img src="${escapeHtml(g.media_url || g.mediaUrl)}" alt="${escapeHtml(g.title||'Sea Breeze')}">`}<figcaption>${escapeHtml(g.category||g.title||'Sea Breeze')}</figcaption></figure>`).join('')}</div></section>` : '';
        }
        function openSeaBreezeMediaModal(url, type = 'image', title = 'Sea Breeze Haqqında') {
            let modal = document.getElementById('sea-breeze-media-modal');
            if (!modal) {
                document.body.insertAdjacentHTML('beforeend', '<div id="sea-breeze-media-modal" class="sb-media-modal hidden" onclick="if(event.target===this)closeSeaBreezeMediaModal()"><div class="sb-media-modal__dialog"><button type="button" class="sb-media-modal__close" onclick="closeSeaBreezeMediaModal()" aria-label="Bağla">×</button><div id="sea-breeze-media-modal-content"></div><button type="button" class="sb-media-modal__button" onclick="closeSeaBreezeMediaModal()">Bağla</button></div></div>');
                modal = document.getElementById('sea-breeze-media-modal');
            }
            document.getElementById('sea-breeze-media-modal-content').innerHTML = type === 'video'
                ? `<video src="${escapeHtml(url)}" controls autoplay muted playsinline></video>`
                : `<img src="${escapeHtml(url)}" alt="${escapeHtml(title)}">`;
            modal.classList.remove('hidden');
            document.body.classList.add('overflow-hidden');
        }
        function closeSeaBreezeMediaModal() {
            const modal = document.getElementById('sea-breeze-media-modal');
            if (modal) modal.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
        }
        window.openSeaBreezeMediaModal = openSeaBreezeMediaModal;
        window.closeSeaBreezeMediaModal = closeSeaBreezeMediaModal;
        document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeSeaBreezeMediaModal(); });
        async function loadSeaBreezePage({ force = false } = {}) {
            const root = ensureSeaBreezeContainers(); if (!root) return;
            const cachedHero = getCachedData('seaBreezeHero') || [];
            const cachedSections = getCachedData('seaBreezeSections') || [];
            const cachedGallery = getCachedData('seaBreezeGallery') || [];
            if (cachedHero.length || cachedSections.length || cachedGallery.length) {
                renderSeaBreezePublicHero(cachedHero);
                renderSeaBreezePublicSections(cachedSections);
                renderSeaBreezePublicGallery(cachedGallery);
            } else {
                root.classList.add('is-loading');
            }
            const [heroResult, sectionsResult, galleryResult] = await Promise.allSettled([
                fetchSeaBreezeList('/api/seabreeze/hero-slides', 'hero', { force }),
                fetchSeaBreezeList('/api/seabreeze/sections', 'sections', { force }),
                fetchSeaBreezeList('/api/seabreeze/gallery', 'gallery', { force })
            ]);
            const hero = heroResult.status === 'fulfilled' ? heroResult.value : cachedHero;
            const sections = sectionsResult.status === 'fulfilled' ? sectionsResult.value : cachedSections;
            const gallery = galleryResult.status === 'fulfilled' ? galleryResult.value : cachedGallery;
            renderSeaBreezePublicHero(hero);
            renderSeaBreezePublicSections(sections);
            renderSeaBreezePublicGallery(gallery);
            root.classList.remove('is-loading');
        }
        async function renderSeaBreezeInfoPage() {
            loadSeaBreezePage().catch(() => {});
            scheduleIdleTask(() => loadSeaBreezePage({ force: true }).catch(() => {}), 500);
        }
        async function loadSeaBreezeAdmin() {
            if (!isAdminRole(activeUser?.role)) return;
            const [heroes, sections, gallery] = await Promise.all([
                cachedApiGet('seaBreezeHero', '/api/seabreeze/hero-slides?admin=1', { force: true, authRedirect: false }),
                cachedApiGet('seaBreezeSections', '/api/seabreeze/sections?admin=1', { force: true, authRedirect: false }),
                cachedApiGet('seaBreezeGallery', '/api/seabreeze/gallery?admin=1', { force: true, authRedirect: false })
            ]).catch(() => [[], [], []]);
            const orderList = (rows = []) => [...rows].sort((a,b) => (Number(a.sort_order ?? a.sortOrder ?? 9999) - Number(b.sort_order ?? b.sortOrder ?? 9999)) || (Number(a.id || 0) - Number(b.id || 0)));
            window.__seaBreezeAdminHeroes = orderList(heroes || []);
            window.__seaBreezeAdminSections = orderList(sections || []);
            updateSeaBreezeMediaInputs('sb-hero');
            updateSeaBreezeMediaInputs('sb-sections');
            const card = (x,type,idx=0,total=0) => {
                const isSection = type === 'sections';
                const upDisabled = !isSection || idx === 0;
                const downDisabled = !isSection || idx >= total - 1;
                return `<div class="sb-admin-card glass-card rounded-2xl p-4 text-white" data-sb-row-id="${x.id}" ${isSection ? 'draggable="true"' : ''}><button type="button" class="sb-drag-handle" aria-label="Sıranı dəyiş"><i class="fa-solid fa-grip-vertical"></i></button><div class="sb-admin-thumb">${seaBreezeAdminThumb(x)}</div><div class="min-w-0 flex-1"><b class="block truncate">${escapeHtml(x.title||x.category||'Media')}</b><p class="text-xs text-gray-400">#${x.id} • sıra ${escapeHtml(String(x.sort_order ?? x.sortOrder ?? '—'))} • ${escapeHtml(x.slug || x.section_key || '')} • ${x.is_active===false?'Deaktiv':'Aktiv'}</p><p class="text-xs text-gray-400 truncate">${escapeHtml(x.subtitle || x.cta_text || x.ctaText || x.content || '')}</p></div><div class="sb-admin-actions"><button type="button" onclick="editSeaBreezeAdmin('${type}',${x.id})" class="px-3 py-1 rounded-lg bg-white/10 text-xs">Edit</button>${isSection ? `<button type="button" onclick="moveSeaBreezeSection(${x.id},-1,this)" ${upDisabled ? 'disabled' : ''} class="px-3 py-1 rounded-lg bg-white/10 text-xs disabled:opacity-40" aria-label="Yuxarı"><i class="fa-solid fa-arrow-up"></i></button><button type="button" onclick="moveSeaBreezeSection(${x.id},1,this)" ${downDisabled ? 'disabled' : ''} class="px-3 py-1 rounded-lg bg-white/10 text-xs disabled:opacity-40" aria-label="Aşağı"><i class="fa-solid fa-arrow-down"></i></button>` : ''}<button type="button" onclick="toggleSeaBreezeAdmin('${type}',${x.id},${x.is_active!==false})" class="px-3 py-1 rounded-lg bg-white/10 text-xs">${x.is_active===false?'Aktiv et':'Deaktiv et'}</button><button type="button" onclick="deleteSeaBreezeAdmin('${type}',${x.id})" class="px-3 py-1 rounded-lg bg-red-600 text-xs">Sil</button></div></div>`;
            };
            const h=document.getElementById('sb-hero-admin-list'); if(h) h.innerHTML=window.__seaBreezeAdminHeroes.map((x,i,a)=>card(x,'hero-slides',i,a.length)).join('')||'<p class="text-gray-400">Hero yoxdur.</p>';
            const se=document.getElementById('sb-sections-admin-list'); if(se) { se.innerHTML=window.__seaBreezeAdminSections.map((x,i,a)=>card(x,'sections',i,a.length)).join('')||'<p class="text-gray-400">Bölmə yoxdur.</p>'; initSeaBreezeSectionDrag(); }
            const ga=document.getElementById('sb-gallery-admin-list'); if(ga) ga.innerHTML=orderList(gallery || []).map(x=>`<div class="rounded-xl overflow-hidden bg-white/5 text-white text-xs">${(x.media_type || x.mediaType)==='video'?'<div class="p-4">Video</div>':`<img src="${escapeHtml(x.media_url || x.mediaUrl || '')}" class="h-24 w-full object-cover">`}<button type="button" onclick="deleteSeaBreezeAdmin('gallery',${x.id})" class="w-full bg-red-600 py-1">Sil</button></div>`).join('');
        }

        function initSeaBreezeSectionDrag() {
            const list = document.getElementById('sb-sections-admin-list');
            if (!list) return;
            let draggedId = null;
            list.querySelectorAll('.sb-admin-card[draggable="true"]').forEach((row) => {
                row.addEventListener('dragstart', (event) => { draggedId = row.dataset.sbRowId; row.classList.add('is-dragging'); event.dataTransfer.effectAllowed = 'move'; });
                row.addEventListener('dragend', () => { row.classList.remove('is-dragging'); list.querySelectorAll('.is-drag-over').forEach(el => el.classList.remove('is-drag-over')); });
                row.addEventListener('dragover', (event) => { event.preventDefault(); if (row.dataset.sbRowId !== draggedId) row.classList.add('is-drag-over'); });
                row.addEventListener('dragleave', () => row.classList.remove('is-drag-over'));
                row.addEventListener('drop', async (event) => {
                    event.preventDefault(); row.classList.remove('is-drag-over');
                    if (!draggedId || draggedId === row.dataset.sbRowId) return;
                    const items = [...(window.__seaBreezeAdminSections || [])];
                    const from = items.findIndex(x => String(x.id) === String(draggedId));
                    const to = items.findIndex(x => String(x.id) === String(row.dataset.sbRowId));
                    if (from < 0 || to < 0) return;
                    const [moved] = items.splice(from, 1); items.splice(to, 0, moved);
                    items.forEach((item, index) => { item.sort_order = index + 1; item.sortOrder = index + 1; });
                    window.__seaBreezeAdminSections = items;
                    list.innerHTML = items.map((x,i,a)=>`<div class="sb-admin-card glass-card rounded-2xl p-4 text-white" data-sb-row-id="${x.id}" draggable="true"><button type="button" class="sb-drag-handle" aria-label="Sıranı dəyiş"><i class="fa-solid fa-grip-vertical"></i></button><div class="sb-admin-thumb">${seaBreezeAdminThumb(x)}</div><div class="min-w-0 flex-1"><b class="block truncate">${escapeHtml(x.title||'Bölmə')}</b><p class="text-xs text-gray-400">#${x.id} • sıra ${i + 1} • ${x.is_active===false?'Deaktiv':'Aktiv'}</p><p class="text-xs text-gray-400 truncate">${escapeHtml(x.content || '')}</p></div><div class="sb-admin-actions"><button type="button" onclick="editSeaBreezeAdmin('sections',${x.id})" class="px-3 py-1 rounded-lg bg-white/10 text-xs">Edit</button><button type="button" onclick="moveSeaBreezeSection(${x.id},-1,this)" ${i===0?'disabled':''} class="px-3 py-1 rounded-lg bg-white/10 text-xs disabled:opacity-40" aria-label="Yuxarı"><i class="fa-solid fa-arrow-up"></i></button><button type="button" onclick="moveSeaBreezeSection(${x.id},1,this)" ${i>=a.length-1?'disabled':''} class="px-3 py-1 rounded-lg bg-white/10 text-xs disabled:opacity-40" aria-label="Aşağı"><i class="fa-solid fa-arrow-down"></i></button><button type="button" onclick="toggleSeaBreezeAdmin('sections',${x.id},${x.is_active!==false})" class="px-3 py-1 rounded-lg bg-white/10 text-xs">${x.is_active===false?'Aktiv et':'Deaktiv et'}</button><button type="button" onclick="deleteSeaBreezeAdmin('sections',${x.id})" class="px-3 py-1 rounded-lg bg-red-600 text-xs">Sil</button></div></div>`).join('');
                    initSeaBreezeSectionDrag();
                    try { await apiRequest('/api/seabreeze/sections/reorder', {method:'PUT', body:JSON.stringify({order:items.map(x=>({id:x.id}))})}); invalidateSeaBreezePublicCaches('seaBreezeSections'); await loadSeaBreezeAdmin(); showToast('Sıralama yeniləndi.'); }
                    catch (error) { showToast(error.message || 'Sıralama yenilənmədi', 'error'); await loadSeaBreezeAdmin(); }
                });
            });
        }
        window.initSeaBreezeSectionDrag = initSeaBreezeSectionDrag;
        function seaBreezeAdminThumb(x = {}) {
            const image = x.image_url || x.imageUrl || x.media_url || x.mediaUrl || '';
            const video = x.video_url || x.videoUrl || (((x.media_type || x.mediaType) === 'video') ? image : '');
            if (image && !String(image).match(/\.(mp4|webm|mov)(\?|$)/i)) return `<img src="${escapeHtml(image)}" alt="" loading="lazy"><span class="${video ? 'sb-video-badge' : 'hidden'}">Video</span>`;
            if (video) return `<video src="${escapeHtml(video)}" muted playsinline preload="metadata"></video>`;
            return '<div class="sb-thumb-placeholder"><i class="fa-solid fa-image"></i></div>';
        }
        function ensureSeaBreezePreview(prefix) {
            ['image','video'].forEach(kind => {
                const field = document.getElementById(`${prefix}-${kind}-field`);
                if (field && !document.getElementById(`${prefix}-${kind}-preview`)) field.insertAdjacentHTML('beforeend', `<div id="${prefix}-${kind}-preview" class="sb-admin-preview"></div>`);
            });
        }
        function renderSeaBreezePreview(prefix, existing = {}) {
            ensureSeaBreezePreview(prefix);
            ['image','video'].forEach(kind => {
                const box = document.getElementById(`${prefix}-${kind}-preview`);
                if (!box) return;
                const file = document.getElementById(`${prefix}-${kind}`)?.files?.[0];
                const existingUrl = existing[`${kind}_url`] || existing[kind + 'Url'] || '';
                const removed = window.__seaBreezeRemovedMedia?.[prefix]?.[kind];
                const url = removed ? '' : (file ? URL.createObjectURL(file) : existingUrl);
                const deleteBtn = existingUrl && prefix === 'sb-sections' && !file && !removed ? `<button type="button" class="mt-2 px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-bold" onclick="removeSeaBreezeSectionMedia('${kind}')">${kind === 'image' ? 'Şəkili sil' : 'Videonu sil'}</button>` : '';
                box.innerHTML = url ? `<span>${kind === 'image' ? 'Şəkil / poster' : 'Video'}</span>${kind === 'image' ? `<img src="${escapeHtml(url)}" alt="Önizləmə">` : `<video src="${escapeHtml(url)}" controls muted playsinline></video>`}${deleteBtn}` : (removed ? `<div class="text-xs font-bold text-red-500">${kind === 'image' ? 'Şəkil silinəcək' : 'Video silinəcək'}</div>` : '');
            });
        }
        function updateSeaBreezeMediaInputs(prefix) {
            const type = document.getElementById(`${prefix}-mediaType`)?.value || 'none';
            const showImage = type === 'image' || type === 'image_video';
            const showVideo = type === 'video' || type === 'image_video';
            const imageField = document.getElementById(`${prefix}-image-field`);
            const videoField = document.getElementById(`${prefix}-video-field`);
            if (imageField) imageField.hidden = !showImage;
            if (videoField) videoField.hidden = !showVideo;
            renderSeaBreezePreview(prefix);
        }
        function removeSeaBreezeSectionMedia(kind) {
            window.__seaBreezeRemovedMedia = window.__seaBreezeRemovedMedia || {};
            window.__seaBreezeRemovedMedia['sb-sections'] = window.__seaBreezeRemovedMedia['sb-sections'] || {};
            window.__seaBreezeRemovedMedia['sb-sections'][kind] = true;
            const input = document.getElementById(`sb-sections-${kind}`); if (input) input.value = '';
            renderSeaBreezePreview('sb-sections', window.__seaBreezeEditingSection || {});
        }
        window.removeSeaBreezeSectionMedia = removeSeaBreezeSectionMedia;
        window.updateSeaBreezeMediaInputs = updateSeaBreezeMediaInputs;
        function seaBreezeMediaTypeFromItem(x, allowNone = false) {
            const existing = x.media_type || x.mediaType;
            if (existing) return existing === 'image+video' ? 'image_video' : existing;
            if ((x.image_url || x.imageUrl) && (x.video_url || x.videoUrl)) return 'image_video';
            if (x.video_url || x.videoUrl) return 'video';
            if (x.image_url || x.imageUrl) return 'image';
            return allowNone ? 'none' : 'image';
        }
        function resetSeaBreezeSectionForm() {
            const form = document.querySelector('#sb-sections-form-card form');
            form?.reset();
            const id = document.getElementById('sb-sections-id'); if (id) id.value = '';
            ['sb-sections-image','sb-sections-video'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
            const active = document.getElementById('sb-sections-isActive'); if (active) active.checked = true;
            const mediaType = document.getElementById('sb-sections-mediaType'); if (mediaType) mediaType.value = 'none';
            window.__seaBreezeEditingSection = null; window.__seaBreezeRemovedMedia = window.__seaBreezeRemovedMedia || {}; window.__seaBreezeRemovedMedia['sb-sections'] = {};
            const btn = document.getElementById('sb-sections-save-btn'); if (btn) btn.textContent = 'Saxla';
            const label = document.getElementById('sb-sections-edit-label'); if (label) { label.textContent = ''; label.classList.add('hidden'); }
            updateSeaBreezeMediaInputs('sb-sections');
            renderSeaBreezePreview('sb-sections');
        }
        window.resetSeaBreezeSectionForm = resetSeaBreezeSectionForm;

        function resetSeaBreezeGalleryForm() {
            const form = document.querySelector('#sb-gallery-media')?.closest('form');
            form?.reset();
            const media = document.getElementById('sb-gallery-media'); if (media) media.value = '';
        }

        function editSeaBreezeAdmin(type, id) {
            const store = type === 'hero-slides' ? window.__seaBreezeAdminHeroes : window.__seaBreezeAdminSections;
            const x = (store || []).find(item => Number(item.id) === Number(id));
            if (!x) return;
            if (type === 'hero-slides') {
                document.getElementById('sb-hero-id').value = x.id;
                document.getElementById('sb-hero-title').value = x.title || '';
                document.getElementById('sb-hero-subtitle').value = x.subtitle || '';
                document.getElementById('sb-hero-cta').value = x.ctaText || x.cta_text || '';
                document.getElementById('sb-hero-link').value = x.ctaLink || x.cta_link || '';
                document.getElementById('sb-hero-durationSeconds').value = x.durationSeconds ?? x.duration_seconds ?? 6;
                document.getElementById('sb-hero-mediaType').value = seaBreezeMediaTypeFromItem(x);
                updateSeaBreezeMediaInputs('sb-hero');
                renderSeaBreezePreview('sb-hero', x);
                return;
            }
            document.getElementById('sb-sections-id').value = x.id;
            document.getElementById('sb-sections-key').value = x.slug || x.section_key || '';
            document.getElementById('sb-sections-title').value = x.title || '';
            document.getElementById('sb-sections-content').value = x.content || '';
            document.getElementById('sb-sections-facts').value = Array.isArray(x.facts) ? x.facts.join('\n') : '';
            const sort = document.getElementById('sb-sections-sortOrder'); if (sort) sort.value = x.sort_order ?? x.sortOrder ?? 0;
            const mediaType = document.getElementById('sb-sections-mediaType'); if (mediaType) mediaType.value = seaBreezeMediaTypeFromItem(x, true);
            updateSeaBreezeMediaInputs('sb-sections');
            window.__seaBreezeEditingSection = x; window.__seaBreezeRemovedMedia = window.__seaBreezeRemovedMedia || {}; window.__seaBreezeRemovedMedia['sb-sections'] = {};
            renderSeaBreezePreview('sb-sections', x);
            const active = document.getElementById('sb-sections-isActive'); if (active) active.checked = x.is_active !== false;
            const saveBtn = document.getElementById('sb-sections-save-btn'); if (saveBtn) saveBtn.textContent = 'Yenilə';
            const label = document.getElementById('sb-sections-edit-label'); if (label) { label.textContent = `Redaktə edilir: ${x.title || 'Bölmə'}`; label.classList.remove('hidden'); }
            const card = document.getElementById('sb-sections-form-card');
            card?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setTimeout(() => (document.getElementById('sb-sections-title') || document.getElementById('sb-sections-key'))?.focus(), 250);
        }
        async function saveSeaBreezeAdmin(event, type) {
            event.preventDefault();
            const form = event.target;
            const button = form.querySelector('button[type="submit"], button:not([type])');
            const oldText = button?.textContent;
            if (button) { button.disabled = true; button.textContent = 'Saxlanılır...'; }
            let saveSucceeded = false;
            try {
                const fd=new FormData(); const p= type==='hero-slides'?'sb-hero':type==='sections'?'sb-sections':'sb-gallery';
                if (type === 'sections') {
                    const removed = window.__seaBreezeRemovedMedia?.[p] || {};
                    if (removed.image) fd.append('removeImage', 'true');
                    if (removed.video) fd.append('removeVideo', 'true');
                    fd.append('slug', document.getElementById(`${p}-key`)?.value || '');
                    ['title','content','facts','sortOrder'].forEach(k=>{ const el=document.getElementById(`${p}-${k}`); if(el) fd.append(k, el.value); });
                    fd.append('isActive', document.getElementById(`${p}-isActive`)?.checked ? 'true' : 'false');
                    fd.append('media_type', document.getElementById(`${p}-mediaType`)?.value || 'none');
                } else {
                    ['title','subtitle','content','key','facts','category','cta','link','durationSeconds'].forEach(k=>{const el=document.getElementById(`${p}-${k}`); if(el) fd.append(k==='key'?'section_key':k==='cta'?'cta_text':k==='link'?'cta_link':k==='durationSeconds'?'duration_seconds':k, el.value)});
                    const mediaType = document.getElementById(`${p}-mediaType`); if (mediaType) fd.append('media_type', mediaType.value);
                }
                ['image','video','media'].forEach(k=>{const el=document.getElementById(`${p}-${k}`); if(el?.files?.[0]) fd.append(k, el.files[0])});
                const id = document.getElementById(`${p}-id`)?.value;
                const url = id ? `/api/seabreeze/${type}/${id}` : `/api/seabreeze/${type}`;
                await apiRequest(url, { method: id ? 'PUT' : 'POST', body: fd });
                saveSucceeded = true;
                if (type === 'hero-slides') invalidateSeaBreezePublicCaches('seaBreezeHero');
                if (type === 'sections') invalidateSeaBreezePublicCaches('seaBreezeSections');
                if (type === 'gallery') invalidateSeaBreezePublicCaches('seaBreezeGallery');
                await loadSeaBreezeAdmin();
                form.reset();
                const active = document.getElementById('sb-sections-isActive'); if (active) active.checked = true;
                const heroDuration = document.getElementById('sb-hero-durationSeconds'); if (heroDuration) heroDuration.value = 6;
                const heroMediaType = document.getElementById('sb-hero-mediaType'); if (heroMediaType) heroMediaType.value = 'image';
                const sectionMediaType = document.getElementById('sb-sections-mediaType'); if (sectionMediaType) sectionMediaType.value = 'none';
                updateSeaBreezeMediaInputs('sb-hero'); updateSeaBreezeMediaInputs('sb-sections'); renderSeaBreezePreview('sb-hero'); renderSeaBreezePreview('sb-sections');
                if (type === 'sections') resetSeaBreezeSectionForm();
                if (type === 'gallery') resetSeaBreezeGalleryForm();
                showToast(type === 'sections' ? 'Sea Breeze bölməsi saxlanıldı' : (type === 'gallery' ? 'Media əlavə edildi.' : 'Saxlanıldı.'));
            } catch (error) {
                console.error('[seabreeze-admin] save failed', error);
                showToast(error.message || 'Sea Breeze bölməsi saxlanılmadı', 'error');
            } finally {
                if (button) { button.disabled = false; button.textContent = (saveSucceeded && type === 'sections') ? 'Saxla' : (oldText || 'Saxla'); }
            }
        }
        async function moveSeaBreezeSection(id, dir, button) {
            const previous = [...(window.__seaBreezeAdminSections || [])];
            const items = previous.map((x) => ({ ...x }));
            const i = items.findIndex(x => Number(x.id) === Number(id));
            const j = i + dir;
            if (i < 0 || j < 0 || j >= items.length) return;
            const oldHtml = button?.innerHTML;
            if (button) { button.disabled = true; button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; }
            [items[i], items[j]] = [items[j], items[i]];
            items.forEach((item, index) => { item.sort_order = index + 1; item.sortOrder = index + 1; });
            window.__seaBreezeAdminSections = items;
            const se = document.getElementById('sb-sections-admin-list');
            if (se) {
                const quickRows = items.map((x, idx, arr) => `<div class="sb-admin-card glass-card rounded-2xl p-4 text-white" data-sb-row-id="${x.id}" ${isSection ? 'draggable="true"' : ''}><button type="button" class="sb-drag-handle" aria-label="Sıranı dəyiş"><i class="fa-solid fa-grip-vertical"></i></button><div class="sb-admin-thumb">${seaBreezeAdminThumb(x)}</div><div class="min-w-0 flex-1"><b class="block truncate">${escapeHtml(x.title||'Bölmə')}</b><p class="text-xs text-gray-400">#${x.id} • sıra ${idx + 1} • ${x.is_active===false?'Deaktiv':'Aktiv'}</p><p class="text-xs text-gray-400 truncate">${escapeHtml(x.content || '')}</p></div><div class="sb-admin-actions"><button type="button" onclick="editSeaBreezeAdmin('sections',${x.id})" class="px-3 py-1 rounded-lg bg-white/10 text-xs">Edit</button><button type="button" onclick="moveSeaBreezeSection(${x.id},-1,this)" ${idx===0?'disabled':''} class="px-3 py-1 rounded-lg bg-white/10 text-xs disabled:opacity-40" aria-label="Yuxarı"><i class="fa-solid fa-arrow-up"></i></button><button type="button" onclick="moveSeaBreezeSection(${x.id},1,this)" ${idx>=arr.length-1?'disabled':''} class="px-3 py-1 rounded-lg bg-white/10 text-xs disabled:opacity-40" aria-label="Aşağı"><i class="fa-solid fa-arrow-down"></i></button><button type="button" onclick="toggleSeaBreezeAdmin('sections',${x.id},${x.is_active!==false})" class="px-3 py-1 rounded-lg bg-white/10 text-xs">${x.is_active===false?'Aktiv et':'Deaktiv et'}</button><button type="button" onclick="deleteSeaBreezeAdmin('sections',${x.id})" class="px-3 py-1 rounded-lg bg-red-600 text-xs">Sil</button></div></div>`).join('');
                se.innerHTML = quickRows;
            }
            try {
                await apiRequest('/api/seabreeze/sections/reorder', {method:'PUT', body:JSON.stringify({order:items.map(x=>({id:x.id}))})});
                invalidateSeaBreezePublicCaches('seaBreezeSections');
                await loadSeaBreezeAdmin();
                showToast('Sıralama yeniləndi.');
            } catch (error) {
                window.__seaBreezeAdminSections = previous;
                await loadSeaBreezeAdmin();
                showToast(error.message || 'Sıralama yenilənmədi', 'error');
            } finally {
                if (button) { button.disabled = false; button.innerHTML = oldHtml || ''; }
            }
        }
        function seaBreezeCacheKeyForType(type) { return type === 'hero-slides' ? 'seaBreezeHero' : (type === 'sections' ? 'seaBreezeSections' : 'seaBreezeGallery'); }
        async function toggleSeaBreezeAdmin(type,id,active){ await apiRequest(`/api/seabreeze/${type}/${id}/toggle`, {method:'PATCH', body:JSON.stringify({is_active:!active})}); invalidateSeaBreezePublicCaches(seaBreezeCacheKeyForType(type)); loadSeaBreezeAdmin(); }
        async function deleteSeaBreezeAdmin(type,id){ if(!confirm('Silinsin?')) return; await apiRequest(`/api/seabreeze/${type}/${id}`, {method:'DELETE'}); invalidateSeaBreezePublicCaches(seaBreezeCacheKeyForType(type)); loadSeaBreezeAdmin(); }

        const ADMIN_QUERY_TAB_SUBTABS = {
            qalereya: 'gallery-manager',
            gallery: 'gallery-manager',
            'media-gallery': 'gallery-manager',
            'media-qalereya': 'gallery-manager',
            ads: 'ads-manager',
            reklam: 'ads-manager',
            advertisements: 'ads-manager',
            music: 'site-music',
            musiqi: 'site-music',
            'site-music': 'site-music',
            vakansiya: 'vacancy-manager',
            vacancy: 'vacancy-manager',
            'site-settings': 'site-settings',
            listings: 'seabreeze-manager',
            projects: 'projects-manager',
            archive: 'projects-archive',
            'project-inquiries': 'project-inquiries',
            'project-hero': 'hero-sections',
            'listing-hero': 'listing-hero',
            vacancies: 'vacancy-manager',
            'seabreeze-hero': 'seabreeze-hero',
            'seabreeze-info': 'seabreeze-info-admin'
        };

        const ADMIN_ROUTE_SUBTABS = {
            '/admin': 'seabreeze-manager',
            '/admin/listings': 'seabreeze-manager',
            '/admin/qalereya': 'gallery-manager',
            '/admin/gallery': 'gallery-manager',
            '/admin/media-gallery': 'gallery-manager',
            '/admin/media-qalereya': 'gallery-manager',
            '/admin/ads': 'ads-manager',
            '/admin/reklam': 'ads-manager',
            '/admin/advertisements': 'ads-manager',
            '/admin/site-music': 'site-music',
            '/admin/musiqi': 'site-music',
            '/admin/vakansiya': 'vacancy-manager',
            '/admin/vacancy': 'vacancy-manager',
            '/admin/site-settings': 'site-settings',
            '/admin/projects': 'projects-manager',
            '/admin/projects/archive': 'projects-archive',
            '/admin/project-inquiries': 'project-inquiries',
            '/admin/project-hero': 'hero-sections',
            '/admin/listing-hero': 'listing-hero',
            '/admin/vacancies': 'vacancy-manager',
            '/admin/seabreeze-hero': 'seabreeze-hero',
            '/admin/seabreeze-info': 'seabreeze-info-admin'
        };

        function openAuthenticatedRoute(tabId, pendingPath) {
            if (!activeUser) {
                setPendingAuthRoute(pendingPath || window.location.pathname + window.location.search + window.location.hash);
                switchTab('admin-login', { skipPush: true });
                return false;
            }
            switchTab(tabId, { skipPush: true });
            return true;
        }

        function routeToDashboardSubtab(subtab, path) {
            if (!openAuthenticatedRoute('admin-dashboard', path)) return;
            document.getElementById('admin-access-denied-route')?.remove();
            if (path.startsWith('/admin') && !isAdminRole(activeUser.role)) {
                hideAdminSubtabPanels();
                renderDashboardSubtabButtons();
                const dashboard = document.getElementById('tab-admin-dashboard');
                if (dashboard) dashboard.insertAdjacentHTML('afterbegin', '<div class="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200" id="admin-access-denied-route">Bu admin bölməsinə giriş icazəniz yoxdur.</div>');
                return;
            }
            switchAdminSubtab(subtab, { skipPush: true });
        }

        async function routeToCurrentPath({ replace = false } = {}) {
            cleanupTransientListingModals();
            let path = window.location.pathname;
            if (isAdminHost() && !['/reset-password'].includes(path)) {
                if (!activeUser || !isAdminRole(activeUser.role)) {
                    if (getAuthToken() && activeUser && !isAdminRole(activeUser.role)) {
                        showToast('Bu admin bölməsinə giriş icazəniz yoxdur.');
                    }
                    switchTab('admin-login', { skipPush: true });
                    updateSeo({ title: 'Admin Giriş', description: DEFAULT_SEO_DESCRIPTION, path: `${path}${window.location.search}` });
                    return;
                }

                const adminQueryTab = new URLSearchParams(window.location.search).get('tab');
                const subtab = ADMIN_QUERY_TAB_SUBTABS[adminQueryTab] || ADMIN_ROUTE_SUBTABS[path] || 'seabreeze-manager';
                switchTab('admin-dashboard', { skipPush: true });
                switchAdminSubtab(subtab, { skipPush: true });
                updateSeo({ title: 'Admin Panel', path: `${path}${window.location.search}` });
                return;
            }
            if (ADMIN_ROUTE_SUBTABS[path]) {
                const adminQueryTab = new URLSearchParams(window.location.search).get('tab');
                routeToDashboardSubtab(ADMIN_QUERY_TAB_SUBTABS[adminQueryTab] || ADMIN_ROUTE_SUBTABS[path], `${path}${window.location.search}`);
                updateSeo({ title: 'Admin Panel', path });
                return;
            }
            if (path === '/profil' || path === '/profile' || path === '/profil/melumatlar' || path === '/profile/melumatlar') {
                const params = new URLSearchParams(window.location.search);
                const profileTab = params.get('tab');
                const profileSection = params.get('section');
                const requestedAdminSubtab = profileTab === 'admin' && profileSection
                    ? (ADMIN_QUERY_TAB_SUBTABS[profileSection] || normalizeAdminSubtab(profileSection))
                    : 'user-profile';
                routeToDashboardSubtab(requestedAdminSubtab, `${path}${window.location.search}`);
                updateSeo({ title: 'Profil', path });
                return;
            }
            if (path === '/profil/elanlarim' || path === '/profile/elanlarim' || path === '/profile/listings' || path === '/menim-elanlarim') {
                if (!openAuthenticatedRoute('admin-dashboard', path)) return;
                switchAdminSubtab('seabreeze-manager', { skipPush: true });
                updateSeo({ title: 'Mənim elanlarım', path });
                return;
            }
            if (path === '/profil/favoriler' || path === '/profile/favoriler' || path === '/profile/favorites' || path === '/favoriler') {
                if (!openAuthenticatedRoute('favorites', path)) return;
                updateSeo({ title: 'Favorilər', path });
                return;
            }
            if (path === '/profil/mesajlar' || path === '/profile/messages' || path === '/messages') {
                if (!openAuthenticatedRoute('messages', `${path}${window.location.search}`)) return;
                updateSeo({ title: 'Mesajlar', path });
                return;
            }
            if (path === '/elan-elave-et' || path === '/create-listing') {
                if (!openAuthenticatedRoute('create-listing', path)) return;
                updateSeo({ title: 'Elan əlavə et', path });
                return;
            }
            const userListingsMatch = path.match(/^\/user\/(\d+)\/listings\/?$/);
            if (userListingsMatch) { await renderPublicProfile(userListingsMatch[1], true); return; }
            const userMatch = path.match(/^\/user\/(\d+)\/?$/);
            if (userMatch) { await renderPublicProfile(userMatch[1], false); return; }
            if (path === '/elanlar' || path === '/listings') {
                switchTab('listings', { skipPush: true });
                applyListingsRouteFilters();
                if (homepageHydration.listings) renderSeaBreeze();
                updateSeo({ title: STATIC_SEO['/elanlar'].title, description: STATIC_SEO['/elanlar'].description, path: `${path}${window.location.search}` });
                return;
            }
            if (path === '/sea-breeze' || path === '/seabreeze' || path === '/seabreeze-info') {
                history.replaceState({ path: '/sea-breeze-haqqinda' }, '', '/sea-breeze-haqqinda');
                path = '/sea-breeze-haqqinda';
            }
            if (path === '/sea-breeze-haqqinda') {
                switchTab('seabreeze-info', { skipPush: true });
                updateSeo({ title: STATIC_SEO['/sea-breeze-haqqinda'].title, description: STATIC_SEO['/sea-breeze-haqqinda'].description, path });
                loadSeaBreezePage();
                return;
            }
            if (path === '/projects') {
                switchTab('seabreeze', { skipPush: true });
                updateSeo({ title: STATIC_SEO['/projects'].title, description: STATIC_SEO['/projects'].description, path });
                return;
            }
            if (path.startsWith('/project/')) {
                switchTab('seabreeze', { skipPush: true });
                const slug = currentRouteValue();
                let project = getOfficialProjects().find(item => matchesSlugOrId(item, slug));
                if (!project) {
                    try {
                        project = dbProjectToUi(await apiRequest(`/api/projects/slug/${encodeURIComponent(slug)}`));
                    } catch (_slugError) {
                        if (/^\d+$/.test(slug)) {
                            try { project = dbProjectToUi(await apiRequest(`/api/projects/${encodeURIComponent(slug)}`)); } catch (_idError) { /* fallback to list */ }
                        }
                    }
                    if (project) upsertCachedItem('projects', project);
                }
                if (project) openOfficialProjectModal(project.id, false);
                return;
            }
            if (path.startsWith('/listing/')) {
                switchTab('listings', { skipPush: true });
                const code = currentRouteValue();
                let listing = appData.listings.find(item => String(item.listingCode || item.id) === String(code));
                if (!listing) {
                    try {
                        listing = dbListingToUi(await apiRequest(`/api/listings/code/${encodeURIComponent(code)}`));
                    } catch (_codeError) {
                        if (/^\d+$/.test(code)) {
                            try { listing = dbListingToUi(await apiRequest(`/api/listings/${encodeURIComponent(code)}`)); } catch (_idError) { /* fallback to list */ }
                        }
                    }
                    if (listing) upsertCachedItem('listings', listing);
                }
                if (listing) openPropertyModal(listing.id, false);
                return;
            }
            if (path === '/vacancies' || path === '/vakansiya') {
                switchTab('career', { skipPush: true });
                updateSeo({ title: 'Vakansiyalar', path });
                return;
            }
            if (path.startsWith('/vacancy/')) {
                switchTab('career', { skipPush: true });
                const slug = currentRouteValue();
                let vacancy = appData.vacancies.find(item => matchesSlugOrId(item, slug));
                if (!vacancy) {
                    try {
                        vacancy = dbVacancyToUi(await apiRequest(`/api/vacancies/slug/${encodeURIComponent(slug)}`));
                    } catch (_slugError) {
                        if (/^\d+$/.test(slug)) {
                            try { vacancy = dbVacancyToUi(await apiRequest(`/api/vacancies/${encodeURIComponent(slug)}`)); } catch (_idError) { /* fallback to list */ }
                        }
                    }
                    if (vacancy) {
                        upsertCachedItem('vacancies', vacancy);
                        renderCareerSection();
                    }
                }
                if (vacancy) {
                    updateSeo({ title: `${vacancy.title} Vakansiyası`, description: vacancy.desc || DEFAULT_SEO_DESCRIPTION, path });
                    setTimeout(() => toggleVacancyAccordion(vacancy.id), 50);
                }
                return;
            }
            if (path === '/gallery' || path === '/qalereya' || path === '/videos') {
                switchTab('portfolio', { skipPush: true });
                window.BestHomeGallery.setCurrentFilter(path === '/videos' ? 'video' : 'all');
                renderPortfolio();
                updateSeo({ title: path === '/videos' ? 'Videolar' : STATIC_SEO['/gallery'].title, description: path === '/videos' ? DEFAULT_SEO_DESCRIPTION : STATIC_SEO['/gallery'].description, path });
                return;
            }
            if (path.startsWith('/gallery/') || path.startsWith('/video/')) {
                switchTab('portfolio', { skipPush: true });
                window.BestHomeGallery.setCurrentFilter(path.startsWith('/video/') ? 'video' : 'all');
                const id = currentRouteValue();
                let item = appData.gallery.find(g => String(g.id) === String(id));
                if (!item && /^\d+$/.test(id)) {
                    try {
                        item = dbGalleryToUi(await apiRequest(`/api/gallery/${encodeURIComponent(id)}`));
                        upsertCachedItem('gallery', item);
                        renderPortfolio();
                    } catch (_error) { /* fallback to list */ }
                }
                const index = appData.gallery.findIndex(g => String(g.id) === String(id));
                if (index > -1) openGalleryDetailModal(index, false);
                return;
            }
            switchTab(path === '/ipoteka-kalkulyatoru' ? 'mortgage' : (path === '/haqqimizda' ? 'home' : 'seabreeze'), { skipPush: true });
            updateSeo({ title: STATIC_SEO[path]?.title || SITE_NAME, description: STATIC_SEO[path]?.description || DEFAULT_SEO_DESCRIPTION, path });
        }

        function logHorizontalOverflow() {
            if (!window.BESTHOME_DEBUG_OVERFLOW) return;
            document.querySelectorAll('*').forEach((el) => {
                if (el.scrollWidth > document.documentElement.clientWidth + 2) {
                    console.warn('Overflow element:', el, {
                        scrollWidth: el.scrollWidth,
                        clientWidth: document.documentElement.clientWidth
                    });
                }
            });
        }

        window.BestHomeAdminRuntime = {
            get appData() { return appData; },
            get activeUser() { return activeUser; },
            apiRequest, cacheData, dbListingToUi, isAdminRole, loadAdminListings,
            renderAdminDashboard, renderSeaBreeze, showToast, beginAdminAction, finishAdminAction
        };

        // MAIN SETUP AND BOOTSTRAP
        window.addEventListener('resize', () => {
            renderDesktopAds();
            updateMobileModalMetrics();
            if (typeof window.isPropertyLightboxOpen === 'function' && window.isPropertyLightboxOpen()) applyPropertyLightboxImageFit(document.getElementById('property-lightbox-img'));
            if (typeof window.isProjectLightboxOpen === 'function' && window.isProjectLightboxOpen()) applyPropertyLightboxImageFit(document.getElementById('project-lightbox-img'));
        });

        window.addEventListener('DOMContentLoaded', async () => {
            emergencyStartupOverlayCleanup();
            bindUserEditModalHandlers();
            applySiteTheme(preferredTheme());
            window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (preferredTheme() === 'system') applySiteTheme('system'); });
            const initialPath = window.location.pathname;
            const adminHost = applyAdminHostClass();
            updateMobileModalMetrics();
            renderProjectImageInputs(['']);
            bootstrapCachedData();
            if (!adminHost && ['/', '/projects', '/layiheler', ''].includes(initialPath)) {
                switchTab('seabreeze', { skipPush: true });
                setHomepageInitialLoading(true);
            } else if (adminHost) {
                switchTab('admin-login', { skipPush: true });
            }
            const authReady = initializeAuth();
            if (await verifyEmailFromUrl()) return;
            if (initialPath === '/reset-password') { await authReady; switchTab('reset-password', { skipPush: true }); return; }
            if (await completeGoogleLoginFromUrl()) {
                setMobileBottomNavActive();
                populateMetroSelect();
                toggleMetroFieldForCity();
                setTimeout(initAdminListingMap, 120);
                return;
            }
            if (adminHost) await authReady;
            await routeToCurrentPath();
            logHorizontalOverflow();
            hydrateFromDatabase().then(() => logHorizontalOverflow()).catch(error => console.warn('İlkin məlumat yüklənməsi tamamlanmadı:', error.message));
            scheduleIdleTask(() => loadSiteMusicBackground({ render: true }).catch(() => {}), 1000);
            setMobileBottomNavActive();
            populateMetroSelect();
            toggleMetroFieldForCity();
            setTimeout(initAdminListingMap, 120);
            await authReady;
        });

        window.addEventListener('popstate', () => {
            routeToCurrentPath().finally(() => setMobileBottomNavActive());
        });
