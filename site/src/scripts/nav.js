export function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const inner = document.querySelector('.sidebar-inner');

  // Mobile toggle
  toggle?.addEventListener('click', () => {
    inner?.classList.toggle('open');
  });

  // Close on link click (mobile)
  inner?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => inner.classList.remove('open'));
  });
}
