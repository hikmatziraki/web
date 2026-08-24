const TELEGRAM_URL = 'https://t.me/your_channel';
const configuredTelegram = TELEGRAM_URL && !TELEGRAM_URL.includes('your_channel') ? TELEGRAM_URL : '';

document.addEventListener('click', (event) => {
  const link = event.target.closest?.('[data-telegram]');
  if (!link) return;

  if (configuredTelegram) {
    link.href = configuredTelegram;
    return;
  }

  event.preventDefault();
  const note = link.closest('[data-telegram-area]')?.querySelector('[data-telegram-note]');
  if (note) note.textContent = 'لینک کانال تلگرام پس از آماده‌شدن کانال در اینجا فعال می‌شود.';
});
