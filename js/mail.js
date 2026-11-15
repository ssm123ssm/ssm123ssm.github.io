export function setupMail(form, status, contact) {
  const say = (lines, cls = '') => {
    status.className = 'status ' + cls;
    status.textContent = lines.join('\n');
  };
  const body = form.elements.message;

  body.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); form.requestSubmit(); }
  });

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const from = form.elements.email, msg = body.value.trim();
    if (!from.value.trim() || !from.checkValidity()) { say(['mail: From needs your email address, so I can reply.'], 'err'); from.focus(); return; }
    if (!msg) { say(['mail: the message is empty.'], 'err'); body.focus(); return; }
    if (form.elements._gotcha.value) { say(['EOT', 'Message sent.']); form.reset(); return; }
    if (!contact.endpoint) { say(['mail: sending is not set up yet.'], 'err'); return; }

    const data = new FormData(form);
    data.delete('_gotcha');
    const subject = form.elements.subject.value.trim() || '(no subject)';
    data.set('subject', subject);
    data.set('_subject', `Portfolio: ${subject}`);
    for (const [k, v] of Object.entries(contact.fields || {})) data.set(k, v);

    const button = form.querySelector('button');
    button.disabled = true;
    say(['Sending...']);
    try {
      const res = await fetch(contact.endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`the server said ${res.status}`);
      say(['EOT', `Message sent. I will reply to ${from.value.trim()}.`], 'ok');
      form.reset();
    } catch (err) {
      say([`mail: could not send (${err instanceof TypeError ? 'network error' : err.message}). Please try again later.`], 'err');
    } finally {
      button.disabled = false;
    }
  });
}
