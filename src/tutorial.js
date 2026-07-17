        // --- 1. タイル種類と定義 ---
        const TILE_TYPES = {
            sea: { name: '海', desc: '島の周囲を囲む海です。船の移動経路や海底油田の建設対象になります。' },
            port: { name: '港', desc: '海に面した輸送・補給基地。艦船を生産することができます。' },
            oilRig: { name: '海底油田', desc: '海上に設置された採掘施設。毎ターン島に多額の資金を供給します。' },
            plain: { name: '平地', desc: '何もない平原。あらゆる陸上建造物の基礎となる最も重要な土地です。' },
            waste: { name: '荒れ地', desc: '荒廃した土地。そのままでは建設ができません。まずは整地を行いましょう。' },
            forest: { name: '森', desc: '豊かな自然。伐採して資金にするか、災害からの防風林になります。' },
            mountain: { name: '山', desc: '険しい山岳。そのままでは建物は建てられませんが、自然の防御壁となります。' },
            farm: { name: '農場', desc: '食料を生産する場所。島民が生活を維持するために不可欠なエリアです。' },
            house: { name: '住宅', desc: '島民が暮らすエリア。多いほどより高い税収が期待できます。' },
            factory: { name: '工場', desc: '産業の中心。島民が働くことで大きな資金を提供します。' },
            gun: { name: '砲台', desc: '国防、または他島への攻撃用ミサイル基地。' },
            defenseFacility: { name: '防衛施設', desc: '周囲のタイルへの攻撃を防ぐ強力な盾です。' },
            Monument: { name: '記念碑', desc: '島の発展を象徴する巨大なモニュメント。' },
            warship: { name: '軍艦', desc: '港の近くに配備できる護衛用の艦船です。耐久、燃料、弾薬の概念があります。' },
            'warship-dispatched': { name: '出撃中軍艦', desc: '他島への遠洋哨戒や任務に就いている軍艦。' },
            'warship-wreckage': { name: '軍艦の残骸', desc: '戦闘などで沈没した船の残骸。' },
            monster: { name: '怪獣', desc: '島を襲う巨大生物。「シマオロシ」や「キングガロス」等が存在し、放置すると都市を破壊します。' }
        };

        const INITIAL_MAP = [
            ['sea','sea','sea','sea','sea','sea','sea','sea','sea','sea','sea','sea','sea','sea','sea','sea'],
            ['sea','sea','sea','sea','sea','sea','sea','sea','sea','sea','sea','sea','sea','sea','sea','sea'],
            ['sea','sea','sea','sea','plain','plain','plain','forest','mountain','plain','sea','sea','sea','sea','sea','sea'],
            ['sea','sea','sea','plain','plain','waste','waste','forest','mountain','mountain','plain','sea','sea','sea','sea','sea'],
            ['sea','sea','plain','plain','plain','plain','plain','forest','plain','plain','plain','sea','sea','sea','sea','sea'],
            ['sea','sea','plain','plain','plain','plain','plain','plain','plain','waste','plain','plain','sea','sea','sea','sea'],
            ['sea','sea','plain','plain','plain','plain','plain','plain','plain','waste','plain','plain','sea','sea','sea','sea'],
            ['sea','sea','plain','plain','plain','plain','plain','plain','plain','plain','plain','plain','plain','sea','sea','sea'],
            ['sea','sea','plain','plain','plain','plain','plain','plain','plain','plain','plain','plain','plain','sea','sea','sea'],
            ['sea','sea','plain','plain','plain','plain','plain','plain','plain','plain','plain','plain','plain','sea','sea','sea'],
            ['sea','sea','plain','plain','plain','plain','plain','plain','plain','plain','plain','plain','sea','sea','sea','sea'],
            ['sea','sea','sea','plain','plain','plain','plain','plain','plain','plain','plain','sea','sea','sea','sea','sea'],
            ['sea','sea','sea','sea','sea','plain','plain','plain','plain','sea','sea','sea','sea','sea','sea','sea'],
            ['sea','sea','sea','sea','sea','sea','sea','sea','sea','sea','sea','sea','sea','sea','sea','sea'],
            ['sea','sea','sea','sea','sea','sea','sea','sea','sea','sea','sea','sea','sea','sea','sea','sea'],
            ['sea','sea','sea','sea','sea','sea','sea','sea','sea','sea','sea','sea','sea','sea','sea','sea']
        ];

        const EMOJI_MAP = {
            'port': '⚓', 'oilRig': '🛢️', 'forest': '', 'mountain': '',
            'farm': '🌾', 'house': '🏠', 'factory': '🏭', 'gun': '🔫',
            'defenseFacility': '🛡️', 'Monument': '🗿', 'warship': '🚢',
            'warship-dispatched': '⛶', 'warship-wreckage': 'x', 'monster': '👾'
        };

        // --- 2. チュートリアル 全8章構成 ---
        const TUTORIAL_CHAPTERS = [
            {
                id: 0,
                title: "1. 島の観察と基本の整地",
                emoji: "🔍",
                summary: "島の地形を把握し、荒れ地を開発可能な「平地」へ変える基礎工事（ミッション01）を学びます。",
                slides: [
                    {
                        task: "【ミッション01】島の地形の理解",
                        message: "司令官、着任おめでとうございます！まずはこの「16×16」の環境を把握しましょう。島には【海】【平地】【森】【山】【荒れ地】などの自然地形が存在します。",
                        demos: []
                    },
                    {
                        task: "【ミッション01】整地による開拓",
                        message: "建物を建てるには【平地】⬜が必要です。【荒れ地】⚙️には何も建設できないため、まずは「整地」計画を実行して平地に変える必要があります。",
                        demos: [
                            { row: 3, col: 5, type: 'plain', delay: 500 },
                            { row: 3, col: 6, type: 'plain', delay: 1000 }
                        ]
                    }
                ]
            },
            {
                id: 1,
                title: "2. 産業と資金供給",
                emoji: "🌾",
                summary: "農場や工場、そして高額な海底油田による「ターンごとの資金」獲得の仕組み（ミッション02）を学びます。",
                slides: [
                    {
                        task: "【ミッション02】産業基盤の建設",
                        message: "開発には多額の「資金(G)」が必要です。平地に【農場】🌾や【工場】🏭を建設することで、ターンごとに安定した資金と食料を生み出すことができます。",
                        demos: [
                            { row: 4, col: 6, type: 'farm', delay: 400 },
                            { row: 7, col: 7, type: 'farm', delay: 400 },
                            { row: 4, col: 8, type: 'factory', delay: 1100 }
                        ]
                    },
                    {
                        task: "【ミッション02】海底油田の掘削",
                        message: "さらに海上で「掘削」を行うと【海底油田】🛢️を建設できます。非常に高コストですが、莫大な資金を毎ターン供給する国家の生命線となります！",
                        demos: [
                            { row: 13, col: 4, type: 'oilRig', delay: 600 }
                        ]
                    }
                ]
            },
            {
                id: 2,
                title: "3. 人口と都市の成長",
                emoji: "🏠",
                summary: "住宅を建てて人口を増やし、安定した収入を得る国家運営の要（ミッション03）を学びます。",
                slides: [
                    {
                        task: "【ミッション03】島民を迎え入れる",
                        message: "働く島民がいなければ産業は十分に機能しません。農場の周辺に【住宅】🏠が発生するので、人々が移住してくる環境を整えましょう。",
                        demos: [
                            { row: 6, col: 6, type: 'house', delay: 400 },
                            { row: 6, col: 7, type: 'house', delay: 1000 },
                            { row: 7, col: 6, type: 'house', delay: 1600 }
                        ]
                    },
                    {
                        task: "【ミッション03】人口と税収",
                        message: "人口が増えると、工場による収入が増加します。住宅地を中心に都市を拡大させていきましょう！",
                        demos: []
                    }
                ]
            },
            {
                id: 3,
                title: "4. 防衛と自爆戦術",
                emoji: "🛡️",
                summary: "台風や敵から都市を守る防衛施設と、いざという時の「軍事施設自爆」戦術（ミッション04）です。",
                slides: [
                    {
                        task: "【ミッション04】盾となる防衛施設",
                        message: "平和な都市にも災害（台風や隕石）や外敵の脅威が訪れます。重要な建物の近くには【防衛施設】🛡️を置き、周囲の被害を無効化させましょう。",
                        demos: [
                            { row: 5, col: 7, type: 'defenseFacility', delay: 500 }
                        ]
                    },
                    {
                        task: "【ミッション04】ミサイルと自爆",
                        message: "また【砲台】🔫を設置すれば迎撃が可能ですが、最悪の場合は『軍事施設自爆』を実行することで周囲の敵を爆発に巻き込む強力な戦術も使えます。",
                        demos: [
                            { row: 8, col: 9, type: 'gun', delay: 500 },
                            { row: 8, col: 9, type: 'sea', delay: 2500, explode: true },
                            { row: 8, col: 8, type: 'waste', delay: 2500, explode: true },
                            { row: 8, col: 10, type: 'waste', delay: 2500, explode: true },
                            { row: 7, col: 9, type: 'waste', delay: 2500, explode: true },
                            { row: 9, col: 9, type: 'waste', delay: 2500, explode: true },
                            { row: 9, col: 8, type: 'waste', delay: 2500, explode: true },
                            { row: 7, col: 8, type: 'waste', delay: 2500, explode: true },
                            { row: 7, col: 10, type: 'waste', delay: 2500, explode: true },
                            { row: 9, col: 10, type: 'waste', delay: 2500, explode: true }
                        ]
                    }
                ]
            },
            {
                id: 4,
                title: "5. 軍艦の運用基礎",
                emoji: "🚢",
                summary: "港から軍艦を建造し、燃料・弾薬・耐久の管理や、火災・浸水などの異常状態（ミッション05）を学びます。",
                slides: [
                    {
                        task: "【ミッション05】港と軍艦の建造",
                        message: "海沿いに【港】⚓を建設すると、【軍艦】🚢を建造できるようになります。軍艦には耐久、燃料、弾薬、主砲、対空などの詳細なパラメータが存在します。",
                        demos: [
                            { row: 7, col: 1, type: 'port', delay: 400 },
                            { row: 7, col: 0, type: 'warship', delay: 1200 }
                        ]
                    },
                    {
                        task: "【ミッション05】補給と異常状態",
                        message: "活動には「燃料」と「弾薬」の補給が必須です。また、被弾時には【火災】や【浸水】【弾薬庫発火】などの異常状態が発生することがあり、早急な修理が求められます。",
                        demos: []
                    }
                ]
            },
            {
                id: 5,
                title: "6. 怪獣迎撃戦",
                emoji: "👾",
                summary: "人口が増えると襲来する「シマオロシ」や「テラガロス」の迎撃方法と討伐報奨（ミッション06）です。",
                slides: [
                    {
                        task: "【ミッション06】怪獣の出現",
                        message: "島が発展し人口が10万人を超えると、「怪獣シマオロシ」や「怪獣テラガロス」👾などが上陸してくることがあります！",
                        demos: [
                            { row: 7, col: 12, type: 'monster', delay: 500 }
                        ]
                    },
                    {
                        task: "【ミッション06】砲撃と討伐報酬",
                        message: "放置すれば都市が破壊(荒れ地化)されてしまいます。砲台からの【砲撃】や軍艦で迎撃し討伐できれば、多額の討伐報奨金と実績ptを獲得できます！",
                        demos: [
                            { row: 7, col: 12, type: 'waste', delay: 2000, explode: true }
                        ]
                    }
                ]
            },
            {
                id: 6,
                title: "7. 艦隊派遣と署名技術",
                emoji: "🛳️",
                summary: "P-256暗号署名による艦船の所有証明や、他島への派遣、そして勲章システム（ミッション07）を解説します。",
                slides: [
                    {
                        task: "【ミッション07】暗号技術による所有証明",
                        message: "高度な技術として、Web Crypto APIを用いた「P-256署名鍵ペア」を生成し、自軍の軍艦に署名を付与し、所有者の偽装を防いでいます。",
                        demos: []
                    },
                    {
                        task: "【ミッション07】他島への派遣と船渠",
                        message: "観光者コードを使って他島へ軍艦を【派遣】🛳️し、哨戒任務を行わせることも可能です。また、使用しない艦は【船渠(ドック)】に収納して保管できます。",
                        demos: [
                            { row: 7, col: 0, type: 'warship-dispatched', delay: 500 }
                        ]
                    },
                    {
                        task: "【ミッション07】二つ名と勲章",
                        message: "軍艦が活躍すると「殲滅王」や「奇跡の生還者」といった【勲章】を授与され、任意の「二つ名」をつけることも可能になります。",
                        demos: []
                    }
                ]
            },
            {
                id: 7,
                title: "8. 経済危機と計画管理",
                emoji: "📊",
                summary: "資金を溜めすぎた際のリスク「経済危機」と、安全な資金繰りのための「トラッキング」（ミッション08）です。",
                slides: [
                    {
                        task: "【ミッション08】経済危機リスク",
                        message: "司令官、注意してください。保有資金が1億Gを超えると、超過額に応じて【経済危機】の発生確率が上昇します！発生すると資金が長期間凍結されてしまいます。",
                        demos: []
                    },
                    {
                        task: "【ミッション08】計画のトラッキング",
                        message: "無駄に資金を貯めず投資に回すのがコツです。「資金不足による計画失敗」が起きた際は、目標額まで自動でトラッキングして進捗を知らせてくれる機能があります。",
                        demos: []
                    },
                    {
                        task: "司令官、出撃の時です！",
                        message: "これで全8章の基本カリキュラムは終了です。島の名前を付け、数々の計画を立案し、自分だけの最強の島を作り上げてください！",
                        demos: []
                    }
                ]
            }
        ];
