const menu = document.querySelector('[data-mobile-menu]');
const openButton = document.querySelector('[data-open-menu]');
const closeButton = document.querySelector('[data-close-menu]');

function setMenu(open) {
  menu?.classList.toggle('is-open', open);
  menu?.setAttribute('aria-hidden', String(!open));
}

openButton?.addEventListener('click', () => setMenu(true));
closeButton?.addEventListener('click', () => setMenu(false));
menu?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => setMenu(false));
});
