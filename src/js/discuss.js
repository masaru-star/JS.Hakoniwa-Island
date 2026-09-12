let deviceId = localStorage.getItem("device_id");
if (!deviceId) {
  deviceId = crypto.randomUUID();
  localStorage.setItem("device_id", deviceId);
}

// クールダウン用の変数
let isCooldown = false;

function switchTab(tabId) {
  document.querySelectorAll('.card').forEach(card => card.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

  document.getElementById(tabId).classList.add('active');

  if (typeof event !== 'undefined' && event && event.currentTarget) {
    event.currentTarget.classList.add('active');
  }

  if (tabId === 'tab-view') loadPosts();
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// ローカルストレージへのログイン情報保存
function saveCredentials(name, password) {
  localStorage.setItem("saved_user_name", name);
  localStorage.setItem("saved_user_pass", password);
}

// ローカルストレージからのログイン情報読み込み
function loadCredentials() {
  const savedName = localStorage.getItem("saved_user_name");
  const savedPass = localStorage.getItem("saved_user_pass");
  if (savedName) {
    const nameInput = document.getElementById("name");
    const regNameInput = document.getElementById("reg_name");
    if (nameInput) nameInput.value = savedName;
    if (regNameInput) regNameInput.value = savedName;
  }
  if (savedPass) {
    const passInput = document.getElementById("password");
    const regPassInput = document.getElementById("reg_password");
    if (passInput) passInput.value = savedPass;
    if (regPassInput) regPassInput.value = savedPass;
  }
}

async function registerUser() {
  const name = document.getElementById("reg_name").value.trim();
  const password = document.getElementById("reg_password").value;
  const reg_status = document.getElementById("reg_status");

  if (!name || !password) {
    showStatus(reg_status, "ユーザー名とパスワードを入力してください。", "error");
    return;
  }

  const hashedPassword = await hashPassword(password);
  const encodedName = encodeURIComponent(name);

  try {
    const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/users?name=eq.${encodedName}`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
    });
    const existingUsers = await checkRes.json();

    if (existingUsers.length > 0) {
      showStatus(reg_status, "このユーザー名は既に使用されています。", "error");
      return;
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: "return=representation"
      },
      body: JSON.stringify({ name, password: hashedPassword, device_id: deviceId })
    });

    if (!res.ok) throw new Error();

    saveCredentials(name, password);

    showStatus(reg_status, "登録が完了しました！投稿してみましょう。", "success");
    document.getElementById("reg_password").value = "";

    await fetch(`${SUPABASE_URL}/rest/v1/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({
        message: `ようこそ、${name}さん！`,
        user_id: "07003402-51ea-4a7c-8279-0ef4258250af"
      })
    });

  } catch (e) {
    showStatus(reg_status, "登録に失敗しました。もう一度お試しください。", "error");
  }
}

async function postMessage() {
  const name = document.getElementById("name").value.trim();
  const password = document.getElementById("password").value;
  const message = document.getElementById("message").value;
  const status = document.getElementById("status");
  const postBtn = document.querySelector("#tab-post button");

  if (isCooldown) return;

  if (!name || !password || !message) {
    showStatus(status, "すべての項目を入力してください。", "error");
    return;
  }

  if (message.length > 500) {
    showStatus(status, "投稿は500文字以内で入力してください。", "error");
    return;
  }

  const hashedPassword = await hashPassword(password);
  const encodedName = encodeURIComponent(name);

  try {
    const authRes = await fetch(`${SUPABASE_URL}/rest/v1/users?name=eq.${encodedName}&password=eq.${hashedPassword}`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
    });
    const user = await authRes.json();

    if (user.length === 0) {
      showStatus(status, "名前またはパスワードが違います。", "error");
      return;
    }

    if (user[0].is_banned) {
      showStatus(status, "このアカウントは現在利用できません。", "error");
      return;
    }

    const banRes = await fetch(`${SUPABASE_URL}/rest/v1/banned_devices?device_id=eq.${deviceId}`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
    });
    const banned = await banRes.json();
    if (banned.length > 0) {
      showStatus(status, "お使いの端末からの投稿は制限されています。", "error");
      return;
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: "return=representation"
      },
      body: JSON.stringify({ message, user_id: user[0].id, device_id: deviceId })
    });

    if (res.ok) {
      saveCredentials(name, password);
      showStatus(status, "投稿が完了しました！", "success");
      document.getElementById("message").value = "";
      updateCharCount();
      startCooldown(postBtn);
      setTimeout(() => switchTab('tab-view'), 1000);
    } else {
      showStatus(status, "送信エラーが発生しました。", "error");
    }
  } catch (e) {
    showStatus(status, "通信エラーが発生しました。", "error");
  }
}

