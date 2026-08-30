(function () {
    var FLOOR = 2400, // was 1400 pre-bounce — lengthened so the bounce-in
        CEILING = 3400, // per group is actually visible, not just implied
        html = document.documentElement;
    var objects = Array.prototype.slice.call(
        document.querySelectorAll(".loader-obj"),
    );
    var countEl = document.querySelector('[data-loader="count"]');
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
        // Set on <html>, the shared ancestor of both .loader-bar (inside
        // .loader-counter) and .loader-obj (inside .loader-objects) — a
        // custom property set on one doesn't reach an unrelated branch,
        // only inheritance from a shared ancestor does.
        html.style.setProperty("--loader-progress", pct);
        if (countEl) countEl.textContent = String(pct);
    }

    function finish() {
        if (settled) return;
        settled = true;
        objects.forEach(function (o) {
            o.classList.add("is-revealed");
        });
        setProgress(100);
        html.classList.add("loader-done");
    }

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
