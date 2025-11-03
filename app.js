/* app.js - Demo static site with 50+ jobs, resume upload, contact number, applications */
/* Data stored in localStorage:
   - demo_jobs (array of job objects)
   - demo_users (array of users)
   - demo_resumes (object: userId -> {name,dataUrl})
   - demo_apps (array of applications)
   - jobf_token (string userId)
*/

const API_BASE = null; // not used in static demo

/* Helpers for localStorage */
function save(key, v) { localStorage.setItem(key, JSON.stringify(v)); }
function load(key, fallback=null){ const v = localStorage.getItem(key); return v ? JSON.parse(v) : (fallback ?? null); }
function genId(){ return 'id_' + Math.random().toString(36).slice(2,10); }

/* Seed demo users and resumes */
function ensureDemoUsersAndResumes(){
  let users = load('demo_users', null);
  if (!users){
    users = [
      { id: 'u_mahesh', name: 'Mahesh Nagapure', email: 'mahesh@example.com', password: 'password', role: 'seeker' },
      { id: 'u_emp', name: 'Employer One', email: 'emp@example.com', password: 'password', role: 'employer' }
    ];
    save('demo_users', users);
  }
  // demo_resumes starts empty; user can upload
  const resumes = load('demo_resumes', {});
  save('demo_resumes', resumes);
}

/* Seed 60 demo jobs (varied titles/companies/locations) */
function ensureDemoJobs(){
  let jobs = load('demo_jobs', null);
  if (jobs && jobs.length >= 50) return;
  const titles = [
    'Software Engineer','Front-End Developer','Back-End Developer','Full Stack Developer','Web Developer',
    'Mobile App Developer','UI/UX Designer','Graphic Designer','Data Analyst','Data Scientist',
    'Machine Learning Engineer','DevOps Engineer','System Administrator','Network Engineer',
    'QA Engineer','Business Analyst','Product Manager','Project Manager','IT Support Engineer',
    'Security Analyst','Database Administrator','Cloud Engineer','Technical Writer','SEO Specialist',
    'Content Writer','Digital Marketing Executive','Sales Executive','Customer Support Executive',
    'HR Executive','Finance Analyst','Automation Engineer'
  ];
  const companies = ['Infosys','TCS','Wipro','HCL','Tech Mahindra','Accenture','IBM','Capgemini','Cognizant','LTI','Oracle','SAP','Dell','Google','Amazon'];
  const locations = ['Pune','Mumbai','Bengaluru','Hyderabad','Chennai','Delhi','Noida','Gurgaon','Kolkata','Nagpur'];
  jobs = [];
  for(let i=0;i<60;i++){
    const t = titles[i % titles.length] + (i%7===0 ? ' (Internship)' : '');
    const c = companies[i % companies.length];
    const loc = locations[i % locations.length];
    const skills = generateSkills(i);
    jobs.push({
      id: genId(),
      title: t,
      company: c,
      location: loc,
      skills,
      salary: `${2 + (i%8)} LPA`,
      description: `We are hiring for ${t} at ${c}. Candidate should be proficient in ${skills.join(', ')}. Freshers and experienced can apply.`,
      contact: `9${Math.floor(600000000 + Math.random()*399999999)}`, // mock 10-digit starting with 9
      postedAt: Date.now() - i*86400000
    });
  }
  save('demo_jobs', jobs);
  // clear demo applications too
  save('demo_apps', []);
  return;
}
function generateSkills(i){
  const pool = ['JavaScript','HTML','CSS','React','Node','Express','MongoDB','SQL','Python','Java','C++','AWS','Docker','Kubernetes','Figma','Photoshop','Excel','Tableau','Pandas','TensorFlow'];
  const cnt = 2 + (i%4);
  const arr = [];
  for(let j=0;j<cnt;j++){
    arr.push(pool[(i+j) % pool.length]);
  }
  return [...new Set(arr)];
}

/* Auth demo */
function setToken(id){ localStorage.setItem('jobf_token', id); }
function getToken(){ return localStorage.getItem('jobf_token'); }
function clearToken(){ localStorage.removeItem('jobf_token'); }
function currentUser(){ const id = getToken(); if(!id) return null; const users = load('demo_users',[]); return users.find(u=>u.id===id) || null; }

