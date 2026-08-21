(function () {
    var FLOOR = 1400,
        CEILING = 2500,
        SPACING = 175,
        BEAT = 180;
    var body = document.body;
    var objects = Array.prototype.slice.call(
        document.querySelectorAll(".loader-obj"),
    );
    var bar = document.querySelector('[data-loader="bar"]');
    var countEl = document.querySelector('[data-loader="count"]');
    var cardEl = document.querySelector('[data-home="card"]');
    var reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
    ).matches;
    var start = performance.now();
    var settled = false,
        cardWatching = false;

    function setProgress(n) {
        var pct = Math.round((n / objects.length) * 100);
        if (bar) bar.style.setProperty("--loader-progress", pct);
        if (countEl) countEl.textContent = String(pct);
    }

    function setPhase(phase) {
        if (reduceMotion && (phase === "hero" || phase === "card")) {
            body.classList.add("is-phase-fading");
            window.setTimeout(function () {
                body.setAttribute("data-loader-phase", phase);
                window.setTimeout(function () {
                    body.classList.remove("is-phase-fading");
                }, 40);
            }, 110);
        } else {
            body.setAttribute("data-loader-phase", phase);
        }
        if (phase === "hero" && !cardWatching) {
            cardWatching = true;
            watchCard();
        }
    }

    function watchCard() {
        if (!cardEl || !("IntersectionObserver" in window)) return;
        var inCard = false;
        new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting && !inCard) {
                        inCard = true;
                        setPhase("card");
                    } else if (!entry.isIntersecting && inCard) {
                        inCard = false;
                        setPhase("hero");
                    }
                });
            },
            { threshold: 0.45 },
        ).observe(cardEl);
    }

    function finish() {
        if (settled) return;
        settled = true;
        objects.forEach(function (o) {
            o.classList.add("is-revealed");
        });
        setProgress(objects.length);
        setPhase("exit");
        window.setTimeout(function () {
            setPhase("hero");
        }, BEAT);
    }

    // Firefox fallback for the card's scroll-driven settle (see
    // loader-head.css) — Chrome/Edge/Safari handle it purely in CSS via
    // animation-timeline: scroll(root) and never enter this branch.
    // START_* must match the keyframe's `from` defaults in loader-head.css;
    // all three interpolate down to 0 (rotate/x/y) as progress reaches 1.
    function initCardScrollFallback() {
        var START_R = 30, START_X = -24, START_Y = -16;
        var supportsScrollTimeline =
            window.CSS &&
            CSS.supports &&
            CSS.supports("animation-timeline: scroll()");
        if (!cardEl || reduceMotion || supportsScrollTimeline) return;
        var range = window.innerHeight * 0.9; // matches animation-range: 0dvh 90dvh
        var ticking = false;
        function update() {
            ticking = false;
            var progress = Math.min(1, Math.max(0, window.scrollY / range));
            var remaining = 1 - progress;
            cardEl.style.setProperty("--card-peek-r", START_R * remaining + "deg");
            cardEl.style.setProperty("--card-peek-x", START_X * remaining + "vw");
            cardEl.style.setProperty("--card-peek-y", START_Y * remaining + "vh");
        }
        function onScroll() {
            if (!ticking) {
                ticking = true;
                window.requestAnimationFrame(update);
            }
        }
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", function () {
            range = window.innerHeight * 0.9;
            update();
        });
        update();
    }
    initCardScrollFallback();

    body.setAttribute("data-loader-phase", "loading");
    var ceilingTimer = window.setTimeout(finish, CEILING);

    var decodes = objects.map(function (obj) {
        var img = obj.querySelector("img");
        return img && img.decode
            ? img.decode().catch(function () {})
            : Promise.resolve();
    });
    var fontsReady =
        document.fonts && document.fonts.ready
            ? document.fonts.ready.catch(function () {})
            : Promise.resolve();

    // Reveal strictly in DOM order: each object waits for its own decode, a
    // proportional floor slice, and the minimum spacing since the previous one.
    var chain = Promise.resolve();
    objects.forEach(function (obj, i) {
        chain = chain.then(function () {
            if (settled) return;
            return Promise.all([decodes[i], fontsReady]).then(function () {
                if (settled) return;
                var minTime = Math.max(
                    start + FLOOR * ((i + 1) / objects.length),
                    start + i * SPACING,
                );
                var wait = Math.max(0, minTime - performance.now());
                return new Promise(function (resolve) {
                    window.setTimeout(function () {
                        if (!settled) {
                            obj.classList.add("is-revealed");
                            setProgress(i + 1);
                        }
                        resolve();
                    }, wait);
                });
            });
        });
    });

    chain.then(function () {
        if (settled) return;
        window.clearTimeout(ceilingTimer);
        finish();
    });
})();
