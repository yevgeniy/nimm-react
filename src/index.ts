import * as vm from "vm";

class Prompt {
  input: NodeJS.ReadStream;

  constructor() {
    this.input = process.stdin;
  }

  listen(): Promise<string> {
    let ret = "";

    return new Promise(resolve => {
      if (this.input.isTTY) {
        resolve(ret);
        return;
      }

      this.input.setEncoding("utf8");

      this.input.on("readable", () => {
        let chunk;

        while ((chunk = this.input.read())) {
          ret += chunk;
        }
      });

      this.input.on("end", () => {
        resolve(ret);
      });
    });
  }
}

/**
 * Presents an alert.
 *
 * Use this to configure an alert presented modally or as a sheet. After configuring the alert,
 * call `presentAlert()` or `presentSheet()` to present the alert. The two presentations methods will
 * return a value which carries the index of the action that was selected when fulfilled.
 */
class Alert {
  public title: string;
  public message: string;

  private _actionIndex: number = 0;
  private _actions: Map<number, string> = new Map();
  private _destructiveActions: Map<number, string> = new Map();
  private _cancelActions: Map<number, string> = new Map();
  private _textFields: {
    type: "text" | "secure";
    placeholder?: string;
    title?: string;
  }[] = [];

  constructor() {}

  addAction(title: string) {
    this._actions.set(this._actionIndex, title);
    this._actionIndex++;
  }

  addDestructiveAction(title: string) {
    this._destructiveActions.set(this._actionIndex, title);
    this._actionIndex++;
  }

  addCancelAction(title: string) {
    this._cancelActions.set(-1, title);
  }

  addTextField(placeholder?: string, title?: string) {
    this._textFields.push({ type: "text", placeholder, title });
  }

  addSecureTextField(placeholder?: string, title?: string) {
    this._textFields.push({ type: "secure", placeholder, title });
  }

  textFieldValue(index: number) {
    if (!this._textFields.length) {
      return;
    }

    return this._textFields[index];
  }

  async present(): Promise<number> {
    return await this.presentAlert();
  }

  async presentAlert(): Promise<number> {
    const prompt = new Prompt();
    const result = await prompt.listen();
    return parseInt(result, 10);
  }

  async presentSheet(): Promise<number> {
    const prompt = new Prompt();
    const result = await prompt.listen();
    return parseInt(result, 10);
  }
}

const alert = new Alert();
alert.title = "What";
alert.message = "noo";

alert.addAction("What");
alert.addCancelAction("Cancel");

(async () => {
  console.log(process.argv);
  const index = await alert.presentAlert();
  console.log(index);
})();

// class ScriptableVM {
//   context: vm.Context;

//   constructor() {
//     this.context = vm.createContext({
//       thisIsGlobal: 1,
//       console: console
//     });
//   }

//   onError(error) {
//     console.error("Failed with error\n", error);
//   }

//   run(code: string): any {
//     try {
//       return vm.runInNewContext(code, this.context);
//     } catch (error) {
//       this.onError(error);
//     }
//   }
// }

// const scriptableVM = new ScriptableVM();

// console.time("vm");
// const result = scriptableVM.run("console.log('what')");
// console.timeEnd("vm");
