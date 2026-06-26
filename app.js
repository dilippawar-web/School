import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, query, limit, orderBy } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let currentRows = [];
const $ = (id) => document.getElementById(id);
const show = (id, msg, isError=false) => { const el=$(id); if(el){el.textContent=msg; el.style.color=isError?'#b42318':'#1f6f43';} };
const validMobile = (m) => /^\d{10}$/.test((m||'').trim());
const today = () => new Date().toISOString().slice(0,10);
if ($('attendanceDate')) $('attendanceDate').value = today();

function attendanceMessage(row){
  const st = row.status === 'Absent' ? 'अनुपस्थित' : row.status === 'Leave' ? 'रजेवर' : 'उपस्थित';
  return `नमस्कार, ${row.name} यांची दिनांक ${row.date} रोजी उपस्थिती: ${st}. - विद्यार्थी उपस्थिती व्यवस्थापन`;
}
function whatsappUrl(mobile, msg){
  const phone = '91' + String(mobile||'').replace(/\D/g,'').slice(-10);
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}
async function refreshCounts(){
  try{
    const items=[['students','studentCount'],['teachers','teacherCount'],['attendance','attendanceCount'],['syllabus_links','linkCount']];
    for(const [col,id] of items){ const snap=await getDocs(collection(db,col)); $(id).textContent=snap.size; }
  }catch(e){ console.warn(e); }
}

$('loginBtn').onclick = async () => {
  try { await signInWithEmailAndPassword(auth, $('email').value.trim(), $('password').value); show('loginMsg','Login successful'); }
  catch (e) { show('loginMsg', 'Login Error: ' + e.message, true); }
};
$('resetBtn').onclick = async () => {
  try { await sendPasswordResetEmail(auth, $('email').value.trim()); show('loginMsg','Password reset email पाठवला आहे.'); }
  catch (e) { show('loginMsg', 'Error: ' + e.message, true); }
};
$('logoutBtn').onclick = () => signOut(auth);
onAuthStateChanged(auth, (user) => {
  $('loginCard').classList.toggle('hidden', !!user);
  $('appPanel').classList.toggle('hidden', !user);
  $('logoutBtn').classList.toggle('hidden', !user);
  if (user) { $('userEmail').textContent = user.email; refreshCounts(); }
});

$('addStudentBtn').onclick = async () => {
  try{
    const mobile = $('parentMobile').value.trim();
    if (!validMobile(mobile)) return show('studentMsg','मोबाईल नंबर 10 अंकांचा असावा.',true);
    await addDoc(collection(db,'students'), { name:$('studentName').value.trim(), className:$('studentClass').value.trim(), rollNo:$('studentRoll').value.trim(), parentMobile:mobile, createdAt:serverTimestamp() });
    show('studentMsg','विद्यार्थी डेटा cloud मध्ये save झाला.'); refreshCounts();
  }catch(e){ show('studentMsg','Save Error: '+e.message,true); }
};
$('addTeacherBtn').onclick = async () => {
  try{
    const mobile = $('teacherMobile').value.trim();
    if (!validMobile(mobile)) return show('teacherMsg','मोबाईल नंबर 10 अंकांचा असावा.',true);
    await addDoc(collection(db,'teachers'), { name:$('teacherName').value.trim(), subject:$('teacherSubject').value.trim(), mobile, createdAt:serverTimestamp() });
    show('teacherMsg','शिक्षक डेटा cloud मध्ये save झाला.'); refreshCounts();
  }catch(e){ show('teacherMsg','Save Error: '+e.message,true); }
};
$('addAttendanceBtn').onclick = async () => {
  try{
    const mobile = $('attendanceMobile').value.trim();
    if (mobile && !validMobile(mobile)) return show('attendanceMsg','मोबाईल नंबर 10 अंकांचा असावा.',true);
    const row = { type:$('attendanceType').value, name:$('personName').value.trim(), className:$('attendanceClass').value.trim(), status:$('status').value, date:$('attendanceDate').value || today(), mobile, createdAt:serverTimestamp() };
    await addDoc(collection(db,'attendance'), row);
    show('attendanceMsg','उपस्थिती cloud मध्ये save झाली.'); refreshCounts();
  }catch(e){ show('attendanceMsg','Save Error: '+e.message,true); }
};
$('addLinkBtn').onclick = async () => {
  try{
    await addDoc(collection(db,'syllabus_links'), { title:$('linkTitle').value.trim(), url:$('linkUrl').value.trim(), createdAt:serverTimestamp() });
    show('linkMsg','अभ्यासक्रम लिंक save झाली.'); refreshCounts();
  }catch(e){ show('linkMsg','Save Error: '+e.message,true); }
};

