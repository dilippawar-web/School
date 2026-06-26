import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, query, limit, where } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app=initializeApp(firebaseConfig), auth=getAuth(app), db=getFirestore(app);
let currentRows=[], cameraStream=null;
const SCHOOL="स्व. गुरुबक्षसिंग साबरवार माध्यमिक व उच्च माध्यमिक विद्यालय, नायगाव (भिकापूर)";
const $=id=>document.getElementById(id), val=id=>($(id)?.value||"").trim(), show=(id,m)=>{const e=$(id);if(e)e.textContent=m};
const today=()=>new Date().toISOString().slice(0,10);
setTimeout(()=>["attDate","hwDate","holidayDate","eduDate","sportsDate","examDate","feeDate","teacherAttDate"].forEach(id=>{if($(id)&&!$(id).value)$(id).value=today()}),50);

const mob91=m=>{m=(m||"").replace(/\D/g,"");return m.length===10?"91"+m:m};
async function saveDoc(col,data){return addDoc(collection(db,col),{...data,createdAt:serverTimestamp(),createdBy:auth.currentUser?.email||""})}
const template=(type,o={})=>{
 const base=`${SCHOOL}\n`;
 const end=`\n- ${o.teacher||"वर्ग शिक्षक"}`;
 if(type==="homework")return base+`इयत्ता: ${o.className}\nविषय: ${o.subject}\nधडा: ${o.topic}\nआज वर्गात शिकवले: ${o.classwork}\nगृहपाठ: ${o.homework}`+end;
 if(type==="holiday")return base+`सुट्टीची सूचना\nइयत्ता: ${o.className}\nदिनांक: ${o.date}\nतपशील: ${o.text}`+end;
 if(type==="edu")return base+`शैक्षणिक कार्यक्रम\nइयत्ता: ${o.className}\nदिनांक: ${o.date}\nतपशील: ${o.text}`+end;
 if(type==="sports")return base+`क्रीडा कार्यक्रम\nइयत्ता: ${o.className}\nदिनांक: ${o.date}\nतपशील: ${o.text}`+end;
 if(type==="exam")return base+`परीक्षा सूचना\nइयत्ता: ${o.className}\nदिनांक: ${o.date}\nतपशील: ${o.text}`+end;
 if(type==="fee")return base+`फी सूचना\nइयत्ता: ${o.className}\nदिनांक: ${o.date}\nतपशील: ${o.text}`+end;
 if(type==="absent")return base+`आदरणीय पालक, आपला विद्यार्थी ${o.student} इयत्ता ${o.className} आज दिनांक ${o.date} रोजी अनुपस्थित आहे.`+end;
 return base+`आदरणीय पालक, आपला विद्यार्थी ${o.student} इयत्ता ${o.className} आज दिनांक ${o.date} रोजी उपस्थित आहे.`+end;
}
function settings(){return{base:localStorage.getItem("apiBase")||"https://whatsbot.tech/api",token:localStorage.getItem("apiToken")||"30f4848f-ed51-42e0-989c-685204f085a2",deviceId:localStorage.getItem("deviceId")||"46081"}}
async function api(endpoint,params){const s=settings();params.api_token=s.token;if(s.deviceId)params.device_id=s.deviceId;const url=`${s.base}/${endpoint}?`+new URLSearchParams(params);const res=await fetch(url);const text=await res.text();await saveDoc("whatsbot_logs",{endpoint,params,response:text});return text}
async function sendText(mobile,message){mobile=mob91(mobile);if(!/^91\d{10}$/.test(mobile))throw new Error("मोबाईल 91 सहित योग्य द्या");return api("send_sms",{mobile,message})}
async function sendMedia(type,mobile,url,caption=""){mobile=mob91(mobile);if(type==="img")return api("send_img",{mobile,img_url:url,img_caption:caption});if(type==="doc")return api("send_doc",{mobile,doc_url:url});if(type==="video")return api("send_video",{mobile,video_url:url})}

$("loginBtn").onclick=async()=>{try{await signInWithEmailAndPassword(auth,val("email"),val("password"));show("loginMsg","")}catch(e){show("loginMsg","Login Error: "+e.message)}};
$("resetBtn").onclick=async()=>{try{await sendPasswordResetEmail(auth,val("email"));show("loginMsg","Password reset email पाठवला आहे.")}catch(e){show("loginMsg","Error: "+e.message)}};
$("logoutBtn").onclick=()=>signOut(auth);
onAuthStateChanged(auth,u=>{$("loginCard").classList.toggle("hidden",!!u);$("appPanel").classList.toggle("hidden",!u);if(u){$("userEmail").textContent=u.email;loadSettings();loadLogo();}});
document.querySelectorAll(".acc").forEach(b=>b.onclick=()=>{document.querySelectorAll(".acc").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".acc-panel").forEach(p=>p.classList.remove("open"));b.classList.add("active");$(b.dataset.target).classList.add("open")});

