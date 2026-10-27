import { tablerComponents } from '../form-state.js';
tablerComponents();
const $ = id => document.getElementById(id);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
const form = $('user-form');
let csrf = '';
let users = [];
let labels = {};
let ownerUsername = '';
let selected = null;
let trigger = null;

async function api(path, options = {}) {
  const response = await fetch(path, { credentials:'same-origin', cache:'no-store', ...options, headers:{ 'content-type':'application/json', ...(csrf ? { 'x-csrf-token':csrf } : {}), ...options.headers } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'No se pudo completar la operación.');
  return result;
}

function renderRows() {
  $('user-rows').innerHTML = `<tr><td data-label="Nombre"><strong>Superadministrador</strong></td><td data-label="Usuario">${escapeHtml(ownerUsername)}</td><td data-label="Vistas permitidas">Todas las vistas</td><td data-label="Estado"><span class="person-state">Principal</span></td><td data-label="Acción"><span class="person-protected">Cuenta protegida</span></td></tr>`
    + (users.length ? users.sort((a,b) => a.name.localeCompare(b.name, 'es')).map(user => `<tr><td data-label="Nombre"><strong>${escapeHtml(user.name)}</strong></td><td data-label="Usuario">${escapeHtml(user.username)}</td><td data-label="Vistas permitidas">${escapeHtml(user.permissions.map(permission => labels[permission] || permission).join(', '))}</td><td data-label="Estado"><span class="person-state" data-active="${user.active}">${user.active ? 'Activa' : 'Inactiva'}</span></td><td data-label="Acción"><button class="person-edit" type="button" data-edit="${escapeHtml(user.id)}" aria-label="Editar a ${escapeHtml(user.name)}">Editar</button></td></tr>`).join('')
      : '<tr><td colspan="5" class="people-empty">Todavía no hay cuentas del equipo. Crea la primera para asignarle vistas.</td></tr>');
}

async function loadUsers() {
  const result = await api('/api/central/users');
  users = result.users;
  labels = result.permissions;
  ownerUsername = result.owner.username;
  renderRows();
}

function openEditor(user, source) {
  selected = user;
  trigger = source;
  form.reset();
  form.elements.namedItem('name').value = user?.name || '';
  form.elements.namedItem('username').value = user?.username || '';
  form.elements.namedItem('password').value = '';
  form.elements.namedItem('password').required = !user;
  form.elements.namedItem('active').checked = user?.active ?? true;
  $('dialog-title').textContent = user ? `Editar a ${user.name}` : 'Nuevo usuario';
  $('save-user').textContent = user ? 'Guardar cambios' : 'Crear usuario';
  $('form-error').textContent = '';
  $('permission-options').innerHTML = Object.entries(labels).map(([key,label]) => `<label><input type="checkbox" name="permissions" value="${escapeHtml(key)}" ${user?.permissions.includes(key) ? 'checked' : ''}>${escapeHtml(label.split(' · ').at(-1))}</label>`).join('');
  $('user-dialog').showModal();
  tablerComponents(form);
  form.elements.namedItem('name').focus();
}

$('new-user').addEventListener('click', event => openEditor(null, event.currentTarget));
$('user-rows').addEventListener('click', event => {
  const button = event.target.closest('[data-edit]');
  if (button) openEditor(users.find(user => user.id === button.dataset.edit), button);
});
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $('user-dialog').close()));
$('user-dialog').addEventListener('close', () => trigger?.focus());
form.addEventListener('submit', async event => {
  event.preventDefault();
  const permissions = [...form.querySelectorAll('[name="permissions"]:checked')].map(input => input.value);
  $('form-error').textContent = '';
  if (!permissions.length) { $('form-error').textContent = 'Selecciona al menos una vista.'; form.querySelector('[name="permissions"]').focus(); return; }
  const active = form.elements.namedItem('active').checked;
  if (selected?.active && !active && !window.confirm(`¿Desactivar a ${selected.name}? Perderá acceso a sus vistas asignadas.`)) return;
  const save = $('save-user');
  save.disabled = true;
  try {
    const payload = { name:form.elements.namedItem('name').value.trim(), username:form.elements.namedItem('username').value.trim(), password:form.elements.namedItem('password').value, permissions, active };
    await api(selected ? `/api/central/users/${encodeURIComponent(selected.id)}` : '/api/central/users', { method:selected ? 'PATCH' : 'POST', body:JSON.stringify(payload) });
    const message = selected ? `Accesos de ${payload.name} actualizados.` : `Usuario ${payload.name} creado.`;
    $('user-dialog').close();
    await loadUsers();
    $('feedback').textContent = message;
    $('feedback').dataset.error = 'false';
  } catch (error) { $('form-error').textContent = error.message; }
  finally { save.disabled = false; }
});

const sidebar = $('admin-sidebar');
const toggle = $('sidebar-toggle');
function closeSidebar() {
  $('app-shell').classList.remove('is-sidebar-open');
  document.body.classList.remove('isabella-sidebar-open');
  sidebar.inert = true;
  sidebar.setAttribute('aria-hidden', 'true');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.focus();
}
toggle.addEventListener('click', () => {
  sidebar.inert = false;
  sidebar.setAttribute('aria-hidden', 'false');
  toggle.setAttribute('aria-expanded', 'true');
  $('app-shell').classList.add('is-sidebar-open');
  document.body.classList.add('isabella-sidebar-open');
  requestAnimationFrame(() => $('sidebar-close').focus());
});
$('sidebar-close').addEventListener('click', closeSidebar);
$('sidebar-backdrop').addEventListener('click', closeSidebar);
document.addEventListener('keydown', event => {
  if (!$('app-shell').classList.contains('is-sidebar-open')) return;
  if (event.key === 'Escape') { event.preventDefault(); closeSidebar(); return; }
  if (event.key !== 'Tab') return;
  const controls = [...sidebar.querySelectorAll('button,a')];
  const first = controls[0], last = controls.at(-1);
  if (!sidebar.contains(document.activeElement) || (event.shiftKey && document.activeElement === first)) { event.preventDefault(); (event.shiftKey ? last : first)?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
});
$('logout').addEventListener('click', async () => { await api('/api/admin/logout', { method:'POST' }).catch(() => {}); location.assign('/admin/'); });

try {
  const session = await api('/api/admin/session');
  if (session.role !== 'owner') throw new Error('Acceso reservado a la cuenta propietaria.');
  csrf = session.csrf;
  await loadUsers();
} catch (error) {
  $('feedback').textContent = error.message;
  $('feedback').dataset.error = 'true';
}
