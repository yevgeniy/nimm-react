interface RepositoryEntry {
    component: (props: any) => any;
    props: any;
    state: any;
}
let CurrentComponent: RepositoryEntry = null;
let CurrentState: number = null;
let RerunQueue: RepositoryEntry[] = [];

export const Repository: RepositoryEntry[] = [];

export function root(...components) {
    const comps = components.map(v => {
        return {
            component: v.component,
            props: v.props,
            state: []
        };
    });

    Repository.push(...comps);

    comps.forEach(runComponent);
}
export function component(component, props) {
    return {
        component,
        props
    };
}
export function useEffect(fn) {
    setImmediate(fn);
}
export function useState(def) {
    const comp = CurrentComponent;
    if (!comp) throw "running state outside of component";

    const stateIndex = ++CurrentState;
    if (comp.state.length - 1 < stateIndex) comp.state.push(def);
    const val = comp.state[stateIndex];
    const setVal = newval => {
        if (newval === val) return;
        comp.state[stateIndex] = newval;
        queueRerun(comp);
    };
    return [val, setVal];
}

function runComponent(comp: RepositoryEntry) {
    CurrentComponent = comp;
    CurrentState = -1;

    const components = comp.component(comp.props);
    if (!components) return;

    const comps = components.map(v => {
        return {
            component: v.component,
            props: v.props,
            state: []
        };
    });

    const runComponents = [];
    comps.forEach(comp => {
        let existingComp = Repository.find(v => v.component === comp.component);
        if (!existingComp) {
            Repository.push(comp);
            runComponents.push(comp);
        } else if (!shallowCompare(comp.props, existingComp.props)) {
            runComponents.push(comp);
        }
    });

    runComponents.forEach(runComponent);
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
function shallowCompare(obj1, obj2) {
    return (
        Object.keys(obj1).length === Object.keys(obj2).length &&
        Object.keys(obj1).every(key => obj1[key] === obj2[key])
    );
}