/* Resume storage: demo_resumes = { userId: { name: filename, dataUrl } } */
function saveResumeForUser(userId, fileName, dataUrl){
  const rs = load('demo_resumes', {});
  rs[userId] = { name: fileName, dataUrl };
  save('demo_resumes', rs);
}

/* Apply to job - application object:
   { id, jobId, jobTitle, applicantId (or null), name, email, contact, resumeName, resumeDataUrl, appliedAt }
*/
function saveApplication(app){
  const apps = load('demo_apps', []);
  apps.unshift(app);
  save('demo_apps', apps);
}

/* UI: header rendering for all pages */
function renderHeader(){
  const el = document.getElementById('site-header');
  if(!el) return;
  const user = currentUser();
  el.innerHTML = `
    <div class="header">
      <div class="brand">JobFinder</div>
      <div class="navlinks">
        <a href="index.html" style="color:white;text-decoration:none">Home</a>
        ${ user ? `<a href="dashboard.html" style="color:white;text-decoration:none">Dashboard</a><a href="post-job.html" style="color:white;text-decoration:none">Post Job</a><button onclick="handleLogout()" style="color:white;background:transparent;border:none;cursor:pointer">Logout</button>` : `<a href="login.html" style="color:white;text-decoration:none">Login</a><a href="register.html" style="color:white;text-decoration:none">Register</a>` }
      </div>
    </div>
  `;
}
function handleLogout(){ clearToken(); window.location='index.html'; }

/* Index page: list jobs with Apply button */
async function initIndexPage(){
  renderHeader();
  ensureDemoUsersAndResumes();
  ensureDemoJobs();
  const jobs = load('demo_jobs', []);
  const container = document.getElementById('jobs-container');
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-q');
  function renderList(list){
    if(!list.length){ container.innerHTML = '<div class="card small">No jobs found.</div>'; return; }
    const cards = list.map(j=>`
      <div class="job">
        <div class="badge">${j.location}</div>
        <h3>${esc(j.title)} <span class="small"> - ${esc(j.company)}</span></h3>
        <p class="small"><strong>Contact:</strong> ${esc(j.contact)} &nbsp; <strong>Salary:</strong> ${esc(j.salary)}</p>
        <p>${esc(j.description)}</p>
        <p class="small"><strong>Skills:</strong> ${esc((j.skills||[]).join(', '))}</p>
        <div style="margin-top:8px">
          <button class="primary" onclick="viewDetails('${j.id}')">Details</button>
          <button class="apply-btn" onclick="openApplyModal('${j.id}')">Apply</button>
        </div>
      </div>
    `).join('');
    container.innerHTML = `<div class="jobs-grid">${cards}</div>`;
  }
  renderList(jobs);
  searchForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const q = searchInput.value.trim().toLowerCase();
    const filtered = jobs.filter(j => (j.title + ' ' + j.company + ' ' + (j.skills||[]).join(' ')).toLowerCase().includes(q));
    renderList(filtered);
  });
}

