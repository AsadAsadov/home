(function () {
            const LOGOS = {
                light: '/uploads/siteimage/logo/besthomelight.png?v=2',
                dark: '/uploads/siteimage/logo/besthomedark.png?v=2'
            };
            const lightLogo = new Image();
            lightLogo.src = LOGOS.light;
            const darkLogo = new Image();
            darkLogo.src = LOGOS.dark;
            const THEME_KEY = 'siteTheme';
            const resolveTheme = (choice) => {
                const preferred = ['light', 'dark', 'system'].includes(choice) ? choice : 'system';
                if (preferred === 'system') return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                return preferred;
            };
            const currentPreference = () => {
                try { return localStorage.getItem(THEME_KEY) || 'system'; } catch (_error) { return 'system'; }
            };
            const logoSrc = (theme = resolveTheme(currentPreference())) => LOGOS[theme === 'dark' ? 'dark' : 'light'];
            window.getCurrentThemeLogo = (theme = resolveTheme(currentPreference())) => logoSrc(theme);
            window.updateThemeLogos = (theme = resolveTheme(currentPreference())) => {
                const src = window.getCurrentThemeLogo(theme);
                document.querySelectorAll('img[data-theme-logo], img[data-site-logo], .header-logo-wrap img, .site-footer-logo, .mobile-bottom-nav-logo').forEach((img) => {
                    if (img.getAttribute('src') !== src) img.setAttribute('src', src);
                });
            };
            window.BestHomeLogo = {
                paths: LOGOS,
                resolveTheme,
                src: logoSrc,
                html({ className = 'site-logo', width = 180, height = 48, loading = 'lazy', fetchpriority = '', extra = '' } = {}) {
                    const priority = fetchpriority ? ` fetchpriority="${fetchpriority}"` : '';
                    return `<span class="theme-logo-wrap"><img src="${logoSrc()}" data-theme-logo data-site-logo alt="BestHome.az" class="${className}" width="${width}" height="${height}" loading="${loading}"${priority} decoding="async"${extra ? ` ${extra}` : ''}></span>`;
                },
                update: window.updateThemeLogos
            };
            const initialPreference = currentPreference();
            const initialTheme = resolveTheme(initialPreference);
            document.documentElement.dataset.theme = initialTheme;
            document.documentElement.dataset.themePreference = initialPreference;
            document.documentElement.classList.toggle('dark', initialTheme === 'dark');
            document.documentElement.classList.toggle('light', initialTheme !== 'dark');
        }());
