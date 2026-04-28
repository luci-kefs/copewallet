// Cope Wallet — Inject Loader (ISOLATED world)
// Injects inject.js into the MAIN world so it can set window.ethereum

(function () {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inject.js');
  script.type = 'text/javascript';
  (document.head || document.documentElement).appendChild(script);
  script.onload = () => script.remove();
})();

// Bridge MAIN→ISOLATED→background messages for provider requests
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const { data } = event;
  if (!data || data._cwSource !== 'inject') return;

  chrome.runtime.sendMessage(data.payload, (response) => {
    window.postMessage({
      _cwSource: 'background',
      _cwId: data._cwId,
      response: response || { error: 'No response' },
    }, '*');
  });
});
