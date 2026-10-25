// Animate native disclosures while preserving keyboard and screen-reader behavior.
(() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  for (const details of document.querySelectorAll('details')) {
    const summary = details.querySelector('summary');
    if (!summary) continue;
    let animation;
    let expanded = details.open;
    function cancel() {
      animation?.cancel();
      animation = undefined;
      details.style.height = '';
      details.style.overflow = '';
    }
    summary.addEventListener('click', (event) => {
      if (reducedMotion.matches || typeof details.animate !== 'function')
        return;
      event.preventDefault();
      const start = details.getBoundingClientRect().height;
      expanded = animation ? !expanded : !details.open;
      cancel();
      // Measure both native layouts so padding and borders are included.
      details.open = expanded;
      const end = details.getBoundingClientRect().height;
      details.open = true;
      details.style.overflow = 'hidden';
      details.style.height = `${start}px`;
      const current = details.animate(
        [{ height: `${start}px` }, { height: `${end}px` }],
        { duration: 280, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      );
      animation = current;
      current.onfinish = () => {
        if (animation !== current) return;
        details.open = expanded;
        cancel();
      };
    });
    reducedMotion.addEventListener('change', () => {
      if (!animation) return;
      details.open = expanded;
      cancel();
    });
    // Finish before layout changes so wrapped content never remains clipped.
    window.addEventListener('resize', () => {
      if (!animation) return;
      details.open = expanded;
      cancel();
    });
  }
})();