$("addClassBtn").onclick=async()=>{try{await saveDoc("classes",{className:val("classNameInput"),classTeacher:val("classTeacherInput"),specialTeacher:val("specialTeacherInput"),groupMobile:val("classGroupMobile")});show("classMsg","वर्ग save झाला.")}catch(e){show("classMsg","Error: "+e.message)}};
document.querySelectorAll(".quickClass").forEach(b=>b.onclick=()=>{["studentClass","attClass","hwClass"].forEach(id=>{$(id).value=b.dataset.class});show("classMsg",b.dataset.class+" निवडले.")});
$("schoolLogoFile").onchange=async e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{$("schoolLogoUrl").value=r.result;$("schoolLogoPreview").src=r.result;$("schoolLogoPreview").style.display="block";$("logoText").style.display="none"};r.readAsDataURL(f)};
$("saveLogoBtn").onclick=()=>{localStorage.setItem("schoolLogo",val("schoolLogoUrl"));loadLogo();show("logoMsg","Logo save झाला.")};
function loadLogo(){const logo=localStorage.getItem("schoolLogo");if(logo){$("schoolLogoPreview").src=logo;$("schoolLogoPreview").style.display="block";$("logoText").style.display="none"}}

$("startCamera").onclick=async()=>{try{cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false});$("cameraPreview").srcObject=cameraStream}catch(e){show("studentMsg","Camera Error: "+e.message)}};
$("capturePhoto").onclick=()=>{const v=$("cameraPreview"),c=$("photoCanvas");c.width=v.videoWidth||640;c.height=v.videoHeight||480;c.getContext("2d").drawImage(v,0,0,c.width,c.height);const d=c.toDataURL("image/jpeg",.7);$("photoPreview").src=d;$("studentPhotoUrl").value=d;show("studentMsg","फोटो capture झाला.")};
$("addStudentBtn").onclick=async()=>{try{await saveDoc("students",{name:val("studentName"),dob:val("studentDob"),aadhaar:val("studentAadhaar"),className:val("studentClass"),section:val("studentSection"),rollNo:val("studentRoll"),fatherName:val("fatherName"),motherName:val("motherName"),parentMobile1:val("parentMobile1"),parentMobile2:val("parentMobile2"),parentMobile3:val("parentMobile3"),address:val("studentAddress"),photoUrl:val("studentPhotoUrl")});show("studentMsg","विद्यार्थी डेटा save झाला.")}catch(e){show("studentMsg","Error: "+e.message)}};

$("loadStudentList").onclick=loadAttRows;
async function loadAttRows(){const snap=await getDocs(query(collection(db,"students"),where("className","==",val("attClass")),limit(200)));$("attBody").innerHTML="";let i=1;snap.forEach(d=>{const s=d.data();$("attBody").innerHTML+=`<tr data-mobile="${s.parentMobile1||""}" data-name="${s.name||""}" data-class="${s.className||""}"><td>${s.rollNo||i}</td><td>${s.name||""}</td><td><select><option>P</option><option>A</option><option>Half Day</option><option>Leave</option><option>Late</option></select></td><td><input type="time"></td><td><textarea></textarea></td><td><button class="wa">Open</button></td><td><button class="sms">SMS</button></td></tr>`;i++});document.querySelectorAll(".wa,.sms").forEach(b=>b.onclick=sendRowMsg)}
function attMsg(row){const st=row.querySelector("select").value;const msgType=st==="A"?"absent":"present";return template(msgType,{student:row.dataset.name,className:val("attClass"),date:val("attDate")})+"\n"+row.querySelector("textarea").value}
async function sendRowMsg(e){const row=e.target.closest("tr");try{show("attMsg","Message पाठवला: "+await sendText(row.dataset.mobile,attMsg(row)))}catch(err){show("attMsg","Error: "+err.message)}}
$("saveAttendanceAll").onclick=async()=>{try{for(const row of document.querySelectorAll("#attBody tr"))await saveDoc("attendance",{name:row.dataset.name,className:val("attClass"),date:val("attDate"),status:row.querySelector("select").value,time:row.querySelector("input").value,message:row.querySelector("textarea").value,parentMobile:row.dataset.mobile});show("attMsg","Attendance save झाली.")}catch(e){show("attMsg","Error: "+e.message)}};
$("saveTeacherAttendance").onclick=async()=>{try{await saveDoc("teacher_attendance",{name:val("teacherAttName"),status:val("teacherAttStatus"),date:val("teacherAttDate"),note:val("teacherAttNote")});show("teacherAttMsg","शिक्षक उपस्थिती save झाली.")}catch(e){show("teacherAttMsg","Error: "+e.message)}};

