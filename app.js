import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let currentRows = [];

const $ = (id) => document.getElementById(id);
const show = (id, msg, isError=false) => { const el=$(id); if(!el) return; el.textContent = msg; el.classList.toggle('error', isError); };
const validMobile10 = (m) => /^\d{10}$/.test(String(m||'').trim());
const onlyDigits = (v) => String(v||'').replace(/\D/g,'');
const today = () => new Date().toISOString().slice(0,10);

function loadApiSettings(){
  $('apiToken').value = localStorage.getItem('whatsbot_api_token') || '';
  $('deviceId').value = localStorage.getItem('whatsbot_device_id') || '';
  $('defaultSchoolMobile').value = localStorage.getItem('default_school_mobile') || '';
  $('schoolName').value = localStorage.getItem('school_name') || 'GBS SCHOOL';
  $('attendanceDate').value = today();
  $('eventDate').value = today();
}
function saveApiSettings(){
  localStorage.setItem('whatsbot_api_token', $('apiToken').value.trim());
  localStorage.setItem('whatsbot_device_id', $('deviceId').value.trim());
  localStorage.setItem('default_school_mobile', $('defaultSchoolMobile').value.trim());
  localStorage.setItem('school_name', $('schoolName').value.trim());
  show('apiMsg','API Settings save झाल्या.');
}
function getApi(){
  return {
    token: localStorage.getItem('whatsbot_api_token') || $('apiToken').value.trim(),
    deviceId: localStorage.getItem('whatsbot_device_id') || $('deviceId').value.trim(),
    schoolMobile: localStorage.getItem('default_school_mobile') || $('defaultSchoolMobile').value.trim(),
    schoolName: localStorage.getItem('school_name') || $('schoolName').value.trim() || 'School'
  };
}
function normalMobile(m){
  const d = onlyDigits(m);
  if(d.length === 10) return '91'+d;
  return d;
}
function makeWhatsBotUrl(type, mobile, message, mediaUrl=''){
  const api = getApi();
  if(!api.token) throw new Error('WhatsBot API Token सेट करा.');
  const params = new URLSearchParams();
  params.set('api_token', api.token);
  params.set('mobile', mobile);
  if(api.deviceId) params.set('device_id', api.deviceId);
  if(type === 'sms') {
    params.set('message', message || '');
    return `https://whatsbot.tech/api/send_sms?${params.toString()}`;
  }
  if(type === 'img') {
    params.set('img_url', mediaUrl || '');
    params.set('img_caption', message || '');
    return `https://whatsbot.tech/api/send_img?${params.toString()}`;
  }
  if(type === 'doc') {
    params.set('doc_url', mediaUrl || '');
    return `https://whatsbot.tech/api/send_doc?${params.toString()}`;
  }
  if(type === 'video') {
    params.set('video_url', mediaUrl || '');
    return `https://whatsbot.tech/api/send_video?${params.toString()}`;
  }
  throw new Error('Invalid WhatsApp API type');
}
async function logMessage(payload){
  try { await addDoc(collection(db,'message_logs'), {...payload, createdAt: serverTimestamp()}); } catch(e) {}
}
async function sendWhatsBot(type, mobiles, message, mediaUrl=''){
  const nums = String(mobiles||'').split(',').map(x=>normalMobile(x.trim())).filter(Boolean);
  if(!nums.length) throw new Error('Mobile number द्या.');
  const sent = [];
  for(const mobile of nums){
    const url = makeWhatsBotUrl(type, mobile, message, mediaUrl);
    // no-cors is used because many third-party APIs do not allow browser CORS.
    await fetch(url, { method:'GET', mode:'no-cors' });
    sent.push(mobile);
    await logMessage({type, mobile, message, mediaUrl, status:'queued'});
  }
  return sent;
}

