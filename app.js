import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, query, orderBy, limit, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let currentRows = [];
const $ = id => document.getElementById(id);
const show = (id,msg)=>{ const el=$(id); if(el) el.textContent=msg; };
const val = id => ($(id)?.value || '').trim();
const validMobile = m => /^91\d{10}$/.test(m) || /^\d{10}$/.test(m);
const to91 = m => { m=(m||'').replace(/\D/g,''); if(m.length===10) return '91'+m; return m; };

async function getSettings(){
  const snap = await getDoc(doc(db,'settings','whatsbot'));
  return snap.exists()?snap.data():{};
}
async function sendWhatsBot(type, mobiles, message, mediaUrl=''){
  const s = await getSettings();
  if(!s.apiToken) throw new Error('WhatsBot API Token save केलेला नाही.');
  const device = s.deviceId ? `&device_id=${encodeURIComponent(s.deviceId)}` : '';
  const api = type || 'send_sms';
  const cleanMobiles = mobiles.split(',').map(to91).filter(Boolean).join(',');
  let url = `https://whatsbot.tech/api/${api}?api_token=${encodeURIComponent(s.apiToken)}&mobile=${encodeURIComponent(cleanMobiles)}${device}`;
  if(api==='send_sms') url += `&message=${encodeURIComponent(message)}`;
  if(api==='send_img') url += `&img_url=${encodeURIComponent(mediaUrl)}&img_caption=${encodeURIComponent(message)}`;
  if(api==='send_doc') url += `&doc_url=${encodeURIComponent(mediaUrl)}`;
  if(api==='send_video') url += `&video_url=${encodeURIComponent(mediaUrl)}`;
  const res = await fetch(url, { method:'GET' });
  const txt = await res.text();
  await addDoc(collection(db,'whatsapp_logs'),{type:api,mobiles:cleanMobiles,message,mediaUrl,response:txt,createdAt:serverTimestamp()});
  return txt;
}

$('loginBtn').onclick = async()=>{try{await signInWithEmailAndPassword(auth,val('email'),val('password'));}catch(e){show('loginMsg','Login Error: '+e.message);}};
$('resetBtn').onclick = async()=>{try{await sendPasswordResetEmail(auth,val('email'));show('loginMsg','Password reset email पाठवला आहे.');}catch(e){show('loginMsg','Error: '+e.message);}};
$('logoutBtn').onclick = ()=>signOut(auth);
onAuthStateChanged(auth, async user=>{ $('loginCard').classList.toggle('hidden',!!user); $('appPanel').classList.toggle('hidden',!user); if(user){$('userEmail').textContent=user.email; await loadSettings(); await updateStats(); await loadResources();}});

async function loadSettings(){ const s=await getSettings(); ['apiToken','deviceId','schoolName','senderMobile'].forEach(id=>{if(s[id]) $(id).value=s[id];}); const c=(await getDoc(doc(db,'settings','contacts'))); if(c.exists()){const d=c.data(); Object.keys(d).forEach(k=>{if($(k)) $(k).value=d[k];});}}
$('saveApiBtn').onclick=async()=>{await setDoc(doc(db,'settings','whatsbot'),{apiToken:val('apiToken'),deviceId:val('deviceId'),schoolName:val('schoolName'),senderMobile:val('senderMobile'),updatedAt:serverTimestamp()});show('apiMsg','API Settings save झाले.');};
$('saveContactsBtn').onclick=async()=>{await setDoc(doc(db,'settings','contacts'),{headmasterName:val('headmasterName'),headmasterMobile:val('headmasterMobile'),officer1:val('officer1'),officer2:val('officer2'),officer3:val('officer3'),extraOfficers:val('extraOfficers'),updatedAt:serverTimestamp()});show('contactsMsg','संपर्क save झाले.');};

