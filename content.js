(function() {
    "use strict";

    let kairosPanel = null;
    let observer = null;

    // Platform configurations
    const platformConfigs = {
        "twitter.com": {
            selector: '[data-testid="tweetButton"], [data-testid="tweetButtonInline"]',
            containerSelector: 'div[role="group"]',
            textMatch: /Tweet|Post/i,
            tip: "Use trending hashtags for better reach."
        },
        "x.com": {
            selector: '[data-testid="tweetButton"], [data-testid="tweetButtonInline"]',
            containerSelector: 'div[role="group"]',
            textMatch: /Tweet|Post/i,
            tip: "Use trending hashtags for better reach."
        },
        "mail.google.com": {
            selector: '[data-tooltip="Send"], [aria-label="Send"]',
            containerSelector: 'div[role="toolbar"]',
            textMatch: /Send/i,
            tip: "Include a clear call-to-action in emails."
        },
        "gmail.com": {
            selector: '[data-tooltip="Send"], [aria-label="Send"]',
            containerSelector: 'div[role="toolbar"]',
            textMatch: /Send/i,
            tip: "Include a clear call-to-action in emails."
        },
        "shopify.com": {
            selector: '[data-action="publish"], [data-action="save"], .btn-primary',
            containerSelector: 'div[class*="action-bar"]',
            textMatch: /Publish|Save/i,
            tip: "Align product launches with peak shopping hours."
        },
        "youtube.com": {
            selector: '#done-button, #publish-button, .ytcp-button',
            containerSelector: 'div[class*="action-container"]',
            textMatch: /Publish|Done/i,
            tip: "Use eye-catching thumbnails for videos."
        },
        "medium.com": {
            selector: '[data-action="publish"], .publishMenu-button',
            containerSelector: 'div[class*="publish-bar"]',
            textMatch: /Publish/i,
            tip: "Craft compelling headlines for articles."
        }
    };

    // Debounce utility
    function debounce(fn, delay) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn(...args), delay);
        };
    }

    // Initialize Kairios
    function initKairios() {
        console.log("Kairios: Initializing content script...");
        const hostname = window.location.hostname;
        const platform = Object.keys(platformConfigs).find(site => hostname.includes(site));
        if (platform) {
            const config = platformConfigs[platform];
            setupObserver(config);
            addKButtons(config);
        }
        window.showKairosPanel = showKairosPanel;
    }

    // Setup MutationObserver
    function setupObserver(config) {
        if (observer) observer.disconnect();
        const container = document.querySelector(config.containerSelector) || document.body;
        observer = new MutationObserver(debounce(() => {
            console.log("Kairios: DOM changed, checking for buttons...");
            addKButtons(config);
        }, 500));
        observer.observe(container, { childList: true, subtree: true });
        console.log("Kairios: Observer set up for", config.containerSelector);
    }

    // Add K buttons
    function addKButtons(config) {
        const buttons = document.querySelectorAll(config.selector);
        buttons.forEach(button => {
            if (config.textMatch.test(button.textContent) && !button.parentElement.querySelector(".kairios-k-button")) {
                const kButton = createKButton();
                button.parentElement.insertBefore(kButton, button.nextSibling);
                console.log("Kairios: Added K button next to", button.textContent);
            }
        });
    }

    // Create K button
    function createKButton() {
        const kButton = document.createElement("button");
        kButton.className = "kairios-k-button";
        kButton.textContent = "K";
        kButton.setAttribute("aria-label", "Show Kairios Timing Panel");
        kButton.addEventListener("click", () => {
            showKairosPanel();
            logInteraction("k_button_click");
        });
        return kButton;
    }

    // Show Kairos panel
    function showKairosPanel() {
        if (kairosPanel) {
            kairosPanel.style.display = "block";
            logInteraction("panel_shown");
            return;
        }
        createKairosPanel();
    }

    // Create Kairos panel
    async function createKairosPanel() {
        try {
            const { audience = "general", timezone = "Africa/Lagos" } = await chrome.storage.sync.get(["audience", "timezone"]);
            const { lastInsight } = await chrome.storage.local.get("lastInsight");
            const hostname = window.location.hostname;
            const platform = Object.keys(platformConfigs).find(site => hostname.includes(site));
            const tip = platform ? platformConfigs[platform].tip : "Optimize your post timing for maximum engagement.";
            const insight = lastInsight || generateInsight(audience, timezone, false);

            const panel = document.createElement("div");
            panel.id = "kairios-panel";
            panel.className = "kairios-panel";
            panel.setAttribute("role", "dialog");
            panel.setAttribute("aria-labelledby", "kairios-panel-title");
            panel.innerHTML = `
                <div class="kairios-panel-header">
                    <h2 class="kairios-panel-title" id="kairios-panel-title">Kairios Timing Analysis</h2>
                    <button class="kairios-panel-close" aria-label="Close panel">×</button>
                </div>
                <div class="kairios-chrono-dial">
                    <div class="kairios-dial-center"></div>
                    <div class="kairios-time-zone kairios-optimal-zone"></div>
                    <div class="kairios-time-zone kairios-neutral-zone"></div>
                    <div class="kairios-time-zone kairios-dead-zone"></div>
                </div>
                <div class="kairios-insight-box">
                    <p class="kairios-primary-insight" aria-live="polite">Optimal Time: ${insight.time}</p>
                    <p class="kairios-secondary-insight">Reason: ${insight.reason} (Score: ${insight.score}/100)</p>
                    <p class="kairios-platform-tip">${tip}</p>
                </div>
                <div class="kairios-action-buttons">
                    <button class="kairios-btn-primary" aria-label="Act now to use optimal timing">Act Now</button>
                    <button class="kairios-btn-secondary" aria-label="Schedule post for later">Schedule</button>
                </div>
            `;

            document.body.appendChild(panel);
            kairosPanel = panel;

            panel.querySelector(".kairios-panel-close").addEventListener("click", () => {
                panel.style.display = "none";
                logInteraction("panel_close");
            });
            panel.querySelector(".kairios-btn-primary").addEventListener("click", () => {
                panel.style.display = "none";
                logInteraction("act_now_click");
            });
            panel.querySelector(".kairios-btn-secondary").addEventListener("click", async () => {
                const time = insight.time;
                const platformName = platform || "unknown";
                await saveSchedule(time, platformName);
                logInteraction("schedule_click");
            });
            logInteraction("panel_created");
        } catch (error) {
            console.error("Create panel failed:", error);
        }
    }

    // Generate insight
    function generateInsight(audience, timezone, cache) {
        const now = new Date().toLocaleString("en-US", { timeZone: timezone || "Africa/Lagos" });
        const hours = new Date(now).getHours();
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
        if (cache) chrome.storage.local.set({ lastInsight: insight });
        return insight;
    }

    // Save schedule
    async function saveSchedule(time, platform) {
        try {
            const schedules = (await chrome.storage.local.get("schedules")).schedules || [];
            if (schedules.length >= 3) {
                alert("Free tier limited to 3 schedules. Upgrade at https://x.ai/grok for more.");
                return;
            }
            schedules.push({ time, platform, timestamp: Date.now() });
            await chrome.storage.local.set({ schedules });
            chrome.alarms.create(`schedule-${time}`, { when: Date.now() + 60000 });
            alert(`Scheduled for ${time} on ${platform}!`);
        } catch (error) {
            console.error("Save schedule failed:", error);
            alert("Schedule saved, but reminder may not work.");
        }
    }

    // Log interactions
    async function logInteraction(event) {
        try {
            const analytics = (await chrome.storage.local.get("analytics")).analytics || [];
            analytics.push({ event, timestamp: Date.now() });
            await chrome.storage.local.set({ analytics });
        } catch (error) {
            console.error("Log interaction failed:", error);
        }
    }

    // Initialize with retry
    function initializeWithRetry(attempts = 3, delay = 2000) {
        if (document.readyState === "complete" || document.readyState === "interactive") {
            initKairios();
        } else {
            console.log("Kairios: Document not ready, retrying in", delay, "ms...");
            if (attempts > 0) {
                setTimeout(() => initializeWithRetry(attempts - 1, delay), delay);
            } else {
                console.error("Kairios: Failed to initialize after retries");
                window.showKairosPanel = showKairosPanel;
            }
        }
    }

    // Start initialization
    initializeWithRetry();

    // Handle SPA navigation
    window.addEventListener("popstate", () => {
        console.log("Kairios: SPA navigation detected (popstate)");
        setTimeout(initKairios, 1000);
    });
    window.addEventListener("hashchange", () => {
        console.log("Kairios: SPA navigation detected (hashchange)");
        setTimeout(initKairios, 1000);
    });

    // Cleanup
    window.addEventListener("unload", () => {
        if (observer) observer.disconnect();
        console.log("Kairios: Cleaning up observer");
    });
})();