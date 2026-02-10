// ==================== GAME STATE ====================
const game = {
    cookies: 0,
    cookiesPerClick: 1,
    cookiesPerSecond: 0,
    prestigeMultiplier: 1,
    lastUpdate: Date.now(),
    upgrades: {
        cursor: { level: 0, baseCost: 15, cps: 0.1, owned: 0 },
        grandma: { level: 0, baseCost: 100, cps: 1, owned: 0 },
        farm: { level: 0, baseCost: 1100, cps: 8, owned: 0 },
        mine: { level: 0, baseCost: 12000, cps: 47, owned: 0 },
        factory: { level: 0, baseCost: 130000, cps: 260, owned: 0 },
        bank: { level: 0, baseCost: 1400000, cps: 1400, owned: 0 },
        temple: { level: 0, baseCost: 20000000, cps: 7800, owned: 0 },
        wizard: { level: 0, baseCost: 330000000, cps: 44000, owned: 0 }
    }
};

// ==================== UPGRADE DEFINITIONS ====================
const upgradeDefs = {
    cursor: { name: "Cursor", desc: "Automatically clicks once every 10 seconds", icon: "mouse-pointer" },
    grandma: { name: "Grandma", desc: "A nice grandma to bake cookies for you", icon: "user-friends" },
    farm: { name: "Cookie Farm", desc: "Grows cookie plants from cookie seeds", icon: "seedling" },
    mine: { name: "Cookie Mine", desc: "Mines out cookie ores from the ground", icon: "mountain" },
    factory: { name: "Cookie Factory", desc: "Produces large quantities of cookies", icon: "industry" },
    bank: { name: "Bank", desc: "Generates cookies from interest", icon: "building-columns" },
    temple: { name: "Temple", desc: "Worship the great cookie god", icon: "place-of-worship" },
    wizard: { name: "Wizard Tower", desc: "Summons cookies with magic", icon: "hat-wizard" }
};

// ==================== CORE FUNCTIONS ====================

// Calculate cost of next upgrade (exponential scaling)
function getUpgradeCost(upgrade) {
    const baseCost = game.upgrades[upgrade].baseCost;
    const level = game.upgrades[upgrade].level;
    return Math.floor(baseCost * Math.pow(1.15, level));
}

// Calculate total CPS
function calculateCPS() {
    let total = 0;
    for (const upgrade in game.upgrades) {
        total += game.upgrades[upgrade].cps * game.upgrades[upgrade].owned;
    }
    return total * game.prestigeMultiplier;
}

// Add cookies to counter
function addCookies(amount) {
    game.cookies += amount;
    updateDisplay();
}

// Click cookie
function clickCookie() {
    const cookiesEarned = game.cookiesPerClick * game.prestigeMultiplier;
    addCookies(cookiesEarned);
    
    // Create floating cookie animation
    createFloatingCookie(cookiesEarned);
}

// Create floating cookie animation
function createFloatingCookie(amount) {
    const container = document.getElementById('floating-cookies');
    const cookie = document.createElement('div');
    cookie.className = 'floating-cookie';
    cookie.innerHTML = `<i class="fas fa-cookie"></i> +${formatNumber(amount)}`;
    cookie.style.left = `${Math.random() * 60 + 20}%`;
    container.appendChild(cookie);
    
    // Remove after animation
    setTimeout(() => {
        cookie.remove();
    }, 1500);
}

// Buy upgrade
function buyUpgrade(upgradeType) {
    const cost = getUpgradeCost(upgradeType);
    
    if (game.cookies >= cost) {
        game.cookies -= cost;
        game.upgrades[upgradeType].level++;
        game.upgrades[upgradeType].owned++;
        game.cookiesPerSecond = calculateCPS();
        updateDisplay();
        saveGame();
    }
}

// Prestige system
function prestige() {
    if (game.cookies >= 1000000) {
        const multiplier = Math.floor(Math.sqrt(game.cookies / 1000000));
        game.prestigeMultiplier = 1 + (multiplier * 0.1);
        resetGame();
        showNotification(`Prestige successful! +${(multiplier * 10)}% CPS multiplier!`);
    }
}

// Reset game for prestige
function resetGame() {
    game.cookies = 0;
    game.cookiesPerClick = 1;
    game.cookiesPerSecond = 0;
    
    for (const upgrade in game.upgrades) {
        game.upgrades[upgrade].level = 0;
        game.upgrades[upgrade].owned = 0;
    }
    
    updateDisplay();
}

// ==================== DISPLAY FUNCTIONS ====================