$('addStudentBtn').onclick=async()=>{try{const m1=to91(val('parentMobile1')); if(!validMobile(m1)) return show('studentMsg','पालक मोबाईल 10 अंकांचा असावा.'); const aad=val('aadhar'); if(aad && !/^\d{12}$/.test(aad)) return show('studentMsg','आधार क्रमांक 12 अंकांचा असावा.'); await addDoc(collection(db,'students'),{name:val('studentName'),className:val('studentClass'),division:val('studentDiv'),rollNo:val('studentRoll'),dob:val('studentDob'),aadhar:aad,photoUrl:val('studentPhoto'),fatherName:val('fatherName'),motherName:val('motherName'),parentMobile1:m1,parentMobile2:to91(val('parentMobile2')),parentMobile3:to91(val('parentMobile3')),address:val('address'),createdAt:serverTimestamp()});show('studentMsg','विद्यार्थी डेटा cloud मध्ये save झाला.'); updateStats();}catch(e){show('studentMsg','Error: '+e.message);}};
$('addTeacherBtn').onclick=async()=>{try{await addDoc(collection(db,'teachers'),{name:val('teacherName'),subject:val('teacherSubject'),mobile:to91(val('teacherMobile')),createdAt:serverTimestamp()});show('teacherMsg','शिक्षक डेटा cloud मध्ये save झाला.'); updateStats();}catch(e){show('teacherMsg','Error: '+e.message);}};
$('addAttendanceBtn').onclick=async()=>{try{const data={type:val('attendanceType'),name:val('personName'),className:val('attendanceClass'),status:val('status'),date:val('attendanceDate'),reason:val('attendanceReason'),parentMobile:to91(val('attendanceParentMobile')),createdAt:serverTimestamp()}; await addDoc(collection(db,'attendance'),data); show('attendanceMsg','उपस्थिती cloud मध्ये save झाली.'); if($('notifyParent').checked && data.parentMobile){ const msg=`${val('schoolName')||'शाळा'} सूचना: ${data.name} यांची ${data.date} रोजी स्थिती: ${data.status}. कारण: ${data.reason||'-'}`; await sendWhatsBot('send_sms',data.parentMobile,msg); show('attendanceMsg','उपस्थिती save झाली व पालकांना WhatsApp सूचना पाठवली.'); } updateStats();}catch(e){show('attendanceMsg','Error: '+e.message);}};
$('saveNoticeBtn').onclick=async()=>{try{await addDoc(collection(db,'notices'),{category:val('noticeCategory'),title:val('noticeTitle'),message:val('noticeMessage'),mobiles:val('noticeMobiles'),mediaUrl:val('noticeMedia'),createdAt:serverTimestamp()});show('noticeMsg','सूचना save झाली.'); updateStats();}catch(e){show('noticeMsg','Error: '+e.message);}};
$('sendNoticeBtn').onclick=async()=>{try{let type='send_sms'; if(val('noticeMedia')){ const u=val('noticeMedia').toLowerCase(); type=u.endsWith('.mp4')?'send_video':(u.endsWith('.pdf')||u.endsWith('.doc')||u.endsWith('.docx'))?'send_doc':'send_img'; } const msg=`${val('noticeCategory')} - ${val('noticeTitle')}\n${val('noticeMessage')}`; const res=await sendWhatsBot(type,val('noticeMobiles'),msg,val('noticeMedia')); show('noticeMsg','WhatsApp API Response: '+res);}catch(e){show('noticeMsg','Error: '+e.message);}};
$('sendWaBtn').onclick=async()=>{try{ const res=await sendWhatsBot(val('waType'),val('waMobile'),val('waMessage'),val('mediaUrl')); show('waMsg','WhatsApp API Response: '+res); }catch(e){show('waMsg','Error: '+e.message);} };
$('openWaLink').onclick=(ev)=>{ const m=to91(val('waMobile').split(',')[0]); $('openWaLink').href=`https://wa.me/${m}?text=${encodeURIComponent(val('waMessage'))}`; };
$('addResourceBtn').onclick=async()=>{try{await addDoc(collection(db,'resources'),{className:val('resourceClass'),subject:val('resourceSubject'),title:val('resourceTitle'),url:val('resourceUrl'),createdAt:serverTimestamp()});show('resourceMsg','Link save झाली.');loadResources();}catch(e){show('resourceMsg','Error: '+e.message);}};
async function loadResources(){try{const snap=await getDocs(collection(db,'resources')); $('resourceList').innerHTML=''; snap.forEach(d=>{const r=d.data(); $('resourceList').innerHTML+=`<div class="item"><b>${r.className} - ${r.subject}</b><br>${r.title}<br><a target="_blank" href="${r.url}">${r.url}</a></div>`;});}catch(e){}}
$('loadReportBtn').onclick=async()=>{try{const q=query(collection(db,'attendance'),orderBy('createdAt','desc'),limit(100)); const snap=await getDocs(q); currentRows=[]; $('reportBody').innerHTML=''; snap.forEach(doc=>{const d=doc.data(); currentRows.push(d); $('reportBody').innerHTML += `<tr><td>${d.date||''}</td><td>${d.type||''}</td><td>${d.name||''}</td><td>${d.className||''}</td><td>${d.status||''}</td><td>${d.reason||''}</td></tr>`;});}catch(e){alert('Report Error: '+e.message);}};
$('exportCsvBtn').onclick=()=>{const csv='date,type,name,class,status,reason\n'+currentRows.map(r=>[r.date,r.type,r.name,r.className,r.status,r.reason].map(x=>`"${x||''}"`).join(',')).join('\n'); const blob=new Blob([csv],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='attendance_report.csv'; a.click();};
async function updateStats(){try{const cols=['students','teachers','attendance','notices']; for(const c of cols){const snap=await getDocs(collection(db,c)); const id=c==='students'?'studentCount':c==='teachers'?'teacherCount':c==='attendance'?'attendanceCount':'noticeCount'; $(id).textContent=snap.size;}}catch(e){}}
