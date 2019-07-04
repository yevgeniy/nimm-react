export interface RepositoryEntry {
    component: (props: any) => any;
    props: any;
    hooks: any;
    children: RepositoryEntry[];
    active: boolean;
}
let CurrentComponent: RepositoryEntry = null;
let CurrentHook: number = null;
let RerunQueue: RepositoryEntry[] = [];

export const Root: RepositoryEntry[] = [];

export function root(...components) {
    const comps = components.map(v => {
        return {
            component: v.component,
            props: v.props,
            hooks: [],
            children: [],
            active: true
        };
    });

    Root.push(...comps);

    comps.forEach(runComponent);
    return {
        shutdown: () => {
            Root.forEach(shutdownComponent);
            Root.splice(0);
        }
    };
}
export function component(component, props) {
    return {
        component,
        props
    };
}
export function useEffect(fn, args) {
    const comp = CurrentComponent;
    if (!comp) throw "running state outside of component";

    const hookIndex = ++CurrentHook;
    if (comp.hooks.length - 1 < hookIndex)
        comp.hooks.push({
            type: useEffect,
            fn: fn,
            args: null,
            terminal: null,
            run: null
        });
    const hook = comp.hooks[hookIndex];
    hook.fn = fn;
    hook.run = !shallowCompare(hook.args, args);
    hook.args = args;
}
export function useState(def) {
    const comp = CurrentComponent;
    if (!comp) throw "running state outside of component";

    const hookIndex = ++CurrentHook;
    if (comp.hooks.length - 1 < hookIndex)
        comp.hooks.push({
            type: useState,
            val: def
        });
    const val = comp.hooks[hookIndex].val;
    const setVal = newval => {
        if (newval === val) return;
        comp.hooks[hookIndex].val = newval;
        queueRerun(comp);
    };
    return [val, setVal];
}

function runComponent(parentComp: RepositoryEntry) {
    CurrentComponent = parentComp;
    CurrentHook = -1;

    const components = parentComp.component(parentComp.props) || [];

    const comps = components.map(v => {
        return {
            component: v.component,
            props: v.props,
            hooks: [],
            children: [],
            active: true
        };
    });

    const runComponents = [];
    comps.forEach((comp, i) => {
        if (!parentComp.children[i]) {
            parentComp.children[i] = comp;
            runComponents.push(comp);
        } else if (parentComp.children[i].component !== comp.component) {
            shutdownComponent(parentComp.children[i]);
            parentComp.children[i] = comp;
            runComponents.push(comp);
        } else if (
            !shallowCompare(
                comp.props || {},
                parentComp.children[i].props || {}
            )
        ) {
            parentComp.children[i].props = comp.props;
            runComponents.push(parentComp.children[i]);
        }
    });

    /*shutdown all other components exceeding current comp lenth*/
    parentComp.children.splice(comps.length).forEach(shutdownComponent);

    runComponents.forEach(runComponent);

    CurrentComponent = parentComp;
    /*run effect hooks*/
    parentComp.hooks.forEach(hook => {
        if (hook.type === useEffect && hook.run) {
            hook.terminal && hook.terminal();
            setImmediate(() => (hook.terminal = hook.fn()));
        }
    });

    CurrentComponent = null;
}
function queueRerun(comp: RepositoryEntry) {
    if (RerunQueue.indexOf(comp) > -1) return;
    RerunQueue.push(comp);
    queue_run();
}

let queuet = null;
function queue_run() {
    clearTimeout(queuet);
    const work = () => {
        const comp = RerunQueue.shift();
        if (!comp) return;

        runComponent(comp);
    };
    queuet = setImmediate(work);
}
function shutdownComponent(comp: RepositoryEntry) {
    comp.active = false;
    comp.hooks
        .filter(v => v.type === useEffect && v.terminal)
        .forEach(v => v.terminal());
}
function shallowCompare(obj1, obj2) {
    if (!obj1 || !obj2) return false;

    if (Object.keys(obj1).length === 0 && Object.keys(obj2).length === 0)
        return true;

    return (
        Object.keys(obj1).length === Object.keys(obj2).length &&
        Object.keys(obj1).every(key => obj1[key] === obj2[key])
    );
}