$('loginBtn').onclick = async () => {
  try { await signInWithEmailAndPassword(auth, $('email').value.trim(), $('password').value); }
  catch (e) { show('loginMsg', 'Login Error: ' + e.message, true); }
};
$('resetBtn').onclick = async () => {
  try { await sendPasswordResetEmail(auth, $('email').value.trim()); show('loginMsg','Password reset email पाठवला आहे.'); }
  catch(e){ show('loginMsg','Error: '+e.message,true); }
};
$('logoutBtn').onclick = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
  $('loginCard').classList.toggle('hidden', !!user);
  $('appPanel').classList.toggle('hidden', !user);
  if (user) { $('userEmail').textContent = user.email; loadApiSettings(); loadCounts(); }
});

$('saveApiSettingsBtn').onclick = saveApiSettings;
$('testApiBtn').onclick = async () => {
  try{
    saveApiSettings();
    await sendWhatsBot('sms', getApi().schoolMobile, `${getApi().schoolName}: WhatsBot API test successful.`);
    show('apiMsg','Test message WhatsBot queue मध्ये पाठवला.');
  } catch(e){ show('apiMsg', e.message, true); }
};

$('addStudentBtn').onclick = async () => {
  try{
    const mobile = $('parentMobile').value.trim();
    const aadhaar = onlyDigits($('studentAadhaar').value);
    if(!validMobile10(mobile)) return show('studentMsg','मोबाईल नंबर 10 अंकांचा असावा.',true);
    if(aadhaar && aadhaar.length !== 12) return show('studentMsg','आधार क्रमांक 12 अंकांचा असावा.',true);
    await addDoc(collection(db,'students'), {
      name: $('studentName').value.trim(), dob: $('studentDob').value, aadhaar,
      className: $('studentClass').value.trim(), division: $('studentDivision').value.trim(), rollNo: $('studentRoll').value.trim(),
      address: $('studentAddress').value.trim(), parentName: $('parentName').value.trim(), parentMobile: mobile,
      photoUrl: $('studentPhotoUrl').value.trim(), educationInfo: $('studentEducationInfo').value.trim(), createdAt: serverTimestamp()
    });
    show('studentMsg','विद्यार्थी डेटा cloud मध्ये save झाला.'); loadCounts();
  } catch(e){ show('studentMsg','Error: '+e.message,true); }
};
$('addTeacherBtn').onclick = async () => {
  try{
    const mobile = $('teacherMobile').value.trim();
    if(!validMobile10(mobile)) return show('teacherMsg','मोबाईल नंबर 10 अंकांचा असावा.',true);
    await addDoc(collection(db,'teachers'), { name:$('teacherName').value.trim(), subject:$('teacherSubject').value.trim(), mobile, email:$('teacherEmail').value.trim(), createdAt:serverTimestamp() });
    show('teacherMsg','शिक्षक डेटा cloud मध्ये save झाला.'); loadCounts();
  } catch(e){ show('teacherMsg','Error: '+e.message,true); }
};
$('addOfficerBtn').onclick = async () => {
  try{
    await addDoc(collection(db,'officers'), { name:$('officerName').value.trim(), role:$('officerRole').value.trim(), mobile:normalMobile($('officerMobile').value), altMobile:normalMobile($('officerAltMobile').value), email:$('officerEmail').value.trim(), createdAt:serverTimestamp() });
    show('officerMsg','मुख्याध्यापक / अधिकारी नंबर save झाला.');
  } catch(e){ show('officerMsg','Error: '+e.message,true); }
};
$('addAttendanceBtn').onclick = async () => {
  try{
    await addDoc(collection(db,'attendance'), { type:$('attendanceType').value, name:$('personName').value.trim(), className:$('attendanceClass').value.trim(), status:$('status').value, date:$('attendanceDate').value, createdAt:serverTimestamp() });
    show('attendanceMsg','उपस्थिती cloud मध्ये save झाली.'); loadCounts();
  } catch(e){ show('attendanceMsg','Error: '+e.message,true); }
};
$('sendAttendanceWhatsAppBtn').onclick = async () => {
  try{
    const msg = `${getApi().schoolName}\nउपस्थिती नोंद:\nनाव: ${$('personName').value}\nवर्ग/विषय: ${$('attendanceClass').value}\nदिनांक: ${$('attendanceDate').value}\nस्थिती: ${$('status').value}`;
    await sendWhatsBot('sms', $('defaultSchoolMobile').value || getApi().schoolMobile, msg);
    show('attendanceMsg','उपस्थिती WhatsApp API द्वारे पाठवली.');
  } catch(e){ show('attendanceMsg','WhatsApp Error: '+e.message,true); }
};
$('addLinkBtn').onclick = async () => {
  try{
    await addDoc(collection(db,'syllabus_links'), { title:$('linkTitle').value.trim(), url:$('linkUrl').value.trim(), createdAt:serverTimestamp() });
    show('linkMsg','अभ्यासक्रम लिंक save झाली.');
  } catch(e){ show('linkMsg','Error: '+e.message,true); }
};
$('sendLinkWhatsAppBtn').onclick = async () => {
  try{
    const msg = `${getApi().schoolName}\nअभ्यासक्रम / लिंक:\n${$('linkTitle').value}\n${$('linkUrl').value}`;
    await sendWhatsBot('sms', getApi().schoolMobile, msg);
    show('linkMsg','Link WhatsApp API द्वारे पाठवली.');
  } catch(e){ show('linkMsg','WhatsApp Error: '+e.message,true); }
};
$('addEventBtn').onclick = async () => {
  try{
    await addDoc(collection(db,'events'), { title:$('eventTitle').value.trim(), date:$('eventDate').value, details:$('eventDetails').value.trim(), createdAt:serverTimestamp() });
    show('eventMsg','कार्यक्रम / सूचना save झाली.');
  } catch(e){ show('eventMsg','Error: '+e.message,true); }
};
$('sendEventWhatsAppBtn').onclick = async () => {
  try{
    const msg = `${getApi().schoolName}\nकार्यक्रम / सूचना\n${$('eventTitle').value}\nदिनांक: ${$('eventDate').value}\n${$('eventDetails').value}`;
    await sendWhatsBot('sms', getApi().schoolMobile, msg);
    show('eventMsg','कार्यक्रम सूचना WhatsApp API द्वारे पाठवली.');
  } catch(e){ show('eventMsg','WhatsApp Error: '+e.message,true); }
};
$('sendWaBtn').onclick = async () => {
  try{
    await sendWhatsBot($('waType').value, $('waMobile').value, $('waMessage').value, $('waMediaUrl').value);
    show('waMsg','WhatsBot API request पाठवली.'); loadCounts();
  } catch(e){ show('waMsg',e.message,true); }
};
$('openWaLinkBtn').onclick = () => {
  const mobile = normalMobile($('waMobile').value.split(',')[0] || '');
  const text = encodeURIComponent($('waMessage').value || '');
  if(!mobile) return show('waMsg','Mobile number द्या.',true);
  window.open(`https://wa.me/${mobile}?text=${text}`,'_blank');
};
$('loadReportBtn').onclick = async () => {
  try{
    const snap = await getDocs(collection(db,'attendance'));
    currentRows = [];
    $('reportBody').innerHTML = '';
    snap.forEach(doc => {
      const d = doc.data(); currentRows.push(d);
      $('reportBody').innerHTML += `<tr><td>${d.date||''}</td><td>${d.type||''}</td><td>${d.name||''}</td><td>${d.className||''}</td><td>${d.status||''}</td></tr>`;
    });
  } catch(e){ alert('Report Error: '+e.message); }
};
$('exportCsvBtn').onclick = () => {
  const csv = 'date,type,name,class,status\n' + currentRows.map(r => [r.date,r.type,r.name,r.className,r.status].map(x => `"${String(x||'').replaceAll('"','""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'attendance_report.csv'; a.click();
};
async function countCol(name){ try{ const s=await getDocs(collection(db,name)); return s.size; }catch(e){return 0;} }
async function loadCounts(){
  $('studentCount').textContent = await countCol('students');
  $('teacherCount').textContent = await countCol('teachers');
  $('attendanceCount').textContent = await countCol('attendance');
  $('messageCount').textContent = await countCol('message_logs');
}
