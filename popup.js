(function() {
  const AUTO_KEY = 'mysubtrack_auto_detect';
  const NOTIFY_KEY = 'mysubtrack_show_notifications';

  async function getStorage(keys) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(keys, (res) => resolve(res || {}));
      } catch (e) {
        resolve({});
      }
    });
  }

  async function setStorage(obj) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.set(obj, () => resolve());
      } catch (e) {
        resolve();
      }
    });
  }

  async function init() {
    const todayEl = document.getElementById('stat-today');
    const savedEl = document.getElementById('stat-saved');
    const autoEl = document.getElementById('toggle-auto');
    const notifyEl = document.getElementById('toggle-notify');

    const res = await getStorage([AUTO_KEY, NOTIFY_KEY]);
    autoEl.checked = (res[AUTO_KEY] ?? true);
    notifyEl.checked = (res[NOTIFY_KEY] ?? true);

    autoEl.addEventListener('change', async () => {
      await setStorage({ [AUTO_KEY]: autoEl.checked });
    });
    notifyEl.addEventListener('change', async () => {
      await setStorage({ [NOTIFY_KEY]: notifyEl.checked });
    });

    document.getElementById('btn-dashboard').addEventListener('click', () => {
      try { chrome.tabs.create({ url: 'https://mysubtrack.com' }); } catch(_) {}
      window.close();
    });

    document.getElementById('btn-test').addEventListener('click', async () => {
      // Send a message to the active tab's content script to run detection now
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.id) {
          alert('No active tab. Open a website and try again.');
          return;
        }
        const url = tab.url || '';
        if (!/^https?:\/\//i.test(url)) {
          alert('This page does not allow content scripts. Switch to a regular website and try again.');
          return;
        }
        chrome.tabs.sendMessage(tab.id, { type: 'mysubtrack_test_detection' }, (response) => {
          if (chrome.runtime && chrome.runtime.lastError) {
            alert('Could not connect to the page. Reload the tab or open a different website and try again.');
            return;
          }
          const ok = response && response.detected;
          const msg = ok ? 'Detection found on this page.' : 'No subscription detected on this page.';
          alert(msg);
        });
      } catch (_) {
        alert('Unable to run test. Open a tab and try again.');
      }
    });

    // Load stats via message, fallback to local storage
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id || !/^https?:\/\//i.test(tab.url || '')) {
        // Fallback to local storage when we can't reach a content script
        const subs = await getStorage(['mysubtrack_subscriptions']);
        const list = subs['mysubtrack_subscriptions'] || [];
        const today = new Date().toISOString().slice(0, 10);
        const todayCount = list.filter(s => (s.addedAt || '').slice(0,10) === today).length;
        let total = 0;
        for (const s of list) if (typeof s.price === 'number') total += s.price;
        todayEl.textContent = String(todayCount);
        savedEl.textContent = `$${total.toFixed(2)}`;
      } else {
        chrome.tabs.sendMessage(tab.id, { type: 'mysubtrack_get_stats' }, async (resp) => {
          if (chrome.runtime && chrome.runtime.lastError) {
            const subs = await getStorage(['mysubtrack_subscriptions']);
            const list = subs['mysubtrack_subscriptions'] || [];
            const today = new Date().toISOString().slice(0, 10);
            const todayCount = list.filter(s => (s.addedAt || '').slice(0,10) === today).length;
            let total = 0;
            for (const s of list) if (typeof s.price === 'number') total += s.price;
            todayEl.textContent = String(todayCount);
            savedEl.textContent = `$${total.toFixed(2)}`;
            return;
          }
          if (resp && typeof resp.today === 'number' && typeof resp.totalSaved === 'number') {
            todayEl.textContent = String(resp.today);
            savedEl.textContent = `$${resp.totalSaved.toFixed(2)}`;
          } else {
            const subs = await getStorage(['mysubtrack_subscriptions']);
            const list = subs['mysubtrack_subscriptions'] || [];
            const today = new Date().toISOString().slice(0, 10);
            const todayCount = list.filter(s => (s.addedAt || '').slice(0,10) === today).length;
            let total = 0;
            for (const s of list) if (typeof s.price === 'number') total += s.price;
            todayEl.textContent = String(todayCount);
            savedEl.textContent = `$${total.toFixed(2)}`;
          }
        });
      }
    } catch (_) {}
  }

  document.addEventListener('DOMContentLoaded', init);
})();


