// clippy.js — с правильными путями (без ведущих слешей)

(function() {
    // ===== НАСТРОЙКИ =====
    const BLINK_FRAME_INTERVAL = 100;
    const TALK_FRAME_INTERVAL = 150;
    const TALK_FRAMES_COUNT = 36;
    const MESSAGE_DURATION = TALK_FRAMES_COUNT * TALK_FRAME_INTERVAL; // 5400 мс
    const BLINK_INTERVAL_MIN = 3000;
    const BLINK_INTERVAL_MAX = 7000;

    // ===== КАДРЫ АНИМАЦИЙ =====
    const frames = {
        idle: 'materialsl/clippy/idle/frame1.png',
        blink: [
            'materialsl/clippy/blink/frame01.png',
            'materialsl/clippy/blink/frame02.png'
        ],
        talk1: []
    };

    for (let i = 3; i <= TALK_FRAMES_COUNT; i++) {
        const num = i.toString().padStart(2, '0');
        frames.talk1.push(`materialsl/clippy/talk1/frame${num}.png`);
    }

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

    const clippyContainer = document.getElementById('clippyContainer');
    const clippyMessage = document.getElementById('clippyMessage');
    const clippyImage = document.getElementById('clippyImage');

    if (!clippyContainer || !clippyMessage || !clippyImage) {
        console.warn('Clippy elements not found');
        return;
    }

    let currentState = 'idle';
    let currentTalkAnim = 'talk1';
    let animationInterval = null;
    let hideTimeout = null;
    let messageTimeout = null;
    let blinkTimeout = null;
    let currentFrame = 0;

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
                clearInterval(animationInterval);
                animationInterval = null;
                // остаёмся на последнем кадре
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

    function showClippyMessage(message) {
        clippyMessage.textContent = message;
        clippyContainer.classList.add('show');

        if (blinkTimeout) clearTimeout(blinkTimeout);
        playTalkAnimation();

        if (hideTimeout) clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
            clippyContainer.classList.remove('show');
            setIdle();
        }, MESSAGE_DURATION);
    }

    function randomMessage() {
        return messages[Math.floor(Math.random() * messages.length)];
    }

    function scheduleMessage() {
        const delay = Math.random() * 15000 + 15000;
        messageTimeout = setTimeout(() => {
            showClippyMessage(randomMessage());
            scheduleMessage();
        }, delay);
    }

    clippyImage.addEventListener('click', () => {
        showClippyMessage(randomMessage());
        if (messageTimeout) clearTimeout(messageTimeout);
        scheduleMessage();
    });

    clippyContainer.style.display = 'flex';
    setIdle();
    scheduleMessage();
})();