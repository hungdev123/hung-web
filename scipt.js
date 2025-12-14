(function(){
    /* Hamburger toggle */
    const btn = document.querySelector('.hamburger');
    const nav = document.querySelector('.nav-links');
    if(btn && nav){
        btn.addEventListener('click', function(){
            const expanded = this.getAttribute('aria-expanded') === 'true';
            this.setAttribute('aria-expanded', String(!expanded));
            nav.classList.toggle('open');
        });
    }

    /* Page transition overlay (shared) */
    const overlay = document.getElementById('page-overlay');
    const hideClass = 'overlay-hidden';

    function hideOverlay(){ if(!overlay) return; overlay.classList.add(hideClass); }
    function showOverlay(){ if(!overlay) return; overlay.classList.remove(hideClass); }

    // hide when page finished loading
    document.addEventListener('DOMContentLoaded', function(){
        // slight delay so the spinner briefly shows on very fast loads
        requestAnimationFrame(()=> setTimeout(hideOverlay, 120));
    });

    // intercept internal link clicks and show overlay before navigating
    document.addEventListener('click', function(e){
        const a = e.target.closest && e.target.closest('a');
        if(!a) return;
        const href = a.getAttribute('href');
        if(!href) return;
        // ignore anchors, mailto, tel
        if(href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
        if(a.target && a.target !== '_self') return; // leave target=_blank alone
        try{
            const url = new URL(href, location.href);
            if(url.origin !== location.origin) return; // external link
            e.preventDefault();
            showOverlay();
            // small delay to allow CSS to paint overlay
            setTimeout(()=> location.href = url.href, 180);
        }catch(_){ /* invalid url -> ignore */ }
    });

    // Handle AJAX forms (capture phase so we can prevent the shared overlay)
    const ajaxHandled = new WeakSet();
    document.addEventListener('submit', async function(e){
        const form = e.target;
        if(!(form && form.matches && form.matches('.ajax'))) return;
        e.preventDefault();
        ajaxHandled.add(form);
        const submit = form.querySelector('[type=submit]');
        const msg = form.querySelector('.form-message');
        if(submit) { submit.disabled = true; submit.dataset.orig = submit.innerHTML; submit.innerHTML = 'Sending...'; }
        if(msg) { msg.textContent = ''; msg.className = 'form-message'; }

        // If a Formspree ID is provided, send the form there. Otherwise simulate.
        const fsId = form.dataset.formspree;
        if(fsId && fsId !== 'xyzwznnl'){
            try{
                const fd = new FormData(form);
                const payload = Object.fromEntries(fd.entries());
                    const res = await fetch('https://formspree.io/f/' + encodeURIComponent(fsId), {
                    method: 'POST',
                    headers: {'Accept':'application/json','Content-Type':'application/json'},
                    body: JSON.stringify(payload)
                });
                    // try to parse JSON body for helpful messages
                    let body = null;
                    try{ body = await res.json(); }catch(e){ /* non-json response */ }
                    console.log('Formspree response', res.status, body);

                    if(!res.ok){
                        // If Formspree returns validation errors they are usually in body.errors
                        const errMsg = (body && (body.error || (body.errors && body.errors.map(x=>x.message).join('; ')))) || ('Send failed ('+res.status+')');
                        if(msg){ msg.textContent = errMsg; msg.classList.add('error'); }
                        throw new Error(errMsg);
                    }

                    // success
                    if(msg) { msg.textContent = (body && body.message) ? body.message : 'Message sent — thank you!'; msg.classList.add('success'); }
                    try{ form.reset(); }catch(e){}
            }catch(err){
                console.error(err);
                if(msg){ msg.textContent = 'Send failed — try again later.'; msg.classList.add('error'); }
            }finally{
                if(submit){ submit.disabled = false; submit.innerHTML = submit.dataset.orig || 'Send'; }
            }
        }else{
            // no Formspree configured; fallback to local simulation
            setTimeout(()=>{
                if(msg) { msg.textContent = 'Message sent — thank you!'; msg.classList.add('success'); }
                if(submit){ submit.disabled = false; submit.innerHTML = submit.dataset.orig || 'Send'; }
                try{ form.reset(); }catch(e){}
            }, 800);
        }
    }, true);

    // also show overlay on non-ajax form submit
    document.addEventListener('submit', function(e){
        if(ajaxHandled.has(e.target)) { ajaxHandled.delete(e.target); return; }
        showOverlay();
    });

    // restore overlay state for back/forward cached pages
    window.addEventListener('pageshow', function(evt){ if(evt.persisted) hideOverlay(); });

})();