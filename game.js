console.log('🎮 Game starting...');

// ===== GAME STATE =====
let cookies = 0;
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
    cookies += amount;
    updateDisplay();
}

function clickCookie() {
    addCookies(1 * prestigeMultiplier);
    
    // Floating cookie
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

// ===== UPGRADE SYSTEM =====
function buyUpgrade(type) {
    const cost = getCost(type);
    console.log(`🛒 Buy ${type}: cost=${cost}, have=${cookies}`);
    
    if (cookies >= cost) {
        cookies -= cost;
        upgrades[type].level++;
        cookiesPerSecond = calcCPS();
        console.log(`✅ SUCCESS! ${type} level=${upgrades[type].level}, cookies left=${cookies}`);
        
        // Force immediate UI update
        setTimeout(updateDisplay, 10);
        
        saveGame();
        showNotification(`✅ +${upgradeNames[type]} (Lv${upgrades[type].level})`);
    } else {
        console.log(`❌ Cannot afford ${type}`);
        showNotification(`❌ Need ${formatNum(cost)} cookies`);
    }
}

// ===== DISPLAY =====
function updateDisplay() {
    // Update cookie counter
    const cookieCountEl = document.getElementById('cookie-count');
    const cpsEl = document.getElementById('cps');
    if (cookieCountEl) cookieCountEl.textContent = formatNum(cookies);
    if (cpsEl) cpsEl.textContent = formatNum(cookiesPerSecond);
    
    console.log(`🔄 UI Update: cookies=${Math.floor(cookies)}, CPS=${cookiesPerSecond}`);
    
    // Prestige button
    const btn = document.getElementById('prestige-btn');
    const mult = Math.floor(Math.sqrt(cookies / 1000000));
    if (btn) {
        btn.innerHTML = `<i class="fas fa-star"></i> Prestige (${mult}x)`;
        btn.disabled = cookies < 1000000;
    }
    
    // Render upgrades - COMPLETELY REBUILD
    const list = document.getElementById('upgrades-list');
    if (!list) {
        console.error('❌ upgrades-list not found!');
        return;
    }
    
    // Clear and rebuild
    list.innerHTML = '';
    
    for (const type in upgrades) {
        const cost = getCost(type);
        const affordable = cookies >= cost;
        
        const item = document.createElement('div');
        item.className = 'upgrade-item' + (affordable ? ' affordable clickable' : ' disabled');
        item.setAttribute('data-upgrade', type);
        
        item.innerHTML = `
            <div class="upgrade-header">
                <div class="upgrade-name">${upgradeNames[type]}</div>
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
    
    console.log('✅ UI fully rebuilt');
}

function formatNum(num) {
    if (num >= 1e9) return (num/1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num/1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num/1e3).toFixed(1) + 'K';
    return Math.floor(num);
}

// ===== SAVE/LOAD =====
function saveGame() {
    try {
        localStorage.setItem('idleGameSave', JSON.stringify({
            cookies, cookiesPerSecond, prestigeMultiplier, upgrades, timestamp: Date.now()
        }));
        showStatus('✅ Saved');
    } catch(e) {
        console.error('Save failed:', e);
    }
}

function loadGame() {
    const data = localStorage.getItem('idleGameSave');
    if (data) {
        try {
            const s = JSON.parse(data);
            console.log('📥 Loading:', s);
            cookies = s.cookies || 0;
            cookiesPerSecond = s.cookiesPerSecond || 0;
            prestigeMultiplier = s.prestigeMultiplier || 1;
            if (s.upgrades) {
                for (const t in s.upgrades) {
                    if (upgrades[t]) {
                        upgrades[t].level = s.upgrades[t].level || 0;
                    }
                }
            }
            lastUpdate = Date.now();
            updateDisplay();
            showStatus('🎮 Loaded');
        } catch(e) { 
            console.error('Load error:', e);
        }
    }
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

// ===== GAME LOOP =====
function gameLoop() {
    const now = Date.now();
    const delta = (now - lastUpdate) / 1000;
    lastUpdate = now;
    if (cookiesPerSecond > 0) addCookies(cookiesPerSecond * delta);
    requestAnimationFrame(gameLoop);
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing...');
    
    // Cookie click
    const cookieArea = document.querySelector('.cookie-area');
    if (cookieArea) {
        cookieArea.addEventListener('click', clickCookie);
        console.log('✅ Cookie handler ready');
    }
    
    // Prestige
    document.getElementById('prestige-btn')?.addEventListener('click', () => {
        if (cookies >= 1000000) {
            const mult = Math.floor(Math.sqrt(cookies / 1000000));
            prestigeMultiplier = 1 + mult * 0.1;
            cookies = 0;
            for (const t in upgrades) upgrades[t].level = 0;
            cookiesPerSecond = 0;
            updateDisplay();
            showNotification(`🌟 Prestige! +${mult * 10}% multiplier`);
        }
    });
    
    // Save/Load
    document.getElementById('save-btn')?.addEventListener('click', saveGame);
    document.getElementById('load-btn')?.addEventListener('click', loadGame);
    
    // Event delegation for upgrades
    const upgradesList = document.getElementById('upgrades-list');
    if (upgradesList) {
        upgradesList.addEventListener('click', function(e) {
            const item = e.target.closest('.upgrade-item');
            if (item && !item.classList.contains('disabled')) {
                const type = item.getAttribute('data-upgrade');
                if (type) {
                    console.log('🖱️ Click:', type);
                    buyUpgrade(type);
                }
            }
        });
        console.log('✅ Upgrade handler ready');
    }
    
    // Start
    loadGame();
    lastUpdate = Date.now();
    gameLoop();
    setTimeout(() => showNotification('🍪 Click cookie → Buy upgrades!'), 800);
    
    console.log('✅ Game ready!');
});

setInterval(saveGame, 60000);