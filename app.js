import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, query, limit } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app=initializeApp(firebaseConfig), auth=getAuth(app), db=getFirestore(app);
let currentRows=[], cameraStream=null;
const SCHOOL="स्व. गुरुबक्षसिंग साबरवार माध्यमिक व उच्च माध्यमिक विद्यालय, नायगाव (भिकापूर)";
const $=id=>document.getElementById(id), val=id=>($(id)?.value||"").trim(), show=(id,m)=>{const e=$(id);if(e)e.textContent=m};
const today=()=>new Date().toISOString().slice(0,10);
setTimeout(()=>["attDate","mathDate","noticeDate","teacherAttDate"].forEach(id=>{if($(id)&&!$(id).value)$(id).value=today()}),50);
const mob91=m=>{m=(m||"").replace(/\D/g,"");return m.length===10?"91"+m:m};
async function saveDoc(col,data){return addDoc(collection(db,col),{...data,createdAt:serverTimestamp(),createdBy:auth.currentUser?.email||""})}

const TEMPLATES={
attendance_present:`{school}\nआदरणीय पालक, आपला विद्यार्थी {student} इयत्ता {class} आज दिनांक {date} रोजी शाळेत उपस्थित आहे.\n- {teacher}`,
attendance_absent:`{school}\nआदरणीय पालक, आपला विद्यार्थी {student} इयत्ता {class} आज दिनांक {date} रोजी अनुपस्थित आहे. कृपया कारण शाळेला कळवावे.\n- {teacher}`,
half_day:`{school}\nआपला विद्यार्थी {student} इयत्ता {class} आज दिनांक {date} रोजी हाफ डे उपस्थित राहिला / रजा घेऊन गेला आहे.\n- {teacher}`,
holiday:`{school}\nसुट्टीची सूचना: दिनांक {date} रोजी शाळेला सुट्टी राहील. कृपया नोंद घ्यावी.\n- {teacher}`,
exam:`{school}\nपरीक्षा सूचना: इयत्ता {class} साठी {date} रोजी परीक्षा/चाचणी आयोजित आहे. विद्यार्थ्यांनी तयारी करून यावे.\n- {teacher}`,
ptm:`{school}\nपालक सभा सूचना: दिनांक {date}, वेळ {time} रोजी पालक सभा आयोजित आहे. सर्व पालकांनी उपस्थित राहावे.\n- {teacher}`,
sports:`{school}\nक्रीडा कार्यक्रम सूचना: दिनांक {date} रोजी क्रीडा कार्यक्रम आयोजित आहे. विद्यार्थ्यांनी आवश्यक साहित्यासह उपस्थित राहावे.\n- {teacher}`,
education_event:`{school}\nशैक्षणिक कार्यक्रम: दिनांक {date} रोजी शैक्षणिक कार्यक्रम आयोजित आहे. विद्यार्थ्यांनी वेळेवर उपस्थित राहावे.\n- {teacher}`,
homework:`{school}\nगृहपाठ: इयत्ता {class}, विषय/धडा {topic}. दिलेला गृहपाठ पूर्ण करून आणावा.\n- {teacher}`,
fee:`{school}\nफी सूचना: कृपया प्रलंबित फी नियोजित वेळेत भरावी. अधिक माहितीसाठी कार्यालयाशी संपर्क साधावा.\n- {teacher}`
};
function fillTemplate(t, obj){return (TEMPLATES[t]||"").replaceAll("{school}",SCHOOL).replaceAll("{student}",obj.student||"").replaceAll("{class}",obj.className||"").replaceAll("{date}",obj.date||"").replaceAll("{time}",obj.time||"").replaceAll("{teacher}",obj.teacher||"वर्ग शिक्षक").replaceAll("{topic}",obj.topic||"");}

