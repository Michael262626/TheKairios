chrome.runtime.onInstalled.addListener(() => {
    console.log("Kairios extension installed");
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name.startsWith("schedule-")) {
        chrome.notifications.create({
            type: "basic",
            iconUrl: "icon.png",
            title: "Kairios Schedule Reminder",
            message: `Time to post at ${alarm.name.replace("schedule-", "")}!`
        });
    }
});