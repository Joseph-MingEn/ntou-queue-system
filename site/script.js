const STORAGE_KEY = 'alley-kitchen-queue-v1';
const WAIT_MINUTES_PER_GROUP = 5;
const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' });

const form = document.querySelector('#registerForm');
const nameInput = document.querySelector('#guestName');
const phoneInput = document.querySelector('#guestPhone');
const resultCard = document.querySelector('#ticketResult');
const currentNumber = document.querySelector('#currentNumber');
const currentName = document.querySelector('#currentName');
const waitingCount = document.querySelector('#waitingCount');
const estimatedWait = document.querySelector('#estimatedWait');
const todayCount = document.querySelector('#todayCount');
const serviceStatus = document.querySelector('#serviceStatus');
const callNextButton = document.querySelector('#callNext');
const previewNextButton = document.querySelector('#previewNext');
const toggleListButton = document.querySelector('#toggleList');
const listChevron = document.querySelector('#listChevron');
const waitlistPanel = document.querySelector('#waitlistPanel');
const waitlistElement = document.querySelector('#waitlist');
const listCount = document.querySelector('#listCount');
const searchInput = document.querySelector('#searchNumber');
const searchResult = document.querySelector('#searchResult');
const toast = document.querySelector('#toast');

function freshState() {
  return { date: today, nextNumber: 1, guests: [], currentId: null, closed: false };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && saved.date === today && Array.isArray(saved.guests)) {
      return { ...freshState(), ...saved };
    }
  } catch (error) {
    console.warn('無法讀取候位資料，將使用目前頁面資料。', error);
  }
  return freshState();
}

let state = loadState();
let toastTimer;

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('無法儲存候位資料。', error);
    showToast('瀏覽器無法儲存資料，請確認儲存空間設定。');
  }
}

function waitingGuests() {
  return state.guests.filter((guest) => guest.status === 'waiting');
}

function guestNumber(number) {
  return `A${String(number).padStart(3, '0')}`;
}

function maskPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return phone;
  return `${digits.slice(0, 4)} ••• ${digits.slice(-3)}`;
}

function render() {
  const current = state.guests.find((guest) => guest.id === state.currentId);
  const waiting = waitingGuests();
  currentNumber.textContent = current ? current.number : '— —';
  currentName.textContent = current ? `${current.name}，請入座` : (state.closed ? '今日候位已結束' : '等待第一組客人');
  waitingCount.textContent = waiting.length;
  estimatedWait.textContent = `約 ${waiting.length * WAIT_MINUTES_PER_GROUP}`;
  todayCount.textContent = state.guests.length;
  listCount.textContent = `${waiting.length} 組`;
  serviceStatus.textContent = state.closed ? '今日已打烊' : '今日候位中';
  document.querySelector('.open-status').classList.toggle('closed', state.closed);
  callNextButton.disabled = state.closed || waiting.length === 0;
  previewNextButton.disabled = state.closed || waiting.length === 0;
  callNextButton.setAttribute('aria-label', waiting.length && !state.closed ? `叫下一位 ${waiting[0].number}` : '目前沒有候位客人');
  form.querySelector('button[type="submit"]').disabled = state.closed;
  nameInput.disabled = state.closed;
  phoneInput.disabled = state.closed;
  document.querySelector('.register-card').classList.toggle('is-closed', state.closed);
  if (state.closed) {
    form.querySelector('button[type="submit"] span').textContent = '今日候位已結束';
  } else {
    form.querySelector('button[type="submit"] span').textContent = '加入候位名單';
  }
  renderWaitlist(waiting);
}

