import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, query, limit, where } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app=initializeApp(firebaseConfig), auth=getAuth(app), db=getFirestore(app);
let currentRows=[];
const SCHOOL="स्व. गुरबक्षसिंग साबरवाल माध्यमिक व उच्च माध्यमिक विद्यालय, नायगाव (भिकापूर)";
const $=id=>document.getElementById(id);
const val=id=>($(id)?.value||"").trim();
const show=(id,m)=>{const e=$(id); if(e)e.textContent=m;};
const on=(id,ev,fn)=>{const e=$(id); if(e)e.addEventListener(ev,fn);}; // missing id असला तरी menu बंद पडणार नाही
const today=()=>new Date().toISOString().slice(0,10);

window.addEventListener("DOMContentLoaded",()=>{
  ["attDate","hwDate","holidayDate","eduDate","sportsDate","examDate","teacherAttDate"].forEach(id=>{if($(id)&&!$(id).value)$(id).value=today()});
  initMenus();
  attachEvents();
});

function initMenus(){
  document.querySelectorAll(".nav-btn").forEach(b=>b.addEventListener("click",()=>{
    document.querySelectorAll(".nav-btn").forEach(x=>x.classList.remove("active"));
    document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
    b.classList.add("active");
    const page=$(b.dataset.page);
    if(page) page.classList.add("active");
    window.scrollTo({top:0,behavior:"smooth"});
  }));
}

const mob91=m=>{m=(m||"").replace(/\D/g,"");return m.length===10?"91"+m:m};
async function saveDoc(col,data){return addDoc(collection(db,col),{...data,createdAt:serverTimestamp(),createdBy:auth.currentUser?.email||""})}
function settings(){return{base:localStorage.getItem("apiBase")||"https://whatsbot.tech/api",token:localStorage.getItem("apiToken")||"30f4848f-ed51-42e0-989c-685204f085a2",deviceId:localStorage.getItem("deviceId")||"46081"}}
async function api(endpoint,params){const s=settings();params.api_token=s.token;if(s.deviceId)params.device_id=s.deviceId;const url=`${s.base}/${endpoint}?`+new URLSearchParams(params);const res=await fetch(url);const text=await res.text();await saveDoc("whatsbot_logs",{endpoint,params,response:text});return text}
async function sendText(mobile,message){mobile=mob91(mobile);if(!/^91\d{10}$/.test(mobile))throw new Error("मोबाईल 91 सहित योग्य द्या");return api("send_sms",{mobile,message})}
async function sendMedia(type,mobile,url,caption=""){mobile=mob91(mobile);if(type==="img")return api("send_img",{mobile,img_url:url,img_caption:caption});if(type==="doc")return api("send_doc",{mobile,doc_url:url});if(type==="video")return api("send_video",{mobile,video_url:url})}

function template(type,o={}){
 const base=`${SCHOOL}\n`;
 const end=`\n- ${o.teacher||"वर्ग शिक्षक"}`;
 if(type==="present")return base+`आदरणीय पालक, आपला विद्यार्थी ${o.student||""} इयत्ता ${o.className||""} दिनांक ${o.date||""} रोजी शाळेत उपस्थित आहे.`+end;
 if(type==="absent")return base+`आदरणीय पालक, आपला विद्यार्थी ${o.student||""} इयत्ता ${o.className||""} दिनांक ${o.date||""} रोजी अनुपस्थित आहे. कृपया अनुपस्थितीचे कारण शाळेला कळवावे.`+end;
 if(type==="halfday")return base+`आपला विद्यार्थी ${o.student||""} इयत्ता ${o.className||""} दिनांक ${o.date||""} रोजी हाफ डे उपस्थित राहिला / रजा घेऊन गेला आहे.`+end;
 if(type==="homework")return base+`इयत्ता: ${o.className||""}\nविषय: ${o.subject||""}\nधडा: ${o.topic||""}\nआज वर्गात शिकवले: ${o.classwork||""}\nगृहपाठ: ${o.homework||""}`+end;
 if(type==="holiday")return base+`सुट्टीची सूचना\nइयत्ता: ${o.className||""}\nदिनांक: ${o.date||""}\nतपशील: ${o.text||""}`+end;
 if(type==="edu")return base+`शैक्षणिक कार्यक्रम सूचना\nइयत्ता: ${o.className||""}\nदिनांक: ${o.date||""}\nतपशील: ${o.text||""}`+end;
 if(type==="sports")return base+`क्रीडा कार्यक्रम सूचना\nइयत्ता: ${o.className||""}\nदिनांक: ${o.date||""}\nतपशील: ${o.text||""}`+end;
 if(type==="exam")return base+`परीक्षा सूचना\nइयत्ता: ${o.className||""}\nदिनांक: ${o.date||""}\nतपशील: ${o.text||""}`+end;
 if(type==="fee")return base+`फी सूचना\nआदरणीय पालक, आपल्या पाल्याची प्रलंबित फी नियोजित वेळेत भरावी.`+end;
 if(type==="ptm")return base+`पालक सभा सूचना\nदिनांक ${o.date||today()} रोजी पालक सभा आयोजित करण्यात आली आहे. कृपया उपस्थित राहावे.`+end;
 return base+(o.text||"")+end;
}

