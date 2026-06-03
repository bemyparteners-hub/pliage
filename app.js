// Architecture rapide : une partie CRM simple (navigation + filtres) et un module IdleGame
// autonome qui garde tout l'état du jeu, rend l'interface et persiste en localStorage.
const filterButtons = document.querySelectorAll(".filter");
const prospectRows = document.querySelectorAll("tbody tr[data-status]");
const navLinks = document.querySelectorAll(".nav-link");
const crmView = document.querySelector("#crm-view");
const adminView = document.querySelector("#admin-game");

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const selectedFilter = button.dataset.filter;

    filterButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");

    prospectRows.forEach((row) => {
      const shouldShow = selectedFilter === "all" || row.dataset.status === selectedFilter;
      row.classList.toggle("is-hidden", !shouldShow);
    });
  });
});

function showView(viewName) {
  const isAdmin = viewName === "admin";
  crmView.classList.toggle("active-view", !isAdmin);
  adminView.classList.toggle("active-view", isAdmin);
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.forEach((item) => item.classList.remove("active"));
    link.classList.add("active");
    showView(link.dataset.view);
  });
});

if (window.location.hash === "#admin-game") {
  document.querySelector(".admin-link")?.click();
}

const IdleGame = (() => {
  const SAVE_KEY = "pliage-admin-idle-save-v1";
  const TICK_MS = 1000;

  const elements = {
    coins: document.querySelector("#coins-value"),
    level: document.querySelector("#level-value"),
    perClick: document.querySelector("#per-click-value"),
    perSecond: document.querySelector("#per-second-value"),
    xpLabel: document.querySelector("#xp-label"),
    xpFill: document.querySelector("#xp-fill"),
    nextHint: document.querySelector("#next-hint"),
    upgradeHint: document.querySelector("#upgrade-hint"),
    bonusStatus: document.querySelector("#bonus-status"),
    shopList: document.querySelector("#shop-list"),
    missionList: document.querySelector("#mission-list"),
    chestCount: document.querySelector("#chest-count"),
    chestAnimation: document.querySelector("#chest-animation"),
    achievementList: document.querySelector("#achievement-list"),
    mainClick: document.querySelector("#main-click"),
    openChest: document.querySelector("#open-chest"),
    saveGame: document.querySelector("#save-game"),
    resetGame: document.querySelector("#reset-game"),
    toastStack: document.querySelector("#toast-stack"),
  };

  const upgradeDefinitions = [
    {
      id: "better_press",
      name: "Presse optimisée",
      description: "+1 pièce par clic. La première amélioration arrive vite.",
      baseCost: 15,
      growth: 1.38,
      coinPerClick: 1,
      xp: 8,
    },
    {
      id: "apprentice",
      name: "Apprenti plieur",
      description: "+1 pièce par seconde grâce à une production automatique.",
      baseCost: 35,
      growth: 1.42,
      coinPerSecond: 1,
      xp: 12,
    },
    {
      id: "cadence",
      name: "Cadence atelier",
      description: "+4 pièces par clic pour accélérer les séries.",
      baseCost: 110,
      growth: 1.48,
      coinPerClick: 4,
      xp: 22,
    },
    {
      id: "robot_cell",
      name: "Cellule robotisée",
      description: "+8 pièces par seconde. Un vrai cap de production.",
      baseCost: 420,
      growth: 1.55,
      coinPerSecond: 8,
      xp: 45,
    },
  ];

  const missionDefinitions = [
    { id: "coins_100", label: "Gagner 100 pièces", target: 100, metric: "totalCoins", reward: { coins: 40, xp: 20 } },
    { id: "upgrades_3", label: "Acheter 3 améliorations", target: 3, metric: "upgradesBought", reward: { coins: 65, xp: 25 } },
    { id: "level_5", label: "Atteindre le niveau 5", target: 5, metric: "level", reward: { coins: 120, xp: 35, chests: 1 } },
    { id: "clicks_50", label: "Cliquer 50 fois", target: 50, metric: "clicks", reward: { coins: 55, xp: 22 } },
    { id: "coins_500", label: "Gagner 500 pièces", target: 500, metric: "totalCoins", reward: { coins: 180, xp: 50, chests: 1 } },
    { id: "clicks_150", label: "Cliquer 150 fois", target: 150, metric: "clicks", reward: { coins: 220, xp: 60 } },
    { id: "level_10", label: "Atteindre le niveau 10", target: 10, metric: "level", reward: { coins: 500, xp: 120, chests: 2 } },
  ];

  const achievementDefinitions = [
    { id: "first_click", label: "Premier clic", description: "Produire votre première pièce.", test: (state) => state.clicks >= 1 },
    { id: "hundred_clicks", label: "100 clics", description: "Cliquer 100 fois sur la production.", test: (state) => state.clicks >= 100 },
    { id: "first_chest", label: "Premier coffre", description: "Ouvrir un coffre gratuit.", test: (state) => state.chestsOpened >= 1 },
    { id: "level_10", label: "Premier niveau 10", description: "Atteindre le niveau 10.", test: (state) => state.level >= 10 },
    { id: "rare_upgrade", label: "Amélioration rare", description: "Obtenir la première amélioration rare.", test: (state) => state.rareUpgrades >= 1 },
  ];

  const defaultState = {
    coins: 0,
    totalCoins: 0,
    xp: 0,
    level: 1,
    clicks: 0,
    upgradesBought: 0,
    chests: 0,
    chestsOpened: 0,
    rareUpgrades: 0,
    completedMissions: [],
    achievements: [],
    upgrades: {},
    bonus: null,
    lastSavedAt: Date.now(),
  };

  let state = loadGame();

  function cloneDefaultState() {
    return JSON.parse(JSON.stringify(defaultState));
  }

  function loadGame() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      return saved ? { ...cloneDefaultState(), ...saved } : cloneDefaultState();
    } catch {
      return cloneDefaultState();
    }
  }

  function saveGame(showMessage = false) {
    state.lastSavedAt = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    if (showMessage) showToast("Sauvegarde effectuée", "Votre atelier idle est enregistré localement.", "success");
  }

  function resetGame() {
    const confirmed = window.confirm("Réinitialiser toute la progression du jeu admin ?");
    if (!confirmed) return;

    state = cloneDefaultState();
    localStorage.removeItem(SAVE_KEY);
    render();
    showToast("Progression réinitialisée", "Vous repartez avec un atelier tout neuf.");
  }

  function xpForNextLevel() {
    return Math.round(35 * Math.pow(state.level, 1.35));
  }

  function getUpgradeCount(id) {
    return state.upgrades[id] || 0;
  }

  function getUpgradeCost(upgrade) {
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.growth, getUpgradeCount(upgrade.id)));
  }

  function getCoinsPerClick() {
    const base = 1 + upgradeDefinitions.reduce((sum, upgrade) => {
      return sum + (upgrade.coinPerClick || 0) * getUpgradeCount(upgrade.id);
    }, 0);
    return state.bonus?.type === "doubleCoins" && state.bonus.endsAt > Date.now() ? base * 2 : base;
  }

  function getCoinsPerSecond() {
    return upgradeDefinitions.reduce((sum, upgrade) => {
      return sum + (upgrade.coinPerSecond || 0) * getUpgradeCount(upgrade.id);
    }, 0);
  }

  function addCoins(amount) {
    const safeAmount = Math.max(0, Math.floor(amount));
    state.coins += safeAmount;
    state.totalCoins += safeAmount;
  }

  function addXp(amount) {
    state.xp += Math.max(0, Math.floor(amount));
    let leveledUp = false;

    while (state.xp >= xpForNextLevel()) {
      state.xp -= xpForNextLevel();
      state.level += 1;
      state.chests += state.level % 3 === 0 ? 1 : 0;
      leveledUp = true;
    }

    if (leveledUp) {
      showToast("Niveau supérieur !", `Vous atteignez le niveau ${state.level}. Coffres offerts tous les 3 niveaux.`, "success");
    }
  }

  function mainClick() {
    elements.mainClick.classList.remove("pulse");
    void elements.mainClick.offsetWidth;
    elements.mainClick.classList.add("pulse");

    state.clicks += 1;
    addCoins(getCoinsPerClick());
    addXp(state.bonus?.type === "xpBoost" && state.bonus.endsAt > Date.now() ? 4 : 2);
    rollRandomBonus();
    completeAvailableMissions();
    checkAchievements();
    render();
  }

  function buyUpgrade(upgradeId) {
    const upgrade = upgradeDefinitions.find((item) => item.id === upgradeId);
    const cost = getUpgradeCost(upgrade);
    if (state.coins < cost) return;

    state.coins -= cost;
    state.upgrades[upgrade.id] = getUpgradeCount(upgrade.id) + 1;
    state.upgradesBought += 1;
    addXp(upgrade.xp);
    completeAvailableMissions();
    checkAchievements();
    render();
    showToast("Amélioration achetée", `${upgrade.name} rejoint votre atelier.`, "success");
  }

  function rollRandomBonus() {
    const roll = Math.random();
    if (roll > 0.045) return;

    if (roll < 0.012) {
      state.chests += 1;
      showToast("Coffre rare trouvé", "Un coffre gratuit a été ajouté à votre stock.", "rare");
      return;
    }

    if (roll < 0.024) {
      const bonusCoins = Math.max(20, getCoinsPerClick() * 12);
      addCoins(bonusCoins);
      showToast("Bonus instantané", `+${formatNumber(bonusCoins)} pièces gagnées.`, "rare");
      return;
    }

    if (roll < 0.035) {
      activateBonus("doubleCoins", "x2 pièces pendant 10 secondes");
      return;
    }

    activateBonus("xpBoost", "Boost d'XP pendant 10 secondes");
  }

  function activateBonus(type, label) {
    state.bonus = { type, label, endsAt: Date.now() + 10000 };
    showToast("Bonus rare activé", label, "rare");
  }

  function openChest() {
    if (state.chests <= 0) return;

    state.chests -= 1;
    state.chestsOpened += 1;
    const reward = drawChestReward();
    applyChestReward(reward);

    elements.chestAnimation.classList.remove("opening");
    void elements.chestAnimation.offsetWidth;
    elements.chestAnimation.classList.add("opening");
    elements.chestAnimation.textContent = reward.icon;

    completeAvailableMissions();
    checkAchievements();
    render();
    showToast(`${reward.rarityLabel} obtenu`, reward.message, reward.rarity === "common" ? "success" : "rare");
  }

  function drawChestReward() {
    const roll = Math.random();
    if (roll < 0.58) return { rarity: "common", rarityLabel: "Commun", icon: "🪙", coins: 80 + state.level * 12, message: "Des pièces pour relancer la production." };
    if (roll < 0.84) return { rarity: "rare", rarityLabel: "Rare", icon: "✨", xp: 70 + state.level * 10, message: "Un bonus d'XP solide." };
    if (roll < 0.97) return { rarity: "epic", rarityLabel: "Épique", icon: "⚡", bonus: "doubleCoins", message: "x2 pièces pendant 10 secondes." };
    return { rarity: "legendary", rarityLabel: "Légendaire", icon: "💎", rareUpgrade: true, coins: 250 + state.level * 25, message: "Une amélioration rare et un beau lot de pièces." };
  }

  function applyChestReward(reward) {
    if (reward.coins) addCoins(reward.coins);
    if (reward.xp) addXp(reward.xp);
    if (reward.bonus) activateBonus(reward.bonus, reward.message);
    if (reward.rareUpgrade) {
      state.rareUpgrades += 1;
      addXp(120);
    }
  }

  function getDynamicMissions() {
    const nextCoinTarget = Math.ceil((state.totalCoins + 1) / 250) * 250;
    const nextClickTarget = Math.ceil((state.clicks + 1) / 75) * 75;
    const nextUpgradeTarget = state.upgradesBought + 2;
    const nextLevelTarget = state.level + 1;

    return [
      {
        id: `dynamic_coins_${nextCoinTarget}`,
        label: `Gagner ${formatNumber(nextCoinTarget)} pièces`,
        target: nextCoinTarget,
        metric: "totalCoins",
        reward: { coins: Math.round(nextCoinTarget * 0.16), xp: 35 },
      },
      {
        id: `dynamic_clicks_${nextClickTarget}`,
        label: `Cliquer ${formatNumber(nextClickTarget)} fois`,
        target: nextClickTarget,
        metric: "clicks",
        reward: { coins: 90 + state.level * 12, xp: 28 },
      },
      {
        id: `dynamic_upgrades_${nextUpgradeTarget}`,
        label: `Acheter ${nextUpgradeTarget} améliorations`,
        target: nextUpgradeTarget,
        metric: "upgradesBought",
        reward: { coins: 120 + state.level * 18, xp: 42 },
      },
      {
        id: `dynamic_level_${nextLevelTarget}`,
        label: `Atteindre le niveau ${nextLevelTarget}`,
        target: nextLevelTarget,
        metric: "level",
        reward: { coins: 150 + state.level * 24, xp: 36, chests: nextLevelTarget % 3 === 0 ? 1 : 0 },
      },
    ];
  }

  function getAvailableMissions() {
    return [...missionDefinitions, ...getDynamicMissions()]
      .filter((mission) => !state.completedMissions.includes(mission.id));
  }

  function completeAvailableMissions() {
    getAvailableMissions().forEach((mission) => {
      if (getMissionProgress(mission) < mission.target) return;

      state.completedMissions.push(mission.id);
      addCoins(mission.reward.coins || 0);
      addXp(mission.reward.xp || 0);
      state.chests += mission.reward.chests || 0;
      showToast("Mission terminée", `${mission.label} · récompense récupérée.`, "success");
    });
  }

  function getMissionProgress(mission) {
    return Math.min(state[mission.metric] || 0, mission.target);
  }

  function checkAchievements() {
    achievementDefinitions.forEach((achievement) => {
      if (state.achievements.includes(achievement.id) || !achievement.test(state)) return;
      state.achievements.push(achievement.id);
      showToast("Succès débloqué", achievement.label, "success");
    });
  }

  function tick() {
    if (state.bonus && state.bonus.endsAt <= Date.now()) {
      state.bonus = null;
      showToast("Bonus terminé", "Le rythme normal reprend.");
    }

    const passiveIncome = getCoinsPerSecond();
    if (passiveIncome > 0) {
      addCoins(passiveIncome);
      addXp(1);
      completeAvailableMissions();
      checkAchievements();
    }

    render();
    saveGame(false);
  }

  function render() {
    const nextLevelXp = xpForNextLevel();
    const xpPercent = Math.min(100, (state.xp / nextLevelXp) * 100);

    elements.coins.textContent = formatNumber(state.coins);
    elements.level.textContent = state.level;
    elements.perClick.textContent = formatNumber(getCoinsPerClick());
    elements.perSecond.textContent = formatNumber(getCoinsPerSecond());
    elements.xpLabel.textContent = `${formatNumber(state.xp)} / ${formatNumber(nextLevelXp)}`;
    elements.xpFill.style.width = `${xpPercent}%`;
    elements.nextHint.textContent = `Encore ${formatNumber(nextLevelXp - state.xp)} XP avant le niveau suivant.`;

    renderBonus();
    renderUpgradeHint();
    renderShop();
    renderMissions();
    renderChests();
    renderAchievements();
  }

  function renderBonus() {
    if (!state.bonus) {
      elements.bonusStatus.textContent = "Aucun bonus actif pour le moment.";
      return;
    }

    const seconds = Math.max(0, Math.ceil((state.bonus.endsAt - Date.now()) / 1000));
    elements.bonusStatus.textContent = `${state.bonus.label} · encore ${seconds}s.`;
  }

  function renderUpgradeHint() {
    const affordableUpgrade = upgradeDefinitions.find((upgrade) => state.coins < getUpgradeCost(upgrade));
    if (!affordableUpgrade) {
      elements.upgradeHint.textContent = "Toutes les améliorations visibles sont finançables : à vous de choisir.";
      return;
    }

    const missingCoins = getUpgradeCost(affordableUpgrade) - state.coins;
    elements.upgradeHint.textContent = `Encore ${formatNumber(missingCoins)} pièces avant ${affordableUpgrade.name}.`;
  }

  function renderShop() {
    elements.shopList.innerHTML = upgradeDefinitions.map((upgrade) => {
      const cost = getUpgradeCost(upgrade);
      const count = getUpgradeCount(upgrade.id);
      const canBuy = state.coins >= cost;
      return `
        <div class="shop-item">
          <div class="shop-top">
            <div>
              <h3>${upgrade.name}</h3>
              <p>${upgrade.description}</p>
            </div>
            <span class="pill">x${count}</span>
          </div>
          <div class="shop-meta">
            <span>Coût : ${formatNumber(cost)} pièces</span>
            <span>${upgrade.coinPerClick ? `+${upgrade.coinPerClick}/clic` : `+${upgrade.coinPerSecond}/sec`}</span>
          </div>
          <button class="btn ${canBuy ? "primary" : "secondary"} full" type="button" data-buy="${upgrade.id}" ${canBuy ? "" : "disabled"}>
            ${canBuy ? "Acheter" : `Encore ${formatNumber(cost - state.coins)} pièces`}
          </button>
        </div>
      `;
    }).join("");

    elements.shopList.querySelectorAll("[data-buy]").forEach((button) => {
      button.addEventListener("click", () => buyUpgrade(button.dataset.buy));
    });
  }

  function renderMissions() {
    const visibleMissions = getAvailableMissions()
      .sort((a, b) => (a.target - getMissionProgress(a)) - (b.target - getMissionProgress(b)))
      .slice(0, 3);

    elements.missionList.innerHTML = visibleMissions.map((mission) => {
      const progress = getMissionProgress(mission);
      const remaining = Math.max(0, mission.target - progress);
      const percent = Math.min(100, (progress / mission.target) * 100);
      const rewardParts = [`+${formatNumber(mission.reward.coins || 0)} pièces`, `+${formatNumber(mission.reward.xp || 0)} XP`];
      if (mission.reward.chests) rewardParts.push(`+${mission.reward.chests} coffre`);

      return `
        <div class="mission-item">
          <div class="mission-top">
            <h3>${mission.label}</h3>
            <span class="pill">${formatNumber(progress)} / ${formatNumber(mission.target)}</span>
          </div>
          <div class="item-progress" aria-label="Progression de mission">
            <span style="width: ${percent}%"></span>
          </div>
          <p>Encore ${formatNumber(remaining)} avant de terminer cette mission.</p>
          <div class="mission-meta"><span>${rewardParts.join(" · ")}</span></div>
        </div>
      `;
    }).join("");
  }

  function renderChests() {
    elements.chestCount.textContent = `${state.chests} coffre${state.chests > 1 ? "s" : ""}`;
    elements.openChest.disabled = state.chests <= 0;
  }

  function renderAchievements() {
    elements.achievementList.innerHTML = achievementDefinitions.map((achievement) => {
      const unlocked = state.achievements.includes(achievement.id);
      return `
        <div class="achievement-item ${unlocked ? "unlocked" : "locked"}">
          <div class="achievement-top">
            <h3>${unlocked ? "🏆" : "🔒"} ${achievement.label}</h3>
            <span class="pill">${unlocked ? "Débloqué" : "À faire"}</span>
          </div>
          <p>${achievement.description}</p>
        </div>
      `;
    }).join("");
  }

  function showToast(title, message, type = "") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`.trim();
    toast.innerHTML = `<strong>${title}</strong><span>${message}</span>`;
    elements.toastStack.append(toast);
    setTimeout(() => toast.remove(), 4200);
  }

  function formatNumber(value) {
    return Math.floor(value).toLocaleString("fr-FR");
  }

  function init() {
    elements.mainClick.addEventListener("click", mainClick);
    elements.openChest.addEventListener("click", openChest);
    elements.saveGame.addEventListener("click", () => saveGame(true));
    elements.resetGame.addEventListener("click", resetGame);
    render();
    checkAchievements();
    setInterval(tick, TICK_MS);
    setInterval(() => saveGame(false), 5000);
  }

  return { init, getState: () => state };
})();

IdleGame.init();
