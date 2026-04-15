type Listener = (count: number) => void;

let count = 0;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l(count));
}

export const loaderBus = {
  start() {
    count += 1;
    emit();
  },
  stop() {
    count = Math.max(0, count - 1);
    emit();
  },
  subscribe(l: Listener) {
    listeners.add(l);
    l(count);
    return () => {
      listeners.delete(l);
    };
  },
};
