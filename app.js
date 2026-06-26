import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, query, limit } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let currentRows = [];
let cameraStream = null;

const $ = id => document.getElementById(id);
const show = (id,msg) => { const el=$(id); if(el) el.textContent=msg; };
const val = id => ($(id)?.value || "").trim();
const validMobile10 = m => /^\d{10}$/.test(m);
const normalizeMobile = m => { m=(m||"").replace(/\D/g,""); return m.length===10 ? "91"+m : m; };

async function saveDoc(col, data){ return addDoc(collection(db,col), {...data, createdAt:serverTimestamp(), createdBy:auth.currentUser?.email||""}); }

function apiSettings(){ return {
  base: localStorage.getItem("apiBase") || "https://whatsbot.tech/api",
  token: localStorage.getItem("apiToken") || "30f4848f-ed51-42e0-989c-685204f085a2",
  deviceId: localStorage.getItem("deviceId") || "46081"
};}

async function whatsbot(endpoint, params){
  const s=apiSettings(); params.api_token=s.token; if(s.deviceId) params.device_id=s.deviceId;
  const url = `${s.base}/${endpoint}?` + new URLSearchParams(params).toString();
  const res = await fetch(url); const text=await res.text();
  await saveDoc("whatsbot_logs",{endpoint,params,response:text});
  return text;
}
async function sendText(mobile,message){
  mobile=normalizeMobile(mobile);
  if(!/^91\d{10}$/.test(mobile)) throw new Error("मोबाईल नंबर 91 सहित द्या.");
  return whatsbot("send_sms",{mobile,message});
}
async function sendMedia(type,mobile,url,caption=""){
  mobile=normalizeMobile(mobile);
  if(type==="img") return whatsbot("send_img",{mobile,img_url:url,img_caption:caption});
  if(type==="doc") return whatsbot("send_doc",{mobile,doc_url:url});
  if(type==="video") return whatsbot("send_video",{mobile,video_url:url});
}

$("loginBtn").onclick=async()=>{try{await signInWithEmailAndPassword(auth,val("email"),val("password"));show("loginMsg","");}catch(e){show("loginMsg","Login Error: "+e.message);}};
$("resetBtn").onclick=async()=>{try{await sendPasswordResetEmail(auth,val("email"));show("loginMsg","Password reset email पाठवला आहे.");}catch(e){show("loginMsg","Error: "+e.message);}};
$("logoutBtn").onclick=()=>signOut(auth);
onAuthStateChanged(auth,user=>{$("loginCard").classList.toggle("hidden",!!user);$("appPanel").classList.toggle("hidden",!user);if(user){$("userEmail").textContent=user.email;loadApiSettings();}});

document.querySelectorAll(".tabs button").forEach(btn=>btn.onclick=()=>{document.querySelectorAll(".tabs button").forEach(b=>b.classList.remove("active"));document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));btn.classList.add("active");$(btn.dataset.tab).classList.add("active");});

$("startCamera").onclick=async()=>{try{cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false});$("cameraPreview").srcObject=cameraStream;}catch(e){show("studentMsg","Camera Error: "+e.message);}};
$("capturePhoto").onclick=()=>{const v=$("cameraPreview"),c=$("photoCanvas");c.width=v.videoWidth||640;c.height=v.videoHeight||480;c.getContext("2d").drawImage(v,0,0,c.width,c.height);const data=c.toDataURL("image/jpeg",.7);$("photoPreview").src=data;$("studentPhotoUrl").value=data;show("studentMsg","फोटो capture झाला.");};

$("addStudentBtn").onclick=async()=>{try{const m1=val("parentMobile1");if(!validMobile10(m1))return show("studentMsg","पालक मोबाईल 1 हा 10 अंकांचा असावा.");const aad=val("studentAadhaar");if(aad&&!/^\d{12}$/.test(aad))return show("studentMsg","आधार 12 अंकांचा असावा.");await saveDoc("students",{name:val("studentName"),dob:val("studentDob"),aadhaar:aad,className:val("studentClass"),section:val("studentSection"),rollNo:val("studentRoll"),address:val("studentAddress"),fatherName:val("fatherName"),motherName:val("motherName"),parentMobile1:m1,parentMobile2:val("parentMobile2"),parentMobile3:val("parentMobile3"),photoUrl:val("studentPhotoUrl")});show("studentMsg","विद्यार्थी डेटा cloud मध्ये save झाला.");}catch(e){show("studentMsg","Error: "+e.message);}};
$("addTeacherBtn").onclick=async()=>{try{if(!validMobile10(val("teacherMobile")))return show("teacherMsg","मोबाईल 10 अंकांचा असावा.");await saveDoc("teachers",{name:val("teacherName"),role:val("teacherRole"),subject:val("teacherSubject"),mobile:val("teacherMobile")});show("teacherMsg","शिक्षक/अधिकारी save झाले.");}catch(e){show("teacherMsg","Error: "+e.message);}};

