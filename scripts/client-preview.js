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
    show(activeIndex);

    items.forEach((item, i) => {
      item.addEventListener('click', () => {
        activeIndex = i;
        show(i);
      });

      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activeIndex = i;
          show(i);
        }
      });

      if (canHover) {
        item.addEventListener('mouseenter', () => show(i));
        item.addEventListener('mouseleave', () => show(activeIndex));
      }
    });
  });
});
