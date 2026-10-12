// ── AUTH ──

function getToken() { try { return localStorage.getItem('token'); } catch(e) { return null; } }
function getUser() { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch(e) { return null; } }

function requireAuth() {
    if (!getToken()) { window.location.href = '/login.html'; return false; }
    return true;
}

function logout() {
    try { localStorage.removeItem('token'); localStorage.removeItem('user'); } catch(e) {}
    window.location.href = '/login.html';
}

async function apiFetch(url, options) {
    var token = getToken();
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    var res = await fetch(url, Object.assign({ headers: headers }, options));
    if (res.status === 401 || res.status === 403) { logout(); return; }
    var data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
}

// ── STATE ──

var state = {
    sessions: [], subjects: [], currentView: 'dashboard',
    timer: { running: false, paused: false, seconds: 0, total: 900, interval: null, mode: 'focus', selectedMin: 15 },
    pomodoro: { cycle: 1, phase: 'focus', focusMin: 25, breakMin: 5, longBreakMin: 15 },
    ambient: { ctx: null, source: null, gain: null, active: null },
    activeSubjectId: null, pendingRating: 0, pendingSessionId: null
};

var subjectColors = {};

var quotes = [
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
    { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
    { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
    { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
    { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
    { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
    { text: "Small progress is still progress.", author: "Unknown" },
    { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" }
];

// ── HELPERS ──

function formatDuration(s) { var h=Math.floor(s/3600),m=Math.floor((s%3600)/60); return h>0?h+'h '+m+'m':m+'m'; }
function formatTimer(s) { var m=Math.floor(s/60),sec=s%60; return String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0'); }
function formatDateDisplay(d) { return new Date(d+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); }
function getToday() { return new Date().toISOString().split('T')[0]; }
function getDayName(d) { return new Date(d+'T00:00:00').toLocaleDateString('en-US',{weekday:'short'}); }
function escapeHtml(str) { var d=document.createElement('div'); d.textContent=str; return d.innerHTML; }

function showToast(message, isError) {
    var c=document.getElementById('toastContainer'), t=document.createElement('div');
    t.className='toast'+(isError?' error':''); t.textContent=message;
    c.appendChild(t); setTimeout(function(){t.remove();},3500);
}

// ── PARTICLES ──

function initParticles() {
    var canvas=document.getElementById('particles'); if(!canvas) return;
    var ctx=canvas.getContext('2d'), particles=[];
    function resize(){canvas.width=window.innerWidth;canvas.height=window.innerHeight;} resize();
    window.addEventListener('resize',resize);
    for(var i=0;i<30;i++) particles.push({x:Math.random()*canvas.width,y:Math.random()*canvas.height,r:Math.random()*1.5+0.3,dx:(Math.random()-0.5)*0.3,dy:(Math.random()-0.5)*0.3});
    function draw(){
        ctx.clearRect(0,0,canvas.width,canvas.height); ctx.fillStyle='rgba(79,70,229,0.15)';
        for(var i=0;i<particles.length;i++){var p=particles[i];ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();p.x+=p.dx;p.y+=p.dy;if(p.x<0||p.x>canvas.width)p.dx*=-1;if(p.y<0||p.y>canvas.height)p.dy*=-1;}
        requestAnimationFrame(draw);
    } draw();
}

// ── NAVIGATION ──

function navigateTo(view) {
    state.currentView=view;
    document.querySelectorAll('.view').forEach(function(v){v.classList.remove('active');});
    document.querySelectorAll('.nav-link').forEach(function(l){l.classList.remove('active');});
    var el=document.getElementById('view-'+view); if(el) el.classList.add('active');
    var link=document.querySelector('.nav-link[data-view="'+view+'"]'); if(link) link.classList.add('active');
    closeDropdown();
    if(view==='dashboard') loadDashboard();
    else if(view==='sessions') loadSessions();
    else if(view==='subjects') loadSubjects();
    else if(view==='statistics') loadStatistics();
    else if(view==='timer') loadTimerView();
    else if(view==='achievements') loadAchievements();
    else if(view==='profile') loadProfile();
    else if(view==='admin') loadAdmin();
}

document.querySelectorAll('.nav-link').forEach(function(l){
    l.addEventListener('click',function(e){e.preventDefault();navigateTo(this.dataset.view);});
});

// ── TOPBAR / USER MENU ──

function setupUserMenu() {
    var user=getUser(); if(!user) return;
    var initial=(user.full_name||user.username||'U').charAt(0).toUpperCase();
    var color=user.avatar_color||'#4f46e5';
    document.getElementById('userAvatarBtn').style.background=color;
    document.getElementById('userInitials').textContent=initial;
    document.getElementById('dropdownAvatar').textContent=initial;
    document.getElementById('dropdownAvatar').style.background=color;
    document.getElementById('dropdownName').textContent=user.full_name||user.username;
    document.getElementById('dropdownRole').textContent=user.role;
    if(user.role==='admin') document.getElementById('adminBtn').style.display='';
}

document.getElementById('userAvatarBtn').addEventListener('click',function(e){
    e.stopPropagation();document.getElementById('userDropdown').classList.toggle('open');
});
document.addEventListener('click',function(){closeDropdown();});
function closeDropdown(){document.getElementById('userDropdown').classList.remove('open');}

document.getElementById('sidebarToggle').addEventListener('click',function(){
    document.getElementById('sidebar').classList.toggle('open');
});

// ── THEME ──

function toggleTheme() {
    var isDark=document.documentElement.getAttribute('data-theme')==='dark';
    document.documentElement.setAttribute('data-theme',isDark?'light':'dark');
    try{localStorage.setItem('theme',isDark?'light':'dark');}catch(e){}
}
function loadTheme(){try{var s=localStorage.getItem('theme');if(s)document.documentElement.setAttribute('data-theme',s);}catch(e){}}

// ── TIMER ──

function getTimerDuration() {
    if(state.timer.mode==='pomodoro') return state.pomodoro.phase==='focus'?state.pomodoro.focusMin*60:(state.pomodoro.cycle%4===0?state.pomodoro.longBreakMin:state.pomodoro.breakMin)*60;
    return state.timer.selectedMin*60;
}

function updateTimerDisplay() {
    document.getElementById('timerDisplay').textContent=formatTimer(state.timer.seconds);
    var circumference=2*Math.PI*126, offset=circumference*(1-state.timer.seconds/state.timer.total);
    var progress=document.getElementById('timerProgress');
    progress.setAttribute('stroke-dashoffset',offset);
    progress.setAttribute('stroke',state.timer.mode==='pomodoro'&&state.pomodoro.phase==='break'?'url(#breakGrad)':'url(#timerGrad)');
}

function startTimer() {
    if(state.timer.running) return;
    showCountdown(function(){
        state.timer.total=getTimerDuration(); state.timer.seconds=state.timer.total;
        state.timer.running=true; state.timer.paused=false;
        updateTimerButtons('running'); updateTimerLabel();
        state.timer.interval=setInterval(timerTick,1000); updateTimerDisplay();
    });
}

function showCountdown(cb) {
    var o=document.getElementById('countdownOverlay'),n=document.getElementById('countdownNumber');
    o.classList.add('active'); var c=3; n.textContent=c;
    n.style.animation='none'; void n.offsetHeight; n.style.animation='countBounce 0.6s ease';
    var iv=setInterval(function(){c--;if(c<=0){clearInterval(iv);o.classList.remove('active');cb();return;}
    n.textContent=c;n.style.animation='none';void n.offsetHeight;n.style.animation='countBounce 0.6s ease';},800);
}

function pauseTimer(){if(!state.timer.running||state.timer.paused)return;state.timer.paused=true;clearInterval(state.timer.interval);updateTimerButtons('paused');document.getElementById('timerLabel').textContent='Paused';}
function resumeTimer(){if(!state.timer.paused)return;state.timer.paused=false;state.timer.interval=setInterval(timerTick,1000);updateTimerButtons('running');updateTimerLabel();}

function stopTimer() {
    var elapsed=state.timer.total-state.timer.seconds;
    clearInterval(state.timer.interval); state.timer.running=false; state.timer.paused=false; state.timer.seconds=0;
    updateTimerButtons('stopped'); document.getElementById('timerLabel').textContent='Pick a duration & start';
    document.getElementById('timerDisplay').textContent=formatTimer(getTimerDuration());
    document.getElementById('timerProgress').setAttribute('stroke-dashoffset',0);
    if(elapsed>=60) saveTimerSession(elapsed);
}

function timerTick(){state.timer.seconds--;updateTimerDisplay();if(state.timer.seconds<=0){clearInterval(state.timer.interval);onTimerComplete();}}

function onTimerComplete() {
    var elapsed=state.timer.total;
    if(state.timer.mode==='pomodoro'){
        saveTimerSession(elapsed);
        if(state.pomodoro.phase==='focus'){state.pomodoro.phase='break';updatePomDots();}
        else{state.pomodoro.phase='focus';state.pomodoro.cycle++;updatePomDots();}
        document.getElementById('pomCycle').textContent=state.pomodoro.cycle;
        document.getElementById('pomPhase').textContent=state.pomodoro.phase==='focus'?'Focus':'Break';
        showToast('Phase complete!');
        state.timer.total=getTimerDuration(); state.timer.seconds=state.timer.total;
        updateTimerLabel(); state.timer.interval=setInterval(timerTick,1000); updateTimerDisplay();
    } else { saveTimerSession(elapsed,true); }
}

function saveTimerSession(elapsed,showRating) {
    var subject=document.getElementById('timerSubject').value||'General';
    var notes=document.getElementById('timerNotes').value;
    var sessionType=state.timer.mode==='pomodoro'&&state.pomodoro.phase==='break'?'break':'focus';
    var user=getUser();
    apiFetch('/api/sessions',{method:'POST',body:JSON.stringify({subject:subject,duration:elapsed,date:getToday(),session_type:sessionType,notes:notes,user_id:user?user.id:null})})
    .then(function(session){if(showRating&&session){state.pendingSessionId=session.id;openRatingModal(elapsed);}})
    .catch(function(){if(showRating) openRatingModal(elapsed);});
}

function updateTimerLabel(){document.getElementById('timerLabel').textContent=state.timer.mode==='pomodoro'?(state.pomodoro.phase==='focus'?'Stay focused...':'Take a break'):'Stay focused...';}
function updateTimerButtons(s){document.getElementById('btnStart').style.display=s==='stopped'?'':'none';document.getElementById('btnPause').style.display=s==='running'?'':'none';document.getElementById('btnStop').style.display=s==='stopped'?'none':'';document.getElementById('btnResume').style.display=s==='paused'?'':'none';}
function updatePomDots(){document.querySelectorAll('.pom-dot').forEach(function(d,i){d.className='pom-dot';if(i<state.pomodoro.cycle-1)d.classList.add('done');if(i===state.pomodoro.cycle-1)d.classList.add('active');});}

document.querySelectorAll('.preset-btn').forEach(function(b){b.addEventListener('click',function(){if(state.timer.running)return;document.querySelectorAll('.preset-btn').forEach(function(x){x.classList.remove('active');});this.classList.add('active');state.timer.selectedMin=parseInt(this.dataset.min);document.getElementById('customMinutes').value='';document.getElementById('timerDisplay').textContent=formatTimer(getTimerDuration());});});
document.getElementById('customMinutes').addEventListener('input',function(){if(state.timer.running)return;var v=parseInt(this.value);if(v>0){document.querySelectorAll('.preset-btn').forEach(function(x){x.classList.remove('active');});state.timer.selectedMin=Math.min(180,v);document.getElementById('timerDisplay').textContent=formatTimer(getTimerDuration());}});
document.querySelectorAll('.timer-mode-tabs .tab-btn').forEach(function(b){b.addEventListener('click',function(){if(state.timer.running)return;document.querySelectorAll('.timer-mode-tabs .tab-btn').forEach(function(x){x.classList.remove('active');});this.classList.add('active');state.timer.mode=this.dataset.mode;document.getElementById('pomodoroInfo').style.display=state.timer.mode==='pomodoro'?'':'none';document.getElementById('timerPresets').style.display=state.timer.mode==='pomodoro'?'none':'';if(state.timer.mode==='pomodoro'){state.pomodoro.cycle=1;state.pomodoro.phase='focus';document.getElementById('pomCycle').textContent='1';document.getElementById('pomPhase').textContent='Focus';updatePomDots();}document.getElementById('timerDisplay').textContent=formatTimer(getTimerDuration());});});
function loadTimerView(){populateSubjectSelects();document.getElementById('timerDisplay').textContent=formatTimer(getTimerDuration());}

// ── RATING MODAL ──

function openRatingModal(elapsed) {
    state.timer.running=false; updateTimerButtons('stopped');
    document.getElementById('timerLabel').textContent='Session complete!';
    state.pendingRating=0;
    var stars=document.getElementById('ratingStars');
    stars.innerHTML=['&#128542;','&#128533;','&#128528;','&#128522;','&#129321;'].map(function(e,i){return'<button class="star-btn" data-val="'+(i+1)+'">'+e+'</button>';}).join('');
    stars.querySelectorAll('.star-btn').forEach(function(b){b.addEventListener('click',function(){state.pendingRating=parseInt(this.dataset.val);stars.querySelectorAll('.star-btn').forEach(function(x,i){x.classList.toggle('active',i<state.pendingRating);});});});
    document.getElementById('ratingSubtitle').textContent='You focused for '+formatDuration(elapsed)+'. How did it go?';
    spawnConfetti(); document.getElementById('ratingModal').classList.add('open');
}

function submitRating(){
    if(state.pendingSessionId&&state.pendingRating>0) apiFetch('/api/sessions/'+state.pendingSessionId,{method:'PUT',body:JSON.stringify({rating:state.pendingRating})}).catch(function(){});
    document.getElementById('ratingModal').classList.remove('open'); showToast('Session saved!'); state.pendingSessionId=null;
}

function spawnConfetti(){
    var c=document.getElementById('confetti');c.innerHTML='';
    var colors=['#4f46e5','#f59e0b','#10b981','#ec4899','#8b5cf6','#f43f5e'];
    for(var i=0;i<40;i++){var p=document.createElement('div');p.className='confetti-piece';p.style.left=Math.random()*100+'%';p.style.top='-10px';p.style.background=colors[Math.floor(Math.random()*colors.length)];p.style.animationDelay=Math.random()*0.8+'s';p.style.animationDuration=(1+Math.random())+'s';p.style.width=(4+Math.random()*6)+'px';p.style.height=(4+Math.random()*6)+'px';c.appendChild(p);}
}

// ── AMBIENT ──

function toggleAmbientSound(type) {
    var btns=document.querySelectorAll('.ambient-btn');
    if(state.ambient.active===type){stopAmbientSound();btns.forEach(function(b){b.classList.remove('active');});return;}
    stopAmbientSound(); btns.forEach(function(b){b.classList.remove('active');});
    document.querySelector('.ambient-btn[data-sound="'+type+'"]').classList.add('active');
    if(!state.ambient.ctx) state.ambient.ctx=new(window.AudioContext||window.webkitAudioContext)();
    var ctx=state.ambient.ctx, bufSize=2*ctx.sampleRate, buffer=ctx.createBuffer(1,bufSize,ctx.sampleRate), data=buffer.getChannelData(0);
    if(type==='rain'){for(var i=0;i<bufSize;i++) data[i]=Math.random()*2-1;}
    else if(type==='forest'){var b0=0;for(var i=0;i<bufSize;i++){b0=0.99*b0+0.01*(Math.random()*2-1);data[i]=b0*3.5;}}
    else{for(var i=0;i<bufSize;i++){var t=i/ctx.sampleRate;data[i]=(Math.random()*2-1)*(0.5+0.5*Math.sin(2*Math.PI*0.1*t));}}
    var source=ctx.createBufferSource();source.buffer=buffer;source.loop=true;
    var gain=ctx.createGain();gain.gain.value=(parseInt(document.getElementById('ambientVolume').value)/100)*0.3;
    var filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=type==='rain'?1200:type==='forest'?400:800;
    source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);source.start();
    state.ambient.source=source;state.ambient.gain=gain;state.ambient.active=type;
}
function stopAmbientSound(){if(state.ambient.source){state.ambient.source.stop();state.ambient.source=null;}state.ambient.active=null;}
document.getElementById('ambientVolume').addEventListener('input',function(){if(state.ambient.gain)state.ambient.gain.gain.value=(parseInt(this.value)/100)*0.3;});

// ── SESSIONS ──

async function loadSessions(){
    populateSubjectSelects();
    var params=[],subj=document.getElementById('filterSubject').value,date=document.getElementById('filterDate').value;
    if(subj)params.push('subject='+encodeURIComponent(subj));if(date)params.push('date='+date);
    state.sessions=await apiFetch('/api/sessions'+(params.length?'?'+params.join('&'):''));
    renderSessions(state.sessions);
}

function renderSessions(sessions){
    var tbody=document.getElementById('sessionsTableBody'),empty=document.getElementById('sessionsEmpty');
    if(!sessions||!sessions.length){tbody.innerHTML='';empty.style.display='';return;}
    empty.style.display='none';
    tbody.innerHTML=sessions.map(function(s){
        var color=subjectColors[s.subject]||'#4f46e5';
        var bc={break:'badge-break',review:'badge-review',practice:'badge-practice'}[s.session_type]||'badge-focus';
        var star=s.rating>0?'<span class="stars">'+['&#128542;','&#128533;','&#128528;','&#128522;','&#129321;'][s.rating-1]+'</span>':'-';
        return '<tr><td>'+formatDateDisplay(s.date)+'</td><td><span style="color:'+color+';font-weight:700">'+escapeHtml(s.subject)+'</span></td><td style="font-weight:600">'+formatDuration(s.duration)+'</td><td><span class="badge '+bc+'">'+s.session_type+'</span></td><td>'+star+'</td><td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+escapeHtml(s.notes||'-')+'</td><td><button class="btn-icon" onclick="deleteSession('+s.id+')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14H7L5 6"/></svg></button></td></tr>';
    }).join('');
}

function applyFilters(){loadSessions();}
function clearFilters(){document.getElementById('filterSubject').value='';document.getElementById('filterDate').value='';loadSessions();}
async function deleteSession(id){if(!confirm('Delete this session?'))return;await apiFetch('/api/sessions/'+id,{method:'DELETE'});showToast('Deleted.');loadSessions();}

async function submitSession(e){
    e.preventDefault();
    var data={subject:document.getElementById('formSubject').value,duration:(parseInt(document.getElementById('formMinutes').value)||0)*60,date:document.getElementById('formDate').value,session_type:document.getElementById('formType').value,notes:document.getElementById('formNotes').value,rating:state.pendingRating||0};
    if(!data.subject){showToast('Subject required',true);return;}if(data.duration<=0){showToast('Duration must be positive',true);return;}
    await apiFetch('/api/sessions',{method:'POST',body:JSON.stringify(data)});showToast('Session logged!');closeSessionModal();if(state.currentView==='sessions')loadSessions();
}

function openSessionModal(){populateSubjectSelects();document.getElementById('formDate').value=getToday();state.pendingRating=0;renderFormRating();document.getElementById('sessionModal').classList.add('open');}
function closeSessionModal(){document.getElementById('sessionModal').classList.remove('open');document.getElementById('sessionForm').reset();state.pendingRating=0;}
function renderFormRating(){
    var c=document.getElementById('formRating');
    c.innerHTML=['&#128542;','&#128533;','&#128528;','&#128522;','&#129321;'].map(function(e,i){return'<button type="button" class="rating-btn" data-val="'+(i+1)+'">'+e+'</button>';}).join('');
    c.querySelectorAll('.rating-btn').forEach(function(b){b.addEventListener('click',function(){state.pendingRating=parseInt(this.dataset.val);c.querySelectorAll('.rating-btn').forEach(function(x,j){x.classList.toggle('active',j<state.pendingRating);});});});
}

function exportToCSV(){
    if(!state.sessions||!state.sessions.length){showToast('No sessions',true);return;}
    var rows=[['Date','Subject','Duration','Type','Rating','Notes']];
    state.sessions.forEach(function(s){rows.push([s.date,'"'+s.subject+'"',Math.round(s.duration/60),s.session_type,s.rating||'','"'+(s.notes||'').replace(/"/g,'""')+'"']);});
    var blob=new Blob([rows.map(function(r){return r.join(',');}).join('\n')],{type:'text/csv'});
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='sessions-'+getToday()+'.csv';a.click();showToast('Exported!');
}

// ── DAILY GOAL ──

async function loadDailyGoal(){var g=await apiFetch('/api/daily-goal');var pct=g.target_minutes>0?Math.min(100,Math.round(g.completed_minutes/g.target_minutes*100)):0;document.getElementById('goalNumbers').textContent=g.completed_minutes+' / '+g.target_minutes+' min';document.getElementById('goalFill').style.width=pct+'%';}
function openGoalModal(){document.getElementById('goalModal').classList.add('open');}
function closeGoalModal(){document.getElementById('goalModal').classList.remove('open');}
async function submitGoal(e){e.preventDefault();var m=parseInt(document.getElementById('goalMinutes').value)||120;await apiFetch('/api/daily-goal',{method:'POST',body:JSON.stringify({target_minutes:m})});showToast('Goal set!');closeGoalModal();loadDailyGoal();}

// ── DASHBOARD ──

async function loadDashboard(){
    document.getElementById('dashboardDate').textContent=new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
    var q=quotes[Math.floor(Math.random()*quotes.length)];
    document.getElementById('quoteBanner').innerHTML='“'+q.text+'”<span class="quote-author">— '+q.author+'</span>';
    await loadSubjectColors(); loadDailyGoal();
    var d=await apiFetch('/api/dashboard');
    document.getElementById('statTodayTime').textContent=formatDuration(d.today.totalSeconds);
    document.getElementById('statTodayCount').textContent=''+d.today.count;
    document.getElementById('statStreak').textContent=d.streak+(d.streak===1?' day':' days');
    document.getElementById('statTotalSessions').textContent=''+d.totalSessions;
    renderRecentSessions(d.today.sessions.slice(0,5));
    var b=await apiFetch('/api/burnout-risk'); renderBurnoutRisk(b);
    var daily=await apiFetch('/api/statistics/daily'); renderBarChart(daily.bySubject,'dashboardSubjectChart',true);
}

function renderRecentSessions(sessions){
    var c=document.getElementById('recentSessions');
    if(!sessions.length){c.innerHTML='<p style="color:var(--text-tertiary);font-size:13px;padding:20px 0;text-align:center">No sessions today. Start the timer!</p>';return;}
    c.innerHTML=sessions.map(function(s){var color=subjectColors[s.subject]||'#4f46e5';return'<div class="session-item"><div class="session-dot" style="background:'+color+'"></div><div class="session-item-info"><div class="session-item-subject">'+escapeHtml(s.subject)+'</div><div class="session-item-time">'+s.session_type+'</div></div><div class="session-item-duration">'+formatDuration(s.duration)+'</div></div>';}).join('');
}

function renderBurnoutRisk(data){
    document.getElementById('burnoutLevel').textContent=data.level;document.getElementById('burnoutLevel').style.color=data.color;
    document.getElementById('burnoutMessage').textContent=data.message;
    document.getElementById('burnoutRing').innerHTML=createProgressRingSVG(data.score,data.color);
    document.getElementById('burnoutFactors').innerHTML='<div class="factor-item"><span class="factor-label">Hours Today</span><span class="factor-value">'+data.factors.dailyHours+'h</span></div><div class="factor-item"><span class="factor-label">Long Sessions</span><span class="factor-value">'+data.factors.longSessions+'</span></div><div class="factor-item"><span class="factor-label">Sessions</span><span class="factor-value">'+data.factors.totalSessionsToday+'</span></div><div class="factor-item"><span class="factor-label">Days This Week</span><span class="factor-value">'+data.factors.daysStudiedThisWeek+'/7</span></div><div class="factor-item"><span class="factor-label">Break Ratio</span><span class="factor-value">'+data.factors.breakRatio+'%</span></div>';
}

function createProgressRingSVG(pct,color){
    var r=48,c=2*Math.PI*r,off=c*(1-pct/100);
    return'<svg width="110" height="110" viewBox="0 0 110 110"><circle cx="55" cy="55" r="'+r+'" fill="none" stroke="var(--border)" stroke-width="8"/><circle cx="55" cy="55" r="'+r+'" fill="none" stroke="'+color+'" stroke-width="8" stroke-dasharray="'+c+'" stroke-dashoffset="'+off+'" stroke-linecap="round" transform="rotate(-90 55 55)" style="transition:stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)"/><text x="55" y="55" text-anchor="middle" dominant-baseline="central" font-size="22" font-weight="800" fill="'+color+'">'+pct+'</text></svg>';
}

// ── CHARTS ──

function renderBarChart(bySubject,containerId,showHours){
    var c=document.getElementById(containerId),entries=Object.entries(bySubject);
    if(!entries.length){c.innerHTML='<div class="chart-empty">No data yet</div>';return;}
    var maxVal=Math.max.apply(null,entries.map(function(e){return e[1].totalSeconds;}));if(maxVal===0)maxVal=1;
    c.innerHTML=entries.map(function(e){var h=Math.max(4,(e[1].totalSeconds/maxVal)*160);var color=subjectColors[e[0]]||'#4f46e5';return'<div class="chart-bar-group"><div class="chart-bar" style="height:'+h+'px;background:'+color+'"><span class="chart-bar-value">'+(showHours?formatDuration(e[1].totalSeconds):e[1].count)+'</span></div><span class="chart-bar-label">'+escapeHtml(e[0])+'</span></div>';}).join('');
}

function renderWeeklyBarChart(daily,containerId){
    var c=document.getElementById(containerId),entries=Object.entries(daily);
    if(!entries.length){c.innerHTML='<div class="chart-empty">No data</div>';return;}
    var maxVal=Math.max.apply(null,entries.map(function(e){return e[1].totalSeconds;}));if(maxVal===0)maxVal=1;
    c.innerHTML=entries.map(function(e){var h=Math.max(4,(e[1].totalSeconds/maxVal)*160);var today=e[0]===getToday();return'<div class="chart-bar-group"><div class="chart-bar" style="height:'+h+'px;background:'+(today?'var(--primary)':'var(--text-tertiary)')+';opacity:'+(today?'1':'0.3')+'"><span class="chart-bar-value">'+formatDuration(e[1].totalSeconds)+'</span></div><span class="chart-bar-label">'+getDayName(e[0])+'</span></div>';}).join('');
}

// ── STATISTICS ──

async function loadStatistics(){
    await loadSubjectColors();
    var d=await apiFetch('/api/statistics/daily');
    document.getElementById('dailyTotalTime').textContent=formatDuration(d.totalSeconds);
    document.getElementById('dailySessionCount').textContent=d.sessionCount;
    document.getElementById('dailyAvgSession').textContent=(d.sessionCount>0?Math.round(d.totalSeconds/d.sessionCount/60):0)+'m';
    renderBarChart(d.bySubject,'dailySubjectChart',true);
    var w=await apiFetch('/api/statistics/weekly');
    document.getElementById('weeklyTotalTime').textContent=formatDuration(w.totalSeconds);
    document.getElementById('weeklySessionCount').textContent=w.sessionCount;
    var bestDay='-',bestVal=0;Object.entries(w.daily).forEach(function(e){if(e[1].totalSeconds>bestVal){bestVal=e[1].totalSeconds;bestDay=getDayName(e[0]);}});
    document.getElementById('weeklyBestDay').textContent=bestDay;
    renderWeeklyBarChart(w.daily,'weeklyDailyChart');
    renderBarChart(w.bySubject,'weeklySubjectChart',true);
}
function showStatTab(tab){document.querySelectorAll('.stats-tabs .tab-btn').forEach(function(b){b.classList.remove('active');});document.querySelectorAll('.stat-panel').forEach(function(p){p.classList.remove('active');});document.querySelector('.stats-tabs .tab-btn[onclick*="'+tab+'"]').classList.add('active');document.getElementById('stat-'+tab).classList.add('active');}

// ── ACHIEVEMENTS ──

async function loadAchievements(){
    var a=await apiFetch('/api/achievements');
    var icons={'1':'&#127947;','2':'&#128293;','3':'&#9889;','4':'&#128218;','5':'&#127891;','6':'&#128170;','7':'&#128081;','8':'&#127758;','9':'&#127813;','10':'&#127749;'};
    document.getElementById('achievementsGrid').innerHTML=a.map(function(x){var u=!!x.unlocked_at;return'<div class="achievement-card '+(u?'unlocked':'locked')+'"><div class="achievement-icon">'+(icons[x.icon]||'&#11088;')+'</div><h4>'+escapeHtml(x.title)+'</h4><p>'+escapeHtml(x.description)+'</p>'+(u?'<div class="achievement-date">Unlocked '+formatDateDisplay((x.unlocked_at.split(' ')[0]||x.unlocked_at.split('T')[0]))+'</div>':'')+'</div>';}).join('');
}

// ── SUBJECTS ──

async function loadSubjectColors(){if(!state.subjects.length)state.subjects=await apiFetch('/api/subjects');state.subjects.forEach(function(s){subjectColors[s.name]=s.color;});}

async function loadSubjects(){
    state.subjects=await apiFetch('/api/subjects');state.subjects.forEach(function(s){subjectColors[s.name]=s.color;});
    document.getElementById('subjectsGrid').style.display='';document.getElementById('subjectDetail').style.display='none';
    document.getElementById('subjectsGrid').innerHTML=state.subjects.map(function(s){return'<div class="subject-card" style="border-top-color:'+s.color+'" onclick="openSubjectDetail('+s.id+')"><div class="subject-icon" style="background:'+s.color+'">'+escapeHtml(s.icon)+'</div><h3>'+escapeHtml(s.name)+'</h3><div class="subject-meta"><span>'+s.totalHours+' hrs</span><span>'+s.sessionCount+' sessions</span></div></div>';}).join('');
}

async function openSubjectDetail(id){
    state.activeSubjectId=id;var s=state.subjects.find(function(x){return x.id===id;});if(!s)return;
    document.getElementById('subjectsGrid').style.display='none';document.getElementById('subjectDetail').style.display='';
    document.getElementById('subjectDetailHeader').innerHTML='<div class="subject-icon" style="background:'+s.color+'">'+escapeHtml(s.icon)+'</div><div><h2>'+escapeHtml(s.name)+'</h2><p class="subtitle">'+s.totalHours+' hours · '+s.sessionCount+' sessions</p></div>';
    switchSubjectTab('videos');
}
function closeSubjectDetail(){document.getElementById('subjectsGrid').style.display='';document.getElementById('subjectDetail').style.display='none';state.activeSubjectId=null;}

async function switchSubjectTab(tab){
    document.querySelectorAll('.subject-tabs .tab-btn').forEach(function(b){b.classList.remove('active');});
    document.querySelectorAll('.tab-panel').forEach(function(p){p.classList.remove('active');});
    document.querySelector('.subject-tabs .tab-btn[data-tab="'+tab+'"]').classList.add('active');
    document.getElementById('panel-'+tab).classList.add('active');
    if(tab==='videos')loadVideos();else loadNotes();
}

async function loadVideos(){
    var v=await apiFetch('/api/subjects/'+state.activeSubjectId+'/videos'),panel=document.getElementById('panel-videos');
    var html='<div class="add-btn-row"><button class="btn btn-primary btn-sm" onclick="openVideoModal()">+ Add Video</button></div>';
    if(!v.length) html+='<div class="empty-state"><p>No videos yet.</p></div>';
    else html+='<div class="video-grid">'+v.map(function(x){return'<div class="video-card"><div class="video-embed"><iframe src="'+escapeHtml(x.url)+'" allowfullscreen loading="lazy"></iframe></div><div class="video-info"><h4>'+escapeHtml(x.title)+'</h4><div class="video-meta"><span>'+(x.duration||'')+(x.watched?' <span class="watched-badge">Watched</span>':'')+'</span><div class="video-actions"><button class="btn btn-sm btn-secondary" onclick="toggleWatched('+x.id+')">'+(x.watched?'Unwatch':'Watched')+'</button><button class="btn-icon" onclick="deleteVideo('+x.id+')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14H7L5 6"/></svg></button></div></div></div></div>';}).join('')+'</div>';
    panel.innerHTML=html;
}
async function toggleWatched(id){await apiFetch('/api/videos/'+id+'/toggle',{method:'PUT'});loadVideos();}
async function deleteVideo(id){if(!confirm('Delete?'))return;await apiFetch('/api/videos/'+id,{method:'DELETE'});loadVideos();}
function openVideoModal(){document.getElementById('videoSubjectId').value=state.activeSubjectId;document.getElementById('videoModal').classList.add('open');}
function closeVideoModal(){document.getElementById('videoModal').classList.remove('open');document.getElementById('videoForm').reset();}
async function submitVideo(e){e.preventDefault();var d={title:document.getElementById('videoTitle').value,url:document.getElementById('videoUrl').value,duration:document.getElementById('videoDuration').value};if(!d.title||!d.url){showToast('Title and URL required',true);return;}await apiFetch('/api/subjects/'+document.getElementById('videoSubjectId').value+'/videos',{method:'POST',body:JSON.stringify(d)});showToast('Video added!');closeVideoModal();loadVideos();}

async function loadNotes(){
    var n=await apiFetch('/api/subjects/'+state.activeSubjectId+'/notes'),panel=document.getElementById('panel-notes');
    var html='<div class="add-btn-row"><button class="btn btn-primary btn-sm" onclick="openNoteModal()">+ Add Note</button></div>';
    if(!n.length) html+='<div class="empty-state"><p>No notes yet.</p></div>';
    else html+='<div class="notes-list">'+n.map(function(x){return'<div class="note-card"><h4>'+escapeHtml(x.title)+'</h4><p>'+escapeHtml(x.content)+'</p><div class="note-card-footer"><span>'+formatDateDisplay(x.updated_at.split(' ')[0])+'</span><div><button class="btn btn-sm btn-secondary" onclick="editNote('+x.id+','+JSON.stringify(x.title).replace(/"/g,'&quot;')+','+JSON.stringify(x.content).replace(/"/g,'&quot;')+')">Edit</button> <button class="btn-icon" onclick="deleteNote('+x.id+')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14H7L5 6"/></svg></button></div></div></div>';}).join('')+'</div>';
    panel.innerHTML=html;
}
function openNoteModal(editId,title,content){document.getElementById('noteSubjectId').value=state.activeSubjectId;document.getElementById('noteModalTitle').textContent=editId?'Edit Note':'Add Note';document.getElementById('noteId').value=editId||'';document.getElementById('noteTitle').value=title||'';document.getElementById('noteContent').value=content||'';document.getElementById('noteModal').classList.add('open');}
function closeNoteModal(){document.getElementById('noteModal').classList.remove('open');document.getElementById('noteForm').reset();}
function editNote(id,title,content){openNoteModal(id,title,content);}
async function submitNote(e){e.preventDefault();var nid=document.getElementById('noteId').value,d={title:document.getElementById('noteTitle').value,content:document.getElementById('noteContent').value};if(!d.title||!d.content){showToast('Title and content required',true);return;}if(nid){await apiFetch('/api/notes/'+nid,{method:'PUT',body:JSON.stringify(d)});showToast('Updated!');}else{await apiFetch('/api/subjects/'+document.getElementById('noteSubjectId').value+'/notes',{method:'POST',body:JSON.stringify(d)});showToast('Added!');}closeNoteModal();loadNotes();}
async function deleteNote(id){if(!confirm('Delete?'))return;await apiFetch('/api/notes/'+id,{method:'DELETE'});loadNotes();}

async function populateSubjectSelects(){
    if(!state.subjects.length){state.subjects=await apiFetch('/api/subjects');state.subjects.forEach(function(s){subjectColors[s.name]=s.color;});}
    ['timerSubject','formSubject','filterSubject'].forEach(function(id){var sel=document.getElementById(id);if(!sel)return;var first=sel.querySelector('option'),cur=sel.value;sel.innerHTML='';sel.appendChild(first);state.subjects.forEach(function(s){var o=document.createElement('option');o.value=s.name;o.textContent=s.name;sel.appendChild(o);});sel.value=cur;});
}

// ── PROFILE ──

async function loadProfile(){
    var u=await apiFetch('/api/auth/profile');var color=u.avatar_color||'#4f46e5';var init=(u.full_name||u.username||'U').charAt(0).toUpperCase();
    document.getElementById('profileAvatar').textContent=init;document.getElementById('profileAvatar').style.background=color;
    document.getElementById('profileName').textContent=u.full_name||u.username;
    document.getElementById('profileRole').textContent=u.role;
    document.getElementById('profileEmail').textContent=u.email;
    document.getElementById('profileJoined').textContent='Joined: '+formatDateDisplay(u.created_at.split(' ')[0]||u.created_at.split('T')[0]);
    document.getElementById('profileFullName').value=u.full_name||'';
    document.getElementById('profileEmailInput').value=u.email;
}

async function updateProfile(e){
    e.preventDefault();
    var body={full_name:document.getElementById('profileFullName').value,email:document.getElementById('profileEmailInput').value};
    var cp=document.getElementById('profileCurrentPass').value,np=document.getElementById('profileNewPass').value;
    if(np){body.current_password=cp;body.new_password=np;}
    var u=await apiFetch('/api/auth/profile',{method:'PUT',body:JSON.stringify(body)});
    try{localStorage.setItem('user',JSON.stringify(u));}catch(e){}
    setupUserMenu();showToast('Profile updated!');loadProfile();
    document.getElementById('profileCurrentPass').value='';document.getElementById('profileNewPass').value='';
}

// ── ADMIN ──

async function loadAdmin(){
    var u=getUser();if(!u||u.role!=='admin'){navigateTo('dashboard');return;}
    var users=await apiFetch('/api/auth/users');
    document.getElementById('adminUsersBody').innerHTML=users.map(function(u){
        var color=u.avatar_color||'#4f46e5',init=(u.full_name||u.username||'U').charAt(0).toUpperCase();
        return'<tr><td><div style="display:flex;align-items:center;gap:10px"><div style="width:32px;height:32px;border-radius:50%;background:'+color+';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0">'+init+'</div><div><div style="font-weight:600;font-size:13px">'+escapeHtml(u.full_name||u.username)+'</div><div style="font-size:11px;color:var(--text-tertiary)">@'+escapeHtml(u.username)+'</div></div></div></td><td style="font-size:13px">'+escapeHtml(u.email)+'</td><td><select onchange="changeUserRole('+u.id+',this.value)"><option value="user"'+(u.role==='user'?' selected':'')+'>User</option><option value="admin"'+(u.role==='admin'?' selected':'')+'>Admin</option></select></td><td style="font-size:12px;color:var(--text-tertiary)">'+formatDateDisplay(u.created_at.split(' ')[0]||u.created_at.split('T')[0])+'</td><td><button class="btn btn-sm btn-danger" onclick="adminDeleteUser('+u.id+')">Delete</button></td></tr>';
    }).join('');
}
async function changeUserRole(id,role){try{await apiFetch('/api/auth/users/'+id+'/role',{method:'PUT',body:JSON.stringify({role:role})});showToast('Role updated!');}catch(e){showToast(e.message,true);loadAdmin();}}
async function adminDeleteUser(id){if(!confirm('Delete this user?'))return;await apiFetch('/api/auth/users/'+id,{method:'DELETE'});showToast('Deleted.');loadAdmin();}

// ── AI CHAT ──

function toggleAIChat(){document.getElementById('aiChatPanel').classList.toggle('open');}

async function sendAIMessage(e){
    e.preventDefault();
    var input=document.getElementById('aiInput'),msg=input.value.trim();if(!msg)return;input.value='';
    var msgs=document.getElementById('aiChatMessages');
    msgs.innerHTML+='<div class="ai-msg user">'+escapeHtml(msg)+'</div>';
    msgs.innerHTML+='<div class="ai-msg loading" id="aiLoading">Thinking...</div>';
    msgs.scrollTop=msgs.scrollHeight;
    try{
        var subj=document.getElementById('timerSubject')?document.getElementById('timerSubject').value:'';
        var data=await apiFetch('/api/ai/chat',{method:'POST',body:JSON.stringify({message:msg,subject:subj})});
        var ld=document.getElementById('aiLoading');if(ld)ld.remove();
        msgs.innerHTML+='<div class="ai-msg bot">'+escapeHtml(data.reply)+'</div>';
    }catch(err){
        var ld=document.getElementById('aiLoading');if(ld)ld.remove();
        msgs.innerHTML+='<div class="ai-msg error">'+escapeHtml(err.message)+'</div>';
    }
    msgs.scrollTop=msgs.scrollHeight;
}

// ── KEYBOARD ──

document.addEventListener('keydown',function(e){
    if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT')return;
    if(e.key===' '&&state.currentView==='timer'){e.preventDefault();if(!state.timer.running)startTimer();else if(state.timer.paused)resumeTimer();else pauseTimer();}
    if(e.key==='Escape'){document.querySelectorAll('.modal-overlay.open').forEach(function(m){m.classList.remove('open');});document.getElementById('aiChatPanel').classList.remove('open');}
});

// ── INIT ──

function init(){
    if(!requireAuth()) return;
    loadTheme(); initParticles(); setupUserMenu(); navigateTo('dashboard');
}
document.addEventListener('DOMContentLoaded',init);
