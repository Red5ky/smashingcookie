console.log('🎮 Game starting with embedded sounds...');

// ===== WEB AUDIO SETUP =====
let audioContext = null;
let soundEnabled = true;
let useFlatNumbers = true; // Default to flat numbers

function initAudio() {
    if (audioContext) return;
    
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('🔊 Audio context initialized');
    } catch (e) {
        console.log('🔇 Audio not supported:', e);
    }
}

function playTone(frequency, duration, type = 'sine', volume = 0.1, decay = 0.1) {
    if (!soundEnabled || !audioContext) return;
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        gainNode.gain.value = volume;
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Add decay for natural sound
        gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + decay);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
        console.log('🔇 Sound error:', e);
    }
}

function playSound(name) {
    if (!soundEnabled) return;
    
    // Initialize audio on first user interaction
    if (!audioContext) initAudio();
    
    switch(name) {
        case 'click':
            // Crunchy bite sound
            playTone(600, 0.05, 'sine', 0.15, 0.08);
            setTimeout(() => playTone(300, 0.03, 'triangle', 0.1, 0.05), 30);
            break;
        case 'buy':
            // Positive coin sound
            playTone(800, 0.04, 'sine', 0.2, 0.05);
            setTimeout(() => playTone(1200, 0.04, 'sine', 0.15, 0.05), 50);
            break;
        case 'prestige':
            // Magical sparkle (arpeggio)
            [600, 800, 1000, 1200, 1400].forEach((freq, i) => {
                setTimeout(() => playTone(freq, 0.06, 'sine', 0.12, 0.1), i * 80);
            });
            break;
        case 'error':
            // Soft buzz
            playTone(200, 0.15, 'square', 0.1, 0.2);
            break;
    }
}

// ===== GAME STATE =====
let cookies = 0;
let cookiesRaw = 0;
let cookiesPerSecond = 0;
let prestigeMultiplier = 1;
let lastUpdate = Date.now();
const upgrades = {
    cursor: { level: 0, baseCost: 10, cps: 0.1 },
    grandma: { level: 0, baseCost: 100, cps: 1 },
    farm: { level: 0, baseCost: 1100, cps: 8 },
    mine: { level: 0, baseCost: 12000, cps: 47 },
    factory: { level: 0, baseCost: 130000, cps: 260 },
    bank: { level: 0, baseCost: 1400000, cps: 1400 },
    temple: { level: 0, baseCost: 20000000, cps: 7800 },
    wizard: { level: 0, baseCost: 330000000, cps: 44000 }
};

const upgradeNames = {
    cursor: "Cursor", grandma: "Grandma", farm: "Farm", mine: "Mine",
    factory: "Factory", bank: "Bank", temple: "Temple", wizard: "Wizard"
};

const upgradeDescs = {
    cursor: "Auto-clicks every 10 seconds", grandma: "Bakes cookies", farm: "Grows cookie plants",
    mine: "Mines cookie ores", factory: "Mass-produces cookies", bank: "Generates interest",
    temple: "Worship the cookie god", wizard: "Summons cookies with magic"
};

const upgradeIcons = {
    cursor: "👆", grandma: "👵", farm: "🌱", mine: "⛏️",
    factory: "🏭", bank: "🏦", temple: "⛩️", wizard: "🧙"
};

// ===== CORE FUNCTIONS =====
function getCost(type) {
    return Math.floor(upgrades[type].baseCost * Math.pow(1.15, upgrades[type].level));
}

function calcCPS() {
    let total = 0;
    for (const type in upgrades) {
        total += upgrades[type].cps * upgrades[type].level;
    }
    return total * prestigeMultiplier;
}

function addCookies(amount) {
    cookiesRaw += amount;
    const wholeCookies = Math.floor(cookiesRaw);
    
    if (wholeCookies > cookies) {
        cookies = wholeCookies;
        updateCookieCounter();
        updateUpgradeAffordability();
    }
}