// 状態管理
let currentMapState = [];
let currentChapterIdx = 0;
let currentSlideIdx = 0;
let isSingleMode = false;
let typingTimeout = null;
let currentFullText = "";
let currentStepFinished = false;
let completedSteps = Array(8).fill(false);
const WELCOME_MESSAGE =
  "司令官、ようこそ！箱庭諸島の国家運営チュートリアルです。上のカードから学びたいテーマを選択して、トレーニングを開始しましょう！";
function renderMenuCards() {
  const grid = document.getElementById("menu-cards-grid");
  if (!grid) return;
  grid.innerHTML = "";
  TUTORIAL_CHAPTERS.forEach((chapter, index) => {
    const card = document.createElement("div");
    card.className =
      "group bg-white hover:bg-blue-50/30 border border-slate-200 hover:border-blue-300 rounded-xl p-3 shadow-sm hover:shadow transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-2 relative overflow-hidden";
    card.onclick = () => startTutorialFromMenu(index);
    card.innerHTML = `
                    <div class="absolute top-0 right-0 w-12 h-12 bg-blue-50 rounded-bl-full -z-10 group-hover:bg-blue-100/50 transition-colors"></div>
                    <div class="space-y-1">
                        <div class="flex justify-between items-start">
                            <span class="text-xl">${chapter.emoji}</span>
                            <span id="badge-comp-${index}" class="text-[8px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">未着手</span>
                        </div>
                        <h3 class="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-1">${chapter.title}</h3>
                        <p class="text-slate-500 text-[10px] leading-relaxed line-clamp-3">${chapter.summary}</p>
                    </div>
                    <div class="text-[9px] font-bold text-blue-600 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform mt-2">
                        開始する ➔
                    </div>
                `;
    grid.appendChild(card);
  });

  // フルコースボタン
  const fullCourseCard = document.createElement("div");
  fullCourseCard.className =
    "lg:col-span-4 group bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 border border-slate-900 rounded-xl p-3 shadow-sm hover:shadow transition-all duration-300 cursor-pointer flex flex-col justify-center items-center text-center text-white space-y-2";
  fullCourseCard.onclick = () => startTutorialFromMenu(0, true);
  fullCourseCard.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="text-xl">🔥</span>
                    <h3 class="text-sm font-bold">全ミッション（1〜8）を一気見プレイ</h3>
                </div>
                <p class="text-slate-300 text-[10px] max-w-lg">
                    基本の整地から怪獣討伐、暗号技術、経済危機まで、全てのチュートリアルを連続してノンストップで学習します。
                </p>
            `;
  grid.appendChild(fullCourseCard);
}

// 進捗更新
function updateMenuProgress() {
  const completedCount = completedSteps.filter(Boolean).length;
  const percent = Math.round((completedCount / TUTORIAL_CHAPTERS.length) * 100);

  const progressPercentEl = document.getElementById("menu-progress-percent");
  const progressBarEl = document.getElementById("menu-progress-bar");

  if (progressPercentEl) progressPercentEl.innerText = `${percent}%`;
  if (progressBarEl) progressBarEl.style.width = `${percent}%`;

  TUTORIAL_CHAPTERS.forEach((_, index) => {
    const badge = document.getElementById(`badge-comp-${index}`);
    if (badge) {
      if (completedSteps[index]) {
        badge.innerText = "完了 ✓";
        badge.className =
          "text-[8px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded";
      } else {
        badge.innerText = "未着手";
        badge.className =
          "text-[8px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded";
      }
    }
  });
}

// チュートリアル開始
function startTutorialFromMenu(chapterIdx, isAll = false) {
  currentChapterIdx = chapterIdx;
  currentSlideIdx = 0;
  isSingleMode = !isAll;

  document.getElementById("menu-view").classList.add("hidden");
  document.getElementById("tutorial-view").classList.remove("hidden");
  document.getElementById("tap-anywhere-overlay").classList.remove("hidden");
  document
    .getElementById("msg-box-container")
    .classList.add("ring-2", "ring-blue-400", "bg-blue-50/80");

  document.getElementById("status-text").innerText = "トレーニング中";
  document.getElementById("global-status-badge").className =
    "text-[10px] bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full text-amber-600 font-bold flex items-center gap-1 animate-pulse";

  setupMapStateForChapter(chapterIdx);
  updateStepUI();
}

// メニューに戻る
function backToMenu() {
  document.getElementById("menu-view").classList.remove("hidden");
  document.getElementById("tutorial-view").classList.add("hidden");
  document.getElementById("tap-anywhere-overlay").classList.add("hidden");
  document
    .getElementById("msg-box-container")
    .classList.remove("ring-2", "ring-blue-400", "bg-blue-50/80");

  document.getElementById("status-text").innerText = "メニュー画面";
  document.getElementById("global-status-badge").className =
    "text-[10px] bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full text-blue-600 font-bold flex items-center gap-1";

  updateMenuProgress();
  typeMessage(WELCOME_MESSAGE, 15);
}

// マップセットアップ
function setupMapStateForChapter(chapterIdx) {
  currentMapState = JSON.parse(JSON.stringify(INITIAL_MAP));
  // 進行度に応じて建物を追加
  if (chapterIdx >= 1) {
    currentMapState[3][5] = "plain";
    currentMapState[3][6] = "plain";
  }
  if (chapterIdx >= 2) {
    currentMapState[4][6] = "farm";
    currentMapState[7][7] = "farm";
    currentMapState[4][8] = "factory";
    currentMapState[13][4] = "oilRig";
  }
  if (chapterIdx >= 3) {
    currentMapState[6][6] = "house";
    currentMapState[6][7] = "house";
    currentMapState[7][6] = "house";
  }
  if (chapterIdx >= 4) {
    currentMapState[5][7] = "defenseFacility";
    currentMapState[8][9] = "gun";
  }
  if (chapterIdx >= 5) {
    currentMapState[7][1] = "port";
    currentMapState[7][0] = "warship";
  }
  if (chapterIdx === 6) {
    currentMapState[7][12] = "monster";
  }
  if (chapterIdx >= 7) {
    currentMapState[7][0] = "warship-dispatched";
  }
  generateMap();
}

// 文字送り
function typeMessage(text, speed = 15) {
  const explainBox = document.getElementById("explain-box");
  if (!explainBox) return;

  currentFullText = text;
  currentStepFinished = false;

  const tapArrow = document.getElementById("tap-arrow");
  if (tapArrow) tapArrow.innerText = "▶";

  if (typingTimeout) clearTimeout(typingTimeout);

  explainBox.innerText = "";
  let index = 0;

  function nextChar() {
    if (index < text.length) {
      explainBox.innerText += text.charAt(index);
      index++;
      typingTimeout = setTimeout(nextChar, speed);
    } else {
      typingTimeout = null;
      currentStepFinished = true;
      if (tapArrow) tapArrow.innerText = "✔";
    }
  }
  nextChar();
}

// タップ進行
function handleScreenTap(event) {
  if (event.target.closest("button") || event.target.closest(".map-cell"))
    return;

  if (!currentStepFinished) {
    if (typingTimeout) clearTimeout(typingTimeout);
    document.getElementById("explain-box").innerText = currentFullText;
    currentStepFinished = true;
    document.getElementById("tap-arrow").innerText = "✔";
  } else {
    changeStep(1);
  }
}

// タイルアニメーション (建築 or 爆発)
function updateTileWithAnim(r, c, newType, isExplosion = false) {
  const cell = document.querySelector(
    `.map-cell[data-row="${r}"][data-col="${c}"]`,
  );
  if (!cell) return;

  currentMapState[r][c] = newType;

  cell.classList.remove("animate-build", "animate-explode");
  void cell.offsetWidth; // Reflow

  if (isExplosion) {
    cell.classList.add("animate-explode");
  } else {
    cell.classList.add("animate-build");
  }

  setTimeout(
    () => {
      Object.keys(TILE_TYPES).forEach((key) => cell.classList.remove(key));
      cell.classList.add(newType);
      cell.dataset.type = newType;
      cell.textContent = EMOJI_MAP[newType] || "";
    },
    isExplosion ? 300 : 150,
  );
}

// マップ描画
function generateMap() {
  const mapContainer = document.getElementById("game-map");
  if (!mapContainer) return;
  mapContainer.innerHTML = "";

  for (let r = 0; r < 16; r++) {
    for (let c = 0; c < 16; c++) {
      const tileType = currentMapState[r][c];
      const cell = document.createElement("div");

      cell.className = `map-cell ${tileType} border border-slate-900/10 flex items-center justify-center text-[10px] sm:text-xs select-none font-bold`;
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.dataset.type = tileType;
      cell.textContent = EMOJI_MAP[tileType] || "";

      cell.addEventListener("mouseenter", () => {
        const currentType = cell.dataset.type;
        const info = TILE_TYPES[currentType] || {
          name: "未知",
          desc: "",
        };
        document.getElementById("hovered-tile-info").innerHTML =
          `(${c}, ${r}) | <span class="text-blue-700 font-bold underline">${info.name}</span>`;
      });
      cell.addEventListener("click", (e) => e.stopPropagation());
      mapContainer.appendChild(cell);
    }
  }
}

// スライド進行
function changeStep(direction, event) {
  if (event) event.stopPropagation();

  const chapter = TUTORIAL_CHAPTERS[currentChapterIdx];
  const targetSlideIdx = currentSlideIdx + direction;

  if (targetSlideIdx >= 0 && targetSlideIdx < chapter.slides.length) {
    currentSlideIdx = targetSlideIdx;
    updateStepUI(direction);
  } else if (targetSlideIdx < 0) {
    if (currentChapterIdx > 0) {
      currentChapterIdx--;
      currentSlideIdx = TUTORIAL_CHAPTERS[currentChapterIdx].slides.length - 1;
      setupMapStateForChapter(currentChapterIdx);
      updateStepUI(direction);
    } else {
      backToMenu();
    }
  } else if (targetSlideIdx >= chapter.slides.length) {
    completedSteps[currentChapterIdx] = true;

    if (isSingleMode) {
      backToMenu();
    } else {
      const nextChapterIdx = currentChapterIdx + 1;
      if (nextChapterIdx < TUTORIAL_CHAPTERS.length) {
        currentChapterIdx = nextChapterIdx;
        currentSlideIdx = 0;
        setupMapStateForChapter(currentChapterIdx);
        updateStepUI(direction);
      } else {
        backToMenu();
      }
    }
  }
}

// UI更新
function updateStepUI(direction = 0) {
  const chapter = TUTORIAL_CHAPTERS[currentChapterIdx];
  const slide = chapter.slides[currentSlideIdx];

  document.getElementById("step-title").innerText = chapter.title;
  document.getElementById("step-task").innerText = slide.task;
  document.getElementById("substep-badge").innerText =
    `スライド ${currentSlideIdx + 1} / ${chapter.slides.length}`;

  let totalSlides = TUTORIAL_CHAPTERS.reduce(
    (sum, ch) => sum + ch.slides.length,
    0,
  );
  let currentGlobalSlideIndex =
    TUTORIAL_CHAPTERS.slice(0, currentChapterIdx).reduce(
      (sum, ch) => sum + ch.slides.length,
      0,
    ) +
    currentSlideIdx +
    1;
  document.getElementById("progress-bar").style.width =
    `${(currentGlobalSlideIndex / totalSlides) * 100}%`;

  document.getElementById("btn-prev").disabled =
    currentChapterIdx === 0 && currentSlideIdx === 0;

  const isLastSlide = currentSlideIdx === chapter.slides.length - 1;
  const nextText = document.getElementById("btn-next-text");
  const nextArrow = document.getElementById("btn-next-arrow");

  if (isLastSlide) {
    if (isSingleMode) {
      nextText.innerText = "メニューへ戻る";
      nextArrow.innerText = "✕";
    } else if (currentChapterIdx === TUTORIAL_CHAPTERS.length - 1) {
      nextText.innerText = "学習を修了する";
      nextArrow.innerText = "✓";
    } else {
      nextText.innerText = "次のテーマへ";
      nextArrow.innerText = "➔";
    }
  } else {
    nextText.innerText = "次へ進む";
    nextArrow.innerText = "➔";
  }

  typeMessage(slide.message, 15);
  triggerStepDemo(chapter, currentSlideIdx, direction);
}

// デモ実行
function triggerStepDemo(chapter, slideIdx, direction) {
  if (direction < 0) return; // 戻る場合は再デモしない
  const slide = chapter.slides[slideIdx];
  if (slide && slide.demos) {
    slide.demos.forEach((demo) => {
      setTimeout(() => {
        updateTileWithAnim(demo.row, demo.col, demo.type, demo.explode);
      }, demo.delay);
    });
  }
}

window.onload = function () {
  renderMenuCards();
  updateMenuProgress();
  typeMessage(WELCOME_MESSAGE, 15);
};