/* Job details modal (simple) */
function viewDetails(jobId){
  const jobs = load('demo_jobs', []);
  const j = jobs.find(x=>x.id===jobId);
  if(!j) return alert('Job not found');
  const html = `
    <div class="modal" id="modal-job">
      <div class="box">
        <span class="close-x" onclick="closeModal('modal-job')">×</span>
        <h3>${esc(j.title)} - ${esc(j.company)}</h3>
        <p class="small"><strong>Location:</strong> ${esc(j.location)}  &nbsp; <strong>Contact:</strong> ${esc(j.contact)}</p>
        <p>${esc(j.description)}</p>
        <p class="small"><strong>Skills:</strong> ${esc((j.skills||[]).join(', '))}</p>
        <div style="margin-top:12px">
          <button class="primary" onclick="closeModal('modal-job')">Close</button>
          <button class="apply-btn" onclick="(function(){ closeModal('modal-job'); openApplyModal('${j.id}'); })()">Apply</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
}
function closeModal(id){ const m = document.getElementById(id); if(m) m.remove(); }

/* Apply modal: allows using uploaded resume or upload now and submit contact */
function openApplyModal(jobId){
  const job = load('demo_jobs',[]).find(j=>j.id===jobId);
  if(!job) return alert('Job not found');
  const user = currentUser();
  const resumes = load('demo_resumes', {});
  const userResume = user ? resumes[user.id] : null;
  const html = `
    <div class="modal" id="modal-apply">
      <div class="box">
        <span class="close-x" onclick="closeModal('modal-apply')">×</span>
        <h3>Apply for: ${esc(job.title)} - ${esc(job.company)}</h3>
        <form id="apply-form">
          <div class="form-row">
            <label class="small">Name</label>
            <input id="apply-name" type="text" required value="${user ? esc(user.name) : ''}" />
          </div>
          <div class="form-row">
            <label class="small">Email</label>
            <input id="apply-email" type="email" required value="${user ? esc(user.email) : ''}" />
          </div>
          <div class="form-row">
            <label class="small">Contact Number</label>
            <input id="apply-contact" type="text" required placeholder="Your phone number" />
          </div>
          <div class="form-row small">Choose resume: ${ userResume ? `<div style="margin:6px 0">Saved: ${esc(userResume.name)} <button type="button" onclick="previewSavedResume('${user.id}')">Preview</button></div>` : '' }</div>
          <div class="form-row">
            <label class="small">Upload Resume (PDF/DOCX) — optional (will be used if chosen)</label>
            <input id="apply-resume-file" type="file" accept=".pdf,.doc,.docx,.txt" />
          </div>
          <div style="display:flex;gap:8px;margin-top:8px">
            <button class="primary" type="submit">Submit Application</button>
            <button type="button" onclick="closeModal('modal-apply')">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
  document.getElementById('apply-form').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const name = document.getElementById('apply-name').value.trim();
    const email = document.getElementById('apply-email').value.trim();
    const contact = document.getElementById('apply-contact').value.trim();
    const fileInput = document.getElementById('apply-resume-file');
    let resumeName = '', resumeDataUrl = '';
    // If user uploaded file now, read it
    if(fileInput.files && fileInput.files[0]){
      const f = fileInput.files[0];
      const ok = await readFileAsDataURL(f).catch(()=>null);
      if(!ok) { alert('Failed to read resume'); return; }
      resumeName = f.name;
      resumeDataUrl = ok;
      // if logged in, save to user's resume store
      if(user) saveResumeForUser(user.id, resumeName, resumeDataUrl);
    } else if(user && userResume){
      resumeName = userResume.name;
      resumeDataUrl = userResume.dataUrl;
    }
    const app = {
      id: genId(),
      jobId: jobId,
      jobTitle: job.title,
      applicantId: user ? user.id : null,
      name, email, contact,
      resumeName, resumeDataUrl,
      appliedAt: Date.now()
    };
    saveApplication(app);
    alert('Application submitted (demo).');
    closeModal('modal-apply');
  });
}

function previewSavedResume(userId){
  const resumes = load('demo_resumes', {});
  const r = resumes[userId];
  if(!r) return alert('No saved resume');
  // open in new tab (dataUrl)
  const w = window.open();
  w.document.write(`<h3>${esc(r.name)}</h3><iframe src="${r.dataUrl}" style="width:100%;height:90vh;border:none"></iframe>`);
}

/* Register / resume upload page */
function initRegisterPage(){
  renderHeader();
  ensureDemoUsersAndResumes();
  const form = document.getElementById('register-form');
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value;
    const fileInput = document.getElementById('reg-resume-file');
    const users = load('demo_users', []);
    if(users.find(u=>u.email===email)) return alert('Email already registered (demo).');
    const user = { id: genId(), name, email, password, role };
    users.push(user);
    save('demo_users', users);
    // if uploaded resume, save
    if(fileInput.files && fileInput.files[0]){
      const f = fileInput.files[0];
      const dataUrl = await readFileAsDataURL(f).catch(()=>null);
      if(dataUrl) saveResumeForUser(user.id, f.name, dataUrl);
    }
    setToken(user.id);
    alert('Registered & logged in (demo).');
    window.location = 'index.html';
  });
}

/* Login page */
function initLoginPage(){
  renderHeader();
  const form = document.getElementById('login-form');
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const users = load('demo_users', []);
    const user = users.find(u=>u.email===email && u.password===password);
    if(!user) return alert('Invalid credentials (demo).');
    setToken(user.id);
    alert('Logged in (demo).');
    window.location = 'index.html';
  });
}