function clickCookie() {
    playSound('click');
    
    cookiesRaw += 1 * prestigeMultiplier;
    cookies = Math.floor(cookiesRaw);
    updateCookieCounter();
    updateUpgradeAffordability();
    
    const container = document.getElementById('floating-cookies');
    if (container) {
        const el = document.createElement('div');
        el.className = 'floating-cookie';
        el.innerHTML = `<i class="fas fa-cookie"></i> +${Math.floor(1 * prestigeMultiplier)}`;
        el.style.left = `${Math.random() * 60 + 20}%`;
        el.style.bottom = '20%';
        container.appendChild(el);
        setTimeout(() => el.remove(), 1500);
    }
}

// ===== UPGRADE SYSTEM WITH VISUAL EFFECTS =====
function buyUpgrade(type) {
    const cost = getCost(type);
    
    if (cookies >= cost) {
        playSound('buy');
        
        cookies -= cost;
        cookiesRaw -= cost;
        upgrades[type].level++;
        cookiesPerSecond = calcCPS();
        
        rebuildFullUI();
        saveGame();
        
        // SHOW VISUAL EFFECT!
        showUpgradeEffect(type);
        
        showNotification(`✅ +${upgradeNames[type]} (Lv${upgrades[type].level})`);
    } else {
        playSound('error');
        showNotification(`❌ Need ${formatNum(cost)} cookies (have ${cookies})`);
    }
}

// SHOW FINGERS/GRANDMAS IN CONCENTRIC CIRCLES WITH ROTATION
function showUpgradeEffect(type) {
    const container = document.querySelector('.cookie-container');
    if (!container) return;
    
    const icon = upgradeIcons[type] || '⭐';
    
    // Map upgrade types to layers
    const layerMap = {
        cursor: 1,
        grandma: 2,
        farm: 3,
        mine: 4,
        factory: 5,
        bank: 6,
        temple: 7,
        wizard: 8
    };
    
    const layerNum = layerMap[type];
    if (!layerNum) return;
    
    // Get or create rotation layer
    let layer = document.querySelector(`.layer-${layerNum}`);
    if (!layer) {
        layer = document.createElement('div');
        layer.className = `rotation-layer layer-${layerNum}`;
        container.appendChild(layer);
    }
    
    // Clear old indicators for this upgrade type on this layer
    layer.querySelectorAll(`.upgrade-indicator.${type}`).forEach(el => el.remove());
    
    // Create new indicators positioned evenly around the circle
    const count = upgrades[type].level;
    const maxVisible = Math.min(count, 12); // Show max 12 per layer
    
    for (let i = 0; i < maxVisible; i++) {
        const indicator = document.createElement('div');
        indicator.className = `upgrade-indicator ${type}`;
        indicator.innerHTML = icon;
        indicator.title = `${upgradeNames[type]} Lv${upgrades[type].level}`;
        
        // Position evenly around circle
        const angle = (i / maxVisible) * Math.PI * 2;
        const radius = 40 + (layerNum * 15); // Each layer is 15px further out
        const x = Math.cos(angle) * radius + 100; // 100 = center
        const y = Math.sin(angle) * radius + 100;
        
        indicator.style.left = `${x - 15}px`; // Center the emoji
        indicator.style.top = `${y - 15}px`;
        
        layer.appendChild(indicator);
    }
}

// ===== DISPLAY =====
function updateCookieCounter() {
    const cookieCountEl = document.getElementById('cookie-count');
    const cpsEl = document.getElementById('cps');
    const prestigeBtn = document.getElementById('prestige-btn');
    
    if (cookieCountEl) cookieCountEl.textContent = formatNum(cookies);
    if (cpsEl) cpsEl.textContent = formatNum(cookiesPerSecond);
    
    if (prestigeBtn) {
        const mult = Math.floor(Math.sqrt(cookies / 1000000));
        prestigeBtn.innerHTML = `<i class="fas fa-star"></i> Prestige (${mult}x)`;
        prestigeBtn.disabled = cookies < 1000000;
    }
}

function updateUpgradeAffordability() {
    const list = document.getElementById('upgrades-list');
    if (!list) return;
    
    const items = list.querySelectorAll('.upgrade-item');
    items.forEach(item => {
        const type = item.getAttribute('data-upgrade');
        if (!type) return;
        
        const cost = getCost(type);
        const affordable = cookies >= cost;
        
        item.classList.remove('affordable', 'clickable', 'disabled');
        if (affordable) {
            item.classList.add('affordable', 'clickable');
        } else {
            item.classList.add('disabled');
        }
        
        const costEl = item.querySelector('.upgrade-cost');
        if (costEl) {
            costEl.innerHTML = `<i class="fas fa-cookie-bite"></i> ${formatNum(cost)}`;
        }
        
        const cpsEl = item.querySelector('.upgrade-cps');
        if (cpsEl) {
            cpsEl.innerHTML = `<i class="fas fa-bolt"></i> ${formatNum(upgrades[type].cps * prestigeMultiplier)} CPS`;
        }
    });
}

