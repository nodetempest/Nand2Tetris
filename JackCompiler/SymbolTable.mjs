export class SymbolTable {
  static kind = {
    static: "static",
    field: "field",
    arg: "arg",
    var: "var",
  };

  table = {};

  startSubroutine() {
    this.table = {};
  }

  define(name, type, kind) {
    if (name in this.table) {
      return;
    }

    this.table[name] = {
      type,
      kind,
      index: this.varCount(kind),
    };
  }

  varCount(kind) {
    return Object.values(this.table).filter((record) => record.kind === kind)
      .length;
  }

  kindOf(name) {
    return this.table[name].kind;
  }

  typeOf(name) {
    return this.table[name].type;
  }

  indexOf(name) {
    return this.table[name].index;
  }
}