function attachEvents(){
  on("loginBtn","click",async()=>{try{await signInWithEmailAndPassword(auth,val("email"),val("password"));show("loginMsg","")}catch(e){show("loginMsg","Login Error: "+e.message)}});
  on("resetBtn","click",async()=>{try{await sendPasswordResetEmail(auth,val("email"));show("loginMsg","Password reset email पाठवला आहे.")}catch(e){show("loginMsg","Error: "+e.message)}});
  on("logoutBtn","click",()=>signOut(auth));

  on("createUserBtn","click",async()=>{try{await createUserWithEmailAndPassword(auth,val("newUserEmail"),val("newUserPassword"));await saveDoc("users",{email:val("newUserEmail")});show("createUserMsg","User ID तयार झाला: "+val("newUserEmail"))}catch(e){show("createUserMsg","Error: "+e.message)}});

  on("startCamera","click",async()=>{try{const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false});$("cameraPreview").srcObject=stream}catch(e){show("studentMsg","Camera Error: "+e.message)}});
  on("capturePhoto","click",()=>{const v=$("cameraPreview"),c=$("photoCanvas");c.width=v.videoWidth||640;c.height=v.videoHeight||480;c.getContext("2d").drawImage(v,0,0,c.width,c.height);const d=c.toDataURL("image/jpeg",.7);$("photoPreview").src=d;$("studentPhotoUrl").value=d;show("studentMsg","फोटो capture झाला.")});
  on("addStudentBtn","click",addStudent);

  on("loadStudentList","click",loadAttRows);
  on("saveAttendanceAll","click",saveAttendanceAll);
  on("saveTeacherAttendance","click",async()=>{try{await saveDoc("teacher_attendance",{name:val("teacherAttName"),status:val("teacherAttStatus"),date:val("teacherAttDate"),note:val("teacherAttNote")});show("teacherAttMsg","शिक्षक उपस्थिती save झाली.")}catch(e){show("teacherAttMsg","Error: "+e.message)}});

  on("previewHomework","click",()=>show("homeworkPreview",homeworkMessage()));
  on("saveHomework","click",saveHomework);
  on("sendHomeworkWhatsApp","click",async()=>{try{show("homeworkMsg","WhatsApp: "+await sendText(val("homeworkMobile"),homeworkMessage()))}catch(e){show("homeworkMsg","Error: "+e.message)}});

  on("sendHoliday","click",()=>sendNotice("holiday","holidayClass","holidayDate","holidayText","holidayMobile","holidayMsg"));
  on("sendEduEvent","click",()=>sendNotice("edu","eduClass","eduDate","eduText","eduMobile","eduMsg"));
  on("sendSports","click",()=>sendNotice("sports","sportsClass","sportsDate","sportsText","sportsMobile","sportsMsg"));
  on("sendExam","click",()=>sendNotice("exam","examClass","examDate","examText","examMobile","examMsg"));

  on("generateTemplate","click",()=>{$("templateText").value=template(val("templateType"),{student:val("tplStudent")||"विद्यार्थी नाव",className:val("tplClass"),date:today(),teacher:val("tplTeacher")||"वर्ग शिक्षक",subject:"गणित",topic:"धडा",classwork:"आज शिकवलेला भाग",homework:"दिलेला गृहपाठ",text:"सूचना तपशील"});});
  on("copyTemplate","click",()=>{$("templateText").select();document.execCommand("copy")});

  on("saveApiSettings","click",()=>{localStorage.setItem("apiBase",val("apiBase"));localStorage.setItem("apiToken",val("apiToken"));localStorage.setItem("deviceId",val("deviceId"));show("apiSettingsMsg","Settings save झाले.")});
  on("sendManualText","click",async()=>{try{show("manualMsg",await sendText(val("manualMobile"),val("manualText")))}catch(e){show("manualMsg","Error: "+e.message)}});
  on("sendMedia","click",async()=>{try{show("manualMsg",await sendMedia(val("mediaType"),val("manualMobile"),val("mediaUrl"),val("mediaCaption")))}catch(e){show("manualMsg","Error: "+e.message)}});

  on("saveStudyLink","click",async()=>{try{await saveDoc("study_links",{className:val("studyClass"),subject:val("studySubject"),title:val("studyTitle"),url:val("studyUrl")});show("studyMsg","Study link save झाली.")}catch(e){show("studyMsg","Error: "+e.message)}});
  on("downloadStudentTemplate","click",()=>downloadCsv("student_template.csv",[["name","dob","aadhaar","className","section","rollNo","parentMobile1","parentMobile2","parentMobile3","address"],["कु. विद्यार्थी नाव","2012-01-01","123456789012","9वी","A","1","9876543210","","","पत्ता"]]));
  on("uploadStudentCsv","click",uploadCsv);
  on("loadStudentsReport","click",()=>loadCol("students",["name","className","section","rollNo","parentMobile1"]));
  on("loadAttendanceReport","click",()=>loadCol("attendance",["date","name","className","status","time","message"]));
  on("loadHomeworkReport","click",()=>loadCol("homework",["className","date","teacher","subject","topic","classwork","homework"]));
  on("loadNoticeReport","click",()=>loadCol("notices",["type","className","date","text"]));
  on("exportCsvBtn","click",()=>downloadCsv("report.csv",[Object.keys(currentRows[0]||{}),...currentRows.map(r=>Object.values(r).map(v=>typeof v==="object"?"":v))]));
}

