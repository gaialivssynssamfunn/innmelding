
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
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
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
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
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false }) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
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
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
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
        seen_callbacks.clear();
        set_current_component(saved_component);
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
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
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
        }
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
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
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
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
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
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
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
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.48.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function getDefaultExportFromCjs (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    function createCommonjsModule(fn) {
      var module = { exports: {} };
    	return fn(module, module.exports), module.exports;
    }

    var dist = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getGender = exports.isValidCheckDigits = exports.possibleBirthDateOfIdNumber = exports.idNumberContainsBirthDate = exports.possibleAgeOfPersonWithIdNumber = exports.possibleAgesOfPersonWithIdNumber = exports.validateNorwegianIdNumber = exports.Gender = exports.IDNumberType = exports.isValidDate = exports.diffYears = exports.NorwegianId = void 0;
    /**
     * Object-oriented API for Norwegian National ID Validator
     * @example
     * ```javascript
     * import { NorwegianId } from 'norwegian-national-id-validator';
     *
     * const valid = NorwegianId('0000000000');
     * ```
     * @param idNumber norwegian social security number
     */
    var NorwegianId = function (idNumber) {
        var valid = validateNorwegianIdNumber(idNumber);
        return {
            idNumber: idNumber,
            isValid: function () { return valid; },
            isBirthNumber: function () {
                return valid && idNumberType(idNumber) == IDNumberType.BirthNumber;
            },
            isDNumber: function () { return valid && idNumberType(idNumber) == IDNumberType.DNumber; },
            isHNumber: function () { return valid && idNumberType(idNumber) == IDNumberType.HNumber; },
            isFhNumber: function () { return valid && idNumberType(idNumber) == IDNumberType.FHNumber; },
            isMale: function () { return valid && getGender(idNumber) == Gender.Male; },
            isFemale: function () { return valid && getGender(idNumber) == Gender.Female; },
            age: function () { return possibleAgeOfPersonWithIdNumber(idNumber); },
            birthDate: function () { return (valid && possibleBirthDateOfIdNumber(idNumber)) || undefined; },
        };
    };
    exports.NorwegianId = NorwegianId;
    /**
     * Calculated the difference betweeen two dates.
     * @param startDate Date instance
     * @param endDate Date instance
     * @private
     */
    function diffYears(startDate, endDate) {
        var yStart = startDate.getFullYear();
        var mStart = startDate.getMonth();
        var dStart = startDate.getDate();
        var yEnd = endDate.getFullYear();
        var mEnd = endDate.getMonth();
        var dEnd = endDate.getDate();
        var diff = yStart - yEnd;
        if (mEnd > mStart || (mEnd === mStart && dEnd > dStart)) {
            return diff - 1;
        }
        return diff;
    }
    exports.diffYears = diffYears;
    /**
     * Checks if a date is valid against another
     * @param date Date instance
     * @param expectedYear
     * @param expectedMonth
     * @param expectedDay
     */
    function isValidDate(date, expectedYear, expectedMonth, expectedDay) {
        return (date.getFullYear() === Number(expectedYear) &&
            date.getMonth() + 1 === Number(expectedMonth) &&
            date.getDate() === Number(expectedDay));
    }
    exports.isValidDate = isValidDate;
    /** In Norway there are several different ID numbers */
    var IDNumberType;
    (function (IDNumberType) {
        /**
         * A national identity number (birth number) is an ID number for you who
         * have a residence permit and are going to live in Norway for more than
         * six months.
         */
        IDNumberType[IDNumberType["BirthNumber"] = 0] = "BirthNumber";
        /**
         * A D number is a temporary identification number that you get if you have
         * applied for protection (asylum), or if you have a residence permit and
         * are going to stay in Norway for less than six months.
         */
        IDNumberType[IDNumberType["DNumber"] = 1] = "DNumber";
        /**
         * A H number is a number used for assistance, a unique identification of a
         * person that does not have a national ID or a D number or in cases where
         * this is not known. A H number contains information about age and gender.
         */
        IDNumberType[IDNumberType["HNumber"] = 2] = "HNumber";
        /**
         * A FH number is used in health care to uniquely identify patients that
         * does not have a known national ID or D number. A FH number does not have
         * any information about age or gender.
         */
        IDNumberType[IDNumberType["FHNumber"] = 3] = "FHNumber";
    })(IDNumberType = exports.IDNumberType || (exports.IDNumberType = {}));
    /**
     * Birth numbers, D-number and H-number contains information about gender
     */
    var Gender;
    (function (Gender) {
        /** If the third last digit in the ID number is odd, it is a male */
        Gender[Gender["Male"] = 0] = "Male";
        /** If the third last digit in the ID number is even, it is a female */
        Gender[Gender["Female"] = 1] = "Female";
    })(Gender = exports.Gender || (exports.Gender = {}));
    /**
     * Checks if the given value is a valid Norwegian national identity number.
     * @example
     * ```javascript
     * import { validateNorwegianIdNumber } from 'norwegian-national-id-validator';
     * const valid = validateNorwegianIdNumber(0000000000);
     * ```
     * @param idNumber social security number
     * @returns `true` for valid, and `false` for invalid ID number.
     */
    function validateNorwegianIdNumber(idNumber) {
        var trimmed = idNumber.trim();
        if (isNaN(Number(trimmed)))
            return false;
        if (trimmed.length !== 11)
            return false;
        if (!isValidCheckDigits(trimmed))
            return false;
        var type = idNumberType(trimmed);
        if (type === IDNumberType.FHNumber)
            return true;
        else
            return possibleAgesOfPersonWithIdNumber(trimmed).length > 0;
    }
    exports.validateNorwegianIdNumber = validateNorwegianIdNumber;
    /**
     * Find possible age of person based of ID number
     * @param elevenDigits Identification number
     */
    function possibleAgesOfPersonWithIdNumber(elevenDigits) {
        var possibleAge = possibleAgeOfPersonWithIdNumber(elevenDigits);
        return possibleAge == null ? [] : [possibleAge];
    }
    exports.possibleAgesOfPersonWithIdNumber = possibleAgesOfPersonWithIdNumber;
    /**
     * Returns the age of a person with given Norwegian national identity number.
     * Returns `undefined` when birth date could not be determined (e.g. for FH-numbers and invalid ID-numbers).
     * @param elevenDigits Identification number
     */
    function possibleAgeOfPersonWithIdNumber(elevenDigits) {
        var birthDate = possibleBirthDateOfIdNumber(elevenDigits);
        if (birthDate == null) {
            return undefined;
        }
        var years = diffYears(new Date(), birthDate);
        return years >= 0 && years < 125 ? years : undefined;
    }
    exports.possibleAgeOfPersonWithIdNumber = possibleAgeOfPersonWithIdNumber;
    /**
     * Check if idNumber contains birth date
     * @param elevenDigits idNumber
     */
    function idNumberContainsBirthDate(elevenDigits) {
        return idNumberType(elevenDigits) !== IDNumberType.FHNumber;
    }
    exports.idNumberContainsBirthDate = idNumberContainsBirthDate;
    /**
     * Get possible birth date from ID number
     * @param elevenDigits IdNumber
     */
    function possibleBirthDateOfIdNumber(elevenDigits) {
        if (elevenDigits.length !== 11)
            return undefined;
        var type = idNumberType(elevenDigits);
        switch (type) {
            case IDNumberType.BirthNumber:
                return possibleBirthDateOfBirthNumber(elevenDigits);
            case IDNumberType.DNumber:
                return possibleBirthDateOfDNumber(elevenDigits);
            case IDNumberType.HNumber:
                return possibleBirthDateOfHNumber(elevenDigits);
        }
        return undefined;
    }
    exports.possibleBirthDateOfIdNumber = possibleBirthDateOfIdNumber;
    /**
     * Get the ID number kind/type. This function does not validate, so
     * it should be combined with {@linkcode validateNorwegianIdNumber}.
     * @example
     * ```javascript
     * import { idNumberType, validateNorwegianIdNumber } from 'norwegian-national-id-validator';
     * if (validateNorwegianIdNumber(0000000000)) {
     *   const type = idNumberType(00000000000);
     * }
     * ```
     * @param elevenDigits IdNumber
     */
    function idNumberType(elevenDigits) {
        var firstDigit = parseInt(elevenDigits[0]);
        if (firstDigit === 8 || firstDigit === 9)
            return IDNumberType.FHNumber;
        if (firstDigit >= 4 && firstDigit <= 7)
            return IDNumberType.DNumber;
        var thirdDigit = parseInt(elevenDigits[2]);
        if (thirdDigit === 4 || thirdDigit === 5)
            return IDNumberType.HNumber;
        else
            return IDNumberType.BirthNumber;
    }
    /**
     * Get possible birth date from BirthNumber
     * @param elevenDigits BirthNumber
     */
    function possibleBirthDateOfBirthNumber(elevenDigits) {
        return getBirthDate(elevenDigits, IDNumberType.BirthNumber);
    }
    /**
     * Get possible birth date from HNumber
     * @param elevenDigits HNumber
     */
    function possibleBirthDateOfHNumber(elevenDigits) {
        var correctedThirdDigit = (parseInt(elevenDigits[2]) - 4).toString();
        return getBirthDate(elevenDigits.slice(0, 2) + correctedThirdDigit + elevenDigits.slice(3, 11), IDNumberType.HNumber);
    }
    /**
     * Get possible birth date from DNumber
     * @param elevenDigits DNumber
     */
    function possibleBirthDateOfDNumber(elevenDigits) {
        var correctedFirstDigit = (parseInt(elevenDigits[0]) - 4).toString();
        return getBirthDate(correctedFirstDigit + elevenDigits.slice(1, 11), IDNumberType.DNumber);
    }
    /**
     * @private
     */
    function getBirthDate(elevenDigitsWithDDMMYY, idNumberType) {
        var DD = elevenDigitsWithDDMMYY.slice(0, 2);
        var MM = elevenDigitsWithDDMMYY.slice(2, 4);
        var YY = elevenDigitsWithDDMMYY.slice(4, 6);
        var YY_int = parseInt(YY);
        var ageGroupNumber = parseInt(elevenDigitsWithDDMMYY.slice(6, 9));
        var centuryPrefix = '20';
        if (ageGroupNumber >= 0 && ageGroupNumber < 500) {
            centuryPrefix = '19';
        }
        else if (idNumberType === IDNumberType.DNumber) {
            centuryPrefix = '20';
        }
        else if (ageGroupNumber >= 500 && ageGroupNumber < 750 && YY_int >= 54) {
            centuryPrefix = '18';
        }
        else if (ageGroupNumber >= 900 && ageGroupNumber < 1000 && YY_int >= 40) {
            centuryPrefix = '19';
        }
        var fullYear = "".concat(centuryPrefix).concat(YY);
        var isoStr = [fullYear, MM, DD].join('-') + 'T00:00:00';
        var birthDate = new Date(isoStr);
        if (!isValidDate(birthDate, fullYear, MM, DD)) {
            return undefined;
        }
        return birthDate;
    }
    /**
     * @private
     */
    function isValidCheckDigits(elevenDigits) {
        var staticSequenceFirstCheckDigit = [3, 7, 6, 1, 8, 9, 4, 5, 2, 1];
        var staticSequenceSecondCheckDigit = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2, 1];
        var elevenDigitsArray = elevenDigits.split('').map(Number);
        return (isValidCheckDigit(staticSequenceFirstCheckDigit, elevenDigitsArray) &&
            isValidCheckDigit(staticSequenceSecondCheckDigit, elevenDigitsArray));
    }
    exports.isValidCheckDigits = isValidCheckDigits;
    /**
     * @private
     */
    function isValidCheckDigit(staticSequence, elevenDigits) {
        var productSum = staticSequence.reduce(function (acc, value, index) { return acc + value * elevenDigits[index]; }, 0);
        return productSum % 11 === 0;
    }
    /**
     * Returns the gender based of ID number. Returns `undefined` when no gender
     * information is available.
     * @param elevenDigits ID number
     */
    function getGender(elevenDigits) {
        if (elevenDigits.length != 11) {
            return undefined;
        }
        else if (idNumberType(elevenDigits) == IDNumberType.FHNumber) {
            return undefined;
        }
        var isFemale = Number(elevenDigits.charAt(8)) % 2 == 0;
        if (isFemale) {
            return Gender.Female;
        }
        else {
            return Gender.Male;
        }
    }
    exports.getGender = getGender;
    });

    var pnum = /*@__PURE__*/getDefaultExportFromCjs(dist);

    /* src/App.svelte generated by Svelte v3.48.0 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let div0;
    	let label0;
    	let span0;
    	let input0;
    	let t3;
    	let label1;
    	let span1;
    	let input1;
    	let t5;
    	let label2;
    	let span2;
    	let input2;
    	let t7;
    	let label3;
    	let span3;
    	let input3;
    	let t9;
    	let label4;
    	let span4;
    	let input4;
    	let t11;
    	let label5;
    	let span5;
    	let t13;
    	let input5;
    	let t14;
    	let label6;
    	let span6;
    	let input6;
    	let t16;
    	let label7;
    	let span7;
    	let input7;
    	let t18;
    	let label8;
    	let span8;
    	let input8;
    	let t20;
    	let div1;
    	let span9;
    	let input9;
    	let t21;
    	let t22;
    	let h3;
    	let t24;
    	let p0;
    	let t26;
    	let p1;
    	let t28;
    	let p2;
    	let t30;
    	let div2;
    	let t32;
    	let br0;
    	let t33;
    	let div5;
    	let div3;
    	let t35;
    	let div4;
    	let t37;
    	let br1;
    	let t38;
    	let div6;
    	let t40;
    	let p3;
    	let t41;
    	let a0;
    	let t43;
    	let p4;
    	let b;
    	let t45;
    	let br2;
    	let t46;
    	let br3;
    	let t47;
    	let br4;
    	let t48;
    	let br5;
    	let t49;
    	let t50;
    	let div7;
    	let p5;
    	let t51;
    	let a1;
    	let t53;
    	let p6;
    	let t55;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Innmelding i trossamfunnet Gaia";
    			t1 = space();
    			div0 = element("div");
    			label0 = element("label");
    			span0 = element("span");
    			span0.textContent = "Fornavn:";
    			input0 = element("input");
    			t3 = space();
    			label1 = element("label");
    			span1 = element("span");
    			span1.textContent = "Etternavn: ";
    			input1 = element("input");
    			t5 = space();
    			label2 = element("label");
    			span2 = element("span");
    			span2.textContent = "Adresse: ";
    			input2 = element("input");
    			t7 = space();
    			label3 = element("label");
    			span3 = element("span");
    			span3.textContent = "Postnummer";
    			input3 = element("input");
    			t9 = space();
    			label4 = element("label");
    			span4 = element("span");
    			span4.textContent = "Poststed:";
    			input4 = element("input");
    			t11 = space();
    			label5 = element("label");
    			span5 = element("span");
    			span5.textContent = "PersonNr (11siffer):";
    			t13 = space();
    			input5 = element("input");
    			t14 = space();
    			label6 = element("label");
    			span6 = element("span");
    			span6.textContent = "Bostedskommune i følge folkeregesteret:";
    			input6 = element("input");
    			t16 = space();
    			label7 = element("label");
    			span7 = element("span");
    			span7.textContent = "Telefon:";
    			input7 = element("input");
    			t18 = space();
    			label8 = element("label");
    			span8 = element("span");
    			span8.textContent = "E-post:";
    			input8 = element("input");
    			t20 = space();
    			div1 = element("div");
    			span9 = element("span");
    			input9 = element("input");
    			t21 = text("Jeg er ikke medlem i et annet tros- eller livssynssamfunn (gjelder også Den\n        norske kirke).");
    			t22 = space();
    			h3 = element("h3");
    			h3.textContent = "Viktig informasjon:";
    			t24 = space();
    			p0 = element("p");
    			p0.textContent = "Når trossamfunnet har mottatt innmeldingsblankett ferdig utfylt, vil du motta en innmeldingsattest.\n        Dette er bevis på at du er medlem hos oss.";
    			t26 = space();
    			p1 = element("p");
    			p1.textContent = "Etter lov om trudomssamfunn og ymist anna kreves det liste over medlemmenes fødselsnumre ved ut-\n        betaling av tilskudd til trossamfunn. Våre medlemmers fødselsnummer oppgis derfor i forbindelse med\n        innsending til fylkesmannen om for krav om tilskudd. Når kontroll av fødselsnumre er gjennomført slettes\n        disse av fylkesmannen og Brønnøysundregistrene som foretar kontrollen.";
    			t28 = space();
    			p2 = element("p");
    			p2.textContent = "Underskrift (Merk: Barn under 15 år må ha foreldrenes underskrift):";
    			t30 = space();
    			div2 = element("div");
    			div2.textContent = "Sted:";
    			t32 = space();
    			br0 = element("br");
    			t33 = space();
    			div5 = element("div");
    			div3 = element("div");
    			div3.textContent = "Dato:";
    			t35 = space();
    			div4 = element("div");
    			div4.textContent = "(dd/mm/åå)";
    			t37 = space();
    			br1 = element("br");
    			t38 = space();
    			div6 = element("div");
    			div6.textContent = "Signatur:";
    			t40 = space();
    			p3 = element("p");
    			t41 = text("Skjemaet sendes som brevpost (merket innmelding) eller som elektronisk dokument: ");
    			a0 = element("a");
    			a0.textContent = "gaialivssynssamfunn@gmail.com";
    			t43 = space();
    			p4 = element("p");
    			b = element("b");
    			b.textContent = "post adresse:";
    			t45 = space();
    			br2 = element("br");
    			t46 = text("Trossamfunnet Gaia\n        ");
    			br3 = element("br");
    			t47 = text("c/o Knut Olav Bøhmer\n        ");
    			br4 = element("br");
    			t48 = text("Kyrre Grepps Vei 8\n        ");
    			br5 = element("br");
    			t49 = text("1462 Fjellhamar");
    			t50 = space();
    			div7 = element("div");
    			p5 = element("p");
    			t51 = text("For å melde deg ut av statskirken kan du bruke denne linken: ");
    			a1 = element("a");
    			a1.textContent = "https://kirken.no/medlem";
    			t53 = space();
    			p6 = element("p");
    			p6.textContent = "Hvis du ikke vet hvilket trossamfunn du er medlem av, kan du ringe til\n            Brønnøysundregistrene på 75 00 75 00 og bestille et dokument med opplysninger om hvilke trossamfunn du er medlem av.";
    			t55 = space();
    			button = element("button");
    			button.textContent = "Print";
    			set_style(h1, "margin-top", `0`, false);
    			add_location(h1, file, 9, 4, 148);
    			attr_dev(span0, "class", "svelte-rlg3vv");
    			add_location(span0, file, 12, 50, 283);
    			input0.autofocus = true;
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "class", "svelte-rlg3vv");
    			add_location(input0, file, 12, 71, 304);
    			attr_dev(label0, "class", "split-input first-input tl svelte-rlg3vv");
    			add_location(label0, file, 12, 8, 241);
    			attr_dev(span1, "class", "svelte-rlg3vv");
    			add_location(span1, file, 13, 38, 381);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "class", "svelte-rlg3vv");
    			add_location(input1, file, 13, 62, 405);
    			attr_dev(label1, "class", "split-input tr svelte-rlg3vv");
    			add_location(label1, file, 13, 8, 351);
    			attr_dev(span2, "class", "svelte-rlg3vv");
    			add_location(span2, file, 14, 28, 462);
    			attr_dev(input2, "type", "text");
    			attr_dev(input2, "class", "svelte-rlg3vv");
    			add_location(input2, file, 14, 50, 484);
    			attr_dev(label2, "class", "full svelte-rlg3vv");
    			add_location(label2, file, 14, 8, 442);
    			attr_dev(span3, "class", "svelte-rlg3vv");
    			add_location(span3, file, 15, 38, 551);
    			attr_dev(input3, "type", "text");
    			attr_dev(input3, "class", "svelte-rlg3vv");
    			add_location(input3, file, 15, 61, 574);
    			attr_dev(label3, "class", "split-input nr svelte-rlg3vv");
    			add_location(label3, file, 15, 8, 521);
    			attr_dev(span4, "class", "svelte-rlg3vv");
    			add_location(span4, file, 16, 35, 638);
    			attr_dev(input4, "type", "text");
    			attr_dev(input4, "class", "svelte-rlg3vv");
    			add_location(input4, file, 16, 57, 660);
    			attr_dev(label4, "class", "split-input svelte-rlg3vv");
    			add_location(label4, file, 16, 8, 611);
    			attr_dev(span5, "class", "svelte-rlg3vv");
    			add_location(span5, file, 18, 12, 783);
    			attr_dev(input5, "class", "fnr svelte-rlg3vv");
    			attr_dev(input5, "type", "text");
    			add_location(input5, file, 19, 12, 829);
    			attr_dev(label5, "class", "full svelte-rlg3vv");
    			toggle_class(label5, "invalid", !/*validPnr*/ ctx[1] && `$pnr`.length === 11);
    			add_location(label5, file, 17, 8, 697);
    			attr_dev(span6, "class", "svelte-rlg3vv");
    			add_location(span6, file, 22, 28, 1005);
    			attr_dev(input6, "type", "text");
    			attr_dev(input6, "class", "svelte-rlg3vv");
    			add_location(input6, file, 22, 80, 1057);
    			attr_dev(label6, "class", "full svelte-rlg3vv");
    			add_location(label6, file, 22, 8, 985);
    			attr_dev(span7, "class", "svelte-rlg3vv");
    			add_location(span7, file, 23, 28, 1114);
    			attr_dev(input7, "type", "text");
    			attr_dev(input7, "class", "svelte-rlg3vv");
    			add_location(input7, file, 23, 49, 1135);
    			attr_dev(label7, "class", "full svelte-rlg3vv");
    			add_location(label7, file, 23, 8, 1094);
    			attr_dev(span8, "class", "svelte-rlg3vv");
    			add_location(span8, file, 24, 28, 1192);
    			attr_dev(input8, "type", "text");
    			attr_dev(input8, "class", "svelte-rlg3vv");
    			add_location(input8, file, 24, 48, 1212);
    			attr_dev(label8, "class", "full svelte-rlg3vv");
    			add_location(label8, file, 24, 8, 1172);
    			attr_dev(div0, "class", "frame svelte-rlg3vv");
    			add_location(div0, file, 11, 4, 213);
    			attr_dev(input9, "type", "checkbox");
    			attr_dev(input9, "class", "svelte-rlg3vv");
    			add_location(input9, file, 28, 14, 1277);
    			attr_dev(span9, "class", "svelte-rlg3vv");
    			add_location(span9, file, 28, 8, 1271);
    			add_location(div1, file, 27, 4, 1257);
    			add_location(h3, file, 32, 4, 1422);
    			add_location(p0, file, 33, 4, 1455);
    			add_location(p1, file, 37, 4, 1631);
    			add_location(p2, file, 44, 4, 2054);
    			attr_dev(div2, "class", "sted svelte-rlg3vv");
    			add_location(div2, file, 48, 4, 2148);
    			add_location(br0, file, 49, 4, 2182);
    			attr_dev(div3, "class", "sted svelte-rlg3vv");
    			add_location(div3, file, 50, 31, 2218);
    			add_location(div4, file, 50, 61, 2248);
    			set_style(div5, "display", "flex");
    			add_location(div5, file, 50, 4, 2191);
    			add_location(br1, file, 51, 4, 2280);
    			attr_dev(div6, "class", "signatur svelte-rlg3vv");
    			add_location(div6, file, 52, 4, 2289);
    			attr_dev(a0, "href", "mailto:gaialivssynssamfunn@gmail.com");
    			add_location(a0, file, 54, 89, 2424);
    			add_location(p3, file, 53, 4, 2331);
    			add_location(b, file, 57, 8, 2530);
    			add_location(br2, file, 58, 8, 2559);
    			add_location(br3, file, 59, 8, 2590);
    			add_location(br4, file, 60, 8, 2623);
    			add_location(br5, file, 61, 8, 2654);
    			add_location(p4, file, 56, 4, 2518);
    			attr_dev(a1, "href", "https://kirken.no/medlem");
    			add_location(a1, file, 65, 73, 2806);
    			add_location(p5, file, 64, 8, 2729);
    			add_location(p6, file, 67, 8, 2891);
    			add_location(button, file, 72, 8, 3129);
    			attr_dev(div7, "class", "no-print margin-top svelte-rlg3vv");
    			add_location(div7, file, 63, 4, 2687);
    			attr_dev(main, "class", "svelte-rlg3vv");
    			add_location(main, file, 8, 0, 137);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, div0);
    			append_dev(div0, label0);
    			append_dev(label0, span0);
    			append_dev(label0, input0);
    			append_dev(div0, t3);
    			append_dev(div0, label1);
    			append_dev(label1, span1);
    			append_dev(label1, input1);
    			append_dev(div0, t5);
    			append_dev(div0, label2);
    			append_dev(label2, span2);
    			append_dev(label2, input2);
    			append_dev(div0, t7);
    			append_dev(div0, label3);
    			append_dev(label3, span3);
    			append_dev(label3, input3);
    			append_dev(div0, t9);
    			append_dev(div0, label4);
    			append_dev(label4, span4);
    			append_dev(label4, input4);
    			append_dev(div0, t11);
    			append_dev(div0, label5);
    			append_dev(label5, span5);
    			append_dev(label5, t13);
    			append_dev(label5, input5);
    			set_input_value(input5, /*pnr*/ ctx[0]);
    			append_dev(div0, t14);
    			append_dev(div0, label6);
    			append_dev(label6, span6);
    			append_dev(label6, input6);
    			append_dev(div0, t16);
    			append_dev(div0, label7);
    			append_dev(label7, span7);
    			append_dev(label7, input7);
    			append_dev(div0, t18);
    			append_dev(div0, label8);
    			append_dev(label8, span8);
    			append_dev(label8, input8);
    			append_dev(main, t20);
    			append_dev(main, div1);
    			append_dev(div1, span9);
    			append_dev(span9, input9);
    			append_dev(div1, t21);
    			append_dev(main, t22);
    			append_dev(main, h3);
    			append_dev(main, t24);
    			append_dev(main, p0);
    			append_dev(main, t26);
    			append_dev(main, p1);
    			append_dev(main, t28);
    			append_dev(main, p2);
    			append_dev(main, t30);
    			append_dev(main, div2);
    			append_dev(main, t32);
    			append_dev(main, br0);
    			append_dev(main, t33);
    			append_dev(main, div5);
    			append_dev(div5, div3);
    			append_dev(div5, t35);
    			append_dev(div5, div4);
    			append_dev(main, t37);
    			append_dev(main, br1);
    			append_dev(main, t38);
    			append_dev(main, div6);
    			append_dev(main, t40);
    			append_dev(main, p3);
    			append_dev(p3, t41);
    			append_dev(p3, a0);
    			append_dev(main, t43);
    			append_dev(main, p4);
    			append_dev(p4, b);
    			append_dev(p4, t45);
    			append_dev(p4, br2);
    			append_dev(p4, t46);
    			append_dev(p4, br3);
    			append_dev(p4, t47);
    			append_dev(p4, br4);
    			append_dev(p4, t48);
    			append_dev(p4, br5);
    			append_dev(p4, t49);
    			append_dev(main, t50);
    			append_dev(main, div7);
    			append_dev(div7, p5);
    			append_dev(p5, t51);
    			append_dev(p5, a1);
    			append_dev(div7, t53);
    			append_dev(div7, p6);
    			append_dev(div7, t55);
    			append_dev(div7, button);
    			input0.focus();

    			if (!mounted) {
    				dispose = [
    					listen_dev(input5, "input", /*input5_input_handler*/ ctx[2]),
    					listen_dev(input5, "input", /*input_handler*/ ctx[3], false, false, false),
    					listen_dev(button, "click", /*click_handler*/ ctx[4], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*pnr*/ 1 && input5.value !== /*pnr*/ ctx[0]) {
    				set_input_value(input5, /*pnr*/ ctx[0]);
    			}

    			if (dirty & /*validPnr*/ 2) {
    				toggle_class(label5, "invalid", !/*validPnr*/ ctx[1] && `$pnr`.length === 11);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			mounted = false;
    			run_all(dispose);
    		}
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

    function instance($$self, $$props, $$invalidate) {
    	let validPnr;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let pnr = "";
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input5_input_handler() {
    		pnr = this.value;
    		$$invalidate(0, pnr);
    	}

    	const input_handler = () => $$invalidate(0, pnr = pnr.replaceAll(/[^0-9]/g, ""));
    	const click_handler = () => window.print();
    	$$self.$capture_state = () => ({ pnum, pnr, validPnr });

    	$$self.$inject_state = $$props => {
    		if ('pnr' in $$props) $$invalidate(0, pnr = $$props.pnr);
    		if ('validPnr' in $$props) $$invalidate(1, validPnr = $$props.validPnr);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*pnr*/ 1) {
    			$$invalidate(1, validPnr = pnum.NorwegianId(pnr).isValid());
    		}
    	};

    	return [pnr, validPnr, input5_input_handler, input_handler, click_handler];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
