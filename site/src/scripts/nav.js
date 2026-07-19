export function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');

  // Mobile toggle
  toggle?.addEventListener('click', () => {
    links?.classList.toggle('open');
  });

  // Close on link click (mobile)
  links?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => links.classList.remove('open'));
  });
}
