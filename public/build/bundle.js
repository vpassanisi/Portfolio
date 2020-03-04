
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
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let stylesheet;
    let active = 0;
    let current_rules = {};
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
        if (!current_rules[name]) {
            if (!stylesheet) {
                const style = element('style');
                document.head.appendChild(style);
                stylesheet = style.sheet;
            }
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        node.style.animation = (node.style.animation || '')
            .split(', ')
            .filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        )
            .join(', ');
        if (name && !--active)
            clear_rules();
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            let i = stylesheet.cssRules.length;
            while (i--)
                stylesheet.deleteRule(i);
            current_rules = {};
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
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.19.1' }, detail)));
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

    /* src\Tailwindcss.svelte generated by Svelte v3.19.1 */

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

    class Tailwindcss extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment, safe_not_equal, {});

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

    /* src\Landing.svelte generated by Svelte v3.19.1 */
    const file = "src\\Landing.svelte";

    // (20:2) {#if show}
    function create_if_block(ctx) {
    	let div3;
    	let div2;
    	let div1;
    	let div0;
    	let div1_intro;
    	let div2_transition;
    	let div3_intro;
    	let current;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			div0.textContent = "Vincent Passanisi";
    			attr_dev(div0, "class", "text-center text-white font-hairline text-5xl");
    			add_location(div0, file, 28, 10, 1215);
    			attr_dev(div1, "class", "bg-black-alpha-60 flex flex-col items-center justify-center\r\n          w-full h-full");
    			add_location(div1, file, 24, 8, 1022);
    			attr_dev(div2, "class", "w-full h-full");
    			add_location(div2, file, 21, 6, 905);
    			attr_dev(div3, "class", "background w-full h-full svelte-bkdk4j");
    			add_location(div3, file, 20, 4, 831);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;

    			if (!div1_intro) {
    				add_render_callback(() => {
    					div1_intro = create_in_transition(div1, fade, {
    						delay: 200,
    						duration: 2000,
    						easing: quartInOut
    					});

    					div1_intro.start();
    				});
    			}

    			add_render_callback(() => {
    				if (!div2_transition) div2_transition = create_bidirectional_transition(div2, scale, { delay: 200, duration: 2000, start: 1.2 }, true);
    				div2_transition.run(1);
    			});

    			if (!div3_intro) {
    				add_render_callback(() => {
    					div3_intro = create_in_transition(div3, fade, { duration: 300 });
    					div3_intro.start();
    				});
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div2_transition) div2_transition = create_bidirectional_transition(div2, scale, { delay: 200, duration: 2000, start: 1.2 }, false);
    			div2_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			if (detaching && div2_transition) div2_transition.end();
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

    function instance($$self, $$props, $$invalidate) {
    	let show = false;

    	onMount(() => {
    		setTimeout(() => $$invalidate(0, show = true), 1000);
    	});

    	$$self.$capture_state = () => ({
    		fade,
    		scale,
    		quartInOut,
    		onMount,
    		show,
    		setTimeout
    	});

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
    		init(this, options, instance, create_fragment$1, safe_not_equal, {});

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
        id: 1,
        url: "https://bug-tracker-api.herokuapp.com/",
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
            tech: "Svelte SPA Router",
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
        id: 2,
        url: "https://bug-tracker-api.herokuapp.com/docs/index.html",
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
        id: 4,
        url: "https://journalll.herokuapp.com/",
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
            tech: "Svelte SPA Router",
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
        id: 3,
        url: "https://journalll.herokuapp.com/docs/",
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
        id: 5,
        url: "https://the-best-react-weather-app.netlify.com/",
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

    /* src\ProjectCard.svelte generated by Svelte v3.19.1 */
    const file$1 = "src\\ProjectCard.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    // (53:2) {#if hovering}
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
    	let img;
    	let img_src_value;
    	let t4;
    	let div4;
    	let t6;
    	let a;
    	let t7_value = "" + "";
    	let t7;
    	let a_href_value;
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
    			p.textContent = "Build With:";
    			t2 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t3 = space();
    			div3 = element("div");
    			img = element("img");
    			t4 = space();
    			div4 = element("div");
    			div4.textContent = "GO TO PROJECT";
    			t6 = space();
    			a = element("a");
    			t7 = text(t7_value);
    			attr_dev(div0, "class", "absolute bg-blue-gray-700 w-full h-full top-0 bottom-0 left-0\r\n      right-0");
    			add_location(div0, file$1, 53, 4, 1562);
    			attr_dev(p, "class", "font-bold");
    			add_location(p, file$1, 62, 8, 1972);
    			attr_dev(div1, "class", "flex flex-wrap bg-gray-400 rounded-md");
    			add_location(div1, file$1, 63, 8, 2018);
    			attr_dev(div2, "class", "mt-8");
    			add_location(div2, file$1, 61, 6, 1944);
    			attr_dev(img, "class", "h-12 w-12 ");
    			if (img.src !== (img_src_value = /*project*/ ctx[0].overlayIcon)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			add_location(img, file$1, 72, 8, 2337);
    			attr_dev(div3, "class", "absolute top-0 right-0 p-2");
    			add_location(div3, file$1, 71, 6, 2287);
    			attr_dev(div4, "class", "absolute bottom-0 right-0 flex items-center justify-center\r\n        bg-gray-900 text-white w-full block h-12");
    			add_location(div4, file$1, 74, 6, 2418);
    			attr_dev(a, "class", "absolute top-0 bottom-0 left-0 right-0 h-full w-full z-10");
    			attr_dev(a, "href", a_href_value = /*project*/ ctx[0].url);
    			add_location(a, file$1, 80, 6, 2596);
    			attr_dev(div5, "class", "absolute bg-blue-gray-50 w-full h-full top-0 bottom-0 left-0\r\n      right-0 p-2");
    			add_location(div5, file$1, 57, 4, 1752);
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
    			append_dev(div3, img);
    			append_dev(div5, t4);
    			append_dev(div5, div4);
    			append_dev(div5, t6);
    			append_dev(div5, a);
    			append_dev(a, t7);
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

    			if (!current || dirty & /*project*/ 1 && img.src !== (img_src_value = /*project*/ ctx[0].overlayIcon)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (!current || dirty & /*project*/ 1 && a_href_value !== (a_href_value = /*project*/ ctx[0].url)) {
    				attr_dev(a, "href", a_href_value);
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
    		source: "(53:2) {#if hovering}",
    		ctx
    	});

    	return block;
    }

    // (65:10) {#each project.technologies as tech}
    function create_each_block(ctx) {
    	let div;
    	let t0_value = /*tech*/ ctx[7].tech + "";
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(div, "class", "bg-black text-white rounded-md m-1 p-2");
    			add_location(div, file$1, 65, 12, 2131);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*project*/ 1 && t0_value !== (t0_value = /*tech*/ ctx[7].tech + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(65:10) {#each project.technologies as tech}",
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
    			attr_dev(div0, "class", "absolute flex items-center justify-center bottom-0 bg-gray-900\r\n    text-white w-full h-12 font-hairline text-xl");
    			add_location(div0, file$1, 46, 2, 1374);
    			attr_dev(div1, "style", div1_style_value = `background: url(${/*project*/ ctx[0].background}) top center/cover no-repeat`);
    			attr_dev(div1, "class", "relative overflow-hidden w-full sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/5\r\n  project-height border-2 border-black bg svelte-11pa106");
    			add_location(div1, file$1, 37, 0, 988);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, t0);
    			append_dev(div1, t1);
    			if (if_block) if_block.m(div1, null);
    			current = true;

    			dispose = [
    				listen_dev(div1, "mouseenter", /*enter*/ ctx[3], false, false, false),
    				listen_dev(div1, "mouseleave", /*leave*/ ctx[4], false, false, false)
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

    function instance$1($$self, $$props, $$invalidate) {
    	let $media;
    	validate_store(media, "media");
    	component_subscribe($$self, media, $$value => $$invalidate(5, $media = $$value));
    	let { project } = $$props;
    	let hovering;
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
    		init(this, options, instance$1, create_fragment$2, safe_not_equal, { project: 0 });

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

    /* src\Projects.svelte generated by Svelte v3.19.1 */
    const file$2 = "src\\Projects.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[0] = list[i];
    	child_ctx[2] = i;
    	return child_ctx;
    }

    // (14:4) {#each projects as project, i}
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
    		source: "(14:4) {#each projects as project, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let section;
    	let div0;
    	let t1;
    	let hr;
    	let t2;
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
    			div0.textContent = "Projects";
    			t1 = space();
    			hr = element("hr");
    			t2 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "flex items-center justify-center text-white text-6xl font-hairline\r\n    tracking-wider");
    			add_location(div0, file$2, 6, 2, 137);
    			attr_dev(hr, "class", "text-white");
    			add_location(hr, file$2, 11, 2, 270);
    			attr_dev(div1, "class", "flex flex-wrap");
    			add_location(div1, file$2, 12, 2, 299);
    			add_location(section, file$2, 5, 0, 124);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div0);
    			append_dev(section, t1);
    			append_dev(section, hr);
    			append_dev(section, t2);
    			append_dev(section, div1);

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

    function instance$2($$self, $$props, $$invalidate) {
    	$$self.$capture_state = () => ({ projects, ProjectCard });
    	return [];
    }

    class Projects extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Projects",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.19.1 */
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

    function instance$3($$self, $$props, $$invalidate) {
    	$$self.$capture_state = () => ({ Tailwindcss, Landing, Projects });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$4, safe_not_equal, {});

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
