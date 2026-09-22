import { createRoot, type Root } from "react-dom/client";
import AITextLoading from "./components/ui/ai-text-loading";
import "./index.css";

const roots = new WeakMap<Element, Root>();
const observers = new WeakMap<Element, MutationObserver>();

function mount(el: Element, opts?: { texts?: string[]; interval?: number }) {
  if (roots.has(el)) {
    unmount(el);
  }

  // The host app (Eslam1141.github.io/styles.css) is unconditionally
  // dark-themed with no `prefers-color-scheme` media query at all, but
  // Tailwind's `dark:` variants are gated behind `darkMode: "class"`
  // (see tailwind.config.js) rather than the OS preference. Force the
  // dark variant here so a light-OS user doesn't get the base (non-dark)
  // gradient painted on the host's always-dark background.
  el.classList.add("dark");

  const root = createRoot(el);
  roots.set(el, root);
  root.render(<AITextLoading texts={opts?.texts} interval={opts?.interval} />);

  // The vanilla app's own mount() helper (coach.js) replaces the whole
  // loading view via `container.innerHTML = ""` when the real result
  // arrives — it has no idea a React root lives inside `el` and will
  // never call unmount() for us. Left alone, AITextLoading's
  // setInterval keeps firing forever on a detached tree. Watch for `el`
  // leaving the document and clean up automatically, so every call
  // site that tears down the loading view is covered without having to
  // remember an explicit teardown call.
  const observer = new MutationObserver(() => {
    if (!document.contains(el)) {
      unmount(el);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  observers.set(el, observer);
}

function unmount(el: Element) {
  const observer = observers.get(el);
  if (observer) {
    observer.disconnect();
    observers.delete(el);
  }
  const root = roots.get(el);
  if (root) {
    root.unmount();
    roots.delete(el);
  }
}

declare global {
  interface Window {
    CoachLoadingWidget: { mount: typeof mount; unmount: typeof unmount };
  }
}

window.CoachLoadingWidget = { mount, unmount };
