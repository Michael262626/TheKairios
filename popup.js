console.log("Kairios popup initializing...");

// Smart insight engine
function generateInsight(audience, timezone, cache = true) {
    const now = new Date().toLocaleString("en-US", { timeZone: timezone || "Africa/Lagos" });
    const hours = new Date(now).getHours();
    let time, reason, score;

    const audienceInsights = {
        tech: [
            { hour: 9, time: "09:00", reason: "Tech enthusiasts active during morning browse", score: 85 },
            { hour: 13, time: "13:00", reason: "Midday spike in crypto discussions", score: 90 },
            { hour: 20, time: "20:00", reason: "Evening tech community engagement", score: 80 }
        ],
        business: [
            { hour: 10, time: "10:00", reason: "Business professionals check emails", score: 88 },
            { hour: 14, time: "14:00", reason: "Post-lunch professional networking peak", score: 85 },
            { hour: 17, time: "17:00", reason: "End-of-day business updates", score: 82 }
        ],
        general: [
            { hour: 8, time: "08:00", reason: "Morning social media scroll", score: 80 },
            { hour: 12, time: "12:00", reason: "Lunch break social media surge", score: 85 },
            { hour: 19, time: "19:00", reason: "Evening general audience activity", score: 90 }
        ]
    };

    const insights = audienceInsights[audience] || audienceInsights.general;
    const insight = insights.find(i => Math.abs(i.hour - hours) <= 2) || insights[0];
    time = insight.time;
    reason = insight.reason;
    score = insight.score;

    document.getElementById("primaryInsight").textContent = `Optimal Time: ${time}`;
    document.getElementById("secondaryInsight").textContent = `Reason: ${reason} (Score: ${score}/100)`;

    if (cache) {
        updateInsightHistory({ time, reason, score });
        chrome.storage.local.set({ lastInsight: { time, reason, score, audience, timezone } });
    }
    return { time, reason, score };
}

// Update insight history
async function updateInsightHistory(insight) {
    try {
        const { insightHistory = [] } = await chrome.storage.local.get("insightHistory");
        insightHistory.unshift(insight);
        if (insightHistory.length > 3) insightHistory.pop();
        await chrome.storage.local.set({ insightHistory });

        const historyList = document.getElementById("insightHistory");
        historyList.innerHTML = insightHistory.map(i => `<li>${i.time}: ${i.reason} (Score: ${i.score})</li>`).join("");
    } catch (error) {
        console.error("Update insight history failed:", error);
    }
}

// Platform-specific tips
function getPlatformTip(url) {
    if (!url) return "Optimize your post timing for maximum engagement.";
    if (url.includes("twitter.com") || url.includes("x.com")) return "Use trending hashtags for better reach.";
    if (url.includes("mail.google.com") || url.includes("gmail.com")) return "Include a clear call-to-action in emails.";
    if (url.includes("shopify.com")) return "Align product launches with peak shopping hours.";
    if (url.includes("youtube.com")) return "Use eye-catching thumbnails for videos.";
    if (url.includes("medium.com")) return "Craft compelling headlines for articles.";
    return "Optimize your post timing for maximum engagement.";
}

// Save schedule with reminders
async function saveSchedule(time, platform) {
    try {
        const schedules = (await chrome.storage.local.get("schedules")).schedules || [];
        if (schedules.length >= 3) {
            alert("Free tier limited to 3 schedules. Upgrade at https://x.ai/grok for more.");
            return;
        }
        schedules.push({ time, platform, timestamp: Date.now() });
        await chrome.storage.local.set({ schedules });
        chrome.alarms.create(`schedule-${time}`, { when: Date.now() + 60000 }); // Demo: 1-minute reminder
        alert(`Scheduled for ${time} on ${platform}!`);
    } catch (error) {
        console.error("Save schedule failed:", error);
        alert("Schedule saved, but reminder may not work.");
    }
}

// Check active tab
async function getActiveTabInfo() {
    try {
        if (!chrome.tabs?.query) return { url: "", id: null };
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return { url: tab?.url || "", id: tab?.id || null };
    } catch (error) {
        console.error("Get tab info failed:", error);
        return { url: "", id: null };
    }
}

// Load preferences
async function loadPreferences() {
    const { audience = "general", timezone = "Africa/Lagos" } = await chrome.storage.sync.get(["audience", "timezone"]);
    document.getElementById("audience").value = audience;
    document.getElementById("timezone").value = timezone;
    return { audience, timezone };
}

