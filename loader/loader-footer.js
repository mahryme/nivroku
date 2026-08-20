(function () {
    var FLOOR = 1400,
        CEILING = 2500,
        SPACING = 175,
        BEAT = 180;
    var body = document.body;
    var objects = Array.prototype.slice.call(
        document.querySelectorAll(".loader-obj"),
    );
    var bar = document.querySelector(".loader-bar");
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
