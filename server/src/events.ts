import { EventEmitter } from "events";
import type { Token } from "./db/schema";

class PumpEventEmitter extends EventEmitter {
  emitToken(token: Token) {
    this.emit("token", token);
  }

  onToken(listener: (token: Token) => void) {
    this.on("token", listener);
  }
}

export const pumpEvents = new PumpEventEmitter();
