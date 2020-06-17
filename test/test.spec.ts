var exp = require("chai").expect;
var sinon = require("sinon");
// @ts-ignore
var { root, component, useRef, useEffect, useState, useResetableState, Promise } = require("../src/index");

xdescribe("foo", () => {
    it('should be removed', c=> {
        const foo = sinon.spy();
        
        const prom=new Promise(res=>setTimeout(res,500));
        const useTrigger=(b)=> {
            const [a,setA]=useState(1);

            useEffect(()=> {
                if (a===1)
                    prom.then(v=>setA(2))
            })
            

            return {a, b}
        }
        const childComp=()=> {
            const a= useTrigger('child');
            foo(a);
        }
        root(component(()=> {

            const a=useTrigger('parent');

            foo(a);
            return component(childComp, {...a});
        }))

        setTimeout(()=> {
            console.log(foo.args);
            c();
        },1000);
    })
});

describe("tests...", () => {
    describe("init...", () => {
        it("components run when supplied", () => {
            const foo = sinon.spy();
            const boo = sinon.spy();
            root(
                component(foo, { a: 1, b: 2 }),
                component(boo, { a: 3, b: 4 })
            );

            exp(foo.args).to.eql([[{ a: 1, b: 2 }]]);
            exp(boo.args).to.eql([[{ a: 3, b: 4 }]]);
        });
        describe("shutting down...", () => {
            it("shutts down system", c => {
                const foo = sinon.spy();
                function a() {
                    useEffect(() => {
                        return () => {
                            foo("terminal a");
                        };
                    });
                }
                function b() {
                    useEffect(() => {
                        return () => {
                            foo("terminal b");
                        };
                    });
                }
                const system = root(
                    component(a, { a: 1, b: 2 }),
                    component(b, { a: 3, b: 4 })
                );

                setTimeout(() => {
                    system.shutdown();
                    exp(foo.args).to.eql([["terminal a"], ["terminal b"]]);
                    c();
                }, 100);
            });
        });
    });

    describe("components...", () => {
        describe("components returned from components...", () => {
            it('throw of key, order mismatch', ()=> {
                const comp1=()=> {

                }
                const comp2=()=> {

                }

                try {
                    root(component(function() {
                        return [
                            component(comp1, {key:1}),
                            component(comp2, {key:2})
                        ]
                    }));
                    exp(true).to.eql(false);
                } catch(e){
                    exp(true).to.eql(true);
                }
                
            })
            describe('by key', ()=> {
                
                it('new keys are added, existing ones are rerun, and old are removed', c=> {
                    const foo = sinon.spy();

                    const comp1=({key})=> {
                        useEffect(()=> {
                            foo(key);
                            return ()=> {
                                foo(`remove: ${key}`)
                            }
                        },[key])
                        
                    }
                    root(component(function() {
                        const [a,seta]=useState(0);
                        foo(`run: ${a}`);
                        useEffect(()=> {
                            if (a===0) {
                                seta(1);
                            } else if (a===1) {
                                seta(2);
                            }
                                
                        })

                        if (a===0)
                            return component(comp1, {key:2});
                        else if (a===1)
                            return [
                                component(comp1, {key:1}),
                                component(comp1, {key:2})
                            ]
                        else if (a===2)
                            return [
                                component(comp1, {key:1}),
                                component(comp1, {key:3})
                            ]
                    }));

                    setTimeout(()=> {
                        exp(foo.args).to.eql([ 
                            [ 'run: 0' ],
                            [ 2 ],
                            [ 'run: 1' ],
                            [ 1 ],
                            [ 'run: 2' ],
                            [ 'remove: 2' ],
                            [ 3 ] 
                        ]);
                        c();
                    },400)
                })

            })


            describe('by order', ()=> {

                it('can return single component', ()=> {
                    const foo = sinon.spy(props => {});
                    const comp = props => {
                        return component(foo, { a: 1, b: 1 });
                    };
    
                    root(component(comp));
    
                    exp(foo.args).to.eql([[{ a: 1, b: 1 }]]);
                });
                it("are run if new", () => {
                    const foo = sinon.spy(props => {});
                    const comp = props => {
                        return [component(foo, { a: 1, b: 1 })];
                    };
    
                    root(component(comp));
    
                    exp(foo.args).to.eql([[{ a: 1, b: 1 }]]);
                });
                it("are rerun only if props changed", c => {
                    const foo = sinon.spy();
                    const boo = sinon.spy();
                    const comp = props => {
                        const [a, setA] = useState(1);
                        setA(2);
                        return [
                            component(foo, { a: 1, b: 1 }),
                            component(boo, { a: a, b: 1 })
                        ];
                    };
    
                    root(component(comp));
    
                    setImmediate(() => {
                        exp(foo.args).to.eql([[{ a: 1, b: 1 }]]);
                        exp(boo.args).to.eql([[{ a: 1, b: 1 }], [{ a: 2, b: 1 }]]);
                        c();
                    });
                });
                it("old components are removed", c => {
                    const foo = sinon.spy();
                    const boo = sinon.spy();
                    const moo = sinon.spy();
                    const comp = props => {
                        const [a, setA] = useState(1);
                        setA(2);
                        if (a === 2) {
                            return [component(moo, { a: a, b: 1 })];
                        }
                        return [
                            component(foo, { a: a, b: 1 }),
                            component(boo, { a: a, b: 1 })
                        ];
                    };
    
                    root(component(comp));
    
                    setImmediate(() => {
                        exp(foo.args).to.eql([[{ a: 1, b: 1 }]]);
                        exp(boo.args).to.eql([[{ a: 1, b: 1 }]]);
                        exp(moo.args).to.eql([[{ a: 2, b: 1 }]]);
                        c();
                    });
                });

            });


        });
        describe("shut down component...", () => {
            it("throws error when state set", () => {
                /*todo*/
            });
        });
    });

    describe("useEffect...", () => {
        it("runs async after component", c => {
            const foo = sinon.spy();
            function comp(props) {
                useEffect(foo);
            }
            root(component(comp, { a: 1, b: 2 }));

            exp(foo.args).to.eql([]);
            setTimeout(() => {
                exp(foo.args).to.eql([[]]);
                c();
            }, 100);
        });
        describe("useEffect outside component...", () => {
            it("throws error", () => {
                /*todo*/
            });
        });
        describe("before rerun...", () => {
            it("runs terminal effect", c => {
                const foo = sinon.spy();
                root(
                    component(
                        function() {
                            const [a, setA] = useState(1);

                            useEffect(() => {
                                setA(2);
                                foo(`effect ${a}`);
                                return () => {
                                    foo(`terminal ${a}`);
                                };
                            });
                        },
                        { a: 1, b: 2 }
                    )
                );

                setTimeout(() => {
                    exp(foo.args).to.eql([
                        ["effect 1"],
                        ["terminal 1"],
                        ["effect 2"]
                    ]);
                    c();
                }, 100);
            });
        });
        describe("giving 2nd arg vals...", () => {
            it("reruns effect only if any args change", c => {
                const foo = sinon.spy();
                function comp() {
                    const [a, setA] = useState(1);
                    const [b, setB] = useState(1);
                    const [c, setC] = useState(1);

                    foo(`running: ${a}, ${b}, ${c}`);
                    useEffect(() => {
                        foo(`effect: ${a}, ${b}, ${c}`);
                    }, [a, c]);
                    useEffect(() => {
                        if (b === 1) setB(2);
                        if (b === 2) setC(2);
                        if (c === 2) setA(2);
                    });
                }
                root(component(comp));

                setTimeout(() => {
                    exp(foo.args).to.eql([
                        ["running: 1, 1, 1"],
                        ["effect: 1, 1, 1"],
                        ["running: 1, 2, 1"],
                        ["running: 1, 2, 2"],
                        ["effect: 1, 2, 2"],
                        ["running: 2, 2, 2"],
                        ["effect: 2, 2, 2"]
                    ]);
                    c();
                }, 400);
            });
        });
        describe("giving empty 2nd args...", () => {
            it("never reruns", c => {
                const foo = sinon.spy();
                function comp() {
                    const [a, setA] = useState(1);
                    const [b, setB] = useState(1);
                    const [c, setC] = useState(1);

                    foo(`running: ${a}, ${b}, ${c}`);
                    useEffect(() => {
                        foo(`effect: ${a}, ${b}, ${c}`);
                    }, []);
                    useEffect(() => {
                        if (b === 1) setB(2);
                        if (b === 2) setC(2);
                        if (c === 2) setA(2);
                    });
                }
                root(component(comp));

                setTimeout(() => {
                    exp(foo.args).to.eql([
                        ["running: 1, 1, 1"],
                        ["effect: 1, 1, 1"],
                        ["running: 1, 2, 1"],
                        ["running: 1, 2, 2"],
                        ["running: 2, 2, 2"]
                    ]);
                    c();
                }, 400);
            });
            it("runs terminal when shutting down", c => {
                const foo = sinon.spy();
                const comp = ({ b }) => {
                    const [a, setA] = useState(1);
                    foo(`running: ${a}, ${b}`);
                    useEffect(() => {
                        foo(`effect: ${a}, ${b}`);
                        return () => {
                            foo(`terminal: ${a}, ${b}`);
                        };
                    }, []);

                    useEffect(() => {
                        setA(2);
                    });
                };
                root(
                    component(() => {
                        const [b, setB] = useState(1);
                        useEffect(() => {
                            if (b === 1) setB(2);
                            if (b === 2) setB(3);
                        });
                        if (b === 3) return null;
                        return [component(comp, { b })];
                    })
                );

                setTimeout(() => {
                    exp(foo.args).to.eql([
                        ["running: 1, 1"],
                        ["effect: 1, 1"],
                        ["running: 2, 1"],
                        ["running: 2, 2"],
                        ["terminal: 1, 1"]
                    ]);
                    c();
                }, 400);
            });
        });
        describe("shutting down component...", () => {
            it("runs terminal effects", c => {
                const foo = sinon.spy();
                const comp = ({ b }) => {
                    foo(`running: ${b}`);
                    useEffect(() => {
                        foo(`effect: ${b}`);
                        return () => {
                            foo(`terminal: ${b}`);
                        };
                    }, []);
                };
                root(
                    component(() => {
                        const [b, setB] = useState(1);
                        useEffect(() => {
                            if (b === 1) setB(2);
                        });
                        if (b === 2) return null;
                        return [component(comp, { b })];
                    })
                );

                setTimeout(() => {
                    exp(foo.args).to.eql([
                        ["running: 1"],
                        ["effect: 1"],
                        ["terminal: 1"]
                    ]);
                    c();
                }, 400);
            });
        });
    });
    describe('useRef...', ()=> {
        it('retains same ref', c=> {
            const foo = sinon.spy();
            const sub={foo:1};
            function comp(props) {
                var a=useRef();
                var [b,setB]=useState(1);
                
                useEffect(()=> {
                    a.current=sub;
                },[])
                
                useEffect(()=> {
                    if (b<3)
                        setB(b=>b+1);
                })

                foo(a.current);
            }
            root(component(comp));

            setTimeout(() => {
                exp(foo.args[1][0]).to.equal(foo.args[2][0])
                c();
            }, 500);
        })
    })
    describe('useResetableState...', ()=> {
        describe('works like useState', ()=> {
            it("default val first time", () => {
                const VAL = 2;
                const foo = sinon.spy();
                function comp(props) {
                    const [a] = useResetableState(VAL);
                    foo(a);
                }
                root(component(comp, { a: 1, b: 2 }));
    
                exp(foo.args).to.eql([[2]]);
            });
            it("reevaluate component when state changes", c => {
                /*does so async and does not rerun if setState was the same value*/
                const INIT_VAL = 2;
                const NEW_VAL = 3;
                const foo = sinon.spy();
                const comp = sinon.spy(props => {
                    const [a, setA] = useResetableState(INIT_VAL);
    
                    setA(NEW_VAL);
                    foo(a);
                });
                root(component(comp, { a: 1, b: 2 }));
    
                exp(comp.args).to.eql([[{ a: 1, b: 2 }]]);
                setImmediate(() => {
                    exp(comp.args).to.eql([[{ a: 1, b: 2 }], [{ a: 1, b: 2 }]]);
                    exp(foo.args).to.eql([[2], [3]]);
                    c();
                });
            });
            describe('supplying args...', ()=> {
                it('resets when args change...', c=> {
                    const foo = sinon.spy();
                    const comp = ()=> {
                        const [r, setR]=useState(1);
                        const [r2, setR2]=useState(1);
                        const [a, setA] = useResetableState(1,[r,r2]);
        
                        useEffect(()=> {
                            setA(a=>a < 4 ? a+1 : 4);

                            if (a===2)
                                setR(r=>r < 2 ? 2 : r);
                            if (a===3)
                                setR2(r=>r < 2 ? 2 : r);
                            if (a===4) {
                                setR(r=>r < 3 ? 3 : r);
                                setR2(r=>r < 3 ? 3 : r);
                            }
                        })

                        foo(a);
                    };
                    root(component(comp));
        
                    setTimeout(() => {
                        exp(foo.args).to.eql([ [ 1 ],
                            [ 2 ],
                            [ 1 ],
                            [ 2 ],
                            [ 3 ],
                            [ 1 ],
                            [ 2 ],
                            [ 3 ],
                            [ 4 ],
                            [ 1 ],
                            [ 2 ],
                            [ 3 ],
                            [ 4 ] ])
                        c();
                    },1000);
                })
            })
        })
    });
    describe("useState...", () => {
        it("default val first time", () => {
            const VAL = 2;
            const foo = sinon.spy();
            function comp(props) {
                const [a] = useState(VAL);
                foo(a);
            }
            root(component(comp, { a: 1, b: 2 }));

            exp(foo.args).to.eql([[2]]);
        });
        it("reevaluate component when state changes", c => {
            /*does so async and does not rerun if setState was the same value*/
            const INIT_VAL = 2;
            const NEW_VAL = 3;
            const foo = sinon.spy();
            const comp = sinon.spy(props => {
                const [a, setA] = useState(INIT_VAL);

                setA(NEW_VAL);
                foo(a);
            });
            root(component(comp, { a: 1, b: 2 }));

            exp(comp.args).to.eql([[{ a: 1, b: 2 }]]);
            setImmediate(() => {
                exp(comp.args).to.eql([[{ a: 1, b: 2 }], [{ a: 1, b: 2 }]]);
                exp(foo.args).to.eql([[2], [3]]);
                c();
            });
        });
        describe('setVal...',()=> {
            it('always has the same reference', c=> {
                const foo=sinon.spy();
                root(component(()=> {
                    const[a,setA]=useState(1);

                    setA(2);

                    return component(foo, {setA})
                }));
                setTimeout(()=> {
                    exp(foo.args.length).to.equal(1);
                    
                    c();
                },100)
            });
            describe('using funciton...', ()=> {
                it('executes set val on universal queue', c=> {
                    const foo=sinon.spy();
                    root(component(()=> {
                        const[a,setA]=useState(1);
            
                        useEffect(()=> {
                            setA(a=> {
                                foo('b',a);                    
            
                                var p = new Promise(res=>setTimeout(res,100))
                                    .then(()=> {
                                        return a+1
                                    });
            
                                return p;
                            });
                            setA(a=> {
            
                                foo('c',a);
                                return a+1;
                            })
                        },[]);
            
                        foo('a',a);
                    }));
                    setTimeout(()=> {
                        exp(foo.args).to.eql([ [ 'a', 1 ], [ 'b', 1 ], [ 'c', 2 ], [ 'a', 3 ] ]);
                        
                        c();
                    },1000)
                })
            })
        })
        describe("useState outside component...", () => {
            it("throws error", () => {
                /*todo*/
            });
        });
        describe("useState on shutdown component...", () => {
            it("throws error", () => {
                /*todo*/
            });
        });
        describe("change many states at once...", () => {
            it("component still reruns only once", c => {
                /*does so async and does not rerun if setState was the same value*/
                const INIT_VAL = 2;
                const NEW_VAL = 3;
                const foo = sinon.spy();
                const comp = sinon.spy(props => {
                    const [a, setA] = useState(INIT_VAL);
                    const [b, setB] = useState(INIT_VAL);

                    setA(NEW_VAL);
                    setB(NEW_VAL);
                    foo(a);
                });
                root(component(comp, { a: 1, b: 2 }));

                setImmediate(() => {
                    exp(comp.args).to.eql([[{ a: 1, b: 2 }], [{ a: 1, b: 2 }]]);
                    c();
                });
            });
        });
        describe("attempt to hook mismatch...", () => {
            it("throw error", () => {
                /*todo*/
            });
        });
    });
});
