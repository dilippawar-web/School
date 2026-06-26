import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let currentRows = [];

const $ = (id) => document.getElementById(id);
const show = (id, msg) => { $(id).textContent = msg; };
const validMobile = (m) => /^\d{10}$/.test(m);

$("loginBtn").onclick = async () => {
  try { await signInWithEmailAndPassword(auth, $("email").value, $("password").value); }
  catch (e) { show("loginMsg", "Login Error: " + e.message); }
};

$("resetBtn").onclick = async () => {
  try { await sendPasswordResetEmail(auth, $("email").value); show("loginMsg", "Password reset email पाठवला आहे."); }
  catch (e) { show("loginMsg", "Error: " + e.message); }
};

$("logoutBtn").onclick = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
  $("loginCard").classList.toggle("hidden", !!user);
  $("appPanel").classList.toggle("hidden", !user);
  if (user) $("userEmail").textContent = user.email;
});

$("addStudentBtn").onclick = async () => {
  const mobile = $("parentMobile").value.trim();
  if (!validMobile(mobile)) return show("studentMsg", "मोबाईल नंबर 10 अंकांचा असावा.");
  await addDoc(collection(db, "students"), {
    name: $("studentName").value.trim(), className: $("studentClass").value.trim(), rollNo: $("studentRoll").value.trim(), parentMobile: mobile, createdAt: serverTimestamp()
  });
  show("studentMsg", "विद्यार्थी डेटा cloud मध्ये save झाला.");
};

$("addTeacherBtn").onclick = async () => {
  const mobile = $("teacherMobile").value.trim();
  if (!validMobile(mobile)) return show("teacherMsg", "मोबाईल नंबर 10 अंकांचा असावा.");
  await addDoc(collection(db, "teachers"), {
    name: $("teacherName").value.trim(), subject: $("teacherSubject").value.trim(), mobile, createdAt: serverTimestamp()
  });
  show("teacherMsg", "शिक्षक डेटा cloud मध्ये save झाला.");
};

$("addAttendanceBtn").onclick = async () => {
  await addDoc(collection(db, "attendance"), {
    type: $("attendanceType").value, name: $("personName").value.trim(), className: $("attendanceClass").value.trim(), status: $("status").value, date: $("attendanceDate").value, createdAt: serverTimestamp()
  });
  show("attendanceMsg", "उपस्थिती cloud मध्ये save झाली.");
};

$("addLinkBtn").onclick = async () => {
  await addDoc(collection(db, "syllabus_links"), {
    title: $("linkTitle").value.trim(), url: $("linkUrl").value.trim(), createdAt: serverTimestamp()
  });
  show("linkMsg", "अभ्यासक्रम लिंक save झाली.");
};

$("loadReportBtn").onclick = async () => {
  const q = query(collection(db, "attendance"), orderBy("createdAt", "desc"), limit(50));
  const snap = await getDocs(q);
  currentRows = [];
  $("reportBody").innerHTML = "";
  snap.forEach(doc => {
    const d = doc.data(); currentRows.push(d);
    $("reportBody").innerHTML += `<tr><td>${d.date||""}</td><td>${d.type||""}</td><td>${d.name||""}</td><td>${d.className||""}</td><td>${d.status||""}</td></tr>`;
  });
};

$("exportCsvBtn").onclick = () => {
  const csv = "date,type,name,class,status\n" + currentRows.map(r => [r.date,r.type,r.name,r.className,r.status].map(x => `"${x||""}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "attendance_report.csv"; a.click();
};