function homeworkMessage(){return template("homework",{className:val("hwClass"),date:val("hwDate"),teacher:val("hwTeacher"),subject:val("hwSubject"),topic:val("hwTopic"),classwork:val("classworkDone"),homework:val("homeworkGiven")})}
$("previewHomework").onclick=()=>show("homeworkPreview",homeworkMessage());
$("saveHomework").onclick=async()=>{try{await saveDoc("homework",{className:val("hwClass"),date:val("hwDate"),teacher:val("hwTeacher"),subject:val("hwSubject"),topic:val("hwTopic"),classwork:val("classworkDone"),homework:val("homeworkGiven")});show("homeworkMsg","Homework save झाला.")}catch(e){show("homeworkMsg","Error: "+e.message)}};
$("sendHomeworkWhatsApp").onclick=async()=>{try{show("homeworkMsg","WhatsApp: "+await sendText(val("homeworkMobile"),homeworkMessage()))}catch(e){show("homeworkMsg","Error: "+e.message)}};

async function sendNotice(type,clsId,dateId,textId,mobId,msgId){try{const data={type,className:val(clsId),date:val(dateId),text:val(textId)};await saveDoc("notices",data);show(msgId,"WhatsApp: "+await sendText(val(mobId),template(type,data)))}catch(e){show(msgId,"Error: "+e.message)}}
$("sendHoliday").onclick=()=>sendNotice("holiday","holidayClass","holidayDate","holidayText","holidayMobile","holidayMsg");
$("sendEduEvent").onclick=()=>sendNotice("edu","eduClass","eduDate","eduText","eduMobile","eduMsg");
$("sendSports").onclick=()=>sendNotice("sports","sportsClass","sportsDate","sportsText","sportsMobile","sportsMsg");
$("sendExam").onclick=()=>sendNotice("exam","examClass","examDate","examText","examMobile","examMsg");
$("sendFee").onclick=()=>sendNotice("fee","feeClass","feeDate","feeText","feeMobile","feeMsg");

function loadSettings(){$("apiBase").value=settings().base;$("apiToken").value=settings().token;$("deviceId").value=settings().deviceId}
$("saveApiSettings").onclick=()=>{localStorage.setItem("apiBase",val("apiBase"));localStorage.setItem("apiToken",val("apiToken"));localStorage.setItem("deviceId",val("deviceId"));show("apiSettingsMsg","Settings save झाले.")};
$("sendManualText").onclick=async()=>{try{show("manualMsg",await sendText(val("manualMobile"),val("manualText")))}catch(e){show("manualMsg","Error: "+e.message)}};
$("sendMedia").onclick=async()=>{try{show("manualMsg",await sendMedia(val("mediaType"),val("manualMobile"),val("mediaUrl"),val("mediaCaption")))}catch(e){show("manualMsg","Error: "+e.message)}};
$("saveStudyLink").onclick=async()=>{try{await saveDoc("study_links",{className:val("studyClass"),subject:val("studySubject"),title:val("studyTitle"),url:val("studyUrl")});show("studyMsg","Study link save झाली.")}catch(e){show("studyMsg","Error: "+e.message)}};
$("downloadStudentTemplate").onclick=()=>downloadCsv("student_template.csv",[["name","dob","aadhaar","className","section","rollNo","parentMobile1","parentMobile2","parentMobile3","address"]]);
$("uploadStudentCsv").onclick=async()=>{const f=$("studentCsvFile").files[0];if(!f)return show("csvMsg","CSV निवडा");const text=await f.text();const rows=text.trim().split(/\\r?\\n/);const head=rows.shift().split(",");let c=0;for(const line of rows){const vals=line.split(","),o={};head.forEach((h,i)=>o[h]=vals[i]||"");await saveDoc("students",o);c++}show("csvMsg",c+" विद्यार्थी upload झाले.")};

async function loadCol(col,keys){const snap=await getDocs(query(collection(db,col),limit(200)));currentRows=[];$("reportHead").innerHTML="<tr>"+keys.map(k=>`<th>${k}</th>`).join("")+"</tr>";$("reportBody").innerHTML="";snap.forEach(d=>{const r=d.data();currentRows.push(r);$("reportBody").innerHTML+="<tr>"+keys.map(k=>`<td>${r[k]||""}</td>`).join("")+"</tr>"})}
$("loadStudentsReport").onclick=()=>loadCol("students",["name","className","section","rollNo","parentMobile1"]);
$("loadAttendanceReport").onclick=()=>loadCol("attendance",["date","name","className","status","time","message"]);
$("loadHomeworkReport").onclick=()=>loadCol("homework",["className","date","teacher","subject","topic","classwork","homework"]);
$("loadNoticeReport").onclick=()=>loadCol("notices",["type","className","date","text"]);
$("exportCsvBtn").onclick=()=>downloadCsv("report.csv",[Object.keys(currentRows[0]||{}),...currentRows.map(r=>Object.values(r).map(v=>typeof v==="object"?"":v))]);
function downloadCsv(name,rows){const csv=rows.map(r=>r.map(x=>`"${String(x||"").replaceAll('"','""')}"`).join(",")).join("\\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download=name;a.click()}
