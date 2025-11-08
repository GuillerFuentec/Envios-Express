'use strict';

const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const toggleMenuFactory = (toggle, mobileMenu) => (forceClose = false) => {
  if (!toggle || !mobileMenu) {
    return;
  }

  const expanded = toggle.getAttribute('aria-expanded') === 'true';
  const shouldOpen = forceClose ? false : !expanded;

  toggle.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');

  if (shouldOpen) {
    mobileMenu.hidden = false;
    mobileMenu.removeAttribute('hidden');
  } else {
    mobileMenu.hidden = true;
    mobileMenu.setAttribute('hidden', '');
  }
};

const animateScroll = (startY, targetY, duration = 300) => {
  const distance = targetY - startY;
  let startTime = null;

  const step = (currentTime) => {
    if (startTime === null) {
      startTime = currentTime;
    }

    const timeElapsed = currentTime - startTime;
    const progress = Math.min(timeElapsed / duration, 1);
    const eased = easeInOutCubic(progress);

    window.scrollTo(0, startY + distance * eased);

    if (timeElapsed < duration) {
      window.requestAnimationFrame(step);
    }
  };

  window.requestAnimationFrame(step);
};

const initNavigation = () => {
  const navbar = document.querySelector('.site-navbar');
  const toggle = navbar ? navbar.querySelector('.site-navbar__toggle') : null;
  const mobileMenu = navbar ? navbar.querySelector('#mobile-menu') : null;
  const scrollLinks = document.querySelectorAll('[data-scroll="true"]');

  const toggleMenu = toggleMenuFactory(toggle, mobileMenu);

  if (toggle) {
    toggle.addEventListener('click', () => toggleMenu(false));
  }

  const handleSmoothScroll = function (event) {
    const href = this.getAttribute('href');
    if (!href || !href.startsWith('#')) {
      return;
    }

    const target = document.querySelector(href);
    if (!target) {
      return;
    }

    event.preventDefault();

    const navHeight = navbar ? navbar.offsetHeight || 0 : 0;
    const targetY =
      target.getBoundingClientRect().top +
      window.pageYOffset -
      (navHeight + 12);

    animateScroll(window.pageYOffset, targetY);
    toggleMenu(true);
  };

  scrollLinks.forEach((link) => {
    link.addEventListener('click', handleSmoothScroll);
  });

  const trackedSections = Array.from(scrollLinks)
    .map((link) => {
      const href = link.getAttribute('href');
      return href && href.startsWith('#') ? document.querySelector(href) : null;
    })
    .filter(Boolean);

  const setActiveLink = () => {
    if (!trackedSections.length) {
      return;
    }

    const navHeight = navbar ? navbar.offsetHeight || 0 : 0;
    const scrollPosition = window.pageYOffset + navHeight + 24;
    let currentSection = trackedSections[0];

    trackedSections.forEach((section) => {
      if (section.offsetTop <= scrollPosition) {
        currentSection = section;
      }
    });

    const currentId = currentSection.id;

    scrollLinks.forEach((link) => {
      if (link.getAttribute('href') === `#${currentId}`) {
        link.classList.add('is-active');
      } else {
        link.classList.remove('is-active');
      }
    });
  };

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        setActiveLink();
        ticking = false;
      });
      ticking = true;
    }
  });

  window.addEventListener('resize', setActiveLink);
  setActiveLink();
};

document.addEventListener('DOMContentLoaded', initNavigation);

export { initNavigation };
