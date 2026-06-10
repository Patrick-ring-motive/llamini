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

    let modelReady = false;
    let busy = false;
    let pendingId = 0;
    let pendingBubble = null;

    const dedup = (txt = '') => {
      const uniq = [];
      const words = txt.split(/\s+/);
      const words_length = words.length;
      for (let i = 0; i < words_length; ++i) {
        const word = words[i];
        if (word !== words[i + 1]) {
          uniq.push(word);
        }
      }
      return uniq.join(' ');
    };

    const worker = new Worker('./llamini-worker.js', {
      type: 'module'
    });

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

    // Handle worker messages
    worker.addEventListener('message', (e) => {
      const msg = e.data;
      switch (msg.type) {
        case 'status':
          setStatus(msg.text);
          break;
        case 'progress':
          progFill.style.width = msg.pct + '%';
          break;
        case 'loaded':
          modelReady = true;
          dot.className = 'model-dot ready';
          setStatus('ready');
          progBar.classList.remove('active');
          input.disabled = false;
          sendBtn.disabled = false;
          input.focus();
          addMessage('System', `Took ${msg.elapsed} seconds`);
          break;
        case 'load-error':
          dot.className = 'model-dot';
          setStatus('failed to load');
          progBar.classList.remove('active');
          showDiag({
            message: msg.message,
            stack: msg.stack
          });
          break;
        case 'token':
          if (pendingBubble) {
            if (pendingBubble.classList.contains('thinking')) {
              pendingBubble.textContent = '';
              pendingBubble.classList.remove('thinking');
            }
            pendingBubble.textContent += msg.token;
            messages.scrollTop = messages.scrollHeight;
          }
          break;
        case 'result-done':
          if (pendingBubble) {
            const raw = pendingBubble.textContent.trim();
            pendingBubble.textContent = dedup(raw) || '(no output)';
          }
          busy = false;
          sendBtn.disabled = false;
          input.focus();
          break;
        case 'result-error':
          if (pendingBubble) {
            pendingBubble.textContent = 'error: ' + msg.message;
            pendingBubble.classList.remove('thinking');
          }
          busy = false;
          sendBtn.disabled = false;
          input.focus();
          break;
      }
    });

    // Load model
    dot.className = 'model-dot loading';
    progBar.classList.add('active');
    worker.postMessage({
      type: 'load'
    });

    function send() {
      if (busy || !modelReady) return;
      const text = input.value.trim();
      if (!text) return;

      busy = true;
      sendBtn.disabled = true;
      input.value = '';
      input.style.height = 'auto';

      addMessage('user', text);
      pendingBubble = addMessage('bot', '…', 'thinking');
      pendingId++;
      worker.postMessage({
        type: 'generate',
        id: pendingId,
        text
      });
    }

    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });
