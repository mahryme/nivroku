(function () {
    var FLOOR = 1400,
        CEILING = 2500,
        BEAT = 180,
        SETTLE_MS = 900; // 600ms transition + 245ms longest stagger + buffer
    var body = document.body;
    var objects = Array.prototype.slice.call(
        document.querySelectorAll(".loader-obj"),
    );
    var countEl = document.querySelector('[data-loader="count"]');
    var cardEl = document.querySelector('[data-home="card"]');
    var reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
    ).matches;
    var start = performance.now();
    var settled = false;

    // data-obj is 1-indexed; groups mirror the Figma frames' reveal
    // thresholds (loader_screen-2 at 40%, loader_screen-3 at 60%). Object 1
    // is its own group, revealed immediately on its own decode.
    var GROUP_40 = [2, 4, 7];
    var GROUP_60 = [3, 5, 6, 8];

    function objByNum(n) {
        return objects[n - 1];
    }

    function decodeOf(obj) {
        var img = obj && obj.querySelector("img");
        return img && img.decode ? img.decode().catch(function () {}) : Promise.resolve();
    }

    function decodeGroup(nums) {
        return Promise.all(nums.map(function (n) { return decodeOf(objByNum(n)); }));
    }

    function setProgress(pct) {
        pct = Math.round(pct);
        // Set on body, not the bar: .loader-bar and .loader-obj are unrelated
        // branches of the DOM (counter vs. objects layer), and a custom
        // property set on one element doesn't reach the other — only actual
        // inheritance from a shared ancestor does. Both consumers (the bar's
        // width calc() and each object's animation-delay scrub) read it from
        // here via ordinary inheritance.
        body.style.setProperty("--loader-progress", pct);
        if (countEl) countEl.textContent = String(pct);
    }

    function setPhase(phase) {
        if (reduceMotion && phase === "hero") {
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
        if (phase === "hero") {
            window.setTimeout(function () {
                body.classList.add("is-post-settle");
                window.dispatchEvent(new Event("scroll")); // nudge the Firefox fallback
            }, SETTLE_MS);
        }
    }

    function finish() {
        if (settled) return;
        settled = true;
        objects.forEach(function (o) {
            o.classList.add("is-revealed");
        });
        setProgress(100);
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

    // Firefox fallback for the OBJECTS' hero→card scroll-driven settle (see
    // loader-head.css's obj-settle rule) — same idea as the card's fallback
    // above, generalized across all 8 objects. Reads each object's own
    // --hx/--hy/--hr → --kx/--ky/--kr as the interpolation endpoints
    // directly from the computed style, so the coordinate table isn't
    // duplicated here. Inert until .is-post-settle is added (see setPhase).
    function initObjectsScrollFallback() {
        var supportsScrollTimeline =
            window.CSS &&
            CSS.supports &&
            CSS.supports("animation-timeline: scroll()");
        if (reduceMotion || supportsScrollTimeline) return;
        var range = window.innerHeight * 0.9; // matches animation-range: 0dvh 90dvh
        var ticking = false;
        function lerp(a, b, t) {
            return a + (b - a) * t;
        }
        function readVar(el, name) {
            return parseFloat(getComputedStyle(el).getPropertyValue(name)) || 0;
        }
        function update() {
            ticking = false;
            if (!body.classList.contains("is-post-settle")) return;
            var progress = Math.min(1, Math.max(0, window.scrollY / range));
            objects.forEach(function (obj) {
                var hx = readVar(obj, "--hx"),
                    hy = readVar(obj, "--hy"),
                    hr = readVar(obj, "--hr");
                var kx = readVar(obj, "--kx"),
                    ky = readVar(obj, "--ky"),
                    kr = readVar(obj, "--kr");
                obj.style.setProperty("--obj-scroll-x", lerp(hx, kx, progress) + "vw");
                obj.style.setProperty("--obj-scroll-y", lerp(hy, ky, progress) + "vh");
                obj.style.setProperty("--obj-scroll-r", lerp(hr, kr, progress) + "deg");
            });
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
    initObjectsScrollFallback();

    body.setAttribute("data-loader-phase", "loading");
    var ceilingTimer = window.setTimeout(finish, CEILING);

    var fontsReady =
        document.fonts && document.fonts.ready
            ? document.fonts.ready.catch(function () {})
            : Promise.resolve();

    // Object 1 reveals as soon as its own decode (+ fonts) resolves,
    // independent of the group gates below.
    Promise.all([decodeOf(objByNum(1)), fontsReady]).then(function () {
        if (!settled) objByNum(1).classList.add("is-revealed");
    });

    var group40Ready = false,
        group60Ready = false;
    decodeGroup(GROUP_40).then(function () { return fontsReady; }).then(function () {
        group40Ready = true;
    });
    decodeGroup(GROUP_60).then(function () { return fontsReady; }).then(function () {
        group60Ready = true;
    });

    // Progress is a continuous, decode-gated ramp: it climbs linearly over
    // FLOOR ms (never finishing faster, even fully cached), capped from
    // above by which reveal groups are actually decoded — so it passes
    // through 40/60 as real values rather than jumping between 8 discrete
    // steps, while still reflecting real asset readiness rather than a fake
    // timer. CEILING forces completion regardless if decoding never resolves.
    var revealed40 = false,
        revealed60 = false;

    function tick() {
        if (settled) return;
        var elapsed = performance.now() - start;
        var timeRamp = Math.min(1, elapsed / FLOOR) * 100;
        var gateCap = group40Ready ? (group60Ready ? 100 : 60) : 40;
        var progress = Math.min(timeRamp, gateCap);

        if (progress >= 40 && !revealed40) {
            revealed40 = true;
            GROUP_40.forEach(function (n) { objByNum(n).classList.add("is-revealed"); });
        }
        if (progress >= 60 && !revealed60) {
            revealed60 = true;
            GROUP_60.forEach(function (n) { objByNum(n).classList.add("is-revealed"); });
        }

        setProgress(progress);

        if (progress >= 100) {
            window.clearTimeout(ceilingTimer);
            finish();
            return;
        }
        window.requestAnimationFrame(tick);
    }
    window.requestAnimationFrame(tick);
})();
