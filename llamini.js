        import {
        pipeline,
        env
    } from './transformers@3.5.0.js';

    const MODEL = 'Xenova/LaMini-T5-61M';

    const dot = document.getElementById('dot');
    const status = document.getElementById('status');
    const messages = document.getElementById('messages');
    const empty = document.getElementById('empty');
    const input = document.getElementById('input');
    const sendBtn = document.getElementById('send');
    const progBar = document.getElementById('progress-bar');
    const progFill = document.getElementById('progress-fill');

    // auto-grow textarea
    input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

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
    let busy = false;

    function setStatus(text) {
        status.textContent = text;
    }

    function addMessage(role, text, extra = '') {
        empty.classList.add('hidden');
        const wrap = document.createElement('div');
        wrap.className = `msg ${role}`;
        const label = document.createElement('div');
        label.className = 'msg-label';
        label.textContent = role === 'user' ? 'you' : 'Llamini';
        const bubble = document.createElement('div');
        bubble.className = 'bubble' + (extra ? ' ' + extra : '');
        bubble.textContent = text;
        wrap.appendChild(label);
        wrap.appendChild(bubble);
        messages.appendChild(wrap);
        messages.scrollTop = messages.scrollHeight;
        return bubble;
    }

    function showDiag(err) {
        empty.classList.add('hidden');
        const ua = navigator.userAgent;
        const wasm = typeof WebAssembly !== 'undefined';
        const sab = typeof SharedArrayBuffer !== 'undefined';
        const mem = navigator.deviceMemory ?? 'unknown';
        const lines = [
            '── LOAD FAILED ──',
            '',
            `error: ${err?.message ?? String(err)}`,
            '',
            ...(err?.stack ? [`stack:\n${err.stack}`, ''] : []),
            '── diagnostics ──',
            `wasm:   ${wasm}`,
            `sab:    ${sab}`,
            `coi:    ${crossOriginIsolated}`,
            `ram:    ${mem} GB (hint)`,
            `ua:     ${ua}`,
        ];

        const wrap = document.createElement('div');
        wrap.className = 'msg bot';
        const label = document.createElement('div');
        label.className = 'msg-label';
        label.textContent = 'error';
        const bubble = document.createElement('pre');
        bubble.className = 'bubble';
        bubble.style.cssText = 'white-space:pre-wrap;word-break:break-all;font-size:11px;color:#ff7eb3;';
        bubble.textContent = lines.join('\n');
        wrap.appendChild(label);
        wrap.appendChild(bubble);
        messages.appendChild(wrap);
        messages.scrollTop = messages.scrollHeight;
    }

    // Load model
    dot.className = 'model-dot loading';
    progBar.classList.add('active');

    try {
        let startTime = new Date().getTime();
        generator = await pipeline('text2text-generation', MODEL, {
            dtype: 'q8',
            progress_callback: (p) => {
                try {
                    if (p.status === 'downloading' && p.total) {
                        const pct = Math.round((p.loaded / p.total) * 100);
                        progFill.style.width = pct + '%';
                        setStatus(`downloading… ${pct}%`);
                    } else if (p.status === 'initiate') {
                        setStatus('loading weights…');
                    } else if (p.status === 'loading') {
                        setStatus('compiling wasm…');
                    }
                } catch (err) {
                    dot.className = 'model-dot';
                    setStatus('failed to load');
                    progBar.classList.remove('active');
                    console.error(err);
                    showDiag(err);
                }
            }
        });

        dot.className = 'model-dot ready';
        setStatus('ready');
        progBar.classList.remove('active');
        input.disabled = false;
        sendBtn.disabled = false;
        input.focus();
        const ua = navigator.userAgent;
        const wasm = typeof WebAssembly !== 'undefined';
        const sab = typeof SharedArrayBuffer !== 'undefined';
        const mem = navigator.deviceMemory ?? 'unknown';
        console.log({
            ua,
            wasm,
            sab,
            mem
        });
        addMessage('System', `Took ${(new Date().getTime()-startTime)/1000} seconds`);
    } catch (err) {
        dot.className = 'model-dot';
        setStatus('failed to load');
        progBar.classList.remove('active');
        console.error(err);
        showDiag(err);
    }

    async function send() {
        if (busy || !generator) return;
        const text = input.value.trim();
        if (!text) return;

        busy = true;
        sendBtn.disabled = true;
        input.value = '';
        input.style.height = 'auto';

        addMessage('user', text);
        const thinkBubble = addMessage('bot', '…', 'thinking');

        try {
            const result = await generator(text, {
                max_new_tokens: 128,
                // T5 doesn't need much more — it's a text2text model
            });
            const out = dedup(result[0]?.generated_text) ?? '(no output)';
            thinkBubble.textContent = out;
            thinkBubble.classList.remove('thinking');
        } catch (err) {
            thinkBubble.textContent = 'error: ' + err.message;
            thinkBubble.classList.remove('thinking');
            console.error(err);
        }

        busy = false;
        sendBtn.disabled = false;
        input.focus();
    }

    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    });
