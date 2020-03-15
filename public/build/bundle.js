
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.20.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\Tailwindcss.svelte generated by Svelte v3.20.0 */

    function create_fragment(ctx) {
    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Tailwindcss> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Tailwindcss", $$slots, []);
    	return [];
    }

    class Tailwindcss extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tailwindcss",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }
    function expoInOut(t) {
        return t === 0.0 || t === 1.0
            ? t
            : t < 0.5
                ? +0.5 * Math.pow(2.0, 20.0 * t - 10.0)
                : -0.5 * Math.pow(2.0, 10.0 - t * 20.0) + 1.0;
    }
    function quadInOut(t) {
        t /= 0.5;
        if (t < 1)
            return 0.5 * t * t;
        t--;
        return -0.5 * (t * (t - 2) - 1);
    }
    function quartInOut(t) {
        return t < 0.5
            ? +8.0 * Math.pow(t, 4.0)
            : -8.0 * Math.pow(t - 1.0, 4.0) + 1.0;
    }

    function fade(node, { delay = 0, duration = 400, easing = identity }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }
    function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 }) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
        };
    }
    function scale(node, { delay = 0, duration = 400, easing = cubicOut, start = 0, opacity = 0 }) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const sd = 1 - start;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (_t, u) => `
			transform: ${transform} scale(${1 - (sd * u)});
			opacity: ${target_opacity - (od * u)}
		`
        };
    }

    /* src\Landing.svelte generated by Svelte v3.20.0 */
    const file = "src\\Landing.svelte";

    // (20:2) {#if show}
    function create_if_block(ctx) {
    	let div12;
    	let div11;
    	let div10;
    	let div9;
    	let div3;
    	let div0;
    	let t1;
    	let div1;
    	let t3;
    	let div2;
    	let t5;
    	let div6;
    	let div4;
    	let t7;
    	let div5;
    	let t9;
    	let div7;
    	let t11;
    	let hr;
    	let t12;
    	let div8;
    	let a0;
    	let svg0;
    	let path0;
    	let t13;
    	let a1;
    	let svg1;
    	let g3;
    	let g0;
    	let g2;
    	let g1;
    	let path1;
    	let t14;
    	let a2;
    	let svg2;
    	let g7;
    	let g4;
    	let g6;
    	let g5;
    	let path2;
    	let t15;
    	let a3;
    	let svg3;
    	let style;
    	let t16;
    	let path3;
    	let path4;
    	let div10_intro;
    	let div11_transition;
    	let div12_intro;
    	let current;

    	const block = {
    		c: function create() {
    			div12 = element("div");
    			div11 = element("div");
    			div10 = element("div");
    			div9 = element("div");
    			div3 = element("div");
    			div0 = element("div");
    			div0.textContent = "Vincent";
    			t1 = space();
    			div1 = element("div");
    			div1.textContent = "Dominic";
    			t3 = space();
    			div2 = element("div");
    			div2.textContent = "Passanisi";
    			t5 = space();
    			div6 = element("div");
    			div4 = element("div");
    			div4.textContent = "BSc Audio Engineering and Technology";
    			t7 = space();
    			div5 = element("div");
    			div5.textContent = "- Belmont University, Nashiville TN";
    			t9 = space();
    			div7 = element("div");
    			div7.textContent = "Interested in Web Development, Programming, Audio, Learning. Love\r\n              e-sports, listening to music.";
    			t11 = space();
    			hr = element("hr");
    			t12 = space();
    			div8 = element("div");
    			a0 = element("a");
    			svg0 = svg_element("svg");
    			path0 = svg_element("path");
    			t13 = space();
    			a1 = element("a");
    			svg1 = svg_element("svg");
    			g3 = svg_element("g");
    			g0 = svg_element("g");
    			g2 = svg_element("g");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			t14 = space();
    			a2 = element("a");
    			svg2 = svg_element("svg");
    			g7 = svg_element("g");
    			g4 = svg_element("g");
    			g6 = svg_element("g");
    			g5 = svg_element("g");
    			path2 = svg_element("path");
    			t15 = space();
    			a3 = element("a");
    			svg3 = svg_element("svg");
    			style = svg_element("style");
    			t16 = text(".st0 {\n  fill: none;\n  stroke: #fff;\n  stroke-width: 8;\n  stroke-linecap: round;\n  stroke-linejoin: round;\n  stroke-miterlimit: 10;\n}\r\n                  \r\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9MYW5kaW5nLnN2ZWx0ZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDb0I7RUFDRSxVQUFVO0VBQ1YsWUFBWTtFQUNaLGVBQWU7RUFDZixxQkFBcUI7RUFDckIsc0JBQXNCO0VBQ3RCLHFCQUFxQjtBQUN2QiIsImZpbGUiOiJzcmMvTGFuZGluZy5zdmVsdGUiLCJzb3VyY2VzQ29udGVudCI6WyJcclxuICAgICAgICAgICAgICAgICAgICAuc3QwIHtcclxuICAgICAgICAgICAgICAgICAgICAgIGZpbGw6IG5vbmU7XHJcbiAgICAgICAgICAgICAgICAgICAgICBzdHJva2U6ICNmZmY7XHJcbiAgICAgICAgICAgICAgICAgICAgICBzdHJva2Utd2lkdGg6IDg7XHJcbiAgICAgICAgICAgICAgICAgICAgICBzdHJva2UtbGluZWNhcDogcm91bmQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICBzdHJva2UtbGluZWpvaW46IHJvdW5kO1xyXG4gICAgICAgICAgICAgICAgICAgICAgc3Ryb2tlLW1pdGVybGltaXQ6IDEwO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgIl19 */");
    			path3 = svg_element("path");
    			path4 = svg_element("path");
    			add_location(div0, file, 34, 14, 1511);
    			add_location(div1, file, 35, 14, 1545);
    			add_location(div2, file, 36, 14, 1579);
    			attr_dev(div3, "class", "text-center font-thin text-white text-5xl sm:text-6xl\r\n              leading-tight tracking-widest mb-8");
    			add_location(div3, file, 31, 12, 1363);
    			add_location(div4, file, 39, 14, 1712);
    			add_location(div5, file, 40, 14, 1775);
    			attr_dev(div6, "class", "text-white text-center text-xl font-hairline mb-4");
    			add_location(div6, file, 38, 12, 1633);
    			attr_dev(div7, "class", "text-white text-center text-xl font-hairline w-full\r\n              md:w-3/5");
    			add_location(div7, file, 42, 12, 1855);
    			attr_dev(hr, "class", "my-8 w-1/3");
    			add_location(hr, file, 48, 12, 2119);
    			attr_dev(path0, "d", "M93.09,76.224c0.047-0.145,0.079-0.298,0.079-0.459V22.638c0-0.162-0.032-0.316-0.08-0.462\r\n                    c-0.007-0.02-0.011-0.04-0.019-0.06c-0.064-0.171-0.158-0.325-0.276-0.46c-0.008-0.009-0.009-0.02-0.017-0.029\r\n                    c-0.005-0.005-0.011-0.007-0.016-0.012c-0.126-0.134-0.275-0.242-0.442-0.323c-0.013-0.006-0.023-0.014-0.036-0.02\r\n                    c-0.158-0.071-0.33-0.111-0.511-0.123c-0.018-0.001-0.035-0.005-0.053-0.005c-0.017-0.001-0.032-0.005-0.049-0.005H8.465\r\n                    c-0.017,0-0.033,0.004-0.05,0.005c-0.016,0.001-0.032,0.004-0.048,0.005c-0.183,0.012-0.358,0.053-0.518,0.125\r\n                    c-0.01,0.004-0.018,0.011-0.028,0.015c-0.17,0.081-0.321,0.191-0.448,0.327c-0.005,0.005-0.011,0.006-0.016,0.011\r\n                    c-0.008,0.008-0.009,0.019-0.017,0.028c-0.118,0.135-0.213,0.29-0.277,0.461c-0.008,0.02-0.012,0.04-0.019,0.061\r\n                    c-0.048,0.146-0.08,0.3-0.08,0.462v53.128c0,0.164,0.033,0.32,0.082,0.468c0.007,0.02,0.011,0.039,0.018,0.059\r\n                    c0.065,0.172,0.161,0.327,0.28,0.462c0.007,0.008,0.009,0.018,0.016,0.026c0.006,0.007,0.014,0.011,0.021,0.018\r\n                    c0.049,0.051,0.103,0.096,0.159,0.14c0.025,0.019,0.047,0.042,0.073,0.06c0.066,0.046,0.137,0.083,0.21,0.117\r\n                    c0.018,0.008,0.034,0.021,0.052,0.028c0.181,0.077,0.38,0.121,0.589,0.121h83.204c0.209,0,0.408-0.043,0.589-0.121\r\n                    c0.028-0.012,0.054-0.03,0.081-0.044c0.062-0.031,0.124-0.063,0.181-0.102c0.03-0.021,0.057-0.048,0.086-0.071\r\n                    c0.051-0.041,0.101-0.082,0.145-0.129c0.008-0.008,0.017-0.014,0.025-0.022c0.008-0.009,0.01-0.021,0.018-0.03\r\n                    c0.117-0.134,0.211-0.288,0.275-0.458C93.078,76.267,93.083,76.246,93.09,76.224z\r\n                    M9.965,26.04l25.247,23.061L9.965,72.346V26.04z\r\n                    M61.711,47.971c-0.104,0.068-0.214,0.125-0.301,0.221c-0.033,0.036-0.044,0.083-0.073,0.121l-11.27,10.294L12.331,24.138h75.472\r\n                    L61.711,47.971z\r\n                    M37.436,51.132l11.619,10.613c0.287,0.262,0.649,0.393,1.012,0.393s0.725-0.131,1.011-0.393l11.475-10.481\r\n                    l25.243,23.002H12.309L37.436,51.132z\r\n                    M64.778,49.232L90.169,26.04v46.33L64.778,49.232z");
    			add_location(path0, file, 56, 18, 2513);
    			attr_dev(svg0, "class", "fill-current text-white h-12 w-12");
    			attr_dev(svg0, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg0, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg0, "viewBox", "0 0 100 100");
    			add_location(svg0, file, 51, 16, 2270);
    			attr_dev(a0, "class", "mr-8");
    			attr_dev(a0, "href", "mailto:vpassanisi@gmail.com");
    			add_location(a0, file, 50, 14, 2201);
    			attr_dev(g0, "sketch:type", "MSLayerGroup");
    			attr_dev(g0, "transform", "translate(-720.000000, 0.000000)");
    			add_location(g0, file, 96, 20, 5554);
    			attr_dev(path1, "d", "M35.9955151,27.6266598 C35.9955151,23.8394326\r\n                          33.0511715,20.8297982 29.7726613,20.8297982\r\n                          C27.2676024,20.8297982 25.0529201,20.8297982\r\n                          23.5815904,23.9999995 C23.3099556,24.5852775\r\n                          22.9955155,26.2895184 22.9955155,27.1324171\r\n                          L22.9955155,43.4999995 L15.036777,43.4999989\r\n                          L15.0367767,22.7102582 L15.0367767,12.455873\r\n                          L23.3012671,12.455873 L23.7089346,16.5\r\n                          L23.8873426,16.5 C25.0805776,14.5783603\r\n                          27.7924258,12.455873 32.6850041,12.455873\r\n                          C38.6490801,12.455873 43.9955153,17.1766025\r\n                          43.9955153,25.8297979 L43.9955153,43.4999995\r\n                          L35.9955151,43.4999995 L35.9955151,27.6266598 Z\r\n                          M4.32081087,8.76648024 C1.71699591,8.76648024\r\n                          0.036776724,6.92405932 0.036776724,4.64751022\r\n                          C0.036776724,2.3156217 1.7713812,0.525677812\r\n                          4.42767319,0.525677812 C7.08396519,0.525677812\r\n                          8.71170734,2.31466757 8.76609263,4.64751022\r\n                          C8.76704675,6.92405932 7.08491932,8.76648024\r\n                          4.32081087,8.76648024 L4.32081087,8.76648024 Z\r\n                          M0.995515537,43.4999995 L0.995515303,12.4558734\r\n                          L7.98371812,12.4558737 L7.98371835,43.4999999\r\n                          L0.995515537,43.4999995 Z");
    			attr_dev(path1, "id", "Shape");
    			add_location(path1, file, 107, 24, 6071);
    			attr_dev(g1, "transform", "translate(725.004485, 5.500000)");
    			attr_dev(g1, "sketch:type", "MSShapeGroup");
    			add_location(g1, file, 104, 22, 5921);
    			attr_dev(g2, "sketch:type", "MSLayerGroup");
    			attr_dev(g2, "transform", "translate(-716.000000, 1.000000)");
    			attr_dev(g2, "stroke", "#fff");
    			attr_dev(g2, "stroke-width", "2");
    			add_location(g2, file, 99, 20, 5699);
    			attr_dev(g3, "stroke", "none");
    			attr_dev(g3, "stroke-width", "1");
    			attr_dev(g3, "fill", "none");
    			attr_dev(g3, "fill-rule", "evenodd");
    			attr_dev(g3, "sketch:type", "MSPage");
    			add_location(g3, file, 90, 18, 5340);
    			attr_dev(svg1, "class", "h-12 w-12");
    			attr_dev(svg1, "width", "60px");
    			attr_dev(svg1, "height", "60px");
    			attr_dev(svg1, "viewBox", "0 0 60 60");
    			attr_dev(svg1, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg1, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg1, "xmlns:sketch", "http://www.bohemiancoding.com/sketch/ns");
    			add_location(svg1, file, 82, 16, 4984);
    			attr_dev(a1, "class", "mr-8");
    			attr_dev(a1, "href", "https://www.linkedin.com/in/vinny-passanisi-7a9966b8/");
    			add_location(a1, file, 79, 14, 4855);
    			attr_dev(g4, "sketch:type", "MSLayerGroup");
    			add_location(g4, file, 152, 20, 8530);
    			attr_dev(path2, "d", "M45.710328,7.26461023 C45.710328,7.26461023\r\n                          49.7891594,6.93752192 51.4260032,5.69777149\r\n                          C51.4260032,5.69777149 51.0336919,7.12495455\r\n                          46.1255745,11.6404882 C46.1255745,11.6404882\r\n                          47.7781108,36.0055044 22.5977549,41.9727222\r\n                          C22.5977549,41.9727222 9.82771721,44.7413348\r\n                          0.573996756,37.6789225 C0.573996756,37.6789225\r\n                          10.2610704,39.4282937 15.711181,33.3103948\r\n                          C15.711181,33.3103948 8.68096083,33.3826727\r\n                          6.45746056,26.1034266 C6.45746056,26.1034266\r\n                          9.11189981,26.6853253 10.6895952,25.9576457\r\n                          C10.6895952,25.9576457 2.72627742,24.2817775\r\n                          2.86992375,15.4724441 C2.86992375,15.4724441\r\n                          5.02220441,17.0748093 6.95841203,16.7832475\r\n                          C6.95841203,16.7832475 -0.214247369,10.5930706\r\n                          4.23275317,2.87770677 C4.23275317,2.87770677\r\n                          13.8437788,14.411551 25.7555598,13.7267481\r\n                          C25.5479366,12.9010645 25.4356751,12.0361793\r\n                          25.4356751,11.141893 C25.4356751,5.40743468\r\n                          30.0190793,0.755920455 35.6719848,0.755920455\r\n                          C38.5280117,0.755920455 41.1112314,1.94421879\r\n                          42.9689767,3.85897169 C44.330599,3.88224763\r\n                          47.1310988,3.63601262 49.9279773,1.60365494\r\n                          C49.9279773,1.60487999 50.0885232,3.82589534\r\n                          45.710328,7.26461023 L45.710328,7.26461023 Z");
    			attr_dev(path2, "id", "Shape");
    			add_location(path2, file, 163, 24, 9045);
    			attr_dev(g5, "transform", "translate(0.000000, 10.000000)");
    			attr_dev(g5, "sketch:type", "MSShapeGroup");
    			add_location(g5, file, 160, 22, 8896);
    			attr_dev(g6, "sketch:type", "MSLayerGroup");
    			attr_dev(g6, "transform", "translate(4.000000, 1.000000)");
    			attr_dev(g6, "stroke", "#fff");
    			attr_dev(g6, "stroke-width", "2");
    			attr_dev(g6, "stroke-linecap", "round");
    			attr_dev(g6, "stroke-linejoin", "round");
    			add_location(g6, file, 153, 20, 8584);
    			attr_dev(g7, "stroke", "none");
    			attr_dev(g7, "stroke-width", "1");
    			attr_dev(g7, "fill", "none");
    			attr_dev(g7, "fill-rule", "evenodd");
    			attr_dev(g7, "sketch:type", "MSPage");
    			add_location(g7, file, 146, 18, 8316);
    			attr_dev(svg2, "class", "h-12 w-12 mr-8");
    			attr_dev(svg2, "width", "60px");
    			attr_dev(svg2, "height", "60px");
    			attr_dev(svg2, "viewBox", "0 0 60 60");
    			attr_dev(svg2, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg2, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg2, "xmlns:sketch", "http://www.bohemiancoding.com/sketch/ns");
    			add_location(svg2, file, 138, 16, 7955);
    			attr_dev(a2, "href", "https://twitter.com/VinnyPassanisi");
    			add_location(a2, file, 137, 14, 7892);
    			attr_dev(style, "type", "text/css");
    			add_location(style, file, 209, 18, 11608);
    			attr_dev(path3, "class", "st0");
    			attr_dev(path3, "d", "M128.1,222.073");
    			set_style(path3, "fill", "none");
    			set_style(path3, "stroke", "#fff");
    			set_style(path3, "stroke-linecap", "round");
    			set_style(path3, "stroke-linejoin", "round");
    			set_style(path3, "stroke-miterlimit", "10");
    			set_style(path3, "stroke-width", "8");
    			add_location(path3, file, 219, 18, 12587);
    			attr_dev(path4, "class", "st0");
    			attr_dev(path4, "d", "M130.164,226.986c63.917-3.557,108.667-52.057,97.259-116.5c-9.288-52.47-60.722-87.613-112.739-80.577\r\n                    C61.952,37.041,21.39,85.877,27.386,139.004c5.689,47.857,35.128,70.23,59.685,80.335c5.717,2.353,13.401,5.785,15.997,5.229\r\n                    c2.596-0.556,1.763-14.95,1.763-21.889c-16,2.459-21.475-3.841-24.875-7.563c-3.857-4.222-6.125-8.563-10.063-14.938\r\n                    s-11.063-4.875-11.813-8.563s15-2.688,26.313,11.25c8.188,10.146,16.928,7.089,21.625,4.188c0.154-1.612,0.526-3.775,1.438-6.188\r\n                    c0.967-2.557,3.625-4.104,3.208-5.854c-0.417-1.75-21.804-0.577-34-17.667c-8.809-12.344-9.129-26.955-5.667-37.833\r\n                    c2.322-7.297,6.196-12.443,8.833-15.417c-1.011-2.162-2.513-6.109-2.583-11.25c-0.076-5.549,1.554-9.796,2.583-12\r\n                    c3.492,0.104,8.54,0.644,14.25,2.667c5.469,1.937,9.593,4.542,12.333,6.583c4.975-1.671,12.218-3.489,21.083-3.667\r\n                    c10.135-0.203,18.344,1.819,23.667,3.583c2.616-2.336,6.987-5.648,13.167-7.917c4.489-1.648,8.518-2.229,11.5-2.417\r\n                    c1.143,2.165,3.075,6.519,3.167,12.332c0.085,5.351-1.426,9.47-2.416,11.664c2.867,3.459,7.394,9.875,9.502,18.995\r\n                    c0.751,3.249,4.857,20.981-6.996,36.24c-12.408,15.974-33.06,13.524-33.992,15.73c-0.932,2.206,3.964,6.297,6.266,14.877\r\n                    c2.302,8.58,1.327,24.979,1.327,24.979");
    			set_style(path4, "fill", "none");
    			set_style(path4, "stroke", "#fff");
    			set_style(path4, "stroke-linecap", "round");
    			set_style(path4, "stroke-linejoin", "round");
    			set_style(path4, "stroke-miterlimit", "10");
    			set_style(path4, "stroke-width", "8");
    			add_location(path4, file, 225, 18, 12872);
    			attr_dev(svg3, "class", "h-12 w-12");
    			attr_dev(svg3, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg3, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg3, "version", "1.1");
    			attr_dev(svg3, "id", "Layer_1");
    			attr_dev(svg3, "x", "0px");
    			attr_dev(svg3, "y", "0px");
    			attr_dev(svg3, "width", "256px");
    			attr_dev(svg3, "height", "256px");
    			attr_dev(svg3, "viewBox", "0 0 256 256");
    			set_style(svg3, "enable-background", "new 0 0 256 256");
    			attr_dev(svg3, "xml:space", "preserve");
    			add_location(svg3, file, 196, 16, 11101);
    			attr_dev(a3, "href", "https://github.com/vpassanisi?tab=repositories");
    			add_location(a3, file, 195, 14, 11026);
    			attr_dev(div8, "class", "flex flex-row");
    			add_location(div8, file, 49, 12, 2158);
    			attr_dev(div9, "class", "bg-black-alpha-70 border w-3/4 md:w-1/2 xl:w-1/3 flex\r\n            flex-col items-center justify-center p-4");
    			add_location(div9, file, 28, 10, 1215);
    			attr_dev(div10, "class", "bg-black-alpha-40 flex flex-col items-center justify-center\r\n          w-full h-full");
    			add_location(div10, file, 24, 8, 1022);
    			attr_dev(div11, "class", "w-full h-full");
    			add_location(div11, file, 21, 6, 905);
    			attr_dev(div12, "class", "background w-full h-full svelte-1kanj3e");
    			add_location(div12, file, 20, 4, 831);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div12, anchor);
    			append_dev(div12, div11);
    			append_dev(div11, div10);
    			append_dev(div10, div9);
    			append_dev(div9, div3);
    			append_dev(div3, div0);
    			append_dev(div3, t1);
    			append_dev(div3, div1);
    			append_dev(div3, t3);
    			append_dev(div3, div2);
    			append_dev(div9, t5);
    			append_dev(div9, div6);
    			append_dev(div6, div4);
    			append_dev(div6, t7);
    			append_dev(div6, div5);
    			append_dev(div9, t9);
    			append_dev(div9, div7);
    			append_dev(div9, t11);
    			append_dev(div9, hr);
    			append_dev(div9, t12);
    			append_dev(div9, div8);
    			append_dev(div8, a0);
    			append_dev(a0, svg0);
    			append_dev(svg0, path0);
    			append_dev(div8, t13);
    			append_dev(div8, a1);
    			append_dev(a1, svg1);
    			append_dev(svg1, g3);
    			append_dev(g3, g0);
    			append_dev(g3, g2);
    			append_dev(g2, g1);
    			append_dev(g1, path1);
    			append_dev(div8, t14);
    			append_dev(div8, a2);
    			append_dev(a2, svg2);
    			append_dev(svg2, g7);
    			append_dev(g7, g4);
    			append_dev(g7, g6);
    			append_dev(g6, g5);
    			append_dev(g5, path2);
    			append_dev(div8, t15);
    			append_dev(div8, a3);
    			append_dev(a3, svg3);
    			append_dev(svg3, style);
    			append_dev(style, t16);
    			append_dev(svg3, path3);
    			append_dev(svg3, path4);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;

    			if (!div10_intro) {
    				add_render_callback(() => {
    					div10_intro = create_in_transition(div10, fade, {
    						delay: 200,
    						duration: 2000,
    						easing: quartInOut
    					});

    					div10_intro.start();
    				});
    			}

    			add_render_callback(() => {
    				if (!div11_transition) div11_transition = create_bidirectional_transition(div11, scale, { delay: 200, duration: 2000, start: 1.2 }, true);
    				div11_transition.run(1);
    			});

    			if (!div12_intro) {
    				add_render_callback(() => {
    					div12_intro = create_in_transition(div12, fade, { duration: 300 });
    					div12_intro.start();
    				});
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div11_transition) div11_transition = create_bidirectional_transition(div11, scale, { delay: 200, duration: 2000, start: 1.2 }, false);
    			div11_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div12);
    			if (detaching && div11_transition) div11_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(20:2) {#if show}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let section;
    	let current;
    	let if_block = /*show*/ ctx[0] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			section = element("section");
    			if (if_block) if_block.c();
    			attr_dev(section, "class", "w-full h-screen bg-black overflow-hidden");
    			add_location(section, file, 18, 0, 753);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			if (if_block) if_block.m(section, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*show*/ ctx[0]) {
    				if (!if_block) {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(section, null);
    				} else {
    					transition_in(if_block, 1);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let show = false;

    	onMount(() => {
    		setTimeout(() => $$invalidate(0, show = true), 1000);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Landing> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Landing", $$slots, []);
    	$$self.$capture_state = () => ({ fade, scale, quartInOut, onMount, show });

    	$$self.$inject_state = $$props => {
    		if ("show" in $$props) $$invalidate(0, show = $$props.show);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [show];
    }

    class Landing extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Landing",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    const projects = [
      {
        url: "https://bug-tracker-api.herokuapp.com/",
        github: "https://github.com/vpassanisi/Bug-Tracker-API/tree/master/client",
        title: "BugTracker",
        description:
          "An app to track bugs in your projects. You can tag a fixer to a bug and the account will automatically have that project added to their porjects page.",
        background: "./images/BugTracker-bg.jpg",
        baseIcon: "./icons/BugTracker-icon.svg",
        overlayIcon: "./icons/svelte-icon.svg",
        technologies: [
          {
            tech: "Svelte",
            link: "https://github.com/sveltejs/svelte"
          },
          {
            tech: "MaterializeCSS",
            link: "https://github.com/Dogfalo/materialize"
          },
          {
            tech: "Svelte Media Query",
            link: "https://github.com/xelaok/svelte-media-query"
          },
          {
            tech: "Rollup",
            link: "https://github.com/rollup/rollup"
          },
          {
            tech: "SPA Router",
            link: "https://github.com/ItalyPaleAle/svelte-spa-router"
          },
          {
            tech: "NPM",
            link: "https://www.npmjs.com/"
          },
          {
            tech: "HTML",
            link: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference"
          },
          {
            tech: "CSS",
            link: "https://developer.mozilla.org/en-US/docs/Web/CSS"
          }
        ]
      },

      {
        url: "https://bug-tracker-api.herokuapp.com/docs/index.html",
        github: "https://github.com/vpassanisi/Bug-Tracker-API",
        title: "BugTracker REST API",
        description: "REAST API server for BugTracker App",
        background: "./images/BugTrackerAPI-bg.jpg",
        baseIcon: "./icons/API-icon.svg",
        overlayIcon: "./icons/koajs-icon.svg",
        technologies: [
          {
            tech: "Node",
            link: "https://github.com/nodejs/node"
          },
          {
            tech: "Koa",
            link: "https://github.com/koajs/koa"
          },
          {
            tech: "MongoDB",
            link: "https://www.mongodb.com/"
          },
          {
            tech: "Mongoose",
            link: "https://github.com/Automattic/mongoose"
          },
          {
            tech: "Passport",
            link: "https://github.com/jaredhanson/passport"
          },
          {
            tech: "JWT",
            link: "https://github.com/auth0/node-jsonwebtoken"
          },
          {
            tech: "Nodemon",
            link: "https://github.com/remy/nodemon"
          },
          {
            tech: "Koa Router",
            link: "https://github.com/koajs/router"
          },
          {
            tech: "Bcrypt",
            link: "https://github.com/kelektiv/node.bcrypt.js"
          }
        ]
      },
      {
        url: "https://journalll.herokuapp.com/",
        github:
          "https://github.com/vpassanisi/Gratitude-Journal_API/tree/master/client",
        title: "Journal App",
        description: "Journaling app",
        background: "./images/Journal-bg.jpg",
        baseIcon: "./icons/Journal-icon.png",
        overlayIcon: "./icons/tailwindcss-icon.svg",
        technologies: [
          {
            tech: "Svelte",
            link: "https://github.com/sveltejs/svelte"
          },
          {
            tech: "Tailwind CSS",
            link: "https://github.com/tailwindcss/tailwindcss"
          },
          {
            tech: "Smelte",
            link: "https://github.com/matyunya/smelte"
          },
          {
            tech: "SPA Router",
            link: "https://github.com/ItalyPaleAle/svelte-spa-router"
          },
          {
            tech: "Rollup",
            link: "https://github.com/rollup/rollup"
          },
          {
            tech: "NPM",
            link: "https://www.npmjs.com/"
          },
          {
            tech: "HTML",
            link: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference"
          },
          {
            tech: "CSS",
            link: "https://developer.mozilla.org/en-US/docs/Web/CSS"
          }
        ]
      },
      {
        url: "https://journalll.herokuapp.com/docs/",
        github: "https://github.com/vpassanisi/Gratitude-Journal_API",
        title: "Journal REST API",
        description: "REST API for journaling app",
        background: "./images/JournalAPI-bg.jpg",
        baseIcon: "./icons/API-icon.svg",
        overlayIcon: "./icons/expressjs-icon.svg",
        technologies: [
          {
            tech: "Node",
            link: "https://github.com/nodejs/node"
          },
          {
            tech: "Express",
            link: "https://github.com/expressjs/express"
          },
          {
            tech: "MongoDB",
            link: "https://www.mongodb.com/"
          },
          {
            tech: "Mongoose",
            link: "https://github.com/Automattic/mongoose"
          },
          {
            tech: "JWT",
            link: "https://github.com/auth0/node-jsonwebtoken"
          },
          {
            tech: "Bcrypt",
            link: "https://github.com/kelektiv/node.bcrypt.js"
          },
          {
            tech: "Nodemon",
            link: "https://github.com/remy/nodemon"
          }
        ]
      },
      {
        url: "https://the-best-react-weather-app.netlify.com/",
        github: "https://github.com/vpassanisi/React-Weather-App",
        title: "Weather App",
        description:
          "A weather app. Put in any location in any format. You can change between celcius and farenheit and add any locatin to you favorites list.  all changes are saved for you and are loaded when the page loads",
        background: "./images/WeatherApp-bg.jpg",
        baseIcon: "./icons/WeatherApp-icon.svg",
        overlayIcon: "./icons/reactjs-icon.svg",
        technologies: [
          {
            tech: "React",
            link: "https://github.com/facebook/react"
          },
          {
            tech: "Tailwind CSS",
            link: "https://github.com/tailwindcss/tailwindcss"
          },
          {
            tech: "Styled Components",
            link: "https://github.com/styled-components/styled-components"
          },
          {
            tech: "Post CSS",
            link: "https://github.com/postcss/postcss"
          },
          {
            tech: "Purge CSS",
            link: "https://github.com/FullHuman/purgecss"
          }
        ]
      },
      {
        url: "https://calorie-tracker-site.netlify.com/",
        github: "https://github.com/vpassanisi/Calorie-Tracker",
        title: "Calorie Tracker",
        description: "A web app to track the calories in meals",
        background: "./images/CalorieTracker-bg.jpg",
        baseIcon: "",
        overlayIcon: "./icons/JavaScript-icon.jpg",
        technologies: [
          {
            tech: "Javascript",
            link: "https://developer.mozilla.org/en-US/docs/Web/JavaScript"
          },
          {
            tech: "MaterializeCSS",
            link: "https://github.com/Dogfalo/materialize"
          },
          {
            tech: "HTML",
            link: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference"
          },
          {
            tech: "CSS",
            link: "https://developer.mozilla.org/en-US/docs/Web/CSS"
          }
        ]
      },
      {
        url: "https://githubfinder-react-app.netlify.com/",
        github: "https://github.com/vpassanisi/github-finder",
        title: "Github-Finder",
        description:
          "Use the github user api to search for a github user and view information about them",
        background: "./images/GitHubFinder-bg.jpg",
        baseIcon: "./icons/WeatherApp-icon.svg",
        overlayIcon: "./icons/reactjs-icon.svg",
        technologies: [
          {
            tech: "React",
            link: "https://github.com/facebook/react"
          },
          {
            tech: "Axios",
            link: "https://github.com/axios/axios"
          },
          {
            tech: "React Router",
            link:
              "https://github.com/ReactTraining/react-router/tree/master/packages/react-router-dom"
          },
          {
            tech: "CSS",
            link: "https://developer.mozilla.org/en-US/docs/Web/CSS"
          },
          {
            tech: "NPM",
            link: "https://www.npmjs.com/"
          }
        ]
      },
      {
        url: "https://edgeledger-site.netlify.com/",
        github: "https://github.com/vpassanisi/EdgeLedger_Website",
        title: "EdgeLedger Website",
        description: "Simple HTML and CSS static website",
        background: "./images/EdgeLedger-bg.jpg",
        baseIcon: "",
        overlayIcon: "./icons/JQuery-icon.svg",
        technologies: [
          {
            tech: "JQuery",
            link: "https://github.com/jquery/jquery"
          },
          {
            tech: "HTML",
            link: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference"
          },
          {
            tech: "CSS",
            link: "https://developer.mozilla.org/en-US/docs/Web/CSS"
          },
          {
            tech: "Javascript",
            link: "https://developer.mozilla.org/en-US/docs/Web/JavaScript"
          }
        ]
      },
      {
        url: "https://hotel-bt-site.netlify.com/",
        github: "https://github.com/vpassanisi/Hotel_BT_Website",
        title: "Hotel BT Website",
        description: "Simple HTML and CSS static website",
        background: "./images/HotelBT-bg.jpg",
        baseIcon: "",
        overlayIcon: "./icons/FA-icon.svg",
        technologies: [
          {
            tech: "Font Awesome",
            link: "https://fontawesome.com/"
          },
          {
            tech: "HTML",
            link: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference"
          },
          {
            tech: "CSS",
            link: "https://developer.mozilla.org/en-US/docs/Web/CSS"
          }
        ]
      },
      {
        url: "https://presentation-site.netlify.com/",
        github: "https://github.com/vpassanisi/Presesntation_Website",
        title: "Presentation Website",
        description: "Simple HTML and CSS static website",
        background: "./images/Presentation-bg.jpg",
        baseIcon: "",
        overlayIcon: "./icons/FA-icon.svg",
        technologies: [
          {
            tech: "Font Awesome",
            link: "https://fontawesome.com/"
          },
          {
            tech: "HTML",
            link: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference"
          },
          {
            tech: "CSS",
            link: "https://developer.mozilla.org/en-US/docs/Web/CSS"
          }
        ]
      },
      {
        url: "https://personal-demo-site.netlify.com/",
        github: "https://github.com/vpassanisi/portfolio_website",
        title: "Demo Personal Website",
        description: "Simple HTML and CSS and JavaScript static website",
        background: "./images/Personal-bg.jpg",
        baseIcon: "",
        overlayIcon: "./icons/FA-icon.svg",
        technologies: [
          {
            tech: "Font Awesome",
            link: "https://fontawesome.com/"
          },
          {
            tech: "Javascript",
            link: "https://developer.mozilla.org/en-US/docs/Web/JavaScript"
          },
          {
            tech: "HTML",
            link: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference"
          },
          {
            tech: "CSS",
            link: "https://developer.mozilla.org/en-US/docs/Web/CSS"
          }
        ]
      },
      {
        url: "https://newsgrid-demo.netlify.com/",
        github: "https://github.com/vpassanisi/newsgrid",
        title: "NewsGrid Website",
        description: "Simple HTML and CSS and static website",
        background: "./images/NewsGrid-bg.jpg",
        baseIcon: "",
        overlayIcon: "./icons/FA-icon.svg",
        technologies: [
          {
            tech: "Font Awesome",
            link: "https://fontawesome.com/"
          },
          {
            tech: "HTML",
            link: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference"
          },
          {
            tech: "CSS",
            link: "https://developer.mozilla.org/en-US/docs/Web/CSS"
          }
        ]
      }
    ];

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    function watchMedia(t){return writable({},e=>{if("undefined"==typeof window)return;let n={},r=()=>e(function(e){let t={classNames:""},n=[];for(let r in e)t[r]=e[r].matches,t[r]&&n.push(`media-${r}`);return t.classNames=n.join(" "),t}(n));for(let e in t){let i=window.matchMedia(t[e]);n[e]=i,n[e].addListener(r);}return r(),()=>{for(let e in n)n[e].removeListener(r);}})}

    const mediaqueries = {
      sm: "(min-width: 640px)",
      md: "(min-width: 768px)",
      lg: "(min-width: 1024px)",
      xl: "(min-width: 1280px)",
      landscape: "(orientation: landscape) and (max-height: 499px)",
      dark: "(prefers-color-scheme: dark)",
      noanimations: "(prefers-reduced-motion: reduce)"
    };

    const media = watchMedia(mediaqueries);

    /* src\ProjectCard.svelte generated by Svelte v3.20.0 */
    const file$1 = "src\\ProjectCard.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    // (54:2) {#if hovering}
    function create_if_block$1(ctx) {
    	let div0;
    	let div0_transition;
    	let t0;
    	let div5;
    	let div2;
    	let p;
    	let t2;
    	let div1;
    	let t3;
    	let div3;
    	let img0;
    	let img0_src_value;
    	let t4;
    	let div4;
    	let a0;
    	let t5;
    	let a0_href_value;
    	let t6;
    	let a1;
    	let img1;
    	let img1_src_value;
    	let a1_href_value;
    	let div5_transition;
    	let current;
    	let each_value = /*project*/ ctx[0].technologies;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = space();
    			div5 = element("div");
    			div2 = element("div");
    			p = element("p");
    			p.textContent = "Built With:";
    			t2 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t3 = space();
    			div3 = element("div");
    			img0 = element("img");
    			t4 = space();
    			div4 = element("div");
    			a0 = element("a");
    			t5 = text("GO TO PROJECT");
    			t6 = space();
    			a1 = element("a");
    			img1 = element("img");
    			attr_dev(div0, "class", "absolute bg-black-alpha-60 w-full h-full top-0 bottom-0 left-0\r\n      right-0");
    			add_location(div0, file$1, 54, 4, 1581);
    			attr_dev(p, "class", "font-bold");
    			add_location(p, file$1, 72, 8, 2494);
    			attr_dev(div1, "class", "flex flex-wrap bg-gray-400 rounded-md p-1");
    			add_location(div1, file$1, 73, 8, 2540);
    			attr_dev(div2, "class", "mt-4");
    			add_location(div2, file$1, 71, 6, 2466);
    			attr_dev(img0, "class", "h-8 w-8 ");
    			if (img0.src !== (img0_src_value = /*project*/ ctx[0].overlayIcon)) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			add_location(img0, file$1, 82, 8, 2876);
    			attr_dev(div3, "class", "absolute top-0 right-0 p-2");
    			add_location(div3, file$1, 81, 6, 2826);
    			attr_dev(a0, "class", "h-full w-3/4 bg-gray-900 hover:bg-gray-800 transition\r\n          duration-500 ease-in-out flex items-center justify-center border-r");
    			attr_dev(a0, "href", a0_href_value = /*project*/ ctx[0].url);
    			add_location(a0, file$1, 87, 8, 3096);
    			attr_dev(img1, "class", "h-12 w-12");
    			if (img1.src !== (img1_src_value = "./icons/GitHub-Mark-Light-64px.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$1, 97, 10, 3519);
    			attr_dev(a1, "class", "h-full w-1/4 bg-gray-900 hover:bg-gray-800 transition\r\n          duration-500 ease-in-out flex items-center justify-center");
    			attr_dev(a1, "href", a1_href_value = /*project*/ ctx[0].github);
    			add_location(a1, file$1, 93, 8, 3329);
    			attr_dev(div4, "class", "absolute bottom-0 right-0 flex items-center justify-center\r\n        text-white w-full block h-16 bg-gray-900");
    			add_location(div4, file$1, 84, 6, 2955);
    			attr_dev(div5, "class", " absolute bg-white w-full h-full top-0 bottom-0 left-0 right-0 p-2");
    			add_location(div5, file$1, 63, 4, 2031);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div2);
    			append_dev(div2, p);
    			append_dev(div2, t2);
    			append_dev(div2, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			append_dev(div5, t3);
    			append_dev(div5, div3);
    			append_dev(div3, img0);
    			append_dev(div5, t4);
    			append_dev(div5, div4);
    			append_dev(div4, a0);
    			append_dev(a0, t5);
    			append_dev(div4, t6);
    			append_dev(div4, a1);
    			append_dev(a1, img1);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*project*/ 1) {
    				each_value = /*project*/ ctx[0].technologies;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (!current || dirty & /*project*/ 1 && img0.src !== (img0_src_value = /*project*/ ctx[0].overlayIcon)) {
    				attr_dev(img0, "src", img0_src_value);
    			}

    			if (!current || dirty & /*project*/ 1 && a0_href_value !== (a0_href_value = /*project*/ ctx[0].url)) {
    				attr_dev(a0, "href", a0_href_value);
    			}

    			if (!current || dirty & /*project*/ 1 && a1_href_value !== (a1_href_value = /*project*/ ctx[0].github)) {
    				attr_dev(a1, "href", a1_href_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!div0_transition) div0_transition = create_bidirectional_transition(
    					div0,
    					fly,
    					{
    						duration: 550,
    						easing: quartInOut,
    						x: /*offset*/ ctx[2],
    						opacity: 1
    					},
    					true
    				);

    				div0_transition.run(1);
    			});

    			add_render_callback(() => {
    				if (!div5_transition) div5_transition = create_bidirectional_transition(
    					div5,
    					fly,
    					{
    						duration: 750,
    						easing: expoInOut,
    						x: /*offset*/ ctx[2],
    						opacity: 1
    					},
    					true
    				);

    				div5_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div0_transition) div0_transition = create_bidirectional_transition(
    				div0,
    				fly,
    				{
    					duration: 550,
    					easing: quartInOut,
    					x: /*offset*/ ctx[2],
    					opacity: 1
    				},
    				false
    			);

    			div0_transition.run(0);

    			if (!div5_transition) div5_transition = create_bidirectional_transition(
    				div5,
    				fly,
    				{
    					duration: 750,
    					easing: expoInOut,
    					x: /*offset*/ ctx[2],
    					opacity: 1
    				},
    				false
    			);

    			div5_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching && div0_transition) div0_transition.end();
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div5);
    			destroy_each(each_blocks, detaching);
    			if (detaching && div5_transition) div5_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(54:2) {#if hovering}",
    		ctx
    	});

    	return block;
    }

    // (75:10) {#each project.technologies as tech}
    function create_each_block(ctx) {
    	let a;
    	let t0_value = /*tech*/ ctx[7].tech + "";
    	let t0;
    	let t1;
    	let a_href_value;

    	const block = {
    		c: function create() {
    			a = element("a");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(a, "class", "bg-black text-white rounded-md m-1 p-2");
    			attr_dev(a, "href", a_href_value = /*tech*/ ctx[7].link);
    			add_location(a, file$1, 75, 12, 2657);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, t0);
    			append_dev(a, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*project*/ 1 && t0_value !== (t0_value = /*tech*/ ctx[7].tech + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*project*/ 1 && a_href_value !== (a_href_value = /*tech*/ ctx[7].link)) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(75:10) {#each project.technologies as tech}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div1;
    	let div0;
    	let t0_value = /*project*/ ctx[0].title + "";
    	let t0;
    	let t1;
    	let div1_style_value;
    	let current;
    	let dispose;
    	let if_block = /*hovering*/ ctx[1] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			if (if_block) if_block.c();
    			attr_dev(div0, "class", "absolute flex items-center justify-center bottom-0 bg-gray-900\r\n    text-white w-full h-16 font-hairline text-xl");
    			add_location(div0, file$1, 47, 2, 1393);
    			attr_dev(div1, "style", div1_style_value = `background: url(${/*project*/ ctx[0].background}) top center/cover no-repeat`);
    			attr_dev(div1, "class", "relative overflow-hidden w-full sm:w-1/2 md:w-1/3 lg:w-1/4\r\n  project-height border-4 border-black bg svelte-11hell4");
    			add_location(div1, file$1, 37, 0, 996);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, t0);
    			append_dev(div1, t1);
    			if (if_block) if_block.m(div1, null);
    			current = true;
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(div1, "mouseenter", /*enter*/ ctx[3], false, false, false),
    				listen_dev(div1, "mouseleave", /*leave*/ ctx[4], false, false, false),
    				listen_dev(div1, "click", /*enter*/ ctx[3], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if ((!current || dirty & /*project*/ 1) && t0_value !== (t0_value = /*project*/ ctx[0].title + "")) set_data_dev(t0, t0_value);

    			if (/*hovering*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*project*/ 1 && div1_style_value !== (div1_style_value = `background: url(${/*project*/ ctx[0].background}) top center/cover no-repeat`)) {
    				attr_dev(div1, "style", div1_style_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (if_block) if_block.d();
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $media;
    	validate_store(media, "media");
    	component_subscribe($$self, media, $$value => $$invalidate(5, $media = $$value));
    	let { project } = $$props;
    	let hovering = false;
    	let offset;
    	const bg = project.background;

    	function enter() {
    		$$invalidate(1, hovering = true);
    	}

    	function leave() {
    		$$invalidate(1, hovering = false);
    	}

    	const writable_props = ["project"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ProjectCard> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("ProjectCard", $$slots, []);

    	$$self.$set = $$props => {
    		if ("project" in $$props) $$invalidate(0, project = $$props.project);
    	};

    	$$self.$capture_state = () => ({
    		fly,
    		quadInOut,
    		quartInOut,
    		expoInOut,
    		media,
    		project,
    		hovering,
    		offset,
    		bg,
    		enter,
    		leave,
    		$media
    	});

    	$$self.$inject_state = $$props => {
    		if ("project" in $$props) $$invalidate(0, project = $$props.project);
    		if ("hovering" in $$props) $$invalidate(1, hovering = $$props.hovering);
    		if ("offset" in $$props) $$invalidate(2, offset = $$props.offset);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$media*/ 32) {
    			 if ($media.xl) {
    				$$invalidate(2, offset = -510);
    			} else if ($media.lg) {
    				$$invalidate(2, offset = -320);
    			} else if ($media.md) {
    				$$invalidate(2, offset = -350);
    			} else if ($media.sm) {
    				$$invalidate(2, offset = -380);
    			} else {
    				$$invalidate(2, offset = -625);
    			}
    		}
    	};

    	return [project, hovering, offset, enter, leave];
    }

    class ProjectCard extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { project: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ProjectCard",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*project*/ ctx[0] === undefined && !("project" in props)) {
    			console.warn("<ProjectCard> was created without expected prop 'project'");
    		}
    	}

    	get project() {
    		throw new Error("<ProjectCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set project(value) {
    		throw new Error("<ProjectCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Projects.svelte generated by Svelte v3.20.0 */
    const file$2 = "src\\Projects.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[0] = list[i];
    	child_ctx[2] = i;
    	return child_ctx;
    }

    // (15:6) {#each projects as project, i}
    function create_each_block$1(ctx) {
    	let current;

    	const projectcard = new ProjectCard({
    			props: { project: /*project*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(projectcard.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(projectcard, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(projectcard.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(projectcard.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(projectcard, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(15:6) {#each projects as project, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let section;
    	let div0;
    	let t0;
    	let hr;
    	let t1;
    	let div2;
    	let div1;
    	let current;
    	let each_value = projects;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			section = element("section");
    			div0 = element("div");
    			t0 = text("Projects\r\n    ");
    			hr = element("hr");
    			t1 = space();
    			div2 = element("div");
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(hr, "class", "w-64 text-white mb-4");
    			add_location(hr, file$2, 10, 4, 271);
    			attr_dev(div0, "class", "flex flex-col items-center justify-center text-white text-6xl\r\n    font-hairline tracking-wider");
    			add_location(div0, file$2, 6, 2, 137);
    			attr_dev(div1, "class", "flex flex-wrap max-w-screen-xl border p-4 w-full h-full");
    			add_location(div1, file$2, 13, 4, 359);
    			attr_dev(div2, "class", "flex justify-center");
    			add_location(div2, file$2, 12, 2, 320);
    			add_location(section, file$2, 5, 0, 124);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div0);
    			append_dev(div0, t0);
    			append_dev(div0, hr);
    			append_dev(section, t1);
    			append_dev(section, div2);
    			append_dev(div2, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*projects*/ 0) {
    				each_value = projects;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div1, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Projects> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Projects", $$slots, []);
    	$$self.$capture_state = () => ({ projects, ProjectCard });
    	return [];
    }

    class Projects extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Projects",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.20.0 */
    const file$3 = "src\\App.svelte";

    function create_fragment$4(ctx) {
    	let t0;
    	let main;
    	let t1;
    	let current;
    	const tailwindcss = new Tailwindcss({ $$inline: true });
    	const landing = new Landing({ $$inline: true });
    	const projects = new Projects({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(tailwindcss.$$.fragment);
    			t0 = space();
    			main = element("main");
    			create_component(landing.$$.fragment);
    			t1 = space();
    			create_component(projects.$$.fragment);
    			attr_dev(main, "class", "w-screen max-w-full");
    			add_location(main, file$3, 7, 0, 172);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(tailwindcss, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			mount_component(landing, main, null);
    			append_dev(main, t1);
    			mount_component(projects, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tailwindcss.$$.fragment, local);
    			transition_in(landing.$$.fragment, local);
    			transition_in(projects.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tailwindcss.$$.fragment, local);
    			transition_out(landing.$$.fragment, local);
    			transition_out(projects.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tailwindcss, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			destroy_component(landing);
    			destroy_component(projects);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	$$self.$capture_state = () => ({ Tailwindcss, Landing, Projects });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    const app = new App({
      target: document.body,
      props: {}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