function settings(){return{base:localStorage.getItem("apiBase")||"https://whatsbot.tech/api",token:localStorage.getItem("apiToken")||"30f4848f-ed51-42e0-989c-685204f085a2",deviceId:localStorage.getItem("deviceId")||"46081"}}
async function api(endpoint,params){const s=settings();params.api_token=s.token;if(s.deviceId)params.device_id=s.deviceId;const url=`${s.base}/${endpoint}?`+new URLSearchParams(params);const res=await fetch(url);const text=await res.text();await saveDoc("whatsbot_logs",{endpoint,params,response:text});return text}
async function sendText(mobile,message){mobile=mob91(mobile);if(!/^91\d{10}$/.test(mobile))throw new Error("मोबाईल 91 सहित योग्य द्या");return api("send_sms",{mobile,message})}
async function sendMedia(type,mobile,url,caption=""){mobile=mob91(mobile);if(type==="img")return api("send_img",{mobile,img_url:url,img_caption:caption});if(type==="doc")return api("send_doc",{mobile,doc_url:url});if(type==="video")return api("send_video",{mobile,video_url:url})}

$("loginBtn").onclick=async()=>{try{await signInWithEmailAndPassword(auth,val("email"),val("password"));show("loginMsg","")}catch(e){show("loginMsg","Login Error: "+e.message)}};
$("resetBtn").onclick=async()=>{try{await sendPasswordResetEmail(auth,val("email"));show("loginMsg","Password reset email पाठवला आहे.")}catch(e){show("loginMsg","Error: "+e.message)}};
$("logoutBtn").onclick=()=>signOut(auth);
onAuthStateChanged(auth,u=>{$("loginCard").classList.toggle("hidden",!!u);$("appPanel").classList.toggle("hidden",!u);if(u){$("userEmail").textContent=u.email;loadSettings();}});
document.querySelectorAll(".nav button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav button").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));b.classList.add("active");$(b.dataset.tab).classList.add("active")});

$("startCamera").onclick=async()=>{try{cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false});$("cameraPreview").srcObject=cameraStream}catch(e){show("studentMsg","Camera Error: "+e.message)}};
$("capturePhoto").onclick=()=>{const v=$("cameraPreview"),c=$("photoCanvas");c.width=v.videoWidth||640;c.height=v.videoHeight||480;c.getContext("2d").drawImage(v,0,0,c.width,c.height);const d=c.toDataURL("image/jpeg",.72);$("photoPreview").src=d;$("studentPhotoUrl").value=d;show("studentMsg","फोटो capture झाला.")};

$("addStudentBtn").onclick=async()=>{try{await saveDoc("students",{name:val("studentName"),dob:val("studentDob"),aadhaar:val("studentAadhaar"),className:val("studentClass"),section:val("studentSection"),rollNo:val("studentRoll"),address:val("studentAddress"),fatherName:val("fatherName"),motherName:val("motherName"),parentMobile1:val("parentMobile1"),parentMobile2:val("parentMobile2"),parentMobile3:val("parentMobile3"),photoUrl:val("studentPhotoUrl")});show("studentMsg","विद्यार्थी डेटा cloud मध्ये save झाला.")}catch(e){show("studentMsg","Error: "+e.message)}};

