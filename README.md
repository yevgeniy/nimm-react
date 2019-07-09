# NIMM-REACT

React works great on the client why not use it on the server?  Now you can.

```
const {
    root, 
    component, 
    useState, 
    useEffect, 
    useRef
} = require('nimm-react');
```

## install

`npm install --save nimm-react`

## what is supported

### root

This is where it all starts similar to ReactDOM.render.  You can pass in multiple components.  Returns destructor object.

```
const destructor = root(
    component(fn1),
    component(fn2),
    component(fn3)
); // start

destructor.shutdown(); // this will shut down the system.
```

### component

Component on the server would represent a unit of activity.  This takes a function reference and an object for props.  No class components.  Component will rerender if any props differ by reference or if internal hook queued a rerender.  Component can return another component, an array of components or nothing.

```
function animals() {
    const dogprops = useDog();
    const catprops = useCat();
    return [
        component(dog, {...dogprops}),
        component(cat, {...catprops}),
    ]
}

root(component(animals))
```

### useState

This functions just like useState hook (https://reactjs.org/docs/hooks-state.html) except this will also expose a 3rd prop which, when called, will force reload the state.  This is usefull when dealing with modules that rely on reference integrity instead of state.

```
const _model = require('3rd-party-module');
function useModel() {
    const [model, setModel, rerun] = useState(_model);

    const update(prop, val) {
        model[prop]=val;
        rerun();
    }

    return [model, update];
}
```

Given the simplicity of the engine you can call setVal in the body of the component.  The component will queue the update and rerender based on setImmediate.

Setting value is possible using a function.  Just like in React this will update the state in order queued.

```
const [a,setA]=useState(1);
setA(async a=> { // a is 1 and returns 2;
    await new Promise(res=>setTimeout(res,1000))

    return a+1;
})
setA(a=> { // a is 2  and returns 3;
    return a+1;
}) 
```

### useEffect

Just like useEffect in React https://reactjs.org/docs/hooks-state.html

### useRef

Just like useRef in React https://reactjs.org/docs/hooks-state.html