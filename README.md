# Jiaveri Jobs — खरं Software (Backend + Mobile App + Desktop Software)

हे आता डेमो नाही — खरा server, खरा database (SQLite), आणि hashed passwords असलेलं सॉफ्टवेअर आहे.
**Mobile App (`/mobile`)** आणि **Desktop Software (`/desktop`)** हे दोन्ही एकाच सर्व्हर + एकाच डेटाबेसला जोडलेले आहेत — त्यामुळे कुठूनही केलेला बदल दोन्हीकडे लगेच (refresh केल्यावर) दिसतो. वेगळं sync/polling लागतच नाही, कारण डेटा खरंच एकाच ठिकाणी (server वर) साठवला जातो.

## यात काय आहे
```
jj-software/
  render.yaml            ← Render.com साठी तयार config
  backend/
    server.js            ← मुख्य सर्व्हर फाईल
    db.js                 ← SQLite डेटाबेस स्ट्रक्चर (companies, candidates, jobs, applications, payments, notifications)
    routes/               ← सर्व API (auth, jobs, applications, admin, profile, payments, notifications)
    middleware/auth.js    ← Login टोकन तपासणी
    public/
      mobile.html         ← Mobile App
      desktop.html         ← Desktop Software (Admin + Company साठी सोयीचं)
    .env.example          ← गुप्त सेटिंग्जचा नमुना
```

## गोपनीयता फीचर कुठे लागू आहे
`backend/routes/applications.js` मधील `/directory` आणि `/job/:jobId` — कंपनीला candidate चा फोन नंबर तेव्हाच मिळतो जेव्हा त्या candidate ने त्या कंपनीच्या कोणत्यातरी जॉबसाठी प्रत्यक्ष अर्ज केलेला असतो. ही तपासणी **सर्व्हरवर** होते, त्यामुळे ब्राउझरमधून बदलून बायपास करता येत नाही.

---

## पर्याय अ) स्वतःच्या संगणकावर आधी चाचणी करा (Node.js लागेल)
1. [nodejs.org](https://nodejs.org) वरून Node.js (LTS) इंस्टॉल करा.
2. टर्मिनल/Command Prompt उघडा:
   ```
   cd jj-software/backend
   npm install
   copy .env.example .env      (Mac/Linux वर: cp .env.example .env)
   ```
3. `.env` फाईल उघडून `JWT_SECRET`, `ADMIN_PHONE`, `ADMIN_PASSWORD` बदला.
4. सुरू करा: `npm start`
5. ब्राउझरमध्ये उघडा: `http://localhost:3000/desktop` आणि `http://localhost:3000/mobile`

---

## पर्याय ब) Render.com वर खरं Live करा (सोपं, फुकट टियर उपलब्ध)
1. या संपूर्ण `jj-software` फोल्डरचा एक **GitHub repository** बनवा (GitHub Desktop वापरून सोपं जाईल — फक्त फोल्डर ड्रॅग करा आणि "Publish").
2. [render.com](https://render.com) वर मोफत खाते बनवा, GitHub जोडा.
3. "New +" → "Blueprint" → तुमचा repository निवडा (हे `render.yaml` आपोआप वाचेल).
4. मागितलेल्या Environment Variables भरा:
   - `ADMIN_PHONE` — तुम्हाला हवा तो Admin मोबाईल नंबर
   - `ADMIN_PASSWORD` — मजबूत पासवर्ड
   - `JWT_SECRET` — आपोआप तयार होईल (काही न करता सोडा)
5. "Apply" दाबा. 5-10 मिनिटांत तुम्हाला एक लिंक मिळेल, उदा. `https://jiaveri-jobs.onrender.com`
6. Mobile App: `https://jiaveri-jobs.onrender.com/mobile`
   Desktop Software: `https://jiaveri-jobs.onrender.com/desktop`
   — या दोन्ही लिंक्स आता कायमच्या "Live" आहेत, कुठूनही उघडा, डेटा एकच असेल.

⚠️ **महत्त्वाचं (Render Free Tier बद्दल):** मोफत plan वर डिस्क सतत save राहत नाही (restart झाल्यावर डेटा उडू शकतो) — production साठी थोडा paid "Starter" plan (₹500-600/महिना च्या आसपास) किंवा वेगळा managed database (उदा. Render Postgres) घ्यावा लागेल. सुरुवातीच्या चाचणीसाठी Free Tier पुरेसा आहे.

---

## पुढचा टप्पा (अजून प्रत्यक्ष प्रॉडक्शनसाठी लागेल)
- **खरं Payment Gateway** — सध्या `routes/payments.js` मध्ये पेमेंट manually "यशस्वी" मार्क होतं. Razorpay/Cashfree चं merchant account काढून त्यांचा Checkout SDK जोडायचा — ती जागा त्या फाईलमध्ये स्पष्ट कमेंटने दाखवली आहे.
- **Native Mobile App (Play Store/App Store)** — सध्याचं Mobile App एक वेबसाईट आहे जी फोनवर उत्तम दिसते व चालते (होम स्क्रीनवर "Add to Home Screen" करता येतं). खऱ्या APK/IPA साठी React Native/Flutter मध्ये वेगळं बांधावं लागेल.
- **Domain नाव** — `jiaveri-jobs.onrender.com` ऐवजी स्वतःचं डोमेन (उदा. jiaverijobs.com) जोडता येतं, Render च्या Settings मध्ये.

कोणत्याही टप्प्यावर अडलात तर मला सांगा — पुढचं पाऊल एकत्र बघू.
