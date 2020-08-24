import { invariant } from "./invariant";
import { Struct } from "./ast";

export class Context {
  structures: { [name: string]: Struct } = {};
}