// Save preferences
async function savePreferences(audience, timezone) {
    try {
        await chrome.storage.sync.set({ audience, timezone });
    } catch (error) {
        console.error("Save preferences failed:", error);
    }
}

// Load cached insight
async function loadCachedInsight() {
    const { lastInsight } = await chrome.storage.local.get("lastInsight");
    if (lastInsight) {
        document.getElementById("primaryInsight").textContent = `Optimal Time: ${lastInsight.time}`;
        document.getElementById("secondaryInsight").textContent = `Reason: ${lastInsight.reason} (Score: ${lastInsight.score}/100)`;
        return lastInsight;
    }
}

// Log interaction
async function logInteraction(event) {
    try {
        const analytics = (await chrome.storage.local.get("analytics")).analytics || [];
        analytics.push({ event, timestamp: Date.now() });
        await chrome.storage.local.set({ analytics });
    } catch (error) {
        console.error("Log interaction failed:", error);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const statusElement = document.getElementById("status");
    const actNowBtn = document.getElementById("actNow");
    const scheduleBtn = document.getElementById("scheduleBtn");
    const audienceSelect = document.getElementById("audience");
    const timezoneSelect = document.getElementById("timezone");
    const chronoDial = document.getElementById("chrono-dial");
    const scheduleDialog = document.getElementById("scheduleDialog");
    const scheduleTime = document.getElementById("scheduleTime");
    const cancelSchedule = document.getElementById("cancelSchedule");
    const resetPreferences = document.getElementById("resetPreferences");
    const insightBox = document.getElementById("insightBox");

    // Initialize
    const { audience, timezone } = await loadPreferences();
    const tabInfo = await getActiveTabInfo();
    statusElement.innerHTML = '<span class="status-active"><span class="pulse" aria-hidden="true"></span>Ready to assist</span>';
    document.getElementById("platformTip").textContent = getPlatformTip(tabInfo.url);
    const cachedInsight = await loadCachedInsight();
    if (!cachedInsight) generateInsight(audience, timezone);

    // Refresh insights
    const refreshInsight = () => {
        chronoDial.classList.add("refreshing");
        generateInsight(audienceSelect.value, timezoneSelect.value);
        setTimeout(() => chronoDial.classList.remove("refreshing"), 1000);
    };
    chronoDial.addEventListener("click", refreshInsight);
    chronoDial.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            refreshInsight();
        }
    });

    // Save preferences
    audienceSelect.addEventListener("change", () => {
        savePreferences(audienceSelect.value, timezoneSelect.value);
        refreshInsight();
    });
    timezoneSelect.addEventListener("change", () => {
        savePreferences(audienceSelect.value, timezoneSelect.value);
        refreshInsight();
    });

    // Reset preferences
    resetPreferences.addEventListener("click", async () => {
        await chrome.storage.sync.clear();
        audienceSelect.value = "general";
        timezoneSelect.value = "Africa/Lagos";
        refreshInsight();
        alert("Preferences reset to default.");
    });

    // Act Now: Copy insight to clipboard
    actNowBtn.addEventListener("click", async () => {
        try {
            const { audience, timezone } = await loadPreferences();
            const insight = await loadCachedInsight() || generateInsight(audience, timezone);
            const textToCopy = `Optimal posting time: ${insight.time} - Reason: ${insight.reason} (Score: ${insight.score}/100)`;
            await navigator.clipboard.writeText(textToCopy);
            insightBox.classList.add("highlight");
            statusElement.innerHTML = '<span class="status-active"><span class="pulse" aria-hidden="true"></span>Insight copied to clipboard!</span>';
            setTimeout(() => {
                insightBox.classList.remove("highlight");
                statusElement.innerHTML = '<span class="status-active"><span class="pulse" aria-hidden="true"></span>Ready to assist</span>';
            }, 2000);
            logInteraction("act_now_copy");
        } catch (error) {
            console.error("Act Now failed:", error);
        }
    });

    // Schedule
    scheduleBtn.addEventListener("click", () => {
        scheduleDialog.showModal();
        scheduleTime.focus();
    });
    cancelSchedule.addEventListener("click", () => scheduleDialog.close());
    scheduleDialog.addEventListener("submit", async (e) => {
        e.preventDefault();
        const time = scheduleTime.value;
        if (!time) return;
        const platform = tabInfo.url ? new URL(tabInfo.url).hostname : "unknown";
        await saveSchedule(time, platform);
        scheduleDialog.close();
    });
});