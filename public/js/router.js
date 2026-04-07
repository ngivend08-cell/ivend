function bootRouter() {
  if (!window.page) return;

  const appMainSelector = '#app-main';
  let isNavigating = false;

  async function loadPage(pathname) {
    if (isNavigating) return;
    isNavigating = true;

    try {
      const response = await fetch(pathname, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      const html = await response.text();
      const parser = new DOMParser();
      const documentCopy = parser.parseFromString(html, 'text/html');
      const nextMain = documentCopy.querySelector(appMainSelector);

      if (!nextMain || !response.ok) {
        window.location.assign(pathname);
        return;
      }

      const currentMain = document.querySelector(appMainSelector);
      if (currentMain) {
        currentMain.innerHTML = nextMain.innerHTML;
      } else {
        window.location.assign(pathname);
        return;
      }

      document.title = documentCopy.title;
      const newBodyClass = documentCopy.body.getAttribute('class') || '';
      document.body.setAttribute('class', newBodyClass);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      attachActionLinks();
    } catch (error) {
      window.location.assign(pathname);
    } finally {
      isNavigating = false;
    }
  }

  function attachActionLinks() {
    document.querySelectorAll('[data-spa-link]').forEach((link) => {
      link.addEventListener('click', (event) => {
        const href = link.getAttribute('href');
        if (!href || href.startsWith('http') || href.startsWith('#')) return;
        event.preventDefault();
        window.page.show(href);
      });
    });
  }

  ['/', '/catalog', '/login', '/register', '/dashboard', '/tracks/new', '/playlists/new', '/admin'].forEach((route) => {
    window.page(route, async (ctx) => {
      if (ctx.init) return;
      await loadPage(ctx.path);
    });
  });

  attachActionLinks();
  window.page();
}

document.addEventListener('DOMContentLoaded', bootRouter);
