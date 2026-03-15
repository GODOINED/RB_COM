// clippy.js — анимированный помощник с 36-кадровым разговором (один раз) и 2-кадровым морганием

(function() {
    // ===== НАСТРОЙКИ =====
    const BLINK_FRAME_INTERVAL = 100;          // мс между кадрами моргания
    const TALK_FRAME_INTERVAL = 150;           // мс между кадрами разговора
    const TALK_FRAMES_COUNT = 36;               // количество кадров разговора
    const MESSAGE_DURATION = TALK_FRAMES_COUNT * TALK_FRAME_INTERVAL; // 5400 мс
    const BLINK_INTERVAL_MIN = 3000;            // мин. интервал между морганиями
    const BLINK_INTERVAL_MAX = 7000;            // макс. интервал

    // ===== КАДРЫ АНИМАЦИЙ =====
    const frames = {
        idle: 'materialsl/clippy/idle/frame1.png',
        blink: [
            'materialsl/clippy/blink/frame01.png',
            'materialsl/clippy/blink/frame02.png'
        ],
        talk1: []
    };

    // Генерация 36 кадров для talk1 (имена frame01.png ... frame36.png)
    for (let i = 3; i <= TALK_FRAMES_COUNT; i++) {
        const num = i.toString().padStart(2, '0');
        frames.talk1.push(`materialsl/clippy/talk1/frame${num}.png`);
    }

    // Массив доступных анимаций разговора
    const talkAnimations = ['talk1'];

    // ===== СООБЩЕНИЯ =====
    const messages = [
        "It looks like you're writing a guestbook entry. Need help?",
        "Did you know that Windows 95 is the best OS ever?",
        "Click the brush to start painting!",
        "You have 42 unread messages (just kidding).",
        "I see you're using the Paint program. Would you like me to show you how to draw a circle?",
        "Hello! I'm Clippy, your virtual assistant.",
        "Why did the scarecrow win an award? Because he was outstanding in his field!",
        "Want to save your drawing? Click the Save button!",
        "Psst... try Ctrl+Z to undo!",
        "Your profile looks great!",
        "Have you checked the Settings today?",
        "I'm not a real paperclip, but I try my best."
    ];

    // ===== ЭЛЕМЕНТЫ =====
    const clippyContainer = document.getElementById('clippyContainer');
    const clippyMessage = document.getElementById('clippyMessage');
    const clippyImage = document.getElementById('clippyImage');

    if (!clippyContainer || !clippyMessage || !clippyImage) {
        console.warn('Clippy elements not found');
        return;
    }

    // ===== СОСТОЯНИЕ =====
    let currentState = 'idle';
    let currentTalkAnim = 'talk1';
    let animationInterval = null;
    let hideTimeout = null;
    let messageTimeout = null;
    let blinkTimeout = null;
    let currentFrame = 0;

    // ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
    function stopAnimation() {
        if (animationInterval) {
            clearInterval(animationInterval);
            animationInterval = null;
        }
    }

    function setIdle() {
        stopAnimation();
        currentState = 'idle';
        clippyImage.src = frames.idle;
        scheduleBlink();
    }

    // Моргание (один раз)
    function playBlink() {
        stopAnimation();
        currentState = 'blink';
        currentFrame = 0;

        const step = () => {
            if (currentFrame < frames.blink.length) {
                clippyImage.src = frames.blink[currentFrame];
                currentFrame++;
            } else {
                clearInterval(animationInterval);
                animationInterval = null;
                setIdle();
            }
        };

        step();
        animationInterval = setInterval(step, BLINK_FRAME_INTERVAL);
    }

    // Однократная анимация разговора (36 кадров)
    function playTalkAnimation() {
        stopAnimation();

        const randomIndex = Math.floor(Math.random() * talkAnimations.length);
        currentTalkAnim = talkAnimations[randomIndex];
        currentState = 'talk';
        currentFrame = 0;

        const talkFrames = frames[currentTalkAnim];
        if (!talkFrames || talkFrames.length === 0) {
            console.warn(`No frames for animation ${currentTalkAnim}`);
            setIdle();
            return;
        }

        const step = () => {
            if (currentFrame < talkFrames.length) {
                clippyImage.src = talkFrames[currentFrame];
                currentFrame++;
            } else {
                // Анимация закончилась – останавливаем интервал, остаёмся на последнем кадре
                clearInterval(animationInterval);
                animationInterval = null;
                console.log('Talk animation finished, staying on last frame.');
            }
        };

        step();
        animationInterval = setInterval(step, TALK_FRAME_INTERVAL);
    }

    function startBlink() {
        if (currentState === 'talk') return;
        if (blinkTimeout) clearTimeout(blinkTimeout);
        playBlink();
    }

    function scheduleBlink() {
        if (currentState === 'talk') return;
        if (blinkTimeout) clearTimeout(blinkTimeout);
        const delay = Math.random() * (BLINK_INTERVAL_MAX - BLINK_INTERVAL_MIN) + BLINK_INTERVAL_MIN;
        blinkTimeout = setTimeout(startBlink, delay);
    }

    // Показать сообщение и запустить однократную анимацию разговора
    function showClippyMessage(message) {
        clippyMessage.textContent = message;
        clippyContainer.classList.add('show'); // облачко

        if (blinkTimeout) clearTimeout(blinkTimeout);

        playTalkAnimation(); // запускаем однократную анимацию

        if (hideTimeout) clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
            clippyContainer.classList.remove('show'); // прячем облачко
            setIdle(); // после исчезновения облачка возвращаемся в idle
        }, MESSAGE_DURATION);
    }

    function randomMessage() {
        return messages[Math.floor(Math.random() * messages.length)];
    }

    // Планирование следующего сообщения
    function scheduleMessage() {
        const delay = Math.random() * 15000 + 15000; // 15–30 сек
        messageTimeout = setTimeout(() => {
            showClippyMessage(randomMessage());
            scheduleMessage(); // следующее
        }, delay);
    }

    // ===== ОБРАБОТЧИК КЛИКА =====
    clippyImage.addEventListener('click', () => {
        showClippyMessage(randomMessage());
        if (messageTimeout) clearTimeout(messageTimeout);
        scheduleMessage();
    });

    // ===== ИНИЦИАЛИЗАЦИЯ =====
    clippyContainer.style.display = 'flex';
    setIdle();
    scheduleMessage(); // первое сообщение через 15–30 сек
})();