function attendanceMessage(){return `उपस्थिती सूचना\nविद्यार्थी: ${val("attendanceStudentName")}\nवर्ग: ${val("attendanceClass")}\nस्थिती: ${val("studentAttendanceStatus")}\nकारण: ${val("attendanceReason")}\nदिनांक: ${val("attendanceDate")}`;}
$("addStudentAttendanceBtn").onclick=async()=>{try{await saveDoc("attendance",{type:"student",name:val("attendanceStudentName"),className:val("attendanceClass"),status:val("studentAttendanceStatus"),reason:val("attendanceReason"),date:val("attendanceDate")});show("attendanceMsg","विद्यार्थी उपस्थिती save झाली.");}catch(e){show("attendanceMsg","Error: "+e.message);}};
$("sendAttendanceWhatsapp").onclick=async()=>{try{const r=await sendText(val("attendanceParentMobile"),attendanceMessage());show("attendanceMsg","WhatsApp पाठवला: "+r);}catch(e){show("attendanceMsg","Error: "+e.message);}};

$("addTeacherAttendanceBtn").onclick=async()=>{try{await saveDoc("teacher_attendance",{name:val("teacherAttendanceName"),status:val("teacherAttendanceStatus"),reason:val("teacherAttendanceReason"),date:val("teacherAttendanceDate")});show("teacherAttendanceMsg","शिक्षक उपस्थिती save झाली.");}catch(e){show("teacherAttendanceMsg","Error: "+e.message);}};

function noticeMessage(type,data){
 if(type==="homework")return `गृहपाठ\nइयत्ता: ${data.className}\nविषय: ${data.subject}\nगृहपाठ: ${data.text}`;
 if(type==="holiday")return `सुट्टीची सूचना\nकारण: ${data.title}\nदिनांक: ${data.date}\nसूचना: ${data.text}`;
 if(type==="event")return `शैक्षणिक कार्यक्रम\nकार्यक्रम: ${data.title}\nदिनांक: ${data.date}\nमाहिती: ${data.text}`;
 if(type==="sports")return `क्रीडा कार्यक्रम\nकार्यक्रम: ${data.title}\nदिनांक: ${data.date}\nमाहिती: ${data.text}`;
 if(type==="exam")return `परीक्षा सूचना\nपरीक्षा: ${data.title}\nइयत्ता: ${data.className}\nदिनांक: ${data.date}\nसूचना: ${data.text}`;
 if(type==="fee")return `फी सूचना\nविद्यार्थी: ${data.student}\nरक्कम: ${data.amount}\nअंतिम दिनांक: ${data.due}\nसूचना: ${data.text}`;
 if(type==="classwork")return `वर्गात झालेले कार्य\nइयत्ता: ${data.className}\nविषय: ${data.subject}\nकार्य: ${data.text}`;
}

