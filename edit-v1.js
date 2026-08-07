'use strict';

(() => {
  const COLLECTIONS = {
    food: 'food',
    weight: 'weights',
    exercise: 'exercise',
    fund: 'japanFund'
  };

  function ensureStyles() {
    if (document.getElementById('project-200-edit-styles')) return;
    const style = document.createElement('style');
    style.id = 'project-200-edit-styles';
    style.textContent = `
      .project-edit-button{border:1px solid #cbd5e1;border-radius:999px;background:#fff;color:#334155;font:inherit;font-size:.76rem;font-weight:750;padding:.32rem .58rem;cursor:pointer;margin-left:.35rem}
      .project-edit-overlay{position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.48);display:flex;align-items:flex-end;justify-content:center;padding:1rem}
      .project-edit-card{width:min(100%,560px);max-height:90vh;overflow:auto;background:#fff;border-radius:20px;padding:1rem;box-shadow:0 20px 55px rgba(15,23,42,.28)}
      .project-edit-head{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:.9rem}.project-edit-head h2{margin:0;font-size:1.1rem}
      .project-edit-close{border:0;background:transparent;font:inherit;font-size:1.4rem;cursor:pointer;padding:.25rem .45rem}
      .project-edit-grid{display:grid;gap:.8rem}.project-edit-row{display:grid;gap:.32rem}.project-edit-row span{font-size:.78rem;font-weight:750;color:#475569}.project-edit-row input,.project-edit-row select,.project-edit-row textarea{width:100%;border:1px solid #cbd5e1;border-radius:10px;padding:.68rem .72rem;font:inherit;background:#fff;color:#0f172a}.project-edit-row textarea{min-height:82px;resize:vertical}
      .project-edit-actions{display:grid;grid-template-columns:1fr 1fr;gap:.65rem;margin-top:1rem}.project-edit-actions button{min-height:46px;border-radius:12px;font:inherit;font-weight:800;cursor:pointer}.project-edit-save{border:1px solid #2d6cdf;background:#2d6cdf;color:#fff}.project-edit-cancel{border:1px solid #cbd5e1;background:#fff;color:#334155}
      @media(min-width:700px){.project-edit-overlay{align-items:center}.project-edit-grid.two{grid-template-columns:1fr 1fr}}
    `;
    document.head.appendChild(style);
  }

  function addEditButtons() {
    document.querySelectorAll('[data-remove-type][data-remove-id]').forEach(remove => {
      const parent = remove.parentElement;
      if (!parent || parent.querySelector(`.project-edit-button[data-edit-id="${CSS.escape(remove.dataset.removeId)}"]`)) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'project-edit-button';
      button.textContent = 'Edit';
      button.dataset.editType = remove.dataset.removeType;
      button.dataset.editId = remove.dataset.removeId;
      remove.insertAdjacentElement('beforebegin', button);
    });
  }

  function field(label, name, type, value, options = null) {
    let control;
    if (type === 'select') {
      control = `<select name="${name}">${options.map(option => `<option value="${option}"${String(option)===String(value)?' selected':''}>${option}</option>`).join('')}</select>`;
    } else if (type === 'textarea') {
      control = `<textarea name="${name}">${escapeText(value ?? '')}</textarea>`;
    } else if (type === 'checkbox') {
      control = `<input name="${name}" type="checkbox" ${value ? 'checked' : ''}>`;
    } else {
      control = `<input name="${name}" type="${type}" value="${escapeAttr(value ?? '')}">`;
    }
    return `<label class="project-edit-row"><span>${label}</span>${control}</label>`;
  }

  function escapeText(value) {
    return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  }
  function escapeAttr(value) {
    return escapeText(value).replaceAll('"','&quot;');
  }

  function formHtml(type, entry) {
    if (type === 'food') return [
      field('Food or drink','name','text',entry.name),
      field('Meal','meal','select',entry.meal,['Breakfast','Lunch','Dinner','Snack','Drink']),
      field('Portion','portion','select',entry.portion,['Small','Standard','Large','Unsure']),
      field('Date','date','date',entry.date),
      field('Clock time','time','text',entry.time || ''),
      field('Note','note','textarea',entry.note || ''),
      field('Unplanned','unplanned','checkbox',Boolean(entry.unplanned))
    ].join('');

    if (type === 'weight') return [
      field('Weight (lb)','weight','number',entry.weight),
      field('Date','date','date',entry.date),
      field('Time of day','period','select',entry.period,['Morning','Afternoon','Evening'])
    ].join('');

    if (type === 'exercise') return [
      field('Activity','exerciseType','select',entry.exerciseType,['Aikido-Lite','Aikido-Intense','Jog','Gym','Other']),
      field('Minutes','duration','number',entry.duration),
      field('Date','date','date',entry.date),
      field('Time of day','period','select',entry.period,['Morning','Afternoon','Evening']),
      field('Note','note','textarea',entry.note || '')
    ].join('');

    return [
      field('Type','type','select',entry.type === 'withdrawal' ? 'withdrawal' : 'deposit',['deposit','withdrawal']),
      field('Amount','amount','number',entry.amount),
      field('Date','date','date',entry.date),
      field('Note','note','textarea',entry.note || '')
    ].join('');
  }

  function openEditor(type, id) {
    const collection = COLLECTIONS[type];
    const entry = collection && state[collection]?.find(item => item.id === id);
    if (!entry) return;

    const overlay = document.createElement('div');
    overlay.className = 'project-edit-overlay';
    overlay.innerHTML = `<section class="project-edit-card" role="dialog" aria-modal="true" aria-label="Edit record">
      <div class="project-edit-head"><h2>Edit ${type === 'fund' ? 'Japan Fund' : type.charAt(0).toUpperCase()+type.slice(1)} record</h2><button class="project-edit-close" type="button" aria-label="Close">×</button></div>
      <form class="project-edit-form"><div class="project-edit-grid">${formHtml(type, entry)}</div>
      <div class="project-edit-actions"><button class="project-edit-cancel" type="button">Cancel</button><button class="project-edit-save" type="submit">Save changes</button></div></form>
    </section>`;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('.project-edit-close').addEventListener('click', close);
    overlay.querySelector('.project-edit-cancel').addEventListener('click', close);
    overlay.addEventListener('click', event => { if (event.target === overlay) close(); });

    overlay.querySelector('form').addEventListener('submit', async event => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      try {
        applyChanges(type, entry, data, event.currentTarget.querySelector('[name="unplanned"]'));
        entry.updatedAt = new Date().toISOString();
        const saveButton = event.currentTarget.querySelector('.project-edit-save');
        saveButton.disabled = true;
        saveButton.textContent = 'Saving…';
        await commitState();
        close();
      } catch (error) {
        alert(error.message || 'Could not save changes.');
      }
    });
  }

  function requireDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) throw new Error('Please enter a valid date.');
    return String(value);
  }

  function positiveNumber(value, label, min = 0) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= min) throw new Error(`Please enter a valid ${label}.`);
    return number;
  }

  function applyChanges(type, entry, data, checkbox) {
    if (type === 'food') {
      const name = String(data.get('name') || '').trim();
      if (!name) throw new Error('Food or drink cannot be blank.');
      Object.assign(entry, {
        name,
        meal: String(data.get('meal')),
        portion: String(data.get('portion')),
        date: requireDate(data.get('date')),
        time: String(data.get('time') || '').trim(),
        note: String(data.get('note') || '').trim(),
        unplanned: Boolean(checkbox?.checked)
      });
      return;
    }
    if (type === 'weight') {
      const weight = Number(data.get('weight'));
      if (!Number.isFinite(weight) || weight < 80 || weight > 500) throw new Error('Weight must be between 80 and 500 lb.');
      Object.assign(entry, { weight, date: requireDate(data.get('date')), period: String(data.get('period')) });
      return;
    }
    if (type === 'exercise') {
      const duration = Number(data.get('duration'));
      if (!Number.isFinite(duration) || duration < 1 || duration > 600) throw new Error('Exercise minutes must be between 1 and 600.');
      Object.assign(entry, {
        exerciseType: String(data.get('exerciseType')),
        duration,
        date: requireDate(data.get('date')),
        period: String(data.get('period')),
        note: String(data.get('note') || '').trim()
      });
      return;
    }
    Object.assign(entry, {
      type: data.get('type') === 'withdrawal' ? 'withdrawal' : 'deposit',
      amount: positiveNumber(data.get('amount'), 'amount'),
      date: requireDate(data.get('date')),
      note: String(data.get('note') || '').trim()
    });
  }

  ensureStyles();
  document.body.addEventListener('click', event => {
    const button = event.target.closest('.project-edit-button[data-edit-type][data-edit-id]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    openEditor(button.dataset.editType, button.dataset.editId);
  });

  const observer = new MutationObserver(() => addEditButtons());
  observer.observe(document.body, { childList: true, subtree: true });
  addEditButtons();
})();