function startCooldown(btn) {
  if (!btn) return;
  isCooldown = true;
  btn.disabled = true;
  let timeLeft = 30;
  const originalText = btn.innerText;

  const timer = setInterval(() => {
    timeLeft--;
    btn.innerText = `待機中 (${timeLeft}s)`;
    if (timeLeft <= 0) {
      clearInterval(timer);
      isCooldown = false;
      btn.disabled = false;
      btn.innerText = originalText;
    }
  }, 1000);
}

function updateCharCount() {
  const messageArea = document.getElementById("message");
  const countDisplay = document.getElementById("char-count");
  if (!messageArea || !countDisplay) return;

  const currentLength = messageArea.value.length;
  const remaining = 150 - currentLength;
  countDisplay.textContent = `残り: ${remaining}文字`;

  if (remaining < 0) {
    countDisplay.style.color = "red";
  } else {
    countDisplay.style.color = "#64748b";
  }
}

async function loadPosts() {
  const list = document.getElementById("posts");
  if (list.innerHTML === "") list.innerHTML = "<p style='text-align:center;color:#64748b;'>読み込み中...</p>";

  try {
    const [postsRes, usersRes, bannedRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/posts?select=id,message,created_at,user_id,device_id&order=created_at.desc`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }),
      fetch(`${SUPABASE_URL}/rest/v1/users?select=id,name,role,is_banned,device_id`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }),
      fetch(`${SUPABASE_URL}/rest/v1/banned_devices?select=device_id`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } })
    ]);

    if (!postsRes.ok) throw new Error(`posts取得失敗: ${postsRes.status} ${await postsRes.text()}`);
    if (!usersRes.ok) throw new Error(`users取得失敗: ${usersRes.status} ${await usersRes.text()}`);
    if (!bannedRes.ok) throw new Error(`banned_devices取得失敗: ${bannedRes.status} ${await bannedRes.text()}`);

    const posts = await postsRes.json();
    const users = await usersRes.json();
    const bannedDevices = await bannedRes.json();
    if (!Array.isArray(posts) || !Array.isArray(users) || !Array.isArray(bannedDevices)) {
      throw new Error("取得したデータが配列形式ではありません。");
    }
    const bannedSet = new Set(bannedDevices.map(b => b.device_id));
    const userMap = {};
    users.forEach(u => userMap[u.id] = u);
    list.innerHTML = "";
    posts.forEach(post => {
      const user = userMap[post.user_id];
      if (!user || user.is_banned || bannedSet.has(user.device_id) || (post.device_id && bannedSet.has(post.device_id))) return;
      const time = new Date(post.created_at).toLocaleString("ja-JP", { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      const name = user.name ?? "名無しさん";
      const role = user.role ?? "User";
      const roleClass = role.toLowerCase() === 'admin' ? 'post-role role-admin' : 'post-role';
      const roleStyle = role.toLowerCase() === 'admin' ? 'color: red; font-weight: bold;' : '';
      const li = document.createElement("li");
      li.className = "post-item";
      li.innerHTML = `
        <div class="post-header">
          <div>
            <span class="post-user">${name}</span>
            <span class="${roleClass}" style="${roleStyle}">${role}</span>
          </div>
          <span class="post-time">${time}</span>
        </div>
        <div class="post-message">${escapeHTML(post.message)}</div>
      `;
      list.appendChild(li);
    });
    if (list.innerHTML === "") {
      list.innerHTML = "<p style='text-align:center;color:#64748b;'>投稿がまだありません。</p>";
    }
  } catch (e) {
    console.error("loadPosts Error:", e);
    list.innerHTML = "<p style='text-align:center;color:red;'>データの取得に失敗しました。</p>";
  }
}

function showStatus(el, msg, type) {
  el.textContent = msg;
  el.className = "status-msg " + type;
  setTimeout(() => { el.textContent = ""; }, 4000);
}

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, function (m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m];
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadPosts();
  loadCredentials();

  const messageArea = document.getElementById("message");
  if (messageArea) {
    messageArea.addEventListener("input", updateCharCount);
    updateCharCount();
  }
});
