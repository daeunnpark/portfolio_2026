(() => {
  const key = 'daeun-notification-records-v1';
  const fields = ['id', 'name', 'grade', 'tag'];
  const seed = [
    {id:'security.new_sign_in',level:'Account',name:'New sign-in alert',grade:'Critical',tag:'security'},
    {id:'banking.payment_reminder',level:'Service',name:'Payment reminder',grade:'Important',tag:'banking'},
    {id:'cards.statement_issued',level:'Service',name:'Statement issued',grade:'Standard',tag:'cards'},
    {id:'rewards.points_expiring',level:'Service',name:'Expiring rewards points',grade:'Standard',tag:'rewards'}
  ];
  let records = seed;
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (Array.isArray(saved) && saved.every(r => r && typeof r.id === 'string' && fields.every(f => typeof r[f] === 'string'))) records = saved;
  } catch {}
  const legacyIds = {'sample-1':'security.new_sign_in','sample-2':'banking.payment_reminder','sample-3':'cards.statement_issued','sample-4':'rewards.points_expiring'};
  records = records.map(record => {
    const next = legacyIds[record.id];
    return next && !records.some(other => other.id === next) ? {...record, id:next} : record;
  });
  function availableId(base, excludedId = null) {
    let candidate = base, suffix = 2;
    while (records.some(r => r.id === candidate && r.id !== excludedId)) candidate = base + '_' + suffix++;
    return candidate;
  }
  records = records.map(record => {
    if (!/^notification-\d+$/.test(record.id)) return record;
    const clean = value => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const base = (clean(record.tag) || 'general') + '.' + (clean(record.name) || 'notification');
    const id = availableId(base, record.id);
    // Reserve the new ID before migrating another record.
    record.id = id;
    return record;
  });
  try { localStorage.setItem(key, JSON.stringify(records)); } catch {}
  const rows = document.getElementById('record-rows');
  const status = document.getElementById('admin-status');
  const dialog = document.getElementById('record-dialog');
  const deleteDialog = document.getElementById('delete-dialog');
  const form = document.getElementById('record-form');
  function colorImportanceField() {
    const input = form.elements.grade;
    const value = input.value.trim().toLowerCase();
    input.className = 'importance-input ' + ({critical:'importance-critical',important:'importance-important',standard:'importance-standard'}[value] || 'importance-neutral');
  }
  form.elements.grade.addEventListener('input', colorImportanceField);
  let editing = null;
  let deleting = null;
  function persist(message) {
    try { localStorage.setItem(key, JSON.stringify(records)); status.textContent = message; }
    catch { status.textContent = message + ' Browser storage is unavailable; changes will last only for this session.'; }
    render();
  }
  function openForm(record) {
    editing = record ? record.id : null;
    form.reset();
    const defaults = {id:availableId('banking.payment_reminder'), name:'Payment reminder', grade:'Important', tag:'banking'};
    for (const f of fields) { form.elements[f].value = record ? record[f] : defaults[f]; form.elements[f].setCustomValidity(''); }
    document.getElementById('record-title').textContent = record ? 'Edit setting' : 'Add setting';
    colorImportanceField();
    dialog.showModal();
    form.elements.id.focus();
  }
  function render() {
    rows.replaceChildren();
    document.getElementById('record-count').textContent = records.length + (records.length === 1 ? ' setting' : ' settings');
    for (const record of records) {
      const tr = document.createElement('tr');
      for (const f of fields) {
        const td = document.createElement('td');
        if (f === 'tag') { const tag = document.createElement('span'); tag.className='record-tag'; tag.textContent=record[f]; td.append(tag); }
        else if (f === 'grade') {
          const badge = document.createElement('span');
          const importance = record[f].trim().toLowerCase();
          badge.className = 'importance-badge ' + ({critical:'importance-critical',important:'importance-important',standard:'importance-standard'}[importance] || 'importance-neutral');
          badge.textContent = record[f];
          td.append(badge);
        }
        else td.textContent = record[f];
        tr.append(td);
      }
      const actions = document.createElement('td');
      for (const action of ['Edit','Delete']) {
        const b = document.createElement('button');
        b.type='button'; b.className='row-action ' + action.toLowerCase(); b.textContent=action;
        b.setAttribute('aria-label',action + ' ' + record.name);
        b.addEventListener('click',() => {
          if(action==='Edit') openForm(record);
          else { deleting=record.id; document.getElementById('delete-description').textContent='Remove “'+record.name+'” from this sample?'; deleteDialog.showModal(); document.getElementById('cancel-delete').focus(); }
        });
        actions.append(b);
      }
      tr.append(actions); rows.append(tr);
    }
    if(!records.length) { const tr=document.createElement('tr');const td=document.createElement('td');td.colSpan=5;td.textContent='No settings yet. Add a setting to get started.';tr.append(td);rows.append(tr); }
  }
  form.addEventListener('submit',event => {
    event.preventDefault();
    for(const f of fields) { const input=form.elements[f];input.setCustomValidity(input.value.trim()?'':'Enter a value.'); }
    if(records.some(r=>r.id===form.elements.id.value.trim() && r.id!==editing)) form.elements.id.setCustomValidity('This ID already exists. Enter a unique ID.');
    if(!form.reportValidity()) return;
    const value = {id:editing || 'record-'+Date.now()+'-'+Math.random().toString(36).slice(2)};
    for(const f of fields) value[f]=form.elements[f].value.trim();
    const isEdit=editing!==null;
    if(isEdit) records=records.map(r=>r.id===editing?value:r); else records=[...records,value];
    dialog.close(); persist(isEdit?'Setting updated.':'Setting created.');document.getElementById('add-record').focus();
  });
  for(const f of fields)form.elements[f].addEventListener('input',()=>form.elements[f].setCustomValidity(''));
  document.getElementById('add-record').addEventListener('click',()=>openForm(null));
  document.getElementById('cancel-record').addEventListener('click',()=>dialog.close());
  document.getElementById('cancel-delete').addEventListener('click',()=>deleteDialog.close());
  document.getElementById('confirm-delete').addEventListener('click',()=>{records=records.filter(r=>r.id!==deleting);deleteDialog.close();persist('Setting deleted.');document.getElementById('add-record').focus();});
  render();
})();
