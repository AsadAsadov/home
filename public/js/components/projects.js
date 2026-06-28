// BestHome.az Projects component extraction.
// Safe extraction only: keeps existing global function names for inline HTML compatibility.
(function () {
    'use strict';

    let selectedProjectCategory = 'all';
    let projectSearchQuery = '';
    let projectPage = 1;
    let projectSearchTimer = null;
    let officialProjectImages = [];
    let officialProjectImageIndex = 0;

    function handleProjectSearchInput() {
            projectSearchQuery = document.getElementById('project-live-search')?.value.trim().toLowerCase() || '';
            projectPage = 1;
            renderOfficialProjects();
            clearTimeout(projectSearchTimer);
            projectSearchTimer = setTimeout(fetchProjectsBySearch, 250);
        }

        async function fetchProjectsBySearch() {
            // Project filters are applied client-side against the full project source so
            // delivery year options are never rebuilt from a filtered API response.
            renderOfficialProjects();
        }

        function switchProjectCategory(category = 'all') {
            selectedProjectCategory = category || 'all';
            projectPage = 1;
            document.querySelectorAll('.project-cat-btn').forEach(button => {
                const isActive = button.id === `p-cat-${selectedProjectCategory}`;
                button.classList.toggle('bg-brand-500', isActive);
                button.classList.toggle('text-white', isActive);
                button.classList.toggle('bg-brand-50', !isActive);
                button.classList.toggle('text-gray-500', !isActive);
            });
            renderOfficialProjects();
        }

        function setProjectPage(page, category) {
            if (category) selectedProjectCategory = category;
            const nextPage = Number.parseInt(page, 10);
            projectPage = Number.isFinite(nextPage) ? Math.max(1, nextPage) : 1;
            renderOfficialProjects();
            document.getElementById('sea-breeze-projects-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }


        function extractProjectDeliveryYear(project = {}) {
            const deliveryText = String(project.deliveryDate || project.delivery_date || project.year || '');
            return deliveryText.match(/\d{4}/)?.[0] || '';
        }

        function isProjectDelivered(project = {}) {
            const statusText = String(project.status || project.projectStatus || project.project_status || project.deliveryStatus || project.delivery_status || project.badge || project.badge_text || project.deliveryDate || project.delivery_date || project.year || '').trim().toLowerCase();
            if (/təhvil\s*verilib|tehvil\s*verilib|delivered|completed|complete|hazır|ready|bitib|finished/.test(statusText)) return true;
            if (project.isDelivered === true || project.is_delivered === true || project.isCompleted === true || project.is_completed === true) return true;
            const year = Number.parseInt(extractProjectDeliveryYear(project), 10);
            return Number.isFinite(year) && year <= new Date().getFullYear();
        }

        function renderProjectYearOptions(projects) {
            const select = document.getElementById('project-delivery-year-filter');
            if (!select) return;
            const current = select.value || 'all';
            const years = [...new Set(projects.map(extractProjectDeliveryYear).filter(Boolean))].sort();
            select.innerHTML = '<option value="all">Bütün illər</option><option value="delivered">Təhvil verilib</option>' + years.map(year => `<option value="${year}">${year}</option>`).join('');
            select.value = current === 'delivered' ? 'delivered' : (years.includes(current) ? current : 'all');
        }


        function getProjectPictureMarkup(project = {}, className = 'w-full h-full object-cover transition duration-500') {
            const imageUrl = project.img || project.image || project.imageUrl || project.coverImage || project.cover_image || project.mainImage || project.main_image || project.thumbnail || (Array.isArray(project.images) ? project.images[0] : '');
            const title = project.title || 'BestHome layihəsi';
            if (imageUrl) {
                return `<img src="${escapeHtml(imageUrl)}" width="800" height="600" loading="lazy" decoding="async" class="${escapeHtml(className)}" alt="${escapeHtml(title)}">`;
            }
            return `<div class="${escapeHtml(className)} flex items-center justify-center bg-gradient-to-br from-slate-900 via-brand-700 to-slate-700 text-white"><span class="text-xs font-black uppercase tracking-[0.28em]">BestHome</span></div>`;
        }

        const PROJECT_VIEW_THROTTLE_MS = 6 * 60 * 60 * 1000;
        let mostViewedProjectsOpen = false;

        function setMostViewedProjectsOpen(open) {
            mostViewedProjectsOpen = Boolean(open);
            const body = document.getElementById('mostViewedProjectsBody');
            const toggle = document.getElementById('mostViewedProjectsToggle');
            if (body) body.classList.toggle('is-collapsed', !mostViewedProjectsOpen);
            if (toggle) {
                toggle.setAttribute('aria-expanded', String(mostViewedProjectsOpen));
                toggle.classList.toggle('is-open', mostViewedProjectsOpen);
            }
        }

        function toggleMostViewedProjects() {
            setMostViewedProjectsOpen(!mostViewedProjectsOpen);
        }

        function renderMostViewedProjects() {
            const el = document.getElementById('most-viewed-projects'); if (!el) return;
            const rows = getOfficialProjects().slice().sort((a,b) => Number(b.viewCount||0)-Number(a.viewCount||0)).slice(0,5);
            el.innerHTML = rows.length ? rows.map(p => `<button type="button" onclick="openOfficialProjectModal('${p.id}', true)" class="rounded-2xl overflow-hidden border border-slate-200 bg-white/80 text-left hover:-translate-y-1 hover:border-brand-500 transition"><div class="h-28 overflow-hidden">${getProjectPictureMarkup(p,'w-full h-full object-cover')}</div><div class="p-3"><strong class="block truncate text-sm text-slate-950">${escapeHtml(p.title)}</strong><span class="text-xs font-black text-slate-500">👁 ${Number(p.viewCount||0)} baxış</span><div class="mt-2 flex flex-wrap gap-1">${[p.year,p.area].filter(Boolean).slice(0,2).map(x=>`<span class="rounded-full bg-slate-100 px-2 py-1 text-sm font-black text-slate-600">${escapeHtml(x)}</span>`).join('')}</div></div></button>`).join('') : '<div class="col-span-full text-sm font-bold text-slate-500">Hələ baxış statistikası yoxdur.</div>';
            setMostViewedProjectsOpen(mostViewedProjectsOpen);
        }


        function getProjectDescription(project = {}) {
            let metadata = project.metadata && typeof project.metadata === 'object' ? project.metadata : {};
            if (typeof project.metadata === 'string') {
                try { metadata = JSON.parse(project.metadata); } catch (_error) { metadata = {}; }
            }
            const values = [
                project.description,
                project.descriptionAz,
                project.desc,
                project.content,
                project.details,
                project.about,
                metadata.description
            ];
            for (const value of values) {
                const text = String(value ?? '').trim();
                if (text) return text;
            }
            return '';
        }


        // RENDER OFFICIAL LAYOUTS
        function renderOfficialProjects() {
            const container = document.getElementById('sea-breeze-projects-list');
            if (!container) return;
            container.innerHTML = '';

            if (dataLoadState.projects.loading) {
                container.innerHTML = renderCardSkeletons(6);
                renderPagination('projects-pagination', 1, 1, 'setProjectPage');
                return;
            }

            const allProjects = getOfficialProjects();
            renderProjectYearOptions(allProjects);
            const deliveryYear = document.getElementById('project-delivery-year-filter')?.value || 'all';
            const filtered = allProjects.filter(p => {
                const titleText = String(p.title || '').toLowerCase();
                const year = extractProjectDeliveryYear(p);
                return (selectedProjectCategory === 'all' || p.category === selectedProjectCategory)
                    && (!projectSearchQuery || titleText.includes(projectSearchQuery))
                    && (deliveryYear === 'all' || (deliveryYear === 'delivered' ? isProjectDelivered(p) : year === deliveryYear));
            });
            officialProjectNavigationProjects = filtered;
            const totalPages = Math.max(Math.ceil(filtered.length / window.PAGE_SIZE), 1);
            projectPage = Math.min(projectPage, totalPages);
            const paged = filtered.slice((projectPage - 1) * window.PAGE_SIZE, projectPage * window.PAGE_SIZE);

            if (filtered.length === 0) {
                container.innerHTML = allProjects.length === 0 ? emptyDataState() : `<div class="col-span-full py-10 text-center text-gray-500 glass-card rounded-2xl">Layihə tapılmadı.</div>`;
                renderPagination('projects-pagination', 1, 1, 'setProjectPage');
                return;
            }

            paged.forEach(p => {
                const projectTitle = p.title || '—';
                const projectDesc = getProjectDescription(p);
                const area = String(p.area || '').trim();
                const floors = String(p.floors || '').trim();
                const metaBadges = [
                    area ? `<span class="project-card-meta-badge" title="${escapeHtml(area)}"><i class="fa-solid fa-ruler-combined" aria-hidden="true"></i><span>${escapeHtml(area)}</span></span>` : '',
                    floors ? `<span class="project-card-meta-badge" title="${escapeHtml(floors)}"><i class="fa-solid fa-building" aria-hidden="true"></i><span>${escapeHtml(floors)}</span></span>` : ''
                ].filter(Boolean).join('');
                const projectMeta = metaBadges ? `<div class="project-card-meta">${metaBadges}</div>` : '';
                const cardHtml = `
                    <div onclick="openOfficialProjectModal('${p.id}', true)" class="sea-breeze-project-card group cursor-pointer rounded-2xl overflow-hidden glass-card hover:border-brand-500/50 transition-all duration-300 h-full flex flex-col">
                        <div class="sea-breeze-project-card__image h-48 md:h-52 relative overflow-hidden">
                            ${getProjectPictureMarkup(p)}
                            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                            ${p.year ? `<span class="sea-breeze-project-card__year absolute top-4 right-4 bg-brand-700 text-white text-sm font-bold px-2.5 py-1 rounded-full">${escapeHtml(p.year)}</span>` : ''}
                            <h3 class="sea-breeze-project-card__title absolute bottom-4 left-4 right-4 text-lg font-extrabold text-white overflow-hidden text-ellipsis line-clamp-2">${escapeHtml(projectTitle)}</h3>
                        </div>
                        <div class="sea-breeze-project-card__body p-4 flex-1 flex flex-col justify-between">
                            ${projectDesc ? `<p class="sea-breeze-project-card__description text-xs text-gray-700 line-clamp-2 font-medium">${escapeHtml(projectDesc)}</p>` : ''}
                            ${projectMeta}
                        </div>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', cardHtml);
            });
            renderPagination('projects-pagination', projectPage, totalPages, 'setProjectPage');
            renderMostViewedProjects();
        }

        // OPEN OFFICIAL PROJECT MODAL
        let currentProjectModalTab = 'details';
        let activeOfficialProject = null;
        let officialProjectNavigationProjects = null;
        let officialProjectTransitionTimer = null;



        function showToast(message) {
            if (typeof window.showToast === 'function' && window.showToast !== showToast) { window.showToast(message); return; }
            let toast = document.getElementById('besthome-toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'besthome-toast';
                toast.className = 'fixed left-1/2 top-24 z-[1200] -translate-x-1/2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-2xl transition';
                document.body.appendChild(toast);
            }
            toast.textContent = message;
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';
            clearTimeout(window.__besthomeToastTimer);
            window.__besthomeToastTimer = setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(-50%) translateY(-8px)'; }, 1800);
        }

        function projectSharePayload(project = activeOfficialProject) {
            if (!project) return null;
            const url = absoluteUrl(projectPath(project));
            const location = project.location || project.area || 'Sea Breeze';
            return { title: '🏡 BestHome', text: `🏡 BestHome\n\nLayihə:\n${project.title}\n\n📍 ${location}\n\n🔗 ${url}`, url };
        }
        async function shareActiveProject() {
            const payload = projectSharePayload();
            if (!payload) return;
            try {
                if (navigator.share && window.matchMedia('(max-width: 767px)').matches) await navigator.share(payload);
                else await navigator.clipboard.writeText(payload.text);
                showToast('✅ Link kopyalandı');
            } catch (_error) {
                try { await navigator.clipboard.writeText(payload.text); showToast('✅ Link kopyalandı'); } catch (_copyError) { alert(payload.url); }
            }
        }

        function updateProjectInCache(projectId, patch = {}) {
            const projects = getOfficialProjects();
            const index = projects.findIndex(item => String(item.id) === String(projectId));
            if (index < 0) return;
            projects[index] = { ...projects[index], ...patch };
            cacheData('projects', projects);
        }

        function setProjectPdfStatus(project = null) {
            const status = document.getElementById('project-pdf-status');
            if (!status) return;
            status.textContent = project?.pdfUrl ? `Manual PDF: ${project.pdfFilename || `${project.title || 'Layihə'}.pdf`}` : 'Manual PDF əlavə olunmayıb. Avtomatik PDF yükləmə aktivdir.';
        }

        async function uploadProjectBrochureFromInput() {
            const projectId = document.getElementById('edit-project-id')?.value;
            const input = document.getElementById('project-pdf-file');
            const file = input?.files?.[0];
            if (!projectId) { alert('PDF yükləmək üçün əvvəlcə layihəni saxlayın və redaktəyə açın.'); if (input) input.value = ''; return; }
            if (!file) return;
            if (file.type !== 'application/pdf') { alert('Yalnız PDF faylı yükləyin.'); input.value = ''; return; }
            const form = new FormData();
            form.append('file', file);
            try {
                const saved = dbProjectToUi(await apiRequest(`/api/projects/${projectId}/brochure`, { method: 'POST', body: form }));
                updateProjectInCache(projectId, saved);
                setProjectPdfStatus(saved);
                renderAdminProjects();
                showToast('✅ PDF yükləndi.');
            } catch (error) {
                alert('PDF yüklənmədi: ' + error.message);
            } finally {
                if (input) input.value = '';
            }
        }

        async function deleteProjectBrochure() {
            const projectId = document.getElementById('edit-project-id')?.value;
            if (!projectId) return alert('PDF silmək üçün layihəni redaktəyə açın.');
            if (!confirm('Layihə PDF-i silinsin?')) return;
            try {
                const saved = dbProjectToUi(await apiRequest(`/api/projects/${projectId}/brochure`, { method: 'DELETE' }));
                updateProjectInCache(projectId, saved);
                setProjectPdfStatus(saved);
                renderAdminProjects();
                showToast('✅ PDF silindi.');
            } catch (error) {
                alert('PDF silinmədi: ' + error.message);
            }
        }

        function generateProjectPdfPlaceholder() {
            alert('PDF broşür artıq avtomatik yaradılır. İstifadəçi layihə səhifəsində “PDF Yüklə” düyməsinə klikləyəndə sistem layihə məlumatları və şəkillərindən yeni PDF hazırlayır.');
        }

        async function downloadActiveProjectPdf() {
            if (!activeOfficialProject?.id) return;
            const button = document.getElementById('op-modal-pdf-btn');
            const originalText = button?.textContent || '📄 PDF Yüklə';
            const filename = `${(activeOfficialProject.title || 'Project').replace(/[\/:*?"<>|]+/g, ' ').trim() || 'Project'}.pdf`;
            if (button) { button.disabled = true; button.textContent = 'PDF hazırlanır...'; }
            try {
                const response = await fetch(`${window.API_BASE}/api/projects/${activeOfficialProject.id}/brochure.pdf`, { headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {} });
                if (!response.ok) throw new Error('PDF hazırlanmadı. Yenidən cəhd edin.');
                const blob = await response.blob();
                if (!blob.size) throw new Error('PDF hazırlanmadı. Yenidən cəhd edin.');
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = activeOfficialProject.pdfFilename || filename;
                document.body.appendChild(link);
                link.click();
                link.remove();
                setTimeout(() => URL.revokeObjectURL(url), 5000);
                const nextClicks = Number(activeOfficialProject.clickCount || 0) + 1;
                updateProjectInCache(activeOfficialProject.id, { clickCount: nextClicks });
                activeOfficialProject.clickCount = nextClicks;
                if (isAdminRole(window.getActiveUser?.()?.role)) refreshAdminStats({ render: true });
            } catch (_error) {
                alert('PDF hazırlanmadı. Yenidən cəhd edin.');
            } finally {
                if (button) { button.disabled = false; button.textContent = originalText; }
            }
        }

        function openProjectInquiryModal() {
            if (!activeOfficialProject) return;
            document.getElementById('project-inquiry-error')?.classList.add('hidden');
            document.getElementById('project-inquiry-success')?.classList.add('hidden');
            ['project-inquiry-name', 'project-inquiry-phone', 'project-inquiry-note'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
            document.getElementById('project-inquiry-modal')?.classList.remove('hidden');
            setModalOpenState(true);
        }

        function closeProjectInquiryModal() {
            document.getElementById('project-inquiry-modal')?.classList.add('hidden');
            syncModalOpenState();
        }

        async function submitProjectInquiry(event) {
            event.preventDefault();
            if (!activeOfficialProject) return;
            const button = document.getElementById('project-inquiry-submit');
            const errorBox = document.getElementById('project-inquiry-error');
            const payload = {
                name: document.getElementById('project-inquiry-name')?.value.trim(),
                phone: document.getElementById('project-inquiry-phone')?.value.trim(),
                note: document.getElementById('project-inquiry-note')?.value.trim()
            };
            if (!payload.name || !payload.phone) return;
            const successBox = document.getElementById('project-inquiry-success');
            if (errorBox) errorBox.classList.add('hidden');
            if (successBox) successBox.classList.add('hidden');
            if (button) { button.disabled = true; button.textContent = 'Göndərilir...'; }
            try {
                await apiRequest(`/api/projects/${activeOfficialProject.id}/inquiries`, { method: 'POST', body: JSON.stringify(payload), authRedirect: false });
                const nextCount = Number(activeOfficialProject.inquiryCount || 0) + 1;
                updateProjectInCache(activeOfficialProject.id, { inquiryCount: nextCount });
                activeOfficialProject.inquiryCount = nextCount;
                event.target.reset();
                if (successBox) { successBox.textContent = 'Göndərildi'; successBox.classList.remove('hidden'); }
                showToast('✅ Göndərildi');
                if (isAdminRole(window.getActiveUser?.()?.role)) refreshAdminStats({ render: true });
                window.setTimeout(() => closeProjectInquiryModal(), 1300);
            } catch (error) {
                if (errorBox) { errorBox.textContent = 'Müraciət göndərilmədi. Zəhmət olmasa yenidən cəhd edin.'; errorBox.classList.remove('hidden'); }
            } finally {
                if (button) { button.disabled = false; button.textContent = 'Göndər'; }
            }
        }

        function renderSimilarProjects(project) {
            return;
        }


        function destroyProjectDetailLocationMap({ hideSection = true } = {}) {
            const section = document.getElementById('op-modal-location-section');
            if (projectDetailMarker) {
                projectDetailMarker.remove();
                projectDetailMarker = null;
            }
            if (projectDetailMap) {
                projectDetailMap.remove();
                projectDetailMap = null;
            }
            setMapLoading('op-modal-location-map-loading', false);
            if (hideSection && section) section.classList.add('hidden');
        }

        function renderProjectDetailLocationMap(project = {}) {
            const section = document.getElementById('op-modal-location-section');
            const mapEl = document.getElementById('op-modal-location-map');
            const googleBtn = document.getElementById('op-modal-google-maps-btn');
            const routeBtn = document.getElementById('op-modal-route-btn');
            const actionsEl = document.getElementById('op-modal-map-actions');
            const lat = Number(project.latitude);
            const lng = Number(project.longitude);
            const hasCoordinates = isValidCoordinate(project.latitude, project.longitude);
            if (!section || !mapEl) return;
            if (currentProjectModalTab !== 'details') {
                destroyProjectDetailLocationMap({ hideSection: true });
                return;
            }
            section.classList.toggle('hidden', !hasCoordinates);
            actionsEl?.classList.toggle('hidden', !hasCoordinates);
            if (!hasCoordinates) {
                console.warn('[map] invalid coordinates, hiding map section');
                destroyProjectDetailLocationMap({ hideSection: true });
                return;
            }
            const point = [lat, lng];
            const mapQuery = `${lat},${lng}`;
            if (googleBtn) googleBtn.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
            if (routeBtn) routeBtn.href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapQuery)}`;
            if (typeof L === 'undefined') {
                ensureLeafletLoaded().then(() => {
                    if (currentProjectModalTab === 'details' && activeOfficialProject && String(activeOfficialProject.id) === String(project.id)) renderProjectDetailLocationMap(project);
                }).catch(error => { console.error(error); destroyProjectDetailLocationMap({ hideSection: true }); });
                return;
            }
            setMapLoading('op-modal-location-map-loading', false);
            console.warn('[map] initialized with project coordinates');
            setTimeout(() => {
                if (currentProjectModalTab !== 'details') return destroyProjectDetailLocationMap({ hideSection: true });
                if (!projectDetailMap) {
                    projectDetailMap = L.map(mapEl, { scrollWheelZoom: true }).setView(point, 16);
                    addOpenStreetMapLayer(projectDetailMap);
                    attachMapLoadingOverlay(projectDetailMap, 'op-modal-location-map-loading');
                } else {
                    projectDetailMap.setView(point, 16);
                }
                if (!projectDetailMarker) projectDetailMarker = L.marker(point).addTo(projectDetailMap);
                else projectDetailMarker.setLatLng(point);
                projectDetailMap.invalidateSize();
                setMapLoading('op-modal-location-map-loading', false);
                setTimeout(() => { if (currentProjectModalTab === 'details') { projectDetailMap?.invalidateSize(); projectDetailMap?.setView(point, 16); } }, 150);
                setTimeout(() => { if (currentProjectModalTab === 'details') { projectDetailMap?.invalidateSize(); projectDetailMap?.setView(point, 16); } }, 500);
            }, 80);
        }

        function renderOfficialProjectDetails(project) {
            const clean = value => Array.isArray(value) ? value.filter(Boolean).join(' / ') : String(value || '').trim();
            const renderSections = sections => sections.map(([title, rows, wide]) => {
                const visibleRows = rows.filter(([, value]) => clean(value));
                if (!visibleRows.length) return '';
                return `<section class="project-detail-section${wide ? ' project-detail-section--wide' : ''}"><h3>${title}</h3><div class="project-detail-rows">${visibleRows.map(([label, value, long]) => `<div class="project-detail-row${long ? ' project-detail-row--long' : ''}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(clean(value))}</strong></div>`).join('')}</div></section>`;
            }).join('');
            const tabs = {
                details: [
                    ['📍 Ümumi Məlumat', [['Zona', project.zone], ['Təhvil', project.year], ['Sahil xətti', project.coastline], ['Dənizə məsafə', project.seaDistance]]],
                    ['🏢 Bina Məlumatları', [['Binaların sayı', project.buildings], ['Mərtəbə sayı', project.floors], ['Mənzil sayı', project.apartments], ['Parkinq yerləri', project.parking], ['Təmir statusu', project.repairStatus]]]
                ],
                apartments: [['🏠 Mənzillər', [['Mənzil formatları', project.apartmentFormats, true], ['Mənzil sahələri', project.apartmentAreas, true], ['Ümumi sahə aralığı', project.area]], true]],
                pricing: [['💰 Qiymətlər', [['1 m² qiyməti', project.pricePerM2], ['Ümumi qiymət', project.totalPrice], ['Bank ipotekası', project.bankMortgage], ['Daxili kredit', project.internalCredit], ['İlkin ödəniş', project.downPayment]], true]],
                infrastructure: [['🌿 İnfrastruktur', [['İnfrastruktur', project.infrastructure, true], ['Xüsusiyyətlər', project.features, true]], true]]
            };
            Object.entries(tabs).forEach(([tab, sections]) => {
                const html = renderSections(sections);
                document.getElementById(`op-tab-${tab}`).innerHTML = html || (tab === 'details' ? '<p class="text-sm text-gray-500">Bu layihə üçün əlavə məlumat yoxdur.</p>' : '');
                if (tab !== 'details') document.getElementById(`op-tab-btn-${tab}`)?.classList.toggle('hidden', !html);
            });
        }

        function getOfficialProjectNavigationProjects() {
            const projects = Array.isArray(officialProjectNavigationProjects) ? officialProjectNavigationProjects : getOfficialProjects();
            return projects.filter(Boolean);
        }

        function resetOfficialProjectModalScroll() {
            const content = document.getElementById('op-modal-scroll');
            const panel = content?.closest('.modal-glass-panel');
            if (content) content.scrollTop = 0;
            if (panel) panel.scrollTop = 0;
        }

        function renderOfficialProjectModalContent(project) {
            activeOfficialProject = project;
            const localizedTitle = project.title || 'Layihə';
            const localizedDesc = getProjectDescription(project);
            updateSeo({ title: projectSeoTitle(project), description: projectSeoDescription(project), path: projectPath(project), image: project.img, type: 'article' });

            officialProjectImages = getProjectImages(project);
            officialProjectImageIndex = 0;
            updateOfficialProjectImage();
            document.getElementById('op-modal-img').alt = localizedTitle;
            document.getElementById('op-modal-title').textContent = localizedTitle;
            document.getElementById('op-modal-year').textContent = project.year || '';
            document.getElementById('op-modal-desc-text').textContent = localizedDesc;
            document.getElementById('op-tab-description')?.classList.toggle('hidden', !localizedDesc || currentProjectModalTab !== 'description');
            document.getElementById('op-tab-btn-description')?.classList.toggle('hidden', !localizedDesc);
            document.getElementById('op-modal-pdf-btn')?.classList.remove('hidden');

            const projects = getOfficialProjectNavigationProjects();
            const currentIndex = projects.findIndex(item => String(item.id) === String(project.id));
            document.getElementById('project-detail-modal-official').setAttribute('aria-label', `${localizedTitle} layihə detalları`);
            document.getElementById('op-modal-project-counter').textContent = `${Math.max(currentIndex, 0) + 1} / ${projects.length || 1}`;
            const hasMultipleProjects = projects.length > 1;
            document.getElementById('op-project-prev').classList.toggle('hidden', !hasMultipleProjects);
            document.getElementById('op-project-next').classList.toggle('hidden', !hasMultipleProjects);

            renderOfficialProjectDetails(project);
            renderSimilarProjects(project);
            switchOfficialModalTab('details');
        }

        function incrementProjectView(project) {
            if (!project?.id) return;
            const key = `besthome_project_view_${project.id}`;
            const last = Number(localStorage.getItem(key) || 0);
            if (Date.now() - last < PROJECT_VIEW_THROTTLE_MS) return;
            localStorage.setItem(key, String(Date.now()));
            void apiRequest(`/api/projects/${project.id}/view`, { method: 'POST' }).then(result => {
                if (result?.viewCount != null) {
                    updateProjectInCache(project.id, { viewCount: result.viewCount });
                    if (activeOfficialProject && String(activeOfficialProject.id) === String(project.id)) activeOfficialProject.viewCount = result.viewCount;
                    renderMostViewedProjects();
                }
            }).catch(() => { localStorage.removeItem(key); });
        }

        function openOfficialProjectModal(id, pushRoute = false) {
            const projects = getOfficialProjectNavigationProjects();
            const project = projects.find(item => String(item.id) === String(id) || item.slug === id)
                || getOfficialProjects().find(item => String(item.id) === String(id) || item.slug === id);
            if (!project) return;
            if (!projects.some(item => String(item.id) === String(project.id))) officialProjectNavigationProjects = getOfficialProjects();
            renderOfficialProjectModalContent(project);
            incrementProjectView(project);
            if (pushRoute) history.pushState({ route: 'project', id: project.id }, '', projectPath(project));
            document.getElementById('project-detail-modal-official').classList.remove('hidden');
            resetOfficialProjectModalScroll();
            setModalOpenState(true);
        }

        function navigateOfficialProject(direction) {
            if (!activeOfficialProject || officialProjectTransitionTimer) return;
            const projects = getOfficialProjectNavigationProjects();
            if (projects.length < 2) return;
            const currentIndex = projects.findIndex(item => String(item.id) === String(activeOfficialProject.id));
            const nextIndex = (Math.max(currentIndex, 0) + direction + projects.length) % projects.length;
            const nextProject = projects[nextIndex];
            const content = document.getElementById('op-modal-scroll');
            content.classList.remove('is-entering-next', 'is-entering-prev');
            content.classList.add(direction > 0 ? 'is-leaving-next' : 'is-leaving-prev');

            officialProjectTransitionTimer = window.setTimeout(() => {
                renderOfficialProjectModalContent(nextProject);
                incrementProjectView(nextProject);
                history.replaceState({ route: 'project', id: nextProject.id }, '', projectPath(nextProject));
                resetOfficialProjectModalScroll();
                content.classList.remove('is-leaving-next', 'is-leaving-prev');
                content.classList.add(direction > 0 ? 'is-entering-next' : 'is-entering-prev');
                requestAnimationFrame(() => requestAnimationFrame(() => content.classList.remove('is-entering-next', 'is-entering-prev')));
                officialProjectTransitionTimer = null;
            }, 120);
        }


        function updateOfficialProjectImage() {
            const p = activeOfficialProject;
            if (!p) return;
            const current = officialProjectImages[officialProjectImageIndex] || p.img || '';
            const projectTitle = p.title || 'Layihə';
            document.getElementById('op-modal-source-desktop').srcset = current;
            document.getElementById('op-modal-source-tablet').srcset = current;
            document.getElementById('op-modal-img').src = current;

            const controls = document.getElementById('op-modal-slider-controls');
            const counter = document.getElementById('op-modal-image-counter');
            const thumbs = document.getElementById('op-modal-thumbnails');
            const hasMany = officialProjectImages.length > 1;
            controls.classList.toggle('hidden', !hasMany);
            counter.classList.toggle('hidden', !hasMany);
            thumbs.classList.toggle('hidden', !hasMany);
            counter.textContent = hasMany ? `${officialProjectImageIndex + 1} / ${officialProjectImages.length}` : '';
            thumbs.innerHTML = hasMany ? officialProjectImages.map((img, idx) => `
                <button type="button" onclick="openProjectLightbox(${idx})" class="h-16 rounded-xl overflow-hidden border ${idx === officialProjectImageIndex ? 'border-brand-500' : 'border-white/10'} transition cursor-zoom-in" aria-label="${idx + 1}-ci layihə şəklini böyük qalereyada aç">
                    <img src="${escapeHtml(img)}" width="800" height="600" loading="lazy" decoding="async" class="w-full h-full object-cover" alt="${escapeHtml(projectTitle)}">
                </button>
            `).join('') : '';
        }

        function changeOfficialProjectImage(direction) {
            if (!officialProjectImages.length) return;
            officialProjectImageIndex = (officialProjectImageIndex + direction + officialProjectImages.length) % officialProjectImages.length;
            updateOfficialProjectImage();
        }

        function setOfficialProjectImage(index) {
            officialProjectImageIndex = index;
            updateOfficialProjectImage();
        }

        function isProjectLightboxOpen() {
            const modal = document.getElementById('project-lightbox');
            return Boolean(modal && !modal.classList.contains('hidden'));
        }

        function renderProjectLightboxThumbnails() {
            const strip = document.getElementById('project-lightbox-thumbnails');
            if (!strip) return;
            strip.innerHTML = officialProjectImages.map((url, index) => `
                <button type="button" onclick="setProjectLightboxImage(${index})" class="property-lightbox__thumb ${index === officialProjectImageIndex ? 'is-active' : ''}" aria-label="${index + 1}-ci layihə şəklini aç" aria-current="${index === officialProjectImageIndex ? 'true' : 'false'}">
                    <img src="${escapeHtml(url)}" width="160" height="120" loading="lazy" decoding="async" alt="Layihə miniaturu ${index + 1}">
                </button>
            `).join('');
        }

        function updateProjectLightboxControls() {
            const hasMany = officialProjectImages.length > 1;
            document.getElementById('project-lightbox-prev')?.classList.toggle('hidden', !hasMany);
            document.getElementById('project-lightbox-next')?.classList.toggle('hidden', !hasMany);
            document.getElementById('project-lightbox-thumbnails')?.classList.toggle('hidden', !hasMany);
        }

        function setProjectLightboxImage(index) {
            if (!officialProjectImages.length) return;
            officialProjectImageIndex = (index + officialProjectImages.length) % officialProjectImages.length;
            updateOfficialProjectImage();
            const selectedUrl = officialProjectImages[officialProjectImageIndex];
            const lightboxImg = document.getElementById('project-lightbox-img');
            const counter = document.getElementById('project-lightbox-counter');
            const title = document.getElementById('project-lightbox-title');
            const projectTitle = activeOfficialProject?.title || 'Layihə şəkilləri';

            if (title) title.textContent = projectTitle;
            if (counter) counter.textContent = `${officialProjectImageIndex + 1} / ${officialProjectImages.length}`;
            if (lightboxImg) {
                lightboxImg.classList.remove('is-loaded');
                resetPropertyLightboxImageFit(lightboxImg);
                lightboxImg.onload = () => {
                    applyPropertyLightboxImageFit(lightboxImg);
                    lightboxImg.classList.add('is-loaded');
                };
                lightboxImg.onerror = () => {
                    resetPropertyLightboxImageFit(lightboxImg);
                    lightboxImg.classList.add('is-loaded');
                };
                lightboxImg.src = selectedUrl;
                lightboxImg.alt = `${projectTitle} - ${officialProjectImageIndex + 1}`;
                if (lightboxImg.complete && lightboxImg.naturalWidth) lightboxImg.onload();
            }

            document.querySelectorAll('#project-lightbox .property-lightbox__thumb').forEach((btn, idx) => {
                const active = idx === officialProjectImageIndex;
                btn.classList.toggle('is-active', active);
                btn.setAttribute('aria-current', active ? 'true' : 'false');
                if (active) btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            });
        }

        function openProjectLightbox(index = officialProjectImageIndex) {
            if (!officialProjectImages.length) return;
            officialProjectImageIndex = Math.max(0, Math.min(index, officialProjectImages.length - 1));
            renderProjectLightboxThumbnails();
            updateProjectLightboxControls();
            const modal = document.getElementById('project-lightbox');
            modal?.classList.remove('is-closing', 'hidden');
            setModalOpenState(true);
            setProjectLightboxImage(officialProjectImageIndex);
            window.setTimeout(() => applyPropertyLightboxImageFit(document.getElementById('project-lightbox-img')), 0);
        }

        function resetProjectLightboxElement() {
            const lightboxImg = document.getElementById('project-lightbox-img');
            if (lightboxImg) {
                lightboxImg.removeAttribute('src');
                resetPropertyLightboxImageFit(lightboxImg);
                lightboxImg.classList.remove('is-loaded');
            }
        }

        function closeProjectLightbox({ immediate = false } = {}) {
            const modal = document.getElementById('project-lightbox');
            if (!modal || modal.classList.contains('hidden')) return;
            if (immediate) {
                modal.classList.add('hidden');
                modal.classList.remove('is-closing');
                resetProjectLightboxElement();
                syncModalOpenState();
                return;
            }
            modal.classList.add('is-closing');
            window.setTimeout(() => {
                modal.classList.add('hidden');
                modal.classList.remove('is-closing');
                resetProjectLightboxElement();
                syncModalOpenState();
            }, 200);
        }

        function changeProjectLightboxImage(direction) {
            if (officialProjectImages.length <= 1) return;
            setProjectLightboxImage(officialProjectImageIndex + direction);
        }

        async function copyTextToClipboard(text) {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
                return;
            }
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.setAttribute('readonly', '');
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            textarea.remove();
        }

        function showProjectShareSuccess() {
            const status = document.getElementById('op-modal-share-status');
            if (!status) return;
            status.classList.remove('hidden');
            clearTimeout(window.__projectShareStatusTimer);
            window.__projectShareStatusTimer = setTimeout(() => status.classList.add('hidden'), 2200);
        }

        async function shareOfficialProject() {
            if (!activeOfficialProject) return;
            const shareUrl = absoluteUrl(projectPath(activeOfficialProject));
            const shareData = { title: activeOfficialProject.title || 'Layihə', text: getProjectDescription(activeOfficialProject) || activeOfficialProject.title || 'BestHome layihəsi', url: shareUrl };
            if (navigator.share && window.matchMedia('(max-width: 767px)').matches) {
                try {
                    await navigator.share(shareData);
                    return;
                } catch (error) {
                    if (error?.name === 'AbortError') return;
                }
            }
            await copyTextToClipboard(shareUrl).catch(() => {});
            showProjectShareSuccess();
        }

        function closeOfficialProjectModal() {
            closeProjectInquiryModal();
            if (isProjectLightboxOpen()) closeProjectLightbox({ immediate: true });
            clearTimeout(officialProjectTransitionTimer);
            officialProjectTransitionTimer = null;
            document.getElementById('project-detail-modal-official').classList.add('hidden');
            syncModalOpenState();
            if (window.location.pathname.startsWith('/project/')) {
                history.pushState({ tabId: 'seabreeze' }, '', '/projects');
                updateSeo({ title: 'Layihələr', path: '/projects' });
            }
        }

        function normalizeProjectModalTab(tab = 'details') {
            const aliases = { prices: 'pricing', desc: 'description' };
            const normalized = aliases[tab] || tab;
            return ['details', 'apartments', 'pricing', 'infrastructure', 'description'].includes(normalized) ? normalized : 'details';
        }

        function switchOfficialModalTab(tab) {
            tab = normalizeProjectModalTab(tab);
            const availableButton = document.getElementById(`op-tab-btn-${tab}`);
            if (!availableButton || availableButton.classList.contains('hidden')) tab = 'details';
            currentProjectModalTab = tab;
            ['details', 'apartments', 'pricing', 'infrastructure', 'description'].forEach(name => {
                const button = document.getElementById(`op-tab-btn-${name}`);
                const content = document.getElementById(`op-tab-${name}`);
                const active = name === tab;
                if (button) {
                    const hidden = button.classList.contains('hidden');
                    button.className = `${hidden ? 'hidden ' : ''}op-modal-tab-pill${active ? ' is-active' : ''}`;
                    button.setAttribute('aria-selected', String(active));
                    button.setAttribute('role', 'tab');
                    button.setAttribute('aria-controls', `op-tab-${name}`);
                    if (active && !hidden && typeof button.scrollIntoView === 'function') button.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
                }
                if (content) content.classList.toggle('hidden', !active);
            });
            if (tab === 'details') renderProjectDetailLocationMap(activeOfficialProject || {});
            else destroyProjectDetailLocationMap({ hideSection: true });
        }



    window.getProjectPictureMarkup = window.getProjectPictureMarkup || getProjectPictureMarkup;
    window.isProjectLightboxOpen = window.isProjectLightboxOpen || isProjectLightboxOpen;
    try {
        Object.defineProperty(window, 'projectPage', {
            configurable: true,
            get: () => projectPage,
            set: value => {
                const nextPage = Number.parseInt(value, 10);
                projectPage = Number.isFinite(nextPage) ? Math.max(1, nextPage) : 1;
            }
        });
    } catch (_error) {
        window.projectPage = projectPage;
    }

    Object.assign(window, {
        extractProjectDeliveryYear,
        renderProjectYearOptions,
        getSelectedProjectCategory: () => selectedProjectCategory,
        getOfficialProjectImages: () => officialProjectImages,
        getOfficialProjectImageIndex: () => officialProjectImageIndex,
        handleProjectSearchInput,
        fetchProjectsBySearch,
        switchProjectCategory,
        getProjectPictureMarkup,
        getProjectDescription,
        setProjectPage,
        toggleMostViewedProjects,
        renderMostViewedProjects,
        renderOfficialProjects,
        projectSharePayload,
        shareActiveProject,
        updateProjectInCache,
        setProjectPdfStatus,
        uploadProjectBrochureFromInput,
        deleteProjectBrochure,
        generateProjectPdfPlaceholder,
        downloadActiveProjectPdf,
        openProjectInquiryModal,
        closeProjectInquiryModal,
        submitProjectInquiry,
        renderSimilarProjects,
        destroyProjectDetailLocationMap,
        renderProjectDetailLocationMap,
        renderOfficialProjectDetails,
        getOfficialProjectNavigationProjects,
        resetOfficialProjectModalScroll,
        renderOfficialProjectModalContent,
        incrementProjectView,
        openOfficialProjectModal,
        navigateOfficialProject,
        updateOfficialProjectImage,
        changeOfficialProjectImage,
        setOfficialProjectImage,
        isProjectLightboxOpen,
        renderProjectLightboxThumbnails,
        updateProjectLightboxControls,
        setProjectLightboxImage,
        openProjectLightbox,
        resetProjectLightboxElement,
        closeProjectLightbox,
        changeProjectLightboxImage,
        copyTextToClipboard,
        showProjectShareSuccess,
        shareOfficialProject,
        closeOfficialProjectModal,
        normalizeProjectModalTab,
        switchOfficialModalTab
    });
})();
