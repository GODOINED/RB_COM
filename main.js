// main.js — основной функционал сайта

(function() {
    // === Звуки ===
    const clickSoundUrl = 'sounds/click.mp3';
    const chimesSoundUrl = 'sounds/chimes.mp3';
    const chordSoundUrl = 'sounds/chord.mp3';

    let clickSound = null;
    let chimesSound = null;
    let chordSound = null;
    let soundsEnabled = true;

    function playClickSound() {
        if (!soundsEnabled) return;
        if (!clickSound) {
            clickSound = new Audio(clickSoundUrl);
            clickSound.load();
        }
        clickSound.currentTime = 0;
        clickSound.play().catch(e => console.log('Click play error:', e));
    }

    function playChimesSound() {
        if (!soundsEnabled) return;
        if (!chimesSound) {
            chimesSound = new Audio(chimesSoundUrl);
            chimesSound.load();
        }
        chimesSound.currentTime = 0;
        chimesSound.play().catch(e => console.log('Chimes play error:', e));
    }

    function playChordSound() {
        if (!soundsEnabled) return;
        if (!chordSound) {
            chordSound = new Audio(chordSoundUrl);
            chordSound.load();
        }
        chordSound.currentTime = 0;
        chordSound.play().catch(e => console.log('Chord play error:', e));
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
    const body = document.body;
    const win95Window = document.querySelector('.win95-window');

    let originalBackground = body.style.background;

    function setWallpaper(type) {
        let gradient;
        switch(type) {
            case 'dark': gradient = 'linear-gradient(145deg, #1e1e1e 0%, #2d2d2d 100%)'; break;
            case 'blue': gradient = 'linear-gradient(145deg, #003399 0%, #3366cc 100%)'; break;
            case 'green': gradient = 'linear-gradient(145deg, #004d40 0%, #008b74 100%)'; break;
            case 'gray': gradient = 'linear-gradient(145deg, #505050 0%, #808080 100%)'; break;
            default: gradient = 'linear-gradient(145deg, #1e1e1e 0%, #2d2d2d 100%)';
        }
        body.style.background = gradient;
        originalBackground = gradient;
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
    autosaveCheckbox.addEventListener('change', function(e) { if (e.target.checked) saveSettings(); });
    loadSettings();

    // === Supabase клиент ===
    const SUPABASE_URL = 'https://zirkmegtqfkfvyatgbgf.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_PB_s3zWbWYA-0-BtqH1M7g_7De-juWW';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // === Гостевая книга ===
    const gbName = document.getElementById('gbName');
    const gbMessage = document.getElementById('gbMessage');
    const gbSend = document.getElementById('gbSend');
    const gbMessages = document.getElementById('gbMessages');

    async function loadGuestbook() {
        try {
            const { data, error } = await supabaseClient
                .from('guestbook')
                .select('*')
                .order('date', { ascending: false });
            
            if (error) {
                console.error('Error loading messages:', error);
                gbMessages.innerHTML = '<p style="color: red;">Failed to load messages.</p>';
                return;
            }
            
            renderMessages(data || []);
        } catch (err) {
            console.error('Unexpected error:', err);
            gbMessages.innerHTML = '<p style="color: red;">Unexpected error.</p>';
        }
    }

    function renderMessages(messages) {
        gbMessages.innerHTML = '';
        if (!messages || messages.length === 0) {
            gbMessages.innerHTML = '<p style="color: #808080;">No messages yet. Be the first!</p>';
            return;
        }
        messages.forEach(msg => {
            const msgDiv = document.createElement('div');
            msgDiv.style.border = '2px solid #808080';
            msgDiv.style.borderRightColor = '#ffffff';
            msgDiv.style.borderBottomColor = '#ffffff';
            msgDiv.style.padding = '8px';
            msgDiv.style.marginBottom = '10px';
            msgDiv.style.backgroundColor = '#d4d0c8';
            
            const date = msg.date ? new Date(msg.date).toLocaleString() : 'Unknown date';
            msgDiv.innerHTML = `
                <div style="font-weight: bold;">${escapeHtml(msg.name)}</div>
                <div style="font-size: 11px; color: #404040;">${date}</div>
                <div style="margin-top: 5px; white-space: pre-wrap;">${escapeHtml(msg.message)}</div>
            `;
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

    function triggerErrorEffect() {
        playChordSound();
        win95Window.classList.add('error-effect');
        body.style.background = 'linear-gradient(145deg, #4a0000 0%, #8b0000 100%)';
        setTimeout(() => {
            win95Window.classList.remove('error-effect');
            body.style.background = originalBackground;
        }, 300);
    }

    // === Капча ===
    const captchaOverlay = document.getElementById('captchaOverlay');
    const captchaModal = document.getElementById('captchaModal');
    const captchaQuestion = document.getElementById('captchaQuestion');
    const captchaAnswer = document.getElementById('captchaAnswer');
    const captchaOk = document.getElementById('captchaOk');
    const captchaCancel = document.getElementById('captchaCancel');

    let captchaNum1 = 2;
    let captchaNum2 = 3;
    let captchaResult = 5;
    let pendingAction = null;
    let pendingData = null;

    function generateCaptcha() {
        captchaNum1 = Math.floor(Math.random() * 9) + 1;
        captchaNum2 = Math.floor(Math.random() * 9) + 1;
        captchaResult = captchaNum1 + captchaNum2;
        captchaQuestion.textContent = `${captchaNum1} + ${captchaNum2} = ?`;
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
    }

    function closeCaptcha() {
        captchaOverlay.style.display = 'none';
        pendingAction = null;
        pendingData = null;
        captchaAnswer.classList.remove('error');
    }

    function shakeModal() {
        captchaModal.classList.add('shake-modal');
        setTimeout(() => {
            captchaModal.classList.remove('shake-modal');
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
        if (pendingAction) {
            pendingAction(pendingData);
        }
        closeCaptcha();
    });

    captchaCancel.addEventListener('click', closeCaptcha);
    captchaOverlay.addEventListener('click', (e) => {
        if (e.target === captchaOverlay) closeCaptcha();
    });

    // === Отправка сообщения (гостевая книга) ===
    async function performSendGuestbook(data) {
        const { name, message } = data;
        const { error } = await supabaseClient.from('guestbook').insert([{ name, message }]);
        if (error) {
            console.error('Error sending message:', error);
            triggerErrorEffect();
        } else {
            gbName.value = '';
            gbMessage.value = '';
            loadGuestbook();
        }
    }

    gbSend.addEventListener('click', (e) => {
        e.preventDefault();
        const name = gbName.value.trim();
        const message = gbMessage.value.trim();
        if (!name || !message) {
            triggerErrorEffect();
            return;
        }
        openCaptcha(performSendGuestbook, { name, message });
    });

    // === Проекты (с ссылками) ===
    async function loadProjects() {
        const container = document.getElementById('projects-container');
        const fallbackProjects = [
        ];

        let projects = [];
        try {
            const response = await fetch('projects.json');
            if (response.ok) {
                projects = await response.json();
            } else {
                projects = fallbackProjects;
            }
        } catch (e) {
            projects = fallbackProjects;
        }

        if (projects.length === 0) {
            container.innerHTML = '<p style="color: red; text-align: center;">No projects available.</p>';
        } else {
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
    }

    // === Друзья ===
    async function loadFriends() {
        const container = document.getElementById('friends-container');
        const fallbackFriends = [];

        let friends = [];
        try {
            const response = await fetch('friends.json');
            if (response.ok) {
                friends = await response.json();
            } else {
                friends = fallbackFriends;
            }
        } catch (e) {
            friends = fallbackFriends;
        }

        if (friends.length === 0) {
            container.innerHTML = '<p style="color: red; text-align: center;">No friends available.</p>';
        } else {
            container.innerHTML = '<ul style="list-style: none; padding: 0;">' + 
                friends.map(f => `<li style="margin-bottom: 8px;">👤 <strong>${escapeHtml(f.name)}</strong> — ICQ: ${escapeHtml(f.icq)}</li>`).join('') +
                '</ul>';
        }
    }

    loadProjects();
    loadFriends();

    // === Paint с увеличенным холстом и Undo ===
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

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, mainCanvas.width, mainCanvas.height);

    let drawing = false;
    let lastX = 0, lastY = 0;

    const colors = [
        { name: 'black', hex: '#000000' },
        { name: 'dark red', hex: '#800000' },
        { name: 'dark green', hex: '#008000' },
        { name: 'olive', hex: '#808000' },
        { name: 'dark blue', hex: '#000080' },
        { name: 'purple', hex: '#800080' },
        { name: 'teal', hex: '#008080' },
        { name: 'light gray', hex: '#c0c0c0' },
        { name: 'dark gray', hex: '#808080' },
        { name: 'red', hex: '#ff0000' },
        { name: 'lime', hex: '#00ff00' },
        { name: 'yellow', hex: '#ffff00' },
        { name: 'blue', hex: '#0000ff' },
        { name: 'magenta', hex: '#ff00ff' },
        { name: 'cyan', hex: '#00ffff' },
        { name: 'white', hex: '#ffffff' }
    ];

    // ===== ИСТОРИЯ (UNDO) =====
    let history = [];
    const MAX_HISTORY = 20;

    function pushHistory() {
        const imageData = ctx.getImageData(0, 0, mainCanvas.width, mainCanvas.height);
        history.push(imageData);
        if (history.length > MAX_HISTORY) history.shift();
    }

    function undo() {
        if (history.length <= 1) return;
        history.pop(); // убираем текущее состояние
        const prev = history[history.length - 1];
        ctx.putImageData(prev, 0, 0);
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        drawing = false;
    }

    undoBtn.addEventListener('click', undo);

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.code === 'KeyZ') {
            const active = document.activeElement;
            if (!(active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)) {
                e.preventDefault();
                undo();
            }
        }
    });

    pushHistory();

    // ===== ПАЛИТРА =====
    function createPalette() {
        colorPalette.innerHTML = '';
        colors.forEach((c, index) => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = c.hex;
            swatch.dataset.color = c.hex;
            swatch.dataset.name = c.name;
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
        if (currentTool === 'brush') {
            toolBrush.classList.add('active');
            toolEraser.classList.remove('active');
        } else {
            toolBrush.classList.remove('active');
            toolEraser.classList.add('active');
        }
    }

    function updateColorUI(colorHex) {
        document.querySelectorAll('.color-swatch').forEach(swatch => {
            if (swatch.dataset.color === colorHex) {
                swatch.classList.add('active');
            } else {
                swatch.classList.remove('active');
            }
        });
    }

    toolBrush.addEventListener('click', () => {
        currentTool = 'brush';
        updateToolUI();
    });
    toolEraser.addEventListener('click', () => {
        currentTool = 'eraser';
        updateToolUI();
    });

    brushSizeSlider.addEventListener('input', (e) => {
        brushSize = parseInt(e.target.value);
        brushSizeValue.textContent = brushSize;
        if (mouseOverCanvas && !drawing) {
            drawPreview(lastKnownX, lastKnownY);
        }
    });

    createPalette();

    pickColorBtn.addEventListener('click', () => {
        colorPicker.click();
    });
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
            alert('Invalid hex format. Use #RRGGBB');
        }
    });

    currentColorIndicator.style.backgroundColor = currentColor;
    updateSlidersFromColor(currentColor);

    // === Предпросмотр ===
    let mouseOverCanvas = false;
    let lastKnownX = 0, lastKnownY = 0;

    function getMousePos(e, canvas) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        return {
            x: Math.max(0, Math.min(canvas.width, x)),
            y: Math.max(0, Math.min(canvas.height, y))
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
        drawing = true;
        const pos = getMousePos(e, mainCanvas);
        lastX = pos.x;
        lastY = pos.y;
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    }

    function draw(e) {
        e.preventDefault();
        const pos = getMousePos(e, mainCanvas);
        lastKnownX = pos.x;
        lastKnownY = pos.y;
        if (drawing) {
            if (currentTool === 'brush') {
                ctx.strokeStyle = currentColor;
            } else {
                ctx.strokeStyle = 'white';
            }
            ctx.lineWidth = brushSize;
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            lastX = pos.x;
            lastY = pos.y;
        } else {
            drawPreview(pos.x, pos.y);
        }
    }

    function stopDrawing(e) {
        e.preventDefault();
        if (drawing) {
            drawing = false;
            pushHistory();
        }
        if (mouseOverCanvas) {
            drawPreview(lastKnownX, lastKnownY);
        }
    }

    function handleMouseEnter() {
        mouseOverCanvas = true;
        drawPreview(lastKnownX, lastKnownY);
    }

    function handleMouseLeave() {
        mouseOverCanvas = false;
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    }

    mainCanvas.addEventListener('mousedown', startDrawing);
    mainCanvas.addEventListener('mousemove', draw);
    mainCanvas.addEventListener('mouseup', stopDrawing);
    mainCanvas.addEventListener('mouseleave', handleMouseLeave);
    mainCanvas.addEventListener('mouseenter', handleMouseEnter);
    
    mainCanvas.addEventListener('touchstart', startDrawing, { passive: false });
    mainCanvas.addEventListener('touchmove', draw, { passive: false });
    mainCanvas.addEventListener('touchend', stopDrawing);
    mainCanvas.addEventListener('touchcancel', stopDrawing);

    clearBtn.addEventListener('click', () => {
        ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, mainCanvas.width, mainCanvas.height);
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        pushHistory();
    });

    function isCanvasBlank() {
        const imageData = ctx.getImageData(0, 0, mainCanvas.width, mainCanvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            if (data[i] !== 255 || data[i+1] !== 255 || data[i+2] !== 255 || data[i+3] !== 255) {
                return false;
            }
        }
        return true;
    }

    async function performSavePainting(imageData) {
        const { error } = await supabaseClient
            .from('paintings')
            .insert([{ image_data: imageData }]);
        if (error) {
            console.error('Error saving painting:', error);
            triggerErrorEffect();
        } else {
            playChimesSound();
            loadPaintings();
        }
    }

    saveBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (isCanvasBlank()) {
            triggerErrorEffect();
            return;
        }
        const imageData = mainCanvas.toDataURL();
        openCaptcha(performSavePainting, imageData);
    });

    // === Модальное окно для просмотра рисунков ===
    const imageModal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const closeImageModal = document.getElementById('closeImageModal');

    function openImageModal(src) {
        modalImage.src = src;
        imageModal.style.display = 'flex';
    }

    function closeImageModalFunc() {
        imageModal.style.display = 'none';
        modalImage.src = '';
    }

    closeImageModal.addEventListener('click', closeImageModalFunc);
    imageModal.addEventListener('click', (e) => {
        if (e.target === imageModal) closeImageModalFunc();
    });

    async function loadPaintings() {
        const { data, error } = await supabaseClient
            .from('paintings')
            .select('image_data, created_at')
            .order('created_at', { ascending: false })
            .limit(6);
        if (error) {
            console.error('Error loading paintings:', error);
            return;
        }
        gallery.innerHTML = '';
        data.forEach(p => {
            const imgDiv = document.createElement('div');
            imgDiv.style.border = '2px solid #808080';
            imgDiv.style.borderRightColor = '#ffffff';
            imgDiv.style.borderBottomColor = '#ffffff';
            imgDiv.style.padding = '4px';
            imgDiv.style.backgroundColor = '#d4d0c8';
            imgDiv.style.textAlign = 'center';
            imgDiv.style.cursor = 'pointer';
            imgDiv.innerHTML = `
                <img src="${p.image_data}" style="max-width: 100%; height: auto; border: 1px solid black;">
                <div style="font-size: 10px; margin-top: 4px;">${new Date(p.created_at).toLocaleString()}</div>
            `;
            imgDiv.addEventListener('click', () => {
                openImageModal(p.image_data);
            });
            gallery.appendChild(imgDiv);
        });
    }

    loadPaintings();

    // === Навигация по меню ===
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

    // === Запуск загрузки гостевой книги ===
    loadGuestbook();

    supabaseClient
        .channel('guestbook_changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'guestbook' }, () => loadGuestbook())
        .subscribe();
})();