/* Post job page (with contact number) */
function initPostJobPage(){
  renderHeader();
  const form = document.getElementById('postjob-form');
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const title = document.getElementById('job-title').value.trim();
    const company = document.getElementById('job-company').value.trim();
    const location = document.getElementById('job-location').value.trim();
    const skills = (document.getElementById('job-skills').value || '').split(',').map(s=>s.trim()).filter(Boolean);
    const salary = document.getElementById('job-salary').value.trim();
    const description = document.getElementById('job-desc').value.trim();
    const contact = document.getElementById('job-contact').value.trim();
    if(!title || !company) return alert('Title and Company are required.');
    const jobs = load('demo_jobs', []);
    const job = { id: genId(), title, company, location, skills, salary, description, contact, postedAt: Date.now() };
    jobs.unshift(job);
    save('demo_jobs', jobs);
    alert('Job posted (demo).');
    window.location = 'index.html';
  });
}

/* Dashboard: show posted jobs and applications */
function initDashboardPage(){
  renderHeader();
  const cont = document.getElementById('dashboard-content');
  const user = currentUser();
  const jobs = load('demo_jobs', []);
  const apps = load('demo_apps', []);
  const userJobs = jobs; // in demo we show all jobs; in a real app filter by postedBy
  const myApps = apps.filter(a => a.applicantId === (user?user.id:null) || (!a.applicantId && a.email === (user?user.email:'')));
  const appsHtml = myApps.map(a => `
    <div class="job">
      <h3>${esc(a.jobTitle)}</h3>
      <p class="small">Applied on: ${new Date(a.appliedAt).toLocaleString()}</p>
      <p><strong>Name:</strong> ${esc(a.name)} &nbsp; <strong>Contact:</strong> ${esc(a.contact)}</p>
      <p><strong>Resume:</strong> ${a.resumeName ? `<button onclick="openResumeData('${a.id}')">Preview</button>` : 'Not attached'}</p>
    </div>
  `).join('') || '<div class="small">No applications yet.</div>';
  cont.innerHTML = `
    <div class="card">
      <h2>Dashboard</h2>
      <p class="small">Demo user: ${user ? esc(user.name) + ' (' + esc(user.email) + ')' : 'Not logged in'}</p>
    </div>
    <div class="card" style="margin-top:12px">
      <h3>All Jobs (demo)</h3>
      <div class="jobs-grid">
        ${jobs.map(j=>`<div class="job"><h3>${esc(j.title)}<span class="small"> - ${esc(j.company)}</span></h3><p class="small">Contact: ${esc(j.contact)}</p><p>${esc(j.description)}</p></div>`).join('')}
      </div>
    </div>
    <div class="card" style="margin-top:12px">
      <h3>Your Applications</h3>
      ${appsHtml}
    </div>
  `;
}

/* Helper to open resume data for an application (search demo_apps for id) */
function openResumeData(appId){
  const apps = load('demo_apps', []);
  const a = apps.find(x=>x.id===appId);
  if(!a || !a.resumeDataUrl) return alert('No resume attached');
  const w = window.open();
  w.document.title = a.resumeName || 'Resume';
  w.document.body.innerHTML = `<h4>${esc(a.resumeName || '')}</h4><iframe src="${a.resumeDataUrl}" style="width:100%;height:90vh;border:none"></iframe>`;
}

/* Utility: read file to dataURL */
function readFileAsDataURL(file){
  return new Promise((res, rej)=>{
    const fr = new FileReader();
    fr.onload = ()=>res(fr.result);
    fr.onerror = ()=>rej();
    fr.readAsDataURL(file);
  });
}

/* Utility escape */
function esc(s=''){ return String(s).replace(/[&<>"'`=\/]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#x60;','=':'&#x3D;','/':'&#x2F;'}[c]; }); }

/* Decide which init to run */
document.addEventListener('DOMContentLoaded', ()=>{
  const p = location.pathname.split('/').pop() || 'index.html';
  ensureDemoUsersAndResumes();
  ensureDemoJobs();
  if(p === 'index.html' || p === '') initIndexPage();
  else if(p === 'login.html') initLoginPage();
  else if(p === 'register.html') initRegisterPage();
  else if(p === 'post-job.html') initPostJobPage();
  else if(p === 'dashboard.html') initDashboardPage();
  else renderHeader();
});
