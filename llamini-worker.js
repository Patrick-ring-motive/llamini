import { pipeline, env, TextStreamer } from "./transformers@3.5.0.js";

// Register listener before top-level await so no messages are dropped
self.addEventListener("message", (e) => {
  const { type, id, text } = e.data;
  if (type === "load") {
    loadModel();
  } else if (type === "generate") {
    generate(id, text);
  }
});

const MODEL = "Xenova/LaMini-T5-61M";

let router = import(
  "./client-router.js?" + (env == "DEV" ? new Date().getTime() : "")
);

const dedup = (txt = "") => {
  const uniq = [];
  const words = txt.split(/\s+/);
  const words_length = words.length;
  for (let i = 0; i !== words_length; ++i) {
    const word = words[i];
    if (word !== words[i + 1]) {
      uniq.push(word);
    }
  }
  return uniq.join(" ");
};

let generator = null;

async function loadModel() {
  try {
    if (router instanceof Promise) {
      router = await router;
    }
    const startTime = Date.now();
    generator = await pipeline("text2text-generation", MODEL, {
      dtype: "q8",
      progress_callback: (p) => {
        try {
          if (p.status === "downloading" && p.total) {
            const pct = Math.round((p.loaded / p.total) * 100);
            self.postMessage({ type: "progress", pct });
            self.postMessage({ type: "status", text: `downloading… ${pct}%` });
          } else if (p.status === "initiate") {
            self.postMessage({ type: "status", text: "loading weights…" });
          } else if (p.status === "loading") {
            self.postMessage({ type: "status", text: "compiling wasm…" });
          }
        } catch (err) {
          self.postMessage({
            type: "load-error",
            message: err.message,
            stack: err.stack,
          });
        }
      },
    });

    const elapsed = (Date.now() - startTime) / 1000;
    self.postMessage({ type: "loaded", elapsed });
  } catch (err) {
    self.postMessage({
      type: "load-error",
      message: err.message,
      stack: err.stack,
    });
  }
}

async function generate(id, text) {
  if (router instanceof Promise) {
    router = await router;
  }
  if (!generator) return;
  try {
    const streamer = new TextStreamer(generator.tokenizer, {
      skip_prompt: true,
      callback_function: (token) => {
        self.postMessage({ type: "token", id, token });
      },
    });
    await generator(text, {
      max_new_tokens: 256,
      do_sample: true,
      temperature: 0.7,
      repetition_penalty: 1.3, // bump up — small models repeat a lot
      renormalize_logits: true,
      num_beams: 1, // required for streaming
      streamer,
    });
    self.postMessage({ type: "result-done", id });
  } catch (err) {
    self.postMessage({ type: "result-error", id, message: err.message });
  }
}
