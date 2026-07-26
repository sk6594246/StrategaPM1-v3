const API = 'YOUR_GAS_WEBAPP_URL'; // replace after deploy
const STATUSES = ['Backlog', 'In Progress', 'Review', 'Done'];
const state = { tasks: [], users: [], departments: [], filters: { dept: '', assignee: '' }, activeTask: null };

const get = (action, params = {}) =>
  fetch(API + '?' + new URLSearchParams({ action, ...params })).then(r => r.json());
const post = (body) =>
  fetch(API, { method: 'POST', body: JSON.stringify(body) }).then(r => r.json());

async function load() {
  const [t, u, d] = await Promise.all([get('tasks'), get('users'), get('departments')]);
  state.tasks = t.tasks; state.users = u.users; state.departments = d.departments;
  renderFilters(); renderBoard();
}

function renderFilters() {
  const dep = document.getElementById('filterDept');
  const asg = document.getElementById('filterAssignee');
  dep.innerHTML = '<option value="">All Departments</option>' +
    state.departments.map(d => `<option>${d.name}</option>`).join('');
  asg.innerHTML = '<option value="">All Assignees</option>' +
    state.users.map(u => `<option>${u.name}</option>`).join('');
}

function visibleTasks() {
  const { dept, assignee } = state.filters;
  return state.tasks.filter(t =>
    (!dept || t.department === dept) && (!assignee || t.assignee === assignee));
}

function renderBoard() {
  const board = document.getElementById('board');
  board.innerHTML = STATUSES.map(s => `
    <section class="col" data-status="${s}" ondragover="event.preventDefault()" ondrop="onDrop(event,'${s}')">
      <h3>${s}</h3>
      ${visibleTasks().filter(t => t.status === s).map(t => `
        <article class="card" draggable="true" data-id="${t.id}"
          ondragstart="event.dataTransfer.setData('id','${t.id}')"
          onclick="openDrawer('${t.id}')">
          <strong>${t.title}</strong>
          <small>${t.department} · ${t.assignee} · ${t.priority}</small>
        </article>`).join('')}
    </section>`).join('');
}

async function onDrop(e, newStatus) {
  const id = e.dataTransfer.getData('id');
  const task = state.tasks.find(t => String(t.id) === id);
  if (!task || task.status === newStatus) return;
  task.status = newStatus; renderBoard();              // optimistic
  const res = await post({ action: 'moveTask', taskId: id, newStatus, actorId: 'me' });
  if (!res.ok) load();                                  // rollback on failure
}

async function openDrawer(taskId) {
  state.activeTask = taskId;
  const t = state.tasks.find(x => String(x.id) === String(taskId));
  document.getElementById('drawerTitle').textContent = t.title;
  document.getElementById('drawer').classList.remove('hidden');
  const { comments } = await get('comments', { taskId });
  document.getElementById('commentList').innerHTML = comments.map(c => `
    <div class="comment"><b>${userName(c.author_id)}</b>
      <p>${c.text.replace(/@(\w+)/g, '<span class="mention">@$1</span>')}</p>
      <time>${new Date(c.created_at).toLocaleString()}</time>
    </div>`).join('') || '<p>No comments yet.</p>';
}

const userName = id => (state.users.find(u => String(u.id) === String(id)) || { name: id }).name;

document.getElementById('commentSend').onclick = async () => {
  const text = document.getElementById('commentInput').value.trim();
  if (!text) return;
  await post({ action: 'addComment', taskId: state.activeTask, authorId: 'me', text });
  document.getElementById('commentInput').value = '';
  openDrawer(state.activeTask);
};

document.getElementById('drawerClose').onclick = () =>
  document.getElementById('drawer').classList.add('hidden');
document.getElementById('filterDept').onchange = e => { state.filters.dept = e.target.value; renderBoard(); };
document.getElementById('filterAssignee').onchange = e => { state.filters.assignee = e.target.value; renderBoard(); };
document.getElementById('btnNewTask').onclick = async () => {
  const title = prompt('Task title?');
  if (!title) return;
  await post({ action: 'createTask', title, department: state.filters.dept, assignee: state.filters.assignee, actorId: 'me' });
  load();
};

load();
setInterval(load, 15000); // fast-update polling