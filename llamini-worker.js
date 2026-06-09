import { pipeline, env } from './transformers@3.5.0.js';

await import('./client-router.js?'+(env == 'DEV' ? new Date().getTime() : ''));

const MODEL = 'Xenova/LaMini-T5-61M';

const dedup = (txt = '') => {
    const uniq = [];
    const words = txt.split(/\s+/);
    const words_length = words.length;
    for (let i = 0; i !== words_length; ++i) {
        const word = words[i];
        if (word !== words[i + 1]) {
            uniq.push(word);
        }
    }
    return uniq.join(' ');
};

let generator = null;

async function loadModel() {
    try {
        const startTime = Date.now();
        generator = await pipeline('text2text-generation', MODEL, {
            dtype: 'q8',
            progress_callback: (p) => {
                try {
                    if (p.status === 'downloading' && p.total) {
                        const pct = Math.round((p.loaded / p.total) * 100);
                        self.postMessage({ type: 'progress', pct });
                        self.postMessage({ type: 'status', text: `downloading… ${pct}%` });
                    } else if (p.status === 'initiate') {
                        self.postMessage({ type: 'status', text: 'loading weights…' });
                    } else if (p.status === 'loading') {
                        self.postMessage({ type: 'status', text: 'compiling wasm…' });
                    }
                } catch (err) {
                    self.postMessage({ type: 'load-error', message: err.message, stack: err.stack });
                }
            }
        });

        const elapsed = (Date.now() - startTime) / 1000;
        self.postMessage({ type: 'loaded', elapsed });
    } catch (err) {
        self.postMessage({ type: 'load-error', message: err.message, stack: err.stack });
    }
}

async function generate(id, text) {
    if (!generator) return;
    try {
        const result = await generator(text, {
            max_new_tokens: 128,
            temperature: 0.7,
            do_sample: true,
            repetition_penalty: 1.1,
            length_penalty: 1.1,
            token_healing: true,
            renormalize_logits: true,
            num_beams: 4,
            use_cache: true
        });
        const out = dedup(result?.[0]?.generated_text) || '(no output)';
        self.postMessage({ type: 'result', id, text: out });
    } catch (err) {
        self.postMessage({ type: 'result-error', id, message: err.message });
    }
}

self.addEventListener('message', (e) => {
    const { type, id, text } = e.data;
    if (type === 'load') {
        loadModel();
    } else if (type === 'generate') {
        generate(id, text);
    }
});