$('saveSmsSettingsBtn').onclick = () => {
  localStorage.setItem('smsApiUrl',$('smsApiUrl').value.trim());
  localStorage.setItem('smsApiKey',$('smsApiKey').value.trim());
  localStorage.setItem('smsProvider',$('smsProvider').value);
  show('smsSettingsMsg','SMS settings saved.');
};
$('smsApiUrl').value = localStorage.getItem('smsApiUrl') || '';
$('smsApiKey').value = localStorage.getItem('smsApiKey') || '';
$('smsProvider').value = localStorage.getItem('smsProvider') || 'fast2sms';

async function loadReport(){
  try{
    let snap;
    try { snap = await getDocs(query(collection(db,'attendance'), orderBy('createdAt','desc'), limit(100))); }
    catch { snap = await getDocs(collection(db,'attendance')); }
    currentRows=[]; $('reportBody').innerHTML='';
    snap.forEach(doc=>{ const d=doc.data(); currentRows.push(d); addReportRow(d); });
    show('reportMsg', currentRows.length ? `${currentRows.length} नोंदी दिसत आहेत.` : 'Attendance record उपलब्ध नाही.');
  }catch(e){ show('reportMsg','Report Error: '+e.message,true); }
}
function addReportRow(d){
  const msg = attendanceMessage(d);
  const mobile = d.mobile || '';
  const waBtn = mobile ? `<a class="btn mini wa" target="_blank" href="${whatsappUrl(mobile,msg)}">WhatsApp</a>` : '';
  const smsBtn = mobile ? `<button class="btn mini sms" data-mobile="${mobile}" data-msg="${encodeURIComponent(msg)}">SMS API</button>` : '';
  $('reportBody').innerHTML += `<tr><td>${d.date||''}</td><td>${d.type||''}</td><td>${d.name||''}</td><td>${d.className||''}</td><td>${d.status||''}</td><td>${mobile}</td><td>${waBtn} ${smsBtn}</td></tr>`;
}
$('loadReportBtn').onclick = loadReport;
$('reportBody').onclick = async (ev) => {
  if(!ev.target.matches('button.sms')) return;
  await sendSmsApi(ev.target.dataset.mobile, decodeURIComponent(ev.target.dataset.msg));
};
$('bulkWhatsAppBtn').onclick = () => {
  const row = currentRows.find(r=>r.mobile);
  if(!row) return show('reportMsg','Report मध्ये मोबाईल नंबर उपलब्ध नाही.',true);
  window.open(whatsappUrl(row.mobile, attendanceMessage(row)), '_blank');
};
async function sendSmsApi(mobile, message){
  const apiUrl=localStorage.getItem('smsApiUrl'); const apiKey=localStorage.getItem('smsApiKey'); const provider=localStorage.getItem('smsProvider')||'fast2sms';
  if(!apiUrl || !apiKey) return show('reportMsg','SMS API URL आणि API Key आधी Save करा.',true);
  try{
    let url=apiUrl;
    let options={method:'GET'};
    if(provider==='fast2sms'){
      url = `${apiUrl}?authorization=${encodeURIComponent(apiKey)}&route=q&message=${encodeURIComponent(message)}&language=unicode&flash=0&numbers=${mobile}`;
    } else {
      url = apiUrl.replace('{key}',encodeURIComponent(apiKey)).replace('{mobile}',mobile).replace('{message}',encodeURIComponent(message));
    }
    await fetch(url, options);
    show('reportMsg','SMS API request पाठवली. Provider dashboard मध्ये status तपासा.');
  }catch(e){ show('reportMsg','SMS Error/CORS: Backend किंवा Firebase Cloud Function वापरावी लागेल. '+e.message,true); }
}
$('exportCsvBtn').onclick = () => {
  const csv = 'date,type,name,class,status,mobile\n' + currentRows.map(r => [r.date,r.type,r.name,r.className,r.status,r.mobile].map(x => `"${x||''}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='attendance_report.csv'; a.click();
};