$("loadStudentList").onclick=loadAttRows;
async function loadAttRows(){const snap=await getDocs(query(collection(db,"students"),limit(200)));$("attBody").innerHTML="";let i=1;snap.forEach(d=>{const s=d.data();$("attBody").innerHTML+=`<tr data-mobile="${s.parentMobile1||""}" data-name="${s.name||""}" data-class="${s.className||""}"><td>${s.rollNo||i}</td><td>${s.name||""}</td><td><select><option>P</option><option>A</option><option>Half Day</option><option>Leave</option><option>Late</option><option>Early Leave</option></select></td><td><input type="time"></td><td><textarea></textarea></td><td><button class="wa">Open</button></td><td><button class="sms">SMS</button></td></tr>`;i++});document.querySelectorAll(".wa,.sms").forEach(b=>b.onclick=sendRowMsg)}
function attMsg(row){const st=row.querySelector("select").value;let key=st==="A"?"attendance_absent":st==="Half Day"?"half_day":"attendance_present";return fillTemplate(key,{student:row.dataset.name,className:$("attClass").value,date:$("attDate").value,time:row.querySelector("input").value,teacher:"वर्ग शिक्षक"})+"\n"+row.querySelector("textarea").value;}
async function sendRowMsg(e){const row=e.target.closest("tr");try{const r=await sendText(row.dataset.mobile,attMsg(row));show("attMsg","Message पाठवला: "+r)}catch(err){show("attMsg","Error: "+err.message)}}
$("saveAttendanceAll").onclick=async()=>{try{for(const row of document.querySelectorAll("#attBody tr"))await saveDoc("attendance",{type:"student",name:row.dataset.name,className:$("attClass").value,date:$("attDate").value,status:row.querySelector("select").value,time:row.querySelector("input").value,message:row.querySelector("textarea").value,parentMobile:row.dataset.mobile});show("attMsg","सर्व Attendance save झाली.")}catch(e){show("attMsg","Error: "+e.message)}};
$("saveTeacherAttendance").onclick=async()=>{try{await saveDoc("teacher_attendance",{name:val("teacherAttName"),status:val("teacherAttStatus"),date:val("teacherAttDate"),note:val("teacherAttNote")});show("teacherAttMsg","शिक्षक उपस्थिती save झाली.")}catch(e){show("teacherAttMsg","Error: "+e.message)}};

function mathMessage(){return fillTemplate("homework",{className:val("mathClass"),date:val("mathDate"),teacher:val("mathTeacherName"),topic:val("mathTopic")})+`\nवर्गात झालेले कार्य: ${val("classworkDone")}\nगृहपाठ: ${val("mathHomework")}`;}
$("previewMathMsg").onclick=()=>show("mathPreview",mathMessage());
$("saveMathWork").onclick=async()=>{try{await saveDoc("math_homework",{className:val("mathClass"),date:val("mathDate"),teacher:val("mathTeacherName"),topic:val("mathTopic"),classwork:val("classworkDone"),homework:val("mathHomework")});show("mathMsg","Save झाले.")}catch(e){show("mathMsg","Error: "+e.message)}};
$("sendMathWhatsapp").onclick=async()=>{try{show("mathMsg","WhatsApp: "+await sendText(val("mathMobile"),mathMessage()))}catch(e){show("mathMsg","Error: "+e.message)}};

function noticeMessage(){const map={"पालक सभा":"ptm","सुट्टीची सूचना":"holiday","परीक्षा सूचना":"exam","शैक्षणिक कार्यक्रम":"education_event","क्रीडा कार्यक्रम":"sports","फी सूचना":"fee"};let base=fillTemplate(map[val("noticeType")]||"ptm",{className:val("noticeClass"),date:val("noticeDate"),time:val("noticeTime"),teacher:val("noticeTeacherName")});return base+`\nतपशील: ${val("noticeDetail")}`;}
$("templateApplyBtn").onclick=()=>{$("noticeDetail").value=noticeMessage();};
$("previewNotice").onclick=()=>show("noticePreview",noticeMessage());
$("saveNotice").onclick=async()=>{try{await saveDoc("notices",{className:val("noticeClass"),teacher:val("noticeTeacherName"),type:val("noticeType"),date:val("noticeDate"),time:val("noticeTime"),detail:val("noticeDetail")});show("noticeMsg","सूचना save झाली.")}catch(e){show("noticeMsg","Error: "+e.message)}};
$("sendNoticeWhatsapp").onclick=async()=>{try{show("noticeMsg","WhatsApp: "+await sendText(val("noticeMobile"),noticeMessage()))}catch(e){show("noticeMsg","Error: "+e.message)}};
$("classWiseLinks").onclick=()=>show("noticeMsg",`WhatsApp link:\nhttps://wa.me/?text=${encodeURIComponent(noticeMessage())}`);

