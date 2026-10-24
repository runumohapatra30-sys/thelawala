// Complete Push Notification Helper for Home Screen & Lock Screen

export async function requestAndShowNotification(title: string, body: string) {
  if (!("Notification" in window)) {
    console.log("This browser does not support notifications.");
    return;
  }

  try {
    let permission = Notification.permission;
    if (permission !== "granted") {
      permission = await Notification.requestPermission();
    }

    if (permission === "granted") {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        
        await registration.showNotification(title, {
          body: body,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          vibrate: [300, 100, 300],
          tag: "thelawala-order",
          renotify: true,
          requireInteraction: true,
          data: {
            url: window.location.origin
          }
        } as NotificationOptions);
        
        console.log("Notification sent to Home Screen successfully!");
      } else {
        new Notification(title, {
          body: body,
          icon: "/icon-192.png"
        });
      }
    } else {
      console.log("Notification permission was denied.");
    }
  } catch (error) {
    console.error("Error showing home screen notification:", error);
  }
}
