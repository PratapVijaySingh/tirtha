const CLIENT = import.meta.env.VITE_ADSENSE_CLIENT || 'ca-pub-8477220804590015';
const SLOT = import.meta.env.VITE_ADSENSE_SLOT || '';

export const adsEnabled = /^ca-pub-\d+$/.test(CLIENT);

export function fillInfoAd(el) {
  if (!adsEnabled || !el || !SLOT) {
    el?.classList.add('hidden');
    return;
  }
  el.classList.remove('hidden');
  if (el.dataset.filled) return;
  const inner = el.querySelector('[data-ad-inner]') || el;
  inner.innerHTML = `<ins class="adsbygoogle"
      style="display:block"
      data-ad-client="${CLIENT}"
      data-ad-slot="${SLOT}"
      data-ad-format="auto"
      data-full-width-responsive="true"></ins>`;
  el.dataset.filled = '1';
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch {
    /* AdSense script may still be loading */
  }
}
