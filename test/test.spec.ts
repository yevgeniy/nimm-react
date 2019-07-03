var exp = require("chai").expect;
var sinon = require("sinon");
var { root, component, useEffect, useState } = require("../src/index");

xdescribe("foo", () => {
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
            it("shutds down system", () => {
                /*todo*/
            });
        });
    });

    describe("components...", () => {
        describe("components returned from components...", () => {
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

        describe("shutting down component...", () => {
            it("runs terminal effects", () => {
                /*todo*/
            });
        });
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
        describe("attempt to hook mismatch...", () => {
            it("throw error", () => {
                /*todo*/
            });
        });
    });
});
