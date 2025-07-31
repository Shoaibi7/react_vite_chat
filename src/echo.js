import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

Pusher.logToConsole = true; // 👈 Add this above window.Pusher

let echo = null;

export function initEcho(token) {
  echo = new Echo({
    broadcaster: 'pusher',
    key: import.meta.env.VITE_PUSHER_KEY,
    cluster: import.meta.env.VITE_PUSHER_CLUSTER,
    encrypted: true,
    forceTLS: true,
    authorizer: (channel, options) => {
      return {
        authorize: (socketId, callback) => {
          fetch(`${import.meta.env.VITE_API_URL}/api/broadcasting/auth`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              socket_id: socketId,
              channel_name: channel.name,
            }),
          })
            .then(res => res.json())
            .then(data => callback(false, data))
            .catch(err => callback(true, err));
        },
      };
    },
  });
}

export function getEcho() {
  return echo;
}



export function disconnectEcho() {
  if (echo) {
    echo.disconnect();
    echo = null;
  }
}