function rebuildFullUI() {
    updateCookieCounter();
    
    const list = document.getElementById('upgrades-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    for (const type in upgrades) {
        const cost = getCost(type);
        const affordable = cookies >= cost;
        
        const item = document.createElement('div');
        item.className = affordable ? 'upgrade-item affordable clickable' : 'upgrade-item disabled';
        item.setAttribute('data-upgrade', type);
        
        // Add icon to upgrade name
        const icon = upgradeIcons[type] || '';
        
        item.innerHTML = `
            <div class="upgrade-header">
                <div class="upgrade-name">
                    <span>${icon}</span> ${upgradeNames[type]}
                </div>
                <div class="upgrade-level">Lv ${upgrades[type].level}</div>
            </div>
            <div class="upgrade-desc">${upgradeDescs[type]}</div>
            <div class="upgrade-stats">
                <div class="upgrade-cps"><i class="fas fa-bolt"></i> ${formatNum(upgrades[type].cps * prestigeMultiplier)} CPS</div>
                <div class="upgrade-cost"><i class="fas fa-cookie-bite"></i> ${formatNum(cost)}</div>
            </div>
        `;
        
        list.appendChild(item);
    }
    
    // Rebuild ALL visual effects (all layers)
    document.querySelectorAll('.rotation-layer').forEach(el => el.remove());
    
    for (const type in upgrades) {
        if (upgrades[type].level > 0) {
            showUpgradeEffect(type);
        }
    }
}

// ===== NUMBER FORMATTING WITH TOGGLE =====
function formatNum(num) {
    if (useFlatNumbers) {
        // Flat numbers with commas (e.g., 1,500,000)
        return Math.floor(num).toLocaleString('en-US');
    } else {
        // Abbreviated numbers (e.g., 1.5M)
        if (num >= 1e12) return (num / 1e12).toFixed(1) + 'T';
        if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
        return Math.floor(num).toString();
    }
}

// ===== TOGGLE NUMBER FORMAT =====
function toggleNumberFormat() {
    useFlatNumbers = !useFlatNumbers;
    const btn = document.getElementById('number-toggle');
    
    if (useFlatNumbers) {
        btn.innerHTML = '<i class="fas fa-list"></i>';
        btn.classList.add('flat');
        showNotification('🔢 Flat numbers enabled');
    } else {
        btn.innerHTML = '<i class="fas fa-compress-alt"></i>';
        btn.classList.remove('flat');
        showNotification('🔢 Abbreviated numbers enabled');
    }
    
    updateCookieCounter();
    saveGame();
}

// ===== SAVE/LOAD =====
function saveGame() {
    try {
        localStorage.setItem('idleGameSave', JSON.stringify({
            cookies, cookiesRaw, cookiesPerSecond, prestigeMultiplier, 
            upgrades, soundEnabled, useFlatNumbers, timestamp: Date.now()
        }));
        showStatus('✅ Saved');
    } catch(e) {}
}

function loadGame() {
    try {
        const data = localStorage.getItem('idleGameSave');
        if (data) {
            const s = JSON.parse(data);
            cookies = Math.floor(s.cookies) || 0;
            cookiesRaw = s.cookiesRaw || s.cookies || 0;
            cookiesPerSecond = s.cookiesPerSecond || 0;
            prestigeMultiplier = s.prestigeMultiplier || 1;
            soundEnabled = s.soundEnabled !== false; // Default true
            useFlatNumbers = s.useFlatNumbers !== false; // Default true
            updateSoundButton();
            updateNumberToggleButton();
            
            if (s.upgrades) {
                for (const t in s.upgrades) {
                    if (upgrades[t]) {
                        upgrades[t].level = s.upgrades[t].level || 0;
                    }
                }
            }
            lastUpdate = Date.now();
            rebuildFullUI();
        } else {
            rebuildFullUI();
        }
    } catch(e) {}
}