$("copyTemplateBtn").onclick=()=>{const key=val("templateSelect");$("templateText").value=fillTemplate(key,{student:"विद्यार्थी नाव",className:"9वी",date:today(),time:"10:00",teacher:"वर्ग शिक्षक",topic:"धडा"});$("templateText").select();document.execCommand("copy");};

function loadSettings(){$("apiBase").value=settings().base;$("apiToken").value=settings().token;$("deviceId").value=settings().deviceId;$("officerNumbers").value=localStorage.getItem("officerNumbers")||""}
$("saveApiSettings").onclick=()=>{localStorage.setItem("apiBase",val("apiBase"));localStorage.setItem("apiToken",val("apiToken"));localStorage.setItem("deviceId",val("deviceId"));show("apiSettingsMsg","Settings save झाले.")};
$("saveOfficerNumbers").onclick=()=>{localStorage.setItem("officerNumbers",val("officerNumbers"));show("officerMsg","Officer numbers save झाले.")};
$("sendManualText").onclick=async()=>{try{show("manualMsg",await sendText(val("manualMobile"),val("manualText")))}catch(e){show("manualMsg","Error: "+e.message)}};
$("sendMedia").onclick=async()=>{try{show("manualMsg",await sendMedia(val("mediaType"),val("manualMobile"),val("mediaUrl"),val("mediaCaption")))}catch(e){show("manualMsg","Error: "+e.message)}};

$("saveStudyLink").onclick=async()=>{try{await saveDoc("study_links",{className:val("studyClass"),subject:val("studySubject"),title:val("studyTitle"),url:val("studyUrl")});show("studyMsg","Study link save झाली.")}catch(e){show("studyMsg","Error: "+e.message)}};
$("downloadStudentTemplate").onclick=()=>downloadCsv("student_template.csv",[["name","dob","aadhaar","className","section","rollNo","parentMobile1","parentMobile2","parentMobile3","address"]]);
$("uploadStudentCsv").onclick=async()=>{const f=$("studentCsvFile").files[0];if(!f)return show("csvMsg","CSV निवडा");const text=await f.text();const rows=text.trim().split(/\\r?\\n/);const head=rows.shift().split(",");let c=0;for(const line of rows){const vals=line.split(","),o={};head.forEach((h,i)=>o[h]=vals[i]||"");await saveDoc("students",o);c++}show("csvMsg",c+" विद्यार्थी upload झाले.")};

async function loadCol(col,keys){const snap=await getDocs(query(collection(db,col),limit(200)));currentRows=[];$("reportHead").innerHTML="<tr>"+keys.map(k=>`<th>${k}</th>`).join("")+"</tr>";$("reportBody").innerHTML="";snap.forEach(d=>{const r=d.data();currentRows.push(r);$("reportBody").innerHTML+="<tr>"+keys.map(k=>`<td>${r[k]||""}</td>`).join("")+"</tr>"})}
$("loadStudentsReport").onclick=()=>loadCol("students",["name","className","section","rollNo","parentMobile1"]);
$("loadAttendanceReport").onclick=()=>loadCol("attendance",["date","name","className","status","time","message"]);
$("loadNoticeReport").onclick=()=>loadCol("notices",["type","className","teacher","date","time","detail"]);
$("loadMathReport").onclick=()=>loadCol("math_homework",["className","date","teacher","topic","classwork","homework"]);
$("exportCsvBtn").onclick=()=>downloadCsv("report.csv",[Object.keys(currentRows[0]||{}),...currentRows.map(r=>Object.values(r).map(v=>typeof v==="object"?"":v))]);
function downloadCsv(name,rows){const csv=rows.map(r=>r.map(x=>`"${String(x||"").replaceAll('"','""')}"`).join(",")).join("\\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download=name;a.click()}