function renderWaitlist(guests) {
  waitlistElement.replaceChildren();
  if (!guests.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-list';
    empty.textContent = state.closed ? '今日候位已結束。' : '目前還沒有候位客人。';
    waitlistElement.append(empty);
    return;
  }
  guests.forEach((guest) => {
    const row = document.createElement('div');
    row.className = 'wait-item';
    const number = document.createElement('span');
    number.className = 'wait-ticket';
    number.textContent = guest.number;
    const person = document.createElement('span');
    person.className = 'wait-person';
    const name = document.createElement('b');
    name.textContent = guest.name;
    const phone = document.createElement('small');
    phone.textContent = maskPhone(guest.phone);
    person.append(name, phone);
    const time = document.createElement('span');
    time.className = 'wait-time';
    time.textContent = guest.createdAt;
    row.append(number, person, time);
    waitlistElement.append(row);
  });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function phoneIsValid(phone) {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (state.closed) return;
  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();
  if (!name) {
    nameInput.setCustomValidity('請輸入姓名。');
    nameInput.reportValidity();
    nameInput.addEventListener('input', () => nameInput.setCustomValidity(''), { once: true });
    return;
  }
  if (!phoneIsValid(phone)) {
    phoneInput.setCustomValidity('請輸入 8 至 15 位數字的聯絡電話。');
    phoneInput.reportValidity();
    phoneInput.addEventListener('input', () => phoneInput.setCustomValidity(''), { once: true });
    return;
  }
  const guest = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    number: guestNumber(state.nextNumber),
    sequence: state.nextNumber,
    name,
    phone,
    status: 'waiting',
    createdAt: new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()),
  };
  state.nextNumber += 1;
  state.guests.push(guest);
  saveState();
  render();
  resultCard.innerHTML = `<span>候位登記成功，你的號碼是</span><strong>${guest.number}</strong><span>目前前面還有 ${waitingGuests().length - 1} 組，請留意叫號。</span>`;
  resultCard.hidden = false;
  form.reset();
  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

callNextButton.addEventListener('click', () => {
  const next = waitingGuests()[0];
  if (!next || state.closed) return;
  next.status = 'called';
  next.calledAt = Date.now();
  state.currentId = next.id;
  saveState();
  render();
  showToast(`正在呼叫 ${next.number}，${next.name} 請入座。`);
});

previewNextButton.addEventListener('click', () => {
  const next = waitingGuests()[0];
  if (!next || state.closed) {
    showToast('目前沒有下一位候位客人。');
    return;
  }
  searchResult.className = 'search-result found';
  searchResult.textContent = `下一位是 ${next.number}・${next.name}・${maskPhone(next.phone)}，仍在候位中。`;
  showToast(`下一位：${next.number} ${next.name}`);
});

toggleListButton.addEventListener('click', () => {
  const isHidden = waitlistPanel.hidden;
  waitlistPanel.hidden = !isHidden;
  toggleListButton.setAttribute('aria-expanded', String(isHidden));
  listChevron.textContent = isHidden ? '−' : '＋';
});

function findGuest() {
  const query = searchInput.value.trim().toUpperCase().replace(/\s+/g, '');
  searchResult.className = 'search-result';
  if (!query) {
    searchResult.textContent = '請輸入候位編號，例如 A003。';
    searchResult.classList.add('error');
    searchInput.focus();
    return;
  }
  const normalized = /^\d+$/.test(query) ? guestNumber(Number(query)) : query;
  const guest = state.guests.find((item) => item.number === normalized);
  if (!guest) {
    searchResult.textContent = `找不到 ${normalized}，請確認號碼或查看候補名單。`;
    searchResult.classList.add('error');
    return;
  }
  const status = guest.status === 'waiting' ? '候位中' : guest.id === state.currentId ? '目前叫號中' : '已叫號';
  searchResult.textContent = `${guest.number}・${guest.name}・${status}・${maskPhone(guest.phone)}`;
  searchResult.classList.add('found');
}

document.querySelector('#searchButton').addEventListener('click', findGuest);
searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') findGuest();
});

document.querySelector('#closeDay').addEventListener('click', () => {
  if (!state.guests.length && !state.currentId) {
    state.closed = true;
    saveState();
    render();
    showToast('今日候位已結束。');
    return;
  }
  const confirmed = window.confirm('確定打烊並清空今日所有候位資料？這項操作無法復原。');
  if (!confirmed) return;
  state = { ...freshState(), closed: true };
  saveState();
  resultCard.hidden = true;
  searchInput.value = '';
  searchResult.className = 'search-result';
  searchResult.textContent = '可查詢候位中或已叫號的客人';
  render();
  showToast('已打烊，今日候位資料已清空。');
});

render();
