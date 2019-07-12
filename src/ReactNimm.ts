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

export function useResetableState(def, props) {
    const [val, setVal, rerun, guts]=useState(def);
    const oldprops=guts.props;
    guts.props=props;
    let reset=false;

    const o=oldprops||[];
    const n=props||[];
    if (o.length !==n.length)
        reset=true;
    else
        for(let x=0; x<o.length; x++) {
            if (o[x]!==n[x]) {
                reset=true;
                break;
            }
        }
    
    if (reset) {
        guts.val=def;
    }
    
    return [guts.val, setVal, rerun, guts];
}
export function useCallback(fn, props) {
    const [res]=useResetableState(fn,props);
    return res;
}

function runComponent(subjectComponent: RepositoryEntry) {
    CurrentComponent = subjectComponent;
    CurrentHook = -1;

    console.log(subjectComponent)
    let components = subjectComponent.component(subjectComponent.props) || [];
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
        if (!subjectComponent.children[i]) {
            subjectComponent.children[i] = comp;
            runComponents.push(comp);
        } else if (subjectComponent.children[i].component !== comp.component) {
            shutdownComponent(subjectComponent.children[i]);
            subjectComponent.children[i] = comp;
            runComponents.push(comp);
        } else if (
            !shallowCompare(
                comp.props || {},
                subjectComponent.children[i].props || {}
            )
        ) {
            subjectComponent.children[i].props = comp.props;
            runComponents.push(subjectComponent.children[i]);
        }
    });

    /*shutdown all other components exceeding current comp lenth*/
    subjectComponent.children.splice(comps.length).forEach(shutdownComponent);

    runComponents.forEach(runComponent);

    CurrentComponent = subjectComponent;
    /*run effect hooks*/
    subjectComponent.hooks.forEach(hook => {
        if (hook.type === useEffect && hook.run) {
            
            setImmediate(() => {
                hook.terminal && hook.terminal();
                hook.terminal = hook.fn();
            });
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