onAuthStateChanged(auth,u=>{$("loginCard")?.classList.toggle("hidden",!!u);$("appPanel")?.classList.toggle("hidden",!u);if(u){$("userEmail").textContent=u.email;loadSettings();}});

function loadSettings(){if($("apiBase"))$("apiBase").value=settings().base;if($("apiToken"))$("apiToken").value=settings().token;if($("deviceId"))$("deviceId").value=settings().deviceId}
async function addStudent(){try{await saveDoc("students",{name:val("studentName"),dob:val("studentDob"),aadhaar:val("studentAadhaar"),className:val("studentClass"),section:val("studentSection"),rollNo:val("studentRoll"),fatherName:val("fatherName"),motherName:val("motherName"),parentMobile1:val("parentMobile1"),parentMobile2:val("parentMobile2"),parentMobile3:val("parentMobile3"),address:val("studentAddress"),photoUrl:val("studentPhotoUrl")});show("studentMsg","विद्यार्थी डेटा save झाला.")}catch(e){show("studentMsg","Error: "+e.message)}}

async function loadAttRows(){try{const snap=await getDocs(query(collection(db,"students"),where("className","==",val("attClass")),limit(200)));$("attBody").innerHTML="";let i=1;snap.forEach(d=>{const s=d.data();$("attBody").innerHTML+=`<tr data-mobile="${s.parentMobile1||""}" data-name="${s.name||""}" data-class="${s.className||""}"><td>${s.rollNo||i}</td><td>${s.name||""}</td><td><select class="pa"><option>P</option><option>A</option><option>Half Day</option><option>Leave</option><option>Late</option></select></td><td><input class="time" type="time"></td><td><textarea class="note"></textarea></td><td class="sendStatus">Ready</td></tr>`;i++});document.querySelectorAll(".pa").forEach(sel=>sel.addEventListener("change",autoSendAttendance));show("attMsg","यादी लोड झाली. P/A बदलल्यावर Auto WhatsApp पाठवला जाईल.")}catch(e){show("attMsg","Error: "+e.message)}}
function attMsg(row){const st=row.querySelector(".pa").value;let t=st==="A"?"absent":st==="Half Day"?"halfday":"present";return template(t,{student:row.dataset.name,className:val("attClass"),date:val("attDate")})+"\n"+row.querySelector(".note").value}
async function autoSendAttendance(e){const row=e.target.closest("tr");row.querySelector(".sendStatus").textContent="Sending...";try{await saveDoc("attendance",{name:row.dataset.name,className:val("attClass"),date:val("attDate"),status:row.querySelector(".pa").value,time:row.querySelector(".time").value,message:row.querySelector(".note").value,parentMobile:row.dataset.mobile});if(val("autoSend")==="yes"){const r=await sendText(row.dataset.mobile,attMsg(row));row.querySelector(".sendStatus").textContent="Sent";show("attMsg","Auto WhatsApp पाठवला: "+r)}else{row.querySelector(".sendStatus").textContent="Saved"}}catch(err){row.querySelector(".sendStatus").textContent="Error";show("attMsg","Error: "+err.message)}}
async function saveAttendanceAll(){try{for(const row of document.querySelectorAll("#attBody tr"))await saveDoc("attendance",{name:row.dataset.name,className:val("attClass"),date:val("attDate"),status:row.querySelector(".pa").value,time:row.querySelector(".time").value,message:row.querySelector(".note").value,parentMobile:row.dataset.mobile});show("attMsg","Attendance save झाली.")}catch(e){show("attMsg","Error: "+e.message)}}

