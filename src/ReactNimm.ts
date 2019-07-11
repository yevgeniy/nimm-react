export class Promise {
    constructor(fn) {
        fn(this.resolve);
    }
    state=0;
    ondone=[];
    resolveval=undefined;
    then=(fn)=> {
        return new Promise(res=> {
            this.ondone.push(()=> {
                var r=fn(this.resolveval);
                res(r);
            });
            if (this.state==1)
                this.runResolvers();
        });
    }
    resolve=(val)=> {
        this.resolve=function(){};

        if (val && val.then)
            val.then(v=> {
          
                this.state=1;
                this.resolveval=v;
                this.runResolvers();
            })
        else {
            this.state=1;
            this.resolveval=val;
            this.runResolvers();
        }
        
    }
    running=false;
    runResolvers=()=> {
        if (this.running)
            return;
        this.running=true;

        let d;
        while(d=this.ondone.shift()) {
            d(this.resolveval);
        }
        this.running=false;
    }
}

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
    let hook=null;
    if (comp.hooks.length - 1 < hookIndex) {
        comp.hooks.push({
            type: useEffect,
            phase:'mount',
            fn: fn,
            args: null,
            terminal: null,
            run: null
        });
        hook = comp.hooks[hookIndex];
    } else {
        hook = comp.hooks[hookIndex];
        hook.phase='update';
    }

    hook.fn = fn;
    hook.run = !shallowCompare(hook.args, args);
    hook.args = args;
}
let setvalpipe=new Promise(res=>res());
export function useState(def) {
    const comp = CurrentComponent;
    if (!comp) throw "running state outside of component";

    const hookIndex = ++CurrentHook;
    if (comp.hooks.length - 1 < hookIndex)
        comp.hooks.push({
            type: useState,
            val: def,
            setVal: (newval:any) => {
                if (newval && newval.constructor===Function) {                             
                    setvalpipe = setvalpipe.then(()=>{
                        var n= newval(comp.hooks[hookIndex].val);
                        return new Promise(res=>res(n)).then(n=> {
                            if (n === comp.hooks[hookIndex].val) {
                                return;
                            } 
                            comp.hooks[hookIndex].val = n;
                            queueRerun(comp);
                        });
                    });
                } else {
                    if (newval === comp.hooks[hookIndex].val) return;
                    comp.hooks[hookIndex].val = newval;
                    queueRerun(comp);
                }
            },
            rerun:()=> {
                queueRerun(comp);
            }
        });

    const val = comp.hooks[hookIndex].val;
    const setVal = comp.hooks[hookIndex].setVal;
    const rerun=comp.hooks[hookIndex].rerun;
    
    return [val, setVal, rerun, comp.hooks[hookIndex]];
}
export function useRef() {
    const comp = CurrentComponent;
    if (!comp) throw "running state outside of component";

    const hookIndex = ++CurrentHook;
    if (comp.hooks.length - 1 < hookIndex)
        comp.hooks.push({
            type: useRef,
            val: {
                current:null
            }
        });

    const val = comp.hooks[hookIndex].val;
    
    return val;
}

function runComponent(parentComp: RepositoryEntry) {
    CurrentComponent = parentComp;
    CurrentHook = -1;

    let components = parentComp.component(parentComp.props) || [];
    components = components.constructor===Array ? components : [components];

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
