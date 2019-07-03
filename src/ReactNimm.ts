interface RepositoryEntry {
    component: (props: any) => any;
    props: any;
    hooks: any;
    children: RepositoryEntry[];
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
            children: []
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
export function useEffect(fn) {
    const comp = CurrentComponent;
    if (!comp) throw "running state outside of component";

    const hookIndex = ++CurrentHook;
    if (comp.hooks.length - 1 < hookIndex)
        comp.hooks.push({
            type: useEffect,
            fn: fn,
            terminal: null
        });
    const hook = comp.hooks[hookIndex];
    hook.fn = fn;
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
    console.log("CURRENT:", val);
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

    const components = parentComp.component(parentComp.props);
    if (components) {
        const comps = components.map(v => {
            return {
                component: v.component,
                props: v.props,
                hooks: [],
                children: []
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
                runComponents.push(comp);
            }
        });

        runComponents.forEach(runComponent);
    }

    /*run effect hooks*/
    parentComp.hooks.forEach(hook => {
        hook.terminal && hook.terminal();
        if (hook.type === useEffect)
            setImmediate(() => (hook.terminal = hook.fn()));
    });
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
function shutdownComponent(comp: RepositoryEntry) {}
function shallowCompare(obj1, obj2) {
    return (
        Object.keys(obj1).length === Object.keys(obj2).length &&
        Object.keys(obj1).every(key => obj1[key] === obj2[key])
    );
}