function homeworkMessage(){return template("homework",{className:val("hwClass"),date:val("hwDate"),teacher:val("hwTeacher"),subject:val("hwSubject"),topic:val("hwTopic"),classwork:val("classworkDone"),homework:val("homeworkGiven")})}
async function saveHomework(){try{await saveDoc("homework",{className:val("hwClass"),date:val("hwDate"),teacher:val("hwTeacher"),subject:val("hwSubject"),topic:val("hwTopic"),classwork:val("classworkDone"),homework:val("homeworkGiven")});show("homeworkMsg","Homework save झाला.")}catch(e){show("homeworkMsg","Error: "+e.message)}}
async function sendNotice(type,clsId,dateId,textId,mobId,msgId){try{const data={type,className:val(clsId),date:val(dateId),text:val(textId)};await saveDoc("notices",data);show(msgId,"WhatsApp: "+await sendText(val(mobId),template(type,data)))}catch(e){show(msgId,"Error: "+e.message)}}
async function uploadCsv(){const f=$("studentCsvFile").files[0];if(!f)return show("csvMsg","CSV निवडा");const text=await f.text();const rows=text.trim().split(/\\r?\\n/);const head=rows.shift().split(",").map(x=>x.replace(/^\"|\"$/g,"").trim());let c=0;for(const line of rows){const vals=line.split(",").map(x=>x.replace(/^\"|\"$/g,""));const o={};head.forEach((h,i)=>o[h]=vals[i]||"");await saveDoc("students",o);c++}show("csvMsg",c+" विद्यार्थी upload झाले.")}
async function loadCol(col,keys){const snap=await getDocs(query(collection(db,col),limit(200)));currentRows=[];$("reportHead").innerHTML="<tr>"+keys.map(k=>`<th>${k}</th>`).join("")+"</tr>";$("reportBody").innerHTML="";snap.forEach(d=>{const r=d.data();currentRows.push(r);$("reportBody").innerHTML+="<tr>"+keys.map(k=>`<td>${r[k]||""}</td>`).join("")+"</tr>"})}
function downloadCsv(name,rows){const csv=rows.map(r=>r.map(x=>`"${String(x||"").replaceAll('"','""')}"`).join(",")).join("\\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\\ufeff"+csv],{type:"text/csv;charset=utf-8"}));a.download=name;document.body.appendChild(a);a.click();a.remove()}
