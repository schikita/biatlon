/* =========================================================
   Сила на селе — биатлон в Веремейках
   Vanilla JS: sticky nav, burger menu, scroll reveal,
   smooth anchor scroll, active nav link
   ========================================================= */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Sticky nav ---------- */
  const nav = document.getElementById('nav');
  const onScroll = () => {
    nav.classList.toggle('is-scrolled', window.scrollY > 24);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Burger menu ---------- */
  const burger = nav.querySelector('.nav__burger');
  const menu = document.getElementById('nav-menu');

  const toggleMenu = (open) => {
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    document.body.style.overflow = open ? 'hidden' : '';
  };

  burger.addEventListener('click', () => toggleMenu(!nav.classList.contains('is-open')));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) toggleMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggleMenu(false); });

  /* ---------- Reveal on scroll ---------- */
  const revealEls = document.querySelectorAll('[data-reveal]');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  } else {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---------- Smooth anchor scroll (offset for fixed nav) ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      // The pinned hero owns the wheel until it is fully expanded, and its scroll
      // lock would drag the page straight back to the top. Ask it to stand down
      // (or, when the jump targets the hero itself, to rewind so the expansion
      // can play again) before the page starts moving.
      document.dispatchEvent(new CustomEvent('expand:jump', {
        detail: { hero: !!target.closest('[data-expand]') },
      }));
      const offset = nav.offsetHeight + 8;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: Math.max(0, top), behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });

  /* ---------- Active nav link on scroll ---------- */
  const navLinks = [...document.querySelectorAll('.nav__links a')];
  const navHashes = new Set(navLinks.map((l) => l.getAttribute('href')));
  // Only watch sections that actually have a nav entry, so anchor-less blocks
  // (like #baza) don't clear the highlight while they cross the viewport
  const sections = [...document.querySelectorAll('main section[id]')]
    .filter((s) => navHashes.has('#' + s.id));
  if (sections.length && navLinks.length && 'IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const hash = '#' + entry.target.id;
        navLinks.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === hash));
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach((s) => spy.observe(s));
  }

  /* ---------- Scroll-expansion hero (vanilla port of ScrollExpandMedia) ---------- */
  const expand = document.querySelector('[data-expand]');
  if (expand) {
    const mediaEl   = expand.querySelector('[data-expand-media]');
    const bgEl      = expand.querySelector('[data-expand-bg]');
    const veilEl    = expand.querySelector('[data-expand-veil]');
    const contentEl = expand.querySelector('[data-expand-content]');

    const clamp01 = (v) => Math.min(Math.max(v, 0), 1);

    let progress = 0;
    let fullyExpanded = false;
    let showContent = false;
    let touchStartY = 0;
    let isMobile = window.innerWidth < 768;

    const render = () => {
      const mediaW = (isMobile ? 320 : 860) + progress * (isMobile ? 630 : 690);
      const mediaH = (isMobile ? 280 : 600) + progress * (isMobile ? 320 : 200);
      const tx = reduceMotion ? 0 : progress * (isMobile ? 180 : 150);

      mediaEl.style.width = mediaW + 'px';
      mediaEl.style.height = mediaH + 'px';
      expand.style.setProperty('--media-h', mediaH + 'px');
      expand.style.setProperty('--tx', tx.toFixed(2) + 'vw');
      bgEl.style.opacity = String(1 - progress);
      veilEl.style.opacity = String(0.7 - progress * 0.3);
      contentEl.classList.toggle('is-shown', showContent);
    };

    const setProgress = (value) => {
      progress = clamp01(value);
      if (progress >= 1) {
        fullyExpanded = true;
        showContent = true;
      } else if (progress < 0.75) {
        showContent = false;
      }
      render();
    };

    const onWheel = (e) => {
      if (fullyExpanded && e.deltaY < 0 && window.scrollY <= 5) {
        fullyExpanded = false;
        e.preventDefault();
      } else if (!fullyExpanded) {
        e.preventDefault();
        setProgress(progress + e.deltaY * 0.0009);
      }
    };

    const onTouchStart = (e) => { touchStartY = e.touches[0].clientY; };
    const onTouchMove = (e) => {
      if (!touchStartY) return;
      const touchY = e.touches[0].clientY;
      const deltaY = touchStartY - touchY;
      if (fullyExpanded && deltaY < -20 && window.scrollY <= 5) {
        fullyExpanded = false;
        e.preventDefault();
      } else if (!fullyExpanded) {
        e.preventDefault();
        const factor = deltaY < 0 ? 0.008 : 0.005;
        setProgress(progress + deltaY * factor);
        touchStartY = touchY;
      }
    };
    const onTouchEnd = () => { touchStartY = 0; };
    const onScrollLock = () => { if (!fullyExpanded) window.scrollTo(0, 0); };
    const onResize = () => { isMobile = window.innerWidth < 768; render(); };

    if (reduceMotion) {
      progress = 1;
      fullyExpanded = true;
      showContent = true;
      render();
    } else {
      render();

      /* A menu click (see the anchor handler above) has to win over the lock:
         the hero either finishes its expansion or rewinds for a replay */
      document.addEventListener('expand:jump', (e) => {
        if (e.detail && e.detail.hero) {
          progress = 0;
          fullyExpanded = false;
          showContent = false;
          render();
          return;
        }
        if (progress < 1) setProgress(1);
      });

      window.addEventListener('wheel', onWheel, { passive: false });
      window.addEventListener('touchstart', onTouchStart, { passive: false });
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onTouchEnd);
      window.addEventListener('scroll', onScrollLock);
      window.addEventListener('resize', onResize);

      /* A deep link (#nastya, #koreshki …) hits the same wall: open straight on
         the target with the hero already finished. When the page is opened with a
         hash the browser only applies it after load, so re-check it on load too. */
      const openDeepLink = () => {
        let t = null;
        try { t = location.hash ? document.querySelector(location.hash) : null; } catch (err) { t = null; }
        if (!t || t.closest('[data-expand]')) return;
        setProgress(1);
        const top = t.getBoundingClientRect().top + window.scrollY - (nav.offsetHeight + 8);
        window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
      };
      openDeepLink();
      window.addEventListener('load', openDeepLink, { once: true });
      window.setTimeout(openDeepLink, 1800);
    }
  }

  /* ---------- Photo marquees (vanilla port of hero-3 AnimatedMarqueeHero) ---------- */
  document.querySelectorAll('[data-marquee-track]').forEach((marqueeTrack) => {
    const baseMarkup = marqueeTrack.innerHTML;
    const baseCount = marqueeTrack.children.length;
    if (baseCount < 2) return;

    const buildMarquee = () => {
      marqueeTrack.innerHTML = baseMarkup;

      const items = [...marqueeTrack.children];
      const stride = items[1].offsetLeft - items[0].offsetLeft; // item width + gap
      const setWidth = stride * baseCount;
      if (!setWidth) return;

      // Repeat the set (even number of sets) so translateX(-half) loops seamlessly.
      // The visible width of the clipping wrapper decides how many copies are needed,
      // so a narrow column marquee doesn't build as many nodes as a full-bleed one.
      const wrapper = marqueeTrack.parentElement;
      const visibleWidth = (wrapper && wrapper.clientWidth) || window.innerWidth;
      const setsNeeded = Math.max(1, Math.ceil(visibleWidth / setWidth)) * 2;
      for (let i = 1; i < setsNeeded; i++) {
        marqueeTrack.insertAdjacentHTML('beforeend', baseMarkup);
      }

      const all = [...marqueeTrack.children];
      const shift = all[baseCount].offsetLeft - all[0].offsetLeft;
      marqueeTrack.style.setProperty('--marquee-shift', shift + 'px');
      marqueeTrack.style.animationDuration = Math.max(20, shift / 70) + 's'; // ~70px/s

      // Cloned sets exist only to make the loop seamless — keep them out of the a11y tree
      all.forEach((item, i) => {
        if (i >= baseCount) item.setAttribute('aria-hidden', 'true');
      });
    };

    buildMarquee();

    let marqueeResize;
    window.addEventListener('resize', () => {
      clearTimeout(marqueeResize);
      marqueeResize = setTimeout(buildMarquee, 200);
    });
  });

  /* ---------- Lazy background videos (#harakter, #devchonki) ---------- */
  const bgVideos = [...document.querySelectorAll('[data-bg-video]')];
  if (bgVideos.length) {
    const saveData = navigator.connection ? navigator.connection.saveData === true : false;
    // Reduced motion and data-saver users keep the still poster frame
    const autoplay = !reduceMotion && !saveData && 'IntersectionObserver' in window;
    const players = [];

    bgVideos.forEach((video) => {
      const videoSources = [...video.querySelectorAll('source[data-src]')];
      if (!videoSources.length) return;

      const player = { video, inView: false, loaded: false };
      player.play = () => {
        const promise = video.play();
        if (promise && typeof promise.catch === 'function') promise.catch(() => {});
      };
      player.pause = () => { if (!video.paused) video.pause(); };
      // Nothing is downloaded until the section approaches the viewport
      player.load = () => {
        if (player.loaded) return;
        player.loaded = true;
        videoSources.forEach((source) => { source.src = source.dataset.src; });
        video.load();
        player.play();
      };
      players.push(player);

      if (!autoplay) return;

      new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          player.inView = entry.isIntersecting;
          if (player.inView) {
            player.load();
            player.play();
          } else {
            player.pause();
          }
        });
      }, { rootMargin: '250px 0px', threshold: 0 }).observe(video.closest('section') || video);
    });

    if (autoplay && players.length) {
      document.addEventListener('visibilitychange', () => {
        players.forEach((player) => {
          if (document.hidden) player.pause();
          else if (player.inView && player.loaded) player.play();
        });
      });
    }
  }

  /* ---------- Stack-spread scatter (#proslavlyat) ---------- */
  /* Vanilla port of the StackSpread component: eight portraits sit as a fanned
     cluster in the middle of the screen and spread across it as the stage scrolls. */
  const spreadStage = document.querySelector('[data-spread]');
  if (spreadStage && !reduceMotion) {
    const spreadView = spreadStage.querySelector('.spread__viewport');
    const spreadCopy = spreadStage.querySelector('[data-spread-copy]');
    const spreadHint = spreadStage.querySelector('[data-spread-hint]');
    const spreadCards = [...spreadStage.querySelectorAll('[data-spread-card]')];

    const wideQuery = window.matchMedia('(min-width: 768px)');
    const pointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');

    // Mirrors the constants of the component
    const SCATTER_START = 0.12;   // scroll progress where the cluster lets go
    const SCATTER_END = 0.9;      // ...and where the last card has settled
    const TEXT_FADE_START = 0.3;  // centre headline starts fading in
    const PARALLAX_X = 2.6;       // pointer drift once settled, vw
    const PARALLAX_Y = 2.2;       // ...and vh
    const STACK_SCALE = 0.82;     // card scale while clustered
    const SCROLL_SMOOTH = 0.2;    // per-frame easing of the scroll progress
    const POINTER_SMOOTH = 0.12;
    const EPS = 0.0015;
    const SMALL_CARD = { w: 40, h: 22 };  // narrow screens: card size, vw / vh
    const SMALL_COL = 21;                 // narrow screens: column offset, vw
    const SMALL_SCALE = 0.72;

    const clamp01 = (v) => Math.min(Math.max(v, 0), 1);
    const cardDepth = (i, total) => (total <= 1 ? 1 : 0.55 + (i / (total - 1)) * 0.75);

    const cards = spreadCards.map((el, i) => ({
      el,
      x:     Number(el.dataset.x) || 0,
      y:     Number(el.dataset.y) || 0,
      w:     Number(el.dataset.w) || 15,
      h:     Number(el.dataset.h) || 28,
      sx:    Number(el.dataset.sx) || 0,
      sy:    Number(el.dataset.sy) || 0,
      sr:    Number(el.dataset.sr) || 0,
      scale: el.dataset.scale ? Number(el.dataset.scale) : 1,
      smX:   Math.sign(Number(el.dataset.smX) || 1) * SMALL_COL,
      smY:   Number(el.dataset.smY) || 0,
      z:     Number(el.dataset.z) || i + 1,
      depth: cardDepth(i, spreadCards.length),
    }));

    let scatter = 0;      // eased 0..1 progress of the scatter
    let pointerX = 0;     // raw pointer position, -1..1 across the window
    let pointerY = 0;
    let driftX = 0;       // sprung pointer, drives the parallax
    let driftY = 0;
    let settled = false;  // the parallax only wakes up once the cards have landed
    let wide = null;      // desktop scatter vs. narrow column layout
    let inView = false;
    let frame = 0;

    const scrollProgress = () => {
      const travel = spreadStage.offsetHeight - spreadView.clientHeight;
      if (travel <= 0) return 0;
      return clamp01(-spreadStage.getBoundingClientRect().top / travel);
    };

    const sizeCards = () => {
      cards.forEach((card) => {
        card.el.style.width = (wide ? card.w : SMALL_CARD.w) + 'vw';
        card.el.style.height = (wide ? card.h : SMALL_CARD.h) + 'vh';
        card.el.style.zIndex = String(card.z);
      });
    };

    // One frame: read the scroll, ease the values, write the transforms
    const render = (progress) => {
      const isWide = wideQuery.matches;
      if (isWide !== wide) {
        wide = isWide;
        sizeCards();
      }

      const target = clamp01((progress - SCATTER_START) / (SCATTER_END - SCATTER_START));
      const step = target - scatter;
      if (Math.abs(step) < EPS) scatter = target;
      else scatter += step * SCROLL_SMOOTH;

      // Pointer parallax is armed only once the cards have landed
      if (scatter > 0.999) settled = true;
      else if (scatter < 0.985) settled = false;
      const active = settled && isWide && pointerQuery.matches;
      const aimX = active ? pointerX : 0;
      const aimY = active ? pointerY : 0;
      if (Math.abs(aimX - driftX) < EPS) driftX = aimX;
      else driftX += (aimX - driftX) * POINTER_SMOOTH;
      if (Math.abs(aimY - driftY) < EPS) driftY = aimY;
      else driftY += (aimY - driftY) * POINTER_SMOOTH;

      const p = scatter;
      cards.forEach((card) => {
        const endX = isWide ? card.x : card.smX;
        const endY = isWide ? card.y : card.smY;
        const restScale = isWide ? card.scale : SMALL_SCALE;
        const drift = card.depth * p;
        const dx = card.sx + (endX - card.sx) * p - driftX * PARALLAX_X * drift;
        const dy = card.sy + (endY - card.sy) * p - driftY * PARALLAX_Y * drift;
        const rotate = card.sr * (1 - p);
        const scale = STACK_SCALE + (restScale - STACK_SCALE) * p;
        card.el.style.transform =
          'translate3d(calc(-50% + ' + dx.toFixed(3) + 'vw), calc(-50% + ' + dy.toFixed(3) + 'vh), 0) ' +
          'rotate(' + rotate.toFixed(2) + 'deg) scale(' + scale.toFixed(4) + ')';
      });

      // The headline fades (and slightly grows) in while the portraits fly apart
      const copyT = clamp01((p - TEXT_FADE_START) / 0.35);
      const copyScale = 0.85 + 0.15 * clamp01((p - TEXT_FADE_START) / (0.9 - TEXT_FADE_START));
      spreadCopy.style.opacity = copyT.toFixed(3);
      spreadCopy.style.transform = 'scale(' + copyScale.toFixed(4) + ')';
      // ...and the hint is gone by the time the cluster lets go
      // (guarded: the hint markup is optional, the scatter runs without it)
      if (spreadHint) spreadHint.style.opacity = (1 - clamp01(progress / SCATTER_START)).toFixed(3);

      return (
        Math.abs(target - scatter) > EPS ||
        Math.abs(aimX - driftX) > EPS ||
        Math.abs(aimY - driftY) > EPS
      );
    };

    const tick = () => {
      frame = 0;
      if (!inView) return;
      if (render(scrollProgress())) frame = requestAnimationFrame(tick);
    };
    const schedule = () => { if (!frame && inView) frame = requestAnimationFrame(tick); };

    const onPointerMove = (event) => {
      pointerX = (event.clientX / window.innerWidth) * 2 - 1;
      pointerY = (event.clientY / window.innerHeight) * 2 - 1;
      schedule();
    };
    const onPointerLeave = () => { pointerX = 0; pointerY = 0; schedule(); };

    // Cheap safety net for jumps into the middle of the stage (anchor links,
    // restored scroll): the observer owns the flag, this keeps it honest when
    // the first callback has not arrived yet.
    const inViewport = () => {
      const rect = spreadStage.getBoundingClientRect();
      return rect.bottom > -160 && rect.top < window.innerHeight + 160;
    };
    const onScroll = () => {
      if (!inView) inView = inViewport();
      schedule();
    };

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        inView = entries[0].isIntersecting;
        if (inView) schedule();
      }, { rootMargin: '120px 0px' }).observe(spreadStage);
    } else {
      inView = true;
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerleave', onPointerLeave);
    // A breakpoint flip changes the card sizes and the whole layout of the cluster
    wideQuery.addEventListener('change', () => { wide = null; schedule(); });

    // First paint, so the cluster is already positioned before it scrolls in
    render(scrollProgress());
    schedule();
  }

  /* ---------- Custom video player (#koreshki) ---------- */
  /* Three clips in one player (one landscape, two portrait): a lazily attached
     <video> with a hand-rolled control bar (play/pause, scrubbing, sound,
     fullscreen) and a playlist. */
  const playerRoot = document.querySelector('[data-player]');
  if (playerRoot) {
    const video = playerRoot.querySelector('[data-player-video]');
    const stage = playerRoot.querySelector('[data-player-stage]');
    const seek = playerRoot.querySelector('[data-player-seek]');
    const currentLabel = playerRoot.querySelector('[data-player-current]');
    const durationLabel = playerRoot.querySelector('[data-player-duration]');
    const itemButtons = [...playerRoot.querySelectorAll('[data-player-item]')];
    const playButtons = [...playerRoot.querySelectorAll('[data-player-play]')];
    const muteButton = playerRoot.querySelector('[data-player-mute]');
    const fullButton = playerRoot.querySelector('[data-player-full]');

    const formatTime = (seconds) => {
      if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
      const total = Math.floor(seconds);
      return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
    };
    const setProgress = (ratio) => {
      seek.style.setProperty('--progress', Math.max(0, Math.min(1, ratio)) * 100 + '%');
    };
    const play = () => {
      const promise = video.play();
      if (promise && typeof promise.catch === 'function') promise.catch(() => {});
    };

    let activeIndex = 0;
    let attached = false; // true as soon as any clip has been requested
    let scrubbing = false;

    /* Портретные клипы идут в портретной сцене: сначала решаем по
       data-orientation (чтобы не мигнул широкий кадр, пока файл грузится),
       затем уточняем по реальным размерам файла */
    const syncOrientation = (portrait) => playerRoot.classList.toggle('is-portrait', !!portrait);
    const itemPortrait = (index) => {
      const item = itemButtons[index];
      return !!item && item.dataset.orientation === 'portrait';
    };

    /* The file itself is only requested when the playlist item is needed */
    const select = (index, shouldPlay) => {
      const item = itemButtons[index];
      if (!item || !item.dataset.src) return;
      if (attached && index === activeIndex) {
        if (shouldPlay) play();
        return;
      }
      activeIndex = index;
      itemButtons.forEach((button, i) => {
        button.classList.toggle('is-active', i === index);
        if (i === index) button.setAttribute('aria-current', 'true');
        else button.removeAttribute('aria-current');
      });
      if (item.dataset.poster) video.poster = item.dataset.poster;
      syncOrientation(itemPortrait(index));
      currentLabel.textContent = '0:00';
      durationLabel.textContent = '0:00';
      seek.value = '0';
      setProgress(0);
      video.src = item.dataset.src;
      attached = true;
      video.load();
      if (shouldPlay) play();
    };

    const syncPlay = () => {
      const playing = !video.paused && !video.ended;
      playerRoot.classList.toggle('is-playing', playing);
      playButtons.forEach((button) => {
        button.setAttribute('aria-label', playing ? 'Пауза' : 'Воспроизвести');
      });
    };
    const syncMute = () => {
      const muted = video.muted || video.volume === 0;
      playerRoot.classList.toggle('is-muted', muted);
      if (muteButton) muteButton.setAttribute('aria-label', muted ? 'Включить звук' : 'Выключить звук');
    };
    const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement;
    const syncFullscreen = () => {
      const isFull = !!fullscreenElement();
      playerRoot.classList.toggle('is-fullscreen', isFull);
      if (fullButton) {
        fullButton.setAttribute('aria-label', isFull ? 'Выйти из полноэкранного режима' : 'Развернуть на весь экран');
      }
    };
    const togglePlay = () => {
      if (!attached) { select(activeIndex, true); return; }
      if (video.paused || video.ended) play();
      else video.pause();
    };

    /* ---------- Playlist ---------- */
    itemButtons.forEach((button, i) => {
      button.addEventListener('click', () => select(i, true));
    });

    /* ---------- Play / pause: big badge, bar button, click on the frame ---------- */
    playButtons.forEach((button) => button.addEventListener('click', togglePlay));
    stage.addEventListener('click', (event) => {
      if (event.target.closest('.player__bar, button, input')) return;
      togglePlay();
    });

    /* ---------- Video state → UI ---------- */
    video.addEventListener('loadedmetadata', () => {
      durationLabel.textContent = formatTime(video.duration);
      /* Файл знает о себе всё — на случай, если разметка соврала */
      if (video.videoWidth && video.videoHeight) syncOrientation(video.videoHeight > video.videoWidth);
      const item = itemButtons[activeIndex];
      const chip = item && item.querySelector('[data-player-item-time]');
      if (chip) chip.textContent = formatTime(video.duration);
    });
    video.addEventListener('timeupdate', () => {
      const duration = video.duration || 0;
      if (duration && !scrubbing) {
        seek.value = String(Math.round((video.currentTime / duration) * 1000));
        setProgress(video.currentTime / duration);
      }
      currentLabel.textContent = formatTime(video.currentTime);
    });
    video.addEventListener('play', syncPlay);
    video.addEventListener('pause', syncPlay);
    video.addEventListener('ended', () => {
      syncPlay();
      seek.value = '1000';
      setProgress(1);
      currentLabel.textContent = formatTime(video.duration);
    });
    video.addEventListener('volumechange', syncMute);

    /* ---------- Scrubbing ---------- */
    seek.addEventListener('pointerdown', () => { scrubbing = true; });
    seek.addEventListener('input', () => {
      scrubbing = true;
      const duration = video.duration || 0;
      setProgress(Number(seek.value) / 1000);
      currentLabel.textContent = formatTime((Number(seek.value) / 1000) * duration);
    });
    seek.addEventListener('change', () => {
      const duration = video.duration || 0;
      video.currentTime = (Number(seek.value) / 1000) * duration;
      scrubbing = false;
    });
    ['pointerup', 'keyup', 'blur'].forEach((type) => {
      seek.addEventListener(type, () => { scrubbing = false; });
    });

    /* ---------- Sound ---------- */
    if (muteButton) {
      muteButton.addEventListener('click', () => {
        video.muted = !video.muted;
        syncMute();
      });
    }

    /* ---------- Fullscreen ---------- */
    if (fullButton) {
      if (!stage.requestFullscreen && !stage.webkitRequestFullscreen) {
        fullButton.hidden = true;
      } else {
        fullButton.addEventListener('click', () => {
          if (fullscreenElement()) {
            const exit = document.exitFullscreen || document.webkitExitFullscreen;
            if (exit) {
              const promise = exit.call(document);
              if (promise && typeof promise.catch === 'function') promise.catch(() => {});
            }
          } else {
            const enter = stage.requestFullscreen || stage.webkitRequestFullscreen;
            const promise = enter.call(stage);
            if (promise && typeof promise.catch === 'function') promise.catch(() => {});
          }
        });
      }
    }
    document.addEventListener('fullscreenchange', syncFullscreen);
    document.addEventListener('webkitfullscreenchange', syncFullscreen);

    /* ---------- Lazy boot: nothing is downloaded until the section shows up ---------- */
    const saveData = navigator.connection ? navigator.connection.saveData === true : false;
    if (saveData) {
      // Data saver: the badge and the playlist are the only way to start the download
    } else if ('IntersectionObserver' in window) {
      const bootObserver = new IntersectionObserver((entries, obs) => {
        if (!entries[0].isIntersecting) return;
        obs.disconnect();
        select(activeIndex, false);
      }, { rootMargin: '300px 0px' });
      bootObserver.observe(playerRoot);
    } else {
      select(activeIndex, false);
    }

    /* Playing footage is never left running off screen or in a hidden tab */
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting && !video.paused) video.pause();
      }).observe(playerRoot);
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && !video.paused) video.pause();
    });

    syncMute();
    syncFullscreen();
    /* Первый клип задаёт форму сцены ещё до того, как файл начнёт грузиться */
    syncOrientation(itemPortrait(activeIndex));
  }

  /* ---------- Photo lightbox (#baza, #nastya) ---------- */
  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCap = document.getElementById('lightbox-cap');
    const closeButton = lightbox.querySelector('[data-lightbox-close]');
    const prevButton = lightbox.querySelector('[data-lightbox-prev]');
    const nextButton = lightbox.querySelector('[data-lightbox-next]');

    const items = [...document.querySelectorAll('[data-lightbox]')].map((el) => {
      const img = el.querySelector('img');
      if (!img) return null;
      const cap = el.querySelector('figcaption');
      return {
        el,
        src: img.getAttribute('src'),
        alt: img.alt,
        caption: (cap ? cap.textContent : img.alt).trim(),
      };
    }).filter(Boolean);

    if (items.length) {
      let current = 0;
      let lastFocused = null;

      const render = () => {
        lightboxImg.src = items[current].src;
        lightboxImg.alt = items[current].alt;
        lightboxCap.textContent = items[current].caption;
        lightboxCap.hidden = !items[current].caption;
      };

      const open = (index) => {
        current = (index + items.length) % items.length;
        render();
        if (!lightbox.hidden) return; // already open — the frame just changed
        lastFocused = document.activeElement;
        lightbox.hidden = false;
        document.body.classList.add('is-locked');
        // A timeout rather than requestAnimationFrame: frame callbacks can be
        // deferred for seconds in a throttled tab, and both the fade-in and the
        // focus move have to happen either way
        window.setTimeout(() => {
          lightbox.classList.add('is-open');
          if (closeButton) closeButton.focus();
        }, 30);
      };

      const close = () => {
        if (lightbox.hidden) return;
        lightbox.classList.remove('is-open');
        document.body.classList.remove('is-locked');
        window.setTimeout(() => {
          if (lightbox.classList.contains('is-open')) return;
          lightbox.hidden = true;
          if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
        }, reduceMotion ? 0 : 300);
      };

      // A <figure> is not focusable on its own — turn every photo into a control
      items.forEach((item, index) => {
        item.el.setAttribute('role', 'button');
        item.el.setAttribute('tabindex', '0');
        item.el.setAttribute('aria-label', 'Открыть фото' + (item.alt ? ': ' + item.alt : ''));
        item.el.addEventListener('click', () => open(index));
        item.el.addEventListener('keydown', (e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          open(index);
        });
      });

      if (closeButton) closeButton.addEventListener('click', close);
      if (prevButton) prevButton.addEventListener('click', () => open(current - 1));
      if (nextButton) nextButton.addEventListener('click', () => open(current + 1));

      lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });

      document.addEventListener('keydown', (e) => {
        if (lightbox.hidden) return;
        if (e.key === 'Escape') close();
        if (e.key === 'ArrowLeft') open(current - 1);
        if (e.key === 'ArrowRight') open(current + 1);
      });
    }
  }

  /* ---------- Back to top ---------- */
  const backToTop = document.getElementById('back-to-top');
  if (backToTop) {
    let revealed = false;
    const syncBackToTop = () => {
      const show = window.scrollY > window.innerHeight * 0.8;
      if (show && !revealed) {
        revealed = true;
        backToTop.hidden = false;
      }
      backToTop.classList.toggle('is-visible', show);
    };
    syncBackToTop();
    window.addEventListener('scroll', syncBackToTop, { passive: true });
    window.addEventListener('resize', syncBackToTop);
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------- Projects carousel (footer band, #projects) ---------- */
  const projectsViewport = document.querySelector('.projects-viewport');
  if (projectsViewport) {
    const projectCards = [...projectsViewport.querySelectorAll('.project-card')];
    if (projectCards.length) {
      const total = projectCards.length;
      const interval = Math.max(2500, Number(projectsViewport.dataset.interval) || 5000);
      // Three or more cards: the neighbours can step aside, so autoplay is safe
      const autoplay = projectsViewport.dataset.autoplay === 'true' && !reduceMotion && total > 2;

      let active = projectCards.findIndex((card) => card.classList.contains('is-active'));
      if (active < 0) active = 0;
      let timer = 0;
      let pointerInside = false;
      let focusInside = false;
      let onScreen = true;

      const render = () => {
        projectCards.forEach((card, index) => {
          const offset = (index - active + total) % total;
          card.classList.toggle('is-active', offset === 0);
          card.classList.toggle('is-next', total > 2 && offset === 1);
          card.classList.toggle('is-prev', total > 2 && offset === total - 1);
        });
      };

      const stop = () => {
        window.clearInterval(timer);
        timer = 0;
      };

      const step = (delta) => {
        active = (active + delta + total) % total;
        render();
      };

      const start = () => {
        stop();
        if (!autoplay || pointerInside || focusInside || !onScreen || document.hidden) return;
        timer = window.setInterval(() => step(1), interval);
      };

      render();
      start();

      /* The band waits while the pointer or the keyboard is inside it */
      projectsViewport.addEventListener('mouseenter', () => { pointerInside = true; stop(); });
      projectsViewport.addEventListener('mouseleave', () => { pointerInside = false; start(); });
      projectsViewport.addEventListener('focusin', () => { focusInside = true; stop(); });
      projectsViewport.addEventListener('focusout', () => { focusInside = false; start(); });

      /* And it never cycles off screen or in a hidden tab */
      if ('IntersectionObserver' in window) {
        new IntersectionObserver((entries) => {
          onScreen = entries[0].isIntersecting;
          if (onScreen) start(); else stop();
        }).observe(projectsViewport);
      }
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) stop(); else start();
      });

      /* Clicking a neighbour brings it forward; the active card opens its link */
      projectCards.forEach((card, index) => {
        card.addEventListener('click', (e) => {
          if (index === active) return;
          e.preventDefault();
          active = index;
          render();
          start();
        });
      });

      projectsViewport.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); start(); }
        if (e.key === 'ArrowRight') { e.preventDefault(); step(1); start(); }
      });

      /* Swipe on touch screens */
      let touchStartX = 0;
      projectsViewport.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].clientX;
      }, { passive: true });
      projectsViewport.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) < 40) return;
        step(dx < 0 ? 1 : -1);
        start();
      }, { passive: true });
    }
  }

})();