function updateDisplay() {
    // Update cookie count
    document.getElementById('cookie-count').textContent = formatNumber(game.cookies);
    
    // Update CPS
    document.getElementById('cps').textContent = formatNumber(game.cookiesPerSecond);
    
    // Update prestige button
    const prestigeBtn = document.getElementById('prestige-btn');
    const prestigeMult = Math.floor(Math.sqrt(game.cookies / 1000000));
    prestigeBtn.innerHTML = `<i class="fas fa-star"></i> Prestige (${prestigeMult}x)`;
    prestigeBtn.disabled = game.cookies < 1000000;
    
    // Update upgrades list
    updateUpgradesList();
}

function updateUpgradesList() {
    const list = document.getElementById('upgrades-list');
    list.innerHTML = '';
    
    for (const upgradeType in game.upgrades) {
        const upgrade = game.upgrades[upgradeType];
        const cost = getUpgradeCost(upgradeType);
        const canAfford = game.cookies >= cost;
        const def = upgradeDefs[upgradeType];
        
        const item = document.createElement('div');
        item.className = 'upgrade-item';
        if (!canAfford) item.classList.add('disabled');
        
        item.innerHTML = `
            <div class="upgrade-header">
                <div class="upgrade-name">
                    <i class="fas fa-${def.icon}"></i> ${def.name}
                </div>
                <div class="upgrade-level">Level ${upgrade.level}</div>
            </div>
            <div class="upgrade-desc">${def.desc}</div>
            <div class="upgrade-stats">
                <div class="upgrade-cps">
                    <i class="fas fa-bolt"></i> ${formatNumber(upgrade.cps * game.prestigeMultiplier)} CPS
                </div>
                <div class="upgrade-cost">
                    <i class="fas fa-cookie-bite"></i> ${formatNumber(cost)}
                </div>
            </div>
        `;
        
        if (canAfford) {
            item.onclick = () => buyUpgrade(upgradeType);
        }
        
        list.appendChild(item);
    }
}

// ==================== GAME LOOP ====================

function gameLoop() {
    const now = Date.now();
    const deltaTime = (now - game.lastUpdate) / 1000;
    game.lastUpdate = now;
    
    // Add cookies from CPS
    if (game.cookiesPerSecond > 0) {
        addCookies(game.cookiesPerSecond * deltaTime);
    }
    
    requestAnimationFrame(gameLoop);
}

// ==================== SAVE/LOAD SYSTEM ====================

function saveGame() {
    const saveData = {
        cookies: game.cookies,
        cookiesPerSecond: game.cookiesPerSecond,
        prestigeMultiplier: game.prestigeMultiplier,
        upgrades: game.upgrades,
        timestamp: Date.now()
    };
    
    localStorage.setItem('cookieClickerSave', JSON.stringify(saveData));
    showSaveStatus('Game saved! 🎮');
}

function loadGame() {
    const saveData = localStorage.getItem('cookieClickerSave');
    
    if (saveData) {
        try {
            const parsed = JSON.parse(saveData);
            game.cookies = parsed.cookies || 0;
            game.cookiesPerSecond = parsed.cookiesPerSecond || 0;
            game.prestigeMultiplier = parsed.prestigeMultiplier || 1;
            game.lastUpdate = Date.now();
            
            // Load upgrades
            if (parsed.upgrades) {
                for (const upgrade in parsed.upgrades) {
                    if (game.upgrades[upgrade]) {
                        game.upgrades[upgrade] = { ...parsed.upgrades[upgrade] };
                    }
                }
            }
            
            updateDisplay();
            showSaveStatus('Game loaded! 🎉');
        } catch (e) {
            console.error('Error loading save:', e);
            showSaveStatus('Load failed! ❌');
        }
    } else {
        showSaveStatus('No save found! ❌');
    }
}

function showSaveStatus(message) {
    const status = document.getElementById('save-status');
    status.textContent = message;
    setTimeout(() => {
        status.textContent = '';
    }, 3000);
}

function showNotification(message) {
    const status = document.getElementById('save-status');
    status.textContent = message;
    status.style.color = '#ffd700';
    setTimeout(() => {
        status.textContent = '';
    }, 5000);
}

// ==================== UTILITY FUNCTIONS ====================

function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return Math.floor(num).toString();
}

// ==================== AUTO-SAVE ====================

setInterval(saveGame, 60000); // Auto-save every minute

// ==================== INITIALIZATION ====================

// Load game on startup
window.onload = function() {
    loadGame();
    game.lastUpdate = Date.now();
    gameLoop();
    
    // Show welcome message
    setTimeout(() => {
        showNotification('Welcome to Cookie Clicker! 🍪');
    }, 1000);
};

// Handle visibility change (pause when tab is hidden)
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        game.lastUpdate = Date.now(); // Reset timer when hidden
    } else {
        game.lastUpdate = Date.now(); // Reset when shown again
    }
});