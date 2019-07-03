var exp = require("chai").expect;
var sinon = require("sinon");
var { root, component, useEffect, useState } = require("../src/index");

xdescribe("foo", () => {
    // it("are rerun only if props changed", c => {
    //     const foo = sinon.spy(props => console.log("RAN FOO", props));
    //     const boo = sinon.spy(props => console.log("RAN BOO", props));
    //     const comp = props => {
    //         const [a, setA] = useState(1);
    //         setA(2);
    //         return [
    //             component(foo, { a: 1, b: 1 }),
    //             component(boo, { a: a, b: 1 })
    //         ];
    //     };
    //     root(component(comp));
    //     setImmediate(() => {
    //         exp(foo.args).to.eql([[{ a: 1, b: 1 }]]);
    //         exp(boo.args).to.eql([[{ a: 1, b: 1 }], [{ a: 2, b: 1 }]]);
    //         c();
    //     });
    // });
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
            it("old components are removed", () => {});
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
            setImmediate(() => {
                exp(foo.args).to.eql([[]]);
                c();
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
    });
});