async function saveAndSend(type,data,mobile,msgId){
 try{await saveDoc("notices",{type,...data}); const r=await sendText(mobile,noticeMessage(type,data)); show(msgId,"Save + WhatsApp पाठवला: "+r);}
 catch(e){show(msgId,"Error: "+e.message);}
}
$("sendHomeworkBtn").onclick=()=>saveAndSend("homework",{className:val("homeworkClass"),subject:val("homeworkSubject"),text:val("homeworkText")},val("homeworkMobile"),"homeworkMsg");
$("sendHolidayBtn").onclick=()=>saveAndSend("holiday",{title:val("holidayTitle"),date:val("holidayDate"),text:val("holidayText")},val("holidayMobile"),"holidayMsg");
$("sendEventBtn").onclick=()=>saveAndSend("event",{title:val("eventTitle"),date:val("eventDate"),text:val("eventText")},val("eventMobile"),"eventMsg");
$("sendSportsBtn").onclick=()=>saveAndSend("sports",{title:val("sportsTitle"),date:val("sportsDate"),text:val("sportsText")},val("sportsMobile"),"sportsMsg");
$("sendExamBtn").onclick=()=>saveAndSend("exam",{title:val("examTitle"),className:val("examClass"),date:val("examDate"),text:val("examText")},val("examMobile"),"examMsg");
$("sendFeeBtn").onclick=()=>saveAndSend("fee",{student:val("feeStudent"),amount:val("feeAmount"),due:val("feeDue"),text:val("feeText")},val("feeMobile"),"feeMsg");
$("sendClassworkBtn").onclick=()=>saveAndSend("classwork",{className:val("classworkClass"),subject:val("classworkSubject"),text:val("classworkText")},val("classworkMobile"),"classworkMsg");

function loadApiSettings(){ $("apiToken").value=localStorage.getItem("apiToken")||"30f4848f-ed51-42e0-989c-685204f085a2"; $("deviceId").value=localStorage.getItem("deviceId")||"46081"; $("apiBase").value=localStorage.getItem("apiBase")||"https://whatsbot.tech/api"; }
$("saveApiSettings").onclick=()=>{localStorage.setItem("apiToken",val("apiToken"));localStorage.setItem("deviceId",val("deviceId"));localStorage.setItem("apiBase",val("apiBase"));show("apiSettingsMsg","API settings save झाले.");};
$("sendApiText").onclick=async()=>{try{show("apiTextMsg",await sendText(val("apiMobile"),val("apiMessage")));}catch(e){show("apiTextMsg","Error: "+e.message);}};
$("sendMediaBtn").onclick=async()=>{try{show("mediaMsg",await sendMedia(val("mediaType"),val("mediaMobile"),val("mediaUrl"),val("mediaCaption")));}catch(e){show("mediaMsg","Error: "+e.message);}};

$("saveStudyLink").onclick=async()=>{try{await saveDoc("study_links",{className:val("studyClass"),subject:val("studySubject"),title:val("studyTitle"),url:val("studyUrl")});show("studyMsg","Study link save झाली.");}catch(e){show("studyMsg","Error: "+e.message);}};

$("downloadStudentTemplate").onclick=()=>{downloadCsv("student_template.csv",[["name","dob","aadhaar","className","section","rollNo","parentMobile1","parentMobile2","parentMobile3","address"]]);};
$("uploadStudentCsv").onclick=async()=>{const f=$("studentCsvFile").files[0];if(!f)return show("csvMsg","CSV file निवडा.");const text=await f.text();const lines=text.trim().split(/\r?\n/);const headers=lines.shift().split(",").map(h=>h.trim());let count=0;for(const line of lines){const vals=line.split(",");const o={};headers.forEach((h,i)=>o[h]=vals[i]||"");await saveDoc("students",o);count++;}show("csvMsg",`${count} विद्यार्थी upload झाले.`);};

async function loadCollection(col, head){
 const snap=await getDocs(query(collection(db,col),limit(200))); currentRows=[]; $("reportHead").innerHTML="<tr>"+head.map(h=>`<th>${h}</th>`).join("")+"</tr>"; $("reportBody").innerHTML="";
 snap.forEach(d=>{const r=d.data();currentRows.push(r);$("reportBody").innerHTML += "<tr>"+head.map(h=>`<td>${r[h]||""}</td>`).join("")+"</tr>";});
}
$("loadStudentsBtn").onclick=()=>loadCollection("students",["name","className","section","rollNo","parentMobile1"]);
$("loadAttendanceBtn").onclick=()=>loadCollection("attendance",["date","type","name","className","status","reason"]);
$("loadNoticesBtn").onclick=()=>loadCollection("notices",["type","title","className","subject","date","text"]);
$("exportCsvBtn").onclick=()=>downloadCsv("report.csv",[Object.keys(currentRows[0]||{}),...currentRows.map(r=>Object.values(r).map(v=> typeof v==="object"?"":v))]);

function downloadCsv(name, rows){const csv=rows.map(r=>r.map(x=>`"${String(x||"").replaceAll('"','""')}"`).join(",")).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download=name;a.click();}
