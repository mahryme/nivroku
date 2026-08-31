window.Webflow ||= [];
window.Webflow.push(function () {
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  document.querySelectorAll('.client_wrapper').forEach((wrapper) => {
    const items = Array.from(wrapper.querySelectorAll('[data-client-item]'));
    if (!items.length) return;

    let activeIndex = 0;
    const show = (index) => {
      items.forEach((item, i) => {
        const preview = item.querySelector('[data-client-preview]');
        if (preview) preview.classList.toggle('is-shown', i === index);
        item.setAttribute('aria-pressed', String(i === index));
      });
    };

    const setActive = (index) => {
      activeIndex = index;
      items.forEach((item, i) => {
        const link = item.querySelector('.client_link');
        if (link) link.classList.toggle('is--active', i === index);
      });
      show(index);
    };

    setActive(activeIndex);

    items.forEach((item, i) => {
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setActive(i);
        }
      });

      if (canHover) {
        item.addEventListener('mouseenter', () => setActive(i));
        item.addEventListener('mouseleave', () => setActive(0));
      } else {
        item.addEventListener('click', () => setActive(i));
      }
    });
  });
});