function showStatus(msg) {
    const el = document.getElementById('save-status');
    if (el) {
        el.textContent = msg;
        setTimeout(() => { if(el.textContent === msg) el.textContent = ''; }, 2000);
    }
}

function showNotification(msg) {
    const el = document.getElementById('save-status');
    if (el) {
        el.textContent = msg;
        el.style.color = '#ffd700';
        setTimeout(() => { if(el.textContent === msg) el.textContent = ''; }, 3000);
    }
}

// ===== TOGGLE SOUND =====
function toggleSound() {
    soundEnabled = !soundEnabled;
    updateSoundButton();
    saveGame();
    
    if (soundEnabled && audioContext) {
        playSound('buy'); // Test sound on enable
    }
}

function updateSoundButton() {
    const btn = document.getElementById('sound-btn');
    if (!btn) return;
    
    if (soundEnabled) {
        btn.innerHTML = '<i class="fas fa-volume-up"></i>';
        btn.classList.remove('muted');
    } else {
        btn.innerHTML = '<i class="fas fa-volume-mute"></i>';
        btn.classList.add('muted');
    }
}

function updateNumberToggleButton() {
    const btn = document.getElementById('number-toggle');
    if (!btn) return;
    
    if (useFlatNumbers) {
        btn.innerHTML = '<i class="fas fa-list"></i>';
        btn.classList.add('flat');
    } else {
        btn.innerHTML = '<i class="fas fa-compress-alt"></i>';
        btn.classList.remove('flat');
    }
}

// ===== GAME LOOP =====
function gameLoop() {
    const now = Date.now();
    const delta = (now - lastUpdate) / 1000;
    lastUpdate = now;
    
    if (cookiesPerSecond > 0) {
        addCookies(cookiesPerSecond * delta);
    }
    
    requestAnimationFrame(gameLoop);
}

// ===== PRESTIGE =====
function triggerPrestige() {
    if (cookies >= 1000000) {
        playSound('prestige');
        
        const mult = Math.floor(Math.sqrt(cookies / 1000000));
        prestigeMultiplier = 1 + mult * 0.1;
        cookies = 0;
        cookiesRaw = 0;
        for (const t in upgrades) upgrades[t].level = 0;
        cookiesPerSecond = 0;
        rebuildFullUI();
        showNotification(`🌟 Prestige! +${mult * 10}% multiplier`);
    } else {
        playSound('error');
        showNotification(`❌ Need 1,000,000 cookies to prestige!`);
    }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    // Clean corrupted saves
    try {
        const data = localStorage.getItem('idleGameSave');
        if (data) {
            const s = JSON.parse(data);
            if (typeof s.cookies === 'number' && !Number.isInteger(s.cookies) && !s.cookiesRaw) {
                localStorage.removeItem('idleGameSave');
            }
        }
    } catch(e) {}
    
    const cookieArea = document.querySelector('.cookie-area');
    if (cookieArea) {
        cookieArea.addEventListener('click', () => {
            // First user interaction - initialize audio
            if (!audioContext) initAudio();
            clickCookie();
        });
    }
    
    document.getElementById('prestige-btn')?.addEventListener('click', triggerPrestige);
    
    document.getElementById('save-btn')?.addEventListener('click', saveGame);
    document.getElementById('load-btn')?.addEventListener('click', loadGame);
    
    // Sound toggle
    document.getElementById('sound-btn')?.addEventListener('click', toggleSound);
    
    // Number format toggle
    document.getElementById('number-toggle')?.addEventListener('click', toggleNumberFormat);
    
    const upgradesList = document.getElementById('upgrades-list');
    if (upgradesList) {
        upgradesList.addEventListener('click', function(e) {
            const item = e.target.closest('.upgrade-item');
            if (item && !item.classList.contains('disabled')) {
                const type = item.getAttribute('data-upgrade');
                if (type) buyUpgrade(type);
            }
        });
    }
    
    loadGame();
    lastUpdate = Date.now();
    gameLoop();
    setTimeout(() => showNotification('👆🔊 Click cookie to enable sounds!'), 1500);
});

setInterval(saveGame, 60000);