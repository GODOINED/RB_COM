// main.js — полная версия (динамическая загрузка FingerprintJS, аватарки, аккаунты)
(function() {
    'use strict';

    // ===== VPN БЛОКИРОВКА =====
    let isBlocked = false;

    function showBlockedScreen(ip) {
        if (document.getElementById('vpnBlockScreen')) return;
        isBlocked = true;
        const blockHtml = `
            <div id="vpnBlockScreen" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: #1a1a2e;
                color: #fff;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                font-family: 'W95Font', 'MS Sans Serif', sans-serif;
                z-index: 999999;
                padding: 20px;
                text-align: center;
                user-select: none;
                -webkit-user-select: none;
            ">
                <div style="
                    background: #d4d0c8;
                    border: 4px solid #808080;
                    border-top-color: #ffffff;
                    border-left-color: #ffffff;
                    padding: 30px;
                    max-width: 500px;
                    box-shadow: 8px 8px 0px rgba(0,0,0,0.5);
                ">
                    <div style="font-size: 48px; margin-bottom: 10px;">🚫</div>
                    <h2 style="color: #000; margin-bottom: 10px;">Доступ запрещён</h2>
                    <p style="color: #333; font-size: 16px; line-height: 1.5;">
                        Ваш IP-адрес определён как <strong>VPN или прокси</strong>.<br>
                        Для доступа к сайту отключите VPN и обновите страницу.
                    </p>
                    <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
                        <button onclick="location.reload()" style="
                            padding: 8px 24px;
                            background: #a7499f;
                            border: 2px solid #d66fce;
                            border-right-color: #753070;
                            border-bottom-color: #753070;
                            color: #fff;
                            font-family: inherit;
                            font-size: 16px;
                            cursor: default;
                        ">Обновить страницу</button>
                    </div>
                    <div style="margin-top: 15px; font-size: 12px; color: #666;">
                        Ваш IP: <span id="blocked-ip">${ip}</span>
                    </div>
                </div>
            </div>
        `;
        document.body.innerHTML = blockHtml;
        document.body.style.pointerEvents = 'auto';
        document.body.style.overflow = 'hidden';
        sessionStorage.setItem('vpn_blocked', 'true');
        protectBlockScreen();
    }

    function protectBlockScreen() {
        const targetNode = document.getElementById('vpnBlockScreen');
        if (!targetNode) return;
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
                    if (!document.getElementById('vpnBlockScreen')) {
                        location.reload();
                    }
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        const attrObserver = new MutationObserver(() => {
            const block = document.getElementById('vpnBlockScreen');
            if (block) {
                if (block.style.display === 'none') block.style.display = 'flex';
                if (block.style.visibility === 'hidden') block.style.visibility = 'visible';
                if (block.style.opacity === '0') block.style.opacity = '1';
            }
        });
        attrObserver.observe(targetNode, { attributes: true, attributeFilter: ['style', 'class'] });
        const interval = setInterval(() => {
            const block = document.getElementById('vpnBlockScreen');
            if (!block) {
                location.reload();
            } else {
                if (block.style.display === 'none' || block.style.visibility === 'hidden' || block.style.opacity === '0') {
                    block.style.display = 'flex';
                    block.style.visibility = 'visible';
                    block.style.opacity = '1';
                }
            }
        }, 500);
        window._blockObservers = { observer, attrObserver, interval };
    }

    // === ПРОВЕРКА VPN (без ключей, без регистрации) ===
    async function isVPN(ip) {
        if (!ip || ip === '0.0.0.0' || ip === '127.0.0.1') return false;

        // Проверяем кэш
        const cached = sessionStorage.getItem('vpn_check_' + ip);
        if (cached !== null) return cached === 'true';

        try {
            // Пробуем ipapi.is (бесплатно, без ключа, есть поле vpn)
            const response = await fetch(`https://ipapi.is/${ip}`);
            if (response.ok) {
                const data = await response.json();
                // ipapi.is возвращает поле vpn (true/false)
                if (data.vpn === true) {
                    sessionStorage.setItem('vpn_check_' + ip, 'true');
                    return true;
                }
            }
        } catch (e) {
            console.warn('ipapi.is error:', e);
        }

        // Запасной вариант — ip-api.com (поля proxy нет на бесплатном тарифе, но может сработать)
        try {
            const response = await fetch(`https://ip-api.com/json/${ip}?fields=proxy,isp,org`);
            if (response.ok) {
                const data = await response.json();
                // Проверяем proxy, а также ISP на наличие ключевых слов
                if (data.proxy === true) {
                    sessionStorage.setItem('vpn_check_' + ip, 'true');
                    return true;
                }
                // Дополнительная проверка: если ISP содержит "VPN", "Proxy", "Hosting", "Cloud", "Server"
                const isp = (data.isp || '').toLowerCase();
                const org = (data.org || '').toLowerCase();
                const keywords = ['vpn', 'proxy', 'hosting', 'cloud', 'server', 'datacenter', 'm247', 'ovh', 'digitalocean', 'vultr', 'aws', 'azure', 'gcp'];
                for (const kw of keywords) {
                    if (isp.includes(kw) || org.includes(kw)) {
                        sessionStorage.setItem('vpn_check_' + ip, 'true');
                        return true;
                    }
                }
            }
        } catch (e) {
            console.warn('ip-api.com error:', e);
        }

        sessionStorage.setItem('vpn_check_' + ip, 'false');
        return false;
    }

    async function checkVPN(ip) {
        return await isVPN(ip);
    }
    // === ЗАЩИТА КОНСОЛИ ===
    const originalConsoleLog = console.log;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;

    console.log = function(...args) {
        const str = args.join(' ');
        //if (str.includes('banIP') || str.includes('banned_ips') || str.includes('supabase') || str.includes('fingerprint') || str.includes('auth') || str.includes('avatar')) {
        //    return;
        //}
        originalConsoleLog.apply(console, args);
    };

    //Object.defineProperty(window, 'eval', {
    //    get: function() { throw new Error('eval() запрещён'); },
    //    set: function() {}
    //});

    //Object.defineProperty(window, 'banIP', {
    //    get: function() { throw new Error('Функция бана недоступна'); },
    //    set: function() {}
    //});

    // === Звуки ===
    const clickSoundUrl = 'sounds/click.mp3';
    const chimesSoundUrl = 'sounds/chimes.mp3';
    const chordSoundUrl = 'sounds/chord.mp3';

    let clickSound = null, chimesSound = null, chordSound = null;
    let soundsEnabled = true;

    // ===== СТИЛИЗОВАННОЕ ОКНО ОШИБКИ =====
    function showError(title, message) {
        // Создаём overlay, если его нет
        let overlay = document.getElementById('errorModalOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'errorModalOverlay';
            overlay.className = 'error-modal-overlay';
            overlay.innerHTML = `
                <div class="error-modal">
                    <div class="error-modal-header">
                        <span class="title"><span class="icon">⚠️</span> <span id="errorModalTitle">Ошибка</span></span>
                        <button class="close-btn" id="errorModalCloseBtn">×</button>
                    </div>
                    <div class="error-modal-body">
                        <div class="message" id="errorModalMessage">Произошла ошибка.</div>
                        <div class="buttons">
                            <button id="errorModalOkBtn">OK</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            // Закрытие по кнопке
            document.getElementById('errorModalCloseBtn').addEventListener('click', closeErrorModal);
            document.getElementById('errorModalOkBtn').addEventListener('click', closeErrorModal);
            overlay.addEventListener('click', function(e) {
                if (e.target === this) closeErrorModal();
            });
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && overlay.style.display === 'flex') {
                    closeErrorModal();
                }
            });
        }

        document.getElementById('errorModalTitle').textContent = title || 'Ошибка';
        document.getElementById('errorModalMessage').textContent = message || 'Произошла неизвестная ошибка.';
        overlay.style.display = 'flex';
        // Эффект дрожания (как в каптче)
        const modal = overlay.querySelector('.error-modal');
        modal.classList.add('shake-modal');
        setTimeout(() => modal.classList.remove('shake-modal'), 300);
        // Звук ошибки (если есть функция playChordSound, можно вызвать)
        if (typeof playChordSound === 'function') playChordSound();
        // Эффект красной вспышки (если есть функция triggerErrorEffect, можно вызвать)
        if (typeof triggerErrorEffect === 'function') triggerErrorEffect();
        // Отключаем прокрутку
        document.body.classList.add('modal-open');
    }

    function closeErrorModal() {
        const overlay = document.getElementById('errorModalOverlay');
        if (overlay) {
            overlay.style.display = 'none';
            document.body.classList.remove('modal-open');
        }
    }
    
    function playClickSound() {
        if (!soundsEnabled) return;
        if (!clickSound) {
            clickSound = new Audio(clickSoundUrl);
            clickSound.load();
        }
        clickSound.currentTime = 0;
        clickSound.play().catch(() => {});
    }

    function playChimesSound() {
        if (!soundsEnabled) return;
        if (!chimesSound) {
            chimesSound = new Audio(chimesSoundUrl);
            chimesSound.load();
        }
        chimesSound.currentTime = 0;
        chimesSound.play().catch(() => {});
    }

    function playChordSound() {
        if (!soundsEnabled) return;
        if (!chordSound) {
            chordSound = new Audio(chordSoundUrl);
            chordSound.load();
        }
        chordSound.currentTime = 0;
        chordSound.play().catch(() => {});
    }

    document.addEventListener('click', playClickSound);

    // === Настройки ===
    const soundsCheckbox = document.getElementById('soundsCheckbox');
    const autosaveCheckbox = document.getElementById('autosaveCheckbox');
    const themeDark = document.getElementById('themeDark');
    const themeLight = document.getElementById('themeLight');
    const wallDark = document.getElementById('wallDark');
    const wallBlue = document.getElementById('wallBlue');
    const wallGreen = document.getElementById('wallGreen');
    const wallGray = document.getElementById('wallGray');
    const wallCustom = document.getElementById('wallCustom');
    const body = document.body;
    const win95Window = document.querySelector('.win95-window');

    let customWallpaperLoaded = false;

    function setWallpaper(type) {
        if (window.CustomWallpaper && typeof window.CustomWallpaper.stop === 'function') {
            window.CustomWallpaper.stop();
        }
        let color1, color2, color3;
        switch(type) {
            case 'dark':
                color1 = '#1e1e1e';
                color2 = '#2d2d2d';
                color3 = '#3a3a3a';
                break;
            case 'blue':
                color1 = '#003399';
                color2 = '#3366cc';
                color3 = '#1e4d99';
                break;
            case 'green':
                color1 = '#004d40';
                color2 = '#008b74';
                color3 = '#006b5a';
                break;
            case 'gray':
                color1 = '#505050';
                color2 = '#808080';
                color3 = '#6a6a6a';
                break;
            case 'custom':
                body.style.background = '';
                if (window.CustomWallpaper) {
                    window.CustomWallpaper.start();
                } else {
                    loadCustomWallpaperScript();
                }
                return;
            default:
                return;
        }
        document.documentElement.style.setProperty('--bg-color1', color1);
        document.documentElement.style.setProperty('--bg-color2', color2);
        document.documentElement.style.setProperty('--bg-color3', color3);
        body.style.background = '';
    }

    function loadCustomWallpaperScript() {
        if (customWallpaperLoaded) return;
        const script = document.createElement('script');
        script.src = 'custom_wallpaper.js';
        script.onload = function() {
            customWallpaperLoaded = true;
            if (window.CustomWallpaper) window.CustomWallpaper.start();
        };
        script.onerror = function() {
            setWallpaper('dark');
        };
        document.head.appendChild(script);
    }

    function loadSettings() {
        const savedSounds = localStorage.getItem('soundsEnabled');
        const savedTheme = localStorage.getItem('theme');
        const savedAutosave = localStorage.getItem('autosaveEnabled');
        const savedWallpaper = localStorage.getItem('wallpaper');
        if (savedSounds !== null) {
            soundsEnabled = savedSounds === 'true';
            soundsCheckbox.checked = soundsEnabled;
        }
        if (savedTheme !== null) {
            if (savedTheme === 'dark') themeDark.checked = true;
            else themeLight.checked = true;
        }
        if (savedAutosave !== null) autosaveCheckbox.checked = savedAutosave === 'true';
        if (savedWallpaper !== null) {
            switch(savedWallpaper) {
                case 'dark': wallDark.checked = true; setWallpaper('dark'); break;
                case 'blue': wallBlue.checked = true; setWallpaper('blue'); break;
                case 'green': wallGreen.checked = true; setWallpaper('green'); break;
                case 'gray': wallGray.checked = true; setWallpaper('gray'); break;
                case 'custom': wallCustom.checked = true; setWallpaper('custom'); break;
                default: wallDark.checked = true; setWallpaper('dark');
            }
        } else {
            wallDark.checked = true;
            setWallpaper('dark');
        }
    }

    function saveSettings() {
        if (!autosaveCheckbox.checked) return;
        localStorage.setItem('soundsEnabled', soundsEnabled);
        localStorage.setItem('theme', themeDark.checked ? 'dark' : 'light');
        localStorage.setItem('autosaveEnabled', autosaveCheckbox.checked);
        let wallpaper = 'dark';
        if (wallBlue.checked) wallpaper = 'blue';
        else if (wallGreen.checked) wallpaper = 'green';
        else if (wallGray.checked) wallpaper = 'gray';
        else if (wallCustom.checked) wallpaper = 'custom';
        localStorage.setItem('wallpaper', wallpaper);
    }

    soundsCheckbox.addEventListener('change', function(e) {
        soundsEnabled = e.target.checked;
        if (autosaveCheckbox.checked) saveSettings();
    });
    themeDark.addEventListener('change', () => autosaveCheckbox.checked && saveSettings());
    themeLight.addEventListener('change', () => autosaveCheckbox.checked && saveSettings());
    wallDark.addEventListener('change', function() { setWallpaper('dark'); autosaveCheckbox.checked && saveSettings(); });
    wallBlue.addEventListener('change', function() { setWallpaper('blue'); autosaveCheckbox.checked && saveSettings(); });
    wallGreen.addEventListener('change', function() { setWallpaper('green'); autosaveCheckbox.checked && saveSettings(); });
    wallGray.addEventListener('change', function() { setWallpaper('gray'); autosaveCheckbox.checked && saveSettings(); });
    wallCustom.addEventListener('change', function() { setWallpaper('custom'); autosaveCheckbox.checked && saveSettings(); });
    autosaveCheckbox.addEventListener('change', function(e) { if (e.target.checked) saveSettings(); });
    loadSettings();

    // === Supabase клиент ===
    const SUPABASE_URL = 'https://zirkmegtqfkfvyatgbgf.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_PB_s3zWbWYA-0-BtqH1M7g_7De-juWW';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // === ТЕКУЩИЙ ПОЛЬЗОВАТЕЛЬ ===
    let currentUser = null;
    let isLoggedIn = false;

    async function checkAuth() {
        const { data: { user }, error } = await supabaseClient.auth.getUser();
        if (!error && user) {
            currentUser = user;
            isLoggedIn = true;
            const statusEl = document.getElementById('userStatus');
            if (statusEl) statusEl.textContent = '👤 ' + user.email;
            document.getElementById('loginBtn').style.display = 'none';
            document.getElementById('registerBtn').style.display = 'none';
            document.getElementById('logoutBtn').style.display = 'inline-block';
            loadUserAvatar(user.id);
        } else {
            currentUser = null;
            isLoggedIn = false;
            document.getElementById('userStatus').textContent = '👤 Гость';
            document.getElementById('loginBtn').style.display = 'inline-block';
            document.getElementById('registerBtn').style.display = 'inline-block';
            document.getElementById('logoutBtn').style.display = 'none';
        }
    }

    // === АУТЕНТИФИКАЦИЯ (UI) ===
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const closeLogin = document.getElementById('closeLogin');
    const closeRegister = document.getElementById('closeRegister');
    const loginSubmit = document.getElementById('loginSubmit');
    const registerSubmit = document.getElementById('registerSubmit');
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    const registerEmail = document.getElementById('registerEmail');
    const registerPassword = document.getElementById('registerPassword');

    loginBtn.addEventListener('click', () => { loginModal.style.display = 'flex'; });
    registerBtn.addEventListener('click', () => { registerModal.style.display = 'flex'; });
    closeLogin.addEventListener('click', () => { loginModal.style.display = 'none'; });
    closeRegister.addEventListener('click', () => { registerModal.style.display = 'none'; });
    loginModal.addEventListener('click', (e) => { if (e.target === loginModal) loginModal.style.display = 'none'; });
    registerModal.addEventListener('click', (e) => { if (e.target === registerModal) registerModal.style.display = 'none'; });

    loginSubmit.addEventListener('click', async () => {
        const email = loginEmail.value.trim();
        const password = loginPassword.value.trim();
        if (!email || !password) { showError('Account', 'Enter email and password'); return; }
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) { showError('Account', 'Login error: ' + error.message); return; }
        loginModal.style.display = 'none';
        await checkAuth();
        location.reload();
    });

    registerSubmit.addEventListener('click', async () => {
        const email = registerEmail.value.trim();
        const password = registerPassword.value.trim();
        if (!email || password.length < 6) { showError('Account', 'Email and password (min. 6 characters)'); return; }
        const { error } = await supabaseClient.auth.signUp({ email, password });
        if (error) { showError('Account', 'Sign in error:' + error.message); return; }
        showError('Account', 'Sign in successful! Log in.');
        registerModal.style.display = 'none';
        loginModal.style.display = 'flex';
    });

    logoutBtn.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        await checkAuth();
        location.reload();
    });

    // ===================== FINGERPRINT (динамическая загрузка с нескольких CDN) =====================
    let cachedFingerprint = null;

    const FP_CDN_SOURCES = [
        'https://openfpcdn.io/fingerprintjs/v5',
        'https://openfpcdn.io/fingerprintjs/v5/iife.min.js',
        'https://openfpcdn.io/fingerprintjs/v4/iife.min.js',
        'https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs@3/dist/fp.min.js',
        'https://unpkg.com/@fingerprintjs/fingerprintjs@3/dist/fp.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/fingerprintjs2/2.1.0/fingerprint2.min.js'
    ];

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async function loadFingerprintJS() {
        if (typeof FingerprintJS !== 'undefined' || typeof Fingerprint2 !== 'undefined') {
            return true;
        }
        for (const src of FP_CDN_SOURCES) {
            try {
                console.log(`⏳ Пробуем загрузить FingerprintJS с ${src}...`);
                await loadScript(src);
                if (typeof FingerprintJS !== 'undefined' || typeof Fingerprint2 !== 'undefined') {
                    console.log(`✅ FingerprintJS загружен с ${src}`);
                    return true;
                }
            } catch (e) {
                console.warn(`⚠️ Не удалось загрузить с ${src}:`, e);
            }
        }
        console.warn('❌ Не удалось загрузить FingerprintJS ни с одного источника.');
        return false;
    }

    function generateFallbackFingerprint() {
        const stored = localStorage.getItem('device_fp');
        if (stored) {
            console.log('ℹ️ Используем сохранённый fallback fingerprint:', stored);
            return stored;
        }
        const components = [];
        components.push(navigator.userAgent);
        components.push(screen.width + 'x' + screen.height + 'x' + screen.colorDepth);
        components.push(navigator.language);
        components.push(navigator.platform);
        components.push(new Date().getTimezoneOffset());

        try {
            const canvas = document.createElement('canvas');
            canvas.width = 200; canvas.height = 50;
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = 'alphabetic';
            ctx.fillStyle = '#f60';
            ctx.fillRect(0,0,100,50);
            ctx.fillStyle = '#069';
            ctx.fillText('Cwm fjordbank glyphs vext quiz, 😃', 2, 30);
            ctx.fillStyle = 'rgba(102,204,0,0.7)';
            ctx.fillText('Cwm fjordbank glyphs vext quiz, 😃', 4, 40);
            components.push(canvas.toDataURL());
        } catch(e) { components.push('canvas_error'); }

        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
            }
        } catch(e) { components.push('webgl_error'); }

        const str = components.join('|||');
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash) + str.charCodeAt(i);
            hash = hash & hash;
        }
        const fp = 'fp_' + Math.abs(hash).toString(16).padStart(8, '0');
        localStorage.setItem('device_fp', fp);
        console.log('⚠️ Сгенерирован fallback fingerprint:', fp);
        return fp;
    }

    async function getFingerprint() {
        if (cachedFingerprint) return cachedFingerprint;

        const loaded = await loadFingerprintJS();

        if (loaded) {
            try {
                let visitorId;
                if (typeof FingerprintJS !== 'undefined') {
                    const fpPromise = FingerprintJS.load();
                    const fp = await fpPromise;
                    const result = await fp.get();
                    visitorId = result.visitorId;
                } else if (typeof Fingerprint2 !== 'undefined') {
                    visitorId = await new Promise((resolve) => {
                        Fingerprint2.get((components) => {
                            const values = components.map(c => c.value);
                            const murmur = Fingerprint2.x64hash128(values.join(''), 31);
                            resolve(murmur);
                        });
                    });
                }
                if (visitorId) {
                    cachedFingerprint = visitorId;
                    console.log('✅ Fingerprint (успешно):', visitorId);
                    return visitorId;
                }
            } catch (error) {
                //console.error('❌ Ошибка получения fingerprint:', error);
            }
        }

        const fallback = generateFallbackFingerprint();
        cachedFingerprint = fallback;
        return fallback;
    }

    // ===================== АВАТАРКИ =====================

    const avatarInput = document.getElementById('avatarInput');
    const uploadAvatarBtn = document.getElementById('uploadAvatarBtn');
    const removeAvatarBtn = document.getElementById('removeAvatarBtn');
    const avatarPreview = document.getElementById('avatarPreview');
    const avatarStatus = document.getElementById('avatarStatus');

    const avatarCache = new Map();

    async function fetchUserAvatar(userId) {
        if (!userId) {
            console.warn('fetchUserAvatar: userId не передан');
            return null;
        }
        if (avatarCache.has(userId)) {
            console.log(`fetchUserAvatar: кеш для ${userId} ->`, avatarCache.get(userId));
            return avatarCache.get(userId);
        }
        try {
            console.log(`fetchUserAvatar: запрос профиля для ${userId}`);
            let { data, error } = await supabaseClient
                .from('profiles')
                .select('avatar_url')
                .eq('id', userId)
                .maybeSingle();

            if (error && error.code === 'PGRST116') {
                console.log(`fetchUserAvatar: профиль для ${userId} не найден, создаём...`);
                const { error: insertError } = await supabaseClient
                    .from('profiles')
                    .insert([{ id: userId, avatar_url: null }]);
                if (insertError) {
                    //console.error('fetchUserAvatar: ошибка создания профиля:', insertError);
                    avatarCache.set(userId, null);
                    return null;
                }
                const { data: newData, error: newError } = await supabaseClient
                    .from('profiles')
                    .select('avatar_url')
                    .eq('id', userId)
                    .maybeSingle();
                if (newError) throw newError;
                data = newData;
                console.log(`fetchUserAvatar: профиль создан, avatar_url =`, data?.avatar_url);
            } else if (error) {
                throw error;
            }

            const url = data?.avatar_url || null;
            avatarCache.set(userId, url);
            console.log(`fetchUserAvatar: для ${userId} получен URL:`, url);
            return url;
        } catch (e) {
            //console.error('fetchUserAvatar: исключение:', e.message);
            avatarCache.set(userId, null);
            return null;
        }
    }

    async function loadUserAvatar(userId) {
        if (!userId) return;
        try {
            const url = await fetchUserAvatar(userId);
            if (url) {
                avatarPreview.innerHTML = `<img src="${url}?t=${Date.now()}" style="width: 100%; height: 100%; object-fit: cover;">`;
            } else {
                avatarPreview.innerHTML = '👤';
            }
        } catch (e) {
            avatarPreview.innerHTML = '👤';
        }
    }

    function resizeImage(file, maxWidth, maxHeight, quality = 0.85) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    let width = img.width;
                    let height = img.height;
                    if (width > maxWidth || height > maxHeight) {
                        const ratio = Math.min(maxWidth / width, maxHeight / height);
                        width = Math.round(width * ratio);
                        height = Math.round(height * ratio);
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => {
                        resolve(blob);
                    }, 'image/png', quality);
                };
                img.onerror = function() { resolve(null); };
                img.src = e.target.result;
            };
            reader.onerror = function() { resolve(null); };
            reader.readAsDataURL(file);
        });
    }

    uploadAvatarBtn.addEventListener('click', () => {
        if (!currentUser) {
            showError('Account', 'First, log in to your account.');
            return;
        }
        avatarInput.click();
    });

    avatarInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 1024 * 1024) {
            avatarStatus.textContent = '❌ Файл превышает 1 МБ';
            avatarStatus.style.color = 'red';
            avatarInput.value = '';
            return;
        }

        avatarStatus.textContent = '⏳ Обработка...';
        avatarStatus.style.color = '#666';

        try {
            const resizedBlob = await resizeImage(file, 128, 128, 0.85);
            if (!resizedBlob) {
                avatarStatus.textContent = '❌ Ошибка обработки изображения';
                avatarStatus.style.color = 'red';
                avatarInput.value = '';
                return;
            }

            if (resizedBlob.size > 1024 * 1024) {
                avatarStatus.textContent = '❌ После сжатия файл всё ещё больше 1 МБ';
                avatarStatus.style.color = 'red';
                avatarInput.value = '';
                return;
            }

            const fileName = `${currentUser.id}/${Date.now()}.png`;
            const { error: uploadError } = await supabaseClient.storage
                .from('avatars')
                .upload(fileName, resizedBlob, {
                    contentType: 'image/png',
                    upsert: true
                });

            if (uploadError) {
                //console.error('Ошибка загрузки в Storage:', uploadError);
                avatarStatus.textContent = '❌ Ошибка загрузки: ' + uploadError.message;
                avatarStatus.style.color = 'red';
                avatarInput.value = '';
                return;
            }

            const { data: urlData } = supabaseClient.storage
                .from('avatars')
                .getPublicUrl(fileName);

            const avatarUrl = urlData.publicUrl;

            const { error: updateError } = await supabaseClient
                .from('profiles')
                .upsert({ id: currentUser.id, avatar_url: avatarUrl, updated_at: new Date().toISOString() });

            if (updateError) {
                //console.error('Ошибка обновления профиля:', updateError);
                avatarStatus.textContent = '❌ Ошибка сохранения: ' + updateError.message;
                avatarStatus.style.color = 'red';
                avatarInput.value = '';
                return;
            }

            avatarCache.set(currentUser.id, avatarUrl);
            avatarPreview.innerHTML = `<img src="${avatarUrl}?t=${Date.now()}" style="width: 100%; height: 100%; object-fit: cover;">`;
            avatarStatus.textContent = '✅ Аватарка обновлена!';
            avatarStatus.style.color = 'green';
            avatarInput.value = '';

            await loadGuestbook(guestbookCurrentPage);
            await loadPaintings();

        } catch (err) {
            //console.error('Ошибка:', err);
            avatarStatus.textContent = '❌ Ошибка: ' + err.message;
            avatarStatus.style.color = 'red';
            avatarInput.value = '';
        }
    });

    removeAvatarBtn.addEventListener('click', async () => {
        if (!currentUser) {
            showError('Account', 'First, log in to your account.');
            return;
        }
        if (!confirm('Удалить аватарку?')) return;

        try {
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('avatar_url')
                .eq('id', currentUser.id)
                .maybeSingle();
            if (error) throw error;

            if (data && data.avatar_url) {
                const path = data.avatar_url.split('/').pop();
                if (path) {
                    await supabaseClient.storage
                        .from('avatars')
                        .remove([`${currentUser.id}/${path}`]);
                }
            }

            const { error: updateError } = await supabaseClient
                .from('profiles')
                .update({ avatar_url: null, updated_at: new Date().toISOString() })
                .eq('id', currentUser.id);

            if (updateError) throw updateError;

            avatarCache.delete(currentUser.id);
            avatarPreview.innerHTML = '👤';
            avatarStatus.textContent = '✅ Аватарка удалена';
            avatarStatus.style.color = 'green';

            await loadGuestbook(guestbookCurrentPage);
            await loadPaintings();

        } catch (err) {
            //console.error('Ошибка удаления:', err);
            avatarStatus.textContent = '❌ Ошибка: ' + err.message;
            avatarStatus.style.color = 'red';
        }
    });

    // === Получение IP ===
    async function getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (e) {
            return '0.0.0.0';
        }
    }

    // === ПРОВЕРКА VPN/ПРОКСИ ===
    // === ПРОВЕРКА VPN (IPPriv — без ключа, 100 запросов/час) ===
    async function isVPN(ip) {
        if (!ip || ip === '0.0.0.0' || ip === '127.0.0.1' || ip === '::1') return false;

        const cached = sessionStorage.getItem('vpn_check_' + ip);
        if (cached !== null) return cached === 'true';

        // 1. Сначала пробуем IPPriv (быстрый и точный)
        try {
            const response = await fetch(`https://api.ippriv.com/api/security/${ip}`);
            if (response.ok) {
                const data = await response.json();
                // Проверяем флаги: isVPN, isProxy, isTor (и isHosting тоже можно, но обычно не блокируем хостеров)
                //const isBad = data.isVPN === true || data.isProxy === true || data.isTor === true;
                const isBad = data.isVPN === true || data.isProxy === true;
                if (isBad) {
                    sessionStorage.setItem('vpn_check_' + ip, 'true');
                    return true;
                }
            }
        } catch (e) { /* ignore */ }

        // 2. Если IPPriv не ответил или не нашёл, пробуем ipapi.is
        try {
            const response = await fetch(`https://ipapi.is/${ip}`);
            if (response.ok) {
                const data = await response.json();
                const isBad = data.is_vpn === true || data.is_proxy === true;
                //const isBad = data.is_vpn === true || data.is_proxy === true || data.is_abuser === true;
                if (isBad) {
                    sessionStorage.setItem('vpn_check_' + ip, 'true');
                    return true;
                }
            }
        } catch (e) { /* ignore */ }

        // Если оба не сработали, считаем безопасным
        sessionStorage.setItem('vpn_check_' + ip, 'false');
        return false;
    }

    // === БЛОКИРОВКА ДОСТУПА ===
    function showBlockedScreen() {
        // Удаляем всё содержимое страницы и показываем блокировку
        document.body.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: #1a1a2e;
                color: #fff;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                font-family: 'W95Font', 'MS Sans Serif', sans-serif;
                z-index: 999999;
                padding: 20px;
                text-align: center;
            ">
                <div style="
                    background: #d4d0c8;
                    border: 4px solid #808080;
                    border-top-color: #ffffff;
                    border-left-color: #ffffff;
                    padding: 30px;
                    max-width: 500px;
                    box-shadow: 8px 8px 0px rgba(0,0,0,0.5);
                ">
                    <div style="font-size: 48px; margin-bottom: 10px;">🚫</div>
                    <h2 style="color: #000; margin-bottom: 10px;">Доступ запрещён</h2>
                    <p style="color: #333; font-size: 16px; line-height: 1.5;">
                        Ваш IP-адрес определён как <strong>VPN или прокси</strong>.<br>
                        Для доступа к сайту отключите VPN и обновите страницу.
                    </p>
                    <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
                        <button onclick="location.reload()" style="
                            padding: 8px 24px;
                            background: #a7499f;
                            border: 2px solid #d66fce;
                            border-right-color: #753070;
                            border-bottom-color: #753070;
                            color: #fff;
                            font-family: inherit;
                            font-size: 16px;
                            cursor: default;
                        ">Обновить страницу</button>
                    </div>
                    <div style="margin-top: 15px; font-size: 12px; color: #666;">
                        Ваш IP: <span id="blocked-ip"></span>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('blocked-ip').textContent = ip;
        // Отключаем все скрипты и взаимодействие
        document.body.style.pointerEvents = 'auto';
    }

    // === Проверка бана IP ===
    async function isIPBanned(ip) {
        if (ip === '0.0.0.0') return false;
        const { data, error } = await supabaseClient
            .from('banned_ips')
            .select('id')
            .eq('ip_address', ip)
            .maybeSingle();
        if (error) return false;
        return !!data;
    }

    // === Проверка бана fingerprint ===
    async function isFingerprintBanned(fingerprint) {
        if (!fingerprint) return false;
        try {
            const { data, error } = await supabaseClient
                .from('banned_fingerprints')
                .select('id')
                .eq('fingerprint', fingerprint)
                .maybeSingle();
            if (error) return false;
            return !!data;
        } catch(e) { return false; }
    }

    // === Бан fingerprint ===
    async function banFingerprint(fingerprint, reason = 'Забанен по отпечатку') {
        if (!fingerprint) return;
        if (await isFingerprintBanned(fingerprint)) {
            showError('System', 'This fingerprint is already blacklisted.');
            return;
        }
        const { error } = await supabaseClient
            .from('banned_fingerprints')
            .insert([{ fingerprint, reason }]);
        if (error) {
            showError('System', 'Fingerprint ban error');
        } else {
            showError('System', 'Fingerprint has been banned!');
        }
    }

    // ===================== БАН ПОЛЬЗОВАТЕЛЕЙ =====================
    async function isUserBanned(userId) {
        if (!userId) return false;
        try {
            const { data, error } = await supabaseClient
                .from('banned_users')
                .select('id')
                .eq('user_id', userId)
                .maybeSingle();
            if (error) {
                console.error('Ошибка проверки бана пользователя:', error);
                return false;
            }
            return !!data;
        } catch (e) {
            return false;
        }
    }

    async function banUser(userId, reason = 'Забанен администратором') {
        if (!userId) return;
        if (await isUserBanned(userId)) {
            showError('Бан пользователя', 'Этот пользователь уже забанен.');
            return;
        }
        const { error } = await supabaseClient
            .from('banned_users')
            .insert([{ user_id: userId, reason }]);
        if (error) {
            showError('Бан пользователя', 'Не удалось забанить пользователя: ' + error.message);
        } else {
            showError('Бан пользователя', 'Пользователь успешно забанен!');
        }
    }

    async function unbanUser(userId) {
        if (!userId) return;
        const { error } = await supabaseClient
            .from('banned_users')
            .delete()
            .eq('user_id', userId);
        if (error) {
            showError('Разбан пользователя', 'Не удалось разбанить пользователя: ' + error.message);
        } else {
            showError('Разбан пользователя', 'Пользователь разбанен.');
        }
    }

    // === Проверка спам-лимитов + бан ===
    async function checkSpamLimits(table, user, ip, fingerprint, messageOrImageHash) {
        // === БАНЫ ===
        if (user && user.id && (await isUserBanned(user.id))) {
            return { allowed: false, reason: 'Ваш аккаунт забанен.' };
        }
        if (fingerprint && (await isFingerprintBanned(fingerprint))) {
            return { allowed: false, reason: 'Ваше устройство забанено.' };
        }
        if (await isIPBanned(ip)) {
            return { allowed: false, reason: 'Ваш IP забанен.' };
        }

        const now = new Date();
        const isLoggedIn = user && user.id;

        // === ЛИМИТЫ ПО FINGERPRINT (для гостей) ===
        let idField, idValue;
        if (isLoggedIn) {
            idField = 'user_id';
            idValue = user.id;
        } else {
            idField = fingerprint ? 'fingerprint' : 'ip_address';
            idValue = fingerprint || ip;
        }

        const limit = isLoggedIn ? 5 : 1;
        const timeWindow = isLoggedIn ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
        const startTime = new Date(now.getTime() - timeWindow);
        const dateField = (table === 'guestbook') ? 'date' : 'created_at';

        // Проверяем количество записей
        const { count, error } = await supabaseClient
            .from(table)
            .select('*', { count: 'exact', head: true })
            .eq(idField, idValue)
            .gte(dateField, startTime.toISOString());

        if (error) {
            console.error('Ошибка подсчёта лимитов:', error);
            return { allowed: false, reason: 'Ошибка проверки лимитов' };
        }

        // Если лимит превышен
        if (count >= limit) {
            const noun = table === 'guestbook' ? 'сообщений' : 'рисунков';
            const period = isLoggedIn ? 'час' : 'день';

            // === АВТО-БАН IP при 3-кратном превышении (спам) ===
            if (!isLoggedIn && count >= limit * 3) {
                // Баним IP на сутки
                await supabaseClient
                    .from('banned_ips')
                    .insert([{ ip_address: ip, reason: 'Автоматический бан за спам' }]);
                console.log(`🚫 IP ${ip} автоматически забанен за спам (${count} записей)`);
                return { allowed: false, reason: 'Ваш IP забанен за спам.' };
            }

            return { allowed: false, reason: `Вы исчерпали лимит (${count}/${limit}) ${noun} за ${period}.` };
        }

        // === ЗАЩИТА ОТ ДУБЛИКАТОВ (для гостей) ===
        if (table === 'guestbook' && messageOrImageHash && !isLoggedIn) {
            const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
            const { count: dupCount, error: dupError } = await supabaseClient
                .from(table)
                .select('*', { count: 'exact', head: true })
                .eq('ip_address', ip)
                .eq('message', messageOrImageHash)
                .gte(dateField, fiveMinutesAgo.toISOString());
            if (!dupError && dupCount > 0) {
                return { allowed: false, reason: 'Вы уже отправляли такое сообщение недавно. Подождите 5 минут.' };
            }
        }

        return { allowed: true };
    }

    async function cleanOldRecords() {
        const now = new Date();
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Удаляем сообщения старше 30 дней
        await supabaseClient
            .from('guestbook')
            .delete()
            .lt('date', monthAgo.toISOString());

        // Удаляем рисунки старше 30 дней
        await supabaseClient
            .from('paintings')
            .delete()
            .lt('created_at', monthAgo.toISOString());
    }

    // ============== ГОСТЕВАЯ КНИГА ==============
    const gbName = document.getElementById('gbName');
    const gbMessage = document.getElementById('gbMessage');
    const gbSend = document.getElementById('gbSend');
    const gbMessages = document.getElementById('gbMessages');
    
    let guestbookCurrentPage = 0;
    const guestbookPageSize = 5;
    let guestbookTotalMessages = 0;
    let guestbookTotalPages = 0;
    const guestbookPrevBtn = document.getElementById('guestbookPrevPageBtn');
    const guestbookNextBtn = document.getElementById('guestbookNextPageBtn');
    const guestbookPageIndicator = document.getElementById('guestbookPageIndicator');

    // === Каптча ===
    const captchaOverlay = document.getElementById('captchaOverlay');
    const captchaModal = document.getElementById('captchaModal');
    const captchaQuestion = document.getElementById('captchaQuestion');
    const captchaAnswer = document.getElementById('captchaAnswer');
    const captchaOk = document.getElementById('captchaOk');
    const captchaCancel = document.getElementById('captchaCancel');

    let captchaResult = 5;
    let pendingAction = null;
    let pendingData = null;

    function generateCaptcha() {
        const operators = ['+', '-', '*'];
        const op = operators[Math.floor(Math.random() * operators.length)];
        let num1, num2, result;
        switch (op) {
            case '+': num1 = Math.floor(Math.random()*10)+1; num2 = Math.floor(Math.random()*10)+1; result = num1+num2; break;
            case '-': num1 = Math.floor(Math.random()*20)+1; num2 = Math.floor(Math.random()*num1)+1; result = num1-num2; break;
            case '*': num1 = Math.floor(Math.random()*10)+1; num2 = Math.floor(Math.random()*10)+1; result = num1*num2; break;
        }
        captchaQuestion.textContent = `${num1} ${op} ${num2} = ?`;
        captchaResult = result;
        captchaAnswer.value = '';
        captchaAnswer.classList.remove('error');
    }

    function openCaptcha(action, data) {
        if (captchaOverlay.style.display === 'flex') return;
        pendingAction = action;
        pendingData = data;
        generateCaptcha();
        captchaOverlay.style.display = 'flex';
        captchaAnswer.focus();
        disableBodyScroll();
    }

    function closeCaptcha() {
        captchaOverlay.style.display = 'none';
        pendingAction = null;
        pendingData = null;
        captchaAnswer.classList.remove('error');
        enableBodyScroll();
    }

    function shakeModal() {
        captchaModal.classList.add('shake-modal');
        setTimeout(() => captchaModal.classList.remove('shake-modal'), 300);
    }

    function triggerErrorEffect() {
        playChordSound();
        win95Window.classList.add('error-effect');
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(255,0,0,0.3)';
        overlay.style.zIndex = '1500';
        overlay.style.pointerEvents = 'none';
        document.body.appendChild(overlay);
        setTimeout(() => {
            win95Window.classList.remove('error-effect');
            overlay.remove();
        }, 300);
    }

    captchaOk.addEventListener('click', () => {
        const answer = parseInt(captchaAnswer.value.trim(), 10);
        if (isNaN(answer) || answer !== captchaResult) {
            triggerErrorEffect();
            shakeModal();
            captchaAnswer.classList.add('error');
            generateCaptcha();
            return;
        }
        playChimesSound();
        if (pendingAction) pendingAction(pendingData);
        closeCaptcha();
    });

    captchaCancel.addEventListener('click', closeCaptcha);
    captchaOverlay.addEventListener('click', (e) => {
        if (e.target === captchaOverlay) closeCaptcha();
    });

    // === Загрузка сообщений ===
    async function loadGuestbook(page = guestbookCurrentPage) {
        gbMessages.innerHTML = '';
        const offset = page * guestbookPageSize;
        try {
            const { data, count, error } = await supabaseClient
                .from('guestbook')
                .select('*', { count: 'exact' })
                .order('date', { ascending: false })
                .range(offset, offset + guestbookPageSize - 1);

            if (error) {
                //console.error('Ошибка загрузки guestbook:', error);
                gbMessages.innerHTML = '<p style="color: red;">Failed to load messages: ' + error.message + '</p>';
                return;
            }

            guestbookTotalMessages = count || 0;
            guestbookTotalPages = Math.ceil(guestbookTotalMessages / guestbookPageSize);
            guestbookCurrentPage = page;
            updateGuestbookPagination();
            await renderMessages(data || []);
        } catch (e) {
            //console.error('Исключение в loadGuestbook:', e);
            gbMessages.innerHTML = '<p style="color: red;">Ошибка загрузки сообщений</p>';
        }
    }

    function updateGuestbookPagination() {
        if (guestbookPrevBtn && guestbookNextBtn && guestbookPageIndicator) {
            guestbookPrevBtn.disabled = guestbookCurrentPage === 0;
            guestbookNextBtn.disabled = guestbookCurrentPage >= guestbookTotalPages - 1;
            guestbookPageIndicator.textContent = `Page ${guestbookCurrentPage + 1} of ${guestbookTotalPages || 1}`;
        }
    }

    // === Отрисовка сообщений с аватарками ===
    async function renderMessages(messages) {
        gbMessages.innerHTML = '';
        if (!messages || messages.length === 0) {
            gbMessages.innerHTML = '<p style="color: #808080;">No messages yet. Be the first!</p>';
            return;
        }

        console.log(`📝 Рендерим ${messages.length} сообщений`);

        const avatarPromises = messages.map(async (msg) => {
            if (msg.user_id) {
                console.log(`renderMessages: загружаем аватарку для user_id=${msg.user_id}, сообщение ID=${msg.id}`);
                const url = await fetchUserAvatar(msg.user_id);
                return { msgId: msg.id, avatarUrl: url };
            } else {
                console.log(`renderMessages: сообщение ${msg.id} не имеет user_id, аватарка не будет показана`);
            }
            return null;
        });
        const avatarResults = await Promise.all(avatarPromises);
        const avatarMap = {};
        avatarResults.forEach(item => {
            if (item) avatarMap[item.msgId] = item.avatarUrl;
        });

        messages.forEach(msg => {
            const msgDiv = document.createElement('div');
            msgDiv.style.border = '2px solid #808080';
            msgDiv.style.borderRightColor = '#ffffff';
            msgDiv.style.borderBottomColor = '#ffffff';
            msgDiv.style.padding = '8px';
            msgDiv.style.marginBottom = '10px';
            msgDiv.style.backgroundColor = '#d4d0c8';
            msgDiv.style.position = 'relative';
            msgDiv.style.display = 'flex';
            msgDiv.style.gap = '10px';
            msgDiv.style.alignItems = 'flex-start';

            const avatarDiv = document.createElement('div');
            avatarDiv.style.width = '48px';
            avatarDiv.style.height = '48px';
            avatarDiv.style.border = '2px solid #808080';
            avatarDiv.style.borderTopColor = '#ffffff';
            avatarDiv.style.borderLeftColor = '#ffffff';
            avatarDiv.style.background = '#d4d0c8';
            avatarDiv.style.flexShrink = '0';
            avatarDiv.style.overflow = 'hidden';
            avatarDiv.style.display = 'flex';
            avatarDiv.style.alignItems = 'center';
            avatarDiv.style.justifyContent = 'center';
            avatarDiv.style.fontSize = '24px';

            const avatarUrl = avatarMap[msg.id];
            if (avatarUrl) {
                console.log(`renderMessages: сообщение ${msg.id} получило аватарку`);
                avatarDiv.innerHTML = `<img src="${avatarUrl}?t=${Date.now()}" style="width: 100%; height: 100%; object-fit: cover;">`;
            } else {
                avatarDiv.textContent = '👤';
            }

            const contentDiv = document.createElement('div');
            contentDiv.style.flex = '1';
            contentDiv.style.minWidth = '0';

            const date = msg.date ? new Date(msg.date).toLocaleString() : 'Unknown date';
            contentDiv.innerHTML = `
                <div style="font-weight: bold; color: #ffffff">${escapeHtml(msg.name)}</div>
                <div style="font-size: 11px; color: #a7a7a7;">${date}</div>
                <div style="margin-top: 5px; white-space: pre-wrap; color: #ffffff">${escapeHtml(msg.message)}</div>
            `;

            msgDiv.appendChild(avatarDiv);
            msgDiv.appendChild(contentDiv);
            gbMessages.appendChild(msgDiv);
        });
    }

    function escapeHtml(unsafe) {
        return unsafe.replace(/[&<>"']/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            if (m === '"') return '&quot;';
            if (m === "'") return '&#039;';
            return m;
        });
    }

    // === Отправка сообщения ===
    async function performSendGuestbook(data) {
        const { name, message, ip, fingerprint } = data;
        const user = currentUser;

        const spamCheck = await checkSpamLimits('guestbook', user, ip, fingerprint, message);
        if (!spamCheck.allowed) {
            triggerErrorEffect();
            const errorDiv = document.createElement('div');
            errorDiv.style.color = '#ff0000';
            errorDiv.style.border = '2px solid #ff0000';
            errorDiv.style.padding = '8px';
            errorDiv.style.marginBottom = '10px';
            errorDiv.textContent = spamCheck.reason;
            gbMessages.prepend(errorDiv);
            return;
        }

        const insertData = { name, message, ip_address: ip, fingerprint };
        if (user) {
            insertData.user_id = user.id;
            insertData.user_email = user.email;
        }

        try {
            const { error } = await supabaseClient.from('guestbook').insert([insertData]);
            if (error) {
                //console.error('Ошибка вставки сообщения:', error);
                triggerErrorEffect();
                const errorDiv = document.createElement('div');
                errorDiv.style.color = '#ff0000';
                errorDiv.style.border = '2px solid #ff0000';
                errorDiv.style.padding = '8px';
                errorDiv.style.marginBottom = '10px';
                errorDiv.textContent = 'Ошибка отправки: ' + error.message;
                gbMessages.prepend(errorDiv);
                return;
            }
            gbName.value = '';
            gbMessage.value = '';
            guestbookCurrentPage = 0;
            await loadGuestbook(0);
            playChimesSound();
        } catch (e) {
            //console.error('Исключение при отправке:', e);
            triggerErrorEffect();
        }
    }

    gbSend.addEventListener('click', async (e) => {
        e.preventDefault();
        const name = gbName.value.trim();
        const message = gbMessage.value.trim();
        if (!name || !message) {
            showError('Send message', 'Please fill in your name and message.');
            return;
        }
        // === ОГРАНИЧЕНИЕ ДЛИНЫ СООБЩЕНИЯ ===
        const MAX_MESSAGE_LENGTH = 500; // можно изменить
        if (message.length > MAX_MESSAGE_LENGTH) {
            showError('Send message', `The message must not exceed ${MAX_MESSAGE_LENGTH} characters. Current: ${message.length}.`);
            return;
        }
        const MAX_NAME_LENGTH = 50;
        if (name.length > MAX_NAME_LENGTH) {
            showError('Send message', `The name must not exceed ${MAX_NAME_LENGTH} characters.`);
            return;
        }
        const ip = await getClientIP();
        const fingerprint = await getFingerprint();

        const spamCheck = await checkSpamLimits('guestbook', currentUser, ip, fingerprint, message);
        if (!spamCheck.allowed) {
            showError('Send message', spamCheck.reason);
            return;
        }

        openCaptcha(performSendGuestbook, { name, message, ip, fingerprint });
    });

    // ============== ПРОЕКТЫ И ДРУЗЬЯ ==============
    async function loadProjects() {
        const container = document.getElementById('projects-container');
        let projects = [];
        try {
            const response = await fetch('projects.json');
            if (response.ok) projects = await response.json();
        } catch (e) {}
        if (!projects.length) {
            container.innerHTML = '<p style="color: red;">No projects available.</p>';
            return;
        }
        container.innerHTML = '';
        projects.forEach(proj => {
            const item = document.createElement('div');
            item.className = 'project-item';
            item.innerHTML = `
                <div class="project-cover"><img src="${escapeHtml(proj.cover)}" alt=""></div>
                <div class="project-title">${escapeHtml(proj.title)}</div>
                <div class="project-desc">${escapeHtml(proj.desc)}</div>
                <a href="${escapeHtml(proj.link)}" class="project-button">${escapeHtml(proj.button)}</a>
            `;
            container.appendChild(item);
        });
    }

    async function loadFriends() {
        const container = document.getElementById('friends-container');
        let friends = [];
        try {
            const response = await fetch('friends.json');
            if (response.ok) friends = await response.json();
        } catch (e) {}
        if (!friends.length) {
            container.innerHTML = '<p style="color: red;">No friends available.</p>';
            return;
        }
        container.innerHTML = '<ul style="list-style: none; padding: 0;">' + 
            friends.map(f => `<li style="margin-bottom: 8px;">👤 <strong>${escapeHtml(f.name)}</strong> — ${escapeHtml(f.icq)}</li>`).join('') +
            '</ul>';
    }

    loadProjects();
    loadFriends();

    // ============== PAINT ==============
    const mainCanvas = document.getElementById('mainCanvas');
    const overlayCanvas = document.getElementById('overlayCanvas');
    const ctx = mainCanvas.getContext('2d');
    const overlayCtx = overlayCanvas.getContext('2d');

    const clearBtn = document.getElementById('clearCanvas');
    const saveBtn = document.getElementById('saveCanvas');
    const toolBrush = document.getElementById('toolBrush');
    const toolEraser = document.getElementById('toolEraser');
    const brushSizeSlider = document.getElementById('brushSizeSlider');
    const brushSizeValue = document.getElementById('brushSizeValue');
    const colorPalette = document.getElementById('colorPalette');
    const gallery = document.getElementById('paintGallery');
    const pickColorBtn = document.getElementById('pickColorBtn');
    const colorPicker = document.getElementById('colorPicker');
    const currentColorIndicator = document.getElementById('currentColorIndicator');
    const undoBtn = document.getElementById('undoBtn');

    const redSlider = document.getElementById('redSlider');
    const greenSlider = document.getElementById('greenSlider');
    const blueSlider = document.getElementById('blueSlider');
    const redValue = document.getElementById('redValue');
    const greenValue = document.getElementById('greenValue');
    const blueValue = document.getElementById('blueValue');
    const hexInput = document.getElementById('hexInput');
    const applyHex = document.getElementById('applyHex');

    let currentTool = 'brush';
    let currentColor = '#000000';
    let brushSize = 2;

    let layers = [];
    let currentLayerIndex = 0;

    function initLayers() {
        const baseCanvas = document.createElement('canvas');
        baseCanvas.width = mainCanvas.width;
        baseCanvas.height = mainCanvas.height;
        const baseCtx = baseCanvas.getContext('2d');
        baseCtx.fillStyle = 'white';
        baseCtx.fillRect(0, 0, baseCanvas.width, baseCanvas.height);
        layers = [{
            canvas: baseCanvas,
            ctx: baseCtx,
            visible: true,
            opacity: 1,
            name: 'Background',
            id: Date.now()
        }];
        currentLayerIndex = 0;
        renderLayersUI();
        compositeLayers();
        pushHistoryLayers();
    }

    function compositeLayers() {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, mainCanvas.width, mainCanvas.height);
        layers.forEach(layer => {
            if (layer.visible) {
                ctx.globalAlpha = layer.opacity;
                ctx.drawImage(layer.canvas, 0, 0);
            }
        });
        ctx.globalAlpha = 1.0;
    }

    let history = [];
    const MAX_HISTORY = 20;

    function pushHistoryLayers() {
        const snapshot = layers.map(layer => layer.ctx.getImageData(0, 0, mainCanvas.width, mainCanvas.height));
        history.push(snapshot);
        if (history.length > MAX_HISTORY) history.shift();
    }

    function restoreLayersFromHistory(snapshot) {
        snapshot.forEach((imageData, index) => {
            if (layers[index]) layers[index].ctx.putImageData(imageData, 0, 0);
        });
        compositeLayers();
        renderLayersUI();
    }

    undoBtn.addEventListener('click', () => {
        if (history.length <= 1) return;
        history.pop();
        restoreLayersFromHistory(history[history.length - 1]);
    });

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.code === 'KeyZ') {
            const active = document.activeElement;
            if (!(active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)) {
                e.preventDefault();
                undoBtn.click();
            }
        }
    });

    const colors = [
        { hex: '#000000' }, { hex: '#800000' }, { hex: '#008000' }, { hex: '#808000' },
        { hex: '#000080' }, { hex: '#800080' }, { hex: '#008080' }, { hex: '#c0c0c0' },
        { hex: '#808080' }, { hex: '#ff0000' }, { hex: '#00ff00' }, { hex: '#ffff00' },
        { hex: '#0000ff' }, { hex: '#ff00ff' }, { hex: '#00ffff' }, { hex: '#ffffff' }
    ];

    function createPalette() {
        colorPalette.innerHTML = '';
        colors.forEach((c, index) => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = c.hex;
            swatch.dataset.color = c.hex;
            if (index === 0) swatch.classList.add('active');
            colorPalette.appendChild(swatch);
        });
        document.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.addEventListener('click', () => {
                currentColor = swatch.dataset.color;
                currentTool = 'brush';
                updateToolUI();
                updateColorUI(currentColor);
                currentColorIndicator.style.backgroundColor = currentColor;
                updateSlidersFromColor(currentColor);
            });
        });
    }

    function updateToolUI() {
        toolBrush.classList.toggle('active', currentTool === 'brush');
        toolEraser.classList.toggle('active', currentTool === 'eraser');
    }

    function updateColorUI(colorHex) {
        document.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.classList.toggle('active', swatch.dataset.color === colorHex);
        });
    }

    toolBrush.addEventListener('click', () => { currentTool = 'brush'; updateToolUI(); });
    toolEraser.addEventListener('click', () => { currentTool = 'eraser'; updateToolUI(); });

    brushSizeSlider.addEventListener('input', (e) => {
        brushSize = parseInt(e.target.value);
        brushSizeValue.textContent = brushSize;
        if (mouseOverCanvas && !drawing) drawPreview(lastKnownX, lastKnownY);
    });

    createPalette();

    pickColorBtn.addEventListener('click', () => colorPicker.click());
    colorPicker.addEventListener('input', (e) => {
        currentColor = e.target.value;
        currentTool = 'brush';
        updateToolUI();
        currentColorIndicator.style.backgroundColor = currentColor;
        document.querySelectorAll('.color-swatch').forEach(sw => sw.classList.remove('active'));
        updateSlidersFromColor(currentColor);
    });

    function updateColorFromRGB() {
        const r = parseInt(redSlider.value);
        const g = parseInt(greenSlider.value);
        const b = parseInt(blueSlider.value);
        const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        currentColor = hex;
        currentTool = 'brush';
        updateToolUI();
        currentColorIndicator.style.backgroundColor = hex;
        hexInput.value = hex.toUpperCase();
        document.querySelectorAll('.color-swatch').forEach(sw => sw.classList.remove('active'));
    }

    function updateValues() {
        redValue.textContent = redSlider.value;
        greenValue.textContent = greenSlider.value;
        blueValue.textContent = blueSlider.value;
        updateColorFromRGB();
    }

    function updateSlidersFromColor(hex) {
        const r = parseInt(hex.slice(1,3), 16);
        const g = parseInt(hex.slice(3,5), 16);
        const b = parseInt(hex.slice(5,7), 16);
        redSlider.value = r;
        greenSlider.value = g;
        blueSlider.value = b;
        redValue.textContent = r;
        greenValue.textContent = g;
        blueValue.textContent = b;
        hexInput.value = hex.toUpperCase();
    }

    redSlider.addEventListener('input', updateValues);
    greenSlider.addEventListener('input', updateValues);
    blueSlider.addEventListener('input', updateValues);

    applyHex.addEventListener('click', () => {
        let hex = hexInput.value.trim();
        if (!hex.startsWith('#')) hex = '#' + hex;
        if (/^#[0-9A-F]{6}$/i.test(hex)) {
            updateSlidersFromColor(hex);
            updateValues();
        } else {
            triggerErrorEffect();
        }
    });

    currentColorIndicator.style.backgroundColor = currentColor;
    updateSlidersFromColor(currentColor);

    let mouseOverCanvas = false, lastKnownX = 0, lastKnownY = 0, drawing = false, lastX = 0, lastY = 0;

    function getMousePos(e, canvas) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: Math.max(0, Math.min(canvas.width, clientX - rect.left)),
            y: Math.max(0, Math.min(canvas.height, clientY - rect.top))
        };
    }

    function drawPreview(x, y) {
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        if (!mouseOverCanvas || drawing) return;
        overlayCtx.save();
        overlayCtx.strokeStyle = 'black';
        overlayCtx.lineWidth = 1;
        overlayCtx.beginPath();
        overlayCtx.arc(x, y, brushSize / 2, 0, 2 * Math.PI);
        overlayCtx.stroke();
        overlayCtx.restore();
    }

    function startDrawing(e) {
        e.preventDefault();
        if (!layers.length || !layers[currentLayerIndex]) return;
        drawing = true;
        const pos = getMousePos(e, mainCanvas);
        lastX = pos.x;
        lastY = pos.y;
        const layer = layers[currentLayerIndex];
        if (currentTool === 'brush') {
            layer.ctx.globalCompositeOperation = 'source-over';
            layer.ctx.strokeStyle = currentColor;
        } else {
            layer.ctx.globalCompositeOperation = 'destination-out';
            layer.ctx.strokeStyle = 'rgba(0,0,0,1)';
        }
        layer.ctx.beginPath();
        layer.ctx.moveTo(lastX, lastY);
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    }

    function draw(e) {
        e.preventDefault();
        const pos = getMousePos(e, mainCanvas);
        lastKnownX = pos.x;
        lastKnownY = pos.y;
        if (drawing) {
            if (!layers.length || !layers[currentLayerIndex]) return;
            const layer = layers[currentLayerIndex];
            layer.ctx.lineWidth = brushSize;
            layer.ctx.lineTo(pos.x, pos.y);
            layer.ctx.stroke();
            lastX = pos.x;
            lastY = pos.y;
            compositeLayers();
        } else {
            drawPreview(pos.x, pos.y);
        }
    }

    function stopDrawing(e) {
        e.preventDefault();
        if (drawing) {
            if (!layers.length || !layers[currentLayerIndex]) return;
            drawing = false;
            const layer = layers[currentLayerIndex];
            layer.ctx.globalCompositeOperation = 'source-over';
            pushHistoryLayers();
        }
        if (mouseOverCanvas) drawPreview(lastKnownX, lastKnownY);
    }

    mainCanvas.addEventListener('mousedown', startDrawing);
    mainCanvas.addEventListener('mousemove', draw);
    mainCanvas.addEventListener('mouseup', stopDrawing);
    mainCanvas.addEventListener('mouseleave', () => { mouseOverCanvas = false; overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height); });
    mainCanvas.addEventListener('mouseenter', () => { mouseOverCanvas = true; drawPreview(lastKnownX, lastKnownY); });
    mainCanvas.addEventListener('touchstart', startDrawing, { passive: false });
    mainCanvas.addEventListener('touchmove', draw, { passive: false });
    mainCanvas.addEventListener('touchend', stopDrawing);

    clearBtn.addEventListener('click', () => {
        if (!layers.length || !layers[currentLayerIndex]) return;
        const layer = layers[currentLayerIndex];
        if (currentLayerIndex === 0) {
            layer.ctx.fillStyle = 'white';
            layer.ctx.fillRect(0, 0, mainCanvas.width, mainCanvas.height);
        } else {
            layer.ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
        }
        compositeLayers();
        pushHistoryLayers();
    });

    function isCanvasBlank() {
        const imageData = ctx.getImageData(0, 0, mainCanvas.width, mainCanvas.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
            if (imageData.data[i] !== 255 || imageData.data[i+1] !== 255 || imageData.data[i+2] !== 255 || imageData.data[i+3] !== 255)
                return false;
        }
        return true;
    }

    // === Сохранение рисунка ===
    async function performSavePainting(data) {
        const { imageData, ip, fingerprint } = data;
        const user = currentUser;

        const spamCheck = await checkSpamLimits('paintings', user, ip, fingerprint, null);
        if (!spamCheck.allowed) {
            triggerErrorEffect();
            showError('System', spamCheck.reason);
            return;
        }

        const insertData = { image_data: imageData, ip_address: ip, fingerprint };
        if (user) {
            insertData.user_id = user.id;
            insertData.user_email = user.email;
        }

        try {
            const { error } = await supabaseClient.from('paintings').insert([insertData]);
            if (error) {
                //console.error('Ошибка сохранения рисунка:', error);
                triggerErrorEffect();
                showError('Painter','Save error: ' + error.message);
                return;
            }
            playChimesSound();
            loadPaintings();
        } catch (e) {
            //console.error('Исключение при сохранении рисунка:', e);
            triggerErrorEffect();
        }
    }

    saveBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (isCanvasBlank()) { triggerErrorEffect(); return; }
        const ip = await getClientIP();
        const fingerprint = await getFingerprint();

        const spamCheck = await checkSpamLimits('paintings', currentUser, ip, fingerprint, null);
        if (!spamCheck.allowed) {
            triggerErrorEffect();
            showError('System', spamCheck.reason);
            return;
        }

        const imageData = mainCanvas.toDataURL();
        openCaptcha(performSavePainting, { imageData, ip, fingerprint });
    });

    // === UI слоёв ===
    function renderLayersUI() {
        const container = document.getElementById('layersList');
        if (!container) return;
        container.innerHTML = '';
        layers.forEach((layer, index) => {
            const div = document.createElement('div');
            div.className = 'layer-item' + (index === currentLayerIndex ? ' active' : '');
            const vis = document.createElement('div');
            vis.className = 'layer-visibility ' + (layer.visible ? 'visible' : 'hidden');
            vis.addEventListener('click', (e) => {
                e.stopPropagation();
                layer.visible = !layer.visible;
                compositeLayers();
                renderLayersUI();
            });
            div.appendChild(vis);
            const nameSpan = document.createElement('span');
            nameSpan.className = 'layer-name';
            nameSpan.textContent = layer.name;
            nameSpan.addEventListener('dblclick', () => {
                if (index === 0) { triggerErrorEffect(); return; }
                openRenameModal(index);
            });
            div.appendChild(nameSpan);
            const opacityInput = document.createElement('input');
            opacityInput.type = 'range';
            opacityInput.min = 0;
            opacityInput.max = 1;
            opacityInput.step = 0.05;
            opacityInput.value = layer.opacity;
            opacityInput.className = 'layer-opacity';
            opacityInput.addEventListener('input', (e) => {
                layer.opacity = parseFloat(e.target.value);
                compositeLayers();
                renderLayersUI();
            });
            div.appendChild(opacityInput);
            const moveDiv = document.createElement('div');
            moveDiv.className = 'layer-move';
            if (index > 1) {
                const upBtn = document.createElement('button');
                upBtn.textContent = '↑';
                upBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    [layers[index-1], layers[index]] = [layers[index], layers[index-1]];
                    if (currentLayerIndex === index) currentLayerIndex = index-1;
                    else if (currentLayerIndex === index-1) currentLayerIndex = index;
                    renderLayersUI();
                    compositeLayers();
                    pushHistoryLayers();
                });
                moveDiv.appendChild(upBtn);
            }
            if (index < layers.length - 1 && index > 0) {
                const downBtn = document.createElement('button');
                downBtn.textContent = '↓';
                downBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    [layers[index], layers[index+1]] = [layers[index+1], layers[index]];
                    if (currentLayerIndex === index) currentLayerIndex = index+1;
                    else if (currentLayerIndex === index+1) currentLayerIndex = index;
                    renderLayersUI();
                    compositeLayers();
                    pushHistoryLayers();
                });
                moveDiv.appendChild(downBtn);
            }
            div.appendChild(moveDiv);
            div.addEventListener('click', () => {
                currentLayerIndex = index;
                renderLayersUI();
            });
            container.appendChild(div);
        });
    }

    const renameModal = document.getElementById('renameLayerModal');
    const renameInput = document.getElementById('renameLayerInput');
    const renameOk = document.getElementById('renameLayerOk');
    const renameCancel = document.getElementById('renameLayerCancel');
    const renameModalCloseBtn = document.getElementById('closeRenameModal');
    let layerToRenameIndex = -1;

    function openRenameModal(index) {
        if (index === 0) { triggerErrorEffect(); return; }
        layerToRenameIndex = index;
        renameInput.value = layers[index].name;
        renameModal.style.display = 'flex';
        renameInput.focus();
        disableBodyScroll();
    }

    function closeRenameModal() {
        renameModal.style.display = 'none';
        layerToRenameIndex = -1;
        enableBodyScroll();
    }

    renameOk.addEventListener('click', () => {
        const newName = renameInput.value.trim();
        if (newName && layerToRenameIndex !== -1) {
            layers[layerToRenameIndex].name = newName;
            renderLayersUI();
        }
        closeRenameModal();
    });
    renameCancel.addEventListener('click', closeRenameModal);
    renameModalCloseBtn.addEventListener('click', closeRenameModal);
    renameModal.addEventListener('click', (e) => { if (e.target === renameModal) closeRenameModal(); });

    document.getElementById('addLayerBtn')?.addEventListener('click', () => {
        if (layers.length >= 10) { triggerErrorEffect(); return; }
        const newCanvas = document.createElement('canvas');
        newCanvas.width = mainCanvas.width;
        newCanvas.height = mainCanvas.height;
        const newCtx = newCanvas.getContext('2d');
        layers.push({
            canvas: newCanvas,
            ctx: newCtx,
            visible: true,
            opacity: 1,
            name: `Layer ${layers.length + 1}`,
            id: Date.now()
        });
        currentLayerIndex = layers.length - 1;
        renderLayersUI();
        compositeLayers();
        pushHistoryLayers();
    });

    document.getElementById('deleteLayerBtn')?.addEventListener('click', () => {
        if (layers.length <= 1 || currentLayerIndex === 0) { triggerErrorEffect(); return; }
        layers.splice(currentLayerIndex, 1);
        if (currentLayerIndex >= layers.length) currentLayerIndex = layers.length - 1;
        renderLayersUI();
        compositeLayers();
        pushHistoryLayers();
    });

    document.getElementById('mergeDownBtn')?.addEventListener('click', () => {
        if (currentLayerIndex === 0) { triggerErrorEffect(); return; }
        const bottomLayer = layers[currentLayerIndex - 1];
        const topLayer = layers[currentLayerIndex];
        bottomLayer.ctx.save();
        bottomLayer.ctx.globalAlpha = topLayer.opacity;
        bottomLayer.ctx.drawImage(topLayer.canvas, 0, 0);
        bottomLayer.ctx.restore();
        layers.splice(currentLayerIndex, 1);
        currentLayerIndex--;
        renderLayersUI();
        compositeLayers();
        pushHistoryLayers();
    });

    initLayers();

    // ============== ГАЛЕРЕЯ РИСУНКОВ ==============
    const imageModal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const closeImageModal = document.getElementById('closeImageModal');
    const modalLikes = document.getElementById('modalLikes');
    const modalLikeBtn = document.getElementById('modalLikeBtn');
    const modalDate = document.getElementById('modalDate');
    const modalPrevBtn = document.getElementById('modalPrevBtn');
    const modalNextBtn = document.getElementById('modalNextBtn');
    const modalRandomBtn = document.getElementById('modalRandomBtn');
    const loadingDiv = document.getElementById('modalLoading');

    let currentModalId = null;
    let allPaintings = [];
    let allPaintingsLoaded = false;

    async function loadAllPaintingsForNav() {
        if (allPaintingsLoaded) return;
        const { data, error } = await supabaseClient.from('paintings').select('id').order('created_at', { ascending: false });
        if (!error && data) {
            allPaintings = data.map(p => p.id);
            allPaintingsLoaded = true;
        }
    }

    window.openImageModal = async function(id) {
        await loadAllPaintingsForNav();
        currentModalId = id;
        loadingDiv.style.display = 'block';
        modalImage.style.display = 'none';
        if (modalLikes && modalLikes.parentElement) modalLikes.parentElement.style.display = 'none';

        const { data, error } = await supabaseClient.from('paintings').select('image_data, created_at, likes').eq('id', id).single();
        if (error || !data) {
            loadingDiv.style.display = 'none';
            modalImage.style.display = 'block';
            modalImage.alt = 'Error loading image';
            return;
        }

        modalImage.src = data.image_data;
        modalImage.onload = () => {
            loadingDiv.style.display = 'none';
            modalImage.style.display = 'block';
            if (modalLikes && modalLikes.parentElement) modalLikes.parentElement.style.display = 'block';
            modalLikes.textContent = data.likes || 0;
            modalDate.textContent = new Date(data.created_at).toLocaleString();

            (async () => {
                const { data: likesData } = await supabaseClient.from('painting_likes').select('id').eq('painting_id', id).eq('visitor_id', visitorId);
                const liked = likesData && likesData.length > 0;
                modalLikeBtn.classList.remove('liked', 'unliked');
                modalLikeBtn.classList.add(liked ? 'liked' : 'unliked');
                modalLikeBtn.disabled = liked;
                modalLikeBtn.onclick = null;
                if (!liked) {
                    modalLikeBtn.onclick = async () => {
                        modalLikeBtn.disabled = true;
                        const oldLikes = parseInt(modalLikes.textContent) || 0;
                        modalLikes.textContent = oldLikes + 1;
                        modalLikeBtn.classList.remove('unliked');
                        modalLikeBtn.classList.add('liked');
                        const { error: insertError } = await supabaseClient.from('painting_likes').insert({ painting_id: id, visitor_id: visitorId });
                        if (insertError && insertError.code !== '23505') {
                            modalLikes.textContent = oldLikes;
                            modalLikeBtn.classList.remove('liked');
                            modalLikeBtn.classList.add('unliked');
                            modalLikeBtn.disabled = false;
                            return;
                        }
                        await supabaseClient.rpc('increment_likes', { painting_id: id });
                        myLikes.add(id);
                        loadPaintings();
                    };
                }
            })();
        };
        modalImage.onerror = () => {
            loadingDiv.style.display = 'none';
            modalImage.style.display = 'block';
            modalImage.alt = 'Failed to load image';
        };
        imageModal.style.display = 'flex';
        disableBodyScroll();
    };

    function closeImageModalFunc() {
        imageModal.style.display = 'none';
        modalImage.src = '';
        currentModalId = null;
        enableBodyScroll();
    }
    closeImageModal.addEventListener('click', closeImageModalFunc);
    imageModal.addEventListener('click', (e) => { if (e.target === imageModal) closeImageModalFunc(); });

    if (modalPrevBtn && modalNextBtn && modalRandomBtn) {
        modalPrevBtn.addEventListener('click', () => {
            if (!currentModalId || allPaintings.length === 0) return;
            const idx = allPaintings.indexOf(currentModalId);
            if (idx > 0) openImageModal(allPaintings[idx - 1]);
        });
        modalNextBtn.addEventListener('click', () => {
            if (!currentModalId || allPaintings.length === 0) return;
            const idx = allPaintings.indexOf(currentModalId);
            if (idx < allPaintings.length - 1) openImageModal(allPaintings[idx + 1]);
        });
        modalRandomBtn.addEventListener('click', () => {
            if (allPaintings.length === 0) return;
            const randomIdx = Math.floor(Math.random() * allPaintings.length);
            openImageModal(allPaintings[randomIdx]);
        });
    }

    // === Лайки ===
    const VISITOR_KEY = 'visitor_id';
    function generateVisitorId() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        return 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    function getVisitorId() {
        let id = localStorage.getItem(VISITOR_KEY);
        if (!id) {
            id = generateVisitorId();
            localStorage.setItem(VISITOR_KEY, id);
        }
        return id;
    }
    const visitorId = getVisitorId();

    let currentPage = 0;
    const pageSize = 6;
    let totalPaintings = 0;
    let totalPages = 0;
    let myLikes = new Set();
    let sparkleInterval = null;

    async function loadMyLikes() {
        try {
            const { data, error } = await supabaseClient.from('painting_likes').select('painting_id').eq('visitor_id', visitorId);
            if (!error) myLikes = new Set(data.map(row => row.painting_id));
        } catch (e) {}
    }

    async function likePainting(paintingId, buttonElement, likeCountElement) {
        buttonElement.disabled = true;
        buttonElement.classList.remove('unliked');
        buttonElement.classList.add('liked');
        const currentLikes = parseInt(likeCountElement.textContent) || 0;
        likeCountElement.textContent = currentLikes + 1;
        try {
            const { error: insertError } = await supabaseClient.from('painting_likes').insert({ painting_id: paintingId, visitor_id: visitorId });
            if (insertError) {
                if (insertError.code === '23505') {
                    buttonElement.disabled = false;
                    buttonElement.classList.remove('liked');
                    buttonElement.classList.add('unliked');
                    likeCountElement.textContent = currentLikes;
                    triggerErrorEffect();
                    return;
                } else throw insertError;
            }
            await supabaseClient.rpc('increment_likes', { painting_id: paintingId });
            myLikes.add(paintingId);
            playChimesSound();
            loadPaintings();
        } catch (err) {
            buttonElement.disabled = false;
            buttonElement.classList.remove('liked');
            buttonElement.classList.add('unliked');
            likeCountElement.textContent = currentLikes;
            triggerErrorEffect();
        }
    }

    function addSparkles(container) {
        if (sparkleInterval) clearInterval(sparkleInterval);
        const sparkles = [];
        for (let i = 0; i < 8; i++) {
            const sparkle = document.createElement('span');
            sparkle.className = 'sparkle';
            const size = Math.floor(Math.random() * 5) + 4;
            const duration = (Math.random() * 1.5 + 1).toFixed(2);
            const delay = (Math.random() * 2).toFixed(2);
            sparkle.style.cssText = `
                top: ${Math.random() * 100}%;
                left: ${Math.random() * 100}%;
                width: ${size}px;
                height: ${size}px;
                animation: sparkleTwinkle ${duration}s infinite ease-in-out;
                animation-delay: ${delay}s;
                opacity: ${Math.random() * 0.5 + 0.5};
            `;
            container.appendChild(sparkle);
            sparkles.push(sparkle);
        }
        sparkleInterval = setInterval(() => {
            sparkles.forEach(sparkle => {
                sparkle.style.top = Math.random() * 100 + '%';
                sparkle.style.left = Math.random() * 100 + '%';
            });
        }, 2000);
    }

    async function loadPaintings() {
        const offset = currentPage * pageSize;
        try {
            const { data, error } = await supabaseClient
                .from('paintings')
                .select('id, image_data, created_at, likes, user_id, user_email')
                .order('created_at', { ascending: false })
                .range(offset, offset + pageSize - 1);

            if (error) {
                //console.error('Ошибка загрузки paintings:', error);
                gallery.innerHTML = '<p style="color: red;">Ошибка загрузки рисунков: ' + error.message + '</p>';
                return;
            }

            if (totalPaintings === 0) await loadTotalCount();

            document.getElementById('prevPageBtn').disabled = currentPage === 0;
            document.getElementById('nextPageBtn').disabled = currentPage >= totalPages - 1;
            document.getElementById('pageIndicator').textContent = `Page ${currentPage + 1}`;

            let maxLikes = 0;
            data.forEach(p => { if (p.likes > maxLikes) maxLikes = p.likes; });

            gallery.innerHTML = '';
            data.forEach(p => {
                const paintingId = p.id;
                const liked = myLikes.has(paintingId);
                const isTop = (p.likes === maxLikes && maxLikes > 0);

                const imgDiv = document.createElement('div');
                imgDiv.className = 'painting';
                imgDiv.style.border = '2px solid #808080';
                imgDiv.style.borderRightColor = '#ffffff';
                imgDiv.style.borderBottomColor = '#ffffff';
                imgDiv.style.padding = '4px';
                imgDiv.style.backgroundColor = '#d4d0c8';
                imgDiv.style.textAlign = 'center';
                imgDiv.style.marginBottom = '10px';
                imgDiv.style.position = 'relative';

                if (p.user_id) {
                    const authorDiv = document.createElement('div');
                    authorDiv.style.display = 'flex';
                    authorDiv.style.alignItems = 'center';
                    authorDiv.style.gap = '5px';
                    authorDiv.style.marginBottom = '5px';
                    authorDiv.style.fontSize = '11px';
                    authorDiv.style.color = '#333';

                    const avatarSmall = document.createElement('div');
                    avatarSmall.style.width = '24px';
                    avatarSmall.style.height = '24px';
                    avatarSmall.style.border = '1px solid #808080';
                    avatarSmall.style.borderTopColor = '#ffffff';
                    avatarSmall.style.borderLeftColor = '#ffffff';
                    avatarSmall.style.background = '#d4d0c8';
                    avatarSmall.style.overflow = 'hidden';
                    avatarSmall.style.display = 'flex';
                    avatarSmall.style.alignItems = 'center';
                    avatarSmall.style.justifyContent = 'center';
                    avatarSmall.style.fontSize = '14px';
                    avatarSmall.style.flexShrink = '0';

                    (async () => {
                        const avatarUrl = await fetchUserAvatar(p.user_id);
                        if (avatarUrl) {
                            avatarSmall.innerHTML = `<img src="${avatarUrl}?t=${Date.now()}" style="width: 100%; height: 100%; object-fit: cover;">`;
                        } else {
                            avatarSmall.textContent = '👤';
                        }
                    })();

                    authorDiv.appendChild(avatarSmall);
                    const nameSpan = document.createElement('span');

                    imgDiv.appendChild(authorDiv);
                }
                else{
                    const authorDiv = document.createElement('div');
                    authorDiv.style.display = 'flex';
                    authorDiv.style.alignItems = 'center';
                    authorDiv.style.gap = '5px';
                    authorDiv.style.marginBottom = '5px';
                    authorDiv.style.fontSize = '11px';
                    authorDiv.style.color = '#333';

                    const avatarSmall = document.createElement('div');
                    avatarSmall.style.width = '24px';
                    avatarSmall.style.height = '24px';
                    avatarSmall.style.border = '1px solid #808080';
                    avatarSmall.style.borderTopColor = '#ffffff';
                    avatarSmall.style.borderLeftColor = '#ffffff';
                    avatarSmall.style.background = '#d4d0c8';
                    avatarSmall.style.overflow = 'hidden';
                    avatarSmall.style.display = 'flex';
                    avatarSmall.style.alignItems = 'center';
                    avatarSmall.style.justifyContent = 'center';
                    avatarSmall.style.fontSize = '14px';
                    avatarSmall.style.flexShrink = '0';

                    (async () => {
                        const avatarUrl = await fetchUserAvatar(p.user_id);
                        if (avatarUrl) {
                            avatarSmall.innerHTML = `<img src="${avatarUrl}?t=${Date.now()}" style="width: 100%; height: 100%; object-fit: cover;">`;
                        } else {
                            avatarSmall.textContent = '👤';
                        }
                    })();

                    authorDiv.appendChild(avatarSmall);
                    const nameSpan = document.createElement('span');

                    imgDiv.appendChild(authorDiv);
                }

                if (isTop) {
                    imgDiv.classList.add('top-painting');
                    addSparkles(imgDiv);
                }

                const img = document.createElement('img');
                img.src = p.image_data;
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
                img.style.border = '1px solid black';
                img.style.cursor = 'pointer';
                img.addEventListener('click', () => openImageModal(paintingId));
                imgDiv.appendChild(img);

                const dateDiv = document.createElement('div');
                dateDiv.style.fontSize = '10px';
                dateDiv.style.marginTop = '4px';
                dateDiv.textContent = new Date(p.created_at).toLocaleString();
                imgDiv.appendChild(dateDiv);

                const likeRow = document.createElement('div');
                likeRow.style.display = 'flex';
                likeRow.style.alignItems = 'center';
                likeRow.style.justifyContent = 'center';
                likeRow.style.marginTop = '5px';
                likeRow.style.gap = '5px';

                const likeCount = document.createElement('span');
                likeCount.textContent = p.likes || 0;
                likeCount.style.fontSize = '12px';
                likeCount.style.fontWeight = 'bold';

                const likeBtn = document.createElement('button');
                likeBtn.className = 'like-button';
                likeBtn.classList.add(liked ? 'liked' : 'unliked');
                likeBtn.style.cursor = liked ? 'default' : 'pointer';
                if (liked) likeBtn.disabled = true;
                if (!liked) {
                    likeBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        likePainting(paintingId, likeBtn, likeCount);
                    });
                }

                likeRow.appendChild(likeBtn);
                likeRow.appendChild(likeCount);
                imgDiv.appendChild(likeRow);
                gallery.appendChild(imgDiv);
            });
        } catch (e) {
            //console.error('Исключение в loadPaintings:', e);
            gallery.innerHTML = '<p style="color: red;">Ошибка загрузки рисунков</p>';
        }
    }

    async function loadTotalCount() {
        try {
            const { count, error } = await supabaseClient.from('paintings').select('*', { count: 'exact', head: true });
            if (!error) {
                totalPaintings = count;
                totalPages = Math.ceil(totalPaintings / pageSize);
            }
        } catch (e) {}
    }

    // ============== НАВИГАЦИЯ ==============
    const menuItems = document.querySelectorAll('#menu li');
    const sections = {
        about: document.getElementById('about'),
        projects: document.getElementById('projects'),
        friends: document.getElementById('friends'),
        guestbook: document.getElementById('guestbook'),
        paint: document.getElementById('paint'),
        settings: document.getElementById('settings')
    };

    function scrollToSection(sectionId) {
        sections[sectionId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function removeSelectedClass() {
        menuItems.forEach(item => item.classList.remove('selected'));
    }

    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.dataset.target;
            scrollToSection(targetId);
            removeSelectedClass();
            this.classList.add('selected');
        });
    });

    document.querySelectorAll('#menu a').forEach(link => {
        link.addEventListener('click', e => e.preventDefault());
    });

    function disableBodyScroll() {
        document.body.classList.add('modal-open');
    }
    function enableBodyScroll() {
        document.body.classList.remove('modal-open');
    }

    // ============== ДЕНЬ РОЖДЕНИЯ: ПРОГРЕСС-БАР И КОНФЕТТИ ==============

    function startConfetti() {
        const oldContainer = document.getElementById('confetti-container');
        if (oldContainer) oldContainer.remove();

        const container = document.createElement('div');
        container.id = 'confetti-container';
        container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
        document.body.appendChild(container);

        const canvas = document.createElement('canvas');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        container.appendChild(canvas);
        const ctx = canvas.getContext('2d');

        const colors = [
            '#f44336', '#e91e63', '#9c27b0', '#3f51b5', '#2196f3',
            '#009688', '#4caf50', '#8bc34a', '#ffeb3b', '#ff9800',
            '#ff5722', '#ff4081', '#7c4dff', '#00bcd4', '#ffd700'
        ];

        const shapes = ['circle', 'square', 'triangle', 'star', 'rect'];
        const particles = [];
        const count = 300;

        for (let i = 0; i < count; i++) {
            const size = Math.random() * 10 + 4;
            const shape = shapes[Math.floor(Math.random() * shapes.length)];
            particles.push({
                x: Math.random() * canvas.width,
                y: -Math.random() * canvas.height - 50,
                vx: (Math.random() - 0.5) * 0.8,
                vy: Math.random() * 2.5 + 1.5,
                w: shape === 'rect' ? size * (0.6 + Math.random() * 0.8) : size,
                h: shape === 'rect' ? size * (0.4 + Math.random() * 0.6) : size,
                color: colors[Math.floor(Math.random() * colors.length)],
                shape: shape,
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 6,
                gravity: 0.02 + Math.random() * 0.02,
                sway: Math.random() * 0.02,
                phase: Math.random() * 2 * Math.PI,
                dead: false
            });
        }

        function drawParticle(p) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation * Math.PI / 180);
            ctx.fillStyle = p.color;

            switch (p.shape) {
                case 'circle':
                    ctx.beginPath();
                    ctx.arc(0, 0, p.w / 2, 0, 2 * Math.PI);
                    ctx.fill();
                    break;
                case 'square':
                    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                    break;
                case 'triangle':
                    ctx.beginPath();
                    ctx.moveTo(0, -p.h / 2);
                    ctx.lineTo(-p.w / 2, p.h / 2);
                    ctx.lineTo(p.w / 2, p.h / 2);
                    ctx.closePath();
                    ctx.fill();
                    break;
                case 'star':
                    const spikes = 5;
                    const outerRadius = p.w / 2;
                    const innerRadius = outerRadius * 0.4;
                    ctx.beginPath();
                    for (let i = 0; i < spikes * 2; i++) {
                        const radius = i % 2 === 0 ? outerRadius : innerRadius;
                        const angle = (i * Math.PI) / spikes - Math.PI / 2;
                        const x = radius * Math.cos(angle);
                        const y = radius * Math.sin(angle);
                        if (i === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.closePath();
                    ctx.fill();
                    break;
                case 'rect':
                default:
                    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                    break;
            }
            ctx.restore();
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let anyAlive = false;

            for (let p of particles) {
                if (p.dead) continue;

                p.vy += p.gravity;
                p.vx += Math.sin(p.phase) * p.sway;
                p.x += p.vx;
                p.y += p.vy;
                p.rotation += p.rotSpeed;
                p.rotSpeed *= 0.995;

                if (p.y > canvas.height + 50) {
                    p.dead = true;
                    continue;
                }

                if (p.x < -50) p.x = canvas.width + 50;
                if (p.x > canvas.width + 50) p.x = -50;

                anyAlive = true;
                drawParticle(p);
            }

            if (anyAlive) {
                requestAnimationFrame(animate);
            } else {
                container.remove();
            }
        }

        animate();
    }

    function updateBirthdayProgress() {
        const now = new Date();
        const year = now.getFullYear();
        const startDate = new Date(year, 5, 1);   // 1 июня
        const endDate = new Date(year, 7, 24);    // 24 августа

        const container = document.getElementById('birthday-progress-container');
        const progressBar = document.getElementById('birthday-progress-bar');
        const progressText = document.getElementById('birthday-progress-text');

        const hat = document.getElementById('birthdayHat');
        if (hat) {
            if (now.getMonth() === 7 && now.getDate() === 24) {
                hat.classList.add('show');
            } else {
                hat.classList.remove('show');
            }
        }

        // === КОНФЕТТИ ТОЛЬКО В ДЕНЬ РОЖДЕНИЯ ===
        if (now.getMonth() === 7 && now.getDate() === 24) {
            // Проверяем, запускали ли уже конфетти сегодня
            const today = now.toDateString();
            if (localStorage.getItem('confetti_last_run') !== today) {
                localStorage.setItem('confetti_last_run', today);
                setTimeout(() => startConfetti(), 500);
            }
        } else {
            // Если сегодня не день рождения, очищаем флаг, чтобы в следующий день рождения конфетти снова запустились
            localStorage.removeItem('confetti_last_run');
        }

        // === ПРОГРЕСС-БАР (оставляем как было) ===
        if (now >= startDate && now <= endDate) {
            container.style.display = 'block';
            const totalMs = endDate - startDate;
            const elapsedMs = now - startDate;
            const progress = Math.min(100, (elapsedMs / totalMs) * 100);
            progressBar.style.width = progress + '%';
            progressBar.textContent = Math.round(progress) + '%';
            const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
            progressText.textContent = `Time remaining until the birthday ${daysLeft} days`;
        } else {
            container.style.display = 'none';
        }
    }

    // ============== ИНИЦИАЛИЗАЦИЯ ==============
    (async function init() {
        // Если уже заблокирован – не проверяем заново
        if (sessionStorage.getItem('vpn_blocked') === 'true') {
            showBlockedScreen('заблокирован');
            return;
        }
        
        // === ПРОВЕРКА VPN ===
        const ip = await getClientIP();
        const isVpn = await isVPN(ip);
        if (isVpn) {
            showBlockedScreen(ip);
            return;
        }

        sessionStorage.removeItem('vpn_blocked');

        // Остальной код инициализации
        await checkAuth();
        await cleanOldRecords();
        loadGuestbook(0);
        await loadMyLikes();
        await loadTotalCount();
        loadPaintings();
        updateBirthdayProgress();

        const fp = await getFingerprint();
        console.log('🖨️ Ваш fingerprint (FingerprintJS или fallback):', fp);
    })();

    // Realtime обновления гостевой книги
    supabaseClient
        .channel('guestbook_changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'guestbook' }, () => {
            guestbookCurrentPage = 0;
            loadGuestbook(0);
        })
        .subscribe();

    // Пагинация
    if (guestbookPrevBtn) {
        guestbookPrevBtn.addEventListener('click', () => {
            if (guestbookCurrentPage > 0) loadGuestbook(guestbookCurrentPage - 1);
        });
    }
    if (guestbookNextBtn) {
        guestbookNextBtn.addEventListener('click', () => {
            if (guestbookCurrentPage < guestbookTotalPages - 1) loadGuestbook(guestbookCurrentPage + 1);
        });
    }

    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    if (prevPageBtn && nextPageBtn) {
        prevPageBtn.addEventListener('click', async () => {
            if (currentPage > 0) { currentPage--; await loadPaintings(); }
        });
        nextPageBtn.addEventListener('click', async () => {
            if (currentPage < totalPages - 1) { currentPage++; await loadPaintings(); }
        });
    }

    console.log('✅ main.js загружен (динамическая загрузка FingerprintJS, fallback, аватарки)');
